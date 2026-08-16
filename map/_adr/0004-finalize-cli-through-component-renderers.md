# ADR 0004: Finalize CLI through Component renderers

**Status**: accepted

## Context

[ADR-0002](0002-react-free-cli-renderer-contract.md) established a pure React-free renderer graph, but made an absent Component CLI stance a transitional pending state and expected the zeroed `cli_pending` Standard to disappear. [ADR-0003](0003-adapt-terminal-interaction-behind-frame-states.md) adapted the interactive experiment behind typed frame states, but deliberately rendered them through one temporary presentation module until the Group renderers landed. The programme now has a rendered or reasoned-exempt stance for every Component and real renderers for every interactive frame.

The final integration must prevent a future Component from reopening the migration, remove the temporary presentation authority, and retain discern's rule that a Standard recorded on trunk cannot be deleted or loosened by a feature branch. The CLI package graph must remain React-free even though the Interactive Adapter now composes the same Component renderers as direct callers.

## Decision

Every Component Metadata record declares a CLI stance. A rendered stance and its colocated `<slug>.cli.ts` must exist together and register through Codegen; an exempt stance carries a non-empty reason and has no renderer file. Absence has no type or registry representation. Codegen also discovers renderer files from disk so an orphan fails the relationship in the reverse direction. The `cli_pending` Standard remains a zero ceiling as defence in depth because a feature branch cannot delete a trunk Standard; the required type and always-on Codegen validation are the primary permanent rule.

`./cli` remains a pure React-free renderer graph over explicit Terminal Capabilities. `./cli/interactive` may import pure Component `*.cli.ts` modules but no `.tsx` module or React. Text, masked, and autocomplete frames render through Input; confirm through Switch; select through Select; multiselect through Checkbox; search through Radio; and textarea through Textarea. Determinate progress renders through Meter, sequential forms through Process steps, and spinner animation stays on the package triangle spinner primitive. The temporary frame renderer is deleted rather than retained as another composition layer.

Choice prompts accept semantic group headings beside value-bearing choices. The public discriminated heading carries identity and visible text but no caller value; every navigation and result operation works over selectable choices only. Select, Checkbox, and Radio render the heading through the package's Token-derived triangle section-rule authority. The shared viewport retains a visible choice's governing heading while scrolling, and search providers use the same entry vocabulary rather than introduce another model.

Fleet keeps compact, width-bounded identity cells as its default and exposes an opt-in lossless policy for operational views. When complete persona or branch text cannot fit a compact cell, the renderer emits an explicit labelled continuation containing the caller value exactly. This is a deliberate local width exception for copyable identity facts, not terminal auto-wrap or a second Fleet composition.

The CLI Catalogue treats the generated stance registry and renderer examples as its inventory. Its all view shows every rendered state and every exemption reason, while its motif sheet calls public triangle APIs. It carries no copied Component frames or private motif constants.

This record supersedes ADR-0002 and ADR-0003 as the final-state account. Their pure-renderer, Token-derived theme, explicit-capability, typed-state, injectable-I/O, and exception-safe lifecycle decisions remain in force through this decision; their pending stance and temporary frame seam do not.

## Consequences

A new Component cannot type-check without choosing terminal support or explaining its exemption, and a renderer cannot appear on disk without Metadata enrollment. Interactive output changes when a Component renderer intentionally changes, so exact-frame tests pin that integration rather than a looser semantic assertion. The Interactive Adapter depends on pure Component modules and is therefore wider than the foundation-only graph, but it still introduces neither React nor import-time effects.

Consumers can preserve menu hierarchy without fake disabled values or sentinels in their generic value types, and submitted results remain arrays of caller values in caller order. Consumers that need copyable operational identities can request them without changing the compact Fleet contract for every other caller; in that mode an identity continuation may exceed the nominal frame width so the value remains contiguous.

Keeping a constant zero Standard costs one small measurement script and repeats a rule already enforced by types and Codegen. It preserves the trunk quality contract and makes any future regression fail in more than one surface. Removing pending from the contract also means another staged CLI migration would need an explicit new decision instead of silently omitting stances.

## Alternatives considered

Deleting `cli_pending` matched the original programme wording but violates the branch rule that a trunk Standard cannot disappear. Leaving `cli` optional with a conformance-only check let authored TypeScript represent an invalid state. Keeping the temporary frame dispatcher insulated prompts from Component frame changes, but retained a second presentation authority after the intended renderers existed. Importing Component TSX modules would have reused web props more directly while breaking the React-free CLI contract.
