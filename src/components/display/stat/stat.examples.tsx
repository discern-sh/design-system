import { Stat } from "./stat.tsx";

export default function StatExamples() {
  return (
    <div className="discern-example-row">
      <Stat label="Lorem ipsum" value="1,284" />
      <Stat
        label="Dolor sit"
        value="98.2%"
        context="Up 4.1 from last period"
        trend="positive"
      />
      <Stat
        label="Consectetur"
        value="312 ms"
        context="Down 18 from last period"
        trend="negative"
      />
    </div>
  );
}
