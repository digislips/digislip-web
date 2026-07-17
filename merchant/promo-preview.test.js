const {
  merchantColor,
  computeStampLayout,
  formatExpiry,
  formatStampFooter,
  formatCouponFooter,
  MAX_PER_ROW,
  GAP_RATIO,
  MIN_STAMP_SIZE,
  MAX_STAMP_SIZE,
} = require('./promo-preview');

// Expected hex pairs computed by running digislip-app's actual merchant-color.ts
// algorithm (same hash, same OKLCH tuning) so this locks in byte-identical output.
describe('merchantColor', () => {
  test.each([
    ['Pick n Pay', { text: '#a74a04', bg: '#fde2d4' }],
    ['Woolworths', { text: '#804ab0', bg: '#ede2fb' }],
    ['Checkers', { text: '#0a7397', bg: '#d1edfb' }],
    ['City Fresh', { text: '#814aaf', bg: '#eee2fb' }],
    ['PEP', { text: '#0a796f', bg: '#cff0ea' }],
    ['X', { text: '#9c5300', bg: '#fbe3d2' }],
    ['café', { text: '#866206', bg: '#f3e6ce' }],
    ['北京烤鸭', { text: '#627206', bg: '#e5ecd2' }],
    ['🎉', { text: '#8349ae', bg: '#eee2fa' }],
  ])('produces the app-identical colour pair for %j', (name, expected) => {
    expect(merchantColor(name)).toEqual(expected);
  });

  test('empty name matches the app\'s "?" fallback', () => {
    expect(merchantColor('')).toEqual({ text: '#8747aa', bg: '#f0e2f9' });
  });

  test('is deterministic', () => {
    expect(merchantColor('Woolworths')).toEqual(merchantColor('Woolworths'));
  });
});

describe('computeStampLayout', () => {
  test('rowWidth null falls back to minimum size', () => {
    expect(computeStampLayout(null, 5).stampSize).toBe(MIN_STAMP_SIZE);
  });

  test('a wide row with few stamps caps at MAX_STAMP_SIZE with matching gap', () => {
    const result = computeStampLayout(1000, 3);
    expect(result.stampSize).toBe(MAX_STAMP_SIZE);
    expect(result.stampGap).toBeCloseTo(MAX_STAMP_SIZE * GAP_RATIO, 5);
  });

  test('a narrow row with 10 stamps floors at MIN_STAMP_SIZE', () => {
    expect(computeStampLayout(50, 10).stampSize).toBe(MIN_STAMP_SIZE);
  });

  test('15 stamps sizes identically to 10 stamps at the same row width (locks at MAX_PER_ROW density)', () => {
    expect(computeStampLayout(200, 15)).toEqual(computeStampLayout(200, 10));
  });

  test('stampsRequired 0 is treated as 1', () => {
    expect(computeStampLayout(null, 0)).toEqual(computeStampLayout(null, 1));
  });

  test('iconSize is stampSize * 0.45, rounded', () => {
    const result = computeStampLayout(25, 1);
    expect(result.stampSize).toBe(25);
    expect(result.iconSize).toBe(11);
  });

  test.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])('stampsRequired %i at a 300px row stays within bounds', (n) => {
    const result = computeStampLayout(300, n);
    expect(result.stampSize).toBeGreaterThanOrEqual(MIN_STAMP_SIZE);
    expect(result.stampSize).toBeLessThanOrEqual(MAX_STAMP_SIZE);
    expect(result.iconSize).toBe(Math.round(result.stampSize * 0.45));
  });

  test('MAX_PER_ROW is 10', () => {
    expect(MAX_PER_ROW).toBe(10);
  });
});

describe('formatExpiry', () => {
  test('formats an ISO string as dd/mm/yyyy with an "Expires" prefix', () => {
    expect(formatExpiry('2026-07-31T12:00:00')).toBe('Expires 31/07/2026');
  });

  test('zero-pads a single-digit day', () => {
    expect(formatExpiry('2026-07-03T12:00:00')).toBe('Expires 03/07/2026');
  });

  test('zero-pads a single-digit month', () => {
    expect(formatExpiry('2026-02-15T12:00:00')).toBe('Expires 15/02/2026');
  });
});

describe('formatStampFooter', () => {
  test('includes reward description when present', () => {
    expect(formatStampFooter(3, 8, 'Free coffee')).toBe('3 of 8 stamps · Free coffee');
  });

  test('omits the separator when reward description is missing', () => {
    expect(formatStampFooter(3, 8, null)).toBe('3 of 8 stamps');
    expect(formatStampFooter(3, 8, '')).toBe('3 of 8 stamps');
    expect(formatStampFooter(3, 8, undefined)).toBe('3 of 8 stamps');
  });

  test('clamps stampCount to stampsRequired, matching StampCard', () => {
    expect(formatStampFooter(12, 8, null)).toBe('8 of 8 stamps');
  });
});

describe('formatCouponFooter', () => {
  test('returns the reward description as-is', () => {
    expect(formatCouponFooter('10% off your next visit')).toBe('10% off your next visit');
  });

  test('returns an empty string when there is no reward description', () => {
    expect(formatCouponFooter(null)).toBe('');
    expect(formatCouponFooter(undefined)).toBe('');
    expect(formatCouponFooter('')).toBe('');
  });
});
