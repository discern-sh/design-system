import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./meter.meta.ts";
import { Meter } from "./meter.tsx";

function DefaultMeterState() {
  return <Meter label="Upload" value={0} />;
}

function QuarterMeterState() {
  return <Meter label="Upload" value={25} reading="25 / 100 files" />;
}

function CompleteMeterState() {
  return <Meter label="Upload" value={100} reading="Complete" />;
}

function WarningMeterState() {
  return (
    <Meter
      label="Storage"
      value={82}
      reading="82% used"
      tone="warning"
    />
  );
}

function DangerMeterState() {
  return <Meter label="Storage" value={96} reading="96% used" tone="danger" />;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultMeterState },
    { id: "quarter", Example: QuarterMeterState },
    { id: "complete", Example: CompleteMeterState },
    { id: "warning", Example: WarningMeterState },
    { id: "danger", Example: DangerMeterState },
  ],
);

export default function MeterExamples() {
  return <QuarterMeterState />;
}
