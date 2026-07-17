import { DocsNav } from "./docs-nav.tsx";

export default function DocsNavExamples() {
  return (
    <div className="discern-example-stack">
      <DocsNav
        sections={[
          {
            title: "Orientation",
            items: [
              { label: "Overview", href: "#top", current: true },
              { label: "Getting started", href: "#components" },
              { label: "Concepts", href: "#group-docs" },
            ],
          },
          {
            title: "Reference",
            items: [
              { label: "Configuration", href: "#component-docs-nav" },
              { label: "Glossary", href: "#component-pager" },
            ],
          },
        ]}
      />
    </div>
  );
}
