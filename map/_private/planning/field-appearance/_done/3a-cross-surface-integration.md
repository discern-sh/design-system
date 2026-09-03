# 3A — Integrate, prove, and capture both surfaces

**Goal:** Make the Catalogue, conformance suite, generated evidence, docs, and component-authoring workflow present one Field-or-hue-parameterised-Accent appearance contract across browser and terminal, then regenerate canonical imagery once on the settled system.

**Wave:** 3. Runs alone after 2A and 2B have both landed. This is the final package stream and the only stream that owns cross-surface integration and canonical imagery.

You own `3A` only. Do not launch, dispatch, or supervise earlier briefs or the deferred monochrome-field 4A. Do not redesign the chromatic curves or terminal API that have landed; report a reproducible upstream defect if their public contracts cannot support integration.

## Orient, verify the prerequisites, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify on `main` that:

- `map/_private/planning/field-appearance/_done/1a-chromatic-field-and-scopes.md`, `_done/2a-terminal-appearance.md`, and `_done/2b-catalogue-appearance.md` all exist;
- Field/Accent browser scopes work in both nesting directions and one Accent scope can select a different hue inside another;
- the CLI public API renders Field by default and arbitrary Accent hues by explicit opt-in at every capability depth;
- every Catalogue route exposes the global Field controls and retains axes while switching appearance;
- the tree and canonical imagery are clean before this stream begins.

If a prerequisite is absent, stop and report it. Call `discern_start` with the literal name **`appearance-3a`**, re-root every file and shell operation into its returned absolute `data.path`, and pass that path to every later discern tool.

Only after re-rooting, read:

- `AGENTS.md`, design principles, the field-appearance README, the replacement ADR, and all three completed field-appearance briefs;
- current public browser and terminal appearance APIs, their maps, tests, and changelog entries;
- `catalogue/app.tsx`, `cli-preview.tsx`, `cli-compositions.ts`, `terminal-theme.ts`, `terminal-foundations.ts`, `terminal-foundation-preview.tsx`, `terminal-layout-inspector.tsx`, `markdown-browser-example.ts`, and every page that accepts `terminalTheme`/`TerminalThemeVariant`;
- Component detail/preview, Compare, Compositions, Foundations terminal sheet, Terminal lab/playground, review instrument, Builder preview, and example capture paths;
- `scripts/conformance/catalogue/**`, `scripts/conformance.ts`, `scripts/component-example-images.ts`, the capture contract/task, and `map/60-catalogue/visual-review.md`;
- `discern/skills/add-a-component/SKILL.md` as the authored skill source, `map/20-components/README.md`, `map/70-cli/README.md`, `CHANGELOG.md`, and the generated-file groups/standards/checkpoints in `discern.toml`.

Use the in-app browser and review instrument throughout. Use `discern-cure-a-bug` for any dropped-appearance propagation class. If the integration reveals a hard-to-reverse choice not covered by the replacement ADR, use `discern-write-adr` rather than deciding silently.

## Background

Wave 1A made Accent a hue-parameterised chromatic projection of the field, retained Blue as the hue-255 compatibility preset, and published symmetric browser scopes. Wave 2A restored explicit terminal colour and local hue/appearance overrides while preserving monochrome defaults. Wave 2B made appearance, hue, and axes orthogonal and exposed the Field/Accent controls globally in the Catalogue. Their ownership boundaries deliberately left one seam for this stream: the Catalogue's CLI previews still know only a light/dark ground and have not been connected to the new appearance choice.

The integration must not merely make the screenshot that prompted this work look coloured. Every Component example, composition, terminal foundation, and interactive inspection surface must receive the same selected appearance by one route; a future CLI renderer must auto-enrol. This stream also owns the only canonical image regeneration so the repository records the final Button, semantic, Avatar, and chromatic-field results once rather than churning images between architectural stages.

## Deliverables

### 1. Bind Catalogue appearance to every CLI preview

Replace Catalogue-only `TerminalThemeVariant` plumbing with the public terminal appearance input from 2A wherever the Catalogue renders terminal output. Carry the global appearance selection through:

