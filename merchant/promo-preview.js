// Pure, DOM-free rendering rules ported from digislip-app so the merchant
// dashboard's create-promotion preview matches the real app pixel-for-pixel.
// No React Native / DOM imports — importable and testable standalone.
//
// Ported from:
//   digislip-app/src/lib/merchant-color.ts (merchantColor)
//   digislip-app/src/lib/stamp-layout.ts   (computeStampLayout + constants)
//   digislip-app/src/lib/format-date.ts    (formatExpiry)
//   digislip-app/src/components/StampCard.tsx  (stamp-count footer copy)
//   digislip-app/src/components/CouponCard.tsx (coupon footer copy)

// --- merchantColor ---------------------------------------------------------

var ACCENT_L = 0.52;
var ACCENT_CHROMA_CAP = 0.16;
var BG_L = 0.93;
var BG_CHROMA_CAP = 0.035;

function oklchToRgb(L, C, hueDeg) {
  var h = (hueDeg * Math.PI) / 180;
  var a = C * Math.cos(h);
  var b = C * Math.sin(h);

  var l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  var m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  var s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  var l = Math.pow(l_, 3);
  var m = Math.pow(m_, 3);
  var s = Math.pow(s_, 3);

  var r =  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  var g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  var bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  function gamma(x) { return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055; }
  function to255(x) { return Math.round(Math.max(0, Math.min(1, gamma(Math.max(0, Math.min(1, x))))) * 255); }

  return [to255(r), to255(g), to255(bl)];
}

function inGamut(L, C, hueDeg) {
  var h = (hueDeg * Math.PI) / 180;
  var a = C * Math.cos(h);
  var b = C * Math.sin(h);
  var l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  var m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  var s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  var l = Math.pow(l_, 3);
  var m = Math.pow(m_, 3);
  var s = Math.pow(s_, 3);
  var r =  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  var g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  var bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  var eps = 0.002;
  return r >= -eps && r <= 1 + eps && g >= -eps && g <= 1 + eps && bl >= -eps && bl <= 1 + eps;
}

function maxChroma(L, hueDeg, cap) {
  for (var c = cap; c >= 0.02; c -= 0.005) {
    if (inGamut(L, c, hueDeg)) return c;
  }
  return 0.02;
}

function toHex(rgb) {
  return '#' + rgb.map(function(x) { return x.toString(16).padStart(2, '0'); }).join('');
}

var hueCache = {};

function hueFor(name) {
  var hash = 0;
  for (var i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b) >>> 0;
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35) >>> 0;
  hash ^= hash >>> 16;
  return (hash >>> 0) % 360;
}

function merchantColor(name) {
  var hue = hueFor(name || '?');
  if (hueCache[hue]) return hueCache[hue];

  var color = {
    text: toHex(oklchToRgb(ACCENT_L, maxChroma(ACCENT_L, hue, ACCENT_CHROMA_CAP), hue)),
    bg: toHex(oklchToRgb(BG_L, maxChroma(BG_L, hue, BG_CHROMA_CAP), hue)),
  };
  hueCache[hue] = color;
  return color;
}

// --- computeStampLayout -----------------------------------------------------

var MAX_PER_ROW = 10;
var GAP_RATIO = 0.3;
var MIN_STAMP_SIZE = 20;
var MAX_STAMP_SIZE = 36;

function computeStampLayout(rowWidth, stampsRequired) {
  var perRow = Math.min(Math.max(stampsRequired, 1), MAX_PER_ROW);
  var rawSize = rowWidth ? rowWidth / (perRow + (perRow - 1) * GAP_RATIO) : MIN_STAMP_SIZE;
  var stampSize = Math.min(MAX_STAMP_SIZE, Math.max(MIN_STAMP_SIZE, rawSize));
  var stampGap = stampSize * GAP_RATIO;
  var iconSize = Math.round(stampSize * 0.45);
  return { stampSize: stampSize, stampGap: stampGap, iconSize: iconSize };
}

// --- field formatting --------------------------------------------------------

function formatExpiry(iso) {
  var date = new Date(iso);
  var d = String(date.getDate()).padStart(2, '0');
  var m = String(date.getMonth() + 1).padStart(2, '0');
  return 'Expires ' + d + '/' + m + '/' + date.getFullYear();
}

// Matches StampCard's footer: "{stampCount} of {stampsRequired} stamps · {reward_description}"
function formatStampFooter(stampCount, stampsRequired, rewardDescription) {
  var count = Math.min(stampCount, stampsRequired);
  var base = count + ' of ' + stampsRequired + ' stamps';
  return rewardDescription ? base + ' · ' + rewardDescription : base;
}

// Matches CouponCard's footer: the reward description shown as-is, or nothing.
function formatCouponFooter(rewardDescription) {
  return rewardDescription || '';
}

if (typeof module !== 'undefined') {
  module.exports = {
    merchantColor: merchantColor,
    computeStampLayout: computeStampLayout,
    formatExpiry: formatExpiry,
    formatStampFooter: formatStampFooter,
    formatCouponFooter: formatCouponFooter,
    MAX_PER_ROW: MAX_PER_ROW,
    GAP_RATIO: GAP_RATIO,
    MIN_STAMP_SIZE: MIN_STAMP_SIZE,
    MAX_STAMP_SIZE: MAX_STAMP_SIZE,
  };
}
