/** Human projection of strict Builder validation. Technical facts stay intact. */
import type {
  BuilderDocument,
  BuilderNode,
  BuilderSlotChild,
} from "../model.ts";
import { ancestorsOf, findChild } from "../model.ts";
import { builderControlLabel, entryBySlug } from "../registry-core.ts";

export interface ProjectedBuilderIssue {
  readonly message: string;
  readonly technical: string;
}

function componentName(node: BuilderNode): string {
  return entryBySlug.get(node.slug)?.meta.name ?? node.slug;
}

/**
 * One selection-language path for breadcrumbs, field errors, and preflight.
 * Ordinary `children` is implicit; named slots stay visible as decisions.
 */
export interface HumanBuilderPathSegment {
  readonly label: string;
  readonly nodeId?: string;
}

export function humanBuilderSelectionSegments(
  document: BuilderDocument,
  selectionId: string,
  currentLabel?: string,
): readonly HumanBuilderPathSegment[] {
  const selected = findChild(document, selectionId)?.child;
  if (selected === undefined) {
    return [{ label: currentLabel ?? "Composition" }];
  }
  const lineage = [...ancestorsOf(document, selectionId), selected];
  const segments: HumanBuilderPathSegment[] = [];
  for (const [index, child] of lineage.entries()) {
    const last = index === lineage.length - 1;
    segments.push({
      label: last && currentLabel !== undefined
        ? currentLabel
        : child.kind === "component"
        ? componentName(child)
        : "Text",
      nodeId: child.id,
    });
    if (child.kind !== "component") continue;
    const next = lineage[index + 1];
    if (next === undefined) continue;
    const location = findChild(document, next.id)?.location;
    if (
      location?.parent === "node" && location.nodeId === child.id &&
      location.prop !== "children"
    ) segments.push({ label: builderControlLabel(child.slug, location.prop) });
  }
  return segments;
}

export function humanBuilderSelectionPath(
  document: BuilderDocument,
  selectionId: string,
  currentLabel?: string,
): string {
  return humanBuilderSelectionSegments(document, selectionId, currentLabel)
    .map(({ label }) => label).join(" › ");
}

interface IndexedBuilderNode {
  readonly node: BuilderNode;
  readonly technicalPath: string;
}

function indexedBuilderNodes(
  document: BuilderDocument,
): readonly IndexedBuilderNode[] {
  const indexed: IndexedBuilderNode[] = [];
  const visit = (child: BuilderSlotChild, technicalPath: string): void => {
    if (child.kind !== "component") return;
    indexed.push({ node: child, technicalPath });
    for (const [prop, value] of Object.entries(child.props)) {
      if (value.kind !== "slot") continue;
      for (const [index, nested] of value.children.entries()) {
        visit(
          nested,
          `${technicalPath}.props.${prop}.children[${String(index)}]`,
        );
      }
    }
  };
  for (const [index, child] of document.children.entries()) {
    visit(child, `document.children[${String(index)}]`);
  }
  return indexed;
}

export interface ProjectedBuilderIssueTarget {
  readonly nodeId: string;
  readonly controlName?: string;
  readonly humanPath: string;
}

/** Resolve an exact policy path back to the deepest affected control. */
export function projectDocumentIssueTarget(
  document: BuilderDocument,
  technical: string,
): ProjectedBuilderIssueTarget | undefined {
  const match = indexedBuilderNodes(document)
    .filter(({ technicalPath }) => technical.startsWith(technicalPath))
    .sort((left, right) =>
      right.technicalPath.length - left.technicalPath.length
    )[0];
  if (match === undefined) return undefined;
  const suffix = technical.slice(match.technicalPath.length);
  const extra = suffix.startsWith(".extra");
  const prop = /^\.props\.([A-Za-z_$][A-Za-z0-9_$]*)/.exec(suffix)?.[1];
  const controlName = extra ? "additional-props" : prop;
  const controlLabel = extra
    ? "Additional props"
    : prop === undefined
    ? undefined
    : builderControlLabel(match.node.slug, prop);
  const selectionPath = humanBuilderSelectionPath(
    document,
    match.node.id,
  );
  return {
    nodeId: match.node.id,
    ...(controlName === undefined ? {} : { controlName }),
    humanPath: controlLabel === undefined
      ? selectionPath
      : `${selectionPath} › ${controlLabel}`,
  };
}

