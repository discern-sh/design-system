/**
 * Pure terminal renderer and deterministic example states for Profile card.
 *
 * @module
 */

import { renderBox } from "../../../cli/box.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type {
  CliExample,
  CliPresentationOptions,
  CliRenderer,
} from "../../../cli/contracts.ts";
import { resolveTerminalTheme, terminalToneColor } from "../../../cli/theme.ts";
import { derivedInitials } from "../../initials.ts";
import meta, { componentExampleVocabulary } from "./profile-card.meta.ts";
import type { ProfileCardLayout } from "./profile-card.types.ts";

/** One link printed by a terminal Profile card. */
export interface ProfileCardCliLink {
  readonly label: string;
  readonly href: string;
}

/** Inputs accepted by the terminal Profile card renderer. */
export interface ProfileCardCliProps extends CliPresentationOptions {
  readonly name: string;
  readonly detail?: string;
  readonly bio?: string;
  readonly initials?: string;
  readonly links?: readonly ProfileCardCliLink[];
  readonly layout?: ProfileCardLayout;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      name: "Ada Osei",
      detail: "Research",
      bio: "Turns field evidence into clear research questions.",
      links: [{ label: "Field notes", href: "#field-notes" }],
    },
  },
  {
    name: "landscape",
    props: {
      name: "June Park",
      detail: "Editor at large",
      bio: "Edits each guide until the next action is clear.",
      links: [{ label: "From the desk", href: "#from-the-desk" }],
      layout: "landscape",
    },
  },
] as const satisfies readonly CliExample<ProfileCardCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Profile card states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ProfileCardCliProps>[] =
  cliExampleImplementations;

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
  const theme = resolveTerminalTheme(props);
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
