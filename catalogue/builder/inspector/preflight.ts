/** One accepted preflight consumed by Inspector, copy, and file export. */
import { type CompositionCost, compositionCost } from "../cost.ts";
import {
  documentSelectionSnippet,
  documentToTsx,
  serializeDocument,
} from "../export.ts";
import type { BuilderDocument } from "../model.ts";
import { usedSlugs } from "../model.ts";
import { documentPolicy, exportNaming } from "../registry-core.ts";

export type BuilderPreflightResult =
  | {
    readonly ok: true;
    readonly tsx: string;
    readonly selection: string;
    readonly json: string;
    readonly cost: CompositionCost;
  }
  | { readonly ok: false; readonly message: string };

/** Validate once, then derive every export and cost from the same document. */
export function preflightBuilderDocument(
  document: BuilderDocument,
): BuilderPreflightResult {
  try {
    return {
      ok: true,
      tsx: documentToTsx(document, exportNaming),
      selection: documentSelectionSnippet(document, documentPolicy),
      json: serializeDocument(document, documentPolicy),
      cost: compositionCost(usedSlugs(document)),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
