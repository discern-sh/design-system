/**
 * Concept plates for new backdrops. Sketches, not implementations: fixed
 * 640×400 plates at 1:1, so plain dash drawing is safe here. The page is
 * self-contained — an inline dark palette stands in for the package tokens.
 *   deno run --allow-write concepts.ts   (writes concepts.html beside it)
 */
const OUT = new URL("./concepts.html", import.meta.url);
const r2 = (n: number) => Math.round(n * 100) / 100;
const SQ3 = Math.sqrt(3);
type Pt = [number, number];
const P = (p: Pt) => `${r2(p[0])},${r2(p[1])}`;
const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/* ---------------------------------------------------------------- */
/* A · Concord — three rulings that come into agreement              */
/* ---------------------------------------------------------------- */
function concord(): string {
  const C: Pt = [400, 200];
  const d = 26;
  const fams = [0, 60, 120].map((deg, i) => {
    const a = (deg * Math.PI) / 180;
    const u: Pt = [Math.cos(a), Math.sin(a)];
    const n: Pt = [-Math.sin(a), Math.cos(a)];
    const lines: string[] = [];
    for (let k = -22; k <= 22; k++) {
      const o: Pt = [C[0] + k * d * n[0], C[1] + k * d * n[1]];
      const p1: Pt = [o[0] - 700 * u[0], o[1] - 700 * u[1]];
      const p2: Pt = [o[0] + 700 * u[0], o[1] + 700 * u[1]];
      lines.push(`<line x1="${r2(p1[0])}" y1="${r2(p1[1])}" x2="${r2(p2[0])}" y2="${r2(p2[1])}"/>`);
    }
    // Family 3 begins half a spacing out of agreement: the kagome field.
    const shift = i === 2 ? `style="--nx:${r2(n[0] * d / 2)}px;--ny:${r2(n[1] * d / 2)}px"` : "";
    return `<g class="concord__fam concord__fam--${i}" ${shift}>${lines.join("")}</g>`;
  });
  return `<svg viewBox="0 0 640 400" class="plate concord">
    <defs><radialGradient id="cv" cx="0.66" cy="0.5" r="0.62"><stop offset="0.25" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
    <mask id="cm"><rect width="640" height="400" fill="url(#cv)"/></mask></defs>
    <g mask="url(#cm)">${fams.join("")}</g></svg>`;
}

/* ---------------------------------------------------------------- */
/* B · Relay — the unit of work, recursing into the gasket           */
/* ---------------------------------------------------------------- */
function relay(): string {
  const apex: Pt = [320, 36];
  const side = 352;
  const h = (side * SQ3) / 2;
  const root: [Pt, Pt, Pt] = [apex, [apex[0] + side / 2, apex[1] + h], [apex[0] - side / 2, apex[1] + h]];
  const levels: [Pt, Pt, Pt][][] = [[root]];
  for (let l = 1; l <= 4; l++) {
    levels.push(levels[l - 1]!.flatMap(([a, b, c]) => {
      const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
      return [[a, ab, ca], [ab, b, bc], [ca, bc, c]] as [Pt, Pt, Pt][];
    }));
  }
  // Each level runs its relay on every triangle at once: apex → right →
  // left → apex (intent, implementation, evidence), then the next level.
  const durations = [1.35, 1.0, 0.78, 0.6, 0.48];
  let start = 0.3;
  const parts: string[] = [];
  levels.forEach((tris, l) => {
    const dur = durations[l]!;
    const leg = dur / 3;
    for (const [a, b, c] of tris) {
      [[a, b], [b, c], [c, a]].forEach(([p, q], e) => {
        const delay = r2(start + e * leg);
        const d = `M${P(p!)} L${P(q!)}`;
        parts.push(`<path class="relay__line" d="${d}" pathLength="1" style="--delay:${delay}s;--dur:${r2(leg)}s"/>`);
        parts.push(`<path class="relay__spark" d="${d}" pathLength="1" style="--delay:${delay}s;--dur:${r2(leg)}s"/>`);
      });
    }
    start += dur + 0.08;
  });
  const fills = levels[4]!.map(([a, b, c]) =>
    `<path class="relay__fill" d="M${P(a)} L${P(b)} L${P(c)} Z" style="--delay:${r2(start)}s"/>`
  ).join("");
  const stations = root.map((p, i) =>
    `<g class="relay__station" style="--delay:${[0.3, 0.75, 1.2][i]}s"><line x1="${r2(p[0] - 5)}" y1="${r2(p[1])}" x2="${r2(p[0] + 5)}" y2="${r2(p[1])}"/><line x1="${r2(p[0])}" y1="${r2(p[1] - 5)}" x2="${r2(p[0])}" y2="${r2(p[1] + 5)}"/></g>`
  ).join("");
  return `<svg viewBox="0 0 640 400" class="plate relay" data-total="${r2(start + 0.8)}">${fills}${parts.join("")}${stations}</svg>`;
}

