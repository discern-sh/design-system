# ADR 0013: Publish the testing and projection instruments

**Status**: accepted

## Context

Two quality instruments existed in this repository but were unpublishable. The queue-backed fake terminal in `tests/cli/` drove the real key decoder, interaction machines, painter, and Component renderers behind the injectable `TerminalIO` seam — the seam exists precisely so a deterministic terminal can stand in for Deno stdin/stdout — yet it sat outside the publish allowlist, so every consumer had to rebuild it. That rebuilt copy is exactly the "fake adapter instead of production" anti-pattern the flagship consumer's own review checklist hunts. Separately, the browser Catalogue's Web/CLI switch decoded the package's emitted SGR subset into browser spans through a Catalogue-private module, so the one projection that lets rendered terminal output be reviewed as a visual artifact — by humans and by coding agents — was invisible to consumers, and the consumer programme's screenshot-review loop depends on it.

Keeping both private forced a choice on every consumer: simulate the terminal (and test a simulation), or fork the instruments (and drift). Neither is acceptable for a package whose interaction machinery is public contract.

## Decision

The package publishes both instruments as first-class entrypoints under the same SemVer contract as everything else.

`./cli/interactive/testing` exports the deterministic terminal (`FakeTerminalIO`) with scripted reads, captured writes and raw-mode transitions, and a scriptable viewport including queued mid-interaction resizes; named-key scripting (`TERMINAL_KEY_SEQUENCES`, `encodeTerminalKeys`, `enqueueKeys`) whose canonical sequences must decode back to their own names through the real tokenizer; deterministic test capabilities; and ANSI-stripped frame assertions. The entrypoint ships real machinery seams, not simulations: scripted keys flow through the real decoder, driver, state machines, and renderers. It adds no runtime dependency — the assertions throw plain errors that name the first differing frame line.

`./cli/projection` exports a pure decode of the package's emitted repertoire — SGR styling at every colour depth and OSC 8 hyperlink envelopes — into typed spans, the shared browser style mapping, a safe hyperlink-target policy, and a renderer to self-contained theme-coloured HTML. The input contract is honest and total: the projection covers what this package's renderers emit, not arbitrary terminal byte streams, and it is not a terminal emulator — cursor movement, erasure, and other foreign sequences are rejected with the typed `TerminalProjectionError` rather than passed through, so captured interactive session streams surface as defects instead of leaking raw controls into a review artifact. The decode derives from the internal styled-sequence authority the emitters compose with, so no second byte grammar exists to drift, and 16- and 256-colour codes resolve through the same reference palettes terminal theme derivation uses.

One authority follows from publishing: the package's own tests consume the published testing module and the Catalogue consumes the published projection; the private copies are deleted, not retained as parallel dialects. Release tests hold the expanded contract — both graphs stay React-free, import with zero permissions, resolve inside the publish allowlist, document every symbol, and serve a publish-shaped external consumer that drives a real interaction with scripted keys and projects real output.

## Consequences

Consumers can test their interactive flows against the production path — scripted keys, real decoding, real Component frames — and can turn any captured package output into spans or an HTML view a reviewer can look at. Internal tests and the Catalogue can no longer drift from what consumers receive, because they run on the published modules themselves.

The names are permanent JSR contract, and the instruments now version with the package: a breaking change to the fake terminal or the span shape is a breaking release. Every future `TerminalKeyName` must enrol a canonical byte sequence before the testing module compiles, and every extension of the emitted repertoire (a new SGR attribute, a new envelope) must land in the projection deliberately or captured output containing it fails closed — a forcing function, not an accident.

Rejecting undecodable input means the projection cannot render a whole captured interactive session; that is intentional. Frames are the projectable artifact, and the pure renderers that produce them are directly callable in tests.

## Alternatives considered

Keeping the instruments private preserved a smaller surface but pushed every consumer into simulation or forking — the drift this repository's own one-authority rule exists to prevent. A separate testing package avoided enlarging this one's contract but invited version skew against the machinery it fakes, for no isolation gain since the modules are dependency-free. Passing undecodable input through the projection instead of rejecting it would have made session captures "work", but silently, by leaking raw control bytes into review artifacts and hiding foreign streams; a typed rejection keeps the boundary visible. A PTY-based harness would exercise a real terminal device but couples tests to process spawning and platform PTY behaviour — consumer territory by the package's process-free stance.
