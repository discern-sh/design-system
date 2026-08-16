# ADR 0021: Own terminal reading presentations and completion cleanup

**Status**: accepted

## Context

A terminal document reader composes three surfaces that previously had form-oriented or source-oriented defaults. Choice entries carried only one label, so a document title and its path either collapsed into one value or forced consumers to pre-style terminal text that the package correctly rejects. Long-lived selection frames also presented `[active]` as though ordinary browsing were a validation state. After selection, the interaction driver always left a submitted frame, even when the caller needed to replace that picker with its chosen document; only the active painter knows whether the previous frame is still safely addressable.

Acknowledgement used the complete Field frame and required a label plus message even when a document already owned the visible content above one continuation hint. Markdown preserved source-like heading markers and inline-code fences in styled terminals, making a safe semantic projection read like lightly coloured source rather than formatted prose. Removing those markers everywhere would lose level and code meaning in no-colour and ASCII terminals.

These choices cross the published `./cli` and `./cli/interactive` contracts. They must stay additive, keep caller-authored ANSI outside the data boundary, preserve existing exact frames by default, and leave cursor geometry, viewport fitting, raw mode, signals, and terminal restoration with their existing authorities.

## Decision

`InteractionChoice<T>`, `InteractionGroupHeading`, and their pure frame states accept optional `description` text. It is non-empty when present and rejects control and Unicode format characters. The shared form-choice entry renderer owns label, description, disabled notation, muted annotation styling, wrapping, and continuation indentation for Select, Radio, and Checkbox. Disabled remains a separate semantic fact; `(disabled)` never becomes part of the description value.

`filterInteractionEntries()` is the package authority for static search. It matches labels and descriptions case-insensitively, retains the governing heading for a matching choice, and retains a complete group when its heading matches. `requestSearch` and `requestSearchSelections` accept either that static entry source or the existing synchronous/asynchronous `SearchProvider`. Function providers remain caller-owned and are not post-filtered, so remote and fuzzy providers keep their own query semantics.

Choice requests select `presentation?: InteractionChoicePresentation`, whose values are `"form"` and `"browsing"`; omission means `"form"`. Browsing keeps query input, group structure, highlight, selection, overflow, pending work, hints, validation, submission, and cancellation facts, but an ordinary active frame omits the redundant `[active]` lifecycle copy. Pure Select, Radio, and Checkbox renderers accept the same treatment.

Every request selects `completion?: InteractionCompletionPolicy`, whose values are `"retain-frame"` and `"clear-frame"`; omission means `"retain-frame"`. `runInteraction` applies the policy only after successful validation. Retention paints and finishes the submitted frame exactly as before. Clearing asks the active `InlineFramePainter` to erase its current frame while that geometry is authoritative, then returns without painting a submitted receipt. Validation errors and cancellation keep their established frames. The driver does not expose erase sequences or painter state to consumers, crop a frame, or guess reachable rows.

A clear-frame request requires ANSI cursor control. When that capability is unavailable it raises `InteractionFrameCleanupError` before raw mode, cursor changes, or output. A resize that strands the current frame or a painter refusal during cleanup raises the same typed path without speculative writes. Ordinary write and restoration failures continue through the interaction's exception-safe terminal bracket, which restores raw mode, cursor visibility, and signal handling once.

The existing `AcknowledgementRequestOptions` remains the extendable framed interface and keeps requiring its label and message. The additive `CompactAcknowledgementRequestOptions` is the second discriminated interface; `requestAcknowledgement` overloads accept framed, compact, and union-typed callers. `presentation: "compact"` forbids label and message, renders only its hint (default `Press Enter to continue.`), accepts Enter or Space, and selects `"clear-frame"` through the shared driver policy. It does not implement a second cleanup path or append-only fallback.

Heading adds `treatment?: "default" | "document"`; omission retains the source-like default. Markdown selects the document treatment. In colour-capable Unicode output, H1 owns the strongest bounded motif boundary, H2 a quieter rule, and H3 through H6 progressively reduce marker, weight, emphasis, and annotation chrome without repeated `#` prefixes. Styled inline code uses one restrained Theme-derived treatment without visible fences. No-colour or ASCII output keeps heading `#` markers and inline-code backticks, and `semanticInlineText()` stays the lossless plain projection. Hyperlinks continue through `styleHyperlink`; the reading treatment adds no navigation, target resolution, mouse handling, raw Markdown mode, or terminal-control grammar.

## Consequences

A consumer can present document titles with quieter paths, search a static document set by filename, browse without form-state noise, remove a successful picker before printing its document, and wait on one compact continuation. Existing choices, requests, Heading calls, and exact frames remain unchanged unless callers select the new data or treatment.

Static search gains a durable package rule, while server-backed search stays deliberately extensible. Description rows and document headings can make frames taller, but the existing renderer-measured viewport fitter sees their real geometry and reduces only the variable choice window. A clear-frame request is intentionally unavailable on append-only terminals: callers that need those environments choose retained frames or a non-interactive input path instead of receiving a false cleanup guarantee.

Styled Markdown is less source-like, while degraded output is deliberately more punctuated because markers carry semantics that colour and weight cannot. Heading now accepts an optional terminal motif so a consumer-selected language reaches document boundaries through the same presenter path as the rest of Markdown.

## Alternatives considered

Packing a path into `label`, treating caller-authored ANSI as secondary text, or adding description layout separately to three form Components would each create a second data or geometry authority. Post-filtering every provider response would silently break fuzzy and remote search semantics. Letting consumers emit erase sequences after a request would separate cleanup from the only object that knows the live frame geometry. Clearing unaddressable frames by printing a newline would claim success while leaving the frame visible. Making browsing or document typography the default would change established public bytes. Removing Markdown markers in every terminal would make heading level and inline code ambiguous when styling is unavailable.
