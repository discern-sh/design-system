# ADR 0046: Own terminal applications through bounded regions

**Status**: accepted

## Context

One-shot value requests and the Markdown browser provide reliable terminal effects but do not give a consumer a persistent screen with independent data updates, remembered selection, and foreground handoff. Publishing the painter alone would leave every consumer rebuilding input ownership and resize coordination. A general layout language would add substantially more public contract than the demonstrated application needs.

## Decision

`runTerminalApplication` owns one alternate screen with one or two regions. A region is a Select menu or a reading `CliBlock`; pure state, transition, and frame functions remain directly testable. The package owns focus, identity-preserving selection, scrolling, geometry, and cleanup. The caller owns views, wording, navigation decisions, eligibility, background providers, and effects. The application neither knows nor infers product state.

A synchronous activation handler may return a foreground operation. Only Enter on an available choice activates it: the input read is fully consumed before the raw-terminal bracket exits, the operation runs with terminal ownership restored, and the same navigation state re-enters the bracket afterwards. Shortcut handlers return navigation decisions only. This deliberately avoids a competing read from the decoder's timed lone-Escape continuation. Background updates replace immutable views through a coalescing mailbox and never block on providers inside the key loop.

The minimum is 32 × 10. Smaller live viewports show a bounded resize/exit notice without discarding state. Wide screens split columns, tall screens split rows, and other sizes show the active region. Tab always reaches the other region. Region borders, Select rows, Markdown, text fitting, and semantic styling use existing package authorities. The Markdown browser retains its own corpus and link policies while sharing geometry sampling, resize and abort mailboxes, line fitting, scrolling bounds, and pane allocation.

The optional `./cli/interactive/testing` entrypoint extends ADR 0013 with `script(1)` fixture transport, observable readiness, named captures, and I/O observation. Process launch occurs only when explicitly called. The settled-frame extractor recognizes this package's complete repaint protocol and delegates styled content to the existing projection. It is not a terminal emulator. Product fixtures, compilation, environment policy, accounting, and output storage remain consumer-owned.

## Consequences

Consumers can build a small application without cursor sequences, borders, a wrapping engine, scroll logic, or an event loop. Select annotations express caller-supplied meaning independently of focus; unframed Select content composes without nested chrome. Disabled menu rows stay inspectable and cannot activate.

The fixed region vocabulary and responsive breakpoints are public behavior. More regions, arbitrary nesting, mouse application input, richer embedded controls, and inline transcript reconstruction require demonstrated follow-up needs. Reading blocks are cached by block identity, width, capabilities and presentation; changed content requires a new block. Updates adopt snapshots while caller values remain opaque. POSIX PTY instruments require `script`, `stty`, and `ps`; deterministic tests remain the broad behavioral authority, with a small real-PTY transport canary.

## Alternatives considered

Exposing internal painters would make the consumer invent the most failure-prone part. Reusing a value request per navigation step would repeatedly surrender ownership and make live updates and focus restoration caller problems. A general component tree with arbitrary nested regions would widen the public contract beyond the application. Copying the consumer's desk emulator would introduce a second terminal implementation instead of extracting settled frames at the package's existing repaint boundary.
