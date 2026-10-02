import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { stripAnsi } from "../../src/cli/mod.ts";
import {
  type ApplicationMarkdown,
  runTerminalApplication,
  type TerminalApplicationContext,
  type TerminalApplicationLink,
  terminalApplicationReservedKeys,
  type TerminalApplicationView,
  validateTerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";
import {
  encodeTerminalKeys,
  FakeTerminalIO,
  ManualTerminalClock,
  settledTerminalFrame,
} from "../../src/cli/interactive/testing.ts";
import { ApplicationDriver } from "../fixtures/application-driver.ts";
import { settle } from "../fixtures/application-session.ts";
import { testView } from "../fixtures/application-views.ts";
import { APPLICATION_REVIEW_SIZES } from "../../scripts/playground/application.ts";

const filler = (from: number, count: number) =>
  Array.from(
    { length: count },
    (_, index) => `Paragraph ${from + index} keeps a steady landmark.`,
  ).join("\n\n");

/** A long document: links near the top, a heading far below, more links after it. */
const SOURCE = `# Field guide

Read the [setup notes](setup.md) first, then the [overview](#later-section).

${filler(1, 14)}

## Later section

The [reference](reference.md#details) and the [site](https://example.com/).

${filler(15, 10)}`;

function markdown(source = SOURCE, measure?: number): ApplicationMarkdown {
  return {
    kind: "markdown",
    source,
    ...(measure === undefined ? {} : { measure }),
  };
}

function readingView(
  content: ApplicationMarkdown = markdown(),
): TerminalApplicationView<string> {
  return {
    header: { leading: [{ text: "Guide", role: "title" }] },
    body: { kind: "reading", id: "guide", content },
    footer: { left: [], right: [{ key: "q", label: "Close" }] },
  };
}

function driver(
  view = readingView(),
  size: { columns: number; rows: number } = { columns: 80, rows: 24 },
): ApplicationDriver {
  return new ApplicationDriver(view, {
    keymap: [{ key: "q", action: "quit" }],
    ...size,
  });
}

function links(drive: ApplicationDriver): TerminalApplicationLink[] {
  return drive.take().flatMap((effect) =>
    effect.kind === "link" ? [effect.link] : []
  );
}

Deno.test("Markdown reads at its measure, centred in a wide body", () => {
  const drive = driver(readingView(), { columns: 120, rows: 30 });
  const line = drive.text.split("\n").find((row) =>
    row.includes("Paragraph 1 ")
  );
  assert(line !== undefined);
  // Two gutter cells, then half of what the 72-cell measure leaves of 116.
  assertEquals(line.indexOf("Paragraph"), 2 + 22);
});

Deno.test("Tab reaches the links in order and stops at the ends", () => {
  const drive = driver();
  assertStringIncludes(drive.text, "Tab Links");
  drive.key("tab");
  assertEquals(drive.state.focusedControlId, "guide:link:link-0");
  assertEquals(drive.state.readingFocus, { guide: "link-0" });
  assertStringIncludes(drive.text, "Esc Done");
  drive.key("tab");
  assertEquals(drive.state.focusedControlId, "guide:link:link-1");
  drive.key("shift-tab", "shift-tab", "shift-tab");
  assertEquals(drive.state.focusedControlId, "guide:link:link-0");
  drive.key("tab", "tab", "tab", "tab", "tab", "tab");
  assertEquals(
    drive.state.focusedControlId,
    "guide:link:link-3",
    "the last link keeps focus",
  );
  assertStringIncludes(
    drive.text,
    "Later section",
    "a focused link is on screen",
  );
});

Deno.test("Escape leaves the links before anything else", () => {
  const drive = driver({
    ...readingView(),
    message: { id: "tip", runs: [{ text: "A tip" }] },
  });
  drive.key("tab", "escape");
  assertEquals(drive.state.focusedControlId, "guide");
  assertStringIncludes(
    drive.text,
    "A tip",
    "the message waits for the next Escape",
  );
  drive.key("escape");
  assertEquals(drive.state.dismissed.messages, ["tip"]);
});

Deno.test("a link to a heading of the same document scrolls there itself", () => {
  const drive = driver();
  drive.take();
  drive.key("tab", "tab", "enter");
  assertEquals(links(drive), [], "the caller hears nothing");
  assertEquals(drive.state.focusedControlId, "guide");
  const rows = drive.text.split("\n");
  const heading = rows.findIndex((row) => row.includes("Later section"));
  assert(heading > 0 && heading <= 3, `heading at row ${heading}`);
});

Deno.test("any other link reaches the caller and keeps its focus", () => {
  const drive = driver();
  drive.take();
  drive.key("tab", "enter");
  assertEquals(links(drive), [{
    readingId: "guide",
    linkId: "link-0",
    destination: "setup.md",
  }]);
  assertEquals(drive.state.focusedControlId, "guide:link:link-0");
});

Deno.test("scrolling leaves the focused link, and Tab brings one back on screen", () => {
  const drive = driver();
  drive.key("tab", "page-down");
  assertEquals(drive.state.focusedControlId, "guide");
  // Every link is above now, so Tab takes the last and scrolls back to it.
  drive.key("page-down", "page-down", "tab");
  assertEquals(drive.state.readingFocus.guide, "link-3");
  assertStringIncludes(drive.text, "example.com");
});

Deno.test("a click follows the link under it", () => {
  const drive = new ApplicationDriver(
    { ...readingView(), input: { mouse: true } },
    { keymap: [{ key: "q", action: "quit" }] },
  );
  drive.take();
  const at = drive.find("overview");
  drive.click(at.column, at.row);
  assertEquals(drive.state.focusedControlId, "guide", "the fragment scrolled");
  const rows = drive.text.split("\n");
  assert(rows.findIndex((row) => row.includes("Later section")) <= 3);
  drive.key("home");
  const setup = drive.find("setup notes");
  drive.click(setup.column + 1, setup.row);
  assertEquals(links(drive).map((link) => link.destination), ["setup.md"]);
});

Deno.test("rewrapping keeps the text that was at the top", () => {
  const drive = driver(readingView(), { columns: 120, rows: 30 });
  drive.key("page-down", "page-down");
  const top = drive.text.split("\n")[3]?.trim() ?? "";
  drive.io.resize(44, 30);
  drive.render();
  const landmark = top.split(" ").slice(0, 2).join(" ");
  const rows = drive.text.split("\n");
  const found = rows.findIndex((row) => row.includes(landmark));
  assert(found >= 0 && found <= 4, `${landmark} at row ${found}`);
});

Deno.test("a document without links neither reserves a hint nor moves on Tab", () => {
  const drive = driver(readingView(markdown("# Plain\n\nNo links here.")));
  assert(!drive.text.includes("Links"));
  drive.key("tab");
  assertEquals(drive.state.focusedControlId, "guide");
});

Deno.test("Markdown reading bodies reserve Tab, Shift+Tab, and Enter", () => {
  const keys = terminalApplicationReservedKeys(readingView().body);
  for (const key of ["tab", "shift-tab", "enter"]) assert(keys.includes(key));
  const issues = validateTerminalApplicationView(readingView(), {
    keymap: [{ key: "enter", action: "open" }, { key: "q", action: "quit" }],
  });
  assert(issues.some((issue) => issue.path.startsWith("keymap")));
});

Deno.test("a measure narrower than a readable column is refused", () => {
  const issues = validateTerminalApplicationView(
    readingView(markdown(SOURCE, 8)),
    { keymap: [{ key: "q", action: "quit" }] },
  );
  assertEquals(issues.map((issue) => issue.path), ["body.content.measure"]);
});

Deno.test("onLink commands and context.reveal drive a live reading body", async () => {
  const io = new FakeTerminalIO([], { holdOpen: true });
  const followed: TerminalApplicationLink[] = [];
  let live: TerminalApplicationContext<string> | undefined;
  const running = runTerminalApplication<string>({
    view: readingView(),
    keymap: [{ key: "q", action: "quit" }],
    start: (context) => {
      live = context;
    },
    onAction: (action) => action === "quit" ? { kind: "exit" } : undefined,
    onLink: (link, _context, source) => {
      followed.push(link);
      return source === "enter" && link.destination === "https://example.com/"
        ? { kind: "exit" }
        : undefined;
    },
  }, { io, clock: new ManualTerminalClock() });
  await settle();
  live?.reveal("guide", { heading: "later-section" });
  await settle();
  const frame = stripAnsi(settledTerminalFrame(io.output(), io.size()));
  assert(
    frame.split("\n").findIndex((row) => row.includes("Later section")) <= 3,
  );
  live?.reveal("guide", { link: "link-3" });
  await settle();
  assertEquals(live?.state.focusedControlId, "guide:link:link-3");
  io.enqueue(encodeTerminalKeys("enter"));
  const state = await running;
  io.close();
  assertEquals(followed.map((link) => link.linkId), ["link-3"]);
  assertEquals(state.readingFocus, { guide: "link-3" });
});

/** Run keys against a live reading body, together or one read at a time. */
async function finalState(
  chunks: readonly string[],
): Promise<
  {
    readonly focus?: string;
    readonly links: readonly string[];
    readonly scroll: number;
  }
> {
  const io = new FakeTerminalIO([], { holdOpen: true });
  const followed: string[] = [];
  const running = runTerminalApplication<string>({
    view: readingView(),
    keymap: [{ key: "q", action: "quit" }],
    onAction: () => ({ kind: "exit" }),
    onLink: (link) => {
      followed.push(link.linkId);
    },
  }, { io, clock: new ManualTerminalClock() });
  await settle();
  for (const chunk of chunks) {
    io.enqueue(chunk);
    await settle();
  }
  io.enqueue("q");
  const state = await running;
  io.close();
  const focus = state.readingFocus.guide;
  return {
    ...(focus === undefined ? {} : { focus }),
    links: followed,
    scroll: state.readingScroll.guide ?? 0,
  };
}

Deno.test("keys read together meet the model their predecessors left, as keys read apart do", async () => {
  for (
    const sequence of [
      ["tab", "tab", "enter"],
      ["page-down", "page-down", "tab", "enter"],
      ["end", "shift-tab", "shift-tab", "enter"],
    ]
  ) {
    const bytes = sequence.map((name) => encodeTerminalKeys(name as never));
    const apart = await finalState(bytes);
    const together = await finalState([bytes.join("")]);
    assertEquals(together, apart, sequence.join(" "));
    assert(
      apart.links.length > 0 || apart.scroll > 0,
      `${sequence.join(" ")} reaches a link`,
    );
  }
});

/** A document of short sections, each heading over two paragraphs. */
const SECTIONS = [
  "# Handbook",
  "",
  ...Array.from({ length: 12 }, (_, index) => [
    `## Section ${index}`,
    "",
    `Body ${index} first paragraph.`,
    "",
    `Body ${index} second paragraph.`,
    "",
  ]).flat(),
].join("\n");

/** The last row above the lower marker that holds text, or undefined. */
function lastAboveMarker(lines: readonly string[]): string | undefined {
  const marker = lines.findIndex((line) => /↓ \d+ more/u.test(line));
  if (marker < 0) return undefined;
  return lines.slice(0, marker).filter((line) => line.trim() !== "").at(-1);
}

Deno.test("a reading page never ends on a heading while its body is hidden", async (t) => {
  for (const rows of [10, 13, 17, 20, 24, 30]) {
    for (const colorDepth of ["none", "truecolor"] as const) {
      await t.step(`80x${rows} ${colorDepth}`, () => {
        const reading = new ApplicationDriver(readingView(markdown(SECTIONS)), {
          keymap: [{ key: "q", action: "quit" }],
          columns: 80,
          rows,
          colorDepth,
        });
        for (let step = 0; step < 80; step += 1) {
          const last = lastAboveMarker(reading.text.split("\n").slice(1, -1));
          if (last === undefined) break;
          assert(
            !/Section \d+|Handbook|━━━/u.test(last),
            `step ${step}: the page ends on a heading\n${reading.text}`,
          );
          reading.key("down");
        }
      });
    }
  }
});

Deno.test("a reading heads its document quietly and marks its edges at the measure", () => {
  const reading = new ApplicationDriver(readingView(markdown(SECTIONS, 40)), {
    keymap: [{ key: "q", action: "quit" }],
    columns: 80,
    rows: 20,
    colorDepth: "truecolor",
  });
  const lines = reading.text.split("\n");
  // No first-level marker, and the second level draws no rule.
  assert(!/[▲△◆◇]/u.test(reading.text), reading.text);
  const section = lines.findIndex((line) => line.includes("Section 0"));
  assert(section > 0, reading.text);
  assert(!(lines[section + 1] ?? "").includes("─"), reading.text);
  // The document sits centred at its measure; the lower marker ends where
  // the document does, not at the window's edge.
  const marker = lines.find((line) => /↓ \d+ more/u.test(line)) ?? "";
  const heading = lines.find((line) => line.includes("━")) ?? "";
  assertEquals(
    marker.trimEnd().length,
    heading.trimEnd().length,
    `${JSON.stringify(marker)} and ${JSON.stringify(heading)}`,
  );
});

Deno.test("Markdown in a detail reads like a reading body and keeps its headings with their lines", async (t) => {
  const base = testView(["a"]);
  if (base.body.kind !== "master-detail") throw new Error("master-detail");
  const view: TerminalApplicationView<string> = {
    ...base,
    body: {
      ...base.body,
      detail: { follows: "items", content: { a: [markdown(SECTIONS)] } },
    },
  };
  for (
    const { columns, rows } of [
      { columns: 120, rows: 30 },
      { columns: 80, rows: 24 },
      { columns: 80, rows: 13 },
    ]
  ) {
    for (const colorDepth of ["none", "truecolor"] as const) {
      await t.step(`${columns}x${rows} ${colorDepth}`, () => {
        const detail = new ApplicationDriver(view, {
          columns,
          rows,
          colorDepth,
        });
        if (colorDepth === "truecolor") {
          assert(!/[▲△]/u.test(detail.text), detail.text);
        }
        for (let step = 0; step < 80; step += 1) {
          const lines = detail.text.split("\n").slice(1, -1).map((line) =>
            line.slice(Math.floor(columns / 3))
          );
          const last = lastAboveMarker(lines);
          if (last === undefined) break;
          assert(
            !/Section \d+|Handbook|━━━/u.test(last),
            `step ${step}: the detail ends on a heading\n${detail.text}`,
          );
          detail.key("shift-down");
        }
      });
    }
  }
});

Deno.test("Markdown in a detail starts at the detail's text column, as the blocks above it do", async (t) => {
  const base = testView(["a"]);
  if (base.body.kind !== "master-detail") throw new Error("master-detail");
  const view: TerminalApplicationView<string> = {
    ...base,
    body: {
      ...base.body,
      detail: {
        follows: "items",
        content: {
          a: [
            { kind: "heading", title: "Preview title" },
            markdown("A paragraph that opens the document."),
          ],
        },
      },
    },
  };
  for (const { columns, rows } of APPLICATION_REVIEW_SIZES) {
    await t.step(`${columns}x${rows}`, () => {
      const detail = new ApplicationDriver(view, {
        columns,
        rows,
        colorDepth: "none",
      });
      // The split where it shows the detail, then zoom, which every size has.
      for (const zoomed of [false, true]) {
        if (zoomed) detail.key("space");
        if (!detail.text.includes("A paragraph")) continue;
        assertEquals(
          detail.find("A paragraph").column,
          detail.find("Preview title").column,
          detail.text,
        );
      }
      assertStringIncludes(detail.text, "A paragraph");
    });
  }
});
