# Design polish — selectable implementation workstreams

Implement the owner's 56 approved improvements through 20 self-contained briefs. Preserve the five completed A foundations and leave the 29 explicitly deferred proposals in the canonical [TODO ledger](../../../../discern/TODO.md).

This programme concerns the published design-system library and its Catalogue. It does not modify the discern product or other consumer repositories, dispatch implementation agents, publish a release, or grant landing authority merely by existing.

## How to use the briefs

Open a brief below and give its entire contents to a fresh agent. Each brief contains its own context, exact worktree name, source anchors, ownership, exclusions, deliverables, checks, preview requirements, landing policy, and archival step.

The planning package must land on main before dispatch, so the brief travels into the agent's new worktree. A1–A5 were reported complete by the owner and are present in baseline `a1bd80f3886e`: control sizes, rhythm/type roles, elevation, tone, and a composed Foundations review. Do not rerun that programme. An implementation agent rechecks a finding against current code before changing it.

**Pick any ready brief.** The user explicitly requested independent prioritisation, so the delegation skill's default all-of-wave barrier is replaced here by **named prerequisites only**. `1*` identifies enablers; `2*` identifies feature areas. An unrelated unfinished 1- or 2-series brief never blocks a ready feature. Every workstream lands independently on main; there is no below-trunk stack and no final all-programme gate that holds finished features hostage.

Relative sizes are planning judgments, not elapsed-time promises: S is a bounded surface, M is a component family or route, and L has multiple related interaction or public-contract concerns.

## Brief index and exact coverage

| Key | Brief                                                                                     | Proposal IDs           | Must land first | Size | State    |
| --- | ----------------------------------------------------------------------------------------- | ---------------------- | --------------- | ---- | -------- |
| 1A  | [Publish Segmented control and Progress](1a-segmented-control-and-progress.md)            | R1, R3                 | None            | M    | Prepared |
| 1B  | [Make published copy actions work in static output](1b-static-copy-contract.md)           | Q1                     | None            | M    | Prepared |
| 1C  | [Separate the Catalogue ownership seams](1c-catalogue-ownership-seams.md)                 | Enabling work only     | None            | M    | Prepared |
| 2A  | [Polish buttons and action states](2a-buttons-and-action-states.md)                       | B1, B2, B3, B4, B5     | None            | M    | Prepared |
| 2B  | [Polish form alignment and validation](2b-form-alignment-and-validation.md)               | C1, C2, C4             | None            | M    | Prepared |
| 2C  | [Clarify feedback and state transitions](2c-feedback-and-state-transitions.md)            | D3, D4, D5             | 1A              | M    | Prepared |
| 2D  | [Polish cards, navigation, and identities](2d-cards-navigation-and-identities.md)         | E3, E4, E5             | None            | M    | Prepared |
| 2E  | [Polish sustained reading and article navigation](2e-reading-rhythm-and-navigation.md)    | F1, F2, F4             | None            | M    | Prepared |
| 2F  | [Improve source listing copy and wrapping](2f-code-listing-copy-and-wrap.md)              | F3                     | 1B              | S–M  | Prepared |
| 2G  | [Clarify operational status and evidence](2g-operational-hierarchy-and-evidence.md)       | G1, G2, G3, G4, G5     | 1B              | L    | Prepared |
| 2H  | [Polish marketing composition and content](2h-marketing-composition-and-content.md)       | H1, H2, H3, H5         | None            | M–L  | Prepared |
| 2I  | [Improve chart axis and data hierarchy](2i-chart-hierarchy.md)                            | I2                     | None            | M    | Prepared |
| 2J  | [Improve dense diagram legibility](2j-dense-diagram-legibility.md)                        | I5                     | None            | M    | Prepared |
| 2K  | [Make component discovery faster and preserve context](2k-component-discovery.md)         | J1, J2, J3, J5         | 1A, 1C          | M    | Prepared |
| 2L  | [Make component details useful for adoption](2l-component-detail-playground.md)           | K1, K2, K3, K4, K5     | 1A, 1B, 1C      | L    | Prepared |
| 2M  | [Make comparison genuinely side by side](2m-side-by-side-comparison.md)                   | L1                     | 1C              | S    | Prepared |
| 2N  | [Polish the shell, search, and Appearance controls](2n-shell-search-and-appearance.md)    | M1, M3, M4, P1, P2, P3 | 1C              | L    | Prepared |
| 2O  | [Make glyph discovery useful for adoption](2o-glyph-adoption-and-size-comparison.md)      | N1, N2, N3             | None            | M    | Prepared |
| 2P  | [Polish terminal previews and guided flows](2p-terminal-capabilities-and-guided-flows.md) | O1, O2, O3, O5         | 1A, 1C          | L    | Prepared |
| 2Q  | [Fit compositions to their available space](2q-composition-fit-and-width-controls.md)     | P5                     | None            | S    | Prepared |

The original next-up list contains 54 items; approved additions R1 and R3 bring the implementation total to 56. Each ID has exactly one owning brief. 1C is the only additional infrastructure brief and does not claim any proposal complete.

