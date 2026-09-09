import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { Button } from "../../core/button/button.tsx";
import { Badge } from "../badge/badge.tsx";
import { Tag } from "../tag/tag.tsx";
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { fixtureCopy } from "../../../fixtures/content.ts";
import meta, { componentExampleVocabulary } from "./card.meta.ts";
import { Card } from "./card.tsx";

function PlainExample() {
  return (
    <Card>
      <h4>{fixtureCopy.heading}</h4>
      <p>{fixtureCopy.paragraph}</p>
    </Card>
  );
}

function RaisedExample() {
  return (
    <Card raised>
      <h4>Raised surface</h4>
      <p>{fixtureCopy.paragraph}</p>
    </Card>
  );
}

function DottedExample() {
  return (
    <Card texture="dots">
      <h4>Dotted surface</h4>
      <p>{fixtureCopy.paragraph}</p>
    </Card>
  );
}

function CrowdedExample() {
  return (
    <Card
      style={{
        maxWidth: "24rem",
        display: "grid",
        gap: "var(--discern-rhythm-item)",
      }}
    >
      <h3>Regional research correspondence</h3>
      <p>Read the latest questions and choose the next follow-up.</p>
      <p
        style={{
          color: "var(--discern-color-ink-muted)",
          fontSize: "var(--discern-font-size-xs)",
        }}
      >
        Updated 11 August · 5 contributors
      </p>
      <div className="discern-example-row">
        <Badge tone="neutral">Reference</Badge>
        <Tag>International correspondence</Tag>
      </div>
      <p>
        <Button href="#correspondence" variant="secondary" size="sm">
          Read correspondence
        </Button>
      </p>
      <Card
        raised
        padding="none"
        style={{ display: "grid", gap: "var(--discern-rhythm-item)" }}
      >
        <h4>Related field notes</h4>
        <p>Background from the previous visit.</p>
        <Button href="#field-notes" variant="ghost" size="sm">
          Read field notes
        </Button>
      </Card>
    </Card>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: PlainExample },
    { id: "raised", Example: RaisedExample },
    { id: "dotted", Example: DottedExample },
    { id: "crowded", Example: CrowdedExample },
  ],
);

export default function CardExamples() {
  return (
    <div className="discern-example-grid">
      <PlainExample />
      <RaisedExample />
      <DottedExample />
    </div>
  );
}

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [{
    id: "narrow-content",
    label: "Full content at narrow local width",
    example: "crowded",
    category: "responsive",
    requirements: { inlineSize: 240 },
    sequence: [{
      checkpoint: {
        id: "card-narrow-content",
        label: "Names, current state, and actions remain visible",
      },
    }],
  }],
);
