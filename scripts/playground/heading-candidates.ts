/** Internal-only calm heading candidates for owner review. */

import { styleText } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import { measureText, wrapText } from "../../src/cli/text.ts";
import { terminalThemeColor, terminalThemes } from "../../src/cli/theme.ts";
import { renderTrianglePattern } from "../../src/cli/triangles.ts";
import type { PlaygroundRuntime } from "./types.ts";

interface HeadingCandidate {
  readonly id: string;
  readonly distinction: string;
  readonly render: (
    title: string,
    capabilities: TerminalCapabilities,
  ) => string;
}

function headingText(
  value: string,
  capabilities: TerminalCapabilities,
): string {
  const theme = terminalThemes.dark;
  return styleText(value, {
    ...theme.typography.display,
    color: terminalThemeColor(theme, "--discern-color-ink"),
  }, capabilities);
}

function motif(phase: number, capabilities: TerminalCapabilities): string {
  return renderTrianglePattern({ length: 1, phase }, capabilities);
}

function hangingHeading(
  prefix: string,
  title: string,
  capabilities: TerminalCapabilities,
  suffix = "",
): string {
  const available = Math.max(
    1,
    capabilities.columns - measureText(prefix) - measureText(suffix),
  );
  const lines = wrapText(title, available);
  return lines.map((line, index) =>
    headingText(
      (index === 0 ? prefix : " ".repeat(measureText(prefix))) + line +
        (index === 0 ? suffix : ""),
      capabilities,
    )
  ).join("\n");
}

const candidates: readonly HeadingCandidate[] = [
  {
    id: "quiet-marker",
    distinction: "One leading triangle acts as a quiet section flag.",
    render: (title, capabilities) =>
      hangingHeading(motif(0, capabilities) + " ", title, capabilities),
  },
  {
    id: "short-rule",
    distinction: "A four-cell motif sits below the heading as a short rule.",
    render: (title, capabilities) =>
      headingText(
        wrapText(title, capabilities.columns).join("\n"),
        capabilities,
      ) + "\n" + renderTrianglePattern({ length: 4 }, capabilities),
  },
  {
    id: "offset-pair",
    distinction: "Two opposed triangles bracket only the first heading line.",
    render: (title, capabilities) =>
      hangingHeading(
        motif(2, capabilities) + " ",
        title,
        capabilities,
        " " + motif(1, capabilities),
      ),
  },
  {
    id: "stacked-corner",
    distinction: "A triangle and two-cell return form a compact corner.",
    render: (title, capabilities) =>
      motif(0, capabilities) + "\n" +
      hangingHeading("  ", title, capabilities) + "\n " +
      motif(1, capabilities),
  },
] as const;

const longTitle =
  "A calm heading treatment for a deliberately long terminal section name";

/** Render one internal candidate by stable review ID. */
export function renderHeadingCandidate(
  id: string,
  title: string,
  capabilities: TerminalCapabilities,
): string {
  const candidate = candidates.find((entry) => entry.id === id);
  if (candidate === undefined) {
    throw new TypeError(`unknown heading candidate: ${id}`);
  }
  return candidate.render(title, capabilities);
}

function withBoundary(value: string, leadingBlankLines: number): string {
  return "\n".repeat(leadingBlankLines) + value;
}

/** Print all internal candidates at the review widths and both boundaries. */
export function runHeadingCandidatesJourney(
  runtime: PlaygroundRuntime,
): Promise<void> {
  const current = runtime.io.capabilities();
  runtime.print(
    "Internal candidates only; owner selection precedes any public visual change.",
  );
  for (const candidate of candidates) {
    runtime.print("[" + candidate.id + "] " + candidate.distinction);
    for (const target of [39, 80, 104]) {
      const columns = Math.min(target, current.columns);
      const capabilities = { ...current, columns };
      runtime.print("~" + target + " columns (rendered at " + columns + ")");
      runtime.print("Default boundary (1 line):");
      runtime.print(withBoundary(
        candidate.render(longTitle, capabilities),
        1,
      ));
    }
    runtime.print("Explicit boundary (0 lines):");
    runtime.print(candidate.render("Nested heading", current));
  }
  return Promise.resolve();
}

/** Stable candidate facts used in the owner handoff. */
export const headingCandidateFacts = candidates.map(({ id, distinction }) => ({
  id,
  distinction,
}));
