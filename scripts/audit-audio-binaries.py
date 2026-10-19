"""Read-only executable/archive follow-up to investigate-audio.ts.

Capstone is optional, loaded only from the local research tools directory.
No game or installer executable is run. Output contains metadata/disassembly only.
"""
import sys, pathlib, struct, json, re, zipfile, hashlib, subprocess, ast, operator

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'reference/extracted/audio-investigation'
OUT.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(ROOT / 'reference/research-cache/audio-tools'))
try:
    import capstone
except ImportError:
    capstone = None

def save(name, data):
    (OUT / name).write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')

def u16(b, at): return struct.unpack_from('<H', b, at)[0]
def u32(b, at): return struct.unpack_from('<I', b, at)[0]

def source_tables():
    cache = ROOT / 'reference/research-cache/audio-investigation'
    header = cache / 'SOUNDFX.HXX'
    if header.exists():
        text = re.sub(r'/\*.*?\*/|//[^\n]*|^[ \t]*#[^\n]*', '', header.read_text(), flags=re.S|re.M)
        values, number, failures = {}, -1, []
        def expression(node):
            if isinstance(node, ast.Constant) and isinstance(node.value, int): return node.value
            if isinstance(node, ast.Name): return values[node.id]
            if isinstance(node, ast.BinOp) and type(node.op) in (ast.Add, ast.Sub, ast.Mult):
                return {ast.Add:operator.add, ast.Sub:operator.sub, ast.Mult:operator.mul}[type(node.op)](expression(node.left), expression(node.right))
            raise ValueError('unsupported enum expression')
        for m in re.finditer(r'\b(SND_[A-Z0-9_]+)\s*(?:=\s*([^,{}]+))?\s*,', text):
            try:
                number = expression(ast.parse(m[2].strip(), mode='eval').body) if m[2] else number+1
                values[m[1]] = number
            except (ValueError, SyntaxError, KeyError) as ex: failures.append(dict(name=m[1], error=str(ex)))
        save('sound-resource-ids.json', dict(sourceRevision='005b7d3dd1701423a4ce7f8c878d27f791dabd63', values=values, failures=failures))
        wavs = json.loads((OUT / 'audio-files.json').read_text())
        loose = []
        special = {102:'Battle / personal combat music', 103:'Credits music', 105:'Realm / domain music',
                   117:'Unassigned recording; no confirmed caller'}
        for w in wavs:
            if not w['source'].startswith('WAVE'): continue
            number = int(pathlib.PurePosixPath(w['source']).stem)
            symbols = [name for name, value in values.items() if value == number and 'TOTAL' not in name]
            use = special.get(number) or ', '.join(symbols) or (
                'Numbered voice resource; exact speaker/cue not resolved' if w['source'].startswith(('WAVE30/', 'WAVE384/'))
                else 'Numbered resource; exact cue not resolved')
            loose.append(dict(file=w['source'], bytes=w['bytes'], seconds=w['duration'],
                              format=f"PCM {w['rate']} Hz / {w['bits']}-bit / {w['channels']} channel",
                              use=use, extent=w['extent'], logicalOffset=w['logicalOffset'],
                              physicalOffset=w['physicalOffset'], sha256=w['sha256']))
        save('overlooked-loose-audio.json', loose)
    b = (ROOT / 'reference/extracted/disc/WINBR.EXE').read_bytes()
    # The retail executable has a 26-entry ADV_SITE table, packed to two-byte alignment.
    # Locate it by the unique pointer to its first scene string, rather than copying source assignments.
    at = b.index(b'endie_mw\0')
    string_address = at - 1318912 + 0x400000 + 1441792
    pointer = struct.pack('<I', string_address)
    offsets = [m.start() for m in re.finditer(re.escape(pointer), b)]
    if len(offsets) != 1: raise ValueError('ambiguous retail adventure table')
    places = {}
    source = cache / 'PLACES.CPP'
    if source.exists():
        text = source.read_text().split('DEFINE_VECTOR_DATA(CSTRPTR,place_names) = {')[1].split('};')[0]
        places = {int(m[1]):m[2] for m in re.finditer(r'/\*\s*(\d+)\s*\*/\s*"([^"]+)"', text)}
    scene_data = {pathlib.PurePosixPath(s['source']).stem.lower():s for s in json.loads((OUT/'scenes.json').read_text())}
    entries = []
    for i in range(26):
        off = offsets[0]+i*16
        pointer, difficulty, available, realm, place = struct.unpack_from('<Ihiih', b, off)
        raw = pointer - 0x400000 - 1441792 + 1318912
        name = b[raw:b.index(0, raw)].decode('ascii')
        entries.append(dict(index=i, tableOffset=off, scene=name, difficulty=difficulty, available=available,
                            realm=realm, placeId=place, sourcePlaceName=places.get(place),
                            sceneMetadata=scene_data.get(name)))
    save('retail-adventure-table.json', entries)

