# Comparison workspace

Compare is a simultaneous reading surface. Its selected population crosses Component groups in one grid; group membership belongs to the jump navigation, not a row boundary. Larger selections wrap so the document retains its own width. Narrow allocations stack, while wide individual specimens keep the shared specimen's local overflow behavior.

The [page](../../catalogue/pages/compare/page.tsx) owns composition and passes the existing specimen API unchanged. The [Compare stylesheet](../../catalogue/styles/compare.css) shares header, control, and specimen row tracks so descriptions and individual overrides do not stagger adjacent specimen starts. The horizontal jump list remains native fragment navigation and uses the public OverflowCue.

Selection order, canonical example identity, and global/per-item surface semantics belong to [Compare state](../../catalogue/pages/compare/state.ts), independently of layout. Detail remains a separate destination.

[Compare browser checks](../../scripts/conformance/catalogue/compare.ts) measure actual column and specimen geometry, wrapping, document containment, and the selection/control journeys. [Focused state tests](../../tests/catalogue_compare_test.ts) protect the URL contract. These route checks do not claim pixel equality or equal inner specimen heights.
