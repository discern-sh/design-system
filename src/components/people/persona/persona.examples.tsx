import { Persona } from "./persona.tsx";

const portrait =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23d9d2c4'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%236b6151'/%3E%3Cpath d='M9 61c2-14 11-22 23-22s21 8 23 22z' fill='%236b6151'/%3E%3C/svg%3E";

export default function PersonaExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <Persona
        name="Priya Anand"
        detail="Staff engineer"
        size="sm"
      />
      <Persona
        name="Morgan Ellis"
        detail="Engineering lead"
        presence="online"
        src={portrait}
      />
      <Persona
        name="Ada Osei"
        detail="Research · Field methods"
        size="lg"
      />
      <Persona
        name="Alexandrine Featherstonehaugh-Cholmondeley"
        detail="A very long detail line that truncates with an ellipsis"
        style={{ maxWidth: "14rem" }}
      />
    </div>
  );
}
