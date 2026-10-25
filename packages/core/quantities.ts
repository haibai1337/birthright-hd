import { z } from 'zod';

export const GOLD_UNITS_PER_GB = 120n;
export const goldUnitsSchema = z.bigint().brand<'GoldUnits'>();
export const regencyPointsSchema = z.bigint().nonnegative().brand<'RegencyPoints'>();
export type GoldUnits = z.infer<typeof goldUnitsSchema>;
export type RegencyPoints = z.infer<typeof regencyPointsSchema>;
export type QuantityRounding = 'exact' | 'floor' | 'ceil' | 'trunc';

const signedInteger = /^(?:0|-?[1-9][0-9]*)$/;
const nonnegativeInteger = /^(?:0|[1-9][0-9]*)$/;
function integer(value: bigint | string, signed: boolean): bigint {
  if (typeof value === 'bigint') {
    if (!signed && value < 0n) throw new Error('Quantity cannot be negative');
    return value;
  }
  if (typeof value !== 'string' || !(signed ? signedInteger : nonnegativeInteger).test(value))
    throw new Error('Quantity requires a canonical decimal integer string or bigint');
  return BigInt(value);
}

export const goldUnits = (value: bigint | string): GoldUnits => integer(value, true) as GoldUnits;
export const regencyPoints = (value: bigint | string): RegencyPoints =>
  integer(value, false) as RegencyPoints;

/** All inexact divisions require a caller-selected rules/display boundary. */
function divide(n: bigint, d: bigint, rounding: QuantityRounding): bigint {
  if (typeof n !== 'bigint' || typeof d !== 'bigint' || d <= 0n)
    throw new Error('Ratio requires integer operands and a positive denominator');
  const q = n / d,
    r = n % d;
  if (r === 0n) return q;
  switch (rounding) {
    case 'exact':
      throw new Error('Quantity is not exactly representable; specify rounding');
    case 'floor':
      return n < 0n ? q - 1n : q;
    case 'ceil':
      return n > 0n ? q + 1n : q;
    case 'trunc':
      return q;
    default:
      throw new Error('Unknown quantity rounding policy');
  }
}

/** Exact decimal GB input only; recurring fractions use goldFromGBRatio. No Number projection. */
export function goldFromGB(value: string | bigint): GoldUnits {
  if (typeof value === 'bigint') return goldUnits(value * GOLD_UNITS_PER_GB);
  if (typeof value !== 'string' || !/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(value))
    throw new Error('GB requires a plain decimal string or bigint');
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.');
  const denominator = 10n ** BigInt(fraction.length);
  const numerator =
    (BigInt(whole!) * denominator + BigInt(fraction || '0')) * (negative ? -1n : 1n);
  return goldUnits(divide(numerator * GOLD_UNITS_PER_GB, denominator, 'exact'));
}

export function goldFromGBRatio(n: bigint, d: bigint): GoldUnits {
  return goldUnits(divide(n * GOLD_UNITS_PER_GB, d, 'exact'));
}

/** Only for known numeric GB (already adapted, never raw native treasury) at new-game boundaries. */
export function goldFromLegacyGB(value: number): GoldUnits {
  if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER / 10)
    throw new Error('Legacy GB is outside the lossless numeric conversion boundary');
  return goldFromGB(value.toString());
}

/** Only for safe, already-decoded numeric RP; never round an unsafe legacy value. */
export function regencyFromLegacy(value: number): RegencyPoints {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error('Legacy RP must be a nonnegative safe integer');
  return regencyPoints(BigInt(value));
}

