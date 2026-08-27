import {
  type ConformanceScenario,
  defineCatalogueExamples,
} from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./table.meta.ts";
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
    <Table caption="Checks" striped numeric>
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">State</th>
          <th scope="col">Count</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Format</td>
          <td>Passed</td>
          <td>12</td>
        </tr>
        <tr>
          <td>Tests</td>
          <td>Queued</td>
          <td>3</td>
        </tr>
      </tbody>
    </Table>
  );
}

function DenseTableState() {
  return (
    <Table
      caption="Recent survey evidence"
      className="discern-example-table-dense"
      data-example-table-dense
      striped
      numeric
    >
      <thead>
        <tr>
          <th scope="col">Survey</th>
          <th scope="col">Region</th>
          <th scope="col">State</th>
          <th scope="col">Last action</th>
          <th scope="col">Duration</th>
          <th scope="col">Files</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Spring field study</td>
          <td>North</td>
          <td>Complete</td>
          <td>Validated responses</td>
          <td>2m 18s</td>
          <td>14</td>
        </tr>
        <tr>
          <td>Summer field study</td>
          <td>West</td>
          <td>In review</td>
          <td>Checked sample balance</td>
          <td>8m 04s</td>
          <td>3</td>
        </tr>
        <tr>
          <td>Autumn field study</td>
          <td>South</td>
          <td>Updated</td>
          <td>Compared response totals</td>
          <td>43s</td>
          <td>6</td>
        </tr>
      </tbody>
    </Table>
  );
}

function RichCellsTableState() {
  return (
    <Table caption="Reference coverage">
      <thead>
        <tr>
          <th scope="col">Topic</th>
          <th scope="col">Evidence</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            Inline <code>semantics</code>
          </td>
          <td>
            <a href="#reference">Reference material</a> with <em>context</em>
          </td>
          <td>
            <strong>Covered</strong>
          </td>
        </tr>
        <tr>
          <td>Optional value</td>
          <td></td>
          <td>Intentionally empty</td>
        </tr>
      </tbody>
    </Table>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultTableState },
    { id: "rich-cells", Example: RichCellsTableState },
    { id: "dense-overflow", Example: DenseTableState },
  ],
);

export default function TableExamples() {
  return (
    <div className="discern-example-stack">
      <DefaultTableState />
      <RichCellsTableState />
      <DenseTableState />
    </div>
  );
}
