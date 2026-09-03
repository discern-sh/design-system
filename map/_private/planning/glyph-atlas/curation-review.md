# Discern Glyph curation decision record

Status: **accepted and applied**. The owner accepted all nine decisions on 2026-09-03. This record explains the evidence and outcomes; it does not create a public contract or replace the curated authority.

## Review binding

- Reviewed tree: `f5027e55d6807379ce57942e6016925d94be4d0a` on `agent/glyph-atlas-3a-6a6d31`.
- Unicode authority: 17.0.0, as pinned by `GLYPH_ATLAS_UNICODE_VERSION` in `src/glyphs/atlas.ts`.
- Catalogue anchor: `90c6f71c2b337c314020a815b4930d899e847deb` is an ancestor of the reviewed tree. The requested Glyph map, source, Catalogue, and test paths have no changes between that commit and this review.
- Review date: 2026-09-03.
- Population reviewed: all 57 canonical identities and all 23 curated aliases.

`src/glyphs/atlas.ts` remains the data authority. This record repeats enough identity to make each decision auditable at the bound commit, but it is not a dataset and must not be consumed as one. Generated files, snapshots, Catalogue projections, and repetitions of an authority are not counted as independent usage evidence.

## Accepted decision set

| Disposition                     | Aliases                                                                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep unchanged                  | `spark`, `arrow-right`, `arrow-left`, `arrow-up`, `arrow-down`, `status-complete`, `close`, `warning`, `disclosure-right`, `disclosure-down` |
| Rename and narrow               | `information` to `info`; `moon` to `theme-dark`                                                                                              |
| Rename and narrow               | Replace broad `check` with `selection-selected`; keep `status-complete` as the status role                                                   |
| Retain as brand-reserved        | `brand-mark`, without an approved ASCII fallback                                                                                             |
| Defer from the first public set | `arrow-bidirectional`, `shape-circle`, `shape-square`, `shape-diamond`, `shape-star`                                                         |
| Remove as curated aliases       | `outline-small-up`, `keycap-one`, `technologist`, `warning-emoji`; their canonical records remain in the factual Atlas                       |

The accepted future public candidate set therefore contains fourteen names: the ten unchanged names, `info`, `theme-dark`, `selection-selected`, and brand-reserved `brand-mark`. That count is a review outcome, not an export implemented by this effort.

## Evidence method and cross-cutting findings

The review searched authored `src/`, `catalogue/`, and `scripts/` material by exact sequence and semantic role. It excluded `src/glyphs/atlas.ts`, Glyph Catalogue pages and conformance, generated output, snapshots, and tests from usage counts. Tests were read as contract guards, not product demand.

The Catalogue ran at `http://127.0.0.1:18999` on the worktree's deterministic port. Every alias-bearing detail page was inspected in explicit light and dark themes. Each page rendered its exact sequence and the live Display, Body, Mono, and UI stacks. The observations below apply to this browser and its available macOS fonts, not to other platforms.

- All 23 aliases joined to the expected detail page in both themes. The light root rendered black ink on white; the dark root rendered white ink on black. No alias disappeared or became illegible.
- Text glyph metrics vary materially by font role. For example, `⚠︎` measured about 112 px in Display, 108 px in Body/UI, and 67 px in Mono at the preview size. The package's one-cell terminal measurement does not imply equal browser artwork or advance widths.
- `▵` showed the warned fallback risk: about 112 px in Display, 97 px in Body/UI, and 67 px in Mono. Its reference-only guidance is honest, but the canonical record already carries that evidence.
- `◮` used the same roughly 67 px fallback geometry in all four preview roles, supporting the existing instruction to inspect the selected display font.
- `⚠︎` stayed monochrome and `⚠️` rendered as a yellow color emoji. `1️⃣`, `👩‍💻`, and `⚠️` used the same color-emoji face across all four font roles and retained the Atlas's two-cell terminal posture.
- Exact literal search distinguished `⚠`, `⚠︎`, and `⚠️`. Specific consumer terms such as `generate`, `done`, `dark theme`, `dismiss`, `sync`, `favorite`, `favourite`, `developer`, and `milestone` reached the intended identity.
- Broad terms are noisy because search correctly indexes canonical rationale and both recommended and discouraged uses. `info` returned eleven records, `complete` seventeen, and `disclosure` seventeen. Applying the matching category reduced those to one Information identity, one Status identity, and the two Disclosure identities. The names and categories therefore need to do real disambiguation work.

