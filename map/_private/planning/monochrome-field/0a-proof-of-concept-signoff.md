# 0A — Mock the field for maintainer sign-off

**Goal:** Give the maintainer a human's view of the monochrome field on the components most likely to break under it, by hand and without rebuilding anything, and record what the eye disagrees with so wave 1 writes the laws from evidence rather than arithmetic alone.

**Wave:** 0. This is a throwaway proof of concept. It never lands, never runs `discern_accept`, and never needs a green gate. It gates wave 1 on the maintainer's sign-off.

You own `0A` only. Do not launch, dispatch, or supervise 1A, 1B, or any later brief.

## Orient, re-root, then read

From `/Users/jack/Sites/discern-design-system`, call `discern_status` and verify this planning package is on `main`. Call `discern_start` with the literal name **`field-0a`**, re-root every file and shell operation into its returned absolute `data.path`, and pass that path to every later discern tool. Record the returned worktree id and branch; you will report them.

Only after re-rooting, read:

- `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/_adr/0040-derive-the-theme-from-a-monochrome-field.md`, and the programme README beside this brief, including its harvested seed ladder;
- `src/tokens/tokens.ts`, `src/styles/foundation.css`, and `catalogue/shell/appearance-options.ts`, especially the preset-backed option kind and the admission proof;
- `map/60-catalogue/visual-review.md` and the local review instrument under `catalogue/review/`;
- the CSS of Button, Tabs, Badge, Tag, Banner, Toast, Dialog, Hover card, Card, Table, Input, Select, Switch, Result summary, Diagnostic, Meter, Site header, Hero block, Marketing section, Terminal, Code listing, Data figure and one chart kind, and Sparkline;
- `src/cli/theme.ts` and the CLI playground task in `deno.json`.

## Background

ADR 0040 decides that every colour role derives from a monochrome field: two pigments, a darkness axis with polarity chosen by contrast, alpha rungs that bend with darkness, an action/on-action pair for inversion, opaque raised surfaces, structure and emphasis axes that fade structural and state ink, and a density axis on spacing. The decision rests on contrast arithmetic and on one hand-authored preset that was dropped. Nobody has yet seen the system rendered this way at scale.

The maintainer wants to look before the token model is rewritten. The cheapest truthful mock is the existing seam: preset-backed Appearance options carry complete role overrides per resolved theme, the review instrument renders the whole population under any option, and a scratch stylesheet layered above the runtime can fake what the seam cannot express, such as inversion and the axes. That is enough to see the result; it is not enough to ship it, and you must not try to.

## Deliverables

### 1. Field points as synthetic Appearance options

Add temporary preset-backed options to `catalogue/shell/appearance-options.ts` for five field points: darkness 0, 0.25, 0.5, 0.75, and 1, all achromatic. For each point compute the canvas in OKLab lightness, choose ink by the 0.179 crossover, and author every role as that ink at an alpha. Start from the harvested seed ladder at the poles and raise the muted, faint, border, and wash rungs toward the middle until the admission proof passes at each point; write down every number you settle on and why. Raised surfaces must be opaque composited values. The dark pole must reproduce the seed ladder unless the proof forces a change.

Both resolved themes of a mid-field option carry the same values; the option's polarity is fixed by its darkness, not by the theme switch. If the proof refuses a point, record the refusal verbatim rather than loosening the proof.

### 2. A scratch override layer for what presets cannot say

Add one Catalogue-only stylesheet, loaded after the runtime in the local dev server only, that fakes the parts of ADR 0040 the preset seam cannot express:

- primary actions inverted: full ink fill with paper text on Button primary, the CTA band, and any other component that paints a solid accent fill with light text;
- structure at three levels (0.35, 1, 1.4) by scaling border, divider, stripe, and shadow alphas;
- emphasis at two levels by scaling hover, selected, current, and quiet-wash alphas;
- density at 0.8, 1, and 1.2 by scaling the spacing tokens, leaving font sizes alone.

Expose these as URL parameters or `data-` attributes on the Catalogue root so every mock state has a reproducible link. Keep the layer obviously scratch: one file, clearly named, never imported by the package or the build.

### 3. Render the high-risk set and the whole population

With the dev server on `discern identity --port`, produce reproducible URLs for the components listed above at each field point, in both structure extremes, and with density at the three levels. Use the review instrument's contact sheets for the complete population at every field point in both polarities, and capture focused evidence for:

- inverted primary actions beside secondary and unavailable ones;
- severity carried by opacity on Banner, Toast, Badge, Result summary, Diagnostic, and Meter, with the non-colour witnesses visible;
- Dialog, Toast, and Hover card over a Card and over canvas at the mid-field points;
- Table, Tabs, and forms at low structure, where hairlines nearly vanish;
- Hero block and the Marketing contrast section at low structure, and Terminal and Code listing showcases;
- one chart with the hued series palette inside the mono chrome, and a sparkline;
- native form controls at a mid-field point, where `color-scheme` follows the polarity;
- the CLI playground for Result summary, Diagnostic, and Table at both poles, using a terminal palette you derive by hand from the pole values (dim for faint rungs, bold for strong ones).

### 4. The findings note

Write `map/_private/planning/monochrome-field/_poc/0a-findings.md` in your worktree. It must contain:

- the exact rung values per role per field point, with the proof margin at each;
- the inversion threshold you found: the loudest rung that still carried canvas-polarity text legibly, and where paper-polarity text became necessary;
- which surfaces had to be opaque and which could stay translucent without drift;
- what broke or looked wrong, with the URL that shows it, and your proposed law change for each;
- a short recommendation on the two decisions the programme README lists as still held by the maintainer;
- the reproducible base URL and the parameter grammar of the scratch layer.

Commit the mock-up and the note on your branch in focused commits, so the maintainer can read the diff as well as the screen.

### 5. Sign-off

Report the dev-server URLs, the absolute path of the findings note, and the worktree id and branch. Leave the server running. The maintainer reviews in the browser and either signs off or asks for adjustments; make them in this worktree and update the note. Do not proceed past sign-off, and do not attempt to land anything.

## Constraints

- Change nothing under `src/` except what the mock strictly needs, and prefer the scratch layer over any package edit.
- Never loosen the admission proof, a standard, or a test to admit a point. A refused point is a finding.
- Keep the Catalogue building; the scratch layer must not enter the package publish set, the runtime registry, or generated output.
- Do not write ADRs or map pages; the findings note is your only durable document.

## Out of scope

- Any change to the token model, the runtime emitter, the CLI, or the charts; 1A owns those.
- Detectors and standards; 1B owns those.
- A polished Field page; 3B owns that.

## Definition of done

- Five field points exist as synthetic options and the admission proof's verdict at each is recorded, pass or refuse, without the proof being changed.
- Every listed component has a reproducible URL at every field point, structure level, and density level, and the whole population has contact sheets at every point in both polarities.
- The findings note answers the rung, threshold, backdrop, and breakage questions with numbers and URLs, and recommends on the maintainer's open decisions.
- The maintainer has looked and signed off, or every requested adjustment has been made and re-reported.
- Someone dispatching 1A can hand it the findings path and expect it to write the laws without re-deriving what the eye already settled.
- This worktree is never accepted. When 1A has copied the findings into `_done/`, the maintainer may drop this worktree with `discern worktree drop`.
