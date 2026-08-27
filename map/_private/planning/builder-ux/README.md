# Interface Builder UX programme

Briefs for turning the Beta Interface Builder from a technically capable tree editor into a visual composition tool people can understand by sight, trust at responsive widths, and use often enough to become part of their ordinary design-system workflow.

The programme follows a full real-browser authoring review. The underlying model, validation, autosave, cost projection, generated TSX, runtime selection, undo/redo, and conformance coverage are strong. The friction sits at the human boundary:

- a palette click silently changes meaning with selection and can place a Button inside Button;
- “390px” narrows a `<div>` while the browser viewport remains wide, so viewport media queries do not fire; “1200px” can render at about 860px while retaining its 1200px label;
- the canvas is intentionally inert, so Tabs, disclosure, dialog, tooltip, and callback-driven behaviour cannot be experienced;
- 139 Components form a roughly 22,747px palette whose live previews are often blank or generic;
- slot picking inherits unrelated purpose/search filters, the Outline disappears beneath long prop forms, and focus/status/validation treatments compete visually;
- browser autosave, file download, validation, clipboard, and export are individually implemented but do not form one legible trust model.

Every brief is a self-contained prompt for a fresh agent. This is an independently landed programme, not a below-trunk stack. Briefs in a shared wave run concurrently in separate worktrees over disjoint files, then land in key order. A later stream calls `discern_update`, re-reads any overlap discern names, and runs its final gate against the composed trunk.

## Shared Catalogue prerequisites

Builder implementation starts only after these shared Catalogue UX contracts have landed:

1. `catalogue-ux/_done/1a-catalogue-architecture-and-shell.md` — universal pure search authority plus the landed Appearance state/control decision;
2. `catalogue-ux/_done/2a-cross-surface-example-contract.md` — canonical Component example identity;
3. `catalogue-ux/_done/3a-deterministic-component-example-images.md` — reusable exact-bounds example imagery and representative-image resolution.

The Builder architecture stream can then run alongside Catalogue page waves 4–5 because it owns only `catalogue/builder/**` and Builder-specific tests. Builder's final integration stream waits for `catalogue-ux/_done/5a-integrated-visual-qa.md` as well as its own wave 2, then composes the final shared search and Appearance authorities before the last proof.

## Fixed programme contracts

Change one only through a justified programme amendment, and use an ADR when the choice is architectural or hard to reverse.

| Fact               | Contract                                                                                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product goal       | A person can start from a useful pattern, understand where additions will land, directly shape the visible composition, test its real responsive and interactive behaviour, and inspect/export trustworthy source without learning the document model.                    |
| Authoring viewport | Desktop-class Builder authoring is the product scope. Do not optimise the workspace for meaningful phone authoring. Narrow/zoom accessibility and existing conformance remain intact, while 390/768/1200 controls test the composition itself truthfully.                 |
| Preview truth      | A width label names an exact logical browser viewport, including viewport media queries. The preview may scale visually to fit, but never silently cap or substitute container width for viewport width.                                                                  |
| Safety boundary    | Builder documents remain inert data under ADR 0027. Edit mode is inert and selection-oriented. Interact mode may run design-system-owned behaviour and visible callback witnesses in a same-origin isolated frame, but never document-supplied code.                      |
| Placement          | The next insertion target is always visible before placement. Generic palette actions cannot silently change from “after” to “inside” based only on selection. Invalid interactive/structural nesting is prevented before history, preview, and export.                   |
| Structure          | Layers/Outline is a permanent independently scrollable authoring surface, not the footer of a variable-length prop form. Pointer and keyboard users can select and reorder the same tree without drag being the only precise route.                                       |
| Search             | Builder discovery consumes the universal search normalisation, aliases, scoring, ordering, and match-reason contract from Catalogue 1A. It owns palette UI and contextual compatibility filters, not a second matcher or synonym list.                                    |
| Imagery            | Palette and template discovery consume generated canonical Component example images from Catalogue 3A. No hand-authored thumbnails, live-mount wall, per-page representative list, or Builder-only capture pipeline is allowed.                                           |
| Appearance         | Editor focus/selection/insertion chrome uses stable editor-only semantics. Preview Theme/accent uses the final shared Appearance state/control decision from Catalogue 5A; the Builder does not recreate or assume the old primary accent slider.                         |
| Persistence        | Accepted documents autosave locally and expose truthful Saving/Saved/Unavailable state. “Download builder JSON” and “Import builder JSON” are explicit file operations. Multiple named local drafts and wider file-management strategy are deferred to `discern/TODO.md`. |
| Feedback           | Selection announcements, ephemeral action completion, persistent validation, storage failures, and export readiness have distinct lifecycles and visual weight. A corrected error cannot remain globally stale.                                                           |
| Templates/defaults | Templates and Builder seed values are generic, registry-validated, and Builder-owned. They do not alter public Component defaults, claim exported API status, or introduce product/customer copy.                                                                         |
| Export             | TSX, runtime selection, and JSON remain deterministic and source-backed. Users can inspect them before copy/download, see generated naming, receive clipboard failure feedback, and cannot export a structurally invalid composition.                                     |
| Public boundary    | The Builder remains Catalogue-only Beta software. Its JSON document and templates do not become public hosted APIs or enter the JSR publish set.                                                                                                                          |

