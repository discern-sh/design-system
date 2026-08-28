/** One accepted preflight consumed by Inspector, copy, and file export. */
import { type CompositionCost, compositionCost } from "../cost.ts";
import {
  type BuilderExportIdentity,
  builderExportIdentity,
  documentSelectionSnippet,
  documentToTsx,
  serializeDocument,
} from "../export.ts";
import type { BuilderDocument } from "../model.ts";
import { usedSlugs } from "../model.ts";
import { assertBuilderDocument } from "../policy.ts";
import { documentPolicy, exportNaming } from "../registry-core.ts";

export type BuilderPreflightResult =
  | {
    readonly ok: true;
    readonly tsx: string;
    readonly selection: string;
    readonly json: string;
    readonly cost: CompositionCost;
    readonly identity: BuilderExportIdentity;
  }
  | { readonly ok: false; readonly message: string };

/** Validate once, then derive every export and cost from the same document. */
export function preflightBuilderDocument(
  document: BuilderDocument,
): BuilderPreflightResult {
  try {
    assertBuilderDocument(document, documentPolicy);
    const cost = compositionCost(usedSlugs(document));
    const identity = builderExportIdentity(document, exportNaming);
    let tsx: string | undefined;
    let selection: string | undefined;
    let json: string | undefined;
    return {
      ok: true,
      get tsx() {
        return tsx ??= documentToTsx(document, exportNaming);
      },
      get selection() {
        return selection ??= documentSelectionSnippet(document, documentPolicy);
      },
      get json() {
        return json ??= serializeDocument(document, documentPolicy);
      },
      cost,
      identity,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
