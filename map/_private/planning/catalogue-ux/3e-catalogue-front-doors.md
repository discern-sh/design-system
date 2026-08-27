# 3E — Make both Catalogue front doors task-first

**Goal:** Align the site landing page and Catalogue Overview around one recognisable route order, a conspicuous “Find a Component” path, honest source-backed facts, and light in-page orientation so people enter the right bounded catalogue destination immediately.

**Wave:** 3. Implement in parallel with 3A–3D after 2A has landed. Land fifth and last within wave 3.

Other wave-3 streams are in flight. You own `3E` only; do not launch, dispatch, or supervise sibling briefs.

## Orient, verify prerequisites, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify wave 1A and 2A completion markers are on `main`, the Overview is a page-owned module/style, and the canonical route descriptor authority exists. Stop if a prerequisite is missing.

Call `discern_start` with the literal name **`catalogue-3e`**, re-root every operation into its returned absolute `data.path`, and pass that path to every discern tool.

Then read `AGENTS.md`, the programme README, `map/60-catalogue/README.md`, the Overview page/style module, `catalogue/landing/page.tsx`, `catalogue/landing/facts.ts`, `catalogue/landing/behaviors/theme-preference.js`, `tests/landing_test.ts`, and the front-door-owned browser-check module containing `verifyLandingPage()` and narrow-layout checks after 1A. Verify live anchors before editing.

## Background

The root landing page is already a strong dogfood surface: it is composed from published Components, selected runtime CSS, generated inventory facts, and real browser/terminal output. The Catalogue Overview is smaller and source-backed. Their navigation and calls to action are nevertheless inconsistent, several links use generic “Browse the catalogue” language, and the long public landing page offers little in-page orientation. A person arriving to inspect a specific Component should not first decode the architecture story.

The goal is not to turn the root page into the Catalogue or strip away its narrative. It is to make both front doors agree on where things are and let the dominant task—finding a Component—win visually.

## Deliverables

### 1. Project the canonical route authority everywhere

Use the route descriptor authority landed in 1A for visible Catalogue destinations and order:

1. Overview
2. Components
3. Foundations
4. Compositions
5. Terminal layouts
6. Compare

Project it into the Catalogue Overview, public landing header/footer Catalogue links, and any route directory on those surfaces. Do not maintain separate arrays in `catalogue/landing/page.tsx` and the Overview page. Page-specific in-page anchors are a separate, clearly labelled authority.

Use “Compare”, not “Review mode”, while keeping the stable route. Use the exact same “Terminal layouts” name rather than shortening it to “Terminal” in one place.

### 2. Make “Find a Component” the obvious entry task

- Give both front doors a prominent **Find a Component** action that reaches the Component explorer's search-ready state or canonical route.
- Keep installation/JSR or project-story actions available on the public landing, but do not let a vague “Browse the catalogue” compete as the only Catalogue action.
- Use bounded secondary actions such as “Explore Tokens”, “View illustrative patterns”, “Inspect terminal layouts”, and “Compare Components” where context supports them.
- Ensure action semantics are visible in link text, not dependent on a tiny eyebrow or surrounding paragraph.

Do not add a second search implementation to either page. The Overview may route into the shared Catalogue search or Component explorer using the API/seam provided by 1A/3A once composed.

### 3. Make the Catalogue Overview a visual directory

Keep the Overview sparse. It should answer “what can I inspect?” at a glance.

- Use route cards with an obvious whole-card affordance, visible direction/action cue, and labelled counts such as “139 Components” rather than a detached number.
- Lead with Components, then Foundations, illustrative patterns, Terminal layouts, and Compare according to the canonical authority.
- Replace machine-oriented text about generated references, mounting inventories, and complete contracts with short task descriptions.
- Keep source-backed package facts, but reduce the hero's implementation-story emphasis if it competes with navigation.
- Do not mount route content, specimens, or long guidance on the Overview.

### 4. Improve the long public landing page's orientation

Preserve its composed-Component and exact-emission contract.

- Add a restrained in-page navigation treatment for its major narrative sections, with stable anchors and meaningful active/target behaviour where appropriate.
- Keep the Catalogue destination navigation distinct from “On this page”; do not merge two different mental models into one unlabeled row.
- Make deep sections and final calls point to the most relevant bounded Catalogue destination rather than always the generic Overview.
- Ensure wide code, charts, diagrams, browser/terminal pairs, and navigation remain locally contained at narrow widths. Do not invent a page-specific fade affordance; wave 4 will adopt the public `OverflowCue` after 3D lands.
- Preserve one `h1`, SkipLink, main target, Theme preference behaviour, deterministic HTML, exact landing selection, and no unselected Component classes.

