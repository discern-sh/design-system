import {
  assert,
  assertEquals,
  assertMatch,
  assertNotMatch,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { stripAnsi } from "../src/cli/ansi.ts";
import { renderChartCli, renderMarkdownCli } from "../src/cli/mod.ts";
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
  type MarkdownChartResource,
  renderChartMarkdownImage,
} from "../src/chart/markdown.ts";
import { renderMarkdownCliProjection } from "../src/components/editorial/markdown/markdown.cli.ts";
import {
  type BarChartSpec,
  chartAltText,
  describeChart,
  renderChartSvg,
} from "../src/chart/mod.ts";
import { Markdown } from "../src/react.ts";
import { markdownFixtures } from "../src/fixtures/markdown.ts";
import { markdownChartExampleSpec as markdownChartSpec } from "../src/chart/markdown.example.ts";
import { markdownDiagramExampleSpec } from "../src/diagram/markdown.example.ts";
import { chartKindRegistry } from "../src/generated/chart-registry.ts";
import type { ChartSpec } from "../src/generated/chart-spec.ts";

const markdownChartAlt = chartAltText(markdownChartSpec);
const markdownChartSource = "assets/reviews-by-weekday.svg";
const markdownChartMarkdown = [
  "# Review throughput",
  "",
  renderChartMarkdownImage({
    source: markdownChartSource,
    spec: markdownChartSpec,
  }),
  "",
  "Continue with the [review guide](guide.md#review).",
].join("\n");
const markdownChartResource = Object.freeze({
  source: markdownChartSource,
  spec: markdownChartSpec,
}) satisfies MarkdownChartResource;
const markdownChartPostureMarkdown = [
  "# Chart threshold postures",
  ...Array.from(
    { length: 14 },
    (_, index) =>
      `Before landmark ${index + 1}: preparation remains reachable.`,
  ),
  renderChartMarkdownImage(markdownChartResource),
  ...Array.from(
    { length: 14 },
    (_, index) => `After landmark ${index + 1}: follow-up remains reachable.`,
  ),
  "Continue with the [review guide](guide.md#review).",
].join("\n\n");
const markdownChartSvg = renderChartSvg(markdownChartSpec);
const encodedMarkdownChartSource = markdownChartSource.replace(
  "reviews",
  "%72eviews",
);

const wide = testTerminalCapabilities({
  columns: 80,
  colorDepth: "none",
  hyperlinks: false,
  unicode: true,
});

function imageMarkdown(
  alt = markdownChartAlt,
  title?: string,
  source = markdownChartSource,
): string {
  return `![${alt}](${source}${title === undefined ? "" : ` "${title}"`})`;
}

function chartBlocks(source: string): number {
  return parseMarkdown(source, { charts: [markdownChartResource] }).children
    .filter((block) => block.kind === "chart").length;
}

Deno.test("ordinary SVG, live React, and terminal Chart share one typed source", () => {
  assertStringIncludes(
    markdownChartSvg,
    `<title>${markdownChartSpec.title}</title>`,
  );
  assertStringIncludes(markdownChartSvg, markdownChartSpec.summary);
  const description = describeChart(markdownChartSpec);
  for (
    const fact of ["Monday (mon): Completed 4", "Wednesday (wed): Completed 9"]
  ) {
    assertStringIncludes(description, fact);
  }

  const ordinaryHtml = renderToStaticMarkup(
    <Markdown source={markdownChartMarkdown} />,
  );
  assertStringIncludes(ordinaryHtml, `<img src="${markdownChartSource}"`);
  assertStringIncludes(ordinaryHtml, `alt="${markdownChartAlt}"`);
  assertNotMatch(ordinaryHtml, /<svg\b/u);

  const liveHtml = renderToStaticMarkup(
    <Markdown
      source={markdownChartMarkdown}
      charts={[markdownChartResource]}
    />,
  );
  assertStringIncludes(liveHtml, '<svg class="discern-chart"');
  assertStringIncludes(liveHtml, `aria-label="${markdownChartAlt}"`);
  assertNotMatch(liveHtml, /<img\b/u);

  const ordinaryCli = stripAnsi(renderMarkdownCli(
    { source: markdownChartMarkdown },
    wide,
  ));
  assertStringIncludes(
    ordinaryCli,
    `Image: ${markdownChartAlt.slice(0, 36)}`,
  );
  assertStringIncludes(ordinaryCli, `(${markdownChartSource})`);
  const upgradedCli = stripAnsi(renderMarkdownCli(
    { source: markdownChartMarkdown, charts: [markdownChartResource] },
    wide,
  ));
  assertStringIncludes(upgradedCli, markdownChartSpec.title);
  assertStringIncludes(upgradedCli, "Wednesday");
  assertStringIncludes(upgradedCli, "9");
  assertNotMatch(upgradedCli, /Image:/u);

  assertEquals(
    renderMarkdownCli(
      {
        source: imageMarkdown(),
        charts: [markdownChartResource],
        chartMode: "description",
      },
      wide,
    ),
    renderChartCli(
      { spec: markdownChartSpec, mode: "description", theme: "dark" },
      wide,
    ),
  );
});

