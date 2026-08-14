# Changelog

Releases follow [SemVer](https://semver.org). JSR versions are immutable: a published version is never edited or replaced, and a bad release is superseded by a new version (or yanked) rather than rewritten. Before 1.0, minor versions may still change the public contract; every breaking change is recorded here.

Each release is cut from a green run of the full release gate — formatting, lint, strict type-checks, package tests, the catalogue build, generated-output currency, and a publish dry run against the allowlisted artifact — and published through JSR trusted publishing from CI.

## Unreleased

- Fix interactive terminal colour detection: `DenoTerminalIO`'s environment snapshot materialized unset variables as present-but-undefined keys, and the capability detector treated a present `NO_COLOR` key as the suppression signal, so every prompt run through `DenoTerminalIO` rendered colourless even on colour-capable terminals. Detection now treats an explicitly undefined value exactly like an absent key, and the snapshot no longer fabricates keys for unset variables. An empty-string `NO_COLOR` still suppresses colour.
- Make Iowan Old Style the primary display face in both the core system stack and optional font provider, with bundled Crimson Pro as its first portable fallback. Remove the redundant Crimson-matched Iowan aliases; on hosts without Iowan, the remaining Georgia alias stays calibrated to Crimson Pro because Crimson is the font that loads and swaps in. The browser gate now resolves every target and local stand-in at each probe weight before measuring their geometry, so an earlier native face cannot leave a later downloadable target in its temporary fallback state.

## 0.12.2

- Separate Unicode repertoire, ANSI colour, and ANSI cursor-control detection so `C.UTF-8`, `C.utf8`, and UTF-8 redirected output retain Unicode triangle geometry without receiving unsupported colour or cursor escapes. The public capability record adds source-compatible optional `ansiControl`, and the inline painter returns typed painted, unchanged, or refused results instead of partially replacing frames that exceed the viewport.
- Preserve meaningful Box indentation across fitting and wrapped lines so highlighted choice rows retain one label column, and reserve a stable three-cell marker slot across every Unicode and ASCII workflow-step state.

## 0.12.1

- Fix masked Logo cloud marks so light Theme retains the supplied brand artwork while dark Theme replaces it completely with a neutral silhouette. This removes colour artwork leaking around the mask and keeps provider rows visually consistent without changing unmasked marks.
- Add typed semantic group headings to select, multiselect, and search prompts. Headings carry no caller value, remain outside navigation and results, retain their governing context while scrolling, and render through the Token-derived triangle section rule across colour, no-colour, and ASCII terminals.
- Add Fleet's opt-in `identityMode: "lossless"`, which preserves complete persona and branch identities as copyable continuation lines when compact cells cannot contain them. The existing compact, width-bounded rendering remains the default.

## 0.12.0

- Add the opt-in Marketing section foundation with standard or wide frames, standard or spacious rhythm, and canvas, raised, sunken, inherited, or stable contrast surfaces. Contrast remaps semantic ink, surface, and border roles as one local scope so ordinary descendants remain readable in both themes.
- Add the Marketing intro composition for a repeatable eyebrow, explicit heading rank, and standfirst at standard or editorial scale with start or centred alignment. Global Layout, Display, and Token defaults are unchanged, and existing Marketing components and consumer-owned artwork retain their current contracts.
- Add opt-in homepage-derived variants without changing existing defaults: campaign Site header, showcase and atmospheric Hero block, strip Logo cloud with theme-safe image masks, and showcase Window, Terminal, and Code listing frames. Window and Terminal accept trailing chrome, while Terminal can carry a contextual footer; provider data, narrative content, and decorative artwork remain consumer-owned.

## 0.11.0

- Add the public React-free `./cli` layer across all twelve Component Groups: 99 pure, capability-aware terminal renderers, ten visible reasoned exemptions, token-derived colour degradation, and package-owned triangle motifs.
- Add the optional `./cli/interactive` Deno adapter for text, choice, search, textarea, progress, and sequential-form prompts, wired to the real Component renderers and covered through an injectable terminal harness.
- Add a complete `catalogue:cli` stdout catalogue and independent Web/CLI previews for every browser Catalogue Component, with shared generated examples and visible exemptions.
- **Breaking for Component Metadata authors:** every Component must declare a rendered or reasoned-exempt CLI stance. Codegen and conformance permanently reject absent stances, missing or orphan renderer modules, empty exemption reasons, and registry drift.

## 0.10.1

- Reserve monospace typography for explicit brand-name and code surfaces. Non-code component labels, indices, dates, measurements, status metadata, agent identities, annotations, captions, and Catalogue chrome now use the body or interface faces. Commands, paths, branch names, commit hashes, and Git change counts retain the code face.

## 0.10.0

- Add a quiet Theme toggle treatment for text-led navigation, align plain Brand, Site header, and Site footer marks to one smaller optical scale, style linked footer metadata, remove the browser body gutter from full-page roots, and move Logo cloud marks to the lighter accent text role.
- Add nested Table of contents entries. Nested entries are indented, omit a section number, and do not advance the numbering of later sections.
- Add a neutral `required` Prerequisite list state for static documentation while retaining `satisfied` and `unresolved` for live state. Procedure now preserves trailing space before the document continues.

## 0.9.0

- Hold representative runtime CSS, browser behavior, font, and grain transfer costs under measured ceilings. The optional font provider now puts metric-adjusted Iowan, Georgia, Helvetica Neue, and Arial aliases behind the intended webfonts, reducing layout movement while each WOFF2 loads. A source audit pins their effective ascent, descent, and line gap to the bundled Crimson Pro 90/21/0% and Inter 97/24/0% metrics. Parsed family identities decode escapes and compare case-insensitively. Quoted names preserve their whitespace; unquoted names collapse CSS whitespace and comments. Chromium CSSOM supplies the live face population. Root faces and descendants of media, supports, container, layer, and scope grouping rules enroll; qualified and unsupported contexts fail. A decoded authored-rule count must equal the CSSOM population. Decoded `@import` rules outside comments and strings fail, keeping the optional asset self-contained and every live face inside the audit. Target URLs carry one WOFF2 format hint in source order, and each function name touches its opening parenthesis. Complete family, style, weight, and source descriptors must then match the live target faces and the SHA-256 authority in both directions. Malformed descriptor tails fail explicitly, while duplicate audited descriptors remain failures even though CSS gives the last value effect. Browser cases derive from the audited alias faces, report every covered or skipped local alias, and measure real normal line boxes. Theme switching retains one control geometry across System, Light, and Dark.
- Add three source-backed Catalogue journeys for following a Procedure, triaging a failure, and surveying artifacts. The mandatory browser gate now checks their declared stage order, headings, landmarks, keyboard route, exact Command copies, and both-theme accessibility, while static markup tests preserve Procedure numbering and Diagnostic meaning without CSS.
- Extend resilience conformance across rendered Component surfaces: disclosures, nested controls, minimum target size, 390-pixel and 400%-zoom reflow, reduced motion, system-theme return, theme geometry, tuned local-font fallbacks, semantic-surface focus, and forced colors. In light and dark, real keyboard Tab must focus an ordinary Button on each canonical accent, success, warning, and danger surface; every probe must expose `:focus-visible` and a 2 CSS-pixel or wider `--discern-color-accent-500` outline. Unit tests hold the token's 3:1 contrast against those surfaces. The Catalogue-wide forced-color pass checks every focusable Component. Rendered-pixel stability remains part of manual and visual review. Temporary viewport changes share one transactional helper that restores the prior size on success or failure, while a tracked-source guard rejects unowned viewport mutation.
- Compose end-of-page next actions from Branch choice instead of adding another runtime Component. A named, permalinkable four-route state and source-backed Catalogue recipe make the pattern findable while keeping its recommendation and alternatives as visible text.
- Add Workflow Agent handoff, a neutral prose block whose one visible prompt string also supplies its adapter-only copy action. Clipboard confirmation is polite, focus stays on the button, and long instructions wrap instead of adopting shell-command grammar.
- Add Workflow Task metadata, a quiet definition-list strip that gives operational pages one complete, text-first account of their outcome, audience, prerequisites, complexity, file effects, retry safety, and expected end state.
- Turn the Catalogue into a source-backed selection instrument. Its sidebar remains a stable 109-Component index; a purpose selector in the Components section and guidance-aware search narrow the rendered Catalogue. Each Component's available Best practices, Selection and React import, and Props and variants evidence uses a closed disclosure in that order. The toolbar and conformance sheets identify package version 0.9.0, while styleguide-only recipes demonstrate documentation tasks, failure triage, and review handoffs without adding runtime Components.
- Add the Workflow Artifact family: Artifact tree, File change, Artifact card, Ownership badge, Decision record, and Rule. Project files now render as semantic nested lists with full-path middle truncation, narrow-width containment, and flow-safe per-node annotations; file dispositions and ownership relationships remain explicit text, with removed, generated, and unchanged files presented as neutral facts. File change's decoded CSS identifiers exclude warning and danger semantic tokens. Its owned class names stay inside its own stylesheet across the full emitted CSS registry, including foundations, utilities, Optional Assets, and future Components. Ownership discovery verifies the decoded `class` attribute name, reads `~=` token selectors, and splits `=` values on decoded CSS whitespace. Existence selectors, partial operators, and other attributes establish no class ownership. The foreign-reference check compares decoded names without case distinctions. Whole artifacts carry provenance, while decisions and binding instructions expose their source structure without client JavaScript.
- Add the Workflow result and diagnostic family: Result summary states passed, failed, blocked, changed, or unchanged in visible text; Diagnostic locates and reproduces a failure before prescribing its correction; Raw output provides a native labelled disclosure; and Standard meter states a quality value's limit, floor-or-ceiling direction, headroom, within-limit status, and optional trend. The family composes the existing Command, Path reference, Meter, and Copy button contracts, aligning verified success, neutral information, and attention states without changing Receipt.
- Add the Workflow procedure and recovery family: Procedure, Procedure step, Prerequisite list, Branch choice, Retry notice, and Destructive action notice. Operational guides can now state prerequisites, preserve numbered step order without CSS, compose commands and expected proof, expose linkable forks, distinguish safe from unsafe retries, and label the scope, impact, authority, and recovery route of destructive actions in complete static HTML.
- Add the Workflow group and its first operational family: Command, Command group, Expected result, and Path reference. Commands now carry explicit run context, expected proof, cautions, platform qualification, faithful keyboard-scrollable horizontal overflow, and adapter-only clean-copy behaviour; labelled alternatives remain complete as stacked static HTML, and paths preserve both ends under narrow-width truncation. Workflow stays distinct from Docs so selecting documentation chrome does not silently acquire operational-grammar bytes.

## 0.8.0

- Prevent `HoverCard` and `Tooltip` panels from being clipped by tables, scrolling regions, and other overflow ancestors. Components now declare selection-scoped browser behaviors in Metadata; resolving either surface emits a shared `discern.js` enhancer that uses the Popover API top layer, viewport-aware positioning, and automatic enrollment for later DOM additions while retaining the static CSS fallback. Runtime Manifest schema 2 adds each component's `behaviors` and `outputs.scripts`.
- **Breaking for Manifest readers:** readers that assert schema 1 must accept schema 2. Each component may now declare `behaviors`, and `outputs.scripts` lists the browser scripts emitted for the selected component graph.

## 0.7.0

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
