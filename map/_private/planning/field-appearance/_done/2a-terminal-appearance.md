# 2A — Restore opt-in terminal colour and local appearance

**Goal:** Restore the proven chromatic terminal capability as an explicit Field-or-hue-parameterised-Accent appearance input, keep monochrome byte-for-byte default, and let a presenter, renderer, or composed CLI subtree override appearance or Accent hue in either direction across every supported terminal capability.

**Wave:** 2. Runs beside 2B on disjoint files after 1A lands. 2B lands first; before your final gate, bring its landed work beneath this branch with `discern_update`.

You own `2A` only. Do not launch, dispatch, or supervise 2B or 3A. You may use sub-agents inside this worktree for the four disjoint Component bundles below, after you establish and commit the shared terminal API. Sub-agents edit only their assigned Component folders.

## Orient, verify the prerequisites, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify on `main` that:

- `map/_private/planning/field-appearance/_done/1a-chromatic-field-and-scopes.md` exists;
- the public evaluator can resolve Field and arbitrary Accent hues at both poles, with Blue retained as the hue-255 compatibility preset;
- the scoped web appearance and replacement ADR from 1A are present;
- tag `v0.29.0` resolves locally.

If a prerequisite is absent, stop and report it. Call `discern_start` with the literal name **`appearance-2a`**, re-root every file and shell operation into its returned absolute `data.path`, and pass that path to every later discern tool.

Only after re-rooting, read:

- `AGENTS.md`, the design principles, the field-appearance README, the new 1A ADR and completed brief, ADR 0015 on caller-owned ground sensing, ADR 0032 on terminal series degradation, and ADR 0004 on pure CLI renderers;
- current `src/cli/theme.ts`, `contracts.ts`, `presenter.ts`, `narration.ts`, `block-composition.ts`, `semantic-inline.ts`, `projection.ts`, `motifs.ts`, and `src/cli/interactive/**`;
- `src/chart/**/*.cli.ts`, `src/diagram/**/*.cli.ts`, every Component `*.cli.ts`, and the CLI-only shared helpers at Component group roots;
- `tests/cli/**`, the chart/diagram terminal tests, generated CLI registry, `scripts/catalogue-cli.ts`, and `map/70-cli/README.md`;
- from history, `git show v0.29.0:src/cli/theme.ts`, `git diff v0.29.0..HEAD -- src/cli tests/cli`, and commit `574b75d5`;
- `CHANGELOG.md`, `deno.json`, package export/React-containment tests, and the relevant standards in `discern.toml`.

Use `discern-cure-a-bug`: reproduce the loss at the shared palette authority, prove why renderer-specific edits cannot cure it, then guard the complete class. Do not revert a historical commit wholesale.

## Background

At `v0.29.0`, the terminal theme resolver followed the authored chromatic role tokens, resolved CSS colour/mix values, and quantised every role to truecolour, ANSI 256, and ANSI 16. The renderer and test populations were already broad. The monochrome-field work replaced that resolver with `evaluateOpaqueField({ darkness: 0 | 1 })`; `TerminalThemeVariant` remained only `"light" | "dark"`, so every existing renderer became monochrome without changing its code.

The current tree still has 109 Component CLI renderers and 98 CLI test files; 96 of those tests are unchanged from `v0.29.0`, and only the new Meter renderer changes the Component CLI file population. Treat the tag as behavioural and coverage evidence, not as code to paste back. Wave 1A now supplies a better authority: Field and any Accent hue can be evaluated directly, so the removed CSS parser and static theme table should stay removed.

The owner requires monochrome to remain the package default while consumers can opt into any accent hue globally, for one renderer, or for one composed subtree. Named colours such as Blue are convenience values, not distinct modes or a safe-hue allow-list. The reverse must also work: an Accent terminal surface can neutralise one region, and a nested Accent region can select a different hue.

## Deliverables

### 1. Separate terminal ground from appearance

