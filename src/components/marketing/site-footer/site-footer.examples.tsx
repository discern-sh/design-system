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

function CampaignRowExample() {
  return (
    <SiteFooter
      brand="Example brand"
      brandMark="E"
      frame="wide"
      columns={4}
      description={<p>Every group of links on one row beside the brand.</p>}
      groups={[
        {
          title: "Product",
          links: [
            { label: "Overview", href: "#overview" },
            { label: "Pricing", href: "#pricing" },
          ],
        },
        {
          title: "Learn",
          links: [
            { label: "Documentation", href: "#docs" },
            { label: "Guides", href: "#guides" },
          ],
        },
        {
          title: "Community",
          links: [
            { label: "Forum", href: "#forum" },
            { label: "Events", href: "#events" },
          ],
        },
        {
          title: "Company",
          links: [
            { label: "About", href: "#about" },
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
  [
    { id: "default", Example: SiteFooterExamples },
    { id: "campaign-row", Example: CampaignRowExample },
  ],
);
