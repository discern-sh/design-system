# Guided flows and terminal inspection

A sequential form coordinates requests; each request owns editing, validation, and terminal restoration. Use the typed constructors in [`sequential-steps.ts`](../../src/cli/interactive/sequential-steps.ts) when a request can be seeded from its submitted result. They derive their option and value types from the request contracts, and keep request options separate from the step's label, condition, and non-sensitive summary. `SequentialFormStep<Value>` also types the general closure form; the form's heterogeneous answer record remains `Record<string, unknown>`.

## Retention boundary

A submitted answer takes precedence over an explicit initial option, including empty text, an empty selection, and `false`. Ctrl+U leaves the active request and discards its unsubmitted edits; revisiting a step restores its last submitted answer. A fresh `submit()` starts a fresh answer record. Cancellation restores the terminal, paints a cancelled form, and throws `InteractionCancelled`; it returns no success value.

Conditions are reevaluated from current answers. A step that becomes inapplicable immediately loses its answer, so disabling and re-enabling it starts from its configured initial option. Still-applicable later steps retain their submitted values and validate again when revisited. A request factory can rebuild options from changed upstream answers; it receives its own typed previous value as well.

Single and multiple selections remember the stable IDs associated with their returned values. When options are rebuilt, matching enabled IDs seed the new request and return the current payloads. Missing or disabled IDs are dropped; a single selection then follows the underlying request's first-enabled default. Use distinct choice values: equal values identify the first enabled match. When transformed results cannot identify a choice, or a provider controls choice identity, use the general `run(values, previous, runtime)` closure. Search providers, masked text (which has no initial-value contract), acknowledgement, and document navigation retain their existing request contracts; constructors do not invent seed semantics for them.

## One journey, two review surfaces

[`guided-flow.ts`](../../catalogue/guided-flow.ts) owns the generic request facts, ordered input actions, and supplied semantic replay checkpoints. The [live playground implementation](../../scripts/playground/guided-flow.ts) uses the public adapter and typed constructors. Run `deno task playground:cli form`: submit an empty name, correct it to Maple, choose Email, enter team@example.test, press Ctrl+U at Review, and submit the retained address. Confirm to complete or press Escape to cancel. Choosing Local file exercises the skipped-address path.

The Catalogue's `/catalogue/terminal/guided-setup/` is a **simulated replay**, not a browser terminal. Pure Component renderers project its supplied states; native I/O stays outside the browser graph. The [journey guard](../../tests/catalogue_guided_flow_test.ts) compares exact replay bytes, in order, with the real adapter's scripted completion and cancellation runs across geometry, colour, and character capabilities. Changing replay frame or outcome is URL state; capability changes preserve the selected semantic checkpoint.

## Canonical output and inspection

[`terminal-lab-state.ts`](../../catalogue/terminal-lab-state.ts) and [`terminal-capability-controls.tsx`](../../catalogue/terminal-capability-controls.tsx) own capability parsing, normalization, presets, controls, and URL updates for Component CLI inspection and Terminal lab. Clean output is the default. Inspect explicitly adds the existing public projector's rulers, cell grid, fold, overflow, and diagnostic information. Browser font size is fixed; the cell allocation is independent of the displayed area, and local overflow remains keyboard scrollable.

The canonical frame profile in [`cli-preview.tsx`](../../catalogue/cli-preview.tsx) remains fixed for conformance and capture. Interactive inspection supplies capabilities without rewriting authored props. Example-specific capability overrides still win and are named beside the inspector; authored widths and row limits remain unchanged. For pure Component snapshots, the row control marks the inspection fold; for a guided request replay or height-aware recipe, it also drives frame fitting.
