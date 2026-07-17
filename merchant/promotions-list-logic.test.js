const {
  typeLabel,
  formatStampSummary,
  formatCouponSummary,
  formatPromotionSummary,
  formatExpiryLabel,
  formatStateLabel,
} = require('./promotions-list-logic');

describe('typeLabel', () => {
  test('stamp_card', () => {
    expect(typeLabel('stamp_card')).toBe('Stamp card');
  });

  test('coupon', () => {
    expect(typeLabel('coupon')).toBe('Coupon');
  });
});

describe('formatStampSummary', () => {
  test('pluralizes stamps and includes the reward', () => {
    expect(formatStampSummary(8, 'Free coffee')).toBe('8 stamps · Free coffee');
  });

  test('uses singular "stamp" for a count of 1', () => {
    expect(formatStampSummary(1, 'Free coffee')).toBe('1 stamp · Free coffee');
  });

  test('omits the separator when there is no reward description', () => {
    expect(formatStampSummary(8, null)).toBe('8 stamps');
  });

  test('omits the separator when the reward description is blank', () => {
    expect(formatStampSummary(8, '')).toBe('8 stamps');
  });
});

describe('formatCouponSummary', () => {
  test('returns the reward description as-is', () => {
    expect(formatCouponSummary('10% off your order')).toBe('10% off your order');
  });

  test('returns an empty string when there is no reward description', () => {
    expect(formatCouponSummary(null)).toBe('');
  });
});

describe('formatPromotionSummary', () => {
  test('dispatches stamp_card promotions to formatStampSummary', () => {
    const promo = { type: 'stamp_card', stamps_required: 8, reward_description: 'Free coffee' };
    expect(formatPromotionSummary(promo)).toBe('8 stamps · Free coffee');
  });

  test('dispatches coupon promotions to formatCouponSummary', () => {
    const promo = { type: 'coupon', reward_description: '10% off' };
    expect(formatPromotionSummary(promo)).toBe('10% off');
  });
});

describe('formatExpiryLabel', () => {
  test('formats an ISO string as dd/mm/yyyy with an "Expires" prefix', () => {
    expect(formatExpiryLabel('2026-07-31T12:00:00')).toBe('Expires 31/07/2026');
  });

  test('zero-pads a single-digit day', () => {
    expect(formatExpiryLabel('2026-07-03T12:00:00')).toBe('Expires 03/07/2026');
  });

  test('zero-pads a single-digit month', () => {
    expect(formatExpiryLabel('2026-02-15T12:00:00')).toBe('Expires 15/02/2026');
  });

  test('falls back to "No expiry" when there is no expiry date', () => {
    expect(formatExpiryLabel(null)).toBe('No expiry');
  });
});

describe('formatStateLabel', () => {
  test('active', () => {
    expect(formatStateLabel(true)).toBe('Active');
  });

  test('inactive', () => {
    expect(formatStateLabel(false)).toBe('Inactive');
  });
});
