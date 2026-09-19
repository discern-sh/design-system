Paper and ink, one hard shadow, and a witness beyond colour for every state: the interface system behind discern.sh, for the browser and the terminal alike.

## Content fundamentals

- Write plainly and declaratively: short sentences, sentence case, no exclamation marks, no emoji as decoration. Prose uses British spelling (colour, behaviour, licence); code, props, and class names keep their American identifiers.
- Keep example copy generic. Product claims, customer names, routes, and commands belong to the consumer and arrive through props and slots. Placeholders in the package read "Continue", "Save changes", "Example brand", "Ada Osei", "Quarterly reviews by region".
- Name the action. A destructive button says "Delete draft", never "Delete" in red. A busy control keeps its label and adds a still ring with `aria-busy`. Colour is never the only carrier of meaning: success, warning, and danger each pair their tone with a word or a glyph.
- Set interface numbers and metadata in the `ui-xs` style in `discern-color-ink-muted`, for example "Updated 2 min ago · 14 files", separated by middots. Nothing sits below `ui-xs`; it is the authored floor for interface text.
- The brand name is written lowercase as `discern` and set in the mono face through the Brand component's `typeface="mono"`, with the ◮ mark before it. Nothing else is set in monospace unless it is code.

## Colour

Monochrome by default. Every role is paper or ink at an alpha, evaluated from one appearance model at the light pole (darkness 0) and the dark pole (darkness 1). Component CSS is byte-identical across themes; only the tokens move.

- Grounds: `discern-color-canvas` is the page; `discern-color-surface` is a card, window, input, or secondary button on it; `discern-color-surface-sunken` is a well or a disabled fill. Raised stays lighter than sunken at either pole.
- Ink: `discern-color-ink` for primary text, `discern-color-ink-muted` for secondary text, `discern-color-ink-faint` for captions, kickers, legends, and taglines. All three hold at least 4.5:1 on `discern-color-canvas` and `discern-color-surface` in both themes; the light faint value is pinned at 0.55 alpha because 0.50 composites to 3.94:1 on white.
- Action: `discern-color-action` is full active ink and `discern-color-on-action` the opposite pigment, so a primary button is ink on paper in light and paper on ink in dark. The pair always inverts.
- The accent ladder `discern-color-accent-100` through `discern-color-accent-800` is ink at a rising alpha: 100 and 200 for washes and `::selection`, 300 for the grain-wash glow, 400 for mid emphasis, 500 for the focus ring, 600 for links, 700 and 800 for the strongest ink and code literals.
- Edges: `discern-color-border` on every card, input, and table rule; `discern-color-border-strong` for emphasised edges and the dotted card texture; `discern-color-stripe` for hatching.
- Semantic tones: `discern-color-success`, `discern-color-warning`, and `discern-color-danger`, each with a `-soft` wash and, for success and warning, a `-deep` text rung. In monochrome they resolve to greys, which is why every state also shows a glyph or a word. Never recruit a semantic tone as a chart series or a brand colour, and never let success collapse into the accent.
- Inverse: `discern-color-inverse-surface` with `discern-color-inverse-ink` stays light-on-dark in both themes. Use the pair for showcase sections, Terminal, and code listings that want a contrast scope; move canvas, surface, ink, and border together for the scope's descendants rather than branching on theme.
- Series: `discern-color-series-1` through `discern-color-series-6` (soft blue, deep blue, gold, burgundy, ochre, rose) are fixed-order categorical colours for data only.
- Accent projection: set `data-discern-accent` on a root or subtree and the chromatic roles (action, the accent ladder, the semantic tones, avatar fills) re-project at `discern-accent-hue`, default 255. The two accent themes here are exactly that projection at hue 255; in the real runtime it is a scope, not a theme, and `data-discern-accent="none"` restores monochrome inside it.
- Appearance axes: `discern-darkness`, `discern-structure`, `discern-emphasis`, `discern-density`, and the four pigment tints are numeric custom properties set on an opted-in root; the live CSS derives every role from them. A mid-dark canvas is `--discern-darkness: 0.85` with `color-scheme: dark`.

## Typography

Four faces, each with one job. Fonts are in `fonts/`; every stack ends in real system fallbacks.

