import { AnchorHeading } from "./anchor-heading.tsx";

export default function AnchorHeadingExamples() {
  return (
    <div className="discern-example-stack">
      <AnchorHeading id="anchor-heading-lorem" level={2}>
        Lorem ipsum dolor
      </AnchorHeading>
      <AnchorHeading id="anchor-heading-consectetur" level={3}>
        Consectetur adipiscing elit
      </AnchorHeading>
    </div>
  );
}
