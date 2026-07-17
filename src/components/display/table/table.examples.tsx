import { Table } from "./table.tsx";

export default function TableExamples() {
  return (
    <div className="discern-example-stack">
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
    </div>
  );
}
