import {
  type ConformanceScenario,
  defineCatalogueExamples,
} from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./avatar.meta.ts";
import { Avatar } from "./avatar.tsx";

const portrait =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23cfd6e4'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%23515f7d'/%3E%3Cpath d='M9 61c2-14 11-22 23-22s21 8 23 22z' fill='%23515f7d'/%3E%3C/svg%3E";

export const conformance = [{
  example: "default",
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

function InitialsWithPresenceExample() {
  return <Avatar name="Morgan Ellis" presence="online" size="lg" />;
}

function PortraitExample() {
  return <Avatar name="Ada Osei" src={portrait} size="lg" />;
}

function SquareExample() {
  return <Avatar name="Tomás Vega" shape="square" size="lg" />;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: InitialsWithPresenceExample },
    { id: "portrait", Example: PortraitExample },
    { id: "square", Example: SquareExample },
  ],
);

export default function AvatarExamples() {
  return (
    <div className="discern-example-row">
      <InitialsWithPresenceExample />
      <PortraitExample />
      <SquareExample />
    </div>
  );
}
