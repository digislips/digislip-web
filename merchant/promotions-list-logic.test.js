const {
  typeLabel,
  formatStampSummary,
  formatCouponSummary,
  formatPromotionSummary,
  formatExpiryLabel,
  formatStateLabel,
  toggleActionLabel,
  deactivateConfirmMessage,
  buildPromoPayloadUrl,
  nfcPayloadExplainer,
  copyButtonLabel,
  formatClaimCap,
  formatCooldownHours,
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

describe('toggleActionLabel', () => {
  test('offers to deactivate an active promotion', () => {
    expect(toggleActionLabel(true)).toBe('Deactivate');
  });

  test('offers to reactivate an inactive promotion', () => {
    expect(toggleActionLabel(false)).toBe('Reactivate');
  });
});

describe('deactivateConfirmMessage', () => {
  test('warns that stamping stops immediately for in-progress cards, and that issued rewards remain redeemable', () => {
    const message = deactivateConfirmMessage();
    expect(message).toMatch(/immediately/i);
    expect(message).toMatch(/already.*(partway|progress)/i);
    expect(message).toMatch(/redeemable/i);
  });

  test('is a non-empty string', () => {
    expect(typeof deactivateConfirmMessage()).toBe('string');
    expect(deactivateConfirmMessage().length).toBeGreaterThan(0);
  });
});

describe('buildPromoPayloadUrl', () => {
  test('builds the NFC/App Link claim URL from a promotion id', () => {
    expect(buildPromoPayloadUrl('c48db1c9-1234-4abc-8def-000000000000'))
      .toBe('https://digislips.co.za/promo/c48db1c9-1234-4abc-8def-000000000000');
  });
});

describe('nfcPayloadExplainer', () => {
  test('explains the URL is for programming an NFC chip to let customers tap to claim', () => {
    const message = nfcPayloadExplainer();
    expect(message).toMatch(/NFC/);
    expect(message).toMatch(/tap/i);
    expect(message).toMatch(/claim/i);
  });

  test('contains no em dashes, per house style', () => {
    expect(nfcPayloadExplainer()).not.toMatch(/—/);
  });
});

describe('copyButtonLabel', () => {
  test('reads "Copy" before the URL has been copied', () => {
    expect(copyButtonLabel(false)).toBe('Copy');
  });

  test('reads "Copied" right after a successful copy', () => {
    expect(copyButtonLabel(true)).toBe('Copied');
  });
});

describe('formatClaimCap', () => {
  test('reads "Unlimited" when there is no cap', () => {
    expect(formatClaimCap(null)).toBe('Unlimited');
  });

  test('uses singular phrasing for a cap of 1', () => {
    expect(formatClaimCap(1)).toBe('1 time per customer');
  });

  test('uses plural phrasing for a cap greater than 1', () => {
    expect(formatClaimCap(5)).toBe('5 times per customer');
  });
});

describe('formatCooldownHours', () => {
  test('reads "No cooldown" for a value of 0', () => {
    expect(formatCooldownHours(0)).toBe('No cooldown');
  });

  test('uses singular phrasing for a cooldown of 1 hour', () => {
    expect(formatCooldownHours(1)).toBe('1 hour');
  });

  test('uses plural phrasing for a cooldown greater than 1 hour', () => {
    expect(formatCooldownHours(24)).toBe('24 hours');
  });
});
