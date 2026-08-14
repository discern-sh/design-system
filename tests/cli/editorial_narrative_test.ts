import { assert } from "@std/assert";
import { renderStyledSpans, stripAnsi, styleText } from "../../src/cli/ansi.ts";
import { renderPullQuoteCli, renderTimelineCli } from "../../src/cli/mod.ts";
import {
  terminalThemeColor,
  terminalThemes,
  terminalToneColor,
} from "../../src/cli/theme.ts";
import { renderTrianglePattern } from "../../src/cli/triangles.ts";
import { assertExactFrame, testCapabilities } from "./helpers.ts";

const pullQuoteProps = {
  quote:
    "A durable interface leaves the reader with the argument, not the rendering machinery.",
  attribution: "Ada Osei",
  citation: "Field notes",
} as const;

Deno.test("Pull quote renders exact width, ASCII, and colour frames", () => {
  const frames = [
    [
      24,
      "┃ “A durable interface\n┃ leaves the reader with\n┃ the argument, not the\n┃ rendering machinery.”\n  — Ada Osei — Field\n  notes",
    ],
    [
      52,
      "┃ “A durable interface leaves the reader with the\n┃ argument, not the rendering machinery.”\n  — Ada Osei — Field notes",
    ],
    [
      96,
      "┃ “A durable interface leaves the reader with the argument, not the rendering\n┃ machinery.”\n  — Ada Osei — Field notes",
    ],
  ] as const;
  for (const [columns, expected] of frames) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderPullQuoteCli(pullQuoteProps, capabilities),
      expected,
      capabilities,
    );
  }
  const ascii = testCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderPullQuoteCli(pullQuoteProps, ascii),
    '| "A durable interface\n| leaves the reader with\n| the argument, not the\n| rendering machinery."\n  - Ada Osei - Field\n  notes',
    ascii,
  );
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testCapabilities({ columns: 52, colorDepth });
    const line = (text: string) =>
      renderStyledSpans([
        {
          text: "┃ ",
          style: {
            ...theme.typography.strong,
            color: terminalToneColor(theme, "accent"),
          },
        },
        { text, style: theme.typography.emphasis },
      ], capabilities);
    const attribution = styleText("  — Ada Osei — Field notes", {
      ...theme.typography.annotation,
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
    }, capabilities);
    const expected = `${
      line("“A durable interface leaves the reader with the")
    }\n${line("argument, not the rendering machinery.”")}\n${attribution}`;
    assertExactFrame(
      renderPullQuoteCli(pullQuoteProps, capabilities),
      expected,
      capabilities,
    );
  }
});

const timelineProps = {
  eyebrow: "History",
  title: "One decision at a time",
  items: [
    {
      date: "Week 01",
      title: "Observe",
      description: "Name the recurring friction.",
      status: "complete",
    },
    {
      date: "Week 03",
      title: "Constrain",
      description: "Make the shared boundary executable.",
      status: "current",
    },
    {
      date: "Week 06",
      title: "Review",
      description: "Compare evidence, not recollections.",
    },
  ],
} as const;

Deno.test("Timeline renders exact width, ASCII, and colour frames", () => {
  const narrow =
    "HISTORY\n\nOne decision at a time\n\n◭ Week 01 — Observe\n  [complete]\n│   Name the recurring\n    friction.\n│\n⧩ Week 03 — Constrain\n  [current]\n│   Make the shared\n    boundary executable.\n│\n⧩ Week 06 — Review\n  [upcoming]\n    Compare evidence,\n    not recollections.";
  const standard =
    "HISTORY\n\nOne decision at a time\n\n◭ Week 01 — Observe [complete]\n│   Name the recurring friction.\n│\n⧩ Week 03 — Constrain [current]\n│   Make the shared boundary executable.\n│\n⧩ Week 06 — Review [upcoming]\n    Compare evidence, not recollections.";
  for (
    const [columns, expected] of [[24, narrow], [52, standard], [
      96,
      standard,
    ]] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderTimelineCli(timelineProps, capabilities),
      expected,
      capabilities,
    );
  }
  const ascii = testCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderTimelineCli(timelineProps, ascii),
    "HISTORY\n\nOne decision at a time\n\n^ Week 01 - Observe\n  [complete]\n|   Name the recurring\n    friction.\n|\nv Week 03 - Constrain\n  [current]\n|   Make the shared\n    boundary executable.\n|\nv Week 06 - Review\n  [upcoming]\n    Compare evidence,\n    not recollections.",
    ascii,
  );
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testCapabilities({ columns: 52, colorDepth });
    const heading = styleText("HISTORY", {
      ...theme.typography.annotation,
      color: terminalThemeColor(theme, "--discern-color-accent-700"),
    }, capabilities);
    const title = styleText("One decision at a time", {
      ...theme.typography.display,
      color: terminalThemeColor(theme, "--discern-color-ink"),
    }, capabilities);
    const marker = (phase: number, tone: "success" | "accent" | "neutral") =>
      renderTrianglePattern({ length: 1, phase, tone }, capabilities);
    const events = `${
      marker(2, "success")
    } Week 01 — Observe [complete]\n│   Name the recurring friction.\n│\n${
      marker(1, "accent")
    } Week 03 — Constrain [current]\n│   Make the shared boundary executable.\n│\n${
      marker(1, "neutral")
    } Week 06 — Review [upcoming]\n    Compare evidence, not recollections.`;
    const expected = `${heading}\n\n${title}\n\n${events}`;
    assertExactFrame(
      renderTimelineCli(timelineProps, capabilities),
      expected,
      capabilities,
    );
  }
});

Deno.test("Timeline markers point up only for complete events regardless of item order", () => {
  for (const unicode of [true, false]) {
    const capabilities = testCapabilities({ columns: 52, unicode });
    const output = stripAnsi(renderTimelineCli({
      title: "Direction",
      items: [
        {
          date: "Now",
          title: "Current",
          description: "Active",
          status: "current",
        },
        {
          date: "Then",
          title: "Complete",
          description: "Done",
          status: "complete",
        },
        {
          date: "Later",
          title: "Upcoming",
          description: "Pending",
          status: "upcoming",
        },
      ],
    }, capabilities));
    const lines = output.split("\n");
    const current = lines.find((line) => line.includes("Now")) ?? "";
    const complete = lines.find((line) => line.includes("Then")) ?? "";
    const upcoming = lines.find((line) => line.includes("Later")) ?? "";
    assert(current.startsWith(unicode ? "⧩" : "v"));
    assert(complete.startsWith(unicode ? "◭" : "^"));
    assert(upcoming.startsWith(unicode ? "⧩" : "v"));
  }
});