- Component detail Web/CLI switch and every canonical CLI example;
- Compare and Compositions pages;
- Foundations terminal specimens and both Field poles;
- Terminal family pages, layout inspector, Markdown browser example, and CLI playground journeys represented inside the Catalogue;
- review/Builder surfaces that render CLI output, if any.

Ground remains light/dark and follows the Catalogue's resolved native scheme. For an arbitrary Darkness point, use the existing/public polarity and hysteresis authority to choose the honest terminal ground; terminals do not pretend to render an unknown translucent physical background. Appearance is Field or Accent with the selected numeric hue and remains independent of ground. Named choices such as Blue are presentation conveniences over that number, not branches in the adapter.

One adapter may translate Catalogue state to the terminal public input. Do not repeat that translation per page or infer it from DOM colours.

### 2. Demonstrate and prove local terminal scoping

Add a focused Catalogue inspection that mirrors the browser scope demo:

- Accent CLI Component/composition at hue 255 inside a Field-default presentation;
- Field CLI Component/composition inside an Accent-default presentation at hue 120;
- Accent CLI Component/composition at hue 335 inside an Accent-default presentation at hue 245.

Use real status-bearing Components with visible witnesses, not raw ANSI sample strings. Make the local override discoverable without turning every Component page into a separate appearance editor; the global control remains the ordinary path, and the focused diagnostic demonstrates the exception.

At `colorDepth: "none"`, both postures must reduce to equivalent semantic text and glyphs. At truecolour, ANSI 256, and ANSI 16, projected styles must match the 2A palette authority exactly.

### 3. Add one cross-surface conformance contract

Extend the existing generated population/browser plan rather than maintaining a hand-list. The conformance run must prove:

- every rendered CLI Component example accepts the current Catalogue appearance and ground;
- representative semantic Components show chromatic accent, success, warning, and danger under multiple named and unnamed Accent hues while Field remains achromatic;
- changing global appearance updates both Web and CLI forms of the same Component without changing its semantic example identity;
- named shortcuts and arbitrary numeric hues—including an unnamed fractional value—reach Web and CLI as the same hue; no adapter substitutes hue 255 or a nearest admitted name;
- changing Darkness/Emphasis changes Accent Web roles continuously for the selected hue, while CLI uses the resolved pole and same selected hue intentionally;
- Field → Accent → Field, Accent → Field → Accent, and Accent(hue A) → Accent(hue B) work in browser scopes, and presenter/subtree overrides work in the analogous terminal composition;
- Button action inversion/shadow separation and Avatar opacity hold in the actual browser examples at every required point;
- all status witnesses survive Field, arbitrary Accent hues, forced colours, no-colour, Unicode, and ASCII;
- a synthetic future Component/CLI renderer that drops appearance fails the population guard.

Keep numerical proofs at the authority and integration proofs at the use site. Do not duplicate the 1A chromatic arithmetic or 2A ANSI quantisation in Catalogue tests.

### 4. Review the full experience

Run the family browser plan and review instrument at:

- light and dark poles in Field and Accent at representative hues 0, 120, 255, and 335, plus the semantic-collision neighbourhoods identified by 1A;
- the signed 0A points, including density 0.8/structure 0.35 and density 1.2/structure 1.4;
- both nested browser scope directions;
- both terminal override directions at truecolour, ANSI 256, ANSI 16, no-colour, Unicode, and ASCII;
- narrow, medium, and wide Catalogue layouts, keyboard-only, high zoom, reduced motion, and forced colours.

Judge the system, not isolated swatches: primary actions must read as primary and keep a visible hard shadow; semantic colour must accelerate scanning but never carry meaning alone; overlapping Avatars must stay legible; floating surfaces must remain stable; axes must visibly reach edges, gaps, and state strengths in either appearance.

Record any genuine upstream defect with the smallest reproduction. Fix only integration defects in this stream; do not compensate for a broken authority with Catalogue overrides.

### 5. Teach future Components the completed contract

Update the authored `discern/skills/add-a-component/SKILL.md`, then run `discern_refresh` so generated agent skill copies follow their source. A new Component must be born knowing:

