import { useState } from "react";
import {
  ArticleHeader,
  Badge,
  Button,
  Card,
  Checkbox,
  CodeBlock,
  CtaBand,
  DataFigure,
  DocsNav,
  Grid,
  HeroBlock,
  Icon,
  IconButton,
  Input,
  LightBackdrop,
  MarketingIntro,
  MarketingSection,
  Prose,
  SegmentedControl,
  SiteHeader,
  Stack,
  Table,
  VoiceBreak,
} from "../../src/react.ts";
import { compositionRecipes } from "../compositions.tsx";

export type SignaturePurpose = "marketing" | "operations" | "reading";
export interface SignatureTreatments {
  readonly depth: boolean;
  readonly ambient: boolean;
  readonly shimmer: boolean;
  readonly relief: boolean;
  readonly tint: boolean;
  readonly motion: boolean;
}

/** Supplied artwork remains ordinary SVG; only its enclosing Icon carries relief. */
function Symbol({ name }: { readonly name: "compass" | "layers" | "check" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "compass"
        ? (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z" />
          </>
        )
        : name === "layers"
        ? (
          <>
            <path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" />
          </>
        )
        : (
          <>
            <path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" />
            <path d="m8 12 3 3 5-6" />
          </>
        )}
    </svg>
  );
}

function Ambient({ treatments }: { readonly treatments: SignatureTreatments }) {
  return treatments.ambient
    ? (
      <LightBackdrop
        data-discern-accent={treatments.tint ? "" : "none"}
        motion={treatments.motion ? "ambient" : "still"}
      />
    )
    : null;
}

const benefits = [
  {
    symbol: "compass",
    title: "Know what matters.",
    description: "Bring the next decision into focus.",
  },
  {
    symbol: "layers",
    title: "Keep your bearings.",
    description: "Keep the context beside the work.",
  },
  {
    symbol: "check",
    title: "Move forward together.",
    description: "Make the next step clear to everyone.",
  },
] as const;

function Benefits({ relief }: { readonly relief: boolean }) {
  return (
    <Grid minimum="12rem" gap={6} className="discern-signature-benefits">
      {benefits.map(({ symbol, title, description }) => (
        <div key={symbol}>
          <Icon
            size="3rem"
            fit="contain"
            relief={relief}
            className="discern-signature-expressive-icon"
          >
            <Symbol name={symbol} />
          </Icon>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      ))}
    </Grid>
  );
}

