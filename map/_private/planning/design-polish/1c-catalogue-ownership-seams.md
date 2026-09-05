# 1C — Separate the Catalogue ownership seams

Discovery, component detail, comparison, shell, glyphs, and terminal work can change their own authored files without competing for the same page, stylesheet, or test body.

**Proposal coverage:** Scheduling foundation; no proposal ID is counted as delivered here. **Worktree name:** `refine-1c`. **Relative size:** M. **Programme:** design-polish.

Other streams are in flight. You own `1C` only; do not launch, dispatch, or supervise the sibling briefs.

## Orient, satisfy prerequisites, then re-root

Start with `discern_status` at `/Users/jack/Sites/discern-design-system`. If this exact effort already has a worktree, continue at its recorded path; never create a second one or adopt a sibling's idle checkout.

No feature prerequisite. This planning package must be committed on main before dispatch. A1–A5 are already the baseline.

This is an independently landed workstream, not a below-trunk stack. The numbers in this programme are dependency tiers: only the prerequisites above block you. Do not wait for unrelated lower-key briefs. These prompts are ready for dispatch after their named prerequisites land. If dispatched early, use the `discern-await-the-fleet` skill and the predecessor's **exact returned identity and branch**, captured by the dispatching session, to await its landing. Never guess a suffixed branch from `refine-1a` or another requested name. If that identity is missing or ambiguous, report the missing dispatch record and do not start dependent implementation.

Once ready, call `discern_start` from the main checkout with the literal name `refine-1c`, then re-root all reads, edits, commands, and discern calls to its returned absolute path. Follow the await tool's start/update hint if applicable. Read the worktree's `AGENTS.md`, `map/00-orientation/design-principles.md`, and this brief there before source work. Verify every anchor against the live tree; 1C intentionally moves some Catalogue anchors.

## Background and outcome

The requested independent scheduling is currently constrained by mixed ownership in components/state.ts, components.css, shared.css, responsive.css, and the large components browser check. This is a small behaviour-preserving preparation, not another visual-foundations project.

The owner completed A1–A5 on main, with baseline commit `a1bd80f3886e`: shared control sizes, rhythm/type roles, quieter elevation, tonal hierarchy, and composed Foundation review. Preserve that work and judge current behaviour before repeating a correction. This repository is the public library and its Catalogue; the discern tool and sibling consumer projects are outside this brief.

## Read the authorities

- `catalogue/pages/components/state.ts`
- `catalogue/pages/components/detail-page.tsx`
- `catalogue/pages/components/component-preview.tsx`
- `catalogue/pages/shared.tsx`
- `catalogue/styles/shared.css`
- `catalogue/styles/components.css`
- `catalogue/styles/responsive.css`
- `catalogue/catalogue.css`
- `scripts/conformance/catalogue/components.ts`
- `scripts/conformance/catalogue/browser-check-plan.ts`
- `tests/catalogue_components_test.ts`

## Deliverables

- **State and navigation.** Split explorer state from detail selection state into catalogue/pages/components/explorer-state.ts and detail-state.ts. Extract the existing detail back/previous/next navigation to detail-navigation.tsx, preserving its initial behaviour and a stable call boundary. 2K will own explorer state and navigation; 2L will own detail state and its specimen. A re-export at the old module is acceptable only when a real remaining consumer justifies it.

- **Styles.** Move, rather than duplicate, route-owned declarations into catalogue/styles/component-discovery.css and component-detail.css; move CLI preview rules into cli-preview.css. Keep generic CatalogueIndexCard and shell chrome with the shell owner. Move route-specific responsive rules beside their owning styles; retain shared page-scale rules with shell. Enrol imports once in catalogue/catalogue.css and preserve cascade order, focus treatment, themes, and geometry. Future routes may add a scoped modifier in their own sheet; they do not fork the shared card.

- **Checks.** Split catalogue component tests into discovery and detail owners, and extract comparison browser checks to a compare-owned module. Keep the public Component population conformance runner separate from Catalogue page checks. Preserve assertion coverage and future route enrollment. Small imported runner modules are appropriate; a new plugin framework is not. Name the exact resulting runner files in the ownership record so downstream agents verify the live anchors.

- **Boundaries.** Keep ComponentSpecimen, ComponentSurfaceControl, and CLI preview call shapes compatible for existing consumers. Do not build K1/K2 snippets or prop controls here. Update only the still-unstarted briefs' anchor/ownership lines if an unavoidable extraction name differs; do not change their scope.

## Ownership and exclusions

You own:

- The named private Catalogue page/state/style/test extractions and their import sites; no package Component or token changes.
- Exact browser-runner/coverage and dogfooding guard enrollments needed by the moved files.
- A short ownership record in this programme README's Catalogue seams section and a map/60-catalogue leaf if the boundary changes its navigation guidance.

