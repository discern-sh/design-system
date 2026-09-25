# Backdrop concepts

**Status:** sketches awaiting the owner's direction. Nothing here is scheduled; each concept needs a design pass before it becomes a brief.

Five candidate backdrops grounded in discern's visual identity (`project/map/_internal/brand/visual-identity.md` in the discern repository): the ◮ mark's filled and unfilled halves, the human · agent · project relationship, the recursive triangle, and Editorial Engineering. Open [`concepts.html`](concepts.html) in a browser to see each plate move; click a plate to replay it. [`concepts.ts`](concepts.ts) regenerates the page (`deno run --allow-write concepts.ts`) and holds the sketch geometry.

Every concept follows [ADR-0049](../../../_adr/0049-play-backdrop-phrases-whole-and-bound-their-entrances.md): an entrance that settles within five seconds, motion without end only when a consumer opts in and can pause it, and `transform` or `opacity` keyframes over static plates. Ownership follows [ADR-0008](../../../_adr/0008-package-owns-reusable-decorative-artwork.md): a piece that carries discern's meaning or mark belongs in the discern repository, not the Artwork Group.

## A · Concord — package

Three families of parallel hairlines at the triangle's three edge angles. Out of phase, every lattice node splits into a small triangle and the field reads as the kagome (trihexagonal) tiling; as the three families come into phase, the field resolves into one clean triangular lattice. The pattern's topology depends only on the sum of the three phases, so one number drives it and the small triangles flip between ▲ and ▼ with its sign.

- **Phrase:** disagreement → concord in about four seconds, then hold.
- **Reading:** human, agent, and project coming into agreement — without drawing any of them. To anyone else it is a ruling settling.
- **Next:** decide whether it supersedes Survey's static ruling or stands beside it; test contrast at hairline weights on 1× displays.

## B · Relay → Gasket — discern, ceremonial

A spark runs the triangle — apex to right to left to apex: intent, implementation, evidence — then the triangle divides and every part runs the same relay in parallel, four levels deep, until the Sierpiński gasket stands complete and its smallest triangles fill.

- **Phrase:** under five seconds, once.
- **Reading:** "a unit of work carries the same relationship when it divides or runs in parallel", drawn rather than stated.
- **Constraint:** the identity document keeps the Sierpiński triangle ceremonial — never an ambient loop or automatic decoration — so this suits a manifesto opening, "The practice" chapter, or a release moment rather than a page background.

## C · Interference — package

Two identical fine triangular lattices, one turned a few degrees. Large hexagonal cells appear that neither layer contains: a small difference made visible, which is what discerning means. Relaxing the twist from 4° to 1.6° swells the cells dramatically while the lines barely move.

- **Phrase:** the twist relaxes over about four seconds, then holds.
- **Risk:** moiré can shimmer on 1× displays and cause pattern glare. It needs very low contrast and a check across device pixel ratios before it is shown to anyone reading.

## D · Specimen — discern

The mark, monumental and cropped, drawn as a type-foundry specimen: metric lines, circumcircle, median, vertex handles, and a dimension rule construct ◮, and the filled half arrives last.

- **Phrase:** construction lines draw, handles place, the fill settles.
- **Fit:** Editorial Engineering at its most literal — better for a brand page, release notes, or social cards than for the product hero.

## E · Confluence — package

Lanes leave a trunk, run in parallel, and land back on it, and the trunk gains a line at every landing: isolated worktrees held within one project.

- **Phrase:** lanes draw left to right in overlapping turns; landings glint in order.
- **Risk:** the weakest of the five. It must stay abstract enough never to read as a git graph or a simulated dashboard, which the website brief rules out.
