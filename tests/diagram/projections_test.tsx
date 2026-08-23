import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { stripAnsi } from "../../src/cli/ansi.ts";
import { renderDiagramCli, renderMarkdownCli } from "../../src/cli/mod.ts";
import {
  createMarkdownBrowserState,
  type MarkdownBrowserDocument,
} from "../../src/cli/interactive/markdown-browser-model.ts";
import { transitionMarkdownBrowser } from "../../src/cli/interactive/markdown-browser-machine.ts";
import { markdownBrowserDocumentLines } from "../../src/cli/interactive/markdown-browser-renderer.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import {
  describeDiagram,
  diagramAltText,
  renderDiagramMarkdownImage,
  renderDiagramSvg,
} from "../../src/diagram/mod.ts";
import type { MarkdownDiagramResource } from "../../src/diagram/markdown.ts";
import { diagramKindCliRegistry } from "../../src/generated/diagram-cli-registry.ts";
import { diagramKindRegistry } from "../../src/generated/diagram-registry.ts";
import type { DiagramSpec } from "../../src/generated/diagram-spec.ts";
import { Diagram, Markdown } from "../../src/react.ts";
import DiagramExamples from "../../src/components/editorial/diagram/diagram.examples.tsx";

const wide = testTerminalCapabilities({
  columns: 600,
  colorDepth: "none",
  unicode: true,
});

const authoredEnumFields = new Set([
  "kind",
  "direction",
  "role",
  "emphasis",
]);

function authoredTextFacts(
  value: unknown,
  key = "",
  facts = new Set<string>(),
): ReadonlySet<string> {
  if (typeof value === "string") {
    if (!authoredEnumFields.has(key)) facts.add(value);
    return facts;
  }
  if (Array.isArray(value)) {
    for (const item of value) authoredTextFacts(item, key, facts);
    return facts;
  }
  if (typeof value === "object" && value !== null) {
    for (const [childKey, child] of Object.entries(value)) {
      authoredTextFacts(child, childKey, facts);
    }
  }
  return facts;
}

function normalizedText(value: string): string {
  return value.replaceAll(/\s+/gu, " ").trim();
}

function assertCarriesAuthoredText(
  output: string,
  spec: DiagramSpec,
  projection: string,
): void {
  const normalized = normalizedText(stripAnsi(output));
  for (const fact of authoredTextFacts(spec)) {
    assert(
      normalized.includes(normalizedText(fact)),
      `${spec.kind} ${projection} lost authored text ${JSON.stringify(fact)}`,
    );
  }
}

function markdownCase(spec: DiagramSpec, name: string): {
  readonly source: string;
  readonly resource: MarkdownDiagramResource;
} {
  const diagramSource = `assets/${spec.kind}-${name}.svg`;
  const resource = { source: diagramSource, spec };
  return {
    source: renderDiagramMarkdownImage(resource),
    resource,
  };
}

Deno.test("every release case traverses every public projection", () => {
  assertEquals(
    diagramKindRegistry.map(({ meta }) => meta.slug),
    ["flow", "architecture", "cycle", "sequence", "timeline"],
  );
  for (const entry of diagramKindRegistry) {
    for (const releaseCase of entry.releaseCorpus.cases) {
      const spec = releaseCase.spec as DiagramSpec;
      const description = describeDiagram(spec).trimEnd();
      const alt = diagramAltText(spec);

      for (const theme of ["light", "dark", "adaptive"] as const) {
        const svg = renderDiagramSvg(spec, { theme });
        assertStringIncludes(svg, `<title>${spec.title}</title>`);
        assertStringIncludes(svg, `aria-label="${alt}"`);
        for (const line of description.split("\n")) {
          assertStringIncludes(svg, line);
        }
        assertEquals(renderDiagramSvg(structuredClone(spec), { theme }), svg);
      }

      const directReact = renderToStaticMarkup(<Diagram spec={spec} />);
      assertStringIncludes(
        directReact,
        `data-discern-diagram-kind="${spec.kind}"`,
      );
      assertStringIncludes(directReact, `<title>${spec.title}</title>`);
      assertStringIncludes(directReact, description);

      const descriptionCli = renderDiagramCli(
        { spec, mode: "description", theme: "dark", maxWidth: wide.columns },
        wide,
      );
      assertCarriesAuthoredText(descriptionCli, spec, "CLI description");

      const automaticCli = renderDiagramCli(
        { spec, mode: "auto", theme: "dark", maxWidth: wide.columns },
        wide,
      );
      assertCarriesAuthoredText(automaticCli, spec, "CLI auto");
      if (entry.meta.cli.stance === "description") {
        assertEquals(automaticCli, descriptionCli);
        assertEquals(
          diagramKindCliRegistry[spec.kind].stance,
          "description",
        );
      }

      const markdown = markdownCase(spec, releaseCase.name);
      const markdownHtml = renderToStaticMarkup(
        <Markdown source={markdown.source} diagrams={[markdown.resource]} />,
      );
      assertStringIncludes(
        markdownHtml,
        `data-discern-diagram-kind="${spec.kind}"`,
      );
      assertStringIncludes(markdownHtml, description);

      const markdownCli = renderMarkdownCli(
        {
          source: markdown.source,
          diagrams: [markdown.resource],
          diagramMode: "auto",
        },
        wide,
      );
      assertCarriesAuthoredText(markdownCli, spec, "Markdown CLI");

      const document: MarkdownBrowserDocument = {
        kind: "document",
        id: `${spec.kind}-${releaseCase.name}-document`,
        label: spec.title,
        path: `${spec.kind}-${releaseCase.name}.md`,
        source: markdown.source,
        diagrams: [markdown.resource],
      };
      let state = createMarkdownBrowserState({
        label: "Diagram references",
        entries: [document],
      }, { columns: 120, rows: 28 });
      const browserCapabilities = testTerminalCapabilities({
        columns: 120,
        colorDepth: "none",
        unicode: true,
      });
      state = transitionMarkdownBrowser(
        state,
        { kind: "key", key: { kind: "named", name: "enter" } },
        browserCapabilities,
      ).state;
      const browserDocument = markdownBrowserDocumentLines(
        state,
        browserCapabilities,
      ).join("\n");
      assertStringIncludes(browserDocument, spec.title);
      assertEquals(state.openedDocumentId, document.id);
    }
  }
});

Deno.test("Diagram Catalogue enrolls every generated release case", () => {
  const html = renderToStaticMarkup(<DiagramExamples />);
  for (const entry of diagramKindRegistry) {
    assertStringIncludes(html, `data-diagram-kind="${entry.meta.slug}"`);
    for (const releaseCase of entry.releaseCorpus.cases) {
      assertStringIncludes(html, `${releaseCase.name}:`);
      for (const posture of releaseCase.postures) {
        assertStringIncludes(html, posture);
      }
    }
  }
});