### 5. Keep every fact generated and every action testable

Strengthen tests so they prove:

- landing and Overview route projections equal the canonical descriptor names/order;
- Find a Component is the prominent Catalogue action on both front doors;
- route cards use labelled counts and direct bounded destinations;
- in-page anchor ids are unique, targets exist, heading hierarchy is coherent, and keyboard focus/targeting works;
- inventory/build numbers still derive from `LandingFacts` and generated registries;
- landing selection remains sorted, unique, live, and sufficient for every rendered class;
- narrow pages have no document-level horizontal overflow and header/footer navigation remains operable;
- light/dark Theme preference and accessibility scans remain green.

Prefer render/browser assertions to source-string copy matching except where deterministic document bytes are the contract.

### 6. Inspect both front doors visually

Run `deno task serve` on the deterministic worktree port and leave it running. In the in-app browser, inspect `/` and `/catalogue/` in wide/narrow and light/dark. Follow every primary route action, the in-page navigation, the final CTA, SkipLink, and theme control. Check that visual priority lands on the intended task without adding text density. Report exact URLs.

## Wave-3 landing order

This branch lands after 3A, 3B, 3C, and 3D. Implementation can proceed concurrently, but before the final gate verify all four earlier wave-3 briefs are under `map/_private/planning/catalogue-ux/_done/` on `main`. If not, report implementation-ready state, keep the worktree, and stop for resume. Once they are present, call `discern_update`, follow its exact overlap guidance, re-read the canonical routes and any front-door file it names, then finish against the composed system. This final update is where the Find a Component action may adopt 3A's exact search-ready URL; confirm the new `OverflowCue` composes cleanly, but leave front-door adoption to 4A so this stream does not reopen 3D's scope.

## Constraints

- Keep the public landing's dogfood contract: published Components only, exact emitted selection, generated facts, deterministic static HTML, and page-owned Theme policy.
- One route authority supplies Catalogue labels/order. One LandingFacts path supplies measured facts.
- The front doors orient; they do not become exhaustive inventories or instruction manuals.
- Do not add a bespoke overflow fade. Preserve containment and leave cross-page `OverflowCue` adoption to 4A.
- Stay within Overview, `catalogue/landing/**`, landing/overview tests, and the front-door-owned browser-check module. Do not edit other route families, shared shell, or shared conformance orchestration.
- Do not perform the deferred muted-text/tiny-metadata pass.
- Never hand-edit generated output.
- Commit canonical projections, Overview hierarchy, landing navigation/actions, and guards in focused changes.

## Out of scope

- Redesigning Component, Foundations, Compositions, Terminal layouts, or Compare pages.
- Changing package inventory facts, Component metadata, Tokens, or CLI stances.
- Adding the `OverflowCue` Component or a local imitation.
- Rewriting the public landing's entire visual identity or marketing narrative.
- Interface Builder work or dedicated testing.
- Publishing or version bumping.

## Definition of done

- Root landing and Catalogue Overview use the same canonical destination names/order from one authority.
- “Find a Component” is the conspicuous Catalogue action on both, while other actions route to bounded human tasks with precise labels.
- Overview cards feel clickable by sight, show labelled source-backed counts, and do not mount route inventories.
- The long landing page has restrained, accessible in-page orientation distinct from Catalogue navigation, with relevant deep links from its sections.
- Generated facts, exact runtime selection, deterministic HTML, Theme policy, accessibility, and narrow containment remain intact.
- Visual inspection shows clearer priority with no increase in prose density and no bespoke overflow fade.
- No other route family, muted-metadata pass, or Interface Builder work appears in the diff.
- Exact `/` and `/catalogue/` URLs have been checked wide/narrow and light/dark; the server remains running.
- After 3A–3D land, run `discern_update`; after the last edit run `discern_prepare`, commit every change, then run `discern_done` on clean committed HEAD.
- Once green, run `discern_accept`. A recorded grant may land; otherwise it must refuse without mutation, after which report the proof line and `catalogue-3e` branch/worktree and stop.
- In the final commit, move this brief from `map/_private/planning/catalogue-ux/3e-catalogue-front-doors.md` to `map/_private/planning/catalogue-ux/_done/3e-catalogue-front-doors.md` (create `_done/` if needed).
