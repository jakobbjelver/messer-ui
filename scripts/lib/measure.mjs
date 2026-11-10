// Shared measurement for snapshot + check: reads computed styles off a rendered sink.

export const MUST_MONO = ["h3", "h4", "label", "data", "table-th", "table-num", "code", "kbd", "panel-title"];
export const MUST_SANS = ["h1", "h2", "body", "btn-primary", "btn-secondary", "btn-ghost", "input", "textarea", "tab-active"];
export const CIRCLE = /^(avatar|dot)/;

export const PROPS = [
  "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "color",
  "backgroundColor", "borderRadius", "borderTopWidth", "height", "paddingLeft", "paddingTop",
  "boxShadow", "fontVariantNumeric", "opacity", "cursor", "transitionDuration", "transform",
  "outlineWidth", "outlineOffset", "outlineStyle", "outlineColor",
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
      // Fontsource ships families as "<Name> Variable"; next/font emits the same typeface under the
      // plain name. Normalise so packaging never reads as a design difference.
      rec.fontFamily = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim().replace(/\s+Variable$/, "");
      rec.color = toRgb(cs.color);
      rec.backgroundColor = toRgb(cs.backgroundColor);
      out[el.dataset.fixture] = rec;
    }
    // Controls are measured by height (rule 10). Toggles are not density-scaled controls: a switch is
    // 18x32 and a checkbox is 16x16 in every port, and the pinned canon reference records switch at
    // 18.39. Radix and Base UI render them as <button role=switch|checkbox|radio>, so the exclusion
    // has to be by role — filtering on input[type] alone lets every port that uses the shadcn atoms
    // fail on geometry the canon itself ships.
    const TOGGLE = "[role=switch], [role=checkbox], [role=radio], [role=radiogroup], [role=slider]";
    const controls = [...document.querySelectorAll("button, [role=button], select, input, [role=tablist]")]
      .filter((el) => {
        if (el.closest("[data-overlay]")) return false;
        if (el.matches(TOGGLE)) return false;
        // A tab trigger is measured through its track: the segmented control is the 32/36px tablist
        // and the trigger is a 24-28px cell inside it. Measuring both double-counts one control.
        if (el.matches("[role=tab]") && el.closest("[role=tablist]")) return false;
        if (el.matches("input") && ["checkbox", "radio", "range", "color", "file", "hidden"].includes(el.type)) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })
      .map((el) => ({
        h: Math.round(el.getBoundingClientRect().height * 10) / 10,
        label: (el.getAttribute("aria-label") || el.getAttribute("placeholder") ||
          el.closest("label")?.textContent || el.textContent || el.getAttribute("role") || el.tagName)
          .trim().replace(/\s+/g, " ").slice(0, 24),
      }));

    // The accent budget is measured per [data-page] composition, not per sink: a kitchen sink shows
    // every variant on purpose, a page must show one primary action.
    const primary = (() => {
      const probe = document.createElement("span");
      probe.style.background = "var(--primary)";
      document.body.append(probe);
      const c = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return c;
    })();
    const pages = [...document.querySelectorAll("[data-page]")].map((el) => {
      const r = el.getBoundingClientRect();
      const area = r.width * r.height;
      let fills = 0, fillArea = 0;
      for (const n of el.querySelectorAll("*")) {
        const cs = getComputedStyle(n);
        const nr = n.getBoundingClientRect();
        if (cs.backgroundColor === primary && nr.width > 0) {
          fills++;
          fillArea += nr.width * nr.height;
        }
      }
      return { id: el.dataset.page, fills, accentArea: area ? fillArea / area : 0 };
    });

    const statuses = [...document.querySelectorAll("[data-status]")].map((el) => ({
      name: el.getAttribute("data-status") || el.dataset.fixture || "status",
      hasIcon: !!el.querySelector("svg, img"),
      hasLabel: (el.textContent || "").trim().length > 0,
    }));

    return {
      fixtures: out,
      bodyFont: getComputedStyle(document.body).fontFamily
        .split(",")[0].replace(/["']/g, "").trim().replace(/\s+Variable$/, ""),
      fontsLoaded: {
        golos: document.fonts.check('14px "Golos Text"') || document.fonts.check("14px Golos"),
        mono: document.fonts.check('12px "JetBrains Mono"') || document.fonts.check("12px JetBrains Mono"),
      },
      docWidth: document.documentElement.scrollWidth,
      viewport: innerWidth,
      controls,
      pages,
      statuses,
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
