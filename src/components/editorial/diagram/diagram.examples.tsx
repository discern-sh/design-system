import type { FlowDiagramSpec } from "../../../diagram/mod.ts";
import { diagramAltText, renderDiagramSvg } from "../../../diagram/mod.ts";
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

function svgDataUrl(spec: FlowDiagramSpec, theme: "light" | "dark"): string {
  return `data:image/svg+xml;charset=utf-8,${
    encodeURIComponent(renderDiagramSvg(spec, { theme }))
  }`;
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

      <section>
        <h3>Standalone SVG palettes</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
            gap: "1rem",
          }}
        >
          {(["light", "dark"] as const).map((theme) => (
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

      <DataFigure
        eyebrow="Process reference"
        title="Review a submission"
        visual={<Diagram spec={decisionFlow} />}
        caption="The semantic diagram remains the visual while the figure owns visible editorial context."
        source="Illustrative process specification"
      />
    </div>
  );
}