def inspect_pe(file):
    b = file.read_bytes()
    p = u32(b, 60)
    if b[p:p+4] != b'PE\0\0': return None
    opt, base = p + 24, u32(b, p + 52)
    sections = []
    for i in range(u16(b, p + 6)):
        at = opt + u16(b, p + 20) + 40*i
        sections.append(dict(name=b[at:at+8].rstrip(b'\0').decode('ascii'),
                             rva=u32(b, at+12), raw=u32(b, at+20), size=u32(b, at+16)))
    def raw(rva):
        for s in sections:
            if s['rva'] <= rva < s['rva'] + s['size']: return s['raw'] + rva - s['rva']
        raise ValueError(f'unmapped RVA {rva:x}')
    strings = []
    for m in re.finditer(rb'[\x20-\x7e]{4,}', b):
        if not re.search(rb'(?i)(wave|music|\.wav|audio|mci|dsound|resfiles)', m[0]): continue
        address = None
        for s in sections:
            if s['raw'] <= m.start() < s['raw'] + s['size']:
                address = base + s['rva'] + m.start() - s['raw']
        strings.append(dict(offset=m.start(), address=address, text=m[0].decode('ascii')))
    resource_entries, resource_errors = [], []
    resource_rva = u32(b, opt + 112)
    if resource_rva:
        start = raw(resource_rva)
        def resource_walk(relative, names):
            at = start + relative
            if at + 16 > len(b): raise ValueError('truncated resource directory')
            for i in range(u16(b, at+12) + u16(b, at+14)):
                e = at + 16 + i*8
                name, offset = u32(b, e), u32(b, e+4)
                label = name
                if name & 0x80000000:
                    n = start + (name & 0x7fffffff)
                    label = b[n+2:n+2+u16(b, n)*2].decode('utf-16le')
                if offset & 0x80000000: resource_walk(offset & 0x7fffffff, names+[label])
                else:
                    d = start+offset
                    rva, size = u32(b, d), u32(b, d+4)
                    try:
                        f = raw(rva)
                        resource_entries.append(dict(path=names+[label], rva=rva, offset=f, size=size,
                                                     readable=max(0, min(size, len(b)-f)),
                                                     signature=b[f:f+12].hex()))
                    except ValueError as ex: resource_errors.append(str(ex))
        try: resource_walk(0, [])
        except (ValueError, struct.error) as ex: resource_errors.append(str(ex))
    result = dict(source=str(file.relative_to(ROOT)), bytes=len(b), sha256=hashlib.sha256(b).hexdigest(),
                  base=base, sections=sections, strings=strings, resources=resource_entries,
                  resourceErrors=resource_errors, capstoneVersion=getattr(capstone, '__version__', None))
    if capstone:
        decoder = capstone.Cs(capstone.CS_ARCH_X86, capstone.CS_MODE_32)
        decoder.skipdata = True
        instructions = []
        for s in sections:
            if s['name'] in ('.text', 'BEGTEXT'):
                instructions += list(decoder.disasm_lite(b[s['raw']:s['raw']+s['size']], base+s['rva']))
        string_addresses = {s['address'] for s in strings if s['address']}
        blocks, xrefs, pushes = {}, [], []
        for i, (address, size, mnemonic, operands) in enumerate(instructions):
            vals = [int(x, 16) for x in re.findall(r'0x([0-9a-f]+)', operands)]
            interesting = sorted(set(vals) & string_addresses)
            music_id = mnemonic == 'push' and any(v in (102, 103, 105, 499) for v in vals)
            if interesting or music_id:
                record = dict(address=address, offset=raw(address-base), instruction=f'{mnemonic} {operands}')
                if interesting: record['stringAddresses'] = interesting; xrefs.append(record)
                if music_id: pushes.append(record)
                blocks[f'{address:08x}'] = [f'{x[0]:08x}  {x[2]} {x[3]}' for x in instructions[max(0,i-14):i+19]]
        result.update(stringXrefs=xrefs, musicIdPushes=pushes)
        save('winbr-disassembly.json', blocks)
        # These locations were established from string/ID cross-references in this retail binary.
        # Save the complete short routing functions, rather than only individual xref windows.
        decoder.skipdata = False
        focused = {}
        for first, end in [(0x53bfc0, 0x53c1d5), (0x53c220, 0x53c361),
                           (0x53c5e0, 0x53c780), (0x53af34, 0x53b2b0)]:
            focused[hex(first)] = [f'{ins.address:08x} {ins.mnemonic} {ins.op_str}'
                                   for ins in decoder.disasm(b[raw(first-base):raw(end-base)], first)]
        save('loader-disassembly.json', focused)
    return result

