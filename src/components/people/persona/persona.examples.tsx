import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./persona.meta.ts";
import { Persona } from "./persona.tsx";

const portrait =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23d9d2c4'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%236b6151'/%3E%3Cpath d='M9 61c2-14 11-22 23-22s21 8 23 22z' fill='%236b6151'/%3E%3C/svg%3E";

function IdentityExample() {
  return <Persona name="Ada Osei" detail="Research" />;
}

function PresenceExample() {
  return (
    <Persona
      name="Morgan Ellis"
      detail="Engineering lead"
      presence="online"
      src={portrait}
    />
  );
}

function LongNameExample() {
  return (
    <Persona
      name="Alexandrine Featherstonehaugh-Cholmondeley"
      detail="Research programme coordination across several regions"
      style={{ maxWidth: "14rem" }}
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: IdentityExample },
    { id: "with-presence", Example: PresenceExample },
    { id: "long-name", Example: LongNameExample },
  ],
);

export default function PersonaExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <IdentityExample />
      <PresenceExample />
      <LongNameExample />
    </div>
  );
}
