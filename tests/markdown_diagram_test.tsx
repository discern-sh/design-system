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
  type MarkdownBrowserDocument,
  requestMarkdownBrowser,
} from "../src/cli/interactive/mod.ts";
import { markdownBrowserApplication } from "../src/cli/interactive/markdown-browser-request.ts";
import { projectMarkdownReading } from "../src/cli/interactive/application/markdown-reading.ts";
import {
  documentReader,
  keyframes,
  onTop,
  scrollToTop,
} from "./fixtures/markdown-reader.ts";
import {
  enqueueTerminalEvents,
  FakeTerminalIO,
  testTerminalCapabilities,
} from "../src/cli/interactive/testing.ts";
import { InteractionCancelled } from "../src/cli/interactive/errors.ts";
import {
  ENTER_TERMINAL_ALTERNATE_SCREEN,
  LEAVE_TERMINAL_ALTERNATE_SCREEN,
} from "../src/cli/interactive/lifecycle.ts";
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
const markdownDiagramPostureMarkdown = [
  "# Diagram threshold postures",
  ...Array.from(
    { length: 14 },
    (_, index) =>
      `Before landmark ${index + 1}: preparation remains reachable.`,
  ),
  renderDiagramMarkdownImage(markdownDiagramResource),
  ...Array.from(
    { length: 14 },
    (_, index) => `After landmark ${index + 1}: follow-up remains reachable.`,
  ),
  "Continue with the [review guide](guide.md#review).",
].join("\n\n");
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

  // One resource serves every document of a browser's corpus.
  const { controller } = markdownBrowserApplication({
    label: "Documents",
    entries: ["one", "two"].map((id) => ({
      kind: "document" as const,
      id,
      label: id,
      path: `${id}.md`,
      source: imageMarkdown(),
      diagrams: [markdownDiagramResource],
    })),
  }, { respond: () => undefined, closing: () => {} });
  assertEquals(controller.corpus.documents.map(({ id }) => id), [
    "one",
    "two",
  ]);
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
  const markdown = {
    kind: "markdown",
    source: markdownDiagramMarkdown,
    diagrams: [markdownDiagramResource],
  } as const;
  const wideReading = projectMarkdownReading(
    markdown,
    116,
    testTerminalCapabilities({ columns: 116 }),
    {},
  );
  assertStringIncludes(
    stripAnsi(wideReading.lines.join("\n")),
    "┌ Review a change",
  );
  assertEquals(wideReading.links.map((link) => link.destination), [
    "guide.md#review",
  ]);
  const narrowReading = projectMarkdownReading(
    markdown,
    28,
    testTerminalCapabilities({ columns: 28 }),
    {},
  );
  const narrowPlain = stripAnsi(narrowReading.lines.join("\n"));
  assertStringIncludes(narrowPlain, "Title: Review a change");
  assert(narrowReading.lines.length > wideReading.lines.length);
  assertEquals(narrowReading.links.map((link) => link.destination), [
    "guide.md#review",
  ]);
  assert(
    (narrowReading.links[0]?.endRow ?? Infinity) < narrowReading.lines.length,
  );

  const document: MarkdownBrowserDocument = {
    kind: "document",
    id: "diagram",
    label: "Diagram",
    path: "guides/diagram.md",
    source: markdownDiagramMarkdown,
    diagrams: [markdownDiagramResource],
  };
  const { preview } = documentReader(document, 120, 30);
  preview.key("tab");
  for (const columns of [120, 32, 120]) {
    preview.resize(columns);
    assertEquals(
      preview.state.readingFocus,
      { "document:diagram": "link-0" },
      `focus survives ${columns} columns`,
    );
    assertStringIncludes(
      preview.text,
      "›review",
      `the focused link is on screen at ${columns} columns`,
    );
  }
  const stale = documentReader(document, 120, 30, {
    history: [{ kind: "document", id: "diagram" }],
    links: { diagram: "link-9" },
  });
  assertEquals(stale.preview.state.readingFocus, {});
});

Deno.test("browser reflow preserves reader position above, within, and below Diagram", () => {
  const document: MarkdownBrowserDocument = {
    kind: "document",
    id: "diagram-postures",
    label: "Diagram postures",
    path: "guides/diagram-postures.md",
    source: markdownDiagramPostureMarkdown,
    diagrams: [markdownDiagramResource],
  };
  for (
    const anchor of [
      "Before landmark 8",
      "Review a change",
      "After landmark 4",
    ]
  ) {
    const { preview, controller } = documentReader(document, 120, 18);
    scrollToTop(preview, anchor);
    const resumed = documentReader(
      document,
      120,
      18,
      controller.resumable(preview.state),
    ).preview;
    assert(onTop(resumed, anchor), `${anchor} resumes in place`);
    for (const columns of [32, 120]) {
      preview.resize(columns);
      assert(
        onTop(preview, anchor),
        `${anchor} stays on top at ${columns} columns\n${preview.text}`,
      );
    }
    preview.key("end", "shift-tab");
    assertEquals(preview.state.readingFocus, {
      "document:diagram-postures": "link-0",
    });
    assertStringIncludes(preview.text, "›review");
  }
});

Deno.test("live Diagram threshold resizes repaint exact frames and restore the terminal", async () => {
  const io = new FakeTerminalIO([], {
    columns: 120,
    rows: 18,
    colorDepth: "truecolor",
    holdOpen: true,
  });
  enqueueTerminalEvents(io, [
    { kind: "keys", keys: ["enter"] },
    { kind: "resize", columns: 32, rows: 18 },
    { kind: "keys", keys: ["page-down"] },
    { kind: "resize", columns: 120, rows: 18 },
    { kind: "keys", keys: ["ctrl-c"] },
  ]);
  const result = await requestMarkdownBrowser({
    label: "Documents",
    entries: [{
      kind: "document",
      id: "diagram",
      label: "Diagram",
      path: "guides/diagram.md",
      source: markdownDiagramMarkdown,
      diagrams: [markdownDiagramResource],
    }],
  }, { io }).catch((error) => error);
  assert(result instanceof InteractionCancelled);
  assertEquals(result.reason, "Cancelled.");
  const frames = keyframes(io.output());
  assert(
    frames.some((rows) => rows.join("\n").includes("┌ Review a change")),
    "a wide frame uses the enhanced projector",
  );
  assert(
    frames.some((rows) => rows.join("\n").includes("Title: Review a change")),
    "a narrow frame uses the complete description",
  );
  assert(
    frames.every((rows) => rows.length === 18),
    "every resize paints a whole frame",
  );
  assertEquals(io.writes[0], ENTER_TERMINAL_ALTERNATE_SCREEN);
  assertEquals(io.writes.at(-1), LEAVE_TERMINAL_ALTERNATE_SCREEN);
  assertEquals(io.rawTransitions, [true, false]);
  assertEquals(io.resizeListenerCount, 0);
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
