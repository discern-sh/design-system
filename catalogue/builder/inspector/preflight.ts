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
import {
  documentPolicy,
  exportNaming,
  registryCoreBySlug,
} from "../registry-core.ts";
import { BuilderPlacementError } from "../tree/compatibility.ts";
import { projectLayers } from "../tree/projection.ts";
import {
  builderNodeIdForHumanPath,
  humanBuilderSelectionPath,
  projectDocumentIssueTarget,
  projectPolicyIssue,
} from "./validation.ts";

export interface BuilderPreflightIssue {
  readonly message: string;
  readonly humanPath: string;
  readonly technical: string;
  readonly nodeId?: string;
  readonly controlName?: string;
  readonly suggestions: readonly string[];
}

export type BuilderPreflightResult =
  | {
    readonly ok: true;
    readonly tsx: string;
    readonly selection: string;
    readonly json: string;
    readonly cost: CompositionCost;
    readonly identity: BuilderExportIdentity;
  }
  | { readonly ok: false; readonly issue: BuilderPreflightIssue };

function missingRequiredControl(
  document: BuilderDocument,
): BuilderPreflightIssue | undefined {
  for (const { child } of projectLayers(document)) {
    if (child.kind !== "component") continue;
    const entry = registryCoreBySlug.get(child.slug);
    if (entry === undefined) continue;
    const missing = entry.controls.find((control) =>
      control.required && child.props[control.name] === undefined
    );
    if (missing === undefined) continue;
    const componentPath = humanBuilderSelectionPath(document, child.id);
    const humanPath = `${componentPath} › ${missing.label}`;
    return {
      message: `Set ${missing.label} for ${componentPath} before exporting.`,
      humanPath,
      technical:
        `${child.slug}.${missing.name} is a required source prop without an accepted Builder value`,
      nodeId: child.id,
      controlName: missing.name,
      suggestions: [],
    };
  }
  return undefined;
}

/** Validate once, then derive every export and cost from the same document. */
export function preflightBuilderDocument(
  document: BuilderDocument,
): BuilderPreflightResult {
  try {
    assertBuilderDocument(document, documentPolicy);
    const requiredIssue = missingRequiredControl(document);
    if (requiredIssue !== undefined) {
      return { ok: false, issue: requiredIssue };
    }
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
    if (error instanceof BuilderPlacementError) {
      const failure = error.failure;
      const nodeId = builderNodeIdForHumanPath(document, failure.humanPath);
      return {
        ok: false,
        issue: {
          message: `${failure.humanPath} ${failure.reason}.`,
          humanPath: failure.humanPath,
          technical: failure.technicalDetail,
          ...(nodeId === undefined ? {} : { nodeId }),
          suggestions: failure.suggestions,
        },
      };
    }
    const technical = error instanceof Error ? error.message : String(error);
    const target = projectDocumentIssueTarget(document, technical);
    const humanPath = target?.humanPath ?? "Composition";
    const projected = projectPolicyIssue(technical, humanPath);
    return {
      ok: false,
      issue: {
        ...projected,
        humanPath,
        ...(target === undefined ? {} : {
          nodeId: target.nodeId,
          ...(target.controlName === undefined
            ? {}
            : { controlName: target.controlName }),
        }),
        suggestions: [],
      },
    };
  }
}
