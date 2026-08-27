/**
 * Pure terminal renderer and deterministic example states for Avatar.
 *
 * @module
 */

import { renderStyledSpans, type StyledSpan } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { measureText, truncateText } from "../../../cli/text.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import { derivedInitials } from "../../initials.ts";
import meta, { componentExampleVocabulary } from "./avatar.meta.ts";
import type {
  AvatarPresence,
  AvatarShape,
  AvatarSize,
} from "./avatar.types.ts";

/** Inputs accepted by the terminal Avatar renderer. */
export interface AvatarCliProps {
  readonly name: string;
  readonly initials?: string;
  readonly size?: AvatarSize;
  readonly shape?: AvatarShape;
  readonly presence?: AvatarPresence;
  readonly presenceLabel?: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Avatar states rendered by the CLI catalogue. */
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      name: "default",
      props: { name: "Morgan Ellis", presence: "online", size: "lg" },
    },
    {
      name: "square",
      props: { name: "Tomás Vega", shape: "square", size: "lg" },
    },
  ] as const satisfies readonly CliExample<AvatarCliProps>[],
);

const PRESENCE_TONES = {
  online: "success",
  away: "warning",
  busy: "danger",
  offline: "neutral",
} as const;

const UNICODE_PRESENCE = {
  online: "●",
  away: "◐",
  busy: "■",
  offline: "○",
} as const;

const ASCII_PRESENCE = {
  online: "*",
  away: "~",
  busy: "!",
  offline: "o",
} as const;

/** Render one initials Avatar with optional explicit presence text. */
const renderAvatarCli: CliRenderer<AvatarCliProps> = (props, capabilities) => {
  if (props.name.trim() === "") {
    throw new TypeError("avatar name must be non-empty");
  }
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 3) {
    throw new TypeError(
      `avatar width must be a safe integer of at least 3; received ${requested}`,
    );
  }
  const width = Math.min(requested, capabilities.columns);
  const size = props.size ?? "md";
  const limit = size === "xs" ? 1 : 2;
  const monogram = props.initials === undefined
    ? derivedInitials(props.name, limit)
    : truncateText(props.initials.trim().toLocaleUpperCase(), limit, "");
  if (monogram === "") throw new TypeError("avatar initials must be non-empty");
  const padded = size === "lg" || size === "xl" ? ` ${monogram} ` : monogram;
  const chip = props.shape === "square" ? `[${padded}]` : `(${padded})`;
  const theme = terminalThemes[props.theme ?? "dark"];
  const spans: StyledSpan[] = [{
    text: chip,
    style: {
      ...theme.typography.strong,
      color: terminalToneColor(theme, "accent"),
    },
  }];
  if (props.presence !== undefined && width > measureText(chip) + 2) {
    const glyphs = capabilities.unicode ? UNICODE_PRESENCE : ASCII_PRESENCE;
    const label = props.presenceLabel ?? props.presence;
    const available = width - measureText(chip) - 2 -
      measureText(glyphs[props.presence]);
    spans.push({ text: " " });
    spans.push({
      text: glyphs[props.presence],
      style: {
        color: terminalToneColor(theme, PRESENCE_TONES[props.presence]),
      },
    });
    if (available > 0) {
      spans.push({
        text: ` ${
          truncateText(
            label,
            available,
            capabilities.unicode ? "…" : ".",
          )
        }`,
      });
    }
  }
  return renderStyledSpans(spans, capabilities);
};

export default renderAvatarCli;