- Display, `display`: Iowan Old Style first, Crimson Pro behind it. Editorial headings only: `display-lg` for h1, `display-md` for h2, `display-sm` for h3, `display-xl` for a hero. Weight 700, leading 1.08, tracking -0.014em, `text-wrap: pretty`.
- Reading, `body`: Inter at `body` (1.05rem, leading 1.58) inside a `discern-measure` of 62ch; `lead` opens a page; `body-strong` is weight 650, never bold 700 in prose.
- Interface, `ui`: Inter with its interface alternates bound to the face in the package (liga, calt, dlig, tnum, zero, ss03, salt). `card-title` for component and card titles and h4 through h6, `label` for field labels in primary ink at the strong weight, `control` for buttons and tabs at weight 600, `ui` for hints, cells, and navigation, `ui-xs` for metadata, `kicker` uppercase and tracked 0.11em above a heading.
- Marketing, `marketing`: Inter at weight 600 (`discern-font-weight-marketing`) for campaign headlines. It is independent of the editorial serif so a consumer can rebrand a hero without touching reading pages.
- Code, `mono`: JetBrains Mono for source, commands, paths, and terminal output, and for the `discern` wordmark. Do not use it to make something feel technical.
- Headings never use the interface face and interface text never uses the display face; a component that needs a different role selects it explicitly.

## Spacing and rhythm

- One 4px unit. The scale is `discern-space-1` through `discern-space-24` (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96 px). Density multiplies these authored steps in the browser and never touches font size or touch-target floors.
- Rhythm names the relationship, not the distance: `discern-rhythm-related` (8px) binds a label or title to its content, `discern-space-4` owns ordinary content flow, `discern-rhythm-group` (24px) separates groups, `discern-rhythm-section` (40px) marks a change of subject. Stack owns direct-child block margins; pass `gap` only when a numeric step is the point.
- Card padding is `discern-space-4` (sm), `discern-rhythm-group` (md), or `discern-space-8` (lg). Buttons pad `discern-space-1` block and `discern-space-5` inline.
- Controls share `discern-control-size-sm`, `-md`, `-lg` (2, 2.5, 3rem floors). Button, Icon button, Input, and Select align on `-md`; a label may grow a control, density may enlarge it, nothing shrinks it.

## Shape, edges, and elevation

- Radii: `discern-radius-xs` (4px) for fine controls and checkboxes, `discern-radius-sm` (6px) for inputs, `discern-radius-md` (8px) for buttons and cards, `discern-radius-lg` (12px) for windows and dialogs, `discern-radius-pill` for badges and tags. Corners are never larger than 12px except pills.
- Edges before shadows. Every surface has a 1px `discern-color-border`; secondary buttons and nested cards are flat and bordered.
- Shadows are hard offsets with no blur, ever. Three tiers describe containment, not lift: `discern-shadow-card` (2px 2px, the quietest, standalone raised cards only), `discern-shadow-window` (4px 5px, framed presentation surfaces), `discern-shadow-pop` (6px 6px, overlays: dialogs, hover cards, tooltips, the search palette). Nothing lifts on hover; there is no fourth tier.
- The primary Button carries its own hard 2px drop in `discern-color-action-shadow` (`discern-shadow-button`); pressing travels the button down 2px and collapses the drop to nothing.
- Material presence is optional and static: Card `texture="shaded"` and `texture="dots"`, Icon relief at large sizes, and one Light backdrop per composition at most. All of it follows `discern-structure`; none of it carries meaning.
- Textures: the `discern-grain-wash` utility lays `assets/Textures/grain.png` over an accent wash for a hero. `discern-dot-grid` and `discern-hatch` draw with `discern-color-ink` at 16% and `discern-color-stripe`.

## States

- Focus is a 2px solid `discern-color-accent-500` outline offset 2px on everything focusable; buttons use `discern-space-1` offset. In forced-colours mode it becomes `CanvasText`.
- Disabled keeps readable ink on `discern-color-surface-sunken` with a dashed edge; never opacity, never an accessible-name suffix. Unavailable anchors drop `href` and leave the tab order.
- Busy adds a loading ring in the icon slot, sets `aria-busy`, disables native activation, and keeps the label; the ring is still under reduced motion.
- Selection (`::selection`) is `discern-color-accent-200` with `discern-color-ink`. Hover on a primary button mixes 88% action with on-action; secondary hover washes 55% `discern-color-accent-100` into the surface.
- Semantic feedback (Banner, Callout, Toast, Badge, Result summary) leads with its tone's glyph or word, then its `-soft` wash, then `-deep` text; the wash alone is never the message.

