/** Pure opportunistic terminal projection for validated cycle diagrams. */

import { renderStyledSpans, styleText } from "../../../cli/ansi.ts";
import { renderBox } from "../../../cli/box.ts";
import type {
  DiagramKindCliDeclineCode,
  DiagramKindCliProjection,
  DiagramKindCliProjectorContext,
} from "../../../cli/diagram-kinds.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { composeCliBlocks } from "../../../cli/rhythm.ts";
import { measureText, wrapText } from "../../../cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  terminalToneColor,
} from "../../../cli/theme.ts";
import { triangleGlyph, TRIANGLES } from "../../../cli/triangles.ts";
import type {
  CycleDiagramSpec,
  CycleSpokeDirection,
  ValidatedCycleDiagram,
} from "./cycle.spec.ts";

const ENHANCED_LIMITS = Object.freeze({
  minimumWidth: 58,
  stages: 6,
  spokes: 6,
  summaryLines: 2,
  stageLines: 2,
  relationshipLines: 2,
});

function decline(
  code: DiagramKindCliDeclineCode,
  fact: number,
  limit: number,
): DiagramKindCliProjection {
  return { kind: "declined", code, fact, limit };
}

function directionGlyph(
  direction: CycleSpokeDirection,
  unicode: boolean,
): string {
  const triangle = triangleGlyph(
    direction === "to-hub"
      ? TRIANGLES.filledSmall.right
      : TRIANGLES.filledSmall.left,
    unicode,
  );
  return direction === "to-hub"
    ? `${unicode ? "──" : "--"}${triangle}`
    : `${triangle}${unicode ? "──" : "--"}`;
}

function plainStageLines(
  spec: ValidatedCycleDiagram,
  marker: string,
): readonly string[] {
  return spec.stages.flatMap((stage, index) => [
    `${marker} ${index + 1}. ${stage.id}: ${stage.label}`,
    ...(stage.annotation === undefined
      ? []
      : [`  annotation: ${stage.annotation}`]),
  ]);
}

function plainHubLines(spec: ValidatedCycleDiagram): readonly string[] {
  if (spec.hub === undefined) return ["Hub: none"];
  return [
    `Hub ${spec.hub.id}: ${spec.hub.label}`,
    ...(spec.hub.annotation === undefined
      ? []
      : [`  annotation: ${spec.hub.annotation}`]),
  ];
}

function plainRelationshipLines(
  spec: ValidatedCycleDiagram,
  unicode: boolean,
): readonly string[] {
  if (spec.spokes.length === 0) return ["none"];
  return spec.spokes.map((spoke) => {
    const source = spoke.direction === "to-hub"
      ? spoke.stageId
      : spec.hub?.id ?? "hub";
    const target = spoke.direction === "to-hub"
      ? spec.hub?.id ?? "hub"
      : spoke.stageId;
    return `${spoke.id}: ${source} ${
      directionGlyph(spoke.direction, unicode)
    } ${target}${unicode ? " — " : " - "}${spoke.label}`;
  });
}

