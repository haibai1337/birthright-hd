import { describe, expect, it } from 'vitest';
import {
  addGold,
  subtractGold,
  multiplyGold,
  multiplyGoldRatio,
  compareGold,
  roundGoldToGB,
  goldFromGB,
  goldFromGBRatio,
  goldFromLegacyGB,
  goldUnits,
  goldInGB,
  formatGold,
  regencyPoints,
  regencyFromLegacy,
  addRegency,
  subtractRegency,
  multiplyRegency,
  multiplyRegencyRatio,
  compareRegency,
  formatRegency,
  serializeGold,
  deserializeGold,
  serializeRegency,
  deserializeRegency,
} from '../packages/core/quantities';

describe('exact economy quantities', () => {
  it('accounts for thirds, halves, tenths and twelfths without drift or record rounding', () => {
    const values = [
      goldFromGBRatio(1n, 3n),
      goldFromGB('0.5'),
      goldFromGB('0.1'),
      goldFromGBRatio(1n, 12n),
    ];
    expect(values.reduce(addGold, goldUnits(0n))).toBe(122n);
    expect(multiplyGold(goldFromGB('0.1'), 10n)).toBe(goldFromGB(1n));
    expect(multiplyGold(goldFromGBRatio(1n, 3n), 3n)).toBe(goldFromGB(1n));
    expect(addGold(goldFromGB('0.3'), goldFromGB('0.6'))).toBe(goldFromGB('0.9'));
    expect(multiplyGoldRatio(goldFromGB(1n), 2n, 3n)).toBe(goldFromGBRatio(2n, 3n));
    expect(goldInGB(goldUnits(122n))).toEqual({ numerator: 61n, denominator: 60n });
  });

  it('requires explicit rounding at an inexact boundary, including signed net amounts', () => {
    expect(() => goldFromGB('0.3333333333333333')).toThrow('not exactly representable');
    expect(() => goldFromGBRatio(1n, 7n)).toThrow('not exactly representable');
    expect(() => multiplyGoldRatio(goldUnits(1n), 1n, 2n)).toThrow();
    expect(multiplyGoldRatio(goldUnits(1n), 1n, 2n, 'floor')).toBe(0n);
    expect(multiplyGoldRatio(goldUnits(1n), 1n, 2n, 'ceil')).toBe(1n);
    expect(multiplyGoldRatio(goldUnits(-1n), 1n, 2n, 'floor')).toBe(-1n);
    expect(multiplyGoldRatio(goldUnits(-1n), 1n, 2n, 'ceil')).toBe(0n);
    expect(multiplyGoldRatio(goldUnits(-1n), 1n, 2n, 'trunc')).toBe(0n);
    expect(roundGoldToGB(goldUnits(-40n), 'floor')).toBe(-120n);
    expect(roundGoldToGB(goldUnits(40n), 'ceil')).toBe(120n);
    expect(() => roundGoldToGB(goldUnits(40n), 'exact')).toThrow();
    expect(() => multiplyGoldRatio(goldUnits(1n), 1n, 0n)).toThrow();
  });

  it('preserves arbitrary precision for gold, RP, arithmetic and comparisons', () => {
    const gold = goldFromGB('9007199254740993.1');
    expect(gold).toBe(1080863910568919172n);
    expect(compareGold(subtractGold(gold, goldUnits(1n)), gold)).toBe(-1);
    for (const value of [65536n, 9007199254740993n, 10n ** 150n]) {
      const rp = regencyPoints(value);
      expect(subtractRegency(addRegency(rp, regencyPoints(1n)), regencyPoints(1n))).toBe(rp);
      expect(multiplyRegencyRatio(multiplyRegency(rp, 3n), 1n, 3n)).toBe(rp);
      expect(compareRegency(addRegency(rp, regencyPoints(1n)), rp)).toBe(1);
      expect(deserializeRegency(serializeRegency(rp))).toBe(rp);
    }
    expect(multiplyRegencyRatio(regencyPoints(1n), 1n, 2n, 'ceil')).toBe(1n);
    expect(() => multiplyRegencyRatio(regencyPoints(1n), 1n, 2n)).toThrow();
    expect(() => subtractRegency(regencyPoints(0n), regencyPoints(1n))).toThrow();
    expect(deserializeGold(serializeGold(gold))).toBe(gold);
  });

  it('accepts only lossless documented numeric conversion boundaries', () => {
    expect(goldFromLegacyGB(15)).toBe(1800n);
    expect(goldFromLegacyGB(142.5)).toBe(17100n);
    expect(regencyFromLegacy(70000)).toBe(70000n);
    expect(() => regencyFromLegacy(Number.MAX_SAFE_INTEGER + 1)).toThrow('safe integer');
    expect(() => regencyFromLegacy(0.5)).toThrow();
    expect(() => goldFromLegacyGB(Infinity)).toThrow();
    expect(() => goldFromLegacyGB(Number.MAX_SAFE_INTEGER)).toThrow();
    expect(() => goldFromLegacyGB(0.1 + 0.2)).toThrow();
  });

  it('uses canonical strings for stored integers and exact human-readable fractions', () => {
    for (const invalid of ['00', '01', '+1', '-0', '1.0', '1e6', '0x10', ' 1', '1 ', '']) {
      expect(() => deserializeGold(invalid)).toThrow();
      expect(() => deserializeRegency(invalid)).toThrow();
    }
    expect(() => deserializeRegency('-1')).toThrow();
    expect(formatGold(goldFromGB(0n))).toBe('0 GB');
    expect(formatGold(goldFromGB('142.5'))).toBe('142.5 GB');
    expect(formatGold(goldFromGB('0.025'))).toBe('0.025 GB');
    expect(formatGold(goldFromGBRatio(1n, 3n))).toBe('1/3 GB');
    expect(formatGold(goldFromGBRatio(-4n, 3n))).toBe('-1 1/3 GB');
    expect(formatGold(goldUnits(1n))).toBe('1/120 GB');
    expect(formatRegency(regencyPoints('9007199254740993'))).toBe('9007199254740993 RP');
  });
});
