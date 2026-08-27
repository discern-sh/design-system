# 3C — Turn Compositions into an illustrative pattern gallery

**Goal:** Present Compositions as a curated gallery of high-quality illustrative patterns, with a light index and focused responsive detail pages that link their constituent Components and clearly distinguish inspiration from package API.

**Wave:** 3. Implement in parallel with 3A, 3B, 3D, and 3E after 2A has landed. Land third within wave 3, after 3A and 3B.

Other wave-3 streams are in flight. You own `3C` only; do not launch, dispatch, or supervise sibling briefs.

## Orient, verify prerequisites, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify wave 1A and 2A completion markers are on `main` and that the live tree has a Compositions-owned route/page/style seam. If not, stop and report the missing prerequisite.

Call `discern_start` with the literal name **`catalogue-3c`**, re-root every operation into the returned absolute `data.path`, and pass it to every discern tool.

Then read `AGENTS.md`, the programme README, `map/60-catalogue/README.md`, the Compositions route/page/style modules created by 1A, all of `catalogue/compositions.tsx`, the post-1A Composition-family tests, `tests/docs_page_furniture_test.ts`, and the Compositions-owned browser-check module created by 1A. Verify anchors against the live tree.

## Background

The current Compositions route mounts all six full recipes in one vertical page. Each recipe has a header, a nested preview, and a “Copy recipe source” disclosure. The page calls them Catalogue-only recipes, but its language also suggests repeatable/reusable source, leaving even the owner unsure whether they are exported API, copy-ready assets, or demonstrations.

The product decision is now clear: a Composition is primarily an **illustrative pattern**—one of a grouped collection of high-quality demonstrations from which users draw inspiration. It is not an exported package primitive and is not guaranteed drop-in source. The UI must make that status obvious without surrounding every example with warnings.

## Deliverables

### 1. Create index and detail destinations

Use the Compositions route-family seam from 1A to provide:

- a compact `/catalogue/compositions/` gallery index;
- one stable detail route per `CompositionRecipe` id;
- meaningful upgrades for existing `#recipe-*` links.

Do not edit another route family or a central route switch. The index may render small representative previews only if they remain cheap and visually calm; it must not mount six complete, interactive, source-bearing recipe pages in miniature.

Each card shows the pattern title, a short job-shaped description, constituent Component names or a compact `+N more` summary, and an obvious “View pattern” affordance. Counts and membership derive from the recipe authority.

### 2. Make illustrative status part of the model

Extend the `CompositionRecipe`/`defineRecipe` authority in `catalogue/compositions.tsx` only as needed so every projection can derive:

- stable identity and title;
- short description framed as an outcome or situation;
- the constituent Component slugs in deliberate order;
- optional journey/conformance stages;
- the one live demonstration;
- adaptable example source.

Validate Component slugs against the generated registry rather than letting dead links render. Do not maintain a page-local list or infer membership with fragile JSX/source regexes. If Component membership can be supplied once in the recipe definition and shared by source/render/navigation, do that.

Use one quiet status label such as **Illustrative pattern** at index/detail level. Replace claims such as “reusable recipe” or “repeatable pattern” where they imply package guarantees. Source disclosure should say **View adaptable example source** or equivalent, with a short one-time statement that the user should adapt it rather than treat it as exported API. Do not repeat a disclaimer on every sub-panel.

### 3. Build a focused visual detail page

The detail page leads with the demonstration. It should feel like viewing a composed specimen, not reading a recipe manual.

- Isolate the preview from Catalogue chrome with enough breathing room and the minimum framing needed to understand its boundary.
- Add a small responsive-width control with meaningful presets (for example narrow, standard, and wide). Keep it close to the preview, keyboard-complete, and URL-addressable.
- Let the pattern render at its actual responsive width rather than scaling a screenshot.
- Link constituent Component names directly to their Component detail routes. Keep this list compact and secondary to the preview.
- Keep example source closed by default, clearly labelled, syntax-readable, and copyable through the existing Copy control.
- Provide previous/next pattern movement and a return to the gallery without duplicating the whole sidebar index.
- Preserve journey landmarks and conformance attributes from the same recipe authority.

Reduce nested card-on-card-on-surface treatment. Use spacing and one clear canvas boundary. Avoid filling sparse patterns with explanatory prose merely to balance the page.

