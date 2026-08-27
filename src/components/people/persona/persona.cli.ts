/**
 * Pure terminal renderer and deterministic example states for Persona.
 *
 * @module
 */

import { renderStyledSpans } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { measureText, wrapText } from "../../../cli/text.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import { derivedInitials } from "../../initials.ts";
import type { AvatarPresence } from "../avatar/avatar.types.ts";
import meta, { componentExampleVocabulary } from "./persona.meta.ts";
import type { PersonaSize } from "./persona.types.ts";

/** Inputs accepted by the terminal Persona renderer. */
export interface PersonaCliProps {
  readonly name: string;
  readonly detail?: string;
  readonly initials?: string;
  readonly presence?: AvatarPresence;
  readonly presenceLabel?: string;
  readonly size?: PersonaSize;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Persona states rendered by the CLI catalogue. */
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
    { name: "default", props: { name: "Ada Osei", detail: "Research" } },
    {
      name: "with-presence",
      props: {
        name: "Morgan Ellis",
        detail: "Engineering lead",
        presence: "online",
      },
    },
    {
      name: "long-name",
      props: {
        name: "Alexandrine Featherstonehaugh-Cholmondeley",
        detail: "Research programme coordination across several regions",
        maxWidth: 24,
      },
    },
  ] as const satisfies readonly CliExample<PersonaCliProps>[],
);

/** Render an initials chip, name, detail, and explicit presence lockup. */
const renderPersonaCli: CliRenderer<PersonaCliProps> = (
  props,
  capabilities,
) => {
  if (props.name.trim() === "") {
    throw new TypeError("persona name must be non-empty");
  }
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 8) {
    throw new TypeError(
      `persona width must be a safe integer of at least 8; received ${requested}`,
    );
  }
  const width = Math.min(requested, capabilities.columns);
  const initials = props.initials?.trim().toLocaleUpperCase() ??
    derivedInitials(props.name, 2);
  if (initials === "") {
    throw new TypeError("persona initials must be non-empty");
  }
  const chip = props.size === "lg" ? `[ ${initials} ]` : `[${initials}]`;
  const separator = capabilities.unicode ? " — " : " - ";
  const presence = props.presence === undefined
    ? ""
    : ` [${props.presenceLabel ?? props.presence}]`;
  const body = `${props.name}${
    props.detail === undefined ? "" : `${separator}${props.detail}`
  }${presence}`;
  const prefix = `${chip} `;
  const lines = wrapText(body, Math.max(1, width - measureText(prefix)));
  const theme = terminalThemes[props.theme ?? "dark"];
  const first = renderStyledSpans([
    {
      text: chip,
      style: {
        ...theme.typography.strong,
        color: terminalToneColor(theme, "accent"),
      },
    },
    { text: ` ${lines[0] ?? ""}` },
  ], capabilities);
  const continuation = lines.slice(1).map((line) =>
    `${" ".repeat(measureText(prefix))}${line}`
  );
  return [first, ...continuation].join("\n");
};

export default renderPersonaCli;
