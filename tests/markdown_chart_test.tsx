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
  createMarkdownBrowserState,
  type MarkdownBrowserDocument,
  markdownBrowserResumableState,
} from "../src/cli/interactive/markdown-browser-model.ts";
import { transitionMarkdownBrowser } from "../src/cli/interactive/markdown-browser-machine.ts";
import { requestMarkdownBrowser } from "../src/cli/interactive/markdown-browser-request.ts";
import {
  fitMarkdownBrowserState,
  markdownBrowserDocumentAnchor,
  markdownBrowserDocumentLines,
  markdownBrowserDocumentMaximumOffset,
  markdownBrowserLinkOccurrences,
} from "../src/cli/interactive/markdown-browser-renderer.ts";
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
  ERASE_TERMINAL_DISPLAY,
  HOME_TERMINAL_CURSOR,
} from "../src/cli/interactive/painter.ts";
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

  const shared = createMarkdownBrowserState({
    label: "Documents",
    entries: ["one", "two"].map((id) => ({
      kind: "document" as const,
      id,
      label: id,
      path: `${id}.md`,
      source: imageMarkdown(),
      charts: [markdownChartResource],
    })),
  }, { columns: 80, rows: 24 });
  for (const entry of shared.entries) {
    assert(entry.kind === "document");
    assert(Object.isFrozen(entry.charts));
    assertEquals(entry.charts?.[0]?.source, markdownChartSource);
  }
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
  const document: MarkdownBrowserDocument = {
    kind: "document",
    id: "chart",
    label: "Chart",
    path: "guides/chart.md",
    source: markdownChartMarkdown,
    charts: [markdownChartResource],
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
  assertStringIncludes(widePlain, "┌ Reviews completed by weekday");
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
  assertStringIncludes(narrowPlain, "Title: Reviews completed by");
  assertMatch(narrowPlain, /│\s*9\s*│/u);
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
  assertEquals(state.openedDocumentId, "chart");
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
      highlightedId: "chart",
      openedDocumentId: "chart",
      focusedPane: "document",
      pickerVisibleStart: 0,
      documentScrollOffset: 0,
      linkFocus: { id: "chart:missing", origin: "keyboard" },
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

Deno.test("browser reflow preserves reader position above, within, and below Chart", () => {
  const document: MarkdownBrowserDocument = {
    kind: "document",
    id: "chart-postures",
    label: "Chart postures",
    path: "guides/chart-postures.md",
    source: markdownChartPostureMarkdown,
    charts: [markdownChartResource],
  };
  const rows = 18;
  const wideCapabilities = testTerminalCapabilities({ columns: 120 });
  const narrowCapabilities = testTerminalCapabilities({ columns: 32 });
  const openAt = (documentScrollOffset: number) =>
    createMarkdownBrowserState({
      label: "Documents",
      entries: [document],
      initialState: {
        query: "",
        queryCursor: 0,
        highlightedId: document.id,
        openedDocumentId: document.id,
        focusedPane: "document",
        pickerVisibleStart: 0,
        documentScrollOffset,
      },
    }, { columns: 120, rows });
  const probe = openAt(0);
  const wideLines = markdownBrowserDocumentLines(probe, wideCapabilities);
  const rowContaining = (needle: string): number => {
    const row = wideLines.findIndex((line) => stripAnsi(line).includes(needle));
    assert(row >= 0, `reader fixture has no row containing ${needle}`);
    return row;
  };
  const anchor = (
    state: ReturnType<typeof openAt>,
    capabilities: ReturnType<typeof testTerminalCapabilities>,
  ): string =>
    markdownBrowserDocumentAnchor(
      markdownBrowserDocumentLines(state, capabilities),
      state.documentScrollOffset,
    ) ?? "";

  for (
    const posture of [
      {
        name: "above",
        row: rowContaining("Before landmark 8"),
        anchor: "Before landmark 8",
      },
      {
        name: "within",
        row: rowContaining("┌ Reviews completed by weekday"),
        anchor: "Reviews completed by",
      },
      {
        name: "below",
        row: rowContaining("After landmark 4"),
        anchor: "After landmark 4",
      },
    ] as const
  ) {
    let state = openAt(posture.row);
    assertStringIncludes(anchor(state, wideCapabilities), posture.anchor);
    const initialResume = markdownBrowserResumableState(state);
    assertEquals(
      markdownBrowserResumableState(createMarkdownBrowserState({
        label: "Documents",
        entries: [document],
        initialState: initialResume,
      }, { columns: 120, rows })),
      initialResume,
      `${posture.name} posture did not round-trip before resize`,
    );

    state = transitionMarkdownBrowser(
      state,
      { kind: "resize", columns: 32, rows },
      narrowCapabilities,
    ).state;
    assertEquals(state.openedDocumentId, document.id, posture.name);
    assertEquals(state.focusedPane, "document", posture.name);
    assertStringIncludes(
      anchor(state, narrowCapabilities),
      posture.anchor,
      `${posture.name} posture lost its semantic row at the narrow fallback`,
    );
    const narrowLines = markdownBrowserDocumentLines(
      state,
      narrowCapabilities,
    );
    const narrowLinks = markdownBrowserLinkOccurrences(
      state,
      narrowCapabilities,
    );
    assertEquals(
      narrowLinks.map(({ destination }) => destination),
      ["guide.md#review"],
      posture.name,
    );
    assert(
      narrowLinks[0]!.documentEndRow <= narrowLines.length,
      `${posture.name} link region escaped the reflowed document`,
    );
    assert(
      state.documentScrollOffset <=
        markdownBrowserDocumentMaximumOffset(state, narrowCapabilities),
      `${posture.name} scroll offset escaped the reflowed document`,
    );
    const narrowResume = markdownBrowserResumableState(state);
    assertEquals(
      markdownBrowserResumableState(createMarkdownBrowserState({
        label: "Documents",
        entries: [document],
        initialState: narrowResume,
      }, { columns: 32, rows })),
      narrowResume,
      `${posture.name} posture did not round-trip after resize`,
    );

    state = transitionMarkdownBrowser(
      state,
      { kind: "resize", columns: 120, rows },
      wideCapabilities,
    ).state;
    assertStringIncludes(
      anchor(state, wideCapabilities),
      posture.anchor,
      `${posture.name} posture lost its semantic row after widening`,
    );
    const atEnd = transitionMarkdownBrowser(
      state,
      { kind: "key", key: { kind: "named", name: "end" } },
      wideCapabilities,
    ).state;
    assertEquals(
      markdownBrowserLinkOccurrences(atEnd, wideCapabilities)[0]?.visibility,
      "visible",
      `${posture.name} could not reach the link after the Chart`,
    );
  }
});

Deno.test("live Chart threshold resizes paint complete frames and restore the terminal", async () => {
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
  const framePrefix = `${ERASE_TERMINAL_DISPLAY}${HOME_TERMINAL_CURSOR}`;
  const frames = io.writes.filter((write) => write.startsWith(framePrefix)).map(
    (write) => write.slice(framePrefix.length).replaceAll("\r\n", "\n"),
  );
  assert(
    frames.some((frame) =>
      stripAnsi(frame).includes("┌ Reviews completed by weekday")
    ),
    "wide live frame did not use the exact Chart projector",
  );
  assert(
    frames.some((frame) =>
      stripAnsi(frame).includes("Title: Reviews completed by")
    ),
    "narrow live frame did not use the complete description fallback",
  );
  assert(
    frames.every((frame) => frame.split("\n").length === 18),
    "a Chart resize painted an incomplete terminal frame",
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