/* ---------------------------------------------------------------- */
/* C · Interference — two rulings, a small difference made large     */
/* ---------------------------------------------------------------- */
function interference(): string {
  const pattern = (id: string, deg: number) =>
    `<pattern id="${id}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(${deg})"><line x1="0" y1="0.4" x2="9" y2="0.4"/></pattern>`;
  const lattice = (prefix: string) =>
    [0, 60, 120].map((deg) => `<rect x="-400" y="-400" width="1440" height="1200" fill="url(#${prefix}${deg})"/>`).join("");
  return `<svg viewBox="0 0 640 400" class="plate interference">
    <defs>${[0, 60, 120].map((d) => pattern(`ia${d}`, d) + pattern(`ib${d}`, d)).join("")}
      <radialGradient id="iv" cx="0.68" cy="0.5" r="0.6"><stop offset="0.2" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
      <mask id="im"><rect width="640" height="400" fill="url(#iv)"/></mask></defs>
    <g mask="url(#im)">
      <g class="interference__a">${lattice("ia")}</g>
      <g class="interference__b">${lattice("ib")}</g>
    </g></svg>`;
}

/* ---------------------------------------------------------------- */
/* D · Specimen — the mark, drawn as a type specimen                 */
/* ---------------------------------------------------------------- */
function specimen(): string {
  const c: Pt = [410, 262];
  const R = 214;
  const apex: Pt = [c[0], c[1] - R];
  const right: Pt = [c[0] + (R * SQ3) / 2, c[1] + R / 2];
  const left: Pt = [c[0] - (R * SQ3) / 2, c[1] + R / 2];
  const base: Pt = [c[0], c[1] + R / 2];
  const handle = (p: Pt, i: number) =>
    `<rect class="spec__handle" x="${r2(p[0] - 3.5)}" y="${r2(p[1] - 3.5)}" width="7" height="7" style="--i:${i}"/>`;
  const metric = (y: number, label: string, i: number) =>
    `<g class="spec__metric" style="--i:${i}"><line x1="0" y1="${r2(y)}" x2="640" y2="${r2(y)}"/><text x="18" y="${r2(y - 6)}">${label}</text></g>`;
  return `<svg viewBox="0 0 640 400" class="plate specimen">
    ${metric(apex[1], "apex 1000", 0)}${metric(c[1], "centroid 667", 1)}${metric(base[1], "baseline 0", 2)}
    <circle class="spec__circle" cx="${c[0]}" cy="${c[1]}" r="${R}"/>
    <line class="spec__median" x1="${c[0]}" y1="${r2(apex[1] - 20)}" x2="${c[0]}" y2="${r2(base[1] + 26)}"/>
    <path class="spec__fill" d="M${P(apex)} L${P(right)} L${P(base)} Z"/>
    <path class="spec__outline" d="M${P(apex)} L${P(right)} L${P(left)} Z" pathLength="1"/>
    ${[apex, right, left, base].map(handle).join("")}
    <g class="spec__dim"><line x1="${r2(left[0])}" y1="${r2(base[1] + 22)}" x2="${r2(right[0])}" y2="${r2(base[1] + 22)}"/>
      <line x1="${r2(left[0])}" y1="${r2(base[1] + 16)}" x2="${r2(left[0])}" y2="${r2(base[1] + 28)}"/>
      <line x1="${r2(right[0])}" y1="${r2(base[1] + 16)}" x2="${r2(right[0])}" y2="${r2(base[1] + 28)}"/></g>
    <text class="spec__code" x="18" y="386">◮ U+25EE · filled ▸ unfilled</text></svg>`;
}

