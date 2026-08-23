/** Pure opportunistic terminal projection for validated flow diagrams. */

import { renderStyledSpans, styleText } from "../../../cli/ansi.ts";
import { renderBox } from "../../../cli/box.ts";
import type {
  DiagramKindCliDeclineCode,
  DiagramKindCliProjection,
  DiagramKindCliProjector,
  DiagramKindCliProjectorContext,
} from "../../../cli/diagram-kinds.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { composeCliBlocks } from "../../../cli/rhythm.ts";
import { measureText, wrapText } from "../../../cli/text.ts";
import {
  type TerminalSemanticTone,
  terminalThemeColor,
  terminalThemes,
  terminalToneColor,
} from "../../../cli/theme.ts";
import { triangleGlyph, TRIANGLES } from "../../../cli/triangles.ts";
import type {
  FlowEdgeEmphasis,
  FlowNodeRole,
  ValidatedFlowDiagram,
} from "./flow.spec.ts";

const ENHANCED_LIMITS = Object.freeze({
  minimumWidth: 52,
  nodes: 6,
  edges: 8,
  rankDepth: 4,
  rankWidth: 2,
  branching: 2,
  returnEdges: 1,
  summaryLines: 2,
  nodeLines: 2,
  edgeLines: 2,
});

function decline(
  code: DiagramKindCliDeclineCode,
  fact: number,
  limit: number,
): DiagramKindCliProjection {
  return { kind: "declined", code, fact, limit };
}

function nodeTone(role: FlowNodeRole): TerminalSemanticTone {
  if (role === "start") return "accent";
  if (role === "decision") return "warning";
  if (role === "end") return "success";
  return "neutral";
}

function connectorGlyph(
  emphasis: FlowEdgeEmphasis,
  unicode: boolean,
): string {
  if (emphasis === "primary") {
    return `${unicode ? "──" : "--"}${
      triangleGlyph(TRIANGLES.filledSmall.right, unicode)
    }`;
  }
  if (emphasis === "secondary") {
    return `${unicode ? "┄┄" : "-."}${
      triangleGlyph(TRIANGLES.unfilled.right, unicode)
    }`;
  }
  return `${unicode ? "┈┈" : "~~"}${
    triangleGlyph(TRIANGLES.filledSmall.right, unicode)
  }`;
}

function edgeTone(emphasis: FlowEdgeEmphasis): TerminalSemanticTone {
  return emphasis === "return" ? "accent" : "neutral";
}

function plainNodeLines(
  spec: ValidatedFlowDiagram,
  marker: string,
): readonly string[] {
  return spec.nodes.flatMap((node, index) => [
    `${marker} ${index + 1}. ${node.role} ${node.id}: ${node.label}`,
    ...(node.annotation === undefined
      ? []
      : [`  annotation: ${node.annotation}`]),
  ]);
}

function plainEdgeLines(
  spec: ValidatedFlowDiagram,
  unicode: boolean,
): readonly string[] {
  return spec.edges.map((edge) =>
    `${edge.emphasis} ${edge.id}: ${edge.from} ${
      connectorGlyph(edge.emphasis, unicode)
    } ${edge.to}${
      edge.label === undefined ? "" : `${unicode ? " — " : " - "}${edge.label}`
    }`
  );
}

function viability(
  spec: ValidatedFlowDiagram,
  context: DiagramKindCliProjectorContext,
): DiagramKindCliProjection | undefined {
  const width = Math.min(context.maxWidth, context.capabilities.columns);
  if (width < ENHANCED_LIMITS.minimumWidth) {
    return decline("width", width, ENHANCED_LIMITS.minimumWidth);
  }
  if (measureText(spec.title) > width - 6) {
    return decline("title-width", measureText(spec.title), width - 6);
  }
  if (spec.nodes.length > ENHANCED_LIMITS.nodes) {
    return decline("node-count", spec.nodes.length, ENHANCED_LIMITS.nodes);
  }
  if (spec.edges.length > ENHANCED_LIMITS.edges) {
    return decline("edge-count", spec.edges.length, ENHANCED_LIMITS.edges);
  }
  if (spec.ranks.length > ENHANCED_LIMITS.rankDepth) {
    return decline("rank-depth", spec.ranks.length, ENHANCED_LIMITS.rankDepth);
  }
  const rankWidth = Math.max(0, ...spec.ranks.map((rank) => rank.length));
  if (rankWidth > ENHANCED_LIMITS.rankWidth) {
    return decline("rank-width", rankWidth, ENHANCED_LIMITS.rankWidth);
  }
  const branching = Math.max(
    0,
    ...spec.nodes.map((node) =>
      spec.edges.filter((edge) =>
        edge.from === node.id && edge.emphasis !== "return"
      ).length
    ),
  );
  if (branching > ENHANCED_LIMITS.branching) {
    return decline("branching", branching, ENHANCED_LIMITS.branching);
  }
  const returnEdges =
    spec.edges.filter((edge) => edge.emphasis === "return").length;
  if (returnEdges > ENHANCED_LIMITS.returnEdges) {
    return decline(
      "return-edges",
      returnEdges,
      ENHANCED_LIMITS.returnEdges,
    );
  }

  const innerWidth = width - 4;
  const summaryLines = wrapText(`Summary: ${spec.summary}`, innerWidth).length;
  if (summaryLines > ENHANCED_LIMITS.summaryLines) {
    return decline(
      "summary-wrap",
      summaryLines,
      ENHANCED_LIMITS.summaryLines,
    );
  }
  const marker = triangleGlyph(
    TRIANGLES.filledSmall.right,
    context.capabilities.unicode,
  );
  const nodeLines = Math.max(
    0,
    ...plainNodeLines(spec, marker).map((line) =>
      wrapText(line, innerWidth).length
    ),
  );
  if (nodeLines > ENHANCED_LIMITS.nodeLines) {
    return decline("node-wrap", nodeLines, ENHANCED_LIMITS.nodeLines);
  }
  const edgeLines = Math.max(
    0,
    ...plainEdgeLines(spec, context.capabilities.unicode).map((line) =>
      wrapText(line, innerWidth).length
    ),
  );
  if (edgeLines > ENHANCED_LIMITS.edgeLines) {
    return decline("edge-wrap", edgeLines, ENHANCED_LIMITS.edgeLines);
  }
  return undefined;
}

