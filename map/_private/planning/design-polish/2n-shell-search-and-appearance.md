# 2N — Polish the shell, search, and Appearance controls

The Catalogue stays easy to navigate on small screens and lets people find content and adjust Appearance with predictable, accessible controls.

**Proposal coverage:** M1, M3, M4, P1, P2, P3. **Worktree name:** `refine-2n`. **Relative size:** L. **Programme:** design-polish.

Other streams are in flight. You own `2N` only; do not launch, dispatch, or supervise the sibling briefs.

## Orient, satisfy prerequisites, then re-root

Start with `discern_status` at `/Users/jack/Sites/discern-design-system`. If this exact effort already has a worktree, continue at its recorded path; never create a second one or adopt a sibling's idle checkout.

- 1C: Separate the Catalogue ownership seams. Verify `map/_private/planning/design-polish/_done/1c-catalogue-ownership-seams.md` on main **and** the delivered contract described in that brief.

This is an independently landed workstream, not a below-trunk stack. The numbers in this programme are dependency tiers: only the prerequisites above block you. Do not wait for unrelated lower-key briefs. These prompts are ready for dispatch after their named prerequisites land. If dispatched early, use the `discern-await-the-fleet` skill and the predecessor's **exact returned identity and branch**, captured by the dispatching session, to await its landing. Never guess a suffixed branch from `refine-1a` or another requested name. If that identity is missing or ambiguous, report the missing dispatch record and do not start dependent implementation.

Once ready, call `discern_start` from the main checkout with the literal name `refine-2n`, then re-root all reads, edits, commands, and discern calls to its returned absolute path. Follow the await tool's start/update hint if applicable. Read the worktree's `AGENTS.md`, `map/00-orientation/design-principles.md`, and this brief there before source work. Verify every anchor against the live tree; 1C intentionally moves some Catalogue anchors.

## Background and outcome

Appearance is already a continuous token-derived model with URL/storage state, and global search consumes route-family records. The current shell shares desktop/mobile and appearance styling, so these improvements intentionally stay in one workstream.

The owner completed A1–A5 on main, with baseline commit `a1bd80f3886e`: shared control sizes, rhythm/type roles, quieter elevation, tonal hierarchy, and composed Foundation review. Preserve that work and judge current behaviour before repeating a correction. This repository is the public library and its Catalogue; the discern tool and sibling consumer projects are outside this brief.

## Read the authorities

- `catalogue/shell/`
- `catalogue/search/`
- `catalogue/styles/shell.css`
- `catalogue/styles/shared.css`
- `catalogue/styles/responsive.css`
- `catalogue/pages/foundations/appearance-page.tsx`
- `src/components/docs/search-palette/`
- `tests/catalogue_search_test.ts`
- `tests/catalogue_appearance_options_test.ts`
- `scripts/conformance/catalogue/shell.ts`
- `scripts/conformance/catalogue/appearance.ts`

## Deliverables

- **M1.** Offer a small curated set of readable Appearance starting points, including comfortable reading and dense tools. Each is ordinary existing coordinates with one authority and a clear return/reset path; never introduce theme-specific component CSS or another colour model.

- **M3.** Make the Appearance popover close predictably on Escape and appropriate outside interaction, return focus to its trigger, and remain reachable on short screens. Preserve nested control interaction, native semantics, shared floating-surface rules, and URL/storage behaviour.

- **M4.** Add labelled exact numeric axis entry and per-axis reset beside or integrated with current sliders. Reuse the same parser/bounds/default authority. Handle empty and invalid intermediate input without snapping unexpectedly; make parameter names and units understandable without mathematical shorthand alone.

- **P1.** Compose a compact mobile toolbar with adequate search/menu/appearance targets. Suppress desktop shortcut decoration where it displaces essential content. Test narrow portrait, short landscape, zoom, drawer open, and Appearance open.

- **P2.** Improve global search with clear result-family grouping, representative visual cues, and a small local recent-destination set. Reuse the route records, match explanations, and valid destinations; handle unavailable storage and stale history. Keep keyboard selection/announcements predictable and performance bounded.

- **P3.** Make secondary sidebar groups collapsible while keeping the current location visible and the primary route hierarchy clear. Preserve shared desktop/mobile semantics, expansion state where useful, and reliable focus when a drawer or group closes.

## Ownership and exclusions

You own:

- Catalogue shell/search modules, shell-owned shared/page-scale styles after 1C, and shell/appearance/search checks.
- Appearance foundation-page preset presentation only where it consumes the same axis-control authority.
- Docs SearchPalette only if a generally useful, additive rendering contract is necessary; not other Docs Components.

Out of scope: M2 specimen-only Appearance and M5 token-impact mapping, P4 bundle splitting, component-directory filters, comparison/layouts, Builder redesign, and token/palette retuning. All proposals deferred to `discern/TODO.md` stay deferred. Do not opportunistically implement a sibling brief.

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

- Mobile shell, drawer, search, and Appearance complete real keyboard/touch journeys at narrow/short viewports without hidden focused content.
- Presets, sliders, exact values, reset, URL round trips, Back/Forward, system theme, and unavailable storage share the existing state authority.
- Search grouping/recent results remain valid, named, keyboard-operable, and derived from route facts; collapsed navigation always exposes the current destination.

- The semantic bar is the goal at the top of this brief: demonstrate the real user task, not only isolated snapshots or passing selectors. Record what changed, why, tested widths/states, and any remaining limitation.
- Extend focused tests in the allocated area and authored conformance/postures where meaningful. Run direct tests through `discern queue -- <command>`; the repository admits one complete test run at a time. Avoid a redundant full test preflight before `discern_done`.
- After all edits and any integration update, run `discern_prepare`, commit logical changes atomically, then run `discern_done` on the clean final HEAD. Re-run on a changed HEAD; an earlier Proof does not cover new edits.
- Leave the Catalogue running at the worktree's deterministic `discern identity --port` port and report exact localhost URLs. Preview evidence: Mobile and desktop shell URLs, a search/recent journey, and precise Appearance preset/axis URLs. Include `?surface=cli#component-<slug>` links for changed CLI renderers, and the live playground when an interactive adapter flow changes.
- **Landing rule chosen by the owner:** use discern grants. After green `discern_done`, call `discern_accept` without inventing confirmation. A recorded desk grant may land this worktree; without a grant the verb refuses, so report the exact Proof, branch, worktree, preview, and any owner decision, then stop. Never push or publish. A grant does not waive standards or an unmet checkpoint variance.
- Return the branch/worktree identity for an adversarial review against this brief. The planning agent will inspect the diff and reproduce the important journeys; gate success alone is not a visual review.
- In the final implementation commit, before the final prepare → commit → done sequence, move `map/_private/planning/design-polish/2n-shell-search-and-appearance.md` to `map/_private/planning/design-polish/_done/2n-shell-search-and-appearance.md`, repair any moved relative links, and update **only this stream's row** in the programme README to the `_done/` path and completed state, preserving every sibling row.
