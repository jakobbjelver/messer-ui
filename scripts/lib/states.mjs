// Interaction probes for check.mjs. Measures what the page actually does when hovered, tabbed to,
// disabled or selected — not what the stylesheet says it should do.
//
// Fixtures opt in with data-state-hover / -focus / -disabled / -selected. The expectations live in
// canon/states.json; the assertions live in check.mjs.

export async function probeStates(page, contract = {}) {
  const out = { vars: {}, hover: [], focus: [], disabled: [], selected: [] };

  out.vars = await page.evaluate(() => {
    // Computed colours can arrive as oklch()/color(srgb …); normalise through a canvas so a var and
    // a fixture background compare as the same colour.
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1;
    const cx = cv.getContext("2d", { willReadFrequently: true });
    const toRgb = (value) => {
      if (!value || value === "transparent" || value.startsWith("rgb")) return value;
      try {
        cx.clearRect(0, 0, 1, 1);
        cx.fillStyle = "#000";
        cx.fillStyle = value;
        cx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data;
        return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
      } catch {
        return value;
      }
    };
    window.__messerRgb = toRgb;

    // Read the custom properties directly and resolve them through the canvas. Reading a probe
    // element's computed background inside one evaluate returns a stale value for the second and
    // later assignments (Chromium does not flush style between var() writes), so a probe is a trap.
    const root = getComputedStyle(document.documentElement);
    const read = (name) => toRgb(root.getPropertyValue(name).trim());
    const vars = {
      surface: read("--surface"),
      surface2: read("--surface-2"),
      primary: read("--primary"),
      primaryHover: read("--primary-hover"),
      ring: read("--ring"),
    };
    return vars;
  });

  const read = (sel, i) =>
    page.locator(sel).nth(i).evaluate((n) => {
      const cs = getComputedStyle(n);
      return {
        bg: window.__messerRgb(cs.backgroundColor),
        shadow: cs.boxShadow,
        transform: cs.transform,
        duration: cs.transitionDuration,
        opacity: cs.opacity,
        cursor: cs.cursor,
      };
    });

  /* ── hover ─────────────────────────────────────────────────────────────── */
  const hovers = await page.locator("[data-state-hover]").count();
  for (let i = 0; i < hovers; i++) {
    const before = await read("[data-state-hover]", i);
    await page.locator("[data-state-hover]").nth(i).hover();
    await page.waitForTimeout(220); // let --dur-fast finish
    const after = await read("[data-state-hover]", i);
    out.hover.push({ i, before, after });
    await page.mouse.move(1, 1);
    await page.waitForTimeout(150);
  }

  /* ── focus (keyboard modality, so :focus-visible is real) ──────────────── */
  const focusCount = await page.locator("[data-state-focus]").count();
  if (focusCount) {
    await page.evaluate(() => document.body.focus());
    const seen = new Set();
    for (let step = 0; step < 100 && out.focus.length < focusCount; step++) {
      await page.keyboard.press("Tab");
      // Only pay for a frame when a fixture is focused: the computed style of a just-focused
      // element can lag the pseudo-class change by one style pass.
      const onFixture = await page.evaluate(() =>
        !!document.activeElement?.matches?.("[data-state-focus]"));
      if (!onFixture) continue;
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || !el.matches("[data-state-focus]")) return null;
        const cs = getComputedStyle(el);
        return {
          key: el.dataset.fixture || el.getAttribute("name") || el.tagName.toLowerCase(),
          focusVisible: el.matches(":focus-visible"),
          outlineWidth: cs.outlineWidth,
          outlineOffset: cs.outlineOffset,
          outlineStyle: cs.outlineStyle,
          outlineColor: window.__messerRgb(cs.outlineColor),
        };
      });
      if (info && !seen.has(info.key)) {
        seen.add(info.key);
        out.focus.push(info);
      }
    }
  }

  /* ── disabled ──────────────────────────────────────────────────────────── */
  for (let i = 0; i < (await page.locator("[data-state-disabled]").count()); i++) {
    const rec = await read("[data-state-disabled]", i);
    out.disabled.push({
      key: await page.locator("[data-state-disabled]").nth(i).getAttribute("data-fixture") || `#${i}`,
      ...rec,
    });
  }

  /* ── selected ──────────────────────────────────────────────────────────── */
  for (let i = 0; i < (await page.locator("[data-state-selected]").count()); i++) {
    const rec = await page.locator("[data-state-selected]").nth(i).evaluate((n, idx) => {
      const cs = getComputedStyle(n);
      const after = getComputedStyle(n, "::after");
      return {
        key: n.dataset.fixture || `#${idx}`,
        bg: window.__messerRgb(cs.backgroundColor),
        // A rule is 2px thick on its thin axis: a sidebar/left rule is 2 wide, a topbar/bottom rule
        // is 2 tall and as wide as the row. Report both so the assertion can pick the thin one.
        ruleWidth: after.width,
        ruleHeight: after.height,
        ruleStyle: after.content === "none" ? "none" : window.__messerRgb(after.backgroundColor),
      };
    }, i);
    out.selected.push(rec);
  }

  return out;
}
