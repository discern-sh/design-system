/**
 * Pure terminal renderer and deterministic example states for Profile card.
 *
 * @module
 */

import { renderBox } from "../../../cli/box.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import { derivedInitials } from "../../initials.ts";
import type { ProfileCardLayout } from "./profile-card.types.ts";

/** One link printed by a terminal Profile card. */
export interface ProfileCardCliLink {
  readonly label: string;
  readonly href: string;
}

/** Inputs accepted by the terminal Profile card renderer. */
export interface ProfileCardCliProps {
  readonly name: string;
  readonly detail?: string;
  readonly bio?: string;
  readonly initials?: string;
  readonly links?: readonly ProfileCardCliLink[];
  readonly layout?: ProfileCardLayout;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Profile card states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ProfileCardCliProps>[] = [
  {
    name: "portrait",
    props: {
      name: "Ada Osei",
      detail: "Research",
      bio: "Turns field evidence into the questions a roadmap has to answer.",
      links: [{ label: "Field notes", href: "/people/ada/notes" }],
    },
  },
] as const;

/** Render one framed terminal identity card with visible link destinations. */
const renderProfileCardCli: CliRenderer<ProfileCardCliProps> = (
  props,
  capabilities,
) => {
  if (props.name.trim() === "") {
    throw new TypeError("profile card name must be non-empty");
  }
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 9) {
    throw new TypeError(
      `profile card width must be a safe integer of at least 9; received ${requested}`,
    );
  }
  const width = Math.min(requested, capabilities.columns);
  const initials = props.initials?.trim().toLocaleUpperCase() ??
    derivedInitials(props.name, 2);
  if (initials === "") {
    throw new TypeError("profile card initials must be non-empty");
  }
  const separator = capabilities.unicode ? " — " : " - ";
  const identity = props.layout === "landscape" && props.detail !== undefined
    ? `[${initials}] ${props.name}${separator}${props.detail}`
    : `[${initials}] ${props.name}`;
  const body: string[] = [identity];
  if (props.layout !== "landscape" && props.detail !== undefined) {
    body.push(props.detail);
  }
  if (props.bio !== undefined) body.push("", props.bio);
  if ((props.links?.length ?? 0) > 0) {
    body.push(
      "",
      ...(props.links ?? []).map((link) => `${link.label}: ${link.href}`),
    );
  }
  const theme = terminalThemes[props.theme ?? "dark"];
  return renderBox({
    title: "Profile",
    body: body.join("\n"),
    width,
    borderStyle: {
      ...theme.typography.strong,
      color: terminalToneColor(theme, "accent"),
    },
  }, capabilities);
};

export default renderProfileCardCli;
