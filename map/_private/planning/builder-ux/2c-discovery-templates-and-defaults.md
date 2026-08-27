# 2C — Make discovery visual, searchable, and useful from the first placement

**Goal:** Replace the 139-card live-preview wall with image-led, intent-searchable discovery; add explicit Blocks/Components and starter patterns; and give newly placed complex content meaningful generic Builder seeds without duplicating shared search, image, or Component facts.

**Wave:** 2. Implement in parallel with 2A, 2B, and 2D after Builder 1A has landed. Land third within wave 2, after 2A and 2B.

Other wave-2 streams are in flight. You own `2C` only; do not launch, dispatch, or supervise sibling briefs.

## Orient, verify the architecture prerequisite, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify `map/_private/planning/builder-ux/_done/1a-builder-architecture-and-interaction-seams.md` is on `main` and that discovery modules, `styles/discovery.css`, discovery browser checks, read-only registry/search/image adapters, contextual-picker contract, and Builder default/template seam exist. Stop if the marker or behaviour is missing.

Call `discern_start` with the literal name **`builder-2c`**, re-root every operation into the returned absolute `data.path`, and pass it to every discern tool.

After re-rooting, read:

- `AGENTS.md`, this programme README, `map/60-catalogue/interface-builder.md`, and ADR 0027;
- post-1A discovery modules/styles/checks, discovery registry projection, current `registry-index.ts` successor, and Component instantiation/default logic;
- the universal search engine/provider contract from Catalogue 1A, canonical example contract from 2A, generated example-image manifest/resolver from 3A, and final shared purpose/Group vocabularies;
- the read-only insertion-target/compatibility contract from Builder 1A, noting that Builder 2B may strengthen it before this branch's final update;
- existing `catalogueBuilderDefaults`, Component metadata, `catalogue/compositions.tsx` illustrative patterns, and generic Component examples before choosing a Builder template/default authority;
- current local-storage/persistence helpers only to reuse their guarded preference pattern, not to build named drafts.

Use `discern-write-it-once` for search/image/template/default enrolment and `discern-cure-a-bug` for stale-filter, blank-preview, or performance defects. Do not edit shared Catalogue search, generated image production, or Component examples to make Builder discovery easier.

## Background

The current palette renders 139 Components in 13 Groups and is roughly 22,747px tall. Cards lazily mount real examples, but many defaults are visually blank or generic “Text”; the preview region is inert/dead while only the lower text button places the Component. Search is literal substring matching, so “call to action” does not find CTA Band. Purpose labels expose raw slugs such as `marketing-site`.

Context is also leaky: after choosing the Marketing site purpose, opening Hero block's Actions picker and searching Button produced “No components match” because the unrelated global purpose filter remained active. New Tabs and TabItem rows begin empty; complex Hero placement produces a large block called “Text”. Humans meet blankness before usefulness.

Catalogue waves 1–3 already solve the shared parts: one universal search matcher, one canonical example identity, and generated exact-bounds images for every Web example. This stream builds a Builder-specific discovery experience over those facts, not another search or capture system.

## Deliverables

### 1. Replace live palette previews with generated recognition

Consume the generated representative Component image selected by canonical example order.

- Make the whole card one obvious Add/drag affordance. Avoid nested interactive controls and dead preview regions.
- Render the active preview Theme's generated image with truthful intrinsic dimensions and a consumer-owned fit/background treatment. Images may be decorative when adjacent text names the Component; preserve useful alternative text where the image communicates a state not repeated.
- Never mount 139 live Components on the palette, hide a live wall with CSS, or maintain Builder-specific screenshot paths/representative ids.
- Provide **Visual** and **Compact** density modes. Visual leads with the image; Compact supports expert scanning without discarding names, Groups, and concise surface/compatibility facts.
- Make Groups collapsible, show labelled counts, remember collapse/density as guarded comfort preferences, and keep all results keyboard reachable.
- Distinguish Components needing configuration before meaningful render through source-backed treatment, not a blank rectangle presented as a preview.
- Keep image loading bounded and layout-stable. Use intrinsic aspect information, lazy decode, and performance checks for initial palette render, search, and scroll.

### 2. Use one universal intent search

Project Builder component records into the shared search authority. The Builder owns its query UI and compatible population; it does not own normalisation, aliases, tokenisation, scoring, match reasons, or tie-breaking.

