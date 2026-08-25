/** React-free standard-Markdown bridge joining image syntax to diagram specs. */

import {
  escapeMarkdownAlternative,
  escapeMarkdownTitle,
} from "../internal/escape.ts";
import { formatDiagramAltText } from "./accessibility.ts";
import { DiagramValidationError } from "./errors.ts";
import { isDiagramRecord, snapshotDiagramJsonSafe } from "./validation.ts";
import { validateDiagram } from "../generated/diagram-dispatch.ts";
import type { DiagramSpec } from "../generated/diagram-spec.ts";
import { canonicalSafeUrlReference } from "../url-reference.ts";

/** Explicit relationship between an ordinary Markdown image and its spec. */
export interface MarkdownDiagramResource {
  /** Safe Markdown image source, matched after package URL normalisation. */
  readonly source: string;
  /** Typed semantic authority used by live browser and terminal projections. */
  readonly spec: DiagramSpec;
}

/** Canonical identity used when matching an ordinary Markdown image source. */
export function canonicalDiagramMarkdownSource(
  value: string,
): string | undefined {
  return canonicalSafeUrlReference(value);
}

function invalidResource(message: string, path: string): never {
  throw new DiagramValidationError({
    code: "diagram/invalid-spec",
    message,
    path,
    remedy:
      "Provide exactly one safe image source and one built-in DiagramSpec.",
  });
}

/**
 * Serialize one resource as ordinary CommonMark image syntax. The same
 * resource can then be supplied to package Markdown projections to upgrade
 * that image without introducing custom Markdown syntax.
 */
export function renderDiagramMarkdownImage(
  resource: MarkdownDiagramResource,
): string {
  const snapshot = snapshotDiagramJsonSafe(resource);
  if (!isDiagramRecord(snapshot)) {
    return invalidResource(
      "Markdown diagram resource must be an object.",
      "resource",
    );
  }
  const keys = Object.keys(snapshot).toSorted();
  if (keys.length !== 2 || keys[0] !== "source" || keys[1] !== "spec") {
    return invalidResource(
      "Markdown diagram resource must contain exactly source and spec.",
      "resource",
    );
  }
  if (typeof snapshot.source !== "string") {
    return invalidResource(
      "Markdown diagram resource source must be a string.",
      "resource.source",
    );
  }
  const source = canonicalDiagramMarkdownSource(snapshot.source);
  if (source === undefined) {
    return invalidResource(
      "Markdown diagram resource source must be a safe image URL reference.",
      "resource.source",
    );
  }
  const validated = validateDiagram(snapshot.spec);
  return `![${
    escapeMarkdownAlternative(formatDiagramAltText(validated))
  }](<${source}> \"${escapeMarkdownTitle(validated.summary)}\")`;
}