## Alias-by-alias review

### `spark` — keep

- Identity: `✦`, `U+2726`, BLACK FOUR POINTED STAR. Discovery title `Spark`; category `action`; state `recommended`.
- Role boundary: generation, newly produced output, or labelled decorative emphasis. It is not success and must not make an unlabelled AI claim.
- Surfaces: browser supported with font-shape caution; terminal supported as one cell. ASCII `*` is an honest approximation.
- Evidence: Icon CLI uses the same name and `✦ → *` (`src/components/core/icon/icon.cli.ts:22-45`); Banner owns an accent use (`src/components/feedback/banner/banner.tsx:15-20`); Icon Button demonstrates a labelled Generate action (`src/components/core/icon-button/icon-button.cli.ts:35-45`).
- Assessment: the machine name is concise and role-specific enough when the surrounding label owns meaning. No public vocabulary conflict was found.

### `arrow-right` — keep

- Identity: `→`, `U+2192`, RIGHTWARDS ARROW. Discovery title `Right arrow`; category `direction`; state `recommended`.
- Role boundary: rightward navigation, input-to-output relation, and flow. It is not universal Next semantics and needs an owning RTL policy.
- Surfaces: browser supported with contextual mirroring; terminal one cell under narrow-A. ASCII `>` is an approximation and can read as comparison.
- Evidence: Pager owns previous/next arrows (`src/components/docs/pager/pager.cli.ts:69-77`); Slope owns a before/after separator (`src/chart/kinds/slope/slope.cli.ts:96-116`); Branch Choice owns a route relation (`src/components/workflow/branch-choice/branch-choice.cli.ts:94-104`).
- Conflict: Icon CLI publicly calls this glyph `arrow` (`src/components/core/icon/icon.cli.ts:22-45`). That local shorthand should not make the cross-direction name imprecise, and it does not authorize an Icon migration. Keep `arrow-right`.

### `arrow-left` — keep

- Identity: `←`, `U+2190`, LEFTWARDS ARROW. Discovery title `Left arrow`; category `direction`; state `recommended`.
- Role boundary: back navigation, return flow, and explicit leftward direction; an RTL mirroring policy remains caller-owned.
- Surfaces: browser and one-cell terminal supported. ASCII `<` is an approximation that can read as comparison.
- Evidence: Pager uses it specifically for Previous (`src/components/docs/pager/pager.cli.ts:69-77`). Catalogue back links repeat the convention but are not a second owner of the alias.
- Assessment: the name precisely distinguishes direction without claiming a universal action.

### `arrow-up` — keep

- Identity: `↑`, `U+2191`, UPWARDS ARROW. Discovery title `Up arrow`; category `direction`; state `recommended`.
- Role boundary: move-up, upward navigation, or labelled ascending direction; not positive status or an unsupported growth claim.
- Surfaces: browser supported; one-cell terminal under narrow-A. ASCII `^` is an approximation with exponent and shell-syntax ambiguity.
- Evidence: Markdown Browser uses it for hidden content above (`src/cli/interactive/markdown-browser-renderer.ts:318-327`); Fleet uses the same shape for ahead counts (`src/components/agents/fleet/fleet.cli.ts:115`).
- Assessment: the directional name is precise enough; the owning surface supplies movement, scroll, or count meaning.

### `arrow-down` — keep