- Search names, slugs, human Group/purpose labels, descriptions, canonical keywords, and source-backed aliases through the shared record contract.
- “Call to action” finds CTA Band with a concise match reason; test other human/abbreviation witnesses chosen from real metadata.
- Highlight or state why a non-title result matched without filling every card with search diagnostics.
- Humanise purpose choices such as “Marketing site”, “Building documentation”, and “Procedural workflow”; underlying stable values remain source facts.
- Offer useful empty recovery: clear query/filter, view all Components, or return to the current compatible set.
- Keep query/filter state during ordinary browsing, but never let old discovery filters make an explicitly requested compatible slot appear empty without explanation.

Do not add semantic/remote/AI search, a second synonym map, or network dependence. The deterministic shared matcher is the contract.

### 3. Make contextual slot picking self-evident

Consume the explicit insertion target and compatibility result from 2B after the required final update.

- Replace duplicate global-status/palette instructions with one sticky contextual header: `Add to Hero block › actions`, plus Change target and Cancel.
- Contextual picking defaults to compatible Components. Global purpose filters are suspended or clearly scoped out; an incompatible/hidden requested result explains why and offers a safe route to clear filters or change target.
- Search query may persist if useful, but changing from ordinary discovery to a slot cannot yield “No components match” when a compatible Button exists only because an unrelated purpose remained active.
- Display compatibility as quiet positive context rather than warning badges on all cards. Refused placement remains the tree authority's responsibility.
- Escape cancels context before clearing query/selection, and focus returns to the invoking Add action or target.

Do not duplicate compatibility rules in discovery code. It filters and explains the tree authority's result.

### 4. Separate Blocks, Components, and starter patterns

Create a small Builder-owned source authority for starting/insertable patterns, validated through the accepted Builder document policy and live Component registry.

- **Starters** create a new composition from a useful generic page posture: blank, landing, article/docs, settings/form, and workflow/result are suitable only when current Components can express them truthfully.
- **Blocks** insert a bounded generic section/subtree such as Hero with actions, feature grid, FAQ, article header, or result summary. Prefer existing high-level Components where they already own the pattern.
- **Components** remains the complete primitive/high-level registry.

Templates are Builder data, not public Components, exported APIs, guaranteed recipes, or aliases for Catalogue illustrative Compositions. Reuse constituent Component facts and image/search authorities, but do not silently convert `catalogue/compositions.tsx` demonstrations into Builder templates if their “adaptable inspiration” posture would become a promise.

Each template/Block has one id, human title, short task-shaped description, ordered accepted document/subtree, constituent slugs derived or validated once, representative generated imagery from its constituents or a deliberate Builder template capture only if the shared image contract is formally extended. Do not hand-author thumbnail files.

Starting from a non-empty composition requires the existing explicit Replace/Keep confirmation. This is not named-draft/file-manager work.

### 5. Add Recent and Favourite acceleration

- Record bounded recent Components/Blocks only after successful placement.
- Let users favourite/unfavourite discovery entries with an accessible action that does not accidentally place them.
- Provide small Recent and Favourites sections above the complete directory, with clear empty states and no duplicate record data.
- Persist ids through the guarded preference mechanism; remove unknown/stale ids automatically and never let storage failure block discovery.

Project-pinned items may be supported only if a real existing project configuration authority exists. Do not invent a repository config format in this stream.

### 6. Give complex creation meaningful Builder seeds

Create one Builder-specific default authority layered after public Component defaults and before policy acceptance.

- Hero-like content uses generic “Page title”, short supporting text, and a removable generic action only when that makes the placed result immediately legible.
- Tabs begins with two unique, valid generic items or opens a small count/seed choice; it must not render an unexplained empty tablist.
- Adding a structured row creates stable unique values, `Tab 1`/equivalent human labels, generic content, and focuses the new row through the inspector contract.
- Empty slot additions use slot-specific human placeholder content where safe rather than universal “Text”.
- Required opaque data continues to use `catalogueBuilderDefaults`; do not weaken public prop types or place invalid placeholders.

Seeds remain generic and Builder-only. They do not alter Component source defaults, examples, metadata meaning, exported TSX beyond the user's accepted document, or consumer claims.

### 7. Guard discovery, templates, and defaults as populations

Add focused unit and browser checks proving:

