import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./stat.meta.ts";
import { Stat } from "./stat.tsx";

function NeutralExample() {
  return (
    <Stat
      label="Entries"
      value="128"
      context="Across four collections"
    />
  );
}

function PositiveExample() {
  return (
    <Stat
      label="Checks"
      value="42"
      context="Up 4 this week"
      trend="positive"
    />
  );
}

function NegativeExample() {
  return (
    <Stat
      label="Failures"
      value="2"
      context="Needs attention"
      trend="negative"
    />
  );
}

function WithSparklineExample() {
  return (
    <Stat
      label="Throughput"
      value="9.1"
      context="Up 5.9 from last period"
      trend="positive"
      sparkline={[3.2, 4.1, 3.8, 5.5, 7.4, 9.1]}
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: NeutralExample },
    { id: "positive", Example: PositiveExample },
    { id: "negative", Example: NegativeExample },
    { id: "with-sparkline", Example: WithSparklineExample },
  ],
);

export default function StatExamples() {
  return (
    <div className="discern-example-row">
      <NeutralExample />
      <PositiveExample />
      <NegativeExample />
      <WithSparklineExample />
    </div>
  );
}