Completed and omitted from dispatch: **A1, A2, A3, A4, A5**.

Deferred and omitted from these briefs: **R2, R4, R5, C3, C5, D1, D2, E1, E2, F5, H4, I1, I3, I4, J4, L2, L3, L4, L5, M2, M5, N4, N5, O4, P4, Q2, Q3, Q4, Q5**. Their meanings and pickup evidence live in the TODO ledger; R4 consolidates the existing signed-bar/ramp entries, and R5 consolidates the existing Builder document-management entry. Q1 and O5 retain their existing open-defect entries until their implementation briefs resolve them.

## Scheduling and useful starting batches

Ready immediately after this planning package lands: **1A, 1B, 1C, 2A, 2B, 2D, 2E, 2H, 2I, 2J, 2O, 2Q**. The feature briefs with no prerequisites can proceed while any needed enablers are built.

Choose from these short paths according to the consumer that needs attention:

- **Public controls:** 2A and 2B can start together now. 1A supplies the new primitives and unlocks 2C.
- **Static adoption and source:** 1B unlocks 2F and 2G. This is a real behaviour dependency; do not substitute Catalogue-only success for static consumer proof.
- **Catalogue adoption:** run 1A, 1B, and 1C as needed, then choose 2K (discovery) or 2L (detail). 2M (comparison) and 2N (shell/Appearance) need only 1C.
- **Independent specialist polish:** 2H (marketing), 2I (charts), 2J (diagrams), 2O (glyphs), and 2Q (composition sizing) can be picked in any order.
- **Terminal experience:** 1A + 1C unlock 2P, which keeps the shared preview and guided-flow work together.

Expected topology if every brief is eventually dispatched: **20 owner-launched sessions and 20 worktrees**, one per brief, with **zero required sub-agents**. No implementation session or worktree is launched by this planning change. After all three enablers land, the 17 feature streams have no dependency on one another. Available slots, memory, image capture, and the repository's single test-stage slot will set practical concurrency; start with a small batch and increase only if the machine remains responsive. Direct tests use `discern queue --`; every stream still runs its own full gate.

A receiving implementation agent owns its brief only. It must not launch, supervise, or dispatch siblings. The owner retains the ability to select, skip, defer, or reprioritise undispatched briefs.

## Dispatch and dependency records

Default dispatch is **after prerequisites land**. The receiving agent verifies both the predecessor's `_done/` brief on main and the delivered contract, then starts its literal `refine-<key>` worktree. A moved Markdown file alone is not behavioural proof.

If the owner wants to launch dependents in the same sitting as their prerequisites, the coordinating session must first launch the prerequisites with permission, capture each exact `discern_start` worktree id, returned branch and absolute path, and insert those facts into the dependent's dispatch message before sending it. Requested names such as `refine-1a` are **not** selectors and must never be guessed into suffixed branches. Keep the returned branch for post-cleanup lookup. The dependent uses `discern-await-the-fleet` to await **landing**, then follows the met hint to start/update from main. No dependency identity exists yet, so none is fabricated in these saved prompts.

Before a simultaneous batch is dispatched, the coordinating session records its chosen integration order with those returned identities. Default tie-break is ascending key **within the selected batch**, not the full index; omitted workstreams are absent from the order. The first selected ready stream updates first. Later streams run `discern_update` after the previous landing before final regeneration and proof. The owner can reprioritise this order before granting landing; give affected agents the revised exact predecessor facts rather than making them poll or infer readiness. A single individually dispatched brief needs no batch record.

Preparing these briefs is not dispatch permission. Do not launch a coordinator or extra integration task merely because this procedure describes one.

## Authored ownership and Catalogue seams

The split follows the real tree:

| Area                    | Feature owner | Boundary                                                                           |
| ----------------------- | ------------- | ---------------------------------------------------------------------------------- |
| Button/IconButton/Icon  | 2A            | Core action folders                                                                |
| Existing Forms          | 2B            | Field/Input/Select/Textarea/Checkbox/Radio/Switch; new SegmentedControl remains 1A |
| Notices/empty states    | 2C            | Banner, EmptyState, and Callout; Progress remains 1A                               |
| Cards/navigation/people | 2D            | Card/Badge/Tag, Tabs/Breadcrumbs, People                                           |
| Reading/navigation      | 2E            | Prose and article structure, reading blocks, footnotes/TOC/AnchorHeading           |
| Source display          | 2F            | CodeListing/CodeBlock; CopyButton remains 1B                                       |
| Operational information | 2G            | Workflow and Agents                                                                |
| Marketing               | 2H            | Marketing folders and only marketing recipe content if needed                      |
| Quantitative diagrams   | 2I / 2J       | Chart and Diagram families remain separate                                         |
| Component discovery     | 2K            | Explorer, directory cards, and extracted detail navigation                         |
| Component detail        | 2L            | Detail state/specimen, prop controls, and generated usage support                  |
| Comparison              | 2M            | Compare-owned page/layout/state/checks                                             |
| Shell/search/Appearance | 2N            | Shell, shared page chrome/card styles, search, axis controls                       |
| Glyphs                  | 2O            | Glyph routes/workbench/styles; public vocabulary is read-only                      |
| Terminal                | 2P            | CLI preview/lab, typed sequential steps, guided playground                         |
| Composition viewer      | 2Q            | Viewer allocation only; recipe content stays with 2H                               |

