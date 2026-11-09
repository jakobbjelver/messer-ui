// OKLCH ↔ sRGB, WCAG contrast, ramp derivation. No dependencies.

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

export function parseHex(hex) {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`not a hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function oklchToLinearRgb({ l, c, h }) {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const L = l_ ** 3, M = m_ ** 3, S = s_ ** 3;
  const x = 1.2270138511 * L - 0.5577999807 * M + 0.281256149 * S;
  const y = -0.0405801784 * L + 1.1122568696 * M - 0.0716766787 * S;
  const z = -0.0763812845 * L - 0.4214819784 * M + 1.5861632204 * S;
  return [
    clamp(3.2409699419 * x - 1.5373831776 * y - 0.4986107603 * z),
    clamp(-0.9692436363 * x + 1.8759675015 * y + 0.0415550574 * z),
    clamp(0.0556300797 * x - 0.2039769589 * y + 1.0569715142 * z),
  ];
}

export function linearRgbToOklch([r, g, b]) {
  const x = 0.4123907993 * r + 0.3575843394 * g + 0.1804807884 * b;
  const y = 0.2126390059 * r + 0.7151686788 * g + 0.0721923154 * b;
  const z = 0.0193308187 * r + 0.1191947798 * g + 0.9505321522 * b;
  const L = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z);
  const M = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z);
  const S = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.633851707 * z);
  const l = 0.2104542553 * L + 0.793617785 * M - 0.0040720468 * S;
  const a = 1.9779984951 * L - 2.428592205 * M + 0.4505937099 * S;
  const bb = 0.0259040371 * L + 0.7827717662 * M - 0.808675766 * S;
  const c = Math.sqrt(a * a + bb * bb);
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l, c, h };
}

/** Accepts "oklch(l c h)" (l may be 0-1 or a percentage) or a hex string. */
export function parseColor(value) {
  const s = String(value).trim().toLowerCase();
  if (s.startsWith("#")) {
    const [r, g, b] = parseHex(s);
    return linearRgbToOklch([toLinear(r), toLinear(g), toLinear(b)]);
  }
  const m = s.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*[\d.]+)?\)$/);
  if (!m) throw new Error(`unsupported colour syntax: ${value}`);
  const l = m[1].endsWith("%") ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
  return { l, c: parseFloat(m[2]), h: parseFloat(m[3]) };
}

export const formatOklch = ({ l, c, h }) =>
  `oklch(${+l.toFixed(4)} ${+c.toFixed(4)} ${+h.toFixed(1)})`;

export function relativeLuminance(value) {
  const { l, c, h } = typeof value === "string" ? parseColor(value) : value;
  const [r, g, b] = oklchToLinearRgb({ l, c, h });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const contrast = (a, b) => {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** #ffffff or #0a0a0a — whichever contrasts more with the accent. */
export function accentFg(accent) {
  return contrast(accent, "#ffffff") >= contrast(accent, "#0a0a0a") ? "#ffffff" : "#0a0a0a";
}

export const SIGNAL_HUE = 205;
export const STATUS_HUES = { danger: 25, warning: 75, success: 150 };

const RAMP = {
  light: [0.82, 0.7, 0.58, 0.46, 0.34],
  dark: [0.86, 0.74, 0.62, 0.5, 0.38],
};

/** Five chart steps on the accent's hue; achromatic brands borrow the family signal hue. */
export function chartRamp(accent, mode) {
  const { c, h } = parseColor(accent);
  const achromatic = c < 0.012;
  const hue = achromatic ? SIGNAL_HUE : h;
  const chroma = achromatic ? 0.02 : Math.max(0.04, Math.min(c, 0.16));
  return RAMP[mode].map((l) => formatOklch({ l, c: chroma * (l > 0.7 ? 0.75 : 1), h: hue }));
}

/**
 * Six categorical steps. A categorical series is not a magnitude ramp: series are told apart by
 * chroma and hue first, lightness second. Chromatic brands lead with the accent and continue with
 * neutrals; achromatic brands get six neutrals, because a near-black accent cannot anchor a set.
 */
const CAT_LADDER = {
  light: [0.88, 0.76, 0.64, 0.52, 0.4, 0.28],
  dark: [0.9, 0.78, 0.66, 0.54, 0.42, 0.3],
};

export function categoricalRamp(accent, mode) {
  const { c } = parseColor(accent);
  const achromatic = c < 0.03;
  const neutrals = CAT_LADDER[mode].map((l) => formatOklch({ l, c: 0.006, h: SIGNAL_HUE }));
  if (achromatic) return neutrals;
  return [accent, ...neutrals.slice(1)];
}

/** Smallest angular distance between two hues, in degrees. */
export function hueDistance(a, b) {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}