function renderEnhancedFlow(
  spec: ValidatedFlowDiagram,
  context: DiagramKindCliProjectorContext,
): string {
  const { capabilities } = context;
  const width = Math.min(context.maxWidth, capabilities.columns);
  const theme = terminalThemes[context.theme];
  const marker = triangleGlyph(
    TRIANGLES.filledSmall.right,
    capabilities.unicode,
  );
  const summary = styleText(
    `Summary: ${spec.summary}`,
    {
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      ...theme.typography.body,
    },
    capabilities,
  );
  const direction = styleText(
    `Direction: ${spec.direction.replaceAll("-", " ")}`,
    {
      color: terminalThemeColor(theme, "--discern-color-ink-faint"),
      ...theme.typography.annotation,
    },
    capabilities,
  );
  const section = (label: string): string =>
    styleText(
      label,
      {
        color: terminalToneColor(theme, "accent"),
        ...theme.typography.strong,
      },
      capabilities,
    );
  const nodes = spec.nodes.flatMap((node, index) => {
    const lines = [renderStyledSpans([
      {
        text: `${marker} ${index + 1}. ${node.role} ${node.id}: `,
        style: {
          color: terminalToneColor(theme, nodeTone(node.role)),
          ...theme.typography.strong,
        },
      },
      { text: node.label },
    ], capabilities)];
    if (node.annotation !== undefined) {
      lines.push(styleText(
        `  annotation: ${node.annotation}`,
        {
          color: terminalThemeColor(theme, "--discern-color-ink-faint"),
          ...theme.typography.annotation,
        },
        capabilities,
      ));
    }
    return lines;
  });
  const edges = spec.edges.map((edge) =>
    renderStyledSpans([
      {
        text: `${edge.emphasis} ${edge.id}: `,
        style: {
          color: terminalToneColor(theme, edgeTone(edge.emphasis)),
          ...theme.typography.strong,
        },
      },
      { text: `${edge.from} ` },
      {
        text: connectorGlyph(edge.emphasis, capabilities.unicode),
        style: {
          color: terminalToneColor(theme, edgeTone(edge.emphasis)),
          ...(edge.emphasis === "secondary" ? { dim: true as const } : {}),
        },
      },
      { text: ` ${edge.to}` },
      ...(edge.label === undefined ? [] : [{
        text: `${capabilities.unicode ? " — " : " - "}${edge.label}`,
        style: {
          color: terminalThemeColor(theme, "--discern-color-ink-muted"),
        },
      }]),
    ], capabilities)
  );
  const body = composeCliBlocks([
    joinVertical([summary, direction]),
    joinVertical([section("Nodes"), ...nodes]),
    joinVertical([section("Relationships"), ...edges]),
  ]);
  return renderBox(
    {
      title: spec.title,
      body,
      width,
      borderStyle: {
        color: terminalThemeColor(theme, "--discern-color-border-strong"),
      },
      bottomLabel: `${spec.nodes.length} nodes ${
        capabilities.unicode ? "·" : "|"
      } ${spec.edges.length} relationships`,
      bottomLabelStyle: {
        color: terminalThemeColor(theme, "--discern-color-ink-faint"),
        ...theme.typography.annotation,
      },
    },
    capabilities,
  );
}

/** Project a small coherent flow, or decline without losing any data. */
const projectFlowDiagramCli: DiagramKindCliProjector<"flow"> = (
  spec,
  context,
) => {
  const validated = spec as ValidatedFlowDiagram;
  const refusal = viability(validated, context);
  return refusal ??
    { kind: "frame", frame: renderEnhancedFlow(validated, context) };
};

export default projectFlowDiagramCli;
