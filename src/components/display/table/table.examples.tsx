import type {
  CatalogueExampleState,
  ConformanceScenario,
} from "../../../../styleguide/conformance.ts";
import { Table } from "./table.tsx";

export const conformance = [{
  name: "a dense table scrolls inside its wrapper at a narrow viewport",
  viewport: { width: 390, height: 844 },
  steps: [{
    expect: "within-viewport",
    target: { selector: "[data-example-table-dense]" },
  }, {
    expect: "scrollable-x",
    target: { selector: "[data-example-table-dense]" },
  }],
}] satisfies readonly ConformanceScenario[];

function DefaultTableState() {
  return (
    <Table caption="Lorem ipsum dolor sit amet" striped numeric>
      <thead>
        <tr>
          <th scope="col">Lorem</th>
          <th scope="col">Ipsum</th>
          <th scope="col">Dolor</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Consectetur</td>
          <td>Adipiscing elit</td>
          <td>128</td>
        </tr>
        <tr>
          <td>Sed do</td>
          <td>Eiusmod tempor</td>
          <td>64</td>
        </tr>
        <tr>
          <td>Ut labore</td>
          <td>Et dolore magna</td>
          <td>1,024</td>
        </tr>
      </tbody>
    </Table>
  );
}

function DenseTableState() {
  return (
    <Table
      caption="Recent task evidence"
      className="discern-example-table-dense"
      data-example-table-dense
      striped
      numeric
    >
      <thead>
        <tr>
          <th scope="col">Task</th>
          <th scope="col">Branch</th>
          <th scope="col">State</th>
          <th scope="col">Last action</th>
          <th scope="col">Duration</th>
          <th scope="col">Files</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Refresh documentation map</td>
          <td>agent/map-refresh</td>
          <td>Complete</td>
          <td>Verified generated references</td>
          <td>2m 18s</td>
          <td>14</td>
        </tr>
        <tr>
          <td>Inspect release boundary</td>
          <td>agent/release-audit</td>
          <td>Blocked</td>
          <td>Requested package-owner review</td>
          <td>8m 04s</td>
          <td>3</td>
        </tr>
        <tr>
          <td>Regenerate component registry</td>
          <td>agent/registry-update</td>
          <td>Changed</td>
          <td>Compared deterministic output</td>
          <td>43s</td>
          <td>6</td>
        </tr>
      </tbody>
    </Table>
  );
}

export const catalogueStates = [
  { name: "default", label: "Three-column data", Example: DefaultTableState },
  {
    name: "dense-overflow",
    label: "Dense narrow-width overflow",
    Example: DenseTableState,
  },
] satisfies readonly CatalogueExampleState[];

export default function TableExamples() {
  return (
    <div className="discern-example-stack">
      <DefaultTableState />
      <DenseTableState />
    </div>
  );
}
