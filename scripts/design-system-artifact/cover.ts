/**
 * The artifact's cover: the ink ladder as three blocks and the ◮ mark rebuilt
 * as the one pattern, with the `discern` wordmark in the mono face. Every fill
 * and radius binds to a token the artifact's `tokens.css` declares.
 */

const UNIT = 24; // discern-space-6, the glyph unit
const PITCH = 40; // discern-space-10, the glyph pitch

function glyph(x: number, y: number, cls: string): string {
  const outline = `M${x},${y + UNIT} L${x + UNIT / 2},${y} L${x + UNIT},${
    y + UNIT
  } Z`;
  const half = `M${x + UNIT / 2},${y} L${x + UNIT},${y + UNIT} L${
    x + UNIT / 2
  },${y + UNIT} Z`;
  return `<path class="${cls}-line" d="${outline}"/><path class="${cls}-fill" d="${half}"/>`;
}

/** The complete `components/Cover/preview.html` document. */
export function coverDocument(tagline: string): string {
  const slab: string[] = [];
  for (const y of [32, 72, 112]) {
    for (let column = 0; column < 5; column += 1) {
      slab.push(glyph(200 + column * PITCH, y, "cut"));
    }
  }
  const mid: string[] = [];
  for (const y of [176, 216]) {
    for (const x of [40, 88]) mid.push(glyph(x, y, "ink"));
  }
  return `<!-- @dsCard height=288 -->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>discern</title>
<style>
  html, body { margin: 0; height: 100%; }
  body { background: var(--discern-color-canvas); color: var(--discern-color-ink); font-family: var(--font-ui); overflow: hidden; }
  .cover { position: relative; height: 288px; overflow: hidden; }
  .art { position: absolute; top: 0; left: 480px; width: 480px; height: 288px; overflow: hidden; }
  .art svg { display: block; width: 480px; height: 288px; }
  .slab { fill: var(--discern-color-ink); rx: var(--discern-radius-md); }
  .mid { fill: var(--discern-color-accent-400); rx: var(--discern-radius-md); }
  .wash { fill: var(--discern-color-accent-200); rx: var(--discern-radius-md); }
  .cut-line { fill: none; stroke: var(--discern-color-canvas); stroke-width: 1; stroke-linejoin: round; }
  .cut-fill { fill: var(--discern-color-canvas); }
  .ink-line { fill: none; stroke: var(--discern-color-ink); stroke-width: 1; stroke-linejoin: round; }
  .ink-fill { fill: var(--discern-color-ink); }
  .words { position: absolute; left: 24px; bottom: 24px; max-width: 440px; }
  .name { margin: 0; font-family: var(--font-mono); font-size: 96px; font-weight: 600; line-height: 0.95; letter-spacing: -0.02em; color: var(--discern-color-ink); }
  .tag { margin: 8px 0 0 4px; font-family: var(--font-ui); font-size: 14px; line-height: 20px; color: var(--discern-color-ink-muted); }
</style>
</head>
<body>
<div class="cover">
<div class="art" aria-hidden="true">
<svg viewBox="0 0 480 288" width="480" height="288">
<!--
  blocks      discern-color-ink 320×232 bleeding off the top and right edges (the slab) · discern-color-accent-400 144×200 (the mid rung of the ink ladder) · discern-color-accent-200 320×32 (the wash) — ≈41% of 960×288; every fill is a rung of the one ink, which is what a monochrome system is
  arrangement one tall slab with satellites: the mid block to its left, the wash strip beneath, bottoms on one line discern-space-6 above the edge, discern-space-4 gutters between them
  pattern     one glyph as a shape, from "The mark ◮ is type, not artwork": U+25EE rebuilt as an outline plus a filled right half, 15 units cut from the slab in discern-color-canvas and 4 set on the mid block in discern-color-ink, at a discern-space-10 pitch
  scales      block sides in discern-space-2 multiples; gutters discern-space-4; glyph unit discern-space-6; pitch discern-space-10; corners discern-radius-md
-->
<rect class="slab" x="176" y="-16" width="320" height="232" rx="8"/>
<rect class="mid" x="16" y="64" width="144" height="200" rx="8"/>
<rect class="wash" x="176" y="232" width="320" height="32" rx="8"/>
${slab.join("\n")}
${mid.join("\n")}
</svg>
</div>
<div class="words">
<h1 class="name">discern</h1>
<p class="tag">${tagline}</p>
</div>
</div>
</body>
</html>
`;
}