function Marketing(
  { id, treatments }: {
    readonly id: string;
    readonly treatments: SignatureTreatments;
  },
) {
  return (
    <div className="discern-signature-marketing" id={`${id}-top`}>
      <SiteHeader
        brand="Workspace"
        brandTypeface="ui"
        homeHref={`#${id}-top`}
        navItems={[{ label: "Why Workspace", href: `#${id}-benefits` }, {
          label: "Try a plan",
          href: `#${id}-try`,
        }]}
        actions={
          <Button size="sm" href={`#${id}-try`}>Explore the workspace</Button>
        }
      />
      <HeroBlock
        layout="statement"
        eyebrow="A shared project workspace"
        title="Good work starts with a clear next step."
        description="Bring your plans, decisions, and the people behind them into one shared space. Find your footing, then make progress together."
        actions={
          <>
            <Button href={`#${id}-try`}>
              Explore the workspace <span aria-hidden="true">→</span>
            </Button>
            <Button variant="ghost" href={`#${id}-benefits`}>
              See what it helps with
            </Button>
          </>
        }
        meta="Start with one project. Make it your own."
        backdrop={<Ambient treatments={treatments} />}
        visual={
          <div id={`${id}-benefits`}>
            <Benefits relief={treatments.relief} />
          </div>
        }
      />
      <MarketingSection
        spacing="compact"
        className="discern-signature-support"
        surface="sunken"
      >
        <MarketingIntro
          eyebrow="A little clarity goes a long way"
          title="Less searching. More room to think."
          description="Give each project a useful home. Keep a short plan, the decisions behind it, and a clear place to pick up again."
        />
        <Grid minimum="14rem" gap={5}>
          {[
            [
              "A plan you can use",
              "Put the next action where everyone can find it. Keep the details close, ready when they are useful.",
            ],
            [
              "Context that stays close",
              "A decision is easier to revisit when its reasons travel with it. Link a note to the work it informs.",
            ],
            [
              "Space for your way of working",
              "Start with a few shared conventions. Adjust the workspace as your project takes shape.",
            ],
          ].map(([title, description]) => (
            <Card
              key={title}
              raised={treatments.depth}
              texture={treatments.depth ? "shaded" : "plain"}
            >
              <h3>{title}</h3>
              <p>{description}</p>
            </Card>
          ))}
        </Grid>
      </MarketingSection>
      <VoiceBreak
        quote="A good plan leaves room for the people doing the work."
        attribution="A note from the maker"
        context="Illustrative author aside · replace with an authentic, attributed contribution."
        className="discern-signature-aside"
      />
      <MarketingSection
        spacing="compact"
        id={`${id}-try`}
        className="discern-signature-support"
      >
        <MarketingIntro
          eyebrow="Try the everyday details"
          title="Make the next step yours."
          description="Keep the plan and its reasons together. Pin the view you want to return to, ready for the next conversation."
        />
        <EverydayControls id={id} treatments={treatments} />
      </MarketingSection>
      <CtaBand
        title="Bring one project into focus."
        description="Start with a question, a few useful notes, and the next step."
        tone="sunken"
        actions={<Button href={`#${id}-try`}>Try the project view</Button>}
        note="An illustrative composition, ready for a consumer's own story."
      />
    </div>
  );
}

const reportRecipe = compositionRecipes.find(({ id }) =>
  id === "handoff-verification-report"
)!;

