import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Button } from "../../core/button/button.tsx";
import meta, { componentExampleVocabulary } from "./site-header.meta.ts";
import { SiteHeader } from "./site-header.tsx";

function StandardHeaderState() {
  return (
    <SiteHeader
      brand="Example brand"
      brandMark="E"
      brandTypeface="ui"
      brandMarkTreatment="plain"
      navItems={[
        { label: "Overview", href: "#overview" },
        { label: "Principles", href: "#principles" },
        { label: "Resources", href: "#resources" },
      ]}
      actions={<Button href="#start" size="sm">Get started</Button>}
      notice={
        <span>
          A new reference edition is available. <a href="#read">Read it</a>
        </span>
      }
    />
  );
}

function CampaignHeaderState() {
  return (
    <SiteHeader
      brand="Example brand"
      brandMark="E"
      brandTypeface="mono"
      brandMarkTreatment="plain"
      navItems={[
        { label: "How it works", href: "#method" },
        { label: "What returns", href: "#evidence" },
        { label: "Trust", href: "#trust" },
      ]}
      actions={<Button href="#start" size="sm">Start a project</Button>}
      variant="campaign"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "standard", Example: StandardHeaderState },
    { id: "campaign", Example: CampaignHeaderState },
  ],
);

export default function SiteHeaderExamples() {
  return (
    <div className="discern-example-stack">
      <StandardHeaderState />
      <CampaignHeaderState />
    </div>
  );
}
