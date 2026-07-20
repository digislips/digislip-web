const {
  PROMOTION_TYPES,
  defaultsForType,
  validatePromotionForm,
  buildCreatePromotionPayload,
} = require('./promo-form-logic');

// Mirrors the backend's validatePromotionPayload rules (digislip-web#9 PRD /
// digislip-backend#31, not yet built) so the merchant sees the same errors
// client-side before a round-trip exists.

function stampCard(overrides) {
  return Object.assign({
    title: 'Coffee club',
    type: 'stamp_card',
    stamps_required: 8,
    description: 'Buy any coffee to earn a stamp.',
    reward_description: 'Free coffee',
    expires_at: '2026-12-31',
  }, overrides);
}

function coupon(overrides) {
  return Object.assign({
    title: '10% off',
    type: 'coupon',
    description: 'Show this coupon at checkout.',
    reward_description: '10% off your order',
    expires_at: '2026-12-31',
  }, overrides);
}

describe('validatePromotionForm', () => {
  test('a fully filled stamp card is valid', () => {
    expect(validatePromotionForm(stampCard())).toEqual({ valid: true, errors: {} });
  });

  test('a fully filled coupon is valid', () => {
    expect(validatePromotionForm(coupon())).toEqual({ valid: true, errors: {} });
  });

  test('missing title', () => {
    const result = validatePromotionForm(stampCard({ title: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.title).toBeTruthy();
  });

  test('whitespace-only title counts as missing', () => {
    const result = validatePromotionForm(stampCard({ title: '   ' }));
    expect(result.valid).toBe(false);
    expect(result.errors.title).toBeTruthy();
  });

  test('missing type', () => {
    const result = validatePromotionForm(stampCard({ type: undefined }));
    expect(result.valid).toBe(false);
    expect(result.errors.type).toBeTruthy();
  });

  test('invalid type value', () => {
    const result = validatePromotionForm(stampCard({ type: 'discount' }));
    expect(result.valid).toBe(false);
    expect(result.errors.type).toBeTruthy();
  });

  test('missing description', () => {
    const result = validatePromotionForm(stampCard({ description: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.description).toBeTruthy();
  });

  test('missing reward_description', () => {
    const result = validatePromotionForm(stampCard({ reward_description: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.reward_description).toBeTruthy();
  });

  test('missing expires_at', () => {
    const result = validatePromotionForm(stampCard({ expires_at: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.expires_at).toBeTruthy();
  });

  test('missing expires_at is still an error when never_expires is explicitly false', () => {
    const result = validatePromotionForm(stampCard({ expires_at: '', never_expires: false }));
    expect(result.valid).toBe(false);
    expect(result.errors.expires_at).toBeTruthy();
  });

  test('never_expires bypasses the expires_at requirement', () => {
    const result = validatePromotionForm(stampCard({ expires_at: '', never_expires: true }));
    expect(result.valid).toBe(true);
    expect(result.errors.expires_at).toBeUndefined();
  });

  test('never_expires does not suppress other missing fields', () => {
    const result = validatePromotionForm(stampCard({ expires_at: '', never_expires: true, title: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.title).toBeTruthy();
    expect(result.errors.expires_at).toBeUndefined();
  });

  test('stamp_card missing stamps_required', () => {
    const result = validatePromotionForm(stampCard({ stamps_required: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.stamps_required).toBeTruthy();
  });

  test('stamp_card with stamps_required of 0 is invalid', () => {
    const result = validatePromotionForm(stampCard({ stamps_required: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors.stamps_required).toBeTruthy();
  });

  test('stamp_card with a negative stamps_required is invalid', () => {
    const result = validatePromotionForm(stampCard({ stamps_required: -3 }));
    expect(result.valid).toBe(false);
    expect(result.errors.stamps_required).toBeTruthy();
  });

  test('stamp_card with a non-integer stamps_required is invalid', () => {
    const result = validatePromotionForm(stampCard({ stamps_required: 3.5 }));
    expect(result.valid).toBe(false);
    expect(result.errors.stamps_required).toBeTruthy();
  });

  test('stamp_card with a non-numeric stamps_required is invalid', () => {
    const result = validatePromotionForm(stampCard({ stamps_required: 'abc' }));
    expect(result.valid).toBe(false);
    expect(result.errors.stamps_required).toBeTruthy();
  });

  test('coupon ignores a missing stamps_required (not applicable to this type)', () => {
    const result = validatePromotionForm(coupon({ stamps_required: '' }));
    expect(result.valid).toBe(true);
    expect(result.errors.stamps_required).toBeUndefined();
  });

  test('coupon ignores an invalid stamps_required (not applicable to this type)', () => {
    const result = validatePromotionForm(coupon({ stamps_required: -1 }));
    expect(result.valid).toBe(true);
    expect(result.errors.stamps_required).toBeUndefined();
  });

  test('reports every missing field at once for a blank stamp card', () => {
    const result = validatePromotionForm({ type: 'stamp_card' });
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual(
      ['description', 'expires_at', 'reward_description', 'stamps_required', 'title'].sort()
    );
  });

  test('an entirely empty form does not require stamps_required (type is unset, not stamp_card)', () => {
    const result = validatePromotionForm({});
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual(
      ['description', 'expires_at', 'reward_description', 'title', 'type'].sort()
    );
  });
});

describe('defaultsForType', () => {
  test('stamp_card defaults to a 24h cooldown and no claim cap', () => {
    expect(defaultsForType('stamp_card')).toEqual({ cooldown_hours: 24, claim_cap: null });
  });

  test('coupon defaults to no cooldown and a claim cap of 1', () => {
    expect(defaultsForType('coupon')).toEqual({ cooldown_hours: 0, claim_cap: 1 });
  });

  test('PROMOTION_TYPES lists both supported types', () => {
    expect(PROMOTION_TYPES).toEqual(['stamp_card', 'coupon']);
  });
});

// buildCreatePromotionPayload turns the form's collected values (strings,
// straight from inputs) into the exact JSON body create-promotion expects
// (digislip-backend#31): numeric stamps_required/claim_cap/cooldown_hours,
// stamps_required omitted for coupons, expires_at null when never_expires.

function collectedStampCard(overrides) {
  return Object.assign({
    title: 'Coffee club',
    type: 'stamp_card',
    stamps_required: '8',
    description: 'Buy any coffee to earn a stamp.',
    reward_description: 'Free coffee',
    expires_at: '2026-12-31',
    never_expires: false,
    claim_cap: '',
    cooldown_hours: '24',
  }, overrides);
}

function collectedCoupon(overrides) {
  return Object.assign({
    title: '10% off',
    type: 'coupon',
    stamps_required: '',
    description: 'Show this coupon at checkout.',
    reward_description: '10% off your order',
    expires_at: '2026-12-31',
    never_expires: false,
    claim_cap: '1',
    cooldown_hours: '0',
  }, overrides);
}

describe('buildCreatePromotionPayload', () => {
  test('stamp card payload carries text fields through and numeric-coerces stamps_required/claim_cap/cooldown_hours', () => {
    expect(buildCreatePromotionPayload(collectedStampCard())).toEqual({
      title: 'Coffee club',
      type: 'stamp_card',
      description: 'Buy any coffee to earn a stamp.',
      reward_description: 'Free coffee',
      expires_at: '2026-12-31',
      stamps_required: 8,
      claim_cap: null,
      cooldown_hours: 24,
    });
  });

  test('coupon payload omits stamps_required entirely', () => {
    const payload = buildCreatePromotionPayload(collectedCoupon());
    expect(payload).not.toHaveProperty('stamps_required');
    expect(payload).toEqual({
      title: '10% off',
      type: 'coupon',
      description: 'Show this coupon at checkout.',
      reward_description: '10% off your order',
      expires_at: '2026-12-31',
      claim_cap: 1,
      cooldown_hours: 0,
    });
  });

  test('never_expires sends expires_at as null, even if a stale date string is present', () => {
    const payload = buildCreatePromotionPayload(collectedStampCard({ never_expires: true, expires_at: '' }));
    expect(payload.expires_at).toBeNull();
  });

  test('blank claim_cap becomes null (unlimited)', () => {
    const payload = buildCreatePromotionPayload(collectedStampCard({ claim_cap: '' }));
    expect(payload.claim_cap).toBeNull();
  });

  test('a numeric claim_cap string is coerced to a number', () => {
    const payload = buildCreatePromotionPayload(collectedStampCard({ claim_cap: '5' }));
    expect(payload.claim_cap).toBe(5);
  });

  test('cooldown_hours string is coerced to a number', () => {
    const payload = buildCreatePromotionPayload(collectedStampCard({ cooldown_hours: '48' }));
    expect(payload.cooldown_hours).toBe(48);
  });

  test('stamps_required string is coerced to a number', () => {
    const payload = buildCreatePromotionPayload(collectedStampCard({ stamps_required: '12' }));
    expect(payload.stamps_required).toBe(12);
  });
});
