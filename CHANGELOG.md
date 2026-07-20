# Changelog

Releases follow [SemVer](https://semver.org). JSR versions are immutable: a published version is never edited or replaced, and a bad release is superseded by a new version (or yanked) rather than rewritten. Before 1.0, minor versions may still change the public contract; every breaking change is recorded here.

Each release is cut from a green run of the full release gate — formatting, lint, strict type-checks, package tests, the catalogue build, generated-output currency, and a publish dry run against the allowlisted artifact — and published through JSR trusted publishing from CI.

## Unreleased

- Add the Core `Logo` and `Brand` components. `Logo` defaults to an unboxed, natural-width, `currentColor` mark suitable for a text glyph, injected SVG, image, or wide wordmark; `treatment="tile"` preserves the bounded accent box and `shape="square"` opts into square geometry. `Brand` composes a decorative mark with the visible name and optional tagline, with inherited, UI, display, and monospace typefaces. Discern consumers can now render the canonical lockup as `<Brand name="discern" mark="◮" typeface="mono" />` without announcing the decorative glyph twice. Selecting `brand` automatically emits its `logo` dependency.
- Extend Site header and Site footer with `brandTypeface`, `brandMarkTreatment`, and `brandMarkShape`. Their existing display-type, tiled-square defaults remain unchanged for current consumers; choosing `brandMarkTreatment="plain"` defaults the mark to natural width, so glyphs and non-square injected graphics have no visible container.
- Add the Feedback `HoverCard` component for arbitrary supplementary content. It preserves any existing `aria-details` relationship on the supplied focusable trigger, supports top/bottom placement, start/centre/end alignment, three widths, inline phrasing content, and block-structured content whose links and actions remain open under `focus-within`; at touch-sized widths every card becomes a viewport-inset fixed surface so an off-centre trigger cannot clip it.
- Add the Docs `GlossaryTerm` convenience component and the always-emitted `.discern-dotted-underline` text utility. Glossary term renders a semantic, focusable `dfn`, repeats its visible term in the card for context, and composes Hover card automatically; selecting `glossary-term` therefore emits `hover-card` too. The Catalogue now wears discern's canonical decorative ◮ plus monospaced name and demonstrates keyboard, hover, rich-content, glyph, tile, square, and wide-mark states.

## 0.6.0

- Default an unforced root to the user's system colour scheme, retain explicit Light and Dark overrides, and add the controlled Theme switcher component with native System, Light, and Dark radio semantics. The Catalogue now uses the same control and treats System as its unsaved default.
- Restore cold fragment navigation after client-rendered navigation mounts, including the Catalogue, Docs nav, Table of contents, and every other linked navigation landmark. Give Code listing and Terminal calmer semantic light surfaces, while Terminal keeps its monospace console grammar; set People monograms in the UI face with a clearer dark gradient, and let Process steps hold five level-footed columns before wrapping into balanced rows.
- Polish the People identity set with layered monogram surfaces, clearer linked mentions, structured editorial bylines, and a stronger Profile card hierarchy that holds across portrait and landscape layouts.
- Give Agents a more coherent technical grammar: dimensional agent tiles, monospace persona names, tracked Worklog steps, surfaced Transcript turns, receipt-like proof cards, and a responsive Fleet grid that preserves identity, state, branch, drift, and timing without narrow-view overflow.

- Add the People group, the tenth canonical group: six components for representing humans — Avatar, Avatar group, Persona, Mention, Byline, and Profile card. Selecting `groups: ["People"]` emits the full set, and each composite resolves its Avatar dependency automatically.
- Avatar renders a portrait photo or a UI monogram derived from the name, in five sizes, circle or square, with an optional presence badge whose state joins the accessible label instead of relying on colour. Avatar group stacks avatars with ring separation through the overridable `--discern-avatar-ring` custom property and clamps to `max` behind a labelled overflow chip.
- Persona (avatar–name–detail row), Mention (em-scaled inline person chip; a real anchor when linked, a plain span otherwise), Byline (address-element attribution row with middot separators carrying empty alternative text), and Profile card (square editorial portrait, serif name, links slot) compose the same Avatar as decoration, keeping the visible name the single announced identity.
- Add the Agents group, the eleventh canonical group: seven components for representing machine actors alongside the People set — Agent avatar, Agent persona, Agent mention, Worklog, Transcript, Receipt, and Fleet. The grammar is deliberate: people are warm circles, while agents are dark squares set in mono, so mixed rosters read at a glance.
- Agent avatar renders a monospace sigil on the inverse surface in the same five sizes as Avatar, speaking its `--discern-avatar-size`/`--discern-avatar-ring` contract so Avatar group stacks people and agents together, with a square status light (working, waiting, blocked, done, idle) whose state joins the accessible label and whose working pulse respects reduced motion. Agent persona (tile–name–monospace-detail row) and Agent mention (em-scaled inline chip behind a decorative prompt sigil; a real anchor when linked) mirror their People counterparts.
- Worklog renders an ordered, statused feed of a run's steps with glyph markers, monospace annotations, and right-aligned timing; Transcript renders ordered conversation turns whose speaker slot composes Persona or Agent persona headers; Receipt prints a monospace proof-of-work card with a stamped title, definition-list metadata, and dot-leadered check lines. Every status and outcome is spoken as hidden text, never colour alone — a release test renders every catalogue example and enforces exactly that for each stateful marker, present and future.
- Fleet renders a board of parallel efforts — one row per worktree pairing a persona slot with a monospace branch, a state slot for Badge composition, ahead/behind drift whose arrows are decoration behind spoken counts, and right-aligned timing. Diffstat (Display) prints signed monospace change counts beside proportional decorative squares.
- The identity-tile size scale becomes public tokens — `--discern-avatar-size-xs` through `--discern-avatar-size-xl` — that Avatar and Agent avatar both resolve their steps from, held by a release test so the shared scale cannot drift.

## 0.4.1

- Scope the Docs nav's item styling to its lists, so a composed section-title link — a linked Kicker, for example — keeps its own component styling instead of inheriting item padding, borders, and hover states.
- Give the Kicker index its own explicit letter-spacing, so a consumer that tightens the label's tracking does not silently strip the index's.

## 0.4.0

- Add the Docs group, the ninth canonical group: eight components covering documentation chrome — Skip link, Docs header, Docs nav, Pager, Search palette, Anchor heading, Kbd, and Copy button. Selecting `groups: ["Docs"]` emits the full set.
- Add five generally useful components: Table and Stat (Display), Meter and Empty state (Feedback), and Theme toggle (Core).
- Replace the raw catalogue-size standard with two durable ones: css_density holds emitted bytes per component stylesheet, and docs_selection budgets the bytes the documentation selection ships to consumers.
- The Search palette composes the native dialog with platform focus containment and Escape dismissal; the Copy button carries clipboard behaviour in the React adapter only. Statically rendered output stays complete without JavaScript; scroll-spy and drawer state remain consumer-wired through documented props and attributes.

## 0.3.0

- Add the Navigation-group Breadcrumbs component: a labelled ordered hierarchy with linked ancestors, one explicit current page, and narrow-view overflow.
- Add catalogue-driven browser conformance: every component example auto-enrols in light/dark accessibility scans and review sheets, with co-located interaction scenarios plus reduced-motion and forced-colour checks.
- Strengthen tertiary-ink contrast across semantic surfaces, add the `--discern-color-warning-deep` text role, and correct definition-list and figure-example semantics uncovered by the browser gate.

## 0.2.0

- Set up discern, ensuring the quality of the code in its own design system.

## 0.1.1

- Every entrypoint now carries a module doc and all public symbols carry symbol documentation, generated into the JSR reference docs. A release test fails if an undocumented export appears.
- The runtime emitter writes through `node:fs/promises` instead of Deno file APIs, so selected-runtime emission also works on Node.js with byte-identical output. Under Deno the emitter now needs read as well as write permission for its output directory.

## 0.1.0

The first published version. Extracted from the Discern repository with its component and token history preserved.

- One `discern` CSS namespace across classes, custom properties, data attributes, keyframes, and cascade layers, scoped beneath `:where([data-discern-root])`.
- Framework-neutral root, `./manifest`, `./runtime`, `./tokens`, and `./theme/discern` exports; React confined to the optional `./react` adapter with an 18.3+ peer contract.
- Deterministic selected-runtime emitter: explicit components and/or canonical groups, dependency resolution from generated metadata, stable byte-for-byte output, and a manifest carrying ownership, token, output, and SHA-256 integrity facts.
- 54 components across Core, Display, Editorial, Feedback, Forms, Layout, Marketing, and Navigation groups, with a local catalogue.
- Semantic light/dark theme roles with the branded blue preset separated from the base; consumer themes override public tokens without forking component CSS.
- Optional, independently selectable font pack (with SIL OFL licence texts) and grain texture; core output copies no assets.
