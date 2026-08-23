/** Pure opportunistic terminal projection for validated sequence diagrams. */

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
  type TerminalSemanticTone,
  terminalThemeColor,
  terminalThemes,
  terminalToneColor,
} from "../../../cli/theme.ts";
import { triangleGlyph, TRIANGLES } from "../../../cli/triangles.ts";
import type {
  SequenceMessageKind,
  ValidatedSequenceDiagram,
} from "./sequence.spec.ts";

const ENHANCED_LIMITS = Object.freeze({
  minimumWidth: 68,
  participants: 4,
  messages: 8,
  summaryLines: 2,
  participantLines: 2,
  messageLines: 2,
  noteLines: 2,
});

function decline(
  code: DiagramKindCliDeclineCode,
  fact: number,
  limit: number,
): DiagramKindCliProjection {
  return { kind: "declined", code, fact, limit };
}

function messageGlyph(kind: SequenceMessageKind, unicode: boolean): string {
  const head = triangleGlyph(
    kind === "signal" ? TRIANGLES.unfilled.right : TRIANGLES.filledSmall.right,
    unicode,
  );
  if (kind === "call") return `${unicode ? "──" : "--"}${head}`;
  if (kind === "signal") return `${unicode ? "┄┄" : "-."}${head}`;
  if (kind === "return") return `${unicode ? "┈┈" : "~~"}${head}`;
  return unicode ? `↻${head}` : `[self]${head}`;
}

function messageTone(kind: SequenceMessageKind): TerminalSemanticTone {
  if (kind === "signal") return "accent";
  if (kind === "return") return "accent";
  return "neutral";
}

function plainParticipantLines(
  spec: ValidatedSequenceDiagram,
  marker: string,
): readonly string[] {
  return spec.participants.flatMap((participant, index) => [
    `${marker} ${
      index + 1
    }. participant ${participant.id}: ${participant.label}`,
    ...(participant.annotation === undefined
      ? []
      : [`  annotation: ${participant.annotation}`]),
  ]);
}

function plainMessageLines(
  spec: ValidatedSequenceDiagram,
  unicode: boolean,
): readonly string[] {
  return spec.messages.map((message, index) =>
    `${index + 1}. ${message.kind} ${message.id}: ${message.source} ${
      messageGlyph(message.kind, unicode)
    } ${message.target}${unicode ? " — " : " - "}${message.label}`
  );
}

function plainNoteLines(spec: ValidatedSequenceDiagram): readonly string[] {
  return spec.notes.length === 0
    ? ["none"]
    : spec.notes.map((note, index) =>
      `${
        index + 1
      }. ${note.attachment} note ${note.id} on ${note.attachmentId}: ${note.label}`
    );
}

