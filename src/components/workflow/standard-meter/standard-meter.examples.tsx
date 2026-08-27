import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { StandardMeter } from "./standard-meter.tsx";
import meta, { componentExampleVocabulary } from "./standard-meter.meta.ts";

function CoverageFloorState() {
  return (
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
  );
}

function DensityCeilingState() {
  return (
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
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: CoverageFloorState },
    { id: "ceiling", Example: DensityCeilingState },
  ],
);

export default function StandardMeterExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <CoverageFloorState />
      <DensityCeilingState />
    </div>
  );
}
