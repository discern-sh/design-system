# ADR 0006: Homepage treatments ship as opt-in variants

**Status**: accepted

## Context

[ADR-0005](0005-marketing-scale-stays-opt-in.md) established an additive Marketing section and introduction while explicitly leaving the homepage's header, hero, provider line, windows, terminal, and code treatments consumer-owned. Reviewing the catalogue beside the homepage showed a more precise boundary. The provider assets, project-state narrative, and decorative artwork belong to the consumer, but the layouts, scale, chrome, contrast, and responsive behavior are useful beyond one page and materially stronger than rebuilding those properties in every campaign.

Replacing the existing Components or changing their defaults would make an experimental launch direction affect established consumers. Adding parallel homepage-only Components would duplicate the same semantics under new names. The reusable treatments therefore need to live with the Components that already own those roles, without implying that the new treatment is the permanent system default.

## Decision

Homepage-derived treatments are opt-in variants of the existing Components. Site header gains a wider, more translucent campaign treatment. Hero block gains a showcase layout and atmospheric surface for publication-scale copy above wide visual evidence. Logo cloud gains a loose strip arrangement and an optional image mask for theme-safe provider marks. Window, Terminal, and Code listing gain showcase treatments; Window and Terminal also expose optional trailing chrome, and Terminal exposes a contextual footer.

Every existing default remains the default and retains its semantic structure. Variants reuse the same Component names, Metadata, generated enrollment, and accessibility contracts. Theme differences continue to move through semantic Tokens and `color-scheme`, never theme-specific Component branches.

Consumer-owned provider data, product-state content, diagrams, and decorative artwork do not move into the package. Nor do campaign proportions become global Layout, Display, or Token defaults. A later decision may promote a variant to a default after the final homepage direction proves stable; this record does not make that promotion.

This decision supersedes ADR-0005 because its explicit prohibition on adapting the existing Components no longer applies. Its narrower conclusion—that campaign scale stays opt-in—continues here.

## Consequences

Future campaign pages can reproduce the homepage's hierarchy and artifact quality through documented props instead of copied CSS, while current consumers receive no visual change unless they select a new variant. The browser Catalogue shows the old and new treatments side by side, making the boundary reviewable before any default changes.

Variant CSS is selection-scoped but still ships whenever its Component is selected, so the Marketing, Display, and Editorial runtime profiles grow. Their governed size ceilings must record that deliberate product growth on the trunk. The package also accepts responsibility for testing both treatments across themes, narrow layouts, forced colours, and future component changes.

## Alternatives considered

Changing the defaults now would reduce homepage props but commit the whole system before the launch design is settled. Keeping the treatments consumer-local would preserve package size but repeat known layout and contrast work on the next campaign. Adding separate Campaign window, Campaign terminal, or Provider strip Components would make discovery easier in the short term while duplicating semantics and fragmenting future fixes.