- Identity: `↓`, `U+2193`, DOWNWARDS ARROW. Discovery title `Down arrow`; category `direction`; state `recommended`.
- Role boundary: move-down, downward navigation, or labelled descending direction; not negative status or an unlabelled download action.
- Surfaces: browser supported; one-cell terminal under narrow-A. ASCII `v` is an approximation without an arrow shaft.
- Evidence: Markdown Browser uses it for hidden content below (`src/cli/interactive/markdown-browser-renderer.ts:318-327`); Fleet uses it for behind counts (`src/components/agents/fleet/fleet.cli.ts:116-118`).
- Assessment: keep distinct from `disclosure-down`; the identities and state grammars differ even though both can degrade to `v`.

### `arrow-bidirectional` — defer from the first public set

- Identity: `↔`, `U+2194`, LEFT RIGHT ARROW. Discovery title `Bidirectional
  arrow`; category `direction`; state `recommended`.
- Role boundary: two-way relationships, exchange, or labelled bidirectional synchronization; not proof that synchronization succeeded.
- Surfaces: browser caution because the scalar is variation-sensitive; terminal width-aware. ASCII `<->` is semantic but intentionally expands one measured cell to three.
- Evidence: no independent authored use of `↔` was found outside Atlas and its projections. Searches for `sync` discover it cleanly.
- Assessment: the role is plausible and the fallback is good, but publishing a name before an authored consumer chooses the exact relationship would harden speculation. Retain the private candidate and mark it deferred.

### `check` — replace with a selection-specific alias

- Identity: `✓`, `U+2713`, CHECK MARK. Discovery title `Check mark`; category `action`; state `recommended`.
- Current boundary is too broad: selected state, confirmed action, and passing result are three roles. The discouraged guidance correctly excludes native checkbox semantics and glyph-only success, but the machine name still describes shape rather than context.
- Surfaces: browser and one-cell terminal supported. Current ASCII `+` is an affirmative approximation.
- Evidence: Checkbox owns selection and uses `✓ → x` (`src/components/forms/checkbox/checkbox.cli.ts:174-182`); Verification Report and Worklog own completion/pass and use `✓ → +` (`src/components/agents/verification-report/verification-report.cli.ts:93-99`, `src/components/agents/worklog/worklog.cli.ts:91-98`). Icon CLI independently exposes `check` with `✓ → v` (`src/components/core/icon/icon.cli.ts:22-45`).
- Assessment: `check` and `status-complete` are conceptually distinct, but the current `check` alias is not. Replace it with one selection-specific name, accepted `selection-selected`, category `selection`, with ASCII `x` and guidance requiring native state or an adjacent label. Do not create an `action-confirm` alias without an authored need.

### `status-complete` — keep

- Identity: `✓`, `U+2713`, CHECK MARK. Discovery title `Complete status`; category `status`; state `recommended`.
- Role boundary: completed workflow or passing verification with visible or accessible status wording; not selection controls or a glyph-only success announcement.
- Surfaces: browser and one-cell terminal supported. ASCII `+` is semantic only because adjacent wording carries completion.
- Evidence: Verification Report, Worklog, Result Summary, Expected Result, and several workflow components independently use `✓ → +` for pass or complete (`src/components/workflow/result-summary/result-summary.cli.ts:30-42`, `src/components/workflow/expected-result/expected-result.cli.ts:54-65`).
- Assessment: sufficiently distinct from a narrowed selection alias. Its name, category, and fallback match real package practice.

### `information` — rename to `info`

- Identity: `ⓘ`, `U+24D8`, CIRCLED LATIN SMALL LETTER I. Discovery title `Information`; category `information`; state `recommended`.
- Role boundary: labelled information action, supplementary details, or note; never an automatic accessible name or critical warning.
- Surfaces: browser and one-cell terminal supported under narrow-A. ASCII `i` is semantic.
- Evidence: Icon CLI already exposes public `info` with `ⓘ → i`, and Icon Button demonstrates the labelled Information action (`src/components/core/icon/icon.cli.ts:22-45`, `src/components/core/icon-button/icon-button.cli.ts:35-47`).
- Assessment: unlike generic `arrow`, `info` is not less precise than `information`. Publishing both spellings for the same glyph would create avoidable vocabulary drift. Rename the future alias to `info`; keep the discovery title `Information`.