- browser appearance is inherited from the public scope; Component CSS never branches or adds an appearance prop;
- primary actions use the action pair and its derived edge/shadow roles;
- owned identity/floating surfaces use opaque roles;
- a rendered CLI Component accepts the shared terminal presentation contract, defaults to Field, honours bound/local Field/Accent and local-hue overrides, and never chooses raw ANSI colours;
- its examples auto-enrol in cross-appearance and capability conformance;
- state still requires a non-colour witness.

Update component, token, Catalogue, and CLI map pages only where the final reader model has changed. Keep them present-tense and link authorities rather than restating generated populations.

### 6. Reconcile public records

Read every Unreleased entry added by 1A and 2A as one consumer story. Remove duplication, retain all public API/migration facts, and record:

- Accent's change from a Blue-only static pair to a full-domain hue-parameterised Field projection, including Blue's retained hue-255 compatibility spelling;
- symmetric browser appearance scopes;
- restored opt-in terminal colour and local overrides with monochrome default;
- primary shadow and Avatar surface corrections;
- global Catalogue controls and cross-surface preview behaviour.

Do not bump a package version or publish a release.

### 7. Regenerate canonical imagery once

After all code, CSS, controls, records, and browser review are settled, run the existing canonical capture authority exactly once in update mode. Do not edit, crop, optimise, select, or replace images or their manifest by hand. Review the generated diff for expected Button, semantic, Avatar, and broadly field-driven changes; investigate any unrelated churn through the capture source/settling authority before committing.

Commit generated imagery separately so reviewers can inspect it as evidence. Run the verify mode afterward; do not run update again merely because the diff is large.

## Constraints

- Consume the landed browser and terminal authorities; no Catalogue-private palette, chromatic arithmetic, ANSI mapping, or role list.
- Monochrome remains the default in emitted runtime and terminal calls.
- No Component-specific Field/Accent or hue workaround.
- Never hand-edit generated files or imagery. Edit the authored skill source, then refresh.
- Preserve neutral/CLI React containment, deterministic emission, exact example identity, and all standards.
- Commit atomically: terminal Catalogue adapter, preview propagation, local scope demo, cross-surface conformance, authored skill/maps/changelog, imagery.

## Out of scope

- New chromatic curves, token role names, terminal palette API redesign, new Components, chart interactivity, or a free-form theme generator.
- Changes to the sibling `/Users/jack/Sites/discern` repository or dispatch of monochrome-field 4A.
- Version bump, tag, package publication, or site adoption.

## Definition of done

- One Catalogue appearance/hue selection drives every Web and CLI preview through their public authorities; no terminal page is stranded in monochrome or hue 255 when another Accent hue is selected.
- Browser and terminal local overrides work in both directions and are demonstrated with real Components.
- Generated population conformance covers appearance, poles/capability depths, witnesses, action shadow, and Avatar opacity without hand-enumerating the current 140 Components.
- The global Appearance controls, detailed Field instrument, Builder, review instrument, and terminal surfaces agree on state and semantics.
- The authored add-component skill, maps, ADR references, and Unreleased changelog describe the final contract.
- Canonical imagery was regenerated once through its authority, reviewed, and verifies cleanly.
- A human can compare Web and CLI forms of a Component, move through the field, opt a whole surface or one region into/out of colour, and retain predictable density, structure, accessibility, and semantic witnesses.
- Leave the Catalogue watcher running on the deterministic worktree port and report direct URLs for the Field instrument, Button, Badge/status, Avatar group, a CLI semantic Component, and the local-scope diagnostic.
- After the last edit and the single image update, run `discern_prepare`, commit every resulting change, then run `discern_done` on clean committed HEAD and cure every diagnostic without loosening a guard.
- Move this brief to `map/_private/planning/field-appearance/_done/3a-cross-surface-integration.md` and update its programme README link to `_done/` in the final commit.
- Once green, call `discern_accept`. A recorded grant may land; without one it must refuse without mutation. Report the proof line, branch, worktree, and review URLs and stop for owner review.
