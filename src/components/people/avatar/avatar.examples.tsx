import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { Avatar } from "./avatar.tsx";

const portrait =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23cfd6e4'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%23515f7d'/%3E%3Cpath d='M9 61c2-14 11-22 23-22s21 8 23 22z' fill='%23515f7d'/%3E%3C/svg%3E";

export const conformance = [{
  name: "a labelled avatar announces name and presence without colour",
  steps: [
    {
      expect: "attribute",
      target: {
        selector: '.discern-avatar[aria-label="Morgan Ellis (online)"]',
      },
      attribute: "role",
      value: "img",
    },
    {
      expect: "visible",
      target: { selector: '[data-discern-presence="online"]' },
    },
  ],
}] satisfies readonly ConformanceScenario[];

export default function AvatarExamples() {
  return (
    <div className="discern-example-stack">
      <div className="discern-example-row">
        <Avatar name="Priya Anand" size="xs" />
        <Avatar name="Jonah Reyes" size="sm" />
        <Avatar name="Ada Osei" />
        <Avatar name="Tomás Vega" size="lg" />
        <Avatar name="June Park" size="xl" />
      </div>
      <div className="discern-example-row">
        <Avatar name="Ada Osei" src={portrait} size="lg" />
        <Avatar name="Priya Anand" shape="square" size="lg" />
        <Avatar name="Jonah Reyes" src={portrait} shape="square" size="lg" />
      </div>
      <div className="discern-example-row">
        <Avatar name="Morgan Ellis" presence="online" size="lg" />
        <Avatar name="June Park" presence="away" size="lg" />
        <Avatar name="Tomás Vega" presence="busy" size="lg" />
        <Avatar name="Ada Osei" presence="offline" size="lg" />
      </div>
    </div>
  );
}
