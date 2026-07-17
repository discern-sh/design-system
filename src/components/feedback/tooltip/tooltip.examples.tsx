import { ExampleIcon } from "../../../fixtures/example-icon.tsx";
import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { IconButton } from "../../core/icon-button/icon-button.tsx";
import { Tooltip } from "./tooltip.tsx";

export const conformance = [{
  name: "keyboard focus reveals the described tooltip",
  steps: [
    { action: "focus", target: { role: "button", name: "Information" } },
    {
      expect: "visible",
      target: { role: "tooltip", name: "Lorem ipsum dolor" },
    },
    {
      expect: "describes",
      target: { role: "button", name: "Information" },
      description: { role: "tooltip", name: "Lorem ipsum dolor" },
    },
    { action: "press", key: "Tab" },
    {
      expect: "hidden",
      target: { role: "tooltip", name: "Lorem ipsum dolor" },
    },
  ],
}] satisfies readonly ConformanceScenario[];

export default function TooltipExamples() {
  return (
    <div className="discern-example-row">
      <Tooltip label="Lorem ipsum dolor">
        <IconButton
          icon={<ExampleIcon name="info" />}
          label="Information"
          variant="outline"
        />
      </Tooltip>
      <Tooltip label="Consectetur adipiscing" placement="bottom">
        <button className="discern-text-trigger" type="button">
          Focus or hover
        </button>
      </Tooltip>
    </div>
  );
}