- every current/future Component auto-enrols with generated representative imagery, shared search record, Group/purpose, and both palette densities;
- the palette does not live-mount the registry, has no dead preview click area, remains layout-stable, and meets bounded render/search/scroll timings;
- shared intent aliases/ranking/match reasons—including “call to action”—work without Builder-specific synonyms;
- purpose labels are human while values remain stable;
- contextual slot picking suspends/explains unrelated filters and consumes, rather than copies, compatibility facts;
- all starter/Block trees pass current policy, reference live slugs, produce deterministic accepted documents/TSX, and future template additions enrol without page edits;
- Recent/Favourites remain bounded, recover from denied/corrupt storage, and remove stale ids;
- Tabs/Hero/structured-row seeds are meaningful, unique, focused, undoable, and do not change public Component defaults;
- keyboard search, collapse, density, favourite, Add, drag, context Cancel, and empty recovery remain accessible.

### 8. Inspect discovery by recognition

Run `deno task serve` on the deterministic worktree port and leave it running. In the in-app browser:

- scan every Group in Visual and Compact modes, both Themes, and compare a representative image with its live canonical example;
- search exact names, abbreviations, “call to action”, descriptions, purposes, no-result, and typo-adjacent queries supported by the shared engine;
- filter Marketing site, open Hero Actions, find/place Button, cancel, and confirm ordinary filters restore coherently;
- use Starters, Blocks, Recent, and Favourites; reload preferences and simulate storage denial if the test harness supports it;
- place Hero, Tabs, a structured object Component, and sparse/opaque defaults; verify immediate visual meaning and focus/undo behaviour.

Report exact URL, palette population, measured initial/search timing, and representative journeys.

## Wave-2 landing order

Implementation may proceed while 2A/2B are in flight, but this branch lands third. Before the final prepare/gate, verify both markers are on `main`:

- `_done/2a-preview-viewport-and-interaction.md`;
- `_done/2b-placement-validity-and-layers.md`.

If either is absent, report implementation-ready state, keep the worktree, and stop. Once present, call `discern_update`, follow its exact overlap guidance, re-read preview Appearance/image and tree compatibility/insertion contracts it names, then finish against the composed system.

## Constraints

- Universal search and generated example imagery are shared read-only authorities; no Builder-specific matcher, alias list, capture route, image path list, or representative selection.
- Templates/defaults are accepted Builder data, generic, Catalogue-only, and not public Components/API.
- Discovery consumes tree compatibility and insertion targets; it does not define placement validity.
- Keep public Component examples/defaults, Tokens, metadata meaning, and package publish set unchanged.
- Stay within discovery modules/registry projection/templates/defaults, `styles/discovery.css`, and discovery-owned unit/browser checks. Tree, preview, inspector, and final conformance orchestration are read-only.
- Preserve desktop-authoring scope and narrow/zoom accessibility without designing a phone palette workflow.
- Commit image cards/density, universal search/filtering, contextual picker, templates, preferences, defaults, and guards in focused steps.

## Out of scope

- Iframe/viewport/modes/Appearance implementation or editor overlay styling.
- Placement/compatibility/tree mutation/Layers/direct canvas editing.
- Inspector hierarchy, JSON validation language, persistence status/file manager, export viewer, or cost summary.
- Named drafts, file management, arbitrary project configuration, AI/remote search, custom image capture, or package release.

## Definition of done

- Palette discovery is generated-image-led, whole-card actionable, available in Visual/Compact densities, collapsible, performant, and never live-mounts the 139-Component population.
- All matching, aliases, ranking, ordering, and reasons come from the universal search authority; human purpose labels and agreed intent witnesses work.
- Contextual picking visibly names its target, consumes compatibility, and cannot hide a valid Button behind an unrelated old purpose filter.
- Generic Starters and Blocks create accepted deterministic Builder trees without claiming public API/recipe status; Recent/Favourites accelerate repeat use safely.
- Hero, Tabs, structured rows, sparse slots, and opaque required data begin in meaningful valid Builder states without altering public defaults.
- Population, performance, storage, accessibility, policy, future-enrolment, and undo/focus guards cover the complete discovery/template/default class.
- The exact live Builder URL has been visually exercised through every discovery and starting journey, and the server remains running.
- No tree/preview/inspector redesign, named-draft work, shared-authority fork, hand-authored image, or unrelated Catalogue page change appears in the diff.
- After 2A and 2B land and the final `discern_update` completes, run `discern_prepare`, commit every change, then run `discern_done` on clean committed HEAD.
- Once green, run `discern_accept`. A recorded grant may land; otherwise it must refuse without mutation, after which report the proof line and `builder-2c` branch/worktree and stop.
- In the final commit, move this brief from `map/_private/planning/builder-ux/2c-discovery-templates-and-defaults.md` to `map/_private/planning/builder-ux/_done/2c-discovery-templates-and-defaults.md` (create `_done/` if needed).