Out of scope: Any selected visual feature, new public API, token changes, generated-source architecture, search ranking changes, Builder redesign, and Q3/Q4 review infrastructure. All proposals deferred to `discern/TODO.md` stay deferred. Do not opportunistically implement a sibling brief.

Required companion edits are allocated to this stream: its own Unreleased changelog bullet for public contract/byte changes; its own map leaf and exact index link when needed; its own brief and programme-index row; exact enrollments in existing guards for paths/capabilities already declared above; and generated output from the owning commands. Preserve sibling entries. These routine enrollments, regenerations, conflict resolutions, and moved-link repairs need no second permission exchange. Keep new shared behaviour and contract decisions with their assigned owner; the deliverables in this brief are already authorised.

Authored feature files stay with their owner. Shared derived files and the narrow companion entries are an explicit integration exception, not disjoint authored work: `src/generated/`, `scripts/generated/`, and the author-skill evals use the configured generator/merge regeneration. The tracked `catalogue/generated/example-images-manifest.ts` and PNGs also come only from the image command and are not covered by that merge driver. Never hand-merge their facts or pixels. Coordinate the short landing turn, call `discern_update`, follow its conflict recovery, and regenerate from the complete merged authored tree. If an image conflict blocks importing its manifest, recover a parseable generator input through the printed remedy and regenerate before committing; neither side alone is a finished resolution.

## Implementation constraints

- Keep namespaced/scoped output, deterministic selected emission, React-free neutral/CLI graphs, and the build-time React contract. Native browser semantics are the default; selected behaviour must be explicit and justified.
- Use existing Appearance, control-size, type, spacing, motion, and semantic roles. Themes move tokens; do not retune the shared foundations under a local polish brief. Keep the interface-text floor, density target floor, status witnesses, forced-colour focus, and reduced-motion meaning.
- Preserve public names and canonical example identities unless an explicit, documented contract change is necessary. Generic examples belong here; product claims, routes, and bespoke consumer artwork do not.
- Use `discern-cure-a-bug` for a demonstrated defect and leave a practical regression guard at the authority that owns its class. Use `add-a-component` for new Components and `discern-write-adr` for surprising/hard-to-reverse decisions.
- Do not hand-edit generated registries, manifests, or images. Run `deno task codegen` for affected authored package facts and `deno task catalogue:images --update` when canonical Web output changes. Reuse the existing review instrument rather than inventing a screenshot gate.
- Never loosen a standard or assert an unmet checkpoint is met. Return a measured, concrete owner decision if the finished minimal design cannot satisfy a limit.

## Verification and definition of done

- Before/after checks demonstrate unchanged routes, URL parsing, default selected examples, rendered semantics, screenshots/geometry, and keyboard journeys.
- Every moved check still runs through the same gate; no assertion is dropped or weakened, and no empty future-use scaffolding remains.
- The resulting ownership map shows no overlapping authored feature files among 2K–2Q, apart from explicitly serialized import/guard/index companion entries.

- The semantic bar is the goal at the top of this brief: demonstrate the real user task, not only isolated snapshots or passing selectors. Record what changed, why, tested widths/states, and any remaining limitation.
- Extend focused tests in the allocated area and authored conformance/postures where meaningful. Run direct tests through `discern queue -- <command>`; the repository admits one complete test run at a time. Avoid a redundant full test preflight before `discern_done`.
- After all edits and any integration update, run `discern_prepare`, commit logical changes atomically, then run `discern_done` on the clean final HEAD. Re-run on a changed HEAD; an earlier Proof does not cover new edits.
- Leave the Catalogue running at the worktree's deterministic `discern identity --port` port and report exact localhost URLs. Preview evidence: Existing Components, Compare, Glyphs, Terminal, and mobile shell routes demonstrating unchanged behaviour. Include `?surface=cli#component-<slug>` links for changed CLI renderers, and the live playground when an interactive adapter flow changes.
- **Landing rule chosen by the owner:** use discern grants. After green `discern_done`, call `discern_accept` without inventing confirmation. A recorded desk grant may land this worktree; without a grant the verb refuses, so report the exact Proof, branch, worktree, preview, and any owner decision, then stop. Never push or publish. A grant does not waive standards or an unmet checkpoint variance.
- Return the branch/worktree identity for an adversarial review against this brief. The planning agent will inspect the diff and reproduce the important journeys; gate success alone is not a visual review.
- In the final implementation commit, before the final prepare → commit → done sequence, move `map/_private/planning/design-polish/1c-catalogue-ownership-seams.md` to `map/_private/planning/design-polish/_done/1c-catalogue-ownership-seams.md`, repair any moved relative links, and update **only this stream's row** in the programme README to the `_done/` path and completed state, preserving every sibling row.
