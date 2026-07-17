import { Kbd } from "../kbd/kbd.tsx";
import { DocsHeader } from "./docs-header.tsx";

export default function DocsHeaderExamples() {
  return (
    <div className="discern-example-stack">
      <DocsHeader
        style={{ position: "static" }}
        brand={<a href="#top">Lorem manual</a>}
        actions={<a href="#components">Consectetur</a>}
      >
        <span>
          Search <Kbd>⌘</Kbd> <Kbd>K</Kbd>
        </span>
      </DocsHeader>
    </div>
  );
}