source_tables()
pe = inspect_pe(ROOT / 'reference/extracted/disc/WINBR.EXE')
save('winbr-analysis.json', pe)
if '--pe-only' in sys.argv:
    print(json.dumps(dict(strings=pe['strings'], pushes=pe.get('musicIdPushes')), indent=2))
    sys.exit(0)
archives = []
for file in sorted((ROOT / 'reference/original').glob('*.exe')):
    b = file.read_bytes()
    result = dict(source=file.name, bytes=len(b), sha256=hashlib.sha256(b).hexdigest(),
                  strings=[dict(offset=m.start(), text=m[0].decode('ascii'))
                           for m in re.finditer(rb'[\x20-\x7e]{5,}', b)
                           if re.search(rb'(?i)(\.wav|music|wave00|wave.res|GLBSInstall)', m[0])])
    if zipfile.is_zipfile(file):
        result['format'] = 'ZIP SFX; stub not executed'
        entries = []
        with zipfile.ZipFile(file) as z:
            for e in z.infolist():
                data = z.read(e)  # decompresses and verifies CRC
                entries.append(dict(name=e.filename, bytes=len(data), sha256=hashlib.sha256(data).hexdigest(),
                                    audioSignatures=[dict(offset=m.start(), signature=m[0].decode('latin1'))
                                                     for m in re.finditer(rb'RIFF....WAVE|MThd\x00\x00\x00\x06|OggS|fLaC', data)],
                                    references=[dict(offset=m.start(), text=m[0].decode('ascii'))
                                                for m in re.finditer(rb'(?i)\b(?:10\d|11\d|12[0-4]|499)\.wav\b', data)]))
        result['entries'] = entries
    elif b'Rar!\x1a\x07' in b:
        result['format'] = 'RAR SFX; trusted UnRAR used, stub not executed'
        unrar = pathlib.Path('C:/Program Files/WinRAR/UnRAR.exe')
        listing = subprocess.run([str(unrar), 'lb', str(file)], capture_output=True)
        names = listing.stdout.decode('utf-8', errors='replace').strip().splitlines()
        result['listingExit'] = listing.returncode
        result['entries'] = names
        # A single trusted UnRAR process streams all members; no member path is written.
        p = subprocess.run([str(unrar), 'p', '-inul', str(file)], capture_output=True)
        result.update(readExit=p.returncode, streamedBytes=len(p.stdout),
                      streamedSha256=hashlib.sha256(p.stdout).hexdigest(),
                      audioSignatures=[dict(offset=m.start(), signature=m[0].decode('latin1'))
                                       for m in re.finditer(rb'RIFF....WAVE|MThd\x00\x00\x00\x06|OggS|fLaC', p.stdout)])
    else:
        result['format'] = 'opaque GLBSInstall package; raw strings/signature search only'
    archives.append(result)
save('patch-and-editor-archives.json', archives)
print(json.dumps(dict(peStrings=len(pe['strings']), peResources=len(pe['resources']),
                      musicIdPushes=pe.get('musicIdPushes'),
                      archives=[dict(source=a['source'], format=a['format'], entries=len(a.get('entries', [])))
                                for a in archives]), indent=2))