function viability(
  spec: ValidatedCycleDiagram,
  context: DiagramKindCliProjectorContext,
): DiagramKindCliProjection | undefined {
  const width = Math.min(context.maxWidth, context.capabilities.columns);
  if (width < ENHANCED_LIMITS.minimumWidth) {
    return decline("width", width, ENHANCED_LIMITS.minimumWidth);
  }
  if (measureText(spec.title) > width - 6) {
    return decline("title-width", measureText(spec.title), width - 6);
  }
  if (spec.stages.length > ENHANCED_LIMITS.stages) {
    return decline("stage-count", spec.stages.length, ENHANCED_LIMITS.stages);
  }
  if (spec.spokes.length > ENHANCED_LIMITS.spokes) {
    return decline("spoke-count", spec.spokes.length, ENHANCED_LIMITS.spokes);
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
  const stageLines = Math.max(
    0,
    ...[
      ...plainStageLines(spec, marker),
      ...plainHubLines(spec),
    ].map((line) => wrapText(line, innerWidth).length),
  );
  if (stageLines > ENHANCED_LIMITS.stageLines) {
    return decline("stage-wrap", stageLines, ENHANCED_LIMITS.stageLines);
  }
  const relationshipLines = Math.max(
    0,
    ...plainRelationshipLines(spec, context.capabilities.unicode).map((line) =>
      wrapText(line, innerWidth).length
    ),
  );
  if (relationshipLines > ENHANCED_LIMITS.relationshipLines) {
    return decline(
      "relationship-wrap",
      relationshipLines,
      ENHANCED_LIMITS.relationshipLines,
    );
  }
  return undefined;
}

function renderEnhancedCycle(
  spec: ValidatedCycleDiagram,
  context: DiagramKindCliProjectorContext,
): string {
  const { capabilities } = context;
  const width = Math.min(context.maxWidth, capabilities.columns);
  const theme = terminalThemes[context.theme];
  const marker = triangleGlyph(
    TRIANGLES.filledSmall.right,
    capabilities.unicode,
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
  const summary = styleText(
    `Summary: ${spec.summary}`,
    {
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      ...theme.typography.body,
    },
    capabilities,
  );
  const repeat = styleText(
    "Repeats: after the final stage, return to stage 1.",
    {
      color: terminalThemeColor(theme, "--discern-color-ink-faint"),
      ...theme.typography.annotation,
    },
    capabilities,
  );
  const stages = spec.stages.flatMap((stage, index) => {
    const lines = [renderStyledSpans([
      {
        text: `${marker} ${index + 1}. ${stage.id}: `,
        style: {
          color: terminalToneColor(theme, "neutral"),
          ...theme.typography.strong,
        },
      },
      { text: stage.label },
    ], capabilities)];
    if (stage.annotation !== undefined) {
      lines.push(styleText(
        `  annotation: ${stage.annotation}`,
        {
          color: terminalThemeColor(theme, "--discern-color-ink-faint"),
          ...theme.typography.annotation,
        },
        capabilities,
      ));
    }
    return lines;
  });
  const hub = spec.hub === undefined
    ? [styleText("Hub: none", {
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
    }, capabilities)]
    : [
      renderStyledSpans([
        {
          text: `Hub ${spec.hub.id}: `,
          style: {
            color: terminalToneColor(theme, "accent"),
            ...theme.typography.strong,
          },
        },
        { text: spec.hub.label },
      ], capabilities),
      ...(spec.hub.annotation === undefined ? [] : [styleText(
        `  annotation: ${spec.hub.annotation}`,
        {
          color: terminalThemeColor(theme, "--discern-color-ink-faint"),
          ...theme.typography.annotation,
        },
        capabilities,
      )]),
    ];
  const relationships = spec.spokes.length === 0
    ? [styleText("none", {
      color: terminalThemeColor(theme, "--discern-color-ink-faint"),
      ...theme.typography.annotation,
    }, capabilities)]
    : spec.spokes.map((spoke) => {
      const source = spoke.direction === "to-hub"
        ? spoke.stageId
        : spec.hub?.id ?? "hub";
      const target = spoke.direction === "to-hub"
        ? spec.hub?.id ?? "hub"
        : spoke.stageId;
      return renderStyledSpans([
        {
          text: `${spoke.id}: `,
          style: {
            color: terminalToneColor(theme, "accent"),
            ...theme.typography.strong,
          },
        },
        { text: `${source} ` },
        {
          text: directionGlyph(spoke.direction, capabilities.unicode),
          style: {
            color: terminalToneColor(theme, "accent"),
            ...(spoke.direction === "to-hub" ? { dim: true as const } : {}),
          },
        },
        { text: ` ${target}` },
        {
          text: `${capabilities.unicode ? " — " : " - "}${spoke.label}`,
          style: {
            color: terminalThemeColor(theme, "--discern-color-ink-muted"),
          },
        },
      ], capabilities);
    });
  const body = composeCliBlocks([
    joinVertical([summary, repeat]),
    joinVertical([section("Stages in repeating order"), ...stages]),
    joinVertical([section("Shared hub"), ...hub]),
    joinVertical([section("Hub relationships"), ...relationships]),
  ]);
  return renderBox(
    {
      title: spec.title,
      body,
      width,
      borderStyle: {
        color: terminalThemeColor(theme, "--discern-color-border-strong"),
      },
      bottomLabel: `${spec.stages.length} stages ${
        capabilities.unicode ? "·" : "|"
      } ${spec.spokes.length} hub relationships`,
      bottomLabelStyle: {
        color: terminalThemeColor(theme, "--discern-color-ink-faint"),
        ...theme.typography.annotation,
      },
    },
    capabilities,
  );
}

/** Project a small ordered loop, or decline without losing any data. */
export default function projectCycleDiagramCli(
  spec: CycleDiagramSpec,
  context: DiagramKindCliProjectorContext,
): DiagramKindCliProjection {
  const validated = spec as ValidatedCycleDiagram;
  const refusal = viability(validated, context);
  return refusal ?? {
    kind: "frame",
    frame: renderEnhancedCycle(validated, context),
  };
}