function Operations(
  { id, treatments }: {
    readonly id: string;
    readonly treatments: SignatureTreatments;
  },
) {
  const [filter, setFilter] = useState("");
  const [saved, setSaved] = useState(false);
  const [taskView, setTaskView] = useState("list");
  const tasks = [
    ["Confirm the project scope", "Ready", "Avery", "Today"],
    ["Review the research notes", "In review", "Morgan", "Today"],
    ["Check the shared plan", "Ready", "Taylor", "Tomorrow"],
    ["Record the open questions", "Needs input", "Avery", "Tomorrow"],
    ["Prepare the next handoff", "Planned", "Morgan", "Friday"],
    ["Update the project guide", "Planned", "Taylor", "Friday"],
  ];
  return (
    <div className="discern-signature-operations">
      <SiteHeader
        brand="Workspace"
        brandTypeface="ui"
        homeHref={`#${id}-tasks`}
        navItems={[{ label: "Tasks", href: `#${id}-tasks` }, {
          label: "Verification",
          href: `#${id}-verification`,
        }]}
        actions={<Badge>Project example</Badge>}
      />
      <div className="discern-signature-task-body">
        <header className="discern-signature-task-heading" id={`${id}-tasks`}>
          <div>
            <p className="discern-signature-kicker">Project / Shared plan</p>
            <h1>Ready for the next step.</h1>
            <p>
              Review the work, check the evidence, and keep the team moving.
            </p>
          </div>
          <Button onClick={() => setSaved(!saved)} aria-pressed={saved}>
            {saved ? "View saved" : "Save this view"}
          </Button>
        </header>
        <div className="discern-signature-task-layout">
          <Stack gap={6}>
            <div className="discern-signature-task-tools">
              <Input
                label="Find a task"
                placeholder="Search tasks"
                value={filter}
                onChange={(event) => setFilter(event.currentTarget.value)}
              />
              <SegmentedControl
                label="Task view"
                name={`${id}-task-view`}
                value={taskView}
                onValueChange={setTaskView}
                items={[{ value: "list", label: "List" }, {
                  value: "grouped",
                  label: "By status",
                }]}
              />
            </div>
            <Card className="discern-signature-material" padding="none">
              <Table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Owner</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.filter(([title]) =>
                    title!.toLowerCase().includes(filter.toLowerCase())
                  ).sort((left, right) =>
                    taskView === "list" ? 0 : left[1]!.localeCompare(right[1]!)
                  ).map(([title, state, owner, due]) => (
                    <tr key={title}>
                      <th scope="row">{title}</th>
                      <td>
                        <Badge
                          tone={state === "Ready"
                            ? "success"
                            : state === "Needs input"
                            ? "warning"
                            : "neutral"}
                        >
                          {state}
                        </Badge>
                      </td>
                      <td>{owner}</td>
                      <td>{due}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {tasks.every(([title]) =>
                !title!.toLowerCase().includes(filter.toLowerCase())
              ) && <p>No tasks match this search.</p>}
            </Card>
            <div id={`${id}-verification`}>
              <reportRecipe.Example />
            </div>
          </Stack>
          <aside className="discern-signature-task-aside">
            <EverydayControls id={id} treatments={treatments} />
            <Card>
              <Stack gap={3}>
                <h2>Before you continue</h2>
                <Checkbox label="The scope is clear" defaultChecked />
                <Checkbox label="The evidence is available" defaultChecked />
                <Checkbox label="The next owner is named" />
                <Button variant="secondary" onClick={() => setSaved(true)}>
                  Save checklist
                </Button>
                <span role="status">
                  {saved
                    ? "Saved for this review."
                    : "Changes stay in this example."}
                </span>
              </Stack>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

const readingSource =
  '[project]\nquestion = "What should we try next?"\nowner = "The project team"\n\n[review]\ninclude = ["decision", "evidence", "next step"]\nstatus = "ready"';

function Reading({ id }: { readonly id: string }) {
  return (
    <div className="discern-signature-reading">
      <SiteHeader
        brand="Fieldnotes"
        brandTypeface="display"
        homeHref={`#${id}-article`}
        navItems={[{ label: "The question", href: `#${id}-question` }, {
          label: "The record",
          href: `#${id}-record`,
        }]}
      />
      <ArticleHeader
        id={`${id}-article`}
        eyebrow="Notes on collaboration"
        title="A little structure makes room for better work."
        standfirst="A shared plan is a place to begin a conversation. Its value comes from the attention it helps people give to the work."
        meta={["A practical essay", "6 minute read"]}
        actions={
          <Button variant="ghost" size="sm" href={`#${id}-record`}>
            Jump to the example <span aria-hidden="true">↓</span>
          </Button>
        }
      />
      <div className="discern-signature-reading-layout">
        <DocsNav
          label="On this page"
          sections={[{
            title: "On this page",
            items: [
              {
                label: "Begin with a question",
                href: `#${id}-question`,
                current: "location",
              },
              { label: "Make the record useful", href: `#${id}-record` },
              { label: "Leave room to return", href: `#${id}-return` },
            ],
          }]}
        />
        <Prose>
          <p>
            There is a familiar moment at the beginning of a project: plenty of
            energy, several plausible directions, and no shared picture of what
            to do first. Writing a plan can help, provided it brings the useful
            questions into view.
          </p>
          <p>
            The most helpful structure is often modest. A question, a few
            constraints, and a named next step give people something concrete to
            work with. They also make disagreement easier to understand.
          </p>
          <h2 id={`${id}-question`}>Begin with a question.</h2>
          <p>
            Describe the decision in words that everyone involved can recognise.
            Keep the question small enough to investigate. A useful plan
            distinguishes what is known from what still needs attention, so that
            uncertainty becomes something the team can examine together.
          </p>
          <p>
            Give the people closest to the work time to think. Some will want to
            talk through the possibilities; others will contribute more
            carefully in writing. Both can inform the same record.
          </p>
          <DataFigure
            title="Three things to keep close"
            className="discern-signature-material"
            visual={
              <Grid minimum="8rem" gap={5}>
                {benefits.map(({ symbol }, index) => (
                  <Stack align="center" key={symbol} gap={3}>
                    <Icon size="2.25rem">
                      <Symbol name={symbol} />
                    </Icon>
                    <strong>
                      {["The question", "The context", "The next step"][index]}
                    </strong>
                  </Stack>
                ))}
              </Grid>
            }
            caption="A compact record connects the question, the context behind it, and an action someone can take."
          />
          <h2 id={`${id}-record`}>Make the record useful.</h2>
          <p>
            A record earns its place when it helps someone pick up the work.
            Keep the reasons for a decision beside the decision itself. Link to
            the evidence instead of copying it into several places.
          </p>
          <p>
            This small configuration shows one way to keep a shared convention
            explicit. The exact format matters less than whether the people
            using it understand what it asks them to do.
          </p>
          <CodeBlock
            language="toml"
            code={readingSource}
          />
          <h2 id={`${id}-return`}>Leave room to return.</h2>
          <p>
            The plan will change as the work teaches you more. Preserve enough
            context to explain the next decision, without turning the record
            into a transcript of everything that happened.
          </p>
          <p>
            End each conversation with an action and a time to revisit it. A
            useful structure makes that return easier; the judgment still
            belongs to the people doing the work.
          </p>
          <Button href={`#${id}-article`} variant="secondary">
            Return to the beginning
          </Button>
        </Prose>
      </div>
    </div>
  );
}

export function EverydayControls(
  { id, treatments }: {
    readonly id: string;
    readonly treatments: SignatureTreatments;
  },
) {
  const [view, setView] = useState("plan");
  const [arrived, setArrived] = useState(false);
  const [pinned, setPinned] = useState(false);
  const changeView = (value: string) => {
    setView(value);
    setArrived(true);
  };
  return (
    <Card
      className="discern-signature-everyday"
      raised={treatments.depth}
      texture={treatments.depth ? "shaded" : "plain"}
    >
      <Ambient treatments={treatments} />
      <Stack gap={5}>
        <div>
          <p className="discern-signature-kicker">A useful place to pick up</p>
          <h3>Your next step.</h3>
        </div>
        <SegmentedControl
          label="Project view"
          name={`${id}-project-view`}
          value={view}
          onValueChange={changeView}
          items={[{ value: "plan", label: "Plan" }, {
            value: "details",
            label: "Details",
          }]}
        />
        <Card
          key={view}
          padding="sm"
          {...(arrived && treatments.shimmer
            ? { arrival: "shimmer" as const }
            : {})}
          className="discern-signature-arrival"
        >
          <Icon>
            <Symbol name={view === "plan" ? "compass" : "layers"} />
          </Icon>
          <strong>
            {view === "plan"
              ? "Bring the question into focus"
              : "Keep the reasons close"}
          </strong>
          <p>
            {view === "plan"
              ? "Name the decision, gather a few useful notes, and agree what to do next."
              : "Keep your observations and the reasons for the decision beside the plan."}
          </p>
        </Card>
        <div className="discern-signature-control-row">
          <span role="status">
            {pinned ? "Pinned to this project" : "Only in this example"}
          </span>
          <Button
            size="sm"
            aria-pressed={pinned}
            onClick={() => setPinned(!pinned)}
            leadingIcon={
              <Icon>
                <Symbol name="check" />
              </Icon>
            }
          >
            {pinned ? "Pinned" : "Pin view"}
          </Button>
          <IconButton
            label="More project details"
            icon="⋯"
            onClick={() => changeView(view === "plan" ? "details" : "plan")}
          />
        </div>
      </Stack>
    </Card>
  );
}

export function SignatureSpecimen(
  { purpose, id, treatments }: {
    readonly purpose: SignaturePurpose;
    readonly id: string;
    readonly treatments: SignatureTreatments;
  },
) {
  if (purpose === "marketing") {
    return <Marketing id={id} treatments={treatments} />;
  }
  if (purpose === "operations") {
    return <Operations id={id} treatments={treatments} />;
  }
  return <Reading id={id} />;
}
