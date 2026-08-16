import { Heading, HeadingAccent } from "./heading.tsx";
export default function HeadingExamples() {
  return (
    <div className="discern-example-stack">
      <Heading level={2}>
        Lorem <HeadingAccent>ipsum</HeadingAccent> dolor sit amet.
      </Heading>
      <Heading level={3}>
        Consectetur <HeadingAccent>adipiscing</HeadingAccent> elit.
      </Heading>
      <Heading level={4}>
        Phasellus <em>viverra</em> keeps <code>inline meaning</code> intact.
      </Heading>
    </div>
  );
}
