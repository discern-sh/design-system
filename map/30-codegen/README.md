# Codegen

How [`generate.ts`](../../scripts/generate.ts) turns Component Metadata, diagram-kind Metadata, and package assets into committed authorities under [`src/generated/`](../../src/generated/). The Catalogue's ignored example registry is a build output: [`build.ts`](../../scripts/build.ts) regenerates it under `catalogue/generated/` before bundling or verification consumes it.

Each folder under [`src/diagram/kinds/`](../../src/diagram/kinds/) has one fixed anatomy and one `*.meta.ts` enrollment fact. Codegen validates that anatomy, guidance, numerical budgets, fixtures, and description-or-enhanced CLI stance before emitting the authored `DiagramSpec` union, the distinct normalized union returned by validation, public Metadata and Markdown author guide, exhaustive semantic dispatch, fixture registry, CLI registry, and type export barrel together. Generated dispatch is the only projection switch; kind implementations and callers never patch it. [`generator_test.ts`](../../tests/diagram/generator_test.ts) builds synthetic future kinds and malformed inventories so adding a kind cannot silently omit a consumer.

_Component and asset codegen remain to be documented in depth; that work is tracked in [`discern/TODO.md`](../../discern/TODO.md). Until then, start from the [orientation docs](../00-orientation/)._
