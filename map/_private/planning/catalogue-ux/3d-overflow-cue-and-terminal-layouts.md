# 3D — Ship OverflowCue and rebuild Terminal layout inspection

**Goal:** Add a reusable public `OverflowCue` Component that truthfully signals scrollable edges on any content, then use it to turn Terminal layouts into focused, URL-reproducible capability labs rather than a long stack of control-heavy inspector cards.

**Wave:** 3. Implement in parallel with 3A, 3B, 3C, and 3E after 2A has landed. Land fourth within wave 3, after 3A–3C.

Other wave-3 streams are in flight. You own `3D` only; do not launch, dispatch, or supervise sibling briefs.

## Orient, verify prerequisites, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify the 1A and 2A completion markers are on `main`, the Terminal route/page/style seam exists, and the add-component skill now carries the canonical example convention. Stop if a prerequisite is missing.

Call `discern_start` with the literal name **`catalogue-3d`**, re-root every operation into the returned absolute `data.path`, and pass it to every discern tool.

Then read, in this order:

- `AGENTS.md`, the programme README, `map/00-orientation/design-principles.md`, and `map/60-catalogue/README.md`;
- the full `add-a-component` skill and follow it for `OverflowCue`;
- `/Users/jack/Sites/macrocosm/resources/js/Components/Macros/Stores/useOverflow.ts` as inspiration only;
- `src/types/component-meta.ts`, `assets/behaviors/**`, the generated-behaviour pipeline in `scripts/generate.ts`, and the floating-surface behaviour tests as a selection-scoped precedent;
- the Layout component anatomy and an existing behaviour-owning Component;
- the Terminal route/page/style modules, `catalogue/terminal-layout-inspector.tsx`, `catalogue/cli-compositions.ts`, `src/cli/projection.ts`'s terminal inspector, `tests/catalogue_terminal_layout_test.ts`, `tests/cli/terminal_inspector_test.ts`, and relevant browser checks.

Use `discern-write-it-once` for the overflow state/behaviour authority and `discern-cure-a-bug` for overflow, resize, direction, or keyboard defects. Verify every anchor against the live tree.

## Background

The current Terminal route renders all complete CLI recipes one after another. Each card repeats four viewport buttons, a grid toggle, an inspector, and a source disclosure. On narrow screens the frame can scroll, but the boundary gives little visible evidence that content continues. The owner specifically wants that scroll/fade cue to become a reusable design-system Component because the need recurs well beyond this page.

The supplied old React hook measures `scrollHeight`, `clientHeight`, and `scrollTop`, then calculates a mask whose start/end opacity follows scroll position. Preserve its useful insight—cue only the edges that still contain content—but do not port its React-only state, vertical-only assumptions, white mask literals, dependency-array workaround, or manual sync obligation into this framework-neutral package.

## Deliverables

### 1. Add the public Layout `OverflowCue` Component

Use the add-component skill and fixed anatomy under a live-tree-appropriate Layout slug, expected to be `src/components/layout/overflow-cue/` with public React name `OverflowCue`.

The Component contract must:

- wrap or enhance arbitrary child content without owning that content's semantics;
- support logical block, inline, or both axes;
- signal start and end independently from actual `scrollTop`/`scrollLeft`, client size, and scroll size;
- handle LTR and RTL correctly, including browsers' differing `scrollLeft` conventions behind one tested authority;
- update on scroll, container resize, content resize, and dynamic content changes without a consumer calling `sync()`;
- expose stable namespaced data attributes for current overflow edges so CSS, React tests, and raw HTML consumers observe the same state;
- keep native scrollbars and ordinary wheel, touch, trackpad, keyboard, and programmatic scrolling intact;
- render a no-JavaScript/static fallback where content still scrolls and no false cue is shown;
- make the cue decorative to accessibility APIs, pointer-transparent, theme/token-driven, forced-colour safe, and free of motion that needs animation;
- avoid fading readable content when no overflow remains at that edge.

Prefer a selection-scoped framework-neutral runtime behaviour enrolled from Component metadata, analogous to `floating-surface`, so emitted CSS/HTML consumers get the same enhancement as React consumers. The React adapter should not own a second measuring algorithm. If a small framework-neutral measurement helper can serve behaviour tests and React, keep one algorithm and one state vocabulary.

