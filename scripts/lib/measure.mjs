// Shared measurement for snapshot + check: reads computed styles off a rendered sink.

export const MUST_MONO = ["h3", "h4", "label", "data", "table-th", "table-num", "code", "kbd", "panel-title"];
export const MUST_SANS = ["h1", "h2", "body", "btn-primary", "btn-secondary", "btn-ghost", "input", "textarea", "tab-active"];
export const CIRCLE = /^(avatar|dot)/;

export const PROPS = [
  "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "color",
  "backgroundColor", "borderRadius", "borderTopWidth", "height", "paddingLeft", "paddingTop",
];

export function measure(page) {
  return page.evaluate((props) => {
    // Computed colours come back as rgb(), lab() or oklab() depending on the source syntax.
    // Normalise through a canvas so two spellings of the same colour compare equal.
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const toRgb = (value) => {
      if (!value || value === "transparent" || value.startsWith("rgb")) return value;
      try {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = "#000";
        ctx.fillStyle = value;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
      } catch {
        return value;
      }
    };
    const out = {};
    for (const el of document.querySelectorAll("[data-fixture]")) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const rec = {};
      for (const p of props) rec[p] = cs[p];
      rec.height = Math.round(r.height * 100) / 100;
      rec.overflow = el.scrollWidth - el.clientWidth;
      rec.tag = el.tagName.toLowerCase();
      // keep the first family only: next/font appends generated fallbacks
      rec.fontFamily = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
      rec.color = toRgb(cs.color);
      rec.backgroundColor = toRgb(cs.backgroundColor);
      out[el.dataset.fixture] = rec;
    }
    return {
      fixtures: out,
      bodyFont: getComputedStyle(document.body).fontFamily.split(",")[0].replace(/["']/g, "").trim(),
      fontsLoaded: {
        golos: document.fonts.check('14px "Golos Text"') || document.fonts.check("14px Golos"),
        mono: document.fonts.check('12px "JetBrains Mono"') || document.fonts.check("12px JetBrains Mono"),
      },
      docWidth: document.documentElement.scrollWidth,
      viewport: innerWidth,
    };
  }, PROPS);
}

export const num = (v) => (typeof v === "string" && v.endsWith("px") ? parseFloat(v) : v === "normal" ? 0 : NaN);

export function rgbTuple(v) {
  const m = String(v).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  return m[1].split(/[,\s/]+/).slice(0, 3).map(Number);
}

export function rgbClose(a, b, tolerance = 3) {
  const [x, y] = [rgbTuple(a), rgbTuple(b)];
  if (!x || !y) return a === b;
  return x.every((v, i) => Math.abs(v - y[i]) <= tolerance);
}
