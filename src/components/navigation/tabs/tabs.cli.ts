/**
 * Pure terminal renderer and deterministic example states for Tabs.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import { renderBox } from "../../../cli/box.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical, wrapInlineCluster } from "../../../cli/layout.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./tabs.meta.ts";
import type { TabsActivationMode } from "./tabs.types.ts";

/** One item in a terminal tab strip. */
export interface TabsCliItem {
  readonly value: string;
  readonly label: string;
  readonly content?: string;
  readonly disabled?: boolean;
}

/** Inputs accepted by the terminal Tabs renderer. */
export interface TabsCliProps {
  readonly items: readonly TabsCliItem[];
  readonly activeValue: string;
  readonly focusedValue?: string;
  readonly activationMode?: TabsActivationMode;
  readonly label?: string;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

const items = [
  { value: "overview", label: "Overview", content: "Summary content." },
  { value: "details", label: "Details", content: "Detailed content." },
  { value: "history", label: "History", disabled: true },
] as const;

const cliExampleImplementations = [
  { name: "default", props: { items, activeValue: "overview" } },
  { name: "details", props: { items, activeValue: "details" } },
  {
    name: "manual",
    props: {
      items,
      activeValue: "overview",
      focusedValue: "details",
      activationMode: "manual",
    },
  },
] as const satisfies readonly CliExample<TabsCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Tabs states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<TabsCliProps>[] =
  cliExampleImplementations;

/** Render one wrapping terminal tab strip and its selected panel. */
const renderTabsCli: CliRenderer<TabsCliProps> = (props, capabilities) => {
  if (props.items.length === 0) {
    throw new TypeError("tabs requires at least one item");
  }
  const active = props.items.find((item) =>
    item.value === props.activeValue && item.disabled !== true
  );
  if (active === undefined) {
    throw new TypeError("tabs active value must identify an enabled item");
  }
  const width = Math.min(
    props.width ?? capabilities.columns,
    capabilities.columns,
  );
  if (!Number.isSafeInteger(width) || width < 8) {
    throw new TypeError(
      `tabs width must be a safe integer of at least 8; received ${width}`,
    );
  }
  const theme = terminalThemes[props.theme ?? "dark"];
  const tabs = props.items.map((item) => {
    if (item.disabled === true) return `(${item.label})`;
    if (item.value === props.activeValue) return `[${item.label}]`;
    if (item.value === props.focusedValue) {
      return `${capabilities.unicode ? "›" : ">"}${item.label}`;
    }
    return item.label;
  });
  const strip = styleText(
    wrapInlineCluster(tabs, { columns: width, gap: 1 }),
    {
      ...theme.typography.strong,
      color: terminalToneColor(theme, "accent"),
    },
    capabilities,
  );
  const panel = active.content === undefined ? "" : renderBox({
    body: active.content,
    title: active.label,
    width,
    borderStyle: { color: terminalToneColor(theme, "neutral") },
  }, capabilities);
  return joinVertical([
    props.label === undefined
      ? ""
      : styleText(props.label, theme.typography.annotation, capabilities),
    strip,
    panel,
  ]);
};

export default renderTabsCli;
