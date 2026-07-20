import { Brand } from "./brand.tsx";

export default function BrandExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <Brand name="Waypoint" mark="◮" typeface="mono" />
      <Brand
        name="Northstar"
        mark="N"
        markTreatment="tile"
        markShape="square"
        tagline="Field guide"
      />
      <Brand
        name="Open Index"
        mark={
          <svg viewBox="0 0 72 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M0 2h18v20H0zM25 3h47v7H25zm0 11h35v7H25z"
            />
          </svg>
        }
        typeface="ui"
        size="lg"
      />
    </div>
  );
}
