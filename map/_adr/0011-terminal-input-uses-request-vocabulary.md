# ADR 0011: Terminal input uses request vocabulary

**Status**: accepted

## Context

The optional `./cli/interactive` Adapter originally exposed `prompt*` functions and `Prompt*` contracts, following conventional command-line library vocabulary. discern is also an agent-development product, where a prompt means instructions given to a coding agent. The two meanings now meet in the same repositories, documentation, search results, and handoff Components. A reference to “the prompt” can therefore name either an agent's task or a terminal input loop, and the ambiguity crosses the published package boundary.

The Adapter already describes its architectural boundary as terminal interaction. Its public calls ask a person for one value, while its shared machinery owns interaction lifecycle, input, cancellation, repainting, and restoration. The existing names no longer reflect that distinction.

## Decision

Terminal value APIs use `request*` names: `requestText`, `requestMaskedText`, `requestConfirmation`, `requestSelection`, `requestSelections`, `requestSearch`, `requestAutocomplete`, and `requestTextarea`. Operation-specific option contracts use `*RequestOptions`. Shared choices, runtime, validation, state machines, cancellation, and frame fitting use `Interaction*` names.

The `./cli/interactive` entrypoint remains stable. “Prompt” is reserved for instructions or briefs given to coding agents. Shell markers use command-prefix vocabulary. Historical changelog entries and ADRs retain the names that existed when they were written, and external provider event names remain unchanged.

The package does not ship compatibility aliases for the old names. Version 0.14.0 records the breaking pre-1.0 contract, and a gate rule rejects `prompt` vocabulary in the terminal-interaction source or public entrypoint.

## Consequences

Consumers must update imports, option types, cancellation handling, and the Terminal Component's shell-marker class when moving to 0.14.0. Behavior, values, validation, rendering, and terminal restoration do not change.

Searches and documentation now distinguish agent prompts from human terminal interaction. New request kinds enroll under the same naming rule, so the package cannot drift back to a second meaning. Removing compatibility aliases makes the migration immediate but avoids maintaining two public dialects indefinitely.

## Alternatives considered

Keeping conventional `prompt*` names preserves compatibility but keeps the ambiguity that forced the decision. Temporary aliases soften the upgrade but make the old vocabulary part of another immutable public release. “Question” fits some calls but not activity, sequential forms, cancellation, or the shared terminal lifecycle, so it is too narrow for the architectural boundary.