Deno.test("chart promotion is isolated, optional, repeatable, and order independent", () => {
  assertEquals(chartBlocks(imageMarkdown()), 1);
  assertEquals(
    chartBlocks(
      imageMarkdown(markdownChartAlt, markdownChartSpec.summary),
    ),
    1,
  );
  assertEquals(chartBlocks(`${imageMarkdown()}\n\n${imageMarkdown()}`), 2);
  assertEquals(
    parseMarkdown(imageMarkdown(), {
      charts: [{
        source: encodedMarkdownChartSource,
        spec: markdownChartSpec,
      }],
    }).children[0]?.kind,
    "chart",
  );
  for (
    const source of [
      `Before ${imageMarkdown()} after.`,
      `${imageMarkdown()} ${imageMarkdown()}`,
      `[${imageMarkdown()}](guide.md)`,
      imageMarkdown(markdownChartAlt, undefined, "assets/unregistered.svg"),
      imageMarkdown(markdownChartAlt, undefined, "javascript:run"),
    ]
  ) {
    assertEquals(chartBlocks(source), 0, source);
  }

  const ordinary = parseMarkdown(imageMarkdown());
  assertEquals(parseMarkdown(imageMarkdown(), { charts: [] }), ordinary);
  assertEquals(
    parseMarkdown(imageMarkdown(), {
      charts: [{
        source: "assets/unused.svg",
        spec: markdownChartSpec,
      }],
    }),
    ordinary,
  );
  const unused = {
    source: "assets/unused.svg",
    spec: markdownChartSpec,
  } satisfies MarkdownChartResource;
  assertEquals(
    parseMarkdown(imageMarkdown(), {
      charts: [unused, markdownChartResource],
    }),
    parseMarkdown(imageMarkdown(), {
      charts: [markdownChartResource, unused],
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
      charts: [markdownChartResource],
    })),
  }, { respond: () => undefined, closing: () => {} });
  assertEquals(controller.corpus.documents.map(({ id }) => id), [
    "one",
    "two",
  ]);
});

Deno.test("every pre-chart fixture is byte and structure identical without resources", () => {
  for (const fixture of markdownFixtures) {
    assertEquals(
      parseMarkdown(fixture.source, { charts: [] }),
      parseMarkdown(fixture.source),
      fixture.id,
    );
    assertEquals(
      renderToStaticMarkup(<Markdown source={fixture.source} charts={[]} />),
      renderToStaticMarkup(<Markdown source={fixture.source} />),
      fixture.id,
    );
    assertEquals(
      renderMarkdownCli({ source: fixture.source, charts: [] }, wide),
      renderMarkdownCli({ source: fixture.source }, wide),
      fixture.id,
    );
  }
});

