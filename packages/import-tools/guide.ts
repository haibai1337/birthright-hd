/** Parse only factual rows from privately cached, line-numbered public guide snapshots. */
export interface GuideLine {
  line: number;
  text: string;
}
export function mergeGuideWindows(windows: string[]): GuideLine[] {
  const lines = new Map<number, string>();
  for (const text of windows)
    for (const match of text.matchAll(/^L(\d+): ?(.*)$/gm)) {
      const line = Number(match[1]),
        value = match[2] ?? '';
      const previous = lines.get(line);
      if (previous !== undefined && previous !== value)
        throw new Error(`Inconsistent guide snapshot at line ${line}`);
      lines.set(line, value);
    }
  return [...lines].sort((a, b) => a[0] - b[0]).map(([line, text]) => ({ line, text }));
}
export function parsePcGuide(lines: GuideLine[]) {
  let domain = '';
  const provinces: { name: string; domain: string; level: number; magic: number; line: number }[] =
      [],
    holdings: { province: string; domain: string; type: string; level: number; line: number }[] =
      [],
    regents: { name: string; domain: string; details: string; line: number }[] = [];
  for (const row of lines.filter((l) => l.line >= 400 && l.line < 2212)) {
    const title = row.text.match(/^\s*==([^=]+)==\s*$/);
    if (title) {
      domain = title[1]?.trim() ?? '';
      continue;
    }
    if (!domain || domain.includes('Beginner Tutorial')) continue;
    const province = row.text.match(/^\s+([^,[\]=]+?)\s+(\d+)\/(\d+)\s*$/);
    if (province) {
      provinces.push({
        name: province[1]?.trim() ?? '',
        domain,
        level: Number(province[2]),
        magic: Number(province[3]),
        line: row.line,
      });
      continue;
    }
    const holding = row.text.match(
      /^\s+(.+?),\s+(Law|Guild|Temple|Source|Castle|Wizard Tower|Citadel|Stronghold|Fortress)\s+(\d+)\s*$/,
    );
    if (holding) {
      holdings.push({
        province: holding[1]?.trim() ?? '',
        domain,
        type: holding[2]?.toLowerCase() ?? '',
        level: Number(holding[3]),
        line: row.line,
      });
      continue;
    }
    const regent = row.text.match(
      /^\s+(.+?),\s+((?:Fighter|Wizard|Priest|Thief|Paladin|Ranger|Bard|Monster).*)$/,
    );
    if (regent)
      regents.push({
        name: regent[1]?.trim() ?? '',
        domain,
        details: regent[2] ?? '',
        line: row.line,
      });
  }
  const characters: {
    name: string;
    domain: string;
    line: number;
    fields: Record<string, string | number>;
  }[] = [];
  let character: (typeof characters)[number] | null = null;
  const detailed = lines.filter((l) => l.line >= 3240 && l.line < 6320);
  for (const [position, row] of detailed.entries()) {
    const title = row.text.match(/^\s*==([^=]+)==\s*$/);
    if (title) {
      domain = title[1]?.trim() ?? '';
      character = null;
      continue;
    }
    const name = row.text.match(/^\s+([^;]+);\s+.+$/);
    if (
      name &&
      /^\s+Gender:/.test(
        detailed.slice(position + 1, position + 5).find((l) => l.text.trim() !== '')?.text ?? '',
      )
    ) {
      character = { name: name[1]?.trim() ?? '', domain, line: row.line, fields: {} };
      characters.push(character);
      continue;
    }
    const field = row.text.match(
      /^\s+(Gender|Race|Class|Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|HP|Derivation|Grade|Realm Spells):\s+(.+)$/,
    );
    if (field && character) {
      const value = field[2]?.trim() ?? '';
      character.fields[field[1] ?? ''] = /^\d+$/.test(value) ? Number(value) : value;
    }
  }
  const ranges = lines.filter((l) => l.line >= 358 && l.line <= 6320);
  const gaps: number[] = [];
  for (let i = 1; i < ranges.length; i++) {
    const before = ranges[i - 1],
      next = ranges[i];
    if (before && next && next.line > before.line + 1) gaps.push(before.line + 1, next.line - 1);
  }
  return {
    source: 'pc-guide-78429',
    provinces,
    holdings,
    regents,
    characters,
    coverage: { first: ranges[0]?.line, last: ranges.at(-1)?.line, gaps },
  };
}
export function normalizeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}
