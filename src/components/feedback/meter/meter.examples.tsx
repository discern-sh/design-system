import { Meter } from "./meter.tsx";

export default function MeterExamples() {
  return (
    <div className="discern-example-stack">
      <Meter label="Lorem ipsum" value={62} reading="62 / 100" />
      <Meter
        label="Dolor sit amet"
        value={87}
        reading="87%"
        tone="warning"
      />
      <Meter
        label="Consectetur"
        value={96}
        reading="96%"
        tone="danger"
      />
    </div>
  );
}
