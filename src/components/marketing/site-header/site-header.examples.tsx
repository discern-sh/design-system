import type { CatalogueExampleState } from "../../../../styleguide/conformance.ts";
import { Button } from "../../core/button/button.tsx";
import { SiteHeader } from "./site-header.tsx";

function StandardHeaderState() {
  return (
    <SiteHeader
      brand="Waypoint"
      brandMark="◮"
      brandTypeface="ui"
      brandMarkTreatment="plain"
      navItems={[
        { label: "Product", href: "#product" },
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
      brand="Waypoint"
      brandMark="◮"
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

export const catalogueStates = [
  { name: "standard", label: "Standard", Example: StandardHeaderState },
  { name: "campaign", label: "Campaign", Example: CampaignHeaderState },
] satisfies readonly CatalogueExampleState[];

export default function SiteHeaderExamples() {
  return (
    <div className="discern-example-stack">
      <StandardHeaderState />
      <CampaignHeaderState />
    </div>
  );
}
