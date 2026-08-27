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

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultMeterState },
    { id: "quarter", Example: QuarterMeterState },
    { id: "complete", Example: CompleteMeterState },
  ],
);

export default function MeterExamples() {
  return <QuarterMeterState />;
}
