import { Breadcrumbs } from "./breadcrumbs.tsx";

export default function BreadcrumbsExamples() {
  return (
    <div className="discern-example-stack">
      <Breadcrumbs
        label="Compact breadcrumb"
        items={[
          { label: "Home", href: "#top" },
          { label: "Library", href: "#components" },
        ]}
        current="Navigation"
      />
      <Breadcrumbs
        label="Overflow breadcrumb"
        items={[
          { label: "Home", href: "#top" },
          { label: "Library", href: "#components" },
          { label: "Interface patterns", href: "#group-navigation" },
          { label: "Navigation patterns", href: "#component-tabs" },
        ]}
        current="A deliberately long current page title that demonstrates narrow viewport overflow"
      />
    </div>
  );
}