### `moon` — rename to `theme-dark`

- Identity: `☾`, `U+263E`, LAST QUARTER MOON. Discovery title `Moon`; category `decoration`; state `recommended`.
- Current boundary mixes night decoration with a dark-theme action. The name describes the shape, not the package's strongest contextual role.
- Surfaces: browser and one-cell terminal supported. Current ASCII `c` is declared lossy and needs a label.
- Evidence: Theme Toggle owns the actual role and uses `☾` as the destination glyph when the current theme is light (`src/components/core/theme-toggle/theme-toggle.tsx:16-38,45-69`). Its CLI renderer uses `o`, not `c`, for the same target (`src/components/core/theme-toggle/theme-toggle.cli.ts:68-81`). Icon CLI uses local name `moon` and `c` independently.
- Assessment: rename to `theme-dark`, discovery title `Dark theme`, and add an `appearance` category. Use ASCII `D` with semantic fidelity and require the localized action label. The alias must describe the target theme, not claim current state. Decorative night use does not justify a public alias.

### `close` — keep

- Identity: `×`, `U+00D7`, MULTIPLICATION SIGN. Discovery title `Close`; category `action`; state `recommended`.
- Role boundary: labelled dismiss, remove-chip, or clear-value actions; not multiplication, failure status, or an unlabelled destructive action.
- Surfaces: browser and one-cell terminal supported under narrow-A. ASCII `x` is an honest approximation.
- Evidence: Dialog and Toast own labelled close controls; Tag owns remove affordance; Icon CLI exposes `close` with `× → x`. Catalogue navigation also uses the mark but is not package demand (`catalogue/shell/navigation.tsx:93-100`).
- Assessment: the contextual name successfully separates the action from the Unicode identity. The same character's danger, cancellation, and arithmetic owners remain independent.

### `warning` — keep the explicit text variation

- Identity: `⚠︎`, `U+26A0 U+FE0E`, WARNING SIGN with VS15. Discovery title `Warning`; category `status`; state `recommended`.
- Role boundary: warning status, risk callout, or attention marker with text; not danger/failure and not a glyph-only announcement.
- Surfaces: browser caution because VS15 requests rather than guarantees artwork; terminal one cell. ASCII `!` is semantic beside condition wording.
- Evidence: package message and workflow grammars consistently use `!` for warning in ASCII and often Unicode, so the fallback has real semantic support (`src/components/feedback/banner/banner.tsx:15-20`, `src/components/workflow/activity-log/activity-log.tsx:31-36`). The exact VS15 sequence has no independent owner yet.
- Rendering: this browser showed a monochrome outline in all font roles, sharply distinct from the colored two-cell VS16 emoji.
- Assessment: the exact text sequence and honest caution make this ready.

### `disclosure-right` — keep

- Identity: `▸`, `U+25B8`, BLACK RIGHT-POINTING SMALL TRIANGLE. Discovery title `Collapsed disclosure`; category `disclosure`; state `recommended`.
- Role boundary: collapsed disclosure or forward tree branch; not media play or unlabelled Next navigation.
- Surfaces: browser and one-cell terminal supported. ASCII `>` is semantic beside the disclosure label.
- Evidence: Builder Layers uses `▸` only when a labelled branch is collapsed (`catalogue/builder/tree/layers.tsx:162-171`); Activity Log separately owns the same character as a note marker (`src/components/workflow/activity-log/activity-log.tsx:31-36`).
- Assessment: keep distinct from `arrow-right`. Different identity, compact geometry, and explicit state semantics outweigh their shared ASCII fallback.

### `disclosure-down` — keep

