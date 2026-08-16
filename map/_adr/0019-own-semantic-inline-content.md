# ADR 0019: Own semantic inline content as package data

**Status**: accepted

## Context

The terminal foundation can style and wrap package-emitted SGR and OSC 8 sequences safely, but Component renderers still receive prose as unrelated strings. A Markdown renderer therefore has no public way to say that a run is emphasised, literal code, a link, an image fallback, or a footnote reference without either flattening that meaning or inventing a private span model. A third-party parser tree would retain more structure, but would make parser choice, mutability, raw HTML nodes, and dependency-specific details part of this package's public contract.

Inline meaning must also survive terminals without colour or hyperlinks. The boundary has to reject terminal controls and unsafe destinations before any styled byte is emitted, and it must stop malformed, cyclic, or adversarially deep trees deterministically. Browser Components need equivalent semantics without putting React in the neutral or `./cli` module graph.

## Decision

The package owns one recursively readonly `SemanticInlineContent` vocabulary. A value is a string shorthand or a readonly sequence of string runs and discriminated package nodes: `text`, `literal`, `emphasis`, `strong`, `strikethrough`, `code`, `link`, `image`, `soft-break`, `hard-break`, and `footnote-reference`. Style nodes contain semantic content; links contain a label subtree plus a destination and optional title; images contain a non-empty textual alternative, source, and optional title; footnote references contain a stable identifier and optional visible label. Code contains literal text rather than child semantics.

Style nodes may nest in any order, including strong emphasis and emphasis inside strong emphasis. A link label may contain strings, text, literal, code, and nested style nodes, but not another link, an image, a footnote reference, or a hard break. Images have textual alternatives rather than arbitrary child trees. There is no HTML node, React node, ANSI node, parser token, or extension escape hatch. Angle brackets that arrive as text remain inert literal text; they are never interpreted as markup.

Validation happens at the public projection and rendering boundary. Runtime values must use the exact package node keys and ordinary data properties; required text and labels are non-empty; visible strings contain no control or Unicode format characters; footnote identifiers use a stable ASCII identifier repertoire; and optional titles, when present, are non-empty. Destinations and image sources must be printable ASCII URL references without backslashes or encoded controls. Absolute URLs are limited to `http:`, `https:`, `mailto:`, and `file:`; relative, root-relative, query, fragment, and scheme-relative references are accepted; every other explicit scheme is rejected. Cycles and nesting deeper than 64 nodes throw before rendering.

One package function projects the vocabulary to lossless plain text. Soft breaks become one space and hard breaks one newline. Strong, emphasis, strike, and code use restrained Markdown-like delimiters when styling is unavailable; link fallback retains its destination; images render as an explicit `Image:` fallback with alternative text and source; and footnote references retain a visible `[^label]` marker. The styled renderer derives typography and colour from terminal Themes, composes only through the ANSI and hyperlink authorities, and wraps only through `wrapStyledText`, so nested styling and targets close and reopen independently on every line.

React adapters may import this React-free vocabulary and map it to equivalent phrasing elements, or accept ordinary React phrasing children when the caller already owns that tree. That dependency points from the optional React adapter towards neutral semantic data; `./cli` never imports React.

Separate per-Component inline span models and third-party parser ASTs are not public API. Parsers adapt into the package vocabulary at their boundary.

## Consequences

Every later Markdown structure can share validation, flattening, degradation, styling, hyperlink safety, and wrapping instead of repainting prose. Consumers can choose or replace a parser without changing Component props, and hostile parser output cannot smuggle control bytes, raw HTML behaviour, or unsafe links into terminal output.

The package now owns a durable recursive data contract and a deliberately conservative URL policy. Parser adapters must discard source positions and extension-specific nodes, percent-encode non-ASCII destinations, and choose an explicit textual representation for unsupported extensions. The 64-level limit rules out pathological documents in exchange for deterministic failure. No-colour output is slightly more punctuated than styled output because it must carry distinctions that SGR would otherwise express.

## Alternatives considered

Publishing a selected Markdown parser's AST would avoid one adaptation pass, but would couple every consumer and renderer to that parser's node shape and raw-extension policy. Separate span unions per Component would keep each renderer locally simple while guaranteeing drift in links, images, footnotes, and safety rules. Accepting caller-authored ANSI or HTML would preserve maximum expressiveness but would bypass the package's byte grammar, theme, width, and injection boundaries.