Provide a minimal, unsurprising API. Do not grow custom scrollbar, virtualisation, snap, auto-scroll, or scroll-position management features. If the wrapper creates the scroll container, document that clearly; if it can enhance an existing element, provide one supported namespaced markup contract rather than DOM cloning magic.

Declare the CLI stance as exempt with a real reason: the Component is a browser interaction/overflow affordance and terminal renderers expose clipping/overflow through their own frame facts.

### 2. Prove OverflowCue as a reusable class of behaviour

Add Web examples under the canonical example contract for at least:

- vertical overflow at start, middle, and end;
- horizontal overflow at start, middle, and end;
- both axes;
- dynamic resize/content growth;
- RTL inline overflow;
- no-overflow fallback.

Keep the Catalogue-worthy examples bounded; use focused tests for the exhaustive state matrix. Add practical real-browser guards in the Terminal/OverflowCue-owned browser-check module for wheel/keyboard/touch-compatible scrolling where automation allows, resize, dynamic content, direction, themes, forced colours, no document overflow, and cue disappearance at each terminal edge. Add an architectural guard that future behaviour metadata auto-enrols the script and that the Component's emitted runtime includes it only when selected. Do not edit shared `scripts/conformance.ts` orchestration in this parallel wave.

Update public exports/generated surfaces through codegen, the closest Component-facing map/documentation authority, and `CHANGELOG.md` under Unreleased. Leave the Catalogue map to wave 4. Never hand-edit generated files.

### 3. Split Terminal layouts into index and detail labs

Use the Terminal route-family seam to create:

- a light Terminal layouts index derived from `cliCompositionRecipes`;
- one detail route per recipe id;
- meaningful upgrades for existing `#terminal-layout-*` links.

The index cards show title, one short outcome description, a compact constituent Component summary, and an obvious “Inspect layout” action. Do not mount every inspector on the index.

On detail, the real terminal frame leads. Keep `catalogue/cli-compositions.ts` as the one recipe authority and `projectTerminalInspectorHtml()` as the geometry/fold/overflow projector. The Catalogue may arrange controls and copy actions but must not recreate terminal geometry.

### 4. Build a coherent terminal capability control model

Replace repeated per-card profile rows with one focused lab control set for the active recipe:

- named presets such as Compact 40×24, Standard 80×24, Wide 120×30, and Tall 80×40;
- explicit column and row overrides that visibly put the lab into Custom state;
- Unicode/ASCII, colour depth, hyperlink support, and other capabilities only where the public `TerminalCapabilities` contract and recipe rendering can honestly exercise them;
- cell grid toggle and any inspector cues as secondary review options;
- one Reset to preset action;
- all selected capabilities, recipe, and options encoded in validated URL state so a copied URL reproduces the exact frame;
- invalid or extreme URL values fail to safe bounded defaults with an accessible explanation, not a broken frame.

Presets are reproducible review fixtures, not claims about supported-terminal limits. Say that once, quietly.

### 5. Make overflow, output, and source actions self-evident

- Wrap the inspector viewport with the new `OverflowCue` on the needed axes. The cue must visibly tell a person that more frame exists without hiding the scrollbar or terminal ruler.
- Keep fold, overflow facts, repeated-row/blank-run advisories, and cell rulers visually subordinate to the actual frame but easy to inspect.
- Provide separate precise actions to **Copy raw terminal output** and **Copy adaptable composition source**. Do not label both simply “Copy”.
- Keep source closed by default. The Terminal recipe is a Catalogue composition assembled from public renderers, not a public component itself.
- Link constituent Component names to their detail routes.
- Provide previous/next layout navigation and return to index.

Do not edit landing/Overview or other page-family overflow locations in this stream. Wave 4 adopts `OverflowCue` across those already-landed pages without creating branch collisions.

### 6. Preserve auto-enrolment and add future-member guards

Tests must prove:

