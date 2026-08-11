# ADR 0002: Terminal rendering is a React-free pure renderer contract

**Status**: superseded by [ADR-0004](0004-finalize-cli-through-component-renderers.md)

## Context

The package's design language previously reached browsers through semantic Tokens, Component CSS, a deterministic Runtime, and an optional React Adapter. The discern CLI needs the same semantic colours, vocabulary, Component identities, and triangle motifs without making a second palette or importing a web framework. Terminal output also depends on facts that do not exist on the web surface: tty state, colour depth, available columns, Unicode support, animation phase, cursor position, and raw-mode input. If renderers discover those facts or perform input/output themselves, exact-frame tests cannot prove them and a future interactive driver becomes inseparable from presentation.

There are 109 Components, so terminal parity cannot arrive atomically. The contract has to enroll every Component immediately, permit a measured pending state during the migration, and prevent a renderer file, Metadata stance, generated registry, and public export from drifting apart. The triangle language already has a working reference in the discern repository, but a runtime dependency on that product would invert package ownership and force consumers to copy or import its glyph cycles.

## Decision

`./cli` is a React-free public entrypoint. A Component CLI renderer is a pure function of typed props and explicit `TerminalCapabilities`, returning a string without environment reads or I/O. Capability detection is a separate helper over caller-supplied environment, tty, locale, width, and Unicode facts.

Terminal themes derive at module initialization from the authored `DesignToken` and `ThemeToken` metadata. The bridge resolves Token references and light/dark values, converts solid colours to sRGB, computes ANSI 256- and 16-colour nearest matches, maps spacing relative to the authored `--discern-space-2`, and maps typographic roles to bold, dim, and italic. There is no generated or handwritten terminal palette.

Component Metadata owns CLI stance. A rendered stance requires a colocated `<slug>.cli.ts`; an exempt stance carries a non-empty reason; absence is pending. Codegen validates file and stance in both directions, then generates the slug registry and renderer export barrel. A deterministic `cli_pending` standard holds the raw pending census at 108 with direction down. At zero, pending becomes an always-on conformance failure and the transitional standard disappears.

Interactive presentation and terminal control are separate layers. `interactive-states.ts` owns the visual state shapes, including lifecycle, selection, cursor, spinner phase, progress completion, workflow status, and beacon phase. Renderers consume those states. A driver owns raw mode, key handling, timing, frame replacement, and process effects outside this foundation.

The design-system package adapts the discern terminal reference's four triangle orientations, weave order, spinner order, and workflow meanings as its own React-free authority. It derives colour, spacing, measurement, and ASCII degradation locally and has no runtime dependency on the discern product repository.

## Consequences

Web and CLI renderers share Token values and component vocabulary without sharing rendering technology. Every frame is reproducible at a declared width and capability level, including no-colour and ASCII output. Wave-sized Component work enrolls through Metadata and either follows Codegen automatically or fails with a named missing relationship. Consumers import triangle behaviour from the package instead of embedding a glyph cycle.

The `./cli` import performs a bounded colour conversion and fallback computation once per module instance. ANSI 16 and 256 output approximates the authored colour within those fixed palettes, and translucent colour roles are composited over the selected canvas because terminals have no alpha channel. Callers remain responsible for obtaining truthful capabilities and for choosing the light or dark terminal variant when a renderer exposes that choice. The typed state boundary commits the later interactive driver to producing these semantic states rather than pre-rendered glyphs.

## Alternatives considered

A handwritten terminal palette was smaller at runtime but created a second colour authority that could drift from Tokens. A generated palette avoided the conversion cost but added a committed representation and currency edge for a small bounded computation. Renderers that read `Deno.env`, inspect stdout, or run raw-mode input themselves were easier to demo but made rendering impure and coupled the package to one runtime. Importing the triangle module from the discern repository preserved its implementation but reversed the dependency direction and did not give package consumers a stable authority.
