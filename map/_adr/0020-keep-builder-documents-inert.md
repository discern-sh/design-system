# ADR 0020: Keep builder documents inert and export effects as consumer wiring

**Status**: accepted

## Context

The Catalogue interface builder saves and opens JSON, previews the resulting Component tree through React, and emits consumer TSX. The original implementation treated locally authored and imported values alike: parsed additional props were spread into React Components, UI and export tolerated different shapes, and required callback props were absent from generated source. A saved document could therefore cross from inert data into React escape hatches, while source that appeared complete still required undocumented repair by its consumer.

The builder must preserve useful ordinary Component and DOM props, including `aria-*`, `data-*`, class, style, and structured values. It also has to auto-enrol future Components without putting React in the neutral package graph or turning the Catalogue-only document model into public API. Required functions cannot be serialized as JSON, and inventing executable source or silent no-ops would make imported data active or generated source misleading.

## Decision

One framework-neutral, registry-derived policy accepts every builder document and authored value before storage, history, preview, runtime selection, or TSX generation. It permits only the modeled props of the placed Component plus a plain additional-props object whose keys cannot override any canonical Component prop or carry React identity, refs, raw HTML, executable handlers, executable URLs, or prototype-sensitive properties. JSON-valued props receive the equivalent recursive policy. One bounded iterative walk validates version, shape, identifiers, byte budgets, tree depth, node and slot populations, and JSON complexity. Rejection identifies the exact document path; there is no lenient preview representation.

Function props are never document data. Required function props derive from the generated Component registry and become an explicit typed callback contract on the exported composition function. Every placed instance receives a deterministic callback binding. Preview may provide a Catalogue-local inert function solely so the Component can render, but exported source never supplies a silent no-op and imported data can never provide executable behaviour.

The policy and document model remain under `catalogue/`. They are not added to the package publish set, the neutral root, or the CLI graph.

## Consequences

The same accepted document now means the same prop tree in preview, saved JSON, runtime selection, and generated TSX. Future modeled props and required callbacks join the policy and export contract through the registry inventory, so a new Component cannot silently bypass either boundary. Imported files remain useful for ordinary styling, accessibility attributes, data attributes, and safe structured values without becoming a code or HTML format.

Consumers of a composition containing callback-driven Components must pass the generated callback object. That is more work than a self-contained no-op export, but the missing behaviour is visible to TypeScript and to the person integrating the source. Conservative recursive key and resource limits also reject some JSON objects that would be harmless as isolated business data; the builder chooses predictable React/object-literal semantics over arbitrary data transport.

## Alternatives considered

Separate UI and exporter blocklists would preserve more local flexibility but would recreate the preview/export disagreement and require every future path to remember the same exceptions. Sanitising only imported additional props would leave modeled JSON and local-storage restoration as equivalent escape routes. Banning all additional props would remove legitimate DOM and Component extension points. Serialising handler strings, caller-authored JSX, or generated no-ops would either make source documents executable or conceal required consumer behaviour.
