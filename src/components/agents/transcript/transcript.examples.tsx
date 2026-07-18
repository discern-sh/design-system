import { Transcript } from "./transcript.tsx";
import { AgentPersona } from "../agent-persona/agent-persona.tsx";
import { Persona } from "../../people/persona/persona.tsx";

export default function TranscriptExamples() {
  return (
    <div className="discern-example-stack">
      <Transcript
        style={{ maxWidth: "34rem" }}
        turns={[
          {
            speaker: <Persona name="Morgan Ellis" size="sm" />,
            aside: <time dateTime="09:12">09:12</time>,
            body: (
              <p>
                Take the checkout refactor — split the payment step out of the
                cart flow, and keep the tests green as you go.
              </p>
            ),
          },
          {
            speaker: <AgentPersona name="quill" size="sm" status="working" />,
            aside: <time dateTime="09:13">09:13</time>,
            body: (
              <p>
                Starting in an isolated worktree. I'll extract the payment step
                behind the existing interface first, then move the cart flow
                over one call site at a time.
              </p>
            ),
          },
          {
            speaker: <AgentPersona name="quill" size="sm" status="done" />,
            aside: <time dateTime="09:41">09:41</time>,
            body: (
              <p>
                Done — twelve files changed, the full check passes, and the
                branch is ready for your review.
              </p>
            ),
          },
        ]}
      />
    </div>
  );
}