1C establishes the few missing authored seams before affected Catalogue streams start:

- `components/explorer-state.ts` and `detail-navigation.tsx` → 2K; `detail-state.ts` and specimen/detail modules → 2L.
- `styles/component-discovery.css` → 2K; `component-detail.css` → 2L; `cli-preview.css` → 2P.
- Route-specific responsive rules move beside their owner. Shared page-scale rules and generic CatalogueIndexCard remain with 2N; route owners use scoped local modifiers.
- Discovery/detail tests and compare checks split without losing public Component population assertions or route auto-enrollment. 1C records the exact resulting runner paths here before its final commit.
- Shared specimen and CLI call shapes stay compatible, so Compare and component detail do not need a forced order.

This is a targeted extraction to avoid collisions. It does not author a second prop schema, new generator architecture, redesigned tokens, or a generic plugin framework.

## Shared integration work — explicit exceptions

The **authored feature slices** are disjoint after their listed prerequisites. Their final commits are not literally file-disjoint: every public Component can affect generated registries, imagery, author-guide evals, and shared documentation/guard entries. Pretending otherwise would hide the main integration risk. To honour the owner's request for selectable independent branches, the plan uses the repository's existing convergence mechanisms and a short serialized landing step rather than putting all public work into one large branch.

- **Codegen owns derived package files.** `[generated.codegen]` and `.gitattributes` already provide regeneration for `src/generated/`, `scripts/generated/`, and the author-skill eval set. Run `discern_update`, re-read named authored overlaps, and regenerate from the merged inputs. Never resolve generated facts by choosing one branch's output.
- **Images need separate care.** Canonical PNGs and `catalogue/generated/example-images-manifest.ts` are tracked, although the ordinary Catalogue registry/build outputs are ignored. The image manifest is outside the generated merge driver. Use the capture command and the update tool's recovery instructions; regenerate after convergence, never hand-merge hashes or pixels. A low-level capture issue is not permission to bless stale images.
- **Companion entries are narrow.** A stream may update only its own README row, brief archive, changelog bullet, map/index link, and exact guard enrollment for its declared paths/capabilities. Preserve all sibling entries. Routine enrollment or link repair is already authorised; new shared behaviour stays with the assigned owner.
- **Finalization is ordered.** Within the selected batch, the recorded first stream updates/generates/proves first; later streams update after its landing, regenerate, and prove the resulting HEAD. Independent authored work can proceed concurrently. A Proof from before an update is not reusable on changed code.

If two chosen briefs actually need the same new authored behaviour, amend their scope before dispatching the second one: either place it with one owner behind a stable boundary or merge those briefs for that batch. Do not quietly duplicate logic or give two agents the same file.

## Landing policy

The owner chose **per-worktree discern grants**: agents may land after the full gate if the owner grants their worktrees permission in the desk. No standing scope grant is added by this plan.

Every brief finishes its edits, regeneration, image evidence, and archival/index changes; runs `discern_prepare`; commits; then runs `discern_done` on the clean HEAD. It calls `discern_accept` using the recorded authority. A missing grant causes a refusal and a Proof handoff, not repeated permission questions or fabricated consent. A grant never approves an unmet checkpoint variance, a standards increase, a push, or a release.

Planning-file acceptance also requires the current planning worktree's own grant or explicit consent. Implementation grants are not retroactive authority for unrelated worktrees.

## Review and completion

I will review returned branches adversarially: read the diff against main, walk every proposal in the owning brief, inspect the actual preview and static/CLI consumer where relevant, check generated convergence, and reproduce the important journeys. A green gate proves the configured checks passed; it does not prove the visual result is good.

Prioritise these failure modes during review:

- repeated A work, incidental global token changes, tiny/faint text, or a theme-specific CSS fork;
- new controls that work only in a live React Catalogue despite promising static HTML;
- code snippets that do not match the displayed configurable specimen;
- copied data that includes gutters or omits distinguishing path information;
- global viewport assumptions inside locally allocated specimens;
- hidden current navigation, swallowed keyboard focus, or reduced motion that removes meaning;
- hand-edited generated output, weak tests, stale images, or an unapproved standard increase;
- implementation of explicitly deferred features disguised as polish.

Each stream archives its own brief into `_done/` and updates only its own index row in the same final implementation commit. Downstream agents re-read the actual landed contract. The programme needs no catch-all implementation stream to make individual results usable.

## Planning audit

- 90 original proposal IDs partition into 5 completed, 56 assigned exactly once, and 29 deferred.
- All 20 briefs are written now, including the eight with named prerequisites.
- Only 1C is additional scheduling infrastructure.
- Existing Q1/O5 TODOs point to their active briefs; R4/R5 preserve the existing backlog intent without duplicate authorities.
- Source anchors were checked against the planning baseline. Future extraction paths are explicitly marked as 1C deliverables, not falsely presented as existing files.