/* ---------------------------------------------------------------- */
/* E · Confluence — lanes leave the trunk and land back on it        */
/* ---------------------------------------------------------------- */
function confluence(): string {
  const y0 = 238;
  const lanes = [
    { out: 40, back: 330, dy: -92 },
    { out: 110, back: 410, dy: -48 },
    { out: 170, back: 470, dy: 52 },
    { out: 250, back: 548, dy: 100 },
  ];
  const trunk: string[] = [];
  // The trunk begins as two lines and gains one at every landing.
  const landings = lanes.map((l) => l.back).sort((a, b) => a - b);
  for (let i = 0; i < 2 + lanes.length; i++) {
    const from = i < 2 ? 0 : landings[i - 2]!;
    const y = y0 + (i - 2.5) * 3.2;
    trunk.push(`<line class="conf__trunk" x1="${from}" y1="${r2(y)}" x2="640" y2="${r2(y)}" style="--i:${i}"/>`);
  }
  const paths = lanes.map((l, i) => {
    const y = y0 + l.dy;
    const run = 46;
    const d = `M${l.out},${y0} C${l.out + run},${y0} ${l.out + run},${y} ${l.out + 2 * run},${y} L${l.back - 2 * run},${y} C${l.back - run},${y} ${l.back - run},${y0} ${l.back},${y0}`;
    return `<path class="conf__lane" d="${d}" pathLength="1" style="--i:${i}"/><circle class="conf__glint" cx="${l.back}" cy="${y0}" r="2.4" style="--i:${i}"/>`;
  });
  return `<svg viewBox="0 0 640 400" class="plate confluence">${trunk.join("")}${paths.join("")}</svg>`;
}

const cards = [
  {
    id: "concord",
    title: "A · Concord",
    owner: "Package (neutral)",
    svg: concord(),
    line: "Three rulings — at the triangle's three edge angles — slide until they agree.",
    body:
      "Out of agreement, every node splits into a small triangle (the kagome field); as the three families come into phase the field resolves into one clean lattice. Topology depends only on the sum of the three phases, so one number drives it. Phrase: disagreement → concord in ~4s, then hold. Reads to discern as human · agent · project; reads to anyone else as a ruling settling.",
  },
  {
    id: "relay",
    title: "B · Relay → Gasket",
    owner: "discern (identity, ceremonial)",
    svg: relay(),
    line: "The unit of work runs the triangle — intent, implementation, evidence — then recurses.",
    body:
      "A spark runs apex → right → left → apex; the triangle divides and every part runs the same relay in parallel, four times over, until the Sierpiński gasket stands complete and its smallest parts fill. Under five seconds, plays once. The identity doc's own rules make it ceremonial: a manifesto opening or major brand moment, never an ambient loop.",
  },
  {
    id: "interference",
    title: "C · Interference",
    owner: "Package (neutral)",
    svg: interference(),
    line: "Two identical fine rulings, one turned a couple of degrees: a difference, discerned at scale.",
    body:
      "Neither layer contains the large hexagonal cells — they exist only in the difference. A tiny rotation (4° → 1.6°) makes the cells swell dramatically while the lines barely move: maximum perceived structure for minimal motion. Highest wow, highest risk: moiré can shimmer or cause pattern glare, so it needs very low contrast and proof across DPRs.",
  },
  {
    id: "specimen",
    title: "D · Specimen",
    owner: "discern (identity)",
    svg: specimen(),
    line: "The mark, monumental and cropped, drawn like a type-foundry specimen.",
    body:
      "Metric lines, circumcircle, median, vertex handles and a dimension rule construct ◮; the filled half arrives last. Editorial Engineering at its most literal — typography and construction. Phrase: construction lines draw, handles place, fill settles. Suits a brand page, release notes, or social cards more than the product hero.",
  },
  {
    id: "confluence",
    title: "E · Confluence",
    owner: "Package (neutral)",
    svg: confluence(),
    line: "Lanes leave a trunk, run in parallel, and land back — and the trunk thickens with each landing.",
    body:
      "Isolated worktrees held within one project, without drawing a git graph: long hairline curves, a glint at each landing, and a bundle that gains a line every time work lands. Phrase: lanes draw left to right in overlapping turns, landings glint in order. Must stay abstract — the brief rules out simulated dashboards.",
  },
];

