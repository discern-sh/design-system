/** Pure terminal peer-selection frames. @module */
import { defineCliExamples } from "../../../cli/component-examples.ts";
import {
  type CliExample,
  type CliPresentationOptions,
  cliPresentationPassthrough,
  type CliRenderer,
} from "../../../cli/contracts.ts";
import {
  renderFormCliChoiceRow,
  renderFormCliFrame,
  styleFormCliSelectedMark,
} from "../form-frame.ts";
import { resolveSegmentedControlValue } from "./segmented-control.types.ts";
import type { SegmentedControlChoice } from "./segmented-control.types.ts";
import meta, { componentExampleVocabulary } from "./segmented-control.meta.ts";

/** Inputs for a supplied selection; this renderer performs no interaction. */
export interface SegmentedControlCliProps extends CliPresentationOptions {
  readonly label: string;
  readonly items: readonly SegmentedControlChoice[];
  /** Supplied selection; otherwise the first enabled choice. */
  readonly value?: string;
  readonly disabled?: boolean;
  readonly width?: number;
  /** Include the shared form presentation label. */
  readonly showStatus?: boolean;
}
const items = [{ value: "list", label: "List" }, {
  value: "grid",
  label: "Grid",
}, { value: "timeline", label: "Timeline", disabled: true }] as const;
const cliExampleImplementations = [
  { name: "default", props: { label: "View", items } },
  {
    name: "long-labels",
    props: {
      label: "Processing policy",
      items: [{ value: "all", label: "Process every available item" }, {
        value: "new",
        label: "Process only newly added items",
      }, { value: "changed", label: "Process items with changes" }],
      value: "new",
    },
  },
  {
    name: "icons",
    props: { label: "Layout", items: items.slice(0, 2), value: "grid" },
  },
  {
    name: "disabled",
    props: { label: "View", items, value: "grid", disabled: true },
  },
] as const satisfies readonly CliExample<SegmentedControlCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);
/** Canonical terminal peer-selection examples. */
export const cliExamples: readonly CliExample<SegmentedControlCliProps>[] =
  cliExampleImplementations;
const renderSegmentedControlCli: CliRenderer<SegmentedControlCliProps> = (
  props,
  capabilities,
) => {
  const value = resolveSegmentedControlValue(props.items, props.value);
  const presentation = cliPresentationPassthrough(props);
  const control = props.items.map((item) => {
    const selected = item.value === value;
    const disabled = props.disabled === true || item.disabled === true;
    const mark = capabilities.unicode
      ? selected ? "◉" : "○"
      : selected
      ? "(*)"
      : "( )";
    return renderFormCliChoiceRow({
      ...presentation,
      pointer: "",
      marker: styleFormCliSelectedMark(mark, selected, {
        ...presentation,
        disabled,
      }, capabilities),
      label: item.label,
      disabled,
      ...(disabled ? { description: "Disabled" } : {}),
      ...(props.width === undefined ? {} : { width: props.width }),
    }, capabilities);
  }).join("\n");
  return renderFormCliFrame({
    ...presentation,
    label: props.label,
    control,
    lifecycle: { status: "active" },
    presentation: props.disabled
      ? "disabled"
      : value === undefined
      ? "idle"
      : "filled",
    ...(props.width === undefined ? {} : { width: props.width }),
    ...(props.showStatus === undefined ? {} : { showStatus: props.showStatus }),
  }, capabilities);
};
export default renderSegmentedControlCli;
