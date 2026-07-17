import { Pager } from "./pager.tsx";

export default function PagerExamples() {
  return (
    <div className="discern-example-stack">
      <Pager
        previous={{ label: "Lorem ipsum", href: "#anchor-heading-lorem" }}
        next={{
          label: "Consectetur adipiscing",
          href: "#anchor-heading-consectetur",
        }}
      />
      <Pager
        label="First-page pagination"
        next={{ label: "Dolor sit amet", href: "#anchor-heading-lorem" }}
      />
    </div>
  );
}
