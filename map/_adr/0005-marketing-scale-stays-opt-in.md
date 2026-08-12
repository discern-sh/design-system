# ADR 0005: Marketing scale stays opt-in

**Status**: superseded by [ADR-0006](0006-homepage-treatments-ship-as-variants.md)

## Context

discern's launch homepage needs a wider frame, more generous section rhythm, publication-scale headings, and stable dark chapters than the system's application and editorial defaults provide. Those differences are intentional: a campaign page must create pace and emphasis that would be excessive in product UI, documentation, or ordinary long-form content.

The homepage also contains a provider line, product windows, terminals, code listings, and diagrammatic artwork tailored to one narrative. Existing design-system Components cover some of the same nouns, but not the same composition. Treating those Components as direct replacements would either weaken the homepage or make package Components absorb one consumer's art direction.

The reusable boundary is therefore narrower than the whole page but larger than a few private CSS values. Future marketing pages need one durable way to opt into the larger frame and rhythm, introduce sections consistently, and put ordinary semantic text and surfaces on a dark chapter without restating theme-specific colours.

## Decision

Campaign scale is an additive contract in the Marketing Group. `MarketingSection` owns standard or wide content frames, standard or spacious vertical rhythm, and canvas, raised, sunken, inherited, or contrast surfaces. Its contrast surface locally remaps the ordinary semantic ink, surface, and border roles as one scope, so descendants continue to use semantic roles rather than theme branches.

`MarketingIntro` owns the recurring eyebrow, heading, and standfirst hierarchy. Its editorial scale is opt-in; the package's global heading sizes, `Section`, `Container`, and `--discern-page-max` defaults do not change. The intro can also carry contrast ink when it sits on a custom dark surface outside `MarketingSection`.

This decision does **not** replace or restyle Logo cloud, Window, Terminal, Code listing, or the other existing Marketing Components. Bespoke provider arrangements, product mockups, diagrams, and narrative artwork remain consumer-owned until a later review proves a genuinely shared component contract. Nor does it move campaign scale into the Layout or Display Groups.

## Consequences

Future campaign pages can select a discoverable Marketing foundation instead of rebuilding the same width, rhythm, heading, and contrast corrections. Application and editorial consumers receive no visual change unless they explicitly select and render the new Components. A contrast chapter corrects semantic descendants in both themes as a scope, eliminating the common dark-text-on-dark failure without component CSS branching on theme attributes.

The package carries two more Components and their CSS, and the Marketing Runtime profile grows accordingly. The scale values are component-owned custom-property contracts rather than global Token defaults; consumers that need a different campaign character can override them locally without changing the rest of the system. Composition-specific homepage CSS still exists, but its remaining ownership is deliberate rather than accidental.

## Alternatives considered

Raising the global page, section, and heading defaults would make the homepage require less local code but would spread campaign proportions across every application, documentation, and editorial surface. Adding variants to every existing Marketing Component would imply that the bespoke homepage artifacts and the catalogue Components were interchangeable before that had been established. Keeping everything consumer-local would preserve the current page but force every later campaign to rediscover the same safe foundation and contrast rules.