/** Match 2B's human-path refusal back to its deepest affected Component. */
function comparableHumanPath(value: string): string {
  return value.split("›")
    .map((segment) => segment.toLocaleLowerCase().replace(/[^a-z0-9]+/gu, ""))
    .filter((segment) => segment !== "" && segment !== "children")
    .join("›");
}

export function builderNodeIdForHumanPath(
  document: BuilderDocument,
  humanPath: string,
): string | undefined {
  const normalized = comparableHumanPath(humanPath);
  return indexedBuilderNodes(document)
    .map(({ node }) => ({
      id: node.id,
      path: comparableHumanPath(humanBuilderSelectionPath(document, node.id)),
    }))
    .filter(({ path }) =>
      normalized === path || normalized.startsWith(`${path}›`)
    )
    .sort((left, right) => right.path.length - left.path.length)[0]?.id;
}

function offsetLocation(source: string, offset: number): {
  readonly line: number;
  readonly column: number;
} {
  const prefix = source.slice(0, Math.max(0, offset));
  const lines = prefix.split("\n");
  return {
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
  };
}

function syntaxLocation(source: string, message: string): {
  readonly line: number;
  readonly column: number;
} {
  const explicit = /line\s+(\d+)\s+column\s+(\d+)/i.exec(message);
  if (explicit !== null) {
    return { line: Number(explicit[1]), column: Number(explicit[2]) };
  }
  const position = /position\s+(\d+)/i.exec(message);
  return offsetLocation(
    source,
    position === null ? source.length : Number(position[1]),
  );
}

function shortSyntaxReason(message: string): string {
  const reason = message
    .replace(/^SyntaxError:\s*/i, "")
    .replace(/\s+in JSON at position[\s\S]*$/i, "")
    .replace(/\s+at position[\s\S]*$/i, "")
    .replace(/\s*\(line\s+\d+\s+column\s+\d+\)\s*$/i, "")
    .replace(/^JSON Parse error:\s*/i, "")
    .trim();
  if (/unexpected end/i.test(reason)) return "finish the JSON value";
  if (/property name|double-quoted/i.test(reason)) {
    return "use a quoted property name or close the object";
  }
  if (/unexpected token/i.test(reason)) return "remove the unexpected token";
  return reason === "" ? "enter valid JSON" : reason.toLowerCase();
}

/** A syntax-only draft check. Policy acceptance remains the strict authority. */
export function projectJsonDraftIssue(
  source: string,
  humanPath: string,
): ProjectedBuilderIssue | null {
  if (source.trim() === "") return null;
  try {
    JSON.parse(source);
    return null;
  } catch (error) {
    const technical = error instanceof Error ? error.message : String(error);
    const { line, column } = syntaxLocation(source, technical);
    return {
      message: `Fix ${humanPath}: line ${String(line)}, column ${
        String(column)
      } — ${shortSyntaxReason(technical)}.`,
      technical,
    };
  }
}

function policyRemedy(message: string): string {
  if (/valid JSON/i.test(message)) return "enter valid JSON";
  if (/JSON object/i.test(message)) return "use a JSON object";
  if (/cannot override modeled prop/i.test(message)) {
    return "remove the prop already controlled above";
  }
  if (/executable .*URL|javascript:|data:/i.test(message)) {
    return "remove the executable URL";
  }
  if (
    /event handler|^on[A-Z]|dangerouslySetInnerHTML|\bref\b|\bkey\b/i.test(
      message,
    )
  ) {
    return "remove the unsafe React prop";
  }
  if (/limit|too many|exceeds|depth/i.test(message)) {
    return "reduce this value to the stated limit";
  }
  return "change this value so the component can accept it";
}

/** Project one policy rejection to its human control while retaining proof. */
export function projectPolicyIssue(
  technical: string,
  humanPath: string,
): ProjectedBuilderIssue {
  return {
    message: `Fix ${humanPath}: ${policyRemedy(technical)}.`,
    technical,
  };
}