## Motion

- `discern-duration-fast` (150ms) for hover and press, `discern-duration-medium` (300ms) for ordinary state, `discern-duration-reveal` (650ms) for a choreographed reveal; `discern-ease-out` decelerates, `discern-ease-in-out` balances.
- A component owns motion only when it explains cause, continuity, progress, or space. Decoration does not move: no ambient animation in a grid of cards, at most one Light backdrop per composition, and Card `arrival="shimmer"` only when meaningful content arrives.
- Reduced motion resolves every animation to its complete state (durations collapse to 0.01ms); the still frame must already say everything.

## Layout

- `discern-page-max` (66.25rem) bounds a page through Container with `discern-space-6` gutters; `discern-measure` (62ch) bounds prose; `discern-section-space` (clamp 4.5rem to 7.75rem) separates page sections.
- Grid is intrinsic (auto-fit columns from a minimum), Cluster wraps actions and tags, Stack composes vertically. There are no breakpoint props.
- Avatar and Agent avatar share `discern-avatar-size-xs` through `-xl` (1.5rem to 4.5rem).
- Everything applies only inside an element carrying `data-discern-root`; `data-discern-theme="light"` or `"dark"` pins the pole and `"system"` follows the reader.

## Iconography

- No bundled icon set. Icon is a vendor-neutral wrapper: supply an inline SVG with `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="2"`, round caps and joins, as the package's own example icons do (spark, arrow, check, close, info, moon). Icons inherit the text colour of their slot and take `1em` unless sized.
- Status and structure use Unicode glyphs from the package's curated vocabulary, each with an ASCII fallback for terminals: ✓ done, × close or failed, → next, ☾ and ☀ for the theme toggle, and the ◮ family (◮ ⧩ ◭ ⧨) as the brand motif.
- The mark ◮ (U+25EE, up-pointing triangle with right half black) is type, not artwork. There is no logo file; set it in the current face inside Logo or Brand, and it recolours with `color`.
- Supplied multicolour artwork is shown in light and masked to `discern-color-brand-artwork-ink` in dark when the component offers a monochrome treatment.

## Composing with the components

- Start every page with a root (`data-discern-root`), Container, and Stack. Headings come from Heading or the foundation's h1 to h3 in the display face; Kicker above a heading for a section label.
- Actions: one raised primary Button per view, flat secondary for the alternative, ghost for tertiary, danger only with explicit wording. Icon button needs a label. Keep action groups in a Cluster and let them wrap.
- Surfaces: Card for peers, Window for a framed product view, Terminal for commands and output in the inverse scope, Dialog on `discern-shadow-pop`.
- Forms: Field owns label, hint, required, and error for any control; Input, Textarea, Select, Checkbox, Radio, Switch, and Segmented control share it. Labels are `label`, hints `ui`, errors carry the danger glyph.
- Status: Badge and Tag for compact metadata, Banner for an inline message, Toast for a transient one, Meter and Progress for truthful fractions, Empty state for a region with nothing yet.
- People and agents: Avatar (monogram or portrait), Avatar group, Persona for a row; Agent avatar is the dark square machine counterpart. Worklog and Fleet show runs and parallel efforts.
- Workflow evidence: Command, Result summary, Diagnostic, Standard meter, and Procedure present tool output as plain-language facts with the next action first.
- Marketing: Site header, Hero block (`layout="statement"` puts relevance before mechanism), Metrics band, Testimonial, CTA band. Editorial: Prose, Callout, Blockquote, Pull quote, Code block, Timeline, Chart.
- Never target a component's owned `discern-*` classes from your own CSS; compose with your own class beside them.

## Terminal parity

Every rendered component has a pure terminal renderer that derives the same meaning from its props: light and dark grounds, truecolour to ANSI 16, Unicode to ASCII. Design for both: a state that only a colour or an animation carries will not survive the terminal.
