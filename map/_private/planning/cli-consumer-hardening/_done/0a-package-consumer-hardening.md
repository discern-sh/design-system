# 0A — Close the two consumer contract gaps

**Status:** complete — release 0.12.1 prepared for the owner-run publication checkpoint.

**Goal:** Make the released design-system CLI safe for its flagship Discern consumer by adding first-class semantic headings to interactive choice lists and an opt-in lossless identity mode to Fleet, then prepare a patch release without publishing it.

**Wave:** 0 — solo in the design-system repository. It precedes the owner-run package release checkpoint and every Discern adoption stream.

## Orient first

Work in `/Users/jack/Sites/discern-design-system`. Run `discern_status` and read the compiled `AGENTS.md`, `map/00-orientation/`, `map/70-cli/`, the CLI programme ADRs, and the release map. If status records an existing worktree for this exact effort, continue there and pass its path to every discern tool; do not call `discern_start` again. Otherwise, from the design-system main checkout run `discern_start` with the literal name `cli-consumer-0a` and work only in the returned worktree.

Verify the live trunk before editing. This brief expects the 0.11.0 CLI release or a later equivalent: `./cli` and `./cli/interactive` resolve, real form renderers back the prompt machines, Fleet has a rendered CLI stance, the generated CLI registry is complete, `cli_pending` is zero, and the browser/terminal catalogues exist. If any of those programme surfaces is absent, stop and report the missing landing rather than rebuilding it here.

Read the current package APIs and tests, especially:

- `src/cli/interactive/types.ts`, `choice-navigation.ts`, `choice-prompts.ts`, `discovery-prompts.ts`, and the shared interactive frame states;
- the Select, Checkbox, and Radio CLI renderers under `src/components/forms/`;
- `src/components/agents/fleet/fleet.cli.ts` and its framework-neutral types;
- the fake-terminal harness, exact-frame tests, generated export surfaces, CLI catalogue, package manifests, README, CHANGELOG, and `map/70-cli/`.

The consumer evidence is in `/Users/jack/Sites/discern`: ADR 0250 requires every populated prompt group to have a visible heading, while ADR 0255 requires exact branch and worktree identities to remain copyable. Read those records; do not edit the Discern repository from this worktree.

## Why this is package work

Discern currently uses Cliffy separators to distinguish task buckets, actions, navigation, docs regions, scripts, and improvement choices. Modelling one of those headings as a disabled value would add misleading `(disabled)` copy, force a sentinel through generic value types, and make navigation semantics depend on a consumer convention. A non-selectable labelled entry is reusable prompt vocabulary and belongs beside the package's choice state machines and Component frames.

Fleet has a related generic requirement. Its wide table truncates branch text. Truncation is a reasonable default catalogue treatment, but operational consumers sometimes require lossless, copyable identities. They need an explicit package mode rather than a local reimplementation of the Fleet frame.

## Deliverables

Work in atomic commits, one logical step each.

1. **Add a typed non-selectable choice entry.** Introduce a public discriminated entry type for a semantic group heading or separator and a public union accepted by the relevant choice prompts. Keep ordinary `PromptChoice<T>` source-compatible. A heading carries a stable id and non-empty label, never a `T` value and never a fake value cast. Give the names careful API treatment: this is semantic grouping, not arbitrary decoration.

2. **Make every state machine understand the union.** Select and multiselect navigation, Home/End, viewport calculation, initial highlighting, toggle-all, submission, and returned values must skip headings by construction. Search results use the same entry vocabulary if the live API can support it without a second model; otherwise document and test the narrower boundary explicitly. Reject duplicate/invalid ids, control characters, an empty heading label, and a list with no selectable choice where the prompt contract requires one. Scrolling a long grouped list must not strand the highlight on a heading or omit the heading that gives a visible choice its meaning.

3. **Render headings as design-system structure.** Extend the shared interactive frame state and the Select, Checkbox, and Radio CLI renderers so headings are visually distinct, non-selectable, and free of the `(disabled)` suffix. Derive the treatment from the package's section-rule/triangle and Token authorities rather than copying a glyph or ANSI literal. Preserve meaning under no colour and ASCII, respect narrow widths, and keep every choice label/control-byte validation intact. Disabled selectable choices remain a different state and still say they are disabled.

