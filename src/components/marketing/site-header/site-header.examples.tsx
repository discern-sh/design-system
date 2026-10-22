import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
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
        { label: "Overview", href: "#overview", current: "page" },
        { label: "Principles", href: "#principles" },
        { label: "Guides", href: "#guides" },
        { label: "Resources", href: "#resources" },
        { label: "Community", href: "#community" },
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
        { label: "What returns", href: "#evidence", current: "section" },
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

const principlesLink = {
  selector: '.discern-site-header__nav a[href="#principles"]',
};

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [{
    id: "hover-nav",
    label: "Navigation hover",
    example: "standard",
    category: "interaction",
    sequence: [
      { action: "hover", target: principlesLink },
      { checkpoint: { id: "nav-hover", label: "Pointer over a link" } },
    ],
  }, {
    id: "press-nav",
    label: "Pointer contact",
    example: "standard",
    category: "interaction",
    sequence: [
      { action: "pointer-down", target: principlesLink },
      { checkpoint: { id: "nav-pressed", label: "Pointer held" } },
      { action: "pointer-up", target: principlesLink },
    ],
  }] as const,
);

export default function SiteHeaderExamples() {
  return (
    <div className="discern-example-stack">
      <StandardHeaderState />
      <CampaignHeaderState />
    </div>
  );
}
