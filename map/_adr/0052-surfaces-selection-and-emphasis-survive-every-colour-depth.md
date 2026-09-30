# ADR 0052: Surfaces, selection, and emphasis survive every colour depth

**Status**: accepted

## Context

A persistent terminal application separates its regions by fill alone: a tinted reading surface beside a list, a raised overlay above both, a selection bar, and buttons whose focus a reader must see at a glance. The package had no terminal fill roles. The browser washes (`accent-100`, `success-soft`, and their kin) quantised as foregrounds, so at 256 colours they collapsed to near-identical dark greys and at 16 colours under an Accent they became saturated bright backgrounds. In monochrome, `accent-100` is darker than the raised surface on a dark ground, so a selection drawn with it was nearly invisible. Nothing proved text on any fill.

Output without colour stripped every attribute, so an application under `NO_COLOR` lost bold headings, selection, and focus together with its hues, although the reader had asked only for no colour. Status glyphs were redeclared in more than a dozen renderers and a completed status fell back to `+`, `v`, `x`, or `OK` depending on the component. The key decoder named ten Ctrl+letters and passed the rest to text fields as control characters. Footers were a single muted string in which a key could not be told from its action.

The browser's colour roles are emitted into every CSS bundle, and those bundles sit at their byte ceilings, so new browser roles were not available to solve a terminal problem.

## Decision

**Fills are appearance laws, not CSS.** The appearance authority carries a second, small law family, `appearanceFillLaws`: `surface`, `raised`, `selection`, `selectionMuted`, `control`, `focusFill`, and `dangerFill`. They evaluate through the same pigments, tints, and polarity as every colour role, so a tint or Accent reaches them without a per-role law, but they are never projected into CSS. The neutral ladder is stronger than its browser cousins because no border or shadow helps it. Under an Accent, `selection`, `focusFill`, and `dangerFill` equal `accent-100`, `accent-200`, and `danger-soft`, so a hue carries the same meaning in both media; in monochrome they are neutral steps that stay visible.

**Each depth either keeps a wash's meaning or degrades on purpose.** Truecolor paints the evaluated fill. At 256 colours a background-aware ranking offers only fixed-palette entries — never the 16 themeable ones — preferring an entry of the same hue family, near the wash's lightness, and at most two and a half times as saturated; failing that, the wash takes the grey at its lightness. The theme quantises its fills jointly, so two regions a reader must tell apart (`TERMINAL_SURFACE_SEPARATIONS`) never share an entry, and a resting control keeps `1.25:1` against the raised surface. Text on a fill keeps its authored colour and moves only its 256-colour index, to the nearest legible entry of its family. A fill has no 16-colour index: at 16 colours and without colour no background is painted, and renderers carry the structure instead — the selection pointer, bracketed buttons, and a rounded box whose geometry matches the borderless filled panel it replaces.

**Contrast is proven, not assumed.** Every text tone on every surface keeps `4.5:1` (faint rises to muted on a selection or a control), and every separated pair stays apart, at truecolor and 256 colours on both grounds, for monochrome and the full Accent hue sweep. At 16 colours and without colour the proof checks that no fill is painted and no tone takes the ground's own index. `proveTerminalSurfaceAdmission()` is public, so a consumer can prove its own Accent.

**Focus never rests on colour.** A focused button carries `›` and `‹` at every depth; fills only reinforce it. A selected row carries a leading bar and a bold title.

**One glyph table.** `TERMINAL_GLYPHS` holds every mark an interactive surface draws, with its one-cell Unicode form, a printable ASCII fallback, and its column. Within a column a reader must scan — state and fold markers together, consequence marks, flags, menu markers, button brackets — every fallback is unique. A completed status therefore falls back to `v`, because `+` marks a folded row.

**Without colour, owned screens keep emphasis.** `TerminalCapabilities.emphasisWithoutColor` keeps bold and underline when colour depth is `none`. Screens the package owns set it; pipes and plain output stay bare text.

**Keys and hints are complete.** Every decodable Ctrl+letter, Shift+Left/Right, and F1–F12 have names, and no C0 control byte ever decodes as text. Key hints lay out a left cluster and a pinned right cluster through a fixed collapse ladder, with strong keys and muted labels.

## Consequences

Applications get visible selection, panels, and buttons at every depth without borders, and the monochrome default is usable. A consumer's Accent is admitted by the same proof. The browser bundles are unchanged.

At 256 colours on a dark ground most washes yield their hue to greys, because the fixed cube holds no dark desaturated colours; the accent-coloured selection bar marker and the text colours carry the hue there. On a light ground at 256 colours the grey ramp has only two steps below white that carry every text tone, so the joint quantisation pushes a selection one step darker and some tones take a darker index on it. At 16 colours no fill is painted at all, and layouts must be designed so the structural fallback occupies the same cells as the fill.

ASCII output changed wherever a renderer drew a completed status, and the curated `status-complete` alias follows. Text keys can no longer carry control characters, so a caller that matched a control byte in text must match a key name instead.

The fill family is a second place colour laws live. It is kept beside the colour roles in the appearance authority, shares their evaluator, and is named in the same map page, so there is still one authority for how a colour is derived.

## Alternatives considered

New browser colour roles for the terminal would have added bytes to every CSS bundle at its ceiling for a need the browser does not have. Mapping terminal fills onto existing roles left the monochrome selection nearly invisible and control buttons indistinct from raised surfaces. Inverse video would have given a strong selection at every depth, but the byte grammar has no inverse attribute, and inverse swaps the terminal's own colours, discarding the Accent. Painting 16-colour washes with the base palette produces the saturated backgrounds this decision exists to avoid, on colours the user's theme redefines. Stripping colour but keeping attributes for all output would have changed bytes that pipes, logs, and agents read; an explicit capability confines the change to screens a reader is looking at.
