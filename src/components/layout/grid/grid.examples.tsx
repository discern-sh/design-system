import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Card } from "../../display/card/card.tsx";
import meta, { componentExampleVocabulary } from "./grid.meta.ts";
import { Grid } from "./grid.tsx";

const items = ["Alpha", "Beta", "Gamma", "Delta"] as const;

function DefaultGridState() {
  return (
    <Grid minimum="10rem" gap={4}>
      {items.map((item) => <Card padding="sm" key={item}>{item}</Card>)}
    </Grid>
  );
}

function SingleColumnGridState() {
  return (
    <Grid minimum="100%" gap={4}>
      {items.slice(0, 3).map((item) => (
        <Card padding="sm" key={item}>{item}</Card>
      ))}
    </Grid>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultGridState },
    { id: "single-column", Example: SingleColumnGridState },
  ],
);

export default function GridExamples() {
  return <DefaultGridState />;
}