- Identity: `▾`, `U+25BE`, BLACK DOWN-POINTING SMALL TRIANGLE. Discovery title `Expanded disclosure`; category `disclosure`; state `recommended`.
- Role boundary: expanded disclosure or open tree branch; not download or unlabelled descending sort.
- Surfaces: browser and one-cell terminal supported. ASCII `v` is semantic beside the disclosure label.
- Evidence: Builder Layers pairs it with the expanded labelled state (`catalogue/builder/tree/layers.tsx:162-171`); the triangle authority owns its geometry independently (`src/cli/triangles.ts:45-65`).
- Assessment: contextual name and state pairing are precise.

### `brand-mark` — retain as brand-reserved, remove ASCII approval

- Identity: `◮`, `U+25EE`, UP-POINTING TRIANGLE WITH RIGHT HALF BLACK. Discovery title `Discern brand mark`; category `brand`; state `brand-reserved`.
- Role boundary: Discern logo treatment and ceremonial brand register only; not a generic bullet, routine status, or consumer identity.
- Surfaces: browser caution and one-cell Unicode terminal support. Current ASCII `>` is declared lossy.
- Evidence: the Catalogue shell visibly wears the mark (`catalogue/shell/navigation.tsx:72-85`); the terminal motif owns the formal brand register and independently degrades it to `>` (`src/cli/motif.ts:322-365`).
- Assessment: retain the alias and reservation. Do not approve `>` as a public resolution fallback: it carries no Discern identity and can be mistaken for direction. The curation model needs an honest Unicode-supported/no-approved- ASCII posture rather than forcing every supported terminal alias to return a fallback.

### `shape-circle` — defer from the first public set

- Identity: `●`, `U+25CF`, BLACK CIRCLE. Discovery title `Filled circle`; category `shape`; state `recommended`.
- Role boundary currently combines legend marker, point marker, and neutral bullet while excluding record and sole selection semantics.
- Surfaces: browser and one-cell terminal supported under narrow-A. ASCII `o` is an unfilled approximation.
- Evidence: Chart Series owns `● → o`; Avatar owns online presence; Agent Avatar owns working status; Data Figure owns a legend default (`src/cli/glyph-ramps.ts:79-92`, `src/components/people/avatar/avatar.cli.ts:51-63`, `src/components/agents/agent-avatar/agent-avatar.tsx:20-25`, `src/components/editorial/data-figure/data-figure.cli.ts:136-150`).
- Assessment: evidence is abundant but every use has an independent semantic owner. A generic shape export would add little beyond the canonical Atlas until a consumer needs glyph selection outside those grammars.

### `shape-square` — defer from the first public set

- Identity: `■`, `U+25A0`, BLACK SQUARE. Discovery title `Filled square`; category `shape`; state `recommended`.
- Role boundary combines legend/category marker and geometric bullet while excluding checkbox and unlabelled Stop semantics.
- Surfaces: browser and one-cell terminal supported under narrow-A. ASCII `#` is a dense approximation.
- Evidence: Chart Series owns `■ → #`; Avatar owns busy presence (`src/cli/glyph-ramps.ts:79-92`, `src/components/people/avatar/avatar.cli.ts:51-63`).
- Assessment: defer for the same ownership reason as circle. The fallback is useful inside a declared series grammar, not yet proven as a generic public glyph policy.

### `shape-diamond` — defer from the first public set

- Identity: `◆`, `U+25C6`, BLACK DIAMOND. Discovery title `Filled diamond`; category `shape`; state `recommended`.
- Role boundary combines milestone, categorical marker, and bullet while excluding unexplained decision and brand semantics.
- Surfaces: browser and one-cell terminal supported under narrow-A. ASCII `*` is an approximation that loses diamond identity.
- Evidence: Chart Series owns `◆ → *`; Logo Cloud independently owns the same pairing as a list mark (`src/cli/glyph-ramps.ts:79-92`, `src/components/marketing/logo-cloud/logo-cloud.cli.ts:70-83`).
- Assessment: defer. The current fallback is an in-grammar distinguishing cue, not a general semantic fallback.

### `shape-star` — defer from the first public set

