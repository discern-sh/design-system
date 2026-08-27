import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { ExampleIcon } from "../../../fixtures/example-icon.tsx";
import meta, { componentExampleVocabulary } from "./banner.meta.ts";
import { Banner } from "./banner.tsx";

function DefaultBannerState() {
  return (
    <Banner icon={<ExampleIcon name="info" />}>
      A new version is available.
    </Banner>
  );
}

function AccentBannerState() {
  return <Banner tone="accent">Review the featured change.</Banner>;
}

function SuccessBannerState() {
  return (
    <Banner tone="success" icon={<ExampleIcon name="check" />}>
      Checks passed.
    </Banner>
  );
}

function WarningBannerState() {
  return <Banner tone="warning">Review the pending changes.</Banner>;
}

function DangerBannerState() {
  return <Banner tone="danger">Build failed.</Banner>;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultBannerState },
    { id: "accent", Example: AccentBannerState },
    { id: "success", Example: SuccessBannerState },
    { id: "warning", Example: WarningBannerState },
    { id: "danger", Example: DangerBannerState },
  ],
);

export default function BannerExamples() {
  return <DefaultBannerState />;
}