const css = `
.concepts{max-width:1240px;margin:0 auto;padding:36px 24px 80px}
.concepts h1{font:600 28px/1.1 var(--discern-font-marketing,inherit);letter-spacing:-.02em;margin:0 0 6px}
.concepts > p{margin:0 0 28px;color:var(--discern-color-ink-muted);max-width:68ch;line-height:1.5}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:22px}
.card{border:1px solid var(--discern-color-border);border-radius:12px;overflow:hidden;background:var(--discern-color-canvas)}
.card button{all:unset;display:block;cursor:pointer;width:100%}
.card figure{margin:0}
.card figcaption{padding:14px 16px 18px;border-top:1px solid var(--discern-color-border)}
.card h2{display:flex;justify-content:space-between;gap:12px;align-items:baseline;margin:0 0 6px;font-size:15px}
.card h2 span{font:500 11px/1 var(--discern-font-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--discern-color-ink-muted)}
.card .line{margin:0 0 8px;font-weight:500;line-height:1.45}
.card .body{margin:0;color:var(--discern-color-ink-muted);font-size:13.5px;line-height:1.55}
.plate{display:block;width:100%;height:auto;background:var(--discern-color-canvas);color:var(--discern-color-ink)}
.hint{font-size:12px;color:var(--discern-color-ink-muted);margin-top:18px}
/* A */
.concord line{stroke:currentColor;stroke-width:.7;opacity:.3}
.concord__fam--2{animation:concord 4s cubic-bezier(.18,.82,.22,1) .4s both}
@keyframes concord{from{transform:translate(var(--nx),var(--ny))}}
/* B */
.relay__line{fill:none;stroke:currentColor;stroke-width:.8;opacity:.34;stroke-dasharray:1 1;stroke-dashoffset:1;animation:draw var(--dur) linear var(--delay) forwards}
.relay__spark{fill:none;stroke:var(--discern-color-accent-500,#6aa6ff);stroke-width:1.6;stroke-linecap:round;stroke-dasharray:.12 2;stroke-dashoffset:.12;opacity:0;animation:spark var(--dur) linear var(--delay) forwards}
.relay__fill{fill:currentColor;opacity:0;animation:fillin 1.2s ease var(--delay) forwards}
.relay__station line{stroke:var(--discern-color-accent-500,#6aa6ff);stroke-width:1.2;opacity:0;animation:fillst .5s ease var(--delay) forwards}
@keyframes draw{to{stroke-dashoffset:0}}
@keyframes spark{0%{opacity:.95;stroke-dashoffset:.12}99%{opacity:.95}100%{opacity:0;stroke-dashoffset:-1}}
@keyframes fillin{to{opacity:.07}}
@keyframes fillst{to{opacity:.7}}
/* C */
.interference line{stroke:currentColor;stroke-width:.75;opacity:.34}
.interference__b{transform-origin:436px 200px;animation:twist 4.2s cubic-bezier(.3,.1,.2,1) .3s both}
.interference__b{transform:rotate(1.6deg)}
@keyframes twist{from{transform:rotate(4deg)}}
/* D */
.spec__metric line,.spec__median,.spec__circle,.spec__dim line{stroke:currentColor;fill:none;stroke-width:.6;opacity:.22}
.spec__median,.spec__circle{stroke-dasharray:3 4}
.spec__metric text,.spec__code{fill:currentColor;opacity:.45;font:500 9.5px var(--discern-font-mono)}
.spec__outline{fill:none;stroke:currentColor;stroke-width:1.1;opacity:.55;stroke-dasharray:1 1;stroke-dashoffset:1;animation:draw 1.6s cubic-bezier(.45,.05,.3,1) .5s forwards}
.spec__fill{fill:currentColor;opacity:0;animation:fillin2 1.2s ease 2.2s forwards}
.spec__handle{fill:var(--discern-color-canvas);stroke:var(--discern-color-accent-500,#6aa6ff);stroke-width:1;opacity:0;animation:fillst .4s ease calc(1.2s + var(--i)*.18s) forwards}
.spec__metric{opacity:0;animation:fillst2 .8s ease calc(var(--i)*.15s) forwards}
@keyframes fillin2{to{opacity:.09}}
@keyframes fillst2{to{opacity:1}}
/* E */
.conf__trunk{stroke:currentColor;stroke-width:.8;opacity:.3}
.conf__lane{fill:none;stroke:currentColor;stroke-width:.8;opacity:.36;stroke-dasharray:1 1;stroke-dashoffset:1;animation:draw 2.2s cubic-bezier(.45,.05,.3,1) calc(.3s + var(--i)*.45s) forwards}
.conf__glint{fill:var(--discern-color-accent-500,#6aa6ff);opacity:0;animation:glint 1.4s ease calc(2.3s + var(--i)*.45s) forwards}
@keyframes glint{0%{opacity:0}15%{opacity:.95}100%{opacity:.25}}
@media (prefers-reduced-motion:reduce){.plate *{animation:none!important;stroke-dashoffset:0!important}.relay__fill{opacity:.07}.relay__spark{display:none}.spec__fill{opacity:.09}.spec__handle,.relay__station line,.spec__metric{opacity:.7}}
`;

