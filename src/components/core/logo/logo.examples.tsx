import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./logo.meta.ts";
import { Logo } from "./logo.tsx";

function PlainExample() {
  return <Logo label="Waypoint">◮ Waypoint</Logo>;
}

function TileExample() {
  return <Logo label="Northstar" treatment="tile">N Northstar</Logo>;
}

function SquareExample() {
  return (
    <Logo label="Northstar" treatment="tile" shape="square">
      N
    </Logo>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: PlainExample },
    { id: "tile", Example: TileExample },
    { id: "square", Example: SquareExample },
  ],
);

export default function LogoExamples() {
  return (
    <div className="discern-example-row discern-example-row--large">
      <PlainExample />
      <TileExample />
      <SquareExample />
    </div>
  );
}