Introduce one public, additive terminal presentation contract that keeps ground/polarity (`light` or `dark`) independent from appearance. Use the vocabulary and hue contract established by 1A: the type should express Field or Accent with a numeric hue (for example, a discriminated union equivalent to `{ kind: "field" } | { kind: "accent"; hue: number }`), not a Blue boolean or a set of named-colour variants. Preserve existing `theme` callers as the ground input unless a compelling API reason requires a migration; do not encode cross-products such as `"blue-dark"`.

The contract must support:

- the existing call shape with no new option, producing exactly today's monochrome bytes;
- a bound default on `createCliPresenter` and `presenter.with()`;
- an explicit per-render call override that wins over the presenter default;
- an enclosing CLI composition passing its resolved appearance and hue to children, with a child able to override back to Field, Accent, or another Accent hue;
- standalone renderers called directly without a presenter;
- no ambient read, singleton mutation, async context, React context, or other hidden state.

Make shared interfaces such as `CliPresentationOptions` the type authority. Avoid copy-pasting a new property declaration into 109 files without a guard; where Component props cannot structurally extend the shared interface, add a mechanical conformance check that proves the complete rendered population accepts and honours the option.

### 2. Derive palettes from the 1A authority

Extend `src/cli/theme.ts` so one resolver evaluates the requested appearance at the requested pole, produces opaque colours, and computes truecolour, ANSI 256, and ANSI 16 fallbacks through the existing palette authority.

Requirements:

- Field light/dark remains the cached/default palette and is byte-identical to the current tree.
- Accent comes from the 1A TypeScript evaluator for the caller's hue. Do not restore the v0.29 CSS parser, `color-mix()` resolver, or a terminal-only table of RGB values.
- Every metadata-enrolled colour role appears in every palette. A future role cannot silently stay Field when Accent was intended or fall back to hue 255 when another hue was selected.
- Semantic accent/success/warning/danger roles regain chromatic distinction in truecolour and the strongest distinction the finite ANSI palettes permit. Quantised collisions may be accepted only where the existing visible word/glyph witness still makes the state unambiguous and the exact collapse is recorded.
- Series colours keep ADR 0032's independent fixed projection and witnesses.
- No-colour output remains free of SGR/OSC styling and semantically complete.

Prefer a resolver function over exposing another mutable palette registry. Retain compatibility exports such as `terminalThemes.light/dark` as the Field projection if consumers already rely on them; add the chromatic surface without changing what those names mean silently.

### 3. Carry appearance through the complete terminal graph

Migrate every direct `terminalThemes[...]` consumer and every type-only `TerminalThemeVariant` seam so appearance is resolved once and propagated intentionally. Cover:

- all rendered Component CLI modules and their group-level helpers;
- narration, semantic inline text, motifs, presenter verbs, and block composition;
- interactive Activity, sequential forms, Markdown browser state/renderer, and any other Component-backed live frame;
- Markdown, chart, and diagram CLI projections;
- generated CLI examples/registry only through their producer.

Do not change Web props or Component CSS. Do not make terminal capabilities own appearance: capability depth is a terminal fact, while appearance is a caller choice.

### 4. Restore and extend the historical proof

Audit the `v0.29.0` tests before writing new ones. Reuse their coverage shape where it still proves the intended class; adapt expectations to the new chromatic Field projection rather than pinning obsolete static bytes.

Add population-level, palette-authority, and focused guards proving:

- every CLI example renders in Field and representative Accent hues, light and dark, truecolour, ANSI 256, ANSI 16, and no-colour; sample Unicode and ASCII at every semantic family and exercise narrow/standard/wide layouts through the existing test authorities;
- the palette resolver accepts the complete integer hue circle `0…360`, fractional and wrap-boundary cases, and returns the exact 1A role projection before capability quantisation; concentrate collision assertions around success, warning, and danger hues rather than proving only Blue;
- the no-option path is byte-equal to current monochrome exact frames;
- a Field presenter can render one Accent Component/subtree at hue 255 and another at hue 120, then return to Field;
- an Accent presenter at hue 335 can render one Field Component/subtree and one Accent child at hue 245, then return to its inherited hue;
- nested structural Components do not drop or accidentally override the parent's appearance;
- success, warning, danger, and accent emit the expected selected-palette codes at each colour depth while their visible labels/glyphs survive no-colour;
- an invented future renderer that ignores the shared appearance input fails the conformance guard.

