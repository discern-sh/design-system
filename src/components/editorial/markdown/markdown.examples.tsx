import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import {
  markdownChartExampleMarkdown,
  markdownChartExampleResource,
} from "../../../chart/markdown.example.ts";
import {
  markdownDiagramExampleMarkdown,
  markdownDiagramExampleResource,
} from "../../../diagram/markdown.example.ts";
import {
  markdownCompactExampleSource,
  markdownDeepNestingExampleSource,
  markdownFullDialectExampleSource,
  markdownHostileExampleSource,
  markdownPlacedExampleSource,
  markdownReadingHierarchyExampleSource,
} from "./markdown.example-sources.ts";
import { Heading } from "../../display/heading/heading.tsx";
import meta, { componentExampleVocabulary } from "./markdown.meta.ts";
import { Markdown } from "./markdown.tsx";

function CompactDocumentExample() {
  return <Markdown source={markdownCompactExampleSource} measure="narrow" />;
}

function FullDialectExample() {
  return <Markdown source={markdownFullDialectExampleSource} measure="wide" />;
}

function DeepNestingExample() {
  return <Markdown source={markdownDeepNestingExampleSource} />;
}

function ReadingHierarchyExample() {
  return <Markdown source={markdownReadingHierarchyExampleSource} />;
}

function DiagramResourceExample() {
  return (
    <Markdown
      source={markdownDiagramExampleMarkdown}
      diagrams={[markdownDiagramExampleResource]}
      measure="wide"
    />
  );
}

function ChartResourceExample() {
  return (
    <Markdown
      source={markdownChartExampleMarkdown}
      charts={[markdownChartExampleResource]}
      measure="wide"
    />
  );
}

function PlacedDocumentExample() {
  return (
    <div className="discern-example-stack">
      <Heading level={2} id="placed-editions">Editions</Heading>
      {["2-0", "1-9"].map((edition) => (
        <Markdown
          key={edition}
          source={markdownPlacedExampleSource}
          baseHeadingLevel={3}
          idPrefix={`edition-${edition}`}
        />
      ))}
    </div>
  );
}

function HostileSourceExample() {
  return <Markdown source={markdownHostileExampleSource} measure="narrow" />;
}

function NarrowLayoutExample() {
  return (
    <div style={{ maxWidth: "20rem" }}>
      <Markdown source={markdownCompactExampleSource} measure="narrow" />
    </div>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: CompactDocumentExample },
    { id: "full-dialect", Example: FullDialectExample },
    { id: "deep-nesting", Example: DeepNestingExample },
    { id: "reading-hierarchy", Example: ReadingHierarchyExample },
    { id: "diagram-resource", Example: DiagramResourceExample },
    { id: "chart-resource", Example: ChartResourceExample },
    { id: "placed-document", Example: PlacedDocumentExample },
    { id: "hostile-source", Example: HostileSourceExample },
    { id: "narrow-layout", Example: NarrowLayoutExample },
  ],
);

export default function MarkdownExamples() {
  return (
    <div className="discern-example-stack">
      <CompactDocumentExample />
      <FullDialectExample />
      <DeepNestingExample />
      <ReadingHierarchyExample />
      <DiagramResourceExample />
      <ChartResourceExample />
      <PlacedDocumentExample />
      <HostileSourceExample />
      <NarrowLayoutExample />
    </div>
  );
}
