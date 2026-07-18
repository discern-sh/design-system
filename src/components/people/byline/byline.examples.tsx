import { Mention } from "../mention/mention.tsx";
import { Persona } from "../persona/persona.tsx";
import { Byline } from "./byline.tsx";

export default function BylineExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <Byline
        lede="By"
        authors={
          <>
            <Mention name="Morgan Ellis" href="#morgan" />
            <span>and</span>
            <Mention name="Priya Anand" href="#priya" />
          </>
        }
      >
        <time dateTime="2026-03-12">12 March 2026</time>
        <span>8 min read</span>
      </Byline>
      <Byline authors={<span>Ada Osei</span>}>
        <time dateTime="2026-06-02">2 June 2026</time>
        <span>Field notes</span>
        <span>Issue 14</span>
      </Byline>
      <Byline
        authors={
          <Persona
            name="June Park"
            detail="Editor at large"
            size="sm"
          />
        }
      >
        <time dateTime="2026-07-01">July 2026</time>
      </Byline>
    </div>
  );
}