- Identity: `★`, `U+2605`, BLACK STAR. Discovery title `Filled star`; category `shape`; state `recommended`.
- Current boundary combines favourite, featured, and categorical-series roles. Those roles disagree about ASCII degradation.
- Surfaces: browser and one-cell terminal supported under narrow-A. Current ASCII `x` is correctly declared lossy and preserves only series distinction.
- Evidence: Chart Series owns `★ → x`; Audience Grid owns `★ → *` for Featured; Builder Palette owns filled/unfilled favourite state (`src/cli/glyph-ramps.ts:79-92`, `src/components/marketing/audience-grid/audience-grid.cli.ts:82-96`, `catalogue/builder/discovery/palette.tsx:258-268`).
- Assessment: defer and do not ratify `x` as a generic fallback. A later public need should split contextual aliases such as favourite or featured from a series marker; `*` may then be semantic for those roles but would collide with the current diamond series fallback.

### `outline-small-up` — remove as a curated alias

- Identity: `▵`, `U+25B5`, WHITE UP-POINTING SMALL TRIANGLE. Discovery title `Small outline up triangle`; category `shape`; state `reference-only`.
- Uses are font inspection and reference comparison; product geometry and width-critical controls are discouraged. Browser and terminal are both reference-only and no ASCII fallback is declared.
- Evidence: Triangle owns the complete outline-small family and explicitly warns that fallback fonts can render it at full proportional size (`src/cli/triangles.ts:45-65`). Catalogue Terminal Foundations uses it only in a review fixture.
- Assessment: the name merely rephrases canonical geometry. The Atlas record, font previews, and `font-fallback-risk` hazard retain all package value.

### `keycap-one` — remove as a curated alias

- Identity: `1️⃣`, `U+0031 U+FE0F U+20E3`, keycap: 1. Discovery title `Keycap
  one`; category `workflow`; state `reference-only`.
- Uses are sequence and emoji inspection; compact steps and width-critical terminals are discouraged. Both surfaces are reference-only; no fallback.
- Evidence: no independent authored use was found. The browser showed consistent color-emoji fallback across all four font roles and the Atlas measures two cells.
- Assessment: official identity, exact literal search, sequence facts, and hazards already supply the reference value. It is not a package glyph role.

### `technologist` — remove as a curated alias

- Identity: `👩‍💻`, `U+1F469 U+200D U+1F4BB`, woman technologist. Discovery title `Woman technologist`; category `people`; state `reference-only`.
- Uses are ZWJ and emoji inspection; generic user/agent identity, automatic labelling, and width-critical terminal use are discouraged. Both surfaces are reference-only; no fallback.
- Evidence: no independent authored use was found. The exact sequence remained one grapheme and two measured terminal cells in the live Catalogue.
- Assessment: the official sequence label and canonical search already carry the factual value. A curated public name would create identity and localization pressure with no package use.

### `warning-emoji` — remove as a curated alias

- Identity: `⚠️`, `U+26A0 U+FE0F`, WARNING SIGN with VS16. Discovery title `Warning emoji presentation`; category `status`; state `reference-only`.
- Uses are presentation comparison and reference detail; compact or one-cell warning use is discouraged. Both surfaces are reference-only; no fallback.
- Evidence: no exact-sequence authored use was found. The live browser showed colored emoji artwork in every font preview and the Atlas measures two terminal cells.
- Assessment: the canonical variation-sequence page and exact search preserve the comparison. `warning` should be the only curated product role, bound to explicit text presentation.

## Accepted fallback policy

