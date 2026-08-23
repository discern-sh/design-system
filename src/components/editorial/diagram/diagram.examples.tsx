import type { DiagramSvgTheme } from "../../../diagram/mod.ts";
import { diagramAltText, renderDiagramSvg } from "../../../diagram/mod.ts";
import {
  markdownDiagramExampleMarkdown,
  markdownDiagramExampleSpec,
} from "../../../diagram/markdown.example.ts";
import { diagramKindRegistry } from "../../../generated/diagram-registry.ts";
import type { DiagramSpec } from "../../../generated/diagram-spec.ts";
import { DataFigure } from "../data-figure/data-figure.tsx";
import { Diagram } from "./diagram.tsx";

function releaseSpec(
  kind: string,
  posture: "minimal" | "representative",
): DiagramSpec {
  const entry = diagramKindRegistry.find(({ meta }) => meta.slug === kind);
  const releaseCase = entry?.releaseCorpus.cases.find(({ postures }) =>
    postures.some((candidate) => candidate === posture)
  );
  if (releaseCase === undefined) {
    throw new TypeError(`${kind} has no ${posture} release case`);
  }
  return releaseCase.spec as DiagramSpec;
}

const compactFlow = releaseSpec("flow", "minimal");

/** Source-backed defaults for the Catalogue builder's structured spec prop. */
export const catalogueBuilderDefaults = { spec: compactFlow } as const;

function svgDataUrl(spec: DiagramSpec, theme: DiagramSvgTheme): string {
  return `data:image/svg+xml;charset=utf-8,${
    encodeURIComponent(renderDiagramSvg(spec, { theme }))
  }`;
}

function corpusExamples(
  entry: typeof diagramKindRegistry[number],
) {
  return (
    <section key={entry.meta.slug} data-diagram-kind={entry.meta.slug}>
      <h3>{entry.meta.name}: complete release corpus</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        {entry.releaseCorpus.cases.map((releaseCase) => (
          <figure key={releaseCase.name} style={{ margin: 0 }}>
            <Diagram spec={releaseCase.spec as DiagramSpec} />
            <figcaption>
              {releaseCase.name}: {releaseCase.postures.join(", ")}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export default function DiagramExamples() {
  const architecture = releaseSpec("architecture", "representative");
  return (
    <div style={{ display: "grid", gap: "3rem" }}>
      {diagramKindRegistry.map(corpusExamples)}

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
            <figure key={theme} style={{ margin: 0, overflowX: "auto" }}>
              <img
                src={svgDataUrl(compactFlow, theme)}
                alt={diagramAltText(compactFlow)}
                style={{ display: "block", maxWidth: "none", height: "auto" }}
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
        title={architecture.title}
        visual={<Diagram spec={architecture} />}
        caption="The semantic topology remains the visual while the figure owns visible editorial context."
        source="Illustrative architecture specification"
      />
    </div>
  );
}