- a synthetic future `CliCompositionRecipe` joins index, detail route, local navigation, global search, previous/next order, and rendering without page edits;
- presets and custom capability state round-trip through the URL and feed the actual renderer/inspector;
- raw output copy differs deliberately from source copy and both match their authority;
- every viewport's inspector reports correct columns/rows/fold/overflow and the document itself does not overflow;
- OverflowCue edge attributes track real scroll state around the inspector at wide and narrow browser viewports;
- theme changes re-render the recipe and inspector consistently;
- index pages do not mount all complete layouts;
- existing exact terminal inspector and recipe renderer tests remain green.

### 7. Inspect the complete vertical slice visually

Run `deno task serve` on the deterministic worktree port and leave it running. Use the in-app browser to inspect every Terminal layout detail across presets, a custom width/height, Unicode/ASCII, at least two colour depths, grid on/off, light/dark, and wide/narrow browser widths. Scroll inline and block to each edge and watch the cue change. Also inspect every `OverflowCue` example, dynamic resize/content, RTL, keyboard focus, and no-overflow. Report exact URLs including capability query parameters.

## Wave-3 landing order

This branch lands fourth. Before the final gate, confirm 3A, 3B, and 3C brief markers are under `map/_private/planning/catalogue-ux/_done/` on `main`. If not, report implementation-ready state, keep the worktree, and stop for resume. Once present, call `discern_update`, follow its exact overlap/recovery guidance, re-read named files, regenerate from sources, then finish and gate the composed tree.

## Constraints

- Follow the add-component skill completely, including anatomy, auto-enrolment, conformance, changelog, and preview.
- One framework-neutral overflow measurement/state authority serves emitted behaviour and React; no copied hook logic.
- Cue presence is based on measurable overflow and remaining scroll distance, not hover or a permanently painted gradient.
- Keep scrolling native and accessible. Never hide overflow solely to make screenshots clean.
- One recipe authority and the public inspector own terminal output/geometry.
- Stay within the OverflowCue Component/behaviour/generated surfaces, Terminal family files, Terminal/OverflowCue-owned unit/browser tests, the closest Component map, and changelog. Do not edit other page families or shared conformance orchestration.
- Do not perform the muted-text/metadata pass or Interface Builder work.
- Commit Component foundation, behaviour/tests, route/detail lab, and adoption as focused steps.

## Out of scope

- Custom scrollbars, virtualisation, carousel controls, snap points, or auto-scrolling.
- Rewriting terminal renderers or `projectTerminalInspectorHtml()` geometry.
- Components/Compare, Foundations, Compositions, Overview, or landing redesign.
- Broad cross-Catalogue OverflowCue adoption; 4A owns the integrated pass.
- Interface Builder work or dedicated testing.
- Publishing a release.

## Definition of done

- Public `OverflowCue` ships with fixed anatomy, selection-scoped framework-neutral behaviour, truthful block/inline/both and logical-edge states, dynamic/RTL/no-JS/accessibility coverage, generated exports, docs, and Unreleased changelog.
- The old React hook informed the behaviour but no React-only/manual-sync/white-mask design was copied.
- Terminal layouts have a light index and one focused detail lab per recipe; the index does not mount all frames.
- Presets and bounded capability overrides drive the real renderers and inspector, round-trip in the URL, and distinguish preset from Custom state.
- The active frame uses OverflowCue, scrolls natively to every edge, and offers precise raw-output versus adaptable-source copy actions.
- All current and synthetic future recipes auto-enrol across routes, navigation, search, rendering, and tests.
- Every Component/example and Terminal state named above has been visually exercised at exact URLs; the server remains running.
- No sibling page-family, global muted-metadata, landing, or Interface Builder work appears in the diff.
- After 3A–3C land, run `discern_update`; after the last edit run `discern_prepare`, commit sources and regenerated outputs, then run `discern_done` on clean committed HEAD.
- Once green, run `discern_accept`. A recorded grant may land; otherwise it must refuse without mutation, after which report the proof line and `catalogue-3d` branch/worktree and stop.
- In the final commit, move this brief from `map/_private/planning/catalogue-ux/3d-overflow-cue-and-terminal-layouts.md` to `map/_private/planning/catalogue-ux/_done/3d-overflow-cue-and-terminal-layouts.md` (create `_done/` if needed).