| Alias or group                                                                          | Outcome                                                 | Reason                                                                                                                              |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `spark`, directional arrows, `status-complete`, `info`, `close`, `warning`, disclosures | Keep current fallbacks and fidelity                     | They match authored practice and their contextual guidance remains honest.                                                          |
| Selection replacement for `check`                                                       | `x`, semantic only in native/labelled selection context | Checkbox supplies direct evidence; `+` belongs to completion and `v` can read as Down.                                              |
| `theme-dark`                                                                            | Change `c` lossy to `D` semantic                        | The future name should preserve the target role rather than imitate a crescent.                                                     |
| `brand-mark`                                                                            | No approved ASCII fallback                              | `>` is direction, not Discern identity; represent Unicode support without forcing fallback.                                         |
| `arrow-bidirectional`                                                                   | Retain `<->` semantic while deferred                    | It preserves two-way direction and honestly opts into width-aware layout.                                                           |
| Four shape aliases                                                                      | Do not ratify a public fallback while deferred          | Their current fallbacks are useful inside independent series grammars, not generic semantics; star demonstrably needs a role split. |
| Four removed reference aliases                                                          | No fallback                                             | Canonical Atlas records remain reference data, not supported product glyphs.                                                        |

The fidelity words—`semantic`, `approximation`, and `lossy`—remain useful. The terminal model now uses `unicode-only` when Unicode is supported but no ASCII fallback is approved; it does not fabricate identity-preserving ASCII.

## Category, recommendation, and publication vocabulary

- Category `selection` owns `selection-selected`; it is neither an action nor a status result.
- Category `appearance` owns `theme-dark`; `decoration` understates the controlled theme role.
- Keep `recommended`, `reference-only`, and `brand-reserved` as use postures. They should not be overloaded to encode public-contract review.
- The curation authority carries the orthogonal private publication dispositions `candidate` and `deferred`. Removed reference aliases need no disposition because their canonical records remain. This lets a future `./glyphs` design enumerate only owner-approved candidates without treating every internally recommended alias as approved for publication.

## Prospective publication boundary

### Options

| Concern                  | 1. Curated aliases and resolution metadata                                                                                                                   | 2. Aliases plus full canonical Atlas                                                                                                                                      | 3. Catalogue-only                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| API stability            | Protects the intended product names, exact text, fallback availability, recommendation, and guidance while leaving research fields private.                  | Makes all canonical IDs, source-property fields, schema choices, provenance, and record membership public API.                                                            | No package API to stabilize, but consumers keep copying literals and policy.   |
| Unicode upgrades         | A reviewed update can change private facts while a public alias changes only through SemVer review.                                                          | Any corrected property, source shape, or record removal creates compatibility pressure even when product glyphs are unchanged.                                            | Catalogue can update freely, but there is no supported resolver for consumers. |
| Package size             | Smallest useful opt-in entry. At this commit raw alias JSON is about 20,316 bytes before selecting the first set; a purpose-built projection can be smaller. | Raw canonical JSON is about 56,030 bytes in addition to alias data and code. Enumeration tends to retain the table. These are source-data proxies, not bundle guarantees. | Zero package bytes.                                                            |
| React neutrality         | A neutral `./glyphs` module can be imported by browser or terminal code; React composition remains in `./react`.                                             | Also possible, but the larger factual graph becomes an application dependency.                                                                                            | Preserved, with no package capability.                                         |
| Browser and terminal use | Exposes exactly the resolved text, optional approved fallback, and surface guidance a component needs.                                                       | Exposes useful facts but encourages consumers to infer meaning or fallback from Unicode properties, the separation ADR explicitly rejects.                                | Consumers read the Catalogue manually and may drift.                           |
| Tree-shaking             | A dedicated entrypoint isolates the feature; name enumeration necessarily retains the approved map, while unrelated package entries remain untouched.        | Full enumeration retains both layers and makes per-record tree-shaking unreliable.                                                                                        | Not applicable.                                                                |
| Accessibility            | Can state once that discovery titles are not labels and return no automatic accessible-name field.                                                           | Canonical labels create stronger pressure to misuse official Unicode names as UI labels.                                                                                  | Catalogue explains the rule, but copied implementations may omit it.           |
| Migration pressure       | Does not imply migration of Icon, motif, triangles, charts, or local grammars.                                                                               | Makes Atlas records look like a universal registry and raises pressure to consolidate independent owners.                                                                 | Avoids migration now but offers no stable path away from copied policy.        |