// A stand-in for the package's dark Accent projection, so the page opens
// anywhere without the emitted runtime.
const palette = `:root{--discern-color-canvas:#07090d;--discern-color-surface-sunken:#0b0e13;--discern-color-ink:#e8ebf0;--discern-color-ink-muted:#9aa3b2;--discern-color-border:#1f2530;--discern-color-accent-500:#6aa6ff;--discern-font-ui:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;--discern-font-mono:ui-monospace,"SF Mono",Menlo,monospace;--discern-font-marketing:ui-sans-serif,system-ui,-apple-system,sans-serif;color-scheme:dark}`;

const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Backdrop concepts</title>
<style>${palette}body{margin:0;background:var(--discern-color-surface-sunken);color:var(--discern-color-ink);font-family:var(--discern-font-ui)}${css}</style></head>
<body><main class="concepts">
<h1>New backdrop concepts</h1>
<p>Sketches for discussion — geometry and phrasing, not finished pieces. Click a plate to replay it. The briefs live in the README beside this page.</p>
<div class="grid">
${cards.map((c) => `<article class="card" id="${c.id}"><button type="button" aria-label="Replay ${c.title}"><figure>${c.svg}</figure></button><figcaption><h2>${c.title}<span>${c.owner}</span></h2><p class="line">${c.line}</p><p class="body">${c.body}</p></figcaption></article>`).join("\n")}
</div>
<p class="hint">Blue here is the Accent projection for legibility; on the monochrome homepage every accent resolves to tinted ink.</p>
</main>
<script>
document.querySelectorAll(".card button").forEach((b) => b.addEventListener("click", () => {
  const svg = b.querySelector("svg"); const clone = svg.cloneNode(true); svg.replaceWith(clone);
}));
</script></body></html>`;

await Deno.writeTextFile(OUT, html);
console.log(OUT.pathname);
