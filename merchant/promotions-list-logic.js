// Pure, DOM-free display formatting for the merchant dashboard's promotions
// list (digislip-web#12). No cross-file requires so this stays a plain
// classic <script> the page can load directly, same convention as
// promo-form-logic.js / promo-preview.js / reset-logic.js.

function typeLabel(type) {
  return type === 'coupon' ? 'Coupon' : 'Stamp card';
}

function formatStampSummary(stampsRequired, rewardDescription) {
  var count = Number(stampsRequired) || 0;
  var base = count + ' ' + (count === 1 ? 'stamp' : 'stamps');
  return rewardDescription ? base + ' · ' + rewardDescription : base;
}

function formatCouponSummary(rewardDescription) {
  return rewardDescription || '';
}

function formatPromotionSummary(promotion) {
  promotion = promotion || {};
  if (promotion.type === 'coupon') return formatCouponSummary(promotion.reward_description);
  return formatStampSummary(promotion.stamps_required, promotion.reward_description);
}

function formatExpiryLabel(expiresAt) {
  if (!expiresAt) return 'No expiry';
  var date = new Date(expiresAt);
  var d = String(date.getDate()).padStart(2, '0');
  var m = String(date.getMonth() + 1).padStart(2, '0');
  return 'Expires ' + d + '/' + m + '/' + date.getFullYear();
}

function formatStateLabel(active) {
  return active ? 'Active' : 'Inactive';
}

function toggleActionLabel(active) {
  return active ? 'Deactivate' : 'Reactivate';
}

function deactivateConfirmMessage() {
  return 'Deactivating stops all further stamping on this promotion immediately, ' +
    'including customers already partway through a stamp card. ' +
    'Already-issued rewards will still be redeemable. Are you sure?';
}

if (typeof module !== 'undefined') {
  module.exports = {
    typeLabel: typeLabel,
    formatStampSummary: formatStampSummary,
    formatCouponSummary: formatCouponSummary,
    formatPromotionSummary: formatPromotionSummary,
    formatExpiryLabel: formatExpiryLabel,
    formatStateLabel: formatStateLabel,
    toggleActionLabel: toggleActionLabel,
    deactivateConfirmMessage: deactivateConfirmMessage,
  };
}
