import type {
  DiagramSpec,
  DiagramSvgTheme,
  FlowDiagramSpec,
} from "../../../diagram/mod.ts";
import { diagramAltText, renderDiagramSvg } from "../../../diagram/mod.ts";
import architectureFixtures from "../../../diagram/kinds/architecture/architecture.fixtures.ts";
import cycleFixtures from "../../../diagram/kinds/cycle/cycle.fixtures.ts";
import sequenceFixtures from "../../../diagram/kinds/sequence/sequence.fixtures.ts";
import timelineFixtures from "../../../diagram/kinds/timeline/timeline.fixtures.ts";
import {
  markdownDiagramExampleMarkdown,
  markdownDiagramExampleSpec,
} from "../../../diagram/markdown.example.ts";
import { DataFigure } from "../data-figure/data-figure.tsx";
import { Diagram } from "./diagram.tsx";

const compactFlow = {
  kind: "flow",
  title: "Prepare reference material",
  summary: "A short sequence moves from an outline to a checked reference.",
  direction: "left-to-right",
  nodes: [
    { id: "outline", label: "Outline", role: "start" },
    { id: "check", label: "Check facts" },
    { id: "share", label: "Share reference", role: "end" },
  ],
  edges: [
    { id: "drafted", from: "outline", to: "check" },
    { id: "checked", from: "check", to: "share" },
  ],
} as const satisfies FlowDiagramSpec;

/** Source-backed defaults for the Catalogue builder's structured spec prop. */
export const catalogueBuilderDefaults = {
  spec: compactFlow,
} as const;

const decisionFlow = {
  kind: "flow",
  title: "Review a submission",
  summary: "Review either accepts a submission or returns it for revision.",
  nodes: [
    { id: "submit", label: "Submit material", role: "start" },
    { id: "review", label: "Review evidence", role: "decision" },
    {
      id: "revise",
      label: "Revise material",
      annotation: "Address every finding",
    },
    { id: "accept", label: "Accept material", role: "end" },
  ],
  edges: [
    { id: "ready", from: "submit", to: "review" },
    {
      id: "sufficient",
      from: "review",
      to: "accept",
      label: "Evidence is sufficient",
    },
    {
      id: "changes",
      from: "review",
      to: "revise",
      label: "Changes requested",
      emphasis: "secondary",
    },
    {
      id: "again",
      from: "revise",
      to: "review",
      label: "Review again",
      emphasis: "return",
    },
  ],
} as const satisfies FlowDiagramSpec;

const longLabelFlow = {
  kind: "flow",
  title: "Preserve detailed labels",
  summary:
    "Conservative layout reserves room for longer reference wording without clipping it.",
  direction: "left-to-right",
  nodes: [
    {
      id: "collect",
      label: "Collect relevant source observations",
      annotation: "Keep the original wording available",
      role: "start",
    },
    {
      id: "compare",
      label: "Compare against stated criteria",
    },
    {
      id: "record",
      label: "Record conclusion with context",
      role: "end",
    },
  ],
  edges: [
    { id: "collected", from: "collect", to: "compare" },
    {
      id: "supported",
      from: "compare",
      to: "record",
    },
  ],
} as const satisfies FlowDiagramSpec;

const [groupedArchitecture, minimalArchitecture, stressArchitecture] =
  architectureFixtures;
const [minimalCycle, learningCycle, stressCycle] = cycleFixtures;
const [participantSequence, minimalSequence, stressSequence] = sequenceFixtures;
const [minimalTimeline, phasedTimeline, stressTimeline] = timelineFixtures;

function svgDataUrl(spec: DiagramSpec, theme: DiagramSvgTheme): string {
  return `data:image/svg+xml;charset=utf-8,${
    encodeURIComponent(renderDiagramSvg(spec, { theme }))
  }`;
}

function comparison(
  title: string,
  minimal: DiagramSpec,
  representative: DiagramSpec,
  stress: DiagramSpec,
) {
  const examples = [
    { label: "Minimal", spec: minimal },
    { label: "Representative", spec: representative },
    { label: "Dense but supported", spec: stress },
  ] as const;
  return (
    <section>
      <h3>{title}</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        {examples.map(({ label, spec }) => (
          <figure key={label} style={{ margin: 0 }}>
            <Diagram spec={spec} />
            <figcaption>{label}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export default function DiagramExamples() {
  return (
    <div style={{ display: "grid", gap: "3rem" }}>
      <section>
        <h3>Compact left-to-right flow</h3>
        <Diagram spec={compactFlow} />
      </section>

      <section>
        <h3>Decision and return flow</h3>
        <Diagram spec={decisionFlow} />
      </section>

      <section>
        <h3>Conservative long-label layout</h3>
        <Diagram spec={longLabelFlow} />
      </section>

      {comparison(
        "Architecture: boundaries and labelled relationships",
        minimalArchitecture,
        groupedArchitecture,
        stressArchitecture,
      )}

      {comparison(
        "Cycle: ordered repetition and shared context",
        minimalCycle,
        learningCycle,
        stressCycle,
      )}

      {comparison(
        "Sequence: participants and authored messages",
        minimalSequence,
        participantSequence,
        stressSequence,
      )}

      {comparison(
        "Timeline: calendar spans and dated gates",
        minimalTimeline,
        phasedTimeline,
        stressTimeline,
      )}

      <section>
        <h3>Standalone SVG palettes</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
            gap: "1rem",
          }}
        >
          {(["light", "dark", "adaptive"] as const).map((theme) => (
            <figure key={theme} style={{ margin: 0 }}>
              <img
                src={svgDataUrl(compactFlow, theme)}
                alt={diagramAltText(compactFlow)}
                style={{ display: "block", width: "100%", height: "auto" }}
              />
              <figcaption>{theme} standalone asset</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section>
        <h3>Ordinary Markdown asset bridge</h3>
        <pre
          style={{
            maxWidth: "100%",
            minWidth: 0,
            overflowWrap: "anywhere",
            whiteSpace: "pre-wrap",
          }}
        >
          <code>{markdownDiagramExampleMarkdown}</code>
        </pre>
        <Diagram spec={markdownDiagramExampleSpec} />
      </section>

      <DataFigure
        eyebrow="System reference"
        title="Process a submitted record"
        visual={<Diagram spec={groupedArchitecture} />}
        caption="The semantic topology remains the visual while the figure owns visible editorial context."
        source="Illustrative architecture specification"
      />
    </div>
  );
}
