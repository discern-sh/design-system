/**
 * Pure terminal renderer and deterministic example states for Artifact tree.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { TerminalCapabilities } from "../../../cli/capabilities.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { truncateText } from "../../../cli/text.ts";
import {
  terminalThemeColor,
  type TerminalThemeVariant,
} from "../../../cli/theme.ts";
import type { ArtifactTreeNodeKind } from "./artifact-tree.types.ts";
import {
  assertWorkflowCliText,
  styleWorkflowHeading,
  workflowCliTheme,
  workflowCliWidth,
} from "../workflow-cli.ts";

/** One framework-neutral node accepted by the terminal Artifact tree renderer. */
export interface ArtifactTreeCliNode {
  readonly name: string;
  readonly path?: string;
  readonly kind: ArtifactTreeNodeKind;
  readonly annotation?: string;
  readonly children?: readonly ArtifactTreeCliNode[];
}

/** Inputs accepted by the terminal Artifact tree renderer. */
export interface ArtifactTreeCliProps {
  readonly nodes: readonly ArtifactTreeCliNode[];
  readonly label?: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Artifact tree states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ArtifactTreeCliProps>[] = [
  {
    name: "component",
    props: {
      label: "Command component",
      nodes: [{
        name: "command",
        kind: "directory",
        children: [
          { name: "command.cli.ts", kind: "file", annotation: "terminal" },
          { name: "command.tsx", kind: "file", annotation: "web" },
          { name: "command.meta.ts", kind: "file" },
        ],
      }],
    },
  },
] as const;

function validateNodes(
  nodes: readonly ArtifactTreeCliNode[],
  trail: string,
): void {
  for (const [index, node] of nodes.entries()) {
    const name = `${trail} node ${index + 1}`;
    assertWorkflowCliText(node.name, `${name} name`);
    if (node.path !== undefined) {
      assertWorkflowCliText(node.path, `${name} path`);
    }
    if (node.annotation !== undefined) {
      assertWorkflowCliText(node.annotation, `${name} annotation`);
    }
    if (node.kind === "file" && (node.children?.length ?? 0) > 0) {
      throw new TypeError(`${name} is a file and cannot contain children`);
    }
    if (node.children !== undefined) validateNodes(node.children, name);
  }
}

function treeLines(
  nodes: readonly ArtifactTreeCliNode[],
  width: number,
  capabilities: TerminalCapabilities,
  ancestorPrefix = "",
): readonly string[] {
  const lines: string[] = [];
  for (const [index, node] of nodes.entries()) {
    const last = index === nodes.length - 1;
    const branch = capabilities.unicode
      ? (last ? "└─" : "├─")
      : (last ? "`-" : "|-");
    const marker = capabilities.unicode
      ? (node.kind === "directory" ? "▱" : "⌑")
      : (node.kind === "directory" ? "[d]" : "[f]");
    const annotation = node.annotation === undefined
      ? ""
      : `${capabilities.unicode ? " — " : " - "}${node.annotation}`;
    lines.push(truncateText(
      `${ancestorPrefix}${branch}${marker} ${node.name}${annotation}`,
      width,
      capabilities.unicode ? "…" : ".",
    ));
    if (node.children !== undefined && node.children.length > 0) {
      const continuation = capabilities.unicode
        ? (last ? "  " : "│ ")
        : (last ? "   " : "|  ");
      lines.push(...treeLines(
        node.children,
        width,
        capabilities,
        `${ancestorPrefix}${continuation}`,
      ));
    }
  }
  return lines;
}

/** Render one capability-aware box-drawing artifact tree. */
const renderArtifactTreeCli: CliRenderer<ArtifactTreeCliProps> = (
  props,
  capabilities,
) => {
  if (props.nodes.length === 0) {
    throw new TypeError("artifact tree requires at least one node");
  }
  validateNodes(props.nodes, "artifact tree");
  const width = workflowCliWidth(props.maxWidth, capabilities, 8);
  const theme = workflowCliTheme(props.theme);
  const tree = styleText(
    treeLines(props.nodes, width, capabilities).join("\n"),
    { color: terminalThemeColor(theme, "--discern-color-ink") },
    capabilities,
  );
  if (props.label === undefined) return tree;
  assertWorkflowCliText(props.label, "artifact tree label");
  return [
    styleWorkflowHeading(
      truncateText(props.label, width, capabilities.unicode ? "…" : "."),
      "accent",
      capabilities,
      props.theme,
    ),
    tree,
  ].join("\n");
};

export default renderArtifactTreeCli;
