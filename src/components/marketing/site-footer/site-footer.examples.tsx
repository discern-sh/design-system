import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./site-footer.meta.ts";
import { SiteFooter } from "./site-footer.tsx";

export default function SiteFooterExamples() {
  return (
    <SiteFooter
      brand="Example brand"
      brandMark="E"
      description={
        <p>A small system for teams doing consequential work with care.</p>
      }
      groups={[
        {
          title: "Product",
          links: [
            { label: "Overview", href: "#overview" },
            { label: "Examples", href: "#examples" },
            { label: "Pricing", href: "#pricing" },
          ],
        },
        {
          title: "Resources",
          links: [
            { label: "Documentation", href: "#docs" },
            { label: "Guides", href: "#guides" },
            { label: "Changelog", href: "#changes" },
          ],
        },
        {
          title: "Company",
          links: [
            { label: "About", href: "#about" },
            { label: "Careers", href: "#careers" },
            { label: "Contact", href: "#contact" },
          ],
        },
      ]}
      legal="© 2026 Example brand"
      meta="Built carefully · served simply"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: SiteFooterExamples }],
);
