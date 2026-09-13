# Operational status and evidence

Operational views lead with an outcome and the action it supports. [Result summary](../../src/components/workflow/result-summary/) places its next action before counts; [Diagnostic](../../src/components/workflow/diagnostic/) places the required correction before location, reproduction and evidence. [Verification report](../../src/components/agents/verification-report/) keeps the report outcome, summary and next action outside its evidence disclosure. The caller owns the verdict: a report stamp is not inferred from a partial set of checks.

## Inspecting evidence

Raw output and report evidence use native `details`/`summary`. They work in static HTML without an interaction controller. A closed raw summary identifies its subject, the line count of plain string content (or an authored extent for rich content), and an optional caller-reported outcome. A closed report enumerates the check population by outcome; expanding exposes every original metadata value and check, including skipped work. Custom labels should identify the subject rather than repeat the word “details”.

Preformatted browser evidence is selectable, locally scrollable and keyboard reachable after expansion. Result data uses the same Raw output disclosure and composes the existing [static copy contract](../40-runtime-emitter/static-copy.md); the authored clipboard string is independent of display wrapping, including empty values, whitespace and line endings. Consumers retain responsibility for making their own rich content accessible. This local native markup does not introduce a general Disclosure Component.

Terminal reports include their evidence by default; `expanded: false` requests a closed summary frame. Raw output has an explicit expanded frame as well. Terminal presentation reflows into the allocated character width, so browser preformatted evidence and copy values remain the source for exact source formatting.

## Complete identities

Workflow and Agents browser text wraps rather than replacing a distinguishing segment with an ellipsis. This includes path prefixes, final segments, branch names, artifact names, report values, command directories and agent identities. Path reference retains its complete accessible text and exact copy payload. The [operational CSS guard](../../tests/operational_identity_test.ts) scans every authored stylesheet in these groups, including future folders; the [browser journey](../../tests/workflow_operations_browser_test.tsx) checks complete long values, containment and exact copy transport in narrow and wide allocations.

Terminal paths wrap through the Workflow text authority. File change moves a path and magnitude onto labelled lines when the combined row cannot fit. Fleet retains its established `compact`/`lossless` identity contract: operational examples request `lossless`, whose explicit identity continuations can exceed the frame width to preserve a contiguous value. Even compact Fleet rows expose full branch continuations when two distinct branches would share the same truncated cell. Consumers needing exact contiguous Fleet identities should select `lossless` rather than reconstructing wrapped cells.

## Status and routine records

Fleet's optional typed status prints a semantic word independently of a custom state slot. Its `nextAction` carries caller-authored blocked-work guidance. Avoid also printing the same status in a composed persona. Activity log distinguishes working, waiting, blocked, complete and cancelled with visible words; its terminal waiting/blocked snapshots apply only to an active lifecycle. The existing activity driver still owns streaming, scheduling and termination.

Transcript and Worklog accept an explicit `routineGroup` label. Only adjacent compatible records form a visual run; omission or a changed label is a boundary. Transcript additionally requires the same known speaker: exact string speakers can match directly, while rich speaker slots require a stable `speakerId`. Worklog groups only compatible completed, queued or skipped entries, leaving active and failed steps separate. Every record remains an ordered-list item, every transcript turn retains its announced speaker, and every timestamp, detail and decision stays in its original order. The renderer does not inspect prose to decide whether something was a decision, deduplicate records, or infer a missing conversation.

Dense canonical examples share [neutral authored fixtures](../../src/components/agents/operational-examples.ts) between Web and CLI. Their source-owned review postures expose both reading widths and open evidence states in the existing [review instrument](../60-catalogue/visual-review.md); the browser journey guards native keyboard inspection.
