/**
 * Pure terminal renderer and deterministic example states for Avatar group.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { measureText } from "../../../cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import { derivedInitials } from "../../initials.ts";
import type { AvatarSize } from "../avatar/avatar.types.ts";
import meta, { componentExampleVocabulary } from "./avatar-group.meta.ts";

/** One person represented in a terminal Avatar group. */
export interface AvatarGroupCliPerson {
  readonly name: string;
  readonly initials?: string;
}

/** Inputs accepted by the terminal Avatar group renderer. */
export interface AvatarGroupCliProps {
  readonly people: readonly AvatarGroupCliPerson[];
  readonly max?: number;
  readonly label?: string;
  readonly size?: AvatarSize;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Avatar group states rendered by the CLI catalogue. */
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      name: "default",
      props: {
        label: "Reviewers",
        people: [
          { name: "Priya Anand" },
          { name: "Jonah Reyes" },
          { name: "Ada Osei" },
          { name: "Tomás Vega" },
          { name: "June Park" },
        ],
        max: 3,
      },
    },
    {
      name: "compact",
      props: {
        label: "On the call",
        people: [
          { name: "Morgan Ellis" },
          { name: "June Park" },
          { name: "Ada Osei" },
        ],
        size: "sm",
      },
    },
  ] as const satisfies readonly CliExample<AvatarGroupCliProps>[],
);

function wrapStyledItems(items: readonly string[], width: number): string {
  const lines: string[] = [];
  let current = "";
  for (const item of items) {
    const candidate = current === "" ? item : `${current} ${item}`;
    if (measureText(candidate) <= width) current = candidate;
    else {
      if (current !== "") lines.push(current);
      current = item;
    }
  }
  if (current !== "") lines.push(current);
  return lines.join("\n");
}

/** Render a wrapping cluster of initials chips with an overflow count. */
const renderAvatarGroupCli: CliRenderer<AvatarGroupCliProps> = (
  props,
  capabilities,
) => {
  if (props.people.length === 0) {
    throw new TypeError("avatar group people must be non-empty");
  }
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 4) {
    throw new TypeError(
      `avatar group width must be a safe integer of at least 4; received ${requested}`,
    );
  }
  if (
    props.max !== undefined &&
    (!Number.isSafeInteger(props.max) || props.max < 0)
  ) {
    throw new TypeError(
      `avatar group max must be a non-negative safe integer; received ${props.max}`,
    );
  }
  const width = Math.min(requested, capabilities.columns);
  const limit = Math.min(props.max ?? props.people.length, props.people.length);
  const theme = terminalThemes[props.theme ?? "dark"];
  const initialLimit = props.size === "xs" ? 1 : 2;
  const chips = props.people.slice(0, limit).map((person) => {
    const initials = person.initials?.trim().toLocaleUpperCase() ??
      derivedInitials(person.name, initialLimit);
    return styleText(`[${initials}]`, {
      ...theme.typography.strong,
      color: terminalToneColor(theme, "accent"),
    }, capabilities);
  });
  const hidden = props.people.length - limit;
  if (hidden > 0) {
    chips.push(styleText(`[+${hidden}]`, {
      ...theme.typography.annotation,
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
    }, capabilities));
  }
  const group = wrapStyledItems(chips, width);
  if (props.label === undefined) return group;
  return joinVertical([
    styleText(props.label, {
      ...theme.typography.annotation,
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
    }, capabilities),
    group,
  ]);
};

export default renderAvatarGroupCli;