4. **Prove the entire interaction class.** Add pure navigation tests, exact frame tests, and fake-terminal journeys for grouped single-select, grouped multiselect, long scrolling lists, disabled values beside headings, all navigation keys already promised by the adapter, toggle-all, cancellation, validation, and submitted frames. Assert that result arrays contain only caller values in caller order. Add a type-level or compile fixture proving a heading requires no `T` sentinel and existing choice-only call sites still compile.

5. **Add an opt-in lossless Fleet identity contract.** Extend `FleetCliProps` with a clearly named, backward-compatible policy that preserves complete operational identities. In that mode, `persona` and `branch` values that cannot fit the wide cells must appear somewhere in the frame untruncated and copyable; switch the affected row to a stacked treatment or emit a labelled full-identity continuation rather than relying on terminal auto-wrap. Preserve the current compact default, width cap, semantic status, drift, metadata, and activity beacon. Test ordinary, narrow, wide, long Unicode, long ASCII, no-colour, and ASCII cases. A copied identity must equal the input exactly after ANSI is stripped.

6. **Enrol generated and catalogue surfaces.** Export the new public types through `./cli` and/or `./cli/interactive` from the existing generated authority. Add deterministic grouped-prompt and lossless-Fleet examples to the CLI and browser catalogues using package registries/example data, never hand-maintained catalogue-only literals. Run Codegen rather than editing `src/generated/` or `styleguide/generated/`.

7. **Prepare the patch contract.** Add a tight CHANGELOG entry, update README usage where a consumer needs to discover the two options, and refresh `map/70-cli/` plus any relevant ADR notes in present tense. Bump `deno.json` and `package.json` in lockstep from 0.11.0 to 0.11.1 unless trunk has already moved, in which case use the next available patch. Do not publish to JSR and do not create the GitHub release; the owner runs the repository's `release` skill after landing.

8. **Review the existing promises.** Run the full CLI catalogue in colour, `NO_COLOR`, and ASCII/`TERM=dumb` modes; inspect grouped examples and long Fleet identities. Confirm the pure `./cli` graph remains React- and I/O-free, the optional interactive graph owns all effects, and no Component stance or renderer registry has drifted.

## Constraints

- This is a design-system change only. Do not edit `/Users/jack/Sites/discern`, simulate its product state in package code, or add Discern-specific words such as worktree buckets or lifecycle actions to generic props.
- Preserve public source compatibility. A heading is additive entry vocabulary; it does not turn an existing disabled choice into a new meaning or change the value returned by an existing prompt.
- Reuse the package's Token, triangle, text, frame, and fake-terminal authorities. No copied palette, glyph cycle, width algorithm, prompt loop, or catalogue registry.
- Exact-frame expectation changes that express the new structure are correct. Replacing them with substring-only assertions is not.
- Never hand-edit generated files or loosen a standard. Use `discern_prepare` while iterating and `deno task verify` for the full local package check. Commit each logical step.

## Out of scope

- Discern dependency pins, prompt wrappers, status views, Desk code, or real process/PTY tests.
- A new full-screen terminal framework, mouse interaction, alternate-screen mode, or a general tree widget.
- Changing Fleet's compact default for consumers that did not request lossless identity.
- Publishing the prepared package, tagging it, or claiming owner release authority.

## Definition of done

- Measurable: grouped entries are public, sentinel-free, non-selectable, navigable, scroll-safe, and rendered distinctly across Select/Checkbox/Radio where applicable; Fleet's lossless mode returns every input identity exactly after ANSI stripping; generated exports and both catalogues enrol the new states; manifests and CHANGELOG are prepared in lockstep; `discern_done` passes on clean committed HEAD.
- Semantic: Discern can preserve its accepted semantic-menu hierarchy and copyable operational identities by supplying typed facts to package APIs, without recreating a prompt renderer or Fleet frame locally.
- Housekeeping: in the final task commit, move this brief to `map/_private/planning/cli-consumer-hardening/_done/0a-package-consumer-hardening.md`. Run `discern_done` on clean committed HEAD, then call `discern_accept`: a recorded grant may land it; without one, report the receipt line and stop. The next action is the owner's design-system `release` workflow, not Discern 1A.
