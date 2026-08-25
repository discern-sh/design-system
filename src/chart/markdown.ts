/** React-free standard-Markdown bridge joining image syntax to chart specs. */

import {
  escapeMarkdownAlternative,
  escapeMarkdownTitle,
} from "../internal/escape.ts";
import { formatChartAltText } from "./accessibility.ts";
import { ChartValidationError } from "./errors.ts";
import { isChartRecord, snapshotChartJsonSafe } from "./validation.ts";
import { validateChart } from "../generated/chart-dispatch.ts";
import type { ChartSpec } from "../generated/chart-spec.ts";
import { canonicalSafeUrlReference } from "../url-reference.ts";

/** Explicit relationship between an ordinary Markdown image and its spec. */
export interface MarkdownChartResource {
  /** Safe Markdown image source, matched after package URL normalisation. */
  readonly source: string;
  /** Typed semantic authority used by live browser and terminal projections. */
  readonly spec: ChartSpec;
}

/** Canonical identity used when matching an ordinary Markdown image source. */
export function canonicalChartMarkdownSource(
  value: string,
): string | undefined {
  return canonicalSafeUrlReference(value);
}

function invalidResource(message: string, path: string): never {
  throw new ChartValidationError({
    code: "chart/invalid-spec",
    message,
    path,
    remedy: "Provide exactly one safe image source and one built-in ChartSpec.",
  });
}

/**
 * Serialize one resource as ordinary CommonMark image syntax. The same
 * resource can then be supplied to package Markdown projections to upgrade
 * that image without introducing custom Markdown syntax.
 */
export function renderChartMarkdownImage(
  resource: MarkdownChartResource,
): string {
  const snapshot = snapshotChartJsonSafe(resource);
  if (!isChartRecord(snapshot)) {
    return invalidResource(
      "Markdown chart resource must be an object.",
      "resource",
    );
  }
  const keys = Object.keys(snapshot).toSorted();
  if (keys.length !== 2 || keys[0] !== "source" || keys[1] !== "spec") {
    return invalidResource(
      "Markdown chart resource must contain exactly source and spec.",
      "resource",
    );
  }
  if (typeof snapshot.source !== "string") {
    return invalidResource(
      "Markdown chart resource source must be a string.",
      "resource.source",
    );
  }
  const source = canonicalChartMarkdownSource(snapshot.source);
  if (source === undefined) {
    return invalidResource(
      "Markdown chart resource source must be a safe image URL reference.",
      "resource.source",
    );
  }
  const validated = validateChart(snapshot.spec);
  return `![${
    escapeMarkdownAlternative(formatChartAltText(validated))
  }](<${source}> "${escapeMarkdownTitle(validated.summary)}")`;
}