## Waves and dispatch order

| Key | Brief                                                                                                            | Parallel shape                                                 | Starts when                                      | Landing order               |
| --- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------ | --------------------------- |
| 1A  | [Create Builder ownership seams and interaction architecture](1a-builder-architecture-and-interaction-seams.md)  | One architecture worktree                                      | Catalogue shared prerequisites 1A–3A have landed | Only stream in wave 1       |
| 2A  | [Make preview widths and interaction truthful](2a-preview-viewport-and-interaction.md)                           | One preview worktree                                           | Builder 1A has landed                            | First in wave 2             |
| 2B  | [Make placement explicit and Layers structural](2b-placement-validity-and-layers.md)                             | One tree-authoring worktree                                    | Builder 1A has landed                            | Second in wave 2            |
| 2C  | [Make discovery visual, searchable, and useful from the first placement](2c-discovery-templates-and-defaults.md) | One discovery worktree                                         | Builder 1A has landed                            | Third in wave 2             |
| 2D  | [Humanise the inspector, feedback, persistence, and export](2d-inspector-feedback-and-export.md)                 | One inspector/trust worktree                                   | Builder 1A has landed                            | Fourth in wave 2            |
| 3A  | [Run the integrated Builder authoring and browser hardening pass](3a-integrated-builder-qa.md)                   | One adversarial browser worktree; read-only audits may fan out | Builder 2A–2D and Catalogue 5A have landed       | Final implementation stream |

Wave 1 preserves behaviour while splitting the current 2,208-line `catalogue/builder/app.tsx`, 987-line `builder.css`, and 1,339-line `scripts/builder-conformance.ts` into feature-owned modules, styles, tests, and browser checks. It also establishes typed protocols between preview, tree, discovery, and inspector surfaces. Without this seam, four “parallel” feature agents would merely edit different regions of the same files.

Wave 2 is the four-way feature fan-out. Implementations run concurrently and land in key order (`2A` → `2B` → `2C` → `2D`). Each later branch waits for the preceding completion markers before its final `discern_update`, prepare, commit, and proof; it does not wait to begin implementation.

Wave 3 composes the final workspace and audits the real human journeys. It is the sole owner of cross-feature Builder conformance orchestration and present-tense Builder map updates. It does not reopen the file-management strategy deferred to TODO.

## File ownership seams

Wave 1 verifies and materialises these boundaries against the live tree. They are ownership contracts, not permission to create needless abstractions.

| Stream | Primary ownership                                                                                                                                                                                                            | Explicitly leaves alone                                                                                        |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1A     | `catalogue/builder/app.tsx`, Builder workspace/shell modules, `builder.css` entrypoint, feature style split, typed feature contracts, Builder conformance split/orchestration seams, behaviour-preserving architecture tests | Feature redesign, shared Catalogue search/Appearance/image authorities, public Components                      |
| 2A     | `catalogue/builder/preview/**`, preview-frame side of `render.tsx`, preview protocol, `styles/preview.css`, preview unit/browser checks                                                                                      | Tree placement/model, palette/templates, inspector/persistence/export, shared search/Appearance implementation |
| 2B     | `catalogue/builder/tree/**`, `model.ts`, `placement.ts`, `history.ts`, tree compatibility authority, `styles/layers.css`, placement/model/history unit/browser checks                                                        | Preview frame, palette/search/templates, inspector forms/export/persistence                                    |
| 2C     | `catalogue/builder/discovery/**`, discovery-side registry projection, Builder templates/default seeds, `styles/discovery.css`, discovery/template unit/browser checks                                                        | Universal search internals, generated image production, tree mutation internals, inspector/export/persistence  |
| 2D     | `catalogue/builder/inspector/**`, control-side registry projection, `controls.ts`, `fields.tsx`, `object-editor.ts`, `persistence.ts`, `export.ts`, `cost.ts`, `styles/inspector.css`, trust/inspector unit/browser checks   | Preview protocol, tree placement rules, palette/templates, shared Catalogue authorities                        |
| 3A     | Final Builder workspace composition/shared fixes, `scripts/builder-conformance.ts` orchestration, Builder integration tests, `map/60-catalogue/interface-builder.md`                                                         | New feature families, named-draft/file manager, Catalogue page redesign, package release                       |

