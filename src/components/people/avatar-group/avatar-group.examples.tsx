import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { Avatar } from "../avatar/avatar.tsx";
import { AvatarGroup } from "./avatar-group.tsx";

export const conformance = [{
  name: "the stack clamps to max and announces the remainder",
  steps: [
    {
      expect: "attribute",
      target: { selector: ".discern-avatar-group" },
      attribute: "role",
      value: "group",
    },
    {
      expect: "visible",
      target: { selector: ".discern-avatar-group__overflow" },
    },
    {
      expect: "attribute",
      target: { selector: ".discern-avatar-group__overflow" },
      attribute: "aria-label",
      value: "2 more",
    },
  ],
}] satisfies readonly ConformanceScenario[];

export default function AvatarGroupExamples() {
  return (
    <div className="discern-example-row">
      <AvatarGroup label="Reviewers" max={3}>
        <Avatar name="Priya Anand" />
        <Avatar name="Jonah Reyes" />
        <Avatar name="Ada Osei" />
        <Avatar name="Tomás Vega" />
        <Avatar name="June Park" />
      </AvatarGroup>
      <AvatarGroup label="On the call" size="sm">
        <Avatar name="Morgan Ellis" size="sm" />
        <Avatar name="June Park" size="sm" />
        <Avatar name="Ada Osei" size="sm" />
      </AvatarGroup>
    </div>
  );
}