Do not weaken exact-frame tests to substring checks or merely assert that an escape sequence exists. The selected semantic role and its capability-specific projection are the evidence.

### 5. Fan-out after the authority is stable

Commit the central API, resolver, and focused proof before fan-out. If sub-agents are available, assign these disjoint Component-folder bundles; if not, do them in sequence:

1. Core + Forms + Feedback + Navigation + Docs;
2. Agents + Workflow;
3. Display + Editorial + People;
4. Layout + Marketing.

Sub-agents edit only `src/components/<assigned-group>/**`, including that group's CLI-only helper files. You own `src/cli/**`, `src/chart/**`, `src/diagram/**`, tests, generated output, records, all commits, integration, and the gate. Review every bundle diff and commit it separately.

### 6. Records and consumer examples

Update `map/70-cli/README.md` in present tense and the Unreleased changelog. Include concise external-consumer examples for:

- default monochrome presenter;
- Accent presenter with an arbitrary numeric hue, plus Blue as a named hue-255 convenience where the public API retains it;
- one Accent render inside Field;
- one Field render and one differently hued Accent render inside Accent;
- explicit ground sensing remaining a caller decision.

Keep public exports documented and package allowlists exact. The neutral and CLI graphs must remain React-free.

## Wave-2 landing order

2B owns only Catalogue files and lands first. Before your final `discern_prepare`, inspect `discern_status`. If 2B has not landed, use the `discern-await-the-fleet` skill and the exact 2B branch/worktree identity shown by the fleet—never guess discern's uniqueness suffix—to wait for its landing. Then call `discern_update`, re-read any semantic overlap it reports, and run the final gate on the composed tree.

## Constraints

- Monochrome is the unchanged default; colour is explicit opt-in.
- Ground and appearance are independent concepts.
- CLI renderers remain pure deterministic functions with no I/O or ambient state. Effects stay in the interactive Adapter.
- The chromatic palette comes from 1A's authority; do not restore a parser or duplicate token table.
- Status meaning never rests on colour. Keep all words, icons, glyphs, and accessible labels.
- Never hand-edit generated files. Commit the shared API, each bundle, focused capability proof, population guard, and records atomically.

## Out of scope

- Any token, chromatic-law, runtime, or browser-scope change from 1A; report a reproducible defect instead.
- All `catalogue/**` files, including previews; 2B and 3A own them.
- Web Component CSS/TSX and canonical imagery.
- Terminal background auto-detection policy, arbitrary user-authored palettes, chart interactivity, or a package release.

## Definition of done

- One public pure input independently selects ground and Field-or-Accent appearance, including any hue in 1A's `0–360` contract.
- All CLI Components, shared primitives, interactive frames, charts, diagrams, and compositions honour it without hidden state.
- Existing no-option calls and exact frames remain monochrome and byte-equal.
- Arbitrary Accent hues restore semantic colour across truecolour, ANSI 256, and ANSI 16, while no-colour and ASCII retain complete witnesses; Blue is proven as one compatibility value, not the whole contract.
- Field inside Accent, Accent inside Field, and a different Accent hue inside Accent work for a direct Component, a bound presenter call, and a nested composition.
- The complete current example population auto-enrols in both appearances and every supported capability depth.
- A real consumer can keep a calm monochrome terminal globally and colour only a high-value status region—or do the reverse—without choosing raw ANSI codes.
- 2B is landed beneath this branch. After the last edit, run `discern_prepare`, commit every resulting change, then run `discern_done` on clean committed HEAD and cure every diagnostic.
- Move this brief to `map/_private/planning/field-appearance/_done/2a-terminal-appearance.md` in the final commit, and update its programme README link to `_done/`.
- Once green, call `discern_accept`. A recorded grant may land; without one it must refuse without mutation. Report the proof line, branch, and worktree and stop for owner review.
