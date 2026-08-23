import {
  assert,
  assertEquals,
  assertNotMatch,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { stripAnsi } from "../src/cli/ansi.ts";
import { renderDiagramCli, renderMarkdownCli } from "../src/cli/mod.ts";
import {
  createMarkdownBrowserState,
  type MarkdownBrowserDocument,
} from "../src/cli/interactive/markdown-browser-model.ts";
import { transitionMarkdownBrowser } from "../src/cli/interactive/markdown-browser-machine.ts";
import { requestMarkdownBrowser } from "../src/cli/interactive/markdown-browser-request.ts";
import {
  fitMarkdownBrowserState,
  markdownBrowserDocumentLines,
  markdownBrowserDocumentMaximumOffset,
  markdownBrowserLinkOccurrences,
} from "../src/cli/interactive/markdown-browser-renderer.ts";
import {
  FakeTerminalIO,
  testTerminalCapabilities,
} from "../src/cli/interactive/testing.ts";
import {
  MARKDOWN_BLOCK_KINDS,
  MarkdownParseError,
  parseMarkdown,
} from "../src/components/editorial/markdown/markdown.model.ts";
import {
  type MarkdownDiagramResource,
  renderDiagramMarkdownImage,
} from "../src/diagram/markdown.ts";
import { renderMarkdownCliProjection } from "../src/components/editorial/markdown/markdown.cli.ts";
import {
  describeDiagram,
  diagramAltText,
  type FlowDiagramSpec,
  renderDiagramSvg,
} from "../src/diagram/mod.ts";
import { Markdown } from "../src/react.ts";
import { markdownFixtures } from "../src/fixtures/markdown.ts";
import {
  markdownDiagramExampleAlt as markdownDiagramAlt,
  markdownDiagramExampleSpec as markdownDiagramSpec,
} from "../src/diagram/markdown.example.ts";

const markdownDiagramSource = "assets/review-change.svg";
const markdownDiagramMarkdown = [
  "# Change lifecycle",
  "",
  renderDiagramMarkdownImage({
    source: markdownDiagramSource,
    spec: markdownDiagramSpec,
  }),
  "",
  "Continue with the [review guide](guide.md#review).",
].join("\n");
const markdownDiagramResource = Object.freeze({
  source: markdownDiagramSource,
  spec: markdownDiagramSpec,
}) satisfies MarkdownDiagramResource;
const markdownDiagramSvg = renderDiagramSvg(markdownDiagramSpec);
const encodedMarkdownDiagramSource = markdownDiagramSource.replace(
  "review",
  "%72eview",
);

const wide = testTerminalCapabilities({
  columns: 80,
  colorDepth: "none",
  hyperlinks: false,
  unicode: true,
});

function imageMarkdown(
  alt = markdownDiagramAlt,
  title?: string,
  source = markdownDiagramSource,
): string {
  return `![${alt}](${source}${title === undefined ? "" : ` \"${title}\"`})`;
}

function diagramBlocks(source: string): number {
  return parseMarkdown(source, { diagrams: [markdownDiagramResource] }).children
    .filter((block) => block.kind === "diagram").length;
}

Deno.test("ordinary SVG, live React, and terminal Diagram share one typed source", () => {
  assertStringIncludes(
    markdownDiagramSvg,
    `<title>${markdownDiagramSpec.title}</title>`,
  );
  assertStringIncludes(markdownDiagramSvg, markdownDiagramSpec.summary);
  for (const relationship of ["draft to review", "review to approve"]) {
    assertStringIncludes(markdownDiagramSvg, relationship);
    assertStringIncludes(describeDiagram(markdownDiagramSpec), relationship);
  }

  const ordinaryHtml = renderToStaticMarkup(
    <Markdown source={markdownDiagramMarkdown} />,
  );
  assertStringIncludes(ordinaryHtml, `<img src="${markdownDiagramSource}"`);
  assertStringIncludes(ordinaryHtml, `alt="${markdownDiagramAlt}"`);
  assertNotMatch(ordinaryHtml, /<svg\b/u);

  const liveHtml = renderToStaticMarkup(
    <Markdown
      source={markdownDiagramMarkdown}
      diagrams={[markdownDiagramResource]}
    />,
  );
  assertStringIncludes(liveHtml, '<svg class="discern-diagram"');
  assertStringIncludes(liveHtml, `aria-label="${markdownDiagramAlt}"`);
  assertNotMatch(liveHtml, /<img\b/u);

  const ordinaryCli = stripAnsi(renderMarkdownCli(
    { source: markdownDiagramMarkdown },
    wide,
  ));
  assertStringIncludes(
    ordinaryCli,
    `Image: ${markdownDiagramAlt.slice(0, 36)}`,
  );
  assertStringIncludes(ordinaryCli, `(${markdownDiagramSource})`);
  const upgradedCli = stripAnsi(renderMarkdownCli(
    { source: markdownDiagramMarkdown, diagrams: [markdownDiagramResource] },
    wide,
  ));
  assertStringIncludes(upgradedCli, markdownDiagramSpec.title);
  assertStringIncludes(upgradedCli, "draft ──▸ review");
  assertNotMatch(upgradedCli, /Image:/u);

  assertEquals(
    renderMarkdownCli(
      {
        source: imageMarkdown(),
        diagrams: [markdownDiagramResource],
        diagramMode: "description",
      },
      wide,
    ),
    renderDiagramCli(
      { spec: markdownDiagramSpec, mode: "description", theme: "dark" },
      wide,
    ),
  );
});

Deno.test("diagram promotion is isolated, optional, repeatable, and order independent", () => {
  assertEquals(diagramBlocks(imageMarkdown()), 1);
  assertEquals(
    diagramBlocks(
      imageMarkdown(markdownDiagramAlt, markdownDiagramSpec.summary),
    ),
    1,
  );
  assertEquals(diagramBlocks(`${imageMarkdown()}\n\n${imageMarkdown()}`), 2);
  assertEquals(
    parseMarkdown(imageMarkdown(), {
      diagrams: [{
        source: encodedMarkdownDiagramSource,
        spec: markdownDiagramSpec,
      }],
    }).children[0]?.kind,
    "diagram",
  );
  for (
    const source of [
      `Before ${imageMarkdown()} after.`,
      `${imageMarkdown()} ${imageMarkdown()}`,
      `[${imageMarkdown()}](guide.md)`,
      imageMarkdown(markdownDiagramAlt, undefined, "assets/unregistered.svg"),
      imageMarkdown(markdownDiagramAlt, undefined, "javascript:run"),
    ]
  ) {
    assertEquals(diagramBlocks(source), 0, source);
  }

  const ordinary = parseMarkdown(imageMarkdown());
  assertEquals(parseMarkdown(imageMarkdown(), { diagrams: [] }), ordinary);
  assertEquals(
    parseMarkdown(imageMarkdown(), {
      diagrams: [{
        source: "assets/unused.svg",
        spec: markdownDiagramSpec,
      }],
    }),
    ordinary,
  );
  const unused = {
    source: "assets/unused.svg",
    spec: markdownDiagramSpec,
  } satisfies MarkdownDiagramResource;
  assertEquals(
    parseMarkdown(imageMarkdown(), {
      diagrams: [unused, markdownDiagramResource],
    }),
    parseMarkdown(imageMarkdown(), {
      diagrams: [markdownDiagramResource, unused],
    }),
  );

  const shared = createMarkdownBrowserState({
    label: "Documents",
    entries: ["one", "two"].map((id) => ({
      kind: "document" as const,
      id,
      label: id,
      path: `${id}.md`,
      source: imageMarkdown(),
      diagrams: [markdownDiagramResource],
    })),
  }, { columns: 80, rows: 24 });
  for (const entry of shared.entries) {
    assert(entry.kind === "document");
    assert(Object.isFrozen(entry.diagrams));
    assertEquals(entry.diagrams?.[0]?.source, markdownDiagramSource);
  }
});

Deno.test("every pre-diagram fixture is byte and structure identical without resources", () => {
  for (const fixture of markdownFixtures) {
    assertEquals(
      parseMarkdown(fixture.source, { diagrams: [] }),
      parseMarkdown(fixture.source),
      fixture.id,
    );
    assertEquals(
      renderToStaticMarkup(<Markdown source={fixture.source} diagrams={[]} />),
      renderToStaticMarkup(<Markdown source={fixture.source} />),
      fixture.id,
    );
    assertEquals(
      renderMarkdownCli({ source: fixture.source, diagrams: [] }, wide),
      renderMarkdownCli({ source: fixture.source }, wide),
      fixture.id,
    );
  }
});

Deno.test("diagram resources reject duplicate, unsafe, malformed, and invalid data", () => {
  assertThrows(
    () =>
      parseMarkdown(imageMarkdown(), {
        diagrams: [
          markdownDiagramResource,
          {
            source: encodedMarkdownDiagramSource,
            spec: markdownDiagramSpec,
          },
        ],
      }),
    MarkdownParseError,
    "duplicate source",
  );
  for (const source of ["javascript:run()", "bad\\path.svg", "%00.svg"]) {
    assertThrows(
      () =>
        parseMarkdown("", {
          diagrams: [{ source, spec: markdownDiagramSpec }],
        }),
      MarkdownParseError,
      "safe Markdown image URL reference",
    );
  }
  const invalid = {
    ...markdownDiagramSpec,
    nodes: [],
  } as unknown as FlowDiagramSpec;
  assertThrows(
    () =>
      parseMarkdown(imageMarkdown(), {
        diagrams: [{ source: markdownDiagramSource, spec: invalid }],
      }),
    MarkdownParseError,
    "invalid DiagramSpec",
  );
  const controlBearing = {
    ...markdownDiagramSpec,
    summary: "Unsafe\u0000summary",
  } satisfies FlowDiagramSpec;
  assertThrows(
    () =>
      parseMarkdown(imageMarkdown(), {
        diagrams: [{ source: markdownDiagramSource, spec: controlBearing }],
      }),
    MarkdownParseError,
    "invalid DiagramSpec",
  );
  const resourceWithExtra = {
    ...markdownDiagramResource,
    terminal: "pre-rendered",
  } as unknown as MarkdownDiagramResource;
  assertThrows(
    () => parseMarkdown("", { diagrams: [resourceWithExtra] }),
    MarkdownParseError,
    "exactly source and spec",
  );
  const sparse = new Array<MarkdownDiagramResource>(1);
  assertThrows(
    () => parseMarkdown("", { diagrams: sparse }),
    MarkdownParseError,
    "dense data array",
  );
  const accessor = [markdownDiagramResource];
  Object.defineProperty(accessor, "0", {
    enumerable: true,
    get: () => markdownDiagramResource,
  });
  assertThrows(
    () => parseMarkdown("", { diagrams: accessor }),
    MarkdownParseError,
    "dense data array",
  );

  const revoked = Proxy.revocable([markdownDiagramResource], {});
  revoked.revoke();
  assertThrows(
    () => parseMarkdown("", { diagrams: revoked.proxy }),
    MarkdownParseError,
    "inspected safely",
  );
  const hostileContainer = new Proxy([markdownDiagramResource], {
    ownKeys: () => {
      throw new Error("ambient ownKeys trap");
    },
  });
  assertThrows(
    () => parseMarkdown("", { diagrams: hostileContainer }),
    MarkdownParseError,
    "inspected safely",
  );

  const descriptorCounts = new Map<PropertyKey, number>();
  const statefulSpec = new Proxy(markdownDiagramSpec, {
    getOwnPropertyDescriptor(target, key) {
      const count = (descriptorCounts.get(key) ?? 0) + 1;
      descriptorCounts.set(key, count);
      if (count > 1) throw new Error("post-validation reread");
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  assertEquals(
    parseMarkdown(imageMarkdown(), {
      diagrams: [{ source: markdownDiagramSource, spec: statefulSpec }],
    }).children[0]?.kind,
    "diagram",
  );
  assert([...descriptorCounts.values()].every((count) => count === 1));
});

Deno.test("standard Markdown serialization preserves delimiter-bearing diagram facts", () => {
  const spec = {
    ...markdownDiagramSpec,
    title: String.raw`Review [stage](javascript:run) \\ path`,
    summary: String.raw`Choose "accept" (or return) without changing syntax.`,
  } satisfies FlowDiagramSpec;
  const resource = {
    source: "assets/review(change).svg",
    spec,
  } satisfies MarkdownDiagramResource;
  const source = renderDiagramMarkdownImage(resource);
  const ordinary = parseMarkdown(source);
  const paragraph = ordinary.children[0];
  assertEquals(paragraph?.kind, "paragraph");
  const image = (paragraph as {
    readonly content: readonly {
      readonly alt?: string;
      readonly source?: string;
      readonly title?: string;
    }[];
  }).content[0];
  assertEquals(image?.alt, diagramAltText(spec));
  assertEquals(image?.title, spec.summary);
  assertEquals(image?.source, resource.source);
  assertEquals(
    parseMarkdown(source, { diagrams: [resource] }).children[0]?.kind,
    "diagram",
  );
  const ordinaryHtml = renderToStaticMarkup(<Markdown source={source} />);
  assertStringIncludes(
    ordinaryHtml,
    `alt="${
      diagramAltText(spec).replaceAll("&", "&amp;").replaceAll('"', "&quot;")
    }"`,
  );
  const upgraded = renderToStaticMarkup(
    <Markdown source={source} diagrams={[resource]} />,
  );
  assertStringIncludes(upgraded, 'data-discern-diagram-kind="flow"');

  assertThrows(
    () =>
      renderDiagramMarkdownImage({
        source: "javascript:run",
        spec,
      }),
    TypeError,
    "safe image URL reference",
  );
});

Deno.test("matching image accessibility drift rejects every caller before output", async () => {
  for (
    const source of [
      imageMarkdown("Wrong alternative"),
      imageMarkdown("", markdownDiagramSpec.summary),
      imageMarkdown(markdownDiagramAlt, "Wrong summary"),
    ]
  ) {
    assertThrows(
      () =>
        renderToStaticMarkup(
          <Markdown source={source} diagrams={[markdownDiagramResource]} />,
        ),
      MarkdownParseError,
    );
    assertThrows(
      () =>
        renderMarkdownCli(
          { source, diagrams: [markdownDiagramResource] },
          wide,
        ),
      MarkdownParseError,
    );
    const io = new FakeTerminalIO([], {
      columns: 80,
      rows: 24,
      colorDepth: "none",
    });
    await assertRejects(
      () =>
        requestMarkdownBrowser({
          label: "Documents",
          entries: [{
            kind: "document",
            id: "diagram",
            label: "Diagram",
            path: "diagram.md",
            source,
            diagrams: [markdownDiagramResource],
          }],
        }, { io }),
      MarkdownParseError,
    );
    assertEquals(io.writes, []);
    assertEquals(io.rawTransitions, []);
  }
});

Deno.test("hostile spec text stays escaped after canonical accessibility matching", () => {
  const spec = {
    ...markdownDiagramSpec,
    title: "<script>Review & approve</script>",
    summary: "A <foreignObject> remains inert text.",
  } satisfies FlowDiagramSpec;
  const alt = diagramAltText(spec);
  const resource = { source: "assets/hostile.svg", spec } as const;
  const html = renderToStaticMarkup(
    <Markdown
      source={imageMarkdown(alt, spec.summary, resource.source)}
      diagrams={[resource]}
    />,
  );
  assertStringIncludes(
    html,
    "&lt;script&gt;Review &amp; approve&lt;/script&gt;",
  );
  assertNotMatch(html, /<(?:script|foreignObject)\b/iu);
});

Deno.test("browser reflow changes Diagram posture while preserving later links and reachability", () => {
  const document: MarkdownBrowserDocument = {
    kind: "document",
    id: "diagram",
    label: "Diagram",
    path: "guides/diagram.md",
    source: markdownDiagramMarkdown,
    diagrams: [markdownDiagramResource],
  };
  let state = createMarkdownBrowserState({
    label: "Documents",
    entries: [document],
  }, { columns: 120, rows: 30 });
  state = transitionMarkdownBrowser(
    state,
    { kind: "key", key: { kind: "named", name: "enter" } },
    testTerminalCapabilities({ columns: 120 }),
  ).state;
  const wideLines = markdownBrowserDocumentLines(
    state,
    testTerminalCapabilities({ columns: 120 }),
  );
  const widePlain = stripAnsi(wideLines.join("\n"));
  assertStringIncludes(widePlain, "┌ Review a change");
  const wideLinks = markdownBrowserLinkOccurrences(
    state,
    testTerminalCapabilities({ columns: 120 }),
  );
  assertEquals(wideLinks.map((link) => link.destination), ["guide.md#review"]);

  state = transitionMarkdownBrowser(
    state,
    { kind: "key", key: { kind: "text", text: "]" } },
    testTerminalCapabilities({ columns: 120 }),
  ).state;
  assert(wideLinks.some((link) => link.id === state.linkFocus?.id));

  state = transitionMarkdownBrowser(
    state,
    { kind: "resize", columns: 32, rows: 30 },
    testTerminalCapabilities({ columns: 32 }),
  ).state;
  const narrowCapabilities = testTerminalCapabilities({ columns: 32 });
  const narrowLines = markdownBrowserDocumentLines(state, narrowCapabilities);
  const narrowPlain = stripAnsi(narrowLines.join("\n"));
  assertStringIncludes(narrowPlain, "Title: Review a change");
  assert(narrowLines.length > wideLines.length);
  const narrowLinks = markdownBrowserLinkOccurrences(state, narrowCapabilities);
  assertEquals(narrowLinks.map((link) => link.destination), [
    "guide.md#review",
  ]);
  assert(narrowLinks[0]!.documentStartRow <= narrowLines.length);
  assertEquals(
    narrowLinks.find((link) => link.id === state.linkFocus?.id)?.visibility,
    "visible",
  );
  assert(
    markdownBrowserDocumentMaximumOffset(state, narrowCapabilities) >= 0,
  );
  assertEquals(state.openedDocumentId, "diagram");
  assertEquals(state.focusedPane, "document");

  state = transitionMarkdownBrowser(
    state,
    { kind: "resize", columns: 120, rows: 30 },
    testTerminalCapabilities({ columns: 120 }),
  ).state;
  assertEquals(
    markdownBrowserLinkOccurrences(
      state,
      testTerminalCapabilities({ columns: 120 }),
    ).find((link) => link.id === state.linkFocus?.id)?.visibility,
    "visible",
  );

  const stale = createMarkdownBrowserState({
    label: "Documents",
    entries: [document],
    initialState: {
      query: "",
      queryCursor: 0,
      highlightedId: "diagram",
      openedDocumentId: "diagram",
      focusedPane: "document",
      pickerVisibleStart: 0,
      documentScrollOffset: 0,
      linkFocus: { id: "diagram:missing", origin: "keyboard" },
    },
  }, { columns: 120, rows: 30 });
  assertEquals(
    fitMarkdownBrowserState(
      stale,
      testTerminalCapabilities({ columns: 120 }),
    ).linkFocus,
    undefined,
  );
});

Deno.test("diagram blocks remain enrolled in both exhaustive projections", () => {
  assert(MARKDOWN_BLOCK_KINDS.includes("diagram"));
  const projected = renderMarkdownCliProjection(
    {
      source: `${imageMarkdown()}\n\n[After](after.md)`,
      diagrams: [markdownDiagramResource],
    },
    wide,
  );
  assertEquals(projected.links.map(({ destination }) => destination), [
    "after.md",
  ]);
  assertEquals(projected.headings, []);

  const ordinary = renderMarkdownCliProjection(
    { source: markdownDiagramMarkdown },
    wide,
  );
  const upgraded = renderMarkdownCliProjection(
    { source: markdownDiagramMarkdown, diagrams: [markdownDiagramResource] },
    wide,
  );
  assertEquals(upgraded.links, ordinary.links);
  assertEquals(upgraded.headings, ordinary.headings);
});
