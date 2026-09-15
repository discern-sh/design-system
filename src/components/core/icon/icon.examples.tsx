import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { ExampleIcon } from "../../../fixtures/example-icon.tsx";
import meta, { componentExampleVocabulary } from "./icon.meta.ts";
import { Icon } from "./icon.tsx";
import { Stack } from "../../layout/stack/stack.tsx";
import {
  filledShieldSvg,
  outlinedCompassSvg,
} from "../../../fixtures/imported-icons.ts";

function ImportedIconExample() {
  return (
    <Stack gap={6}>
      <p>Unchanged SVGs from Lucide (outline) and Bootstrap Icons (filled).</p>
      {[false, true].map((relief) => (
        <Stack key={String(relief)} gap={3}>
          <span>{relief ? "Relief requested" : "Flat default"}</span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              alignItems: "center",
              justifyItems: "center",
            }}
          >
            {[outlinedCompassSvg, filledShieldSvg].flatMap((svg, index) =>
              ["1rem", "4rem"].map((size) => (
                <Icon
                  key={`${index}-${size}`}
                  size={size}
                  fit="contain"
                  relief={relief}
                  dangerouslySetInnerHTML={{ __html: svg }}
                  label={`${
                    index === 0 ? "Compass" : "Verified shield"
                  }, ${size}`}
                >
                  {null}
                </Icon>
              ))
            )}
          </div>
        </Stack>
      ))}
    </Stack>
  );
}

function LabelledIconExample() {
  return (
    <Icon label="Generate" size={24}>
      <ExampleIcon name="spark" />
    </Icon>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: LabelledIconExample }, {
    id: "imported-relief",
    Example: ImportedIconExample,
    capture: {
      selectors: [".discern-stack"],
      // The composed drop-shadows extend beyond the last row's SVG bounds.
      paintBleed: 8,
    },
  }],
);

export default function IconExamples() {
  return (
    <div className="discern-example-row discern-example-row--large">
      <LabelledIconExample />
    </div>
  );
}