### 4. Add gallery navigation and search projection

The Compositions family should contribute its index and detail destinations to local navigation and global search from the recipe registry. Search context says “Illustrative pattern”, not merely “Composition”, and can match constituent Component names without duplicating a keyword list.

Keep the sidebar bounded to pattern titles on this route. Deep links, selected width, and current pattern must survive refresh and be shareable.

### 5. Preserve source-backed and conformance integrity

Add or strengthen tests proving:

- every recipe auto-enrols in index, route resolution, navigation, search, previous/next order, and detail rendering;
- constituent Component slugs exist and no page-local list drifts;
- the detail source is produced from the same structured definition as its preview;
- width state round-trips through the URL and affects the real responsive container;
- existing journey stage order, keyboard traversal, copy expectations, and accessibility remain intact;
- the index does not mount every complete recipe/source disclosure;
- a synthetic future recipe joins the full gallery without editing page code.

Prefer behavioural tests and exported projection helpers to source-string counts. Keep the existing exact source-authority checks where they still prove one-source generation. Edit only the Compositions-owned browser-check module, not shared `scripts/conformance.ts` orchestration.

### 6. Inspect every pattern visually

Run `deno task serve` on the deterministic worktree port and leave it running. In the in-app browser, open the index and every Composition detail in wide/narrow presets and light/dark. Check visual isolation, responsive behaviour, constituent links, copy source, previous/next movement, deep-link refresh, heading order, and keyboard use. Report exact URLs.

## Wave-3 landing order

Implementation may proceed concurrently, but this branch lands third. Before the final gate, confirm both of these markers are present on `main`:

- `_done/3a-component-discovery-and-comparison.md`;
- `_done/3b-foundations-explorer.md`.

If either is absent, report that 3C is implementation-ready, keep the worktree, and stop for owner-directed resume. Once both are present, call `discern_update`, follow its exact overlap guidance, re-read named files, then prepare, commit, and gate the composed tree.

## Constraints

- Composition status is fixed: illustrative pattern, not exported API or guaranteed copy-paste recipe.
- The preview leads and source/guidance remain progressive disclosure. Less is more.
- One structured recipe definition owns preview, source, constituent membership, journey facts, and projections.
- Keep examples generic; do not introduce Discern product claims, routes, customers, or bespoke consumer artwork.
- Stay within Compositions family files, `catalogue/compositions.tsx`, and Compositions-owned unit/browser tests. Do not edit Components/Compare, Foundations, Terminal, landing/overview, shared shell, or shared conformance-orchestration files.
- Do not perform the muted-text/metadata prominence pass.
- Never hand-edit generated output.
- Commit model/status, routes/gallery, detail interactions, and guards in focused steps.

## Out of scope

- Promoting a Composition to package exports or adding a Composition component family.
- Component example migration or Component detail/Compare redesign.
- CLI complete-layout recipes; 3D owns those.
- Public landing or Overview copy.
- Interface Builder work or dedicated testing.
- A generic visual editor, recipe DSL, or copy-and-install workflow.

## Definition of done

- The Compositions index is a calm gallery and every registered recipe has one bounded, stable detail route.
- The UI consistently says and behaves as though Compositions are illustrative patterns; it makes no exported-API or drop-in-source promise.
- A user can recognise the demonstration first, change its real responsive width, link to constituent Components, inspect/copy adaptable source, and share the route/state.
- Recipe identity, order, membership, preview, source, journey, navigation, and search derive from one structured authority with future-member coverage.
- Every current pattern has been inspected at narrow/wide and light/dark, with exact URLs reported and the server left running.
- No unrelated page family, muted-metadata pass, package API promotion, or Interface Builder work appears in the diff.
- After 3A and 3B have landed, run `discern_update`; after the final edit run `discern_prepare`, commit all changes, then run `discern_done` on clean committed HEAD.
- Once green, run `discern_accept`. A recorded grant may land; otherwise it must refuse without mutation, after which report the proof line and `catalogue-3c` branch/worktree and stop.
- In the final commit, move this brief from `map/_private/planning/catalogue-ux/3c-composition-gallery.md` to `map/_private/planning/catalogue-ux/_done/3c-composition-gallery.md` (create `_done/` if needed).
