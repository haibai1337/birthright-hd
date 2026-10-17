/** Narrow factual-table reader for cached MediaWiki atlas pages. No prose is exported. */
export function parseAtlasProvinceRows(html: string, domain: string, source: string) {
  const plain = (value: string) =>
    value
      .replace(/<[^>]*>/g, ' ')
      .replace(/&(?:nbsp|#160);/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
      .replace(/\s+/g, ' ')
      .trim();
  const rows: {
    id: string;
    name: string;
    domain: string;
    level: number;
    sourcePotential: number;
    holdingCells: string[];
    source: string;
    confidence: string;
  }[] = [];
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...(row[1] ?? '').matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      plain(c[1] ?? ''),
    );
    const match = cells[0]?.match(/^([^()[\]]+)\s+\((\d+)\/(\d+)\)$/);
    if (!match || cells.length !== 5) continue;
    const name = match[1]!.trim();
    rows.push({
      id: `tabletop-${domain.toLowerCase()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name,
      domain,
      level: Number(match[2]),
      sourcePotential: Number(match[3]),
      holdingCells: cells.slice(1),
      source,
      confidence: 'SECONDARY_TABLETOP_ONLY',
    });
  }
  return rows;
}