### Decision

Option 1 is accepted: a future package boundary publishes only owner-approved curated names and a purpose-built, React-free resolution projection; complete canonical Atlas records remain private and Catalogue-visible. This boundary supplies the product contract consumers need without making Unicode research schema and membership SemVer commitments. Option 2 overturns the separation principle without a consumer need. Option 3 leaves real repeated package usage without a supported neutral vocabulary.

ADR-0044 records this hard-to-reverse publication boundary. This effort does not add `./glyphs` or any export.

### Non-binding ergonomics sketch

Names below are illustrative. The future export must derive enumeration, resolution, and metadata from one approved authority rather than maintain parallel lists.

```tsx
import {
  discernGlyphNames,
  resolveDiscernGlyph,
} from "@discern-sh/design-system/glyphs";
import { Icon } from "@discern-sh/design-system/react";

// Enumeration contains only owner-approved public candidates.
for (const name of discernGlyphNames) {
  const glyph = resolveDiscernGlyph(name);
  console.log(name, glyph.text);
}

const complete = resolveDiscernGlyph("status-complete");
complete.text; // "✓"
complete.terminal.asciiFallback?.text; // "+" when approved
complete.recommendation;
complete.surfaces.browser;
complete.surfaces.terminal;

// Visible wording owns meaning, so Icon stays decorative.
<p>
  <Icon>{complete.text}</Icon> Build complete
</p>;

// If the glyph alone conveys meaning, the caller supplies a localized label.
<Icon label="Build complete">{complete.text}</Icon>;

// `complete.discoveryTitle` is never passed to `label` automatically.
```

The resolver should return exact Unicode text rather than ask consumers to reconstruct it from code points. ASCII fallback is optional because absence is part of the approved contract. The neutral module must not import React; the existing `Icon` wrapper merely receives resolved text as children.

## Owner decision

The owner approved the complete decision set without amendments on 2026-09-03. The curated authority applies the accepted names, categories, fallbacks, and publication dispositions. The canonical Atlas population and every independent Icon, motif, triangle, chart-ramp, and local glyph authority remain unchanged.

## Live review URLs

- Explorer: <http://127.0.0.1:18999/catalogue/glyphs/>
- Accepted `selection-selected`: <http://127.0.0.1:18999/catalogue/glyphs/u-2713/>
- Accepted `info`: <http://127.0.0.1:18999/catalogue/glyphs/u-24d8/>
- Accepted `theme-dark`: <http://127.0.0.1:18999/catalogue/glyphs/u-263e/>
- Defer `arrow-bidirectional`: <http://127.0.0.1:18999/catalogue/glyphs/u-2194/>
- Defer shapes: <http://127.0.0.1:18999/catalogue/glyphs/u-25cf/>, <http://127.0.0.1:18999/catalogue/glyphs/u-25a0/>, <http://127.0.0.1:18999/catalogue/glyphs/u-25c6/>, <http://127.0.0.1:18999/catalogue/glyphs/u-2605/>
- Remove reference-only aliases: <http://127.0.0.1:18999/catalogue/glyphs/u-25b5/>, <http://127.0.0.1:18999/catalogue/glyphs/u-31-fe0f-20e3/>, <http://127.0.0.1:18999/catalogue/glyphs/u-1f469-200d-1f4bb/>, <http://127.0.0.1:18999/catalogue/glyphs/u-26a0-fe0f/>
- Brand fallback decision: <http://127.0.0.1:18999/catalogue/glyphs/u-25ee/>
- Text variation: <http://127.0.0.1:18999/catalogue/glyphs/u-26a0-fe0e/>
- Emoji variation: <http://127.0.0.1:18999/catalogue/glyphs/u-26a0-fe0f/>
- Multi-code-point ZWJ sequence: <http://127.0.0.1:18999/catalogue/glyphs/u-1f469-200d-1f4bb/>

The server must remain running while the owner reviews these pages.
