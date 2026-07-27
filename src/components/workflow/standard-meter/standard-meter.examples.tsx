import { StandardMeter } from "./standard-meter.tsx";

export default function StandardMeterExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <StandardMeter
        label="Line coverage"
        value={92.4}
        limit={80}
        direction="floor"
        min={0}
        max={100}
        trend="improving"
        formatValue={(value) => `${value}%`}
      />
      <StandardMeter
        label="Stylesheet density"
        value={2324}
        limit={2350}
        direction="ceiling"
        min={0}
        max={2350}
        trend="drifting"
        formatValue={(value) => `${value} B`}
      />
    </div>
  );
}
