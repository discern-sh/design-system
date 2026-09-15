import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { Stack } from "../../layout/stack/stack.tsx";
import { Button } from "../../core/button/button.tsx";
import { Badge } from "../badge/badge.tsx";
import { Tag } from "../tag/tag.tsx";
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { fixtureCopy } from "../../../fixtures/content.ts";
import meta, { componentExampleVocabulary } from "./card.meta.ts";
import { Card } from "./card.tsx";
import { useState } from "react";

function ShadedExample() {
  return (
    <Card texture="shaded" raised>
      <h4>A little material presence</h4>
      <p>Shading is static. Elevation remains an independent choice.</p>
    </Card>
  );
}

function ArrivalExample() {
  const [revision, setRevision] = useState(0);
  return (
    <Stack gap={4}>
      <Card
        key={revision}
        {...(revision > 0 ? { arrival: "shimmer" as const } : {})}
      >
        <h4>Project notes</h4>
        <p>
          {revision > 0
            ? "The updated notes are ready to read."
            : "The notes are ready to read."}
        </p>
      </Card>
      <Button variant="secondary" onClick={() => setRevision(revision + 1)}>
        Refresh notes
      </Button>
    </Stack>
  );
}

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
    <Card style={{ maxWidth: "24rem" }}>
      <Stack gap={4} align="start">
        <Stack gap={2}>
          <h3>Regional research correspondence</h3>
          <p>Read the latest questions and choose the next follow-up.</p>
        </Stack>
        <Stack gap={2}>
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
        </Stack>
        <Button href="#correspondence" variant="secondary" size="sm">
          Read correspondence
        </Button>
        <Card raised padding="none">
          <Stack gap={2} align="start">
            <h4>Related field notes</h4>
            <p>Background from the previous visit.</p>
            <Button href="#field-notes" variant="ghost" size="sm">
              Read field notes
            </Button>
          </Stack>
        </Card>
      </Stack>
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
    { id: "shaded", Example: ShadedExample },
    { id: "arrival", Example: ArrivalExample },
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
  }, {
    id: "content-arrival",
    label: "Meaningful content arrival",
    example: "arrival",
    category: "motion",
    requirements: { reducedMotion: false },
    sequence: [{
      action: "click",
      target: { role: "button", name: "Refresh notes" },
    }, { checkpoint: { id: "notes-arrived", label: "Updated notes" } }],
  }, {
    id: "arrival-reduced",
    label: "Reduced-motion arrival",
    example: "arrival",
    category: "motion",
    requirements: { reducedMotion: true },
    sequence: [{
      action: "click",
      target: { role: "button", name: "Refresh notes" },
    }, { checkpoint: { id: "notes-still", label: "Complete updated notes" } }],
  }],
);
