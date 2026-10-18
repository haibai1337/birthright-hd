import type { Campaign } from './schema';

type Port = NonNullable<Campaign['ports']>[number];

// User-approved HD rule in both profiles; original records and assets stay intact.
export const portIncomeRule = (kind: Port['kind']) =>
  kind === 'river-port' ? ('half-province-level' as const) : ('province-level' as const);

export function portIncome(state: Pick<Campaign, 'provinces'>, port: Port): number {
  const province = state.provinces.find((p) => p.id === port.provinceId);
  if (!province || province.occupiedBy || province.contested) return 0;
  return province.level / (port.kind === 'river-port' ? 2 : 1);
}