function viability(
  spec: ValidatedSequenceDiagram,
  context: DiagramKindCliProjectorContext,
): DiagramKindCliProjection | undefined {
  const width = Math.min(context.maxWidth, context.capabilities.columns);
  if (width < ENHANCED_LIMITS.minimumWidth) {
    return decline("width", width, ENHANCED_LIMITS.minimumWidth);
  }
  if (measureText(spec.title) > width - 6) {
    return decline("title-width", measureText(spec.title), width - 6);
  }
  if (spec.participants.length > ENHANCED_LIMITS.participants) {
    return decline(
      "participant-count",
      spec.participants.length,
      ENHANCED_LIMITS.participants,
    );
  }
  if (spec.messages.length > ENHANCED_LIMITS.messages) {
    return decline(
      "message-count",
      spec.messages.length,
      ENHANCED_LIMITS.messages,
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
  const participantLines = Math.max(
    0,
    ...plainParticipantLines(spec, marker).map((line) =>
      wrapText(line, innerWidth).length
    ),
  );
  if (participantLines > ENHANCED_LIMITS.participantLines) {
    return decline(
      "participant-wrap",
      participantLines,
      ENHANCED_LIMITS.participantLines,
    );
  }
  const messageLines = Math.max(
    0,
    ...plainMessageLines(spec, context.capabilities.unicode).map((line) =>
      wrapText(line, innerWidth).length
    ),
  );
  if (messageLines > ENHANCED_LIMITS.messageLines) {
    return decline(
      "message-wrap",
      messageLines,
      ENHANCED_LIMITS.messageLines,
    );
  }
  const noteLines = Math.max(
    0,
    ...plainNoteLines(spec).map((line) => wrapText(line, innerWidth).length),
  );
  if (noteLines > ENHANCED_LIMITS.noteLines) {
    return decline("note-wrap", noteLines, ENHANCED_LIMITS.noteLines);
  }
  return undefined;
}

function renderEnhancedSequence(
  spec: ValidatedSequenceDiagram,
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
  const participants = spec.participants.flatMap((participant, index) => {
    const lines = [renderStyledSpans([
      {
        text: `${marker} ${index + 1}. participant ${participant.id}: `,
        style: {
          color: terminalToneColor(theme, "neutral"),
          ...theme.typography.strong,
        },
      },
      { text: participant.label },
    ], capabilities)];
    if (participant.annotation !== undefined) {
      lines.push(styleText(
        `  annotation: ${participant.annotation}`,
        {
          color: terminalThemeColor(theme, "--discern-color-ink-faint"),
          ...theme.typography.annotation,
        },
        capabilities,
      ));
    }
    return lines;
  });
  const messages = spec.messages.map((message, index) =>
    renderStyledSpans([
      {
        text: `${index + 1}. ${message.kind} ${message.id}: `,
        style: {
          color: terminalToneColor(theme, messageTone(message.kind)),
          ...theme.typography.strong,
        },
      },
      { text: `${message.source} ` },
      {
        text: messageGlyph(message.kind, capabilities.unicode),
        style: {
          color: terminalToneColor(theme, messageTone(message.kind)),
          ...(message.kind === "signal" || message.kind === "return"
            ? { dim: true as const }
            : {}),
        },
      },
      { text: ` ${message.target}` },
      {
        text: `${capabilities.unicode ? " — " : " - "}${message.label}`,
        style: {
          color: terminalThemeColor(theme, "--discern-color-ink-muted"),
        },
      },
    ], capabilities)
  );
  const notes = spec.notes.length === 0
    ? [styleText(
      "none",
      {
        color: terminalThemeColor(theme, "--discern-color-ink-faint"),
        ...theme.typography.annotation,
      },
      capabilities,
    )]
    : spec.notes.map((note, index) =>
      renderStyledSpans([
        {
          text: `${
            index + 1
          }. ${note.attachment} note ${note.id} on ${note.attachmentId}: `,
          style: {
            color: terminalThemeColor(theme, "--discern-color-ink-faint"),
            ...theme.typography.annotation,
          },
        },
        { text: note.label },
      ], capabilities)
    );
  const body = composeCliBlocks([
    summary,
    joinVertical([section("Participants"), ...participants]),
    joinVertical([section("Messages in authored order"), ...messages]),
    joinVertical([section("Notes"), ...notes]),
  ]);
  return renderBox(
    {
      title: spec.title,
      body,
      width,
      borderStyle: {
        color: terminalThemeColor(theme, "--discern-color-border-strong"),
      },
      bottomLabel: `${spec.participants.length} participants ${
        capabilities.unicode ? "·" : "|"
      } ${spec.messages.length} messages`,
      bottomLabelStyle: {
        color: terminalThemeColor(theme, "--discern-color-ink-faint"),
        ...theme.typography.annotation,
      },
    },
    capabilities,
  );
}

/** Project a small complete sequence, or decline without losing any data. */
export default function projectSequenceDiagramCli(
  spec: unknown,
  context: DiagramKindCliProjectorContext,
): DiagramKindCliProjection {
  const validated = spec as ValidatedSequenceDiagram;
  const refusal = viability(validated, context);
  return refusal ?? {
    kind: "frame",
    frame: renderEnhancedSequence(validated, context),
  };
}
