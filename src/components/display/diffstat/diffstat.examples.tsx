import { Diffstat } from "./diffstat.tsx";

export default function DiffstatExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <Diffstat added={310} removed={204} />
      <Diffstat added={1204} removed={17} />
      <Diffstat added={0} removed={86} />
      <Diffstat added={12} removed={0} />
      <Diffstat added={0} removed={0} />
      <p style={{ margin: 0, fontSize: "0.85rem" }}>
        The checkout refactor landed at <Diffstat added={310} removed={204} />
        {" "}
        across twelve files.
      </p>
    </div>
  );
}
