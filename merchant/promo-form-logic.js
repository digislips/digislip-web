// Pure, DOM-free validation and defaulting rules for the create-promotion
// form (digislip-web#9 PRD). Mirrors the backend's validatePromotionPayload
// rules (digislip-backend#31, not yet built) so the merchant sees the same
// errors client-side ahead of that round-trip existing.

var PROMOTION_TYPES = ['stamp_card', 'coupon'];

function defaultsForType(type) {
  if (type === 'coupon') return { cooldown_hours: 0, claim_cap: 1 };
  return { cooldown_hours: 24, claim_cap: null };
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function validatePromotionForm(values) {
  values = values || {};
  var errors = {};

  if (isBlank(values.title)) errors.title = 'Title is required.';
  if (PROMOTION_TYPES.indexOf(values.type) === -1) errors.type = 'Choose a promotion type.';
  if (isBlank(values.description)) errors.description = 'Describe how customers earn this.';
  if (isBlank(values.reward_description)) errors.reward_description = 'Describe the reward.';
  if (!values.never_expires && isBlank(values.expires_at)) errors.expires_at = 'Set an expiry date, or mark it as never expiring.';

  if (values.type === 'stamp_card') {
    var stamps = Number(values.stamps_required);
    if (isBlank(values.stamps_required) || !Number.isInteger(stamps) || stamps < 1) {
      errors.stamps_required = 'Enter the number of stamps required.';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors: errors };
}

if (typeof module !== 'undefined') {
  module.exports = {
    PROMOTION_TYPES: PROMOTION_TYPES,
    defaultsForType: defaultsForType,
    validatePromotionForm: validatePromotionForm,
  };
}