Deno.test("chart resources reject duplicate, cross-family, unsafe, malformed, and invalid data", () => {
  assertThrows(
    () =>
      parseMarkdown(imageMarkdown(), {
        charts: [
          markdownChartResource,
          {
            source: encodedMarkdownChartSource,
            spec: markdownChartSpec,
          },
        ],
      }),
    MarkdownParseError,
    "duplicate source",
  );
  assertThrows(
    () =>
      parseMarkdown("", {
        diagrams: [{
          source: markdownChartSource,
          spec: markdownDiagramExampleSpec,
        }],
        charts: [markdownChartResource],
      }),
    MarkdownParseError,
    "diagram and chart resources contain duplicate source",
  );
  assertThrows(
    () =>
      parseMarkdown("", {
        diagrams: [{
          source: encodedMarkdownChartSource,
          spec: markdownDiagramExampleSpec,
        }],
        charts: [markdownChartResource],
      }),
    MarkdownParseError,
    "diagram and chart resources contain duplicate source",
  );
  for (const source of ["javascript:run()", "bad\\path.svg", "%00.svg"]) {
    assertThrows(
      () =>
        parseMarkdown("", {
          charts: [{ source, spec: markdownChartSpec }],
        }),
      MarkdownParseError,
      "safe Markdown image URL reference",
    );
  }
  const invalid = {
    ...markdownChartSpec,
    series: [],
  } as unknown as BarChartSpec;
  assertThrows(
    () =>
      parseMarkdown(imageMarkdown(), {
        charts: [{ source: markdownChartSource, spec: invalid }],
      }),
    MarkdownParseError,
    "invalid ChartSpec",
  );
  const negative = {
    ...markdownChartSpec,
    series: [{ id: "completed", label: "Completed", values: [4, -9, 6] }],
  } satisfies BarChartSpec;
  assertThrows(
    () =>
      parseMarkdown(imageMarkdown(), {
        charts: [{ source: markdownChartSource, spec: negative }],
      }),
    MarkdownParseError,
    "invalid ChartSpec",
  );
  const controlBearing = {
    ...markdownChartSpec,
    summary: "Unsafe\u0000summary",
  } satisfies BarChartSpec;
  assertThrows(
    () =>
      parseMarkdown(imageMarkdown(), {
        charts: [{ source: markdownChartSource, spec: controlBearing }],
      }),
    MarkdownParseError,
    "invalid ChartSpec",
  );
  const resourceWithExtra = {
    ...markdownChartResource,
    terminal: "pre-rendered",
  } as unknown as MarkdownChartResource;
  assertThrows(
    () => parseMarkdown("", { charts: [resourceWithExtra] }),
    MarkdownParseError,
    "exactly source and spec",
  );
  const sparse = new Array<MarkdownChartResource>(1);
  assertThrows(
    () => parseMarkdown("", { charts: sparse }),
    MarkdownParseError,
    "dense data array",
  );
  const accessor = [markdownChartResource];
  Object.defineProperty(accessor, "0", {
    enumerable: true,
    get: () => markdownChartResource,
  });
  assertThrows(
    () => parseMarkdown("", { charts: accessor }),
    MarkdownParseError,
    "dense data array",
  );

  const revoked = Proxy.revocable([markdownChartResource], {});
  revoked.revoke();
  assertThrows(
    () => parseMarkdown("", { charts: revoked.proxy }),
    MarkdownParseError,
    "inspected safely",
  );
  const hostileContainer = new Proxy([markdownChartResource], {
    ownKeys: () => {
      throw new Error("ambient ownKeys trap");
    },
  });
  assertThrows(
    () => parseMarkdown("", { charts: hostileContainer }),
    MarkdownParseError,
    "inspected safely",
  );

  const descriptorCounts = new Map<PropertyKey, number>();
  const statefulSpec = new Proxy(markdownChartSpec, {
    getOwnPropertyDescriptor(target, key) {
      const count = (descriptorCounts.get(key) ?? 0) + 1;
      descriptorCounts.set(key, count);
      if (count > 1) throw new Error("post-validation reread");
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  assertEquals(
    parseMarkdown(imageMarkdown(), {
      charts: [{ source: markdownChartSource, spec: statefulSpec }],
    }).children[0]?.kind,
    "chart",
  );
  assert([...descriptorCounts.values()].every((count) => count === 1));
});

Deno.test("standard Markdown serialization preserves delimiter-bearing chart facts", () => {
  const spec = {
    ...markdownChartSpec,
    title: String.raw`Review [stage](javascript:run) \\ path`,
    summary: String.raw`Choose "accept" (or return) without changing syntax.`,
  } satisfies BarChartSpec;
  const resource = {
    source: "assets/review(change).svg",
    spec,
  } satisfies MarkdownChartResource;
  const source = renderChartMarkdownImage(resource);
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
  assertEquals(image?.alt, chartAltText(spec));
  assertEquals(image?.title, spec.summary);
  assertEquals(image?.source, resource.source);
  assertEquals(
    parseMarkdown(source, { charts: [resource] }).children[0]?.kind,
    "chart",
  );
  const ordinaryHtml = renderToStaticMarkup(<Markdown source={source} />);
  assertStringIncludes(
    ordinaryHtml,
    `alt="${
      chartAltText(spec).replaceAll("&", "&amp;").replaceAll('"', "&quot;")
    }"`,
  );
  const upgraded = renderToStaticMarkup(
    <Markdown source={source} charts={[resource]} />,
  );
  assertStringIncludes(upgraded, 'data-discern-chart-kind="bar"');

  assertThrows(
    () =>
      renderChartMarkdownImage({
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
      imageMarkdown("", markdownChartSpec.summary),
      imageMarkdown(markdownChartAlt, "Wrong summary"),
    ]
  ) {
    assertThrows(
      () =>
        renderToStaticMarkup(
          <Markdown source={source} charts={[markdownChartResource]} />,
        ),
      MarkdownParseError,
    );
    assertThrows(
      () =>
        renderMarkdownCli(
          { source, charts: [markdownChartResource] },
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
            id: "chart",
            label: "Chart",
            path: "chart.md",
            source,
            charts: [markdownChartResource],
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
    ...markdownChartSpec,
    title: "<script>Review & approve</script>",
    summary: "A <foreignObject> remains inert text.",
  } satisfies BarChartSpec;
  const alt = chartAltText(spec);
  const resource = { source: "assets/hostile.svg", spec } as const;
  const html = renderToStaticMarkup(
    <Markdown
      source={imageMarkdown(alt, spec.summary, resource.source)}
      charts={[resource]}
    />,
  );
  assertStringIncludes(
    html,
    "&lt;script&gt;Review &amp; approve&lt;/script&gt;",
  );
  assertNotMatch(html, /<(?:script|foreignObject)\b/iu);
  const frame = stripAnsi(renderMarkdownCli(
    {
      source: imageMarkdown(alt, spec.summary, resource.source),
      charts: [resource],
      chartMode: "description",
    },
    wide,
  ));
  assertStringIncludes(frame, "<script>Review & approve</script>");
});

Deno.test("browser reflow changes Chart posture while preserving later links and reachability", () => {
  const markdown = {
    kind: "markdown",
    source: markdownChartMarkdown,
    charts: [markdownChartResource],
  } as const;
  const wideReading = projectMarkdownReading(
    markdown,
    116,
    testTerminalCapabilities({ columns: 116 }),
    {},
  );
  assertStringIncludes(
    stripAnsi(wideReading.lines.join("\n")),
    "┌ Reviews completed by weekday",
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
  assertStringIncludes(narrowPlain, "Title: Reviews completed by");
  assertMatch(narrowPlain, /│\s*9\s*│/u);
  assert(narrowReading.lines.length > wideReading.lines.length);
  assertEquals(narrowReading.links.map((link) => link.destination), [
    "guide.md#review",
  ]);
  assert(
    (narrowReading.links[0]?.endRow ?? Infinity) < narrowReading.lines.length,
  );

  const document: MarkdownBrowserDocument = {
    kind: "document",
    id: "chart",
    label: "Chart",
    path: "guides/chart.md",
    source: markdownChartMarkdown,
    charts: [markdownChartResource],
  };
  const { preview } = documentReader(document, 120, 30);
  preview.key("tab");
  for (const columns of [120, 32, 120]) {
    preview.resize(columns);
    assertEquals(
      preview.state.readingFocus,
      { "document:chart": "link-0" },
      `focus survives ${columns} columns`,
    );
    assertStringIncludes(
      preview.text,
      "›review",
      `the focused link is on screen at ${columns} columns`,
    );
  }
  const stale = documentReader(document, 120, 30, {
    history: [{ kind: "document", id: "chart" }],
    links: { chart: "link-9" },
  });
  assertEquals(stale.preview.state.readingFocus, {});
});

Deno.test("browser reflow preserves reader position above, within, and below Chart", () => {
  const document: MarkdownBrowserDocument = {
    kind: "document",
    id: "chart-postures",
    label: "Chart postures",
    path: "guides/chart-postures.md",
    source: markdownChartPostureMarkdown,
    charts: [markdownChartResource],
  };
  for (
    const anchor of [
      "Before landmark 8",
      "Reviews completed by",
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
      "document:chart-postures": "link-0",
    });
    assertStringIncludes(preview.text, "›review");
  }
});

Deno.test("live Chart threshold resizes repaint exact frames and restore the terminal", async () => {
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
      id: "chart",
      label: "Chart",
      path: "guides/chart.md",
      source: markdownChartMarkdown,
      charts: [markdownChartResource],
    }],
  }, { io }).catch((error) => error);
  assert(result instanceof InteractionCancelled);
  assertEquals(result.reason, "Cancelled.");
  const frames = keyframes(io.output());
  assert(
    frames.some((rows) =>
      rows.join("\n").includes("┌ Reviews completed by weekday")
    ),
    "a wide frame uses the enhanced projector",
  );
  assert(
    frames.some((rows) =>
      rows.join("\n").includes("Title: Reviews completed by")
    ),
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

Deno.test("chart blocks remain enrolled in both exhaustive projections", () => {
  assert(MARKDOWN_BLOCK_KINDS.includes("chart"));
  const projected = renderMarkdownCliProjection(
    {
      source: `${imageMarkdown()}\n\n[After](after.md)`,
      charts: [markdownChartResource],
    },
    wide,
  );
  assertEquals(projected.links.map(({ destination }) => destination), [
    "after.md",
  ]);
  assertEquals(projected.headings, []);

  const ordinary = renderMarkdownCliProjection(
    { source: markdownChartMarkdown },
    wide,
  );
  const upgraded = renderMarkdownCliProjection(
    { source: markdownChartMarkdown, charts: [markdownChartResource] },
    wide,
  );
  assertEquals(upgraded.links, ordinary.links);
  assertEquals(upgraded.headings, ordinary.headings);
});

Deno.test("every registered kind promotes through both Markdown projections", () => {
  for (const entry of chartKindRegistry) {
    const spec = entry.releaseCorpus.cases.find(({ postures }) =>
      postures.some((posture) => posture === "representative")
    )?.spec as ChartSpec | undefined;
    assert(spec !== undefined, `${entry.meta.slug} has a representative case`);
    const resource = Object.freeze({
      source: `assets/${entry.meta.slug}-representative.svg`,
      spec,
    });
    const markdown = `Before.\n\n${
      renderChartMarkdownImage(resource)
    }\n\nAfter.\n`;

    const html = renderToStaticMarkup(
      <Markdown source={markdown} charts={[resource]} />,
    );
    assert(
      html.includes(`data-discern-chart-kind="${entry.meta.slug}"`),
      `${entry.meta.slug} browser projection did not mount the live Chart`,
    );

    const terminal = stripAnsi(
      renderMarkdownCli({ source: markdown, charts: [resource] }, wide),
    );
    assert(
      terminal.includes(spec.title),
      `${entry.meta.slug} terminal projection lost the authored title`,
    );
    assert(
      !terminal.includes("Image: "),
      `${entry.meta.slug} terminal projection kept the ordinary image`,
    );

    const described = stripAnsi(renderMarkdownCli(
      { source: markdown, charts: [resource], chartMode: "description" },
      wide,
    ));
    assert(
      described.includes("Title: "),
      `${entry.meta.slug} forced description mode did not project the facts`,
    );
  }
});
