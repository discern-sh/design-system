import { Sparkline } from "./sparkline.tsx";

export default function SparklineExamples() {
  return (
    <div className="discern-example-row">
      <Sparkline values={[3.2, 4.1, 3.8, 5.5, 7.4, 9.1]} />
      <Sparkline values={[12, null, 14, 19, null, 23]} />
      <Sparkline values={[5, 5, 5, 5, 5]} />
      <Sparkline values={[41, 38, 36, 39, 31, 28]} />
    </div>
  );
}
