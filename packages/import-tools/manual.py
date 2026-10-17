"""Extract private manual text and render research pages without changing the source."""
import sys, pathlib, json, zipfile, re
sys.path.insert(0, str(pathlib.Path('.python-tools').resolve()))
import pymupdf
root = pathlib.Path('reference/original')
out = pathlib.Path('reference/extracted')
out.mkdir(parents=True, exist_ok=True)
doc = pymupdf.open(next(root.glob('*.pdf')))
text = '\n'.join(f'\n--- PDF PAGE {i+1} ---\n'+p.get_text() for i,p in enumerate(doc))
(out/'manual.txt').write_text(text, encoding='utf-8')
pages = [i for i,p in enumerate(doc) if any(x in p.get_text().lower() for x in ['domain turn','regency points','province taxation'])]
for i in (pages[:3] if pages else [2, 4, 6, 12, 18]):
    doc[i].get_pixmap(matrix=pymupdf.Matrix(1.2,1.2)).save(str(out/f'manual-page-{i+1}.png'))
print(json.dumps({'pages':len(doc),'characters':len(text),'rulePages':[i+1 for i in pages]}))
archives=[]
for file in root.glob('*.exe'):
    item={'name':file.name,'zipReadable':zipfile.is_zipfile(file)}
    if item['zipReadable']:
        with zipfile.ZipFile(file) as z:
            item['entries']=[{'name':x.filename,'bytes':x.file_size} for x in z.infolist()]
            for x in z.infolist():
                if re.search(r'(readme|patch).*\.(txt|doc)$',x.filename,re.I) and x.file_size<500000:
                    # Fixed output names avoid archive path traversal.
                    (out/(file.stem+'-'+pathlib.PureWindowsPath(x.filename).name)).write_bytes(z.read(x))
    else:
        data=file.read_bytes()
        item['strings']=[s.decode('ascii') for s in re.findall(rb'[\x20-\x7e]{8,}',data) if re.search(rb'(?i)(zip|patch|scenario|editor|version|pkware|install)',s)][:35]
    archives.append(item)
(out/'patch-archives.json').write_text(json.dumps(archives,indent=2),encoding='utf-8')
print(json.dumps([{'name':x['name'],'zipReadable':x['zipReadable'],'entries':len(x.get('entries',[]))} for x in archives]))