export const addGold = (a: GoldUnits, b: GoldUnits): GoldUnits => goldUnits(a + b);
export const subtractGold = (a: GoldUnits, b: GoldUnits): GoldUnits => goldUnits(a - b);
export const multiplyGold = (a: GoldUnits, factor: bigint): GoldUnits => goldUnits(a * factor);
export const multiplyGoldRatio = (
  a: GoldUnits,
  n: bigint,
  d: bigint,
  rounding: QuantityRounding = 'exact',
): GoldUnits => goldUnits(divide(a * n, d, rounding));
export const compareGold = (a: GoldUnits, b: GoldUnits): -1 | 0 | 1 => (a < b ? -1 : a > b ? 1 : 0);
export const roundGoldToGB = (a: GoldUnits, rounding: QuantityRounding): GoldUnits =>
  goldUnits(divide(a, GOLD_UNITS_PER_GB, rounding) * GOLD_UNITS_PER_GB);

export const addRegency = (a: RegencyPoints, b: RegencyPoints): RegencyPoints =>
  regencyPoints(a + b);
export const subtractRegency = (a: RegencyPoints, b: RegencyPoints): RegencyPoints =>
  regencyPoints(a - b);
export const multiplyRegency = (a: RegencyPoints, factor: bigint): RegencyPoints =>
  regencyPoints(a * factor);
export const multiplyRegencyRatio = (
  a: RegencyPoints,
  n: bigint,
  d: bigint,
  rounding: QuantityRounding = 'exact',
): RegencyPoints => regencyPoints(divide(a * n, d, rounding));
export const compareRegency = (a: RegencyPoints, b: RegencyPoints): -1 | 0 | 1 =>
  a < b ? -1 : a > b ? 1 : 0;

export const serializeGold = (value: GoldUnits): string => goldUnits(value).toString();
export const deserializeGold = (value: string): GoldUnits => goldUnits(value);
export const serializeRegency = (value: RegencyPoints): string => regencyPoints(value).toString();
export const deserializeRegency = (value: string): RegencyPoints => regencyPoints(value);

function gcd(a: bigint, b: bigint): bigint {
  return b === 0n ? a : gcd(b, a % b);
}
export function goldInGB(value: GoldUnits): { numerator: bigint; denominator: bigint } {
  const divisor = gcd(value < 0n ? -value : value, GOLD_UNITS_PER_GB);
  return { numerator: value / divisor, denominator: GOLD_UNITS_PER_GB / divisor };
}

/** Exact human-readable GB: terminating decimals where possible, otherwise a mixed fraction. */
export function formatGold(value: GoldUnits): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / GOLD_UNITS_PER_GB;
  const remainder = absolute % GOLD_UNITS_PER_GB;
  const prefix = negative ? '-' : '';
  if (remainder === 0n) return `${prefix}${whole} GB`;
  const { numerator, denominator } = goldInGB(goldUnits(remainder));
  if (denominator % 3n === 0n)
    return `${prefix}${whole ? `${whole} ` : ''}${numerator}/${denominator} GB`;
  // The denominator divides 120 and has no factor 3: three decimal digits suffice.
  const decimals = ((remainder * 1000n) / GOLD_UNITS_PER_GB)
    .toString()
    .padStart(3, '0')
    .replace(/0+$/, '');
  return `${prefix}${whole}.${decimals} GB`;
}
export const formatRegency = (value: RegencyPoints): string => `${serializeRegency(value)} RP`;

// Wire codecs are deliberately strict: no JSON numbers, exponent strings, whitespace or leading zeros.
export const goldQuantityCodec = z.codec(z.string().regex(signedInteger), goldUnitsSchema, {
  decode: deserializeGold,
  encode: (value) => serializeGold(goldUnits(value)),
});
export const nonnegativeGoldQuantityCodec = z.codec(
  z.string().regex(nonnegativeInteger),
  goldUnitsSchema.nonnegative(),
  { decode: deserializeGold, encode: (value) => serializeGold(goldUnits(value)) },
);
export const regencyQuantityCodec = z.codec(
  z.string().regex(nonnegativeInteger),
  regencyPointsSchema,
  { decode: deserializeRegency, encode: (value) => serializeRegency(regencyPoints(value)) },
);