Wave 1 must split `registry-index.ts` into a stable registry core plus distinct discovery and control projections, and split browser conformance so wave-2 streams do not share those files. It must not leave all state mutation in `app.tsx` behind a new set of one-caller wrappers.

## Acceptance matrix

The integrated Builder must let a person complete these tasks without knowing its document paths or insertion heuristics:

| Task                | Expected outcome                                                                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start meaningfully  | Choose a generic starter pattern or blank canvas, recognise its contents visually, and understand whether it is illustrative Builder data rather than package API.                      |
| Find by intent      | Search “call to action” and find CTA Band with an understandable match reason; switch between visual/compact palette density and use recent/favourite choices without a second matcher. |
| Place deliberately  | See the exact page/slot/before/after target before placement, add an action to Hero, and never create Button-inside-Button or another invalid structural tree.                          |
| Navigate structure  | Keep Layers visible while editing a long Hero or structured Tabs value; select, move, wrap, duplicate, and undo through pointer or keyboard without losing context.                     |
| Edit visually       | Select the visible slot intended, edit text directly where practical, understand effective defaults, and reach Advanced JSON only when needed.                                          |
| Test responsiveness | Select 390, 768, or 1200 and get that exact logical viewport—including matching media queries—at a clearly shown zoom/fit level.                                                        |
| Test behaviour      | Switch from Edit to Interact, activate Tabs/disclosures safely, observe callback witnesses, and return to Edit without mutating or executing document code.                             |
| Recover from error  | Enter invalid additional JSON, receive a human path plus technical detail, correct it, and see every error clear while the last accepted preview/export remains stable.                 |
| Trust persistence   | See local Saving/Saved/Unavailable state, distinguish autosave from Download/Import JSON, reload safely, and receive actionable recovery if storage fails.                              |
| Inspect and export  | Review syntax-highlighted TSX/runtime/JSON, see generated function/file naming and preflight, copy or download with explicit success/failure, and understand CSS/behaviour cost.        |

## Landing authority

Every independently landed stream stops for owner review unless discern records a grant. After `discern_done` passes on the final committed tree, the agent runs `discern_accept`. A standing or per-worktree grant may land it; without one, the verb refuses without mutation and the agent reports the proof line plus branch/worktree. Prose in these briefs is never landing authority.

This planning package must land before `builder-1a` is dispatched because each implementation stream moves its own committed brief into `_done/` in its final commit.

## Adversarial review loop

When a stream reports green, review its branch diff against `main`, walk every deliverable and semantic acceptance task, rerun the gate in its worktree, and open its exact Builder preview URL. Before dispatching the next wave, amend any unstarted brief whose anchors or API assumptions changed.

Look especially for:

- an iframe that looks narrow but does not own the matching viewport/media-query environment;
- an Interact mode that weakens inert-document policy, follows links, or invents silent no-op callbacks;
- selection-dependent insertion surviving behind a new label, or compatibility rules that guard one Button instance rather than the whole invalid-nesting class;
- “Layers” remaining below the prop form or drag remaining the only precise reorder path;
- a Builder-only search normaliser/synonym list, manually selected thumbnails, or live preview population hidden behind CSS;
- templates duplicating public Component facts or presenting illustrative data as exported API;
- inspector labels mechanically title-casing TypeScript while retaining `readonly X[]` and document paths as primary language;
- autosave, download, and export messages that remain visually stale or imply safety they cannot prove;
- editor chrome still inheriting the consumer accent, or a duplicate accent slider ignoring the landed Appearance decision;
- a final QA pass that spends its effort designing phone authoring instead of testing the composition's responsive widths;
- generated files hand-edited, tests loosened, or hard-to-reverse preview/security choices made without an ADR.

After Builder 3A lands and passes adversarial review, the Interface Builder is ready for sustained owner use. Named drafts and wider file management remain a deliberate follow-up rather than hidden scope in this programme.
