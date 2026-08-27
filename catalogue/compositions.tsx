import type { ComponentType, ReactNode } from "react";
import { VerificationReport } from "../src/components/agents/verification-report/verification-report.tsx";
import { ApproachBackdrop } from "../src/components/artwork/approach-backdrop/approach-backdrop.tsx";
import { Button } from "../src/components/core/button/button.tsx";
import { ClosingStatement } from "../src/components/marketing/closing-statement/closing-statement.tsx";
import { EditorialHero } from "../src/components/marketing/editorial-hero/editorial-hero.tsx";
import { JourneyOverview } from "../src/components/marketing/journey-overview/journey-overview.tsx";
import { MarketingSection } from "../src/components/marketing/marketing-section/marketing-section.tsx";
import { MarketingStage } from "../src/components/marketing/marketing-stage/marketing-stage.tsx";
import { NarrativeChapter } from "../src/components/marketing/narrative-chapter/narrative-chapter.tsx";
import { OutcomeSpotlight } from "../src/components/marketing/outcome-spotlight/outcome-spotlight.tsx";
import { VoiceBreak } from "../src/components/marketing/voice-break/voice-break.tsx";
import { ArtifactCard } from "../src/components/workflow/artifact-card/artifact-card.tsx";
import { ArtifactTree } from "../src/components/workflow/artifact-tree/artifact-tree.tsx";
import { BranchChoice } from "../src/components/workflow/branch-choice/branch-choice.tsx";
import { Diagnostic } from "../src/components/workflow/diagnostic/diagnostic.tsx";
import { FileChange } from "../src/components/workflow/file-change/file-change.tsx";
import { OwnershipBadge } from "../src/components/workflow/ownership-badge/ownership-badge.tsx";
import { PathReference } from "../src/components/workflow/path-reference/path-reference.tsx";
import { Procedure } from "../src/components/workflow/procedure/procedure.tsx";
import { RawOutput } from "../src/components/workflow/raw-output/raw-output.tsx";
import { ResultSummary } from "../src/components/workflow/result-summary/result-summary.tsx";
import { RetryNotice } from "../src/components/workflow/retry-notice/retry-notice.tsx";

/** Ordered semantic stages a conformance journey must render. */
export interface JourneyContract {
  readonly stages: readonly string[];
}

/** A Catalogue-only composition with a preview and source built from one definition. */
export interface CompositionRecipe {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly journey?: JourneyContract;
  readonly Example: ComponentType;
  readonly source: string;
}

interface RecipeDefinition<Definition> {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly journey?: JourneyContract;
  readonly definition: Definition;
  readonly render: (definition: Definition) => ReactNode;
  readonly source: (definition: Definition) => string;
}

function defineRecipe<Definition>(
  recipe: RecipeDefinition<Definition>,
): CompositionRecipe {
  function Example(): ReactNode {
    return recipe.render(recipe.definition);
  }

  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    ...(recipe.journey === undefined ? {} : { journey: recipe.journey }),
    Example,
    source: recipe.source(recipe.definition),
  };
}

function value(source: unknown): string {
  return JSON.stringify(source);
}

const documentationTask = {
  title: "Regenerate the command reference",
  description:
    "Update the generated command reference after changing a command contract.",
  path: "project/map/70-reference/commands.md",
  prerequisites: {
    items: [{
      requirement: "The command registry includes the intended contract.",
      state: "satisfied",
    }, {
      requirement: "The worktree has no unrelated changes.",
      state: "satisfied",
    }],
  },
  stepTitle: "Build the reference",
  action: "Run the source-backed generator from the project root.",
  command: "deno task codegen",
  workingDirectory: "/path/to/project",
  expected: "The generated reference matches the command registry.",
  stepCompletion: "The generator exits successfully.",
  branch: {
    title: "Choose the next check",
    choices: [{
      label: "The reference changed",
      path: "Review the generated diff",
      href: "#review-generated-reference",
    }, {
      label: "The reference did not change",
      path: "Check the command registry",
      href: "#check-command-registry",
    }],
  },
  completion:
    "The build passes and the generated reference has no uncommitted drift.",
} as const;

const documentationTaskRecipe = defineRecipe({
  id: "documentation-task",
  title: "Documentation task",
  description:
    "A complete operational page with a target path, executable step, and finish condition.",
  journey: {
    stages: [
      ".discern-procedure__prerequisites",
      ".discern-procedure__steps",
      ".discern-procedure-step__branch",
      ".discern-procedure__completion",
    ],
  },
  definition: documentationTask,
  render: (definition) => (
    <Procedure
      title={definition.title}
      description={
        <p>
          {definition.description} Target:{" "}
          <PathReference path={definition.path} copyable />
        </p>
      }
      prerequisites={definition.prerequisites}
      steps={[{
        title: definition.stepTitle,
        action: definition.action,
        command: {
          command: definition.command,
          workingDirectory: definition.workingDirectory,
        },
        expectedResult: { children: definition.expected },
        completionCriterion: definition.stepCompletion,
        branch: definition.branch,
      }]}
      completion={definition.completion}
    />
  ),
  source: (definition) =>
    `import { PathReference, Procedure } from "@discern-sh/design-system/react";

<Procedure
  title={${value(definition.title)}}
  description={
    <p>
      {${value(definition.description)}} Target:{" "}
      <PathReference path={${value(definition.path)}} copyable />
    </p>
  }
  prerequisites={${value(definition.prerequisites)}}
  steps={[{
    title: ${value(definition.stepTitle)},
    action: ${value(definition.action)},
    command: {
      command: ${value(definition.command)},
      workingDirectory: ${value(definition.workingDirectory)},
    },
    expectedResult: { children: ${value(definition.expected)} },
    completionCriterion: ${value(definition.stepCompletion)},
    branch: ${value(definition.branch)},
  }]}
  completion={${value(definition.completion)}}
/>`,
});

const nextAction = {
  title: "Choose what happens next",
  choices: [{
    label: "Recommended — it worked",
    path: "Continue to the next task",
    href: "#continue",
  }, {
    label: "It failed",
    path: "Open troubleshooting",
    href: "#troubleshooting",
  }, {
    label: "I need the reference",
    path: "Read the command reference",
    href: "#reference",
  }, {
    label: "Hand it to an agent",
    path: "Open the agent handoff",
    href: "#agent-handoff",
  }],
} as const;

const nextActionRecipe = defineRecipe({
  id: "next-action",
  title: "Next action",
  description:
    "An end-of-page recommendation plus condition-labelled alternatives, composed from Branch choice.",
  definition: nextAction,
  render: (definition) => (
    <BranchChoice
      title={definition.title}
      choices={definition.choices}
    />
  ),
  source: (definition) =>
    `import { BranchChoice } from "@discern-sh/design-system/react";

<BranchChoice
  title={${value(definition.title)}}
  choices={${value(definition.choices)}}
/>`,
});

const failureTriage = {
  diagnostic: {
    title: "Configuration schema mismatch",
    impact: "The validation job cannot apply an invalid timeout value.",
    correction: "Replace the quoted value with a number of seconds.",
    path: "config/project.toml",
    line: 12,
    evidence: 'timeout: expected number, received "fast"',
    reproductionCommand: "tool validate config/project.toml",
    workingDirectory: "/path/to/project",
  },
  result: {
    fact: "Configuration validation failed.",
    counts: [
      { label: "Errors", value: "1" },
      { label: "Warnings", value: "0" },
    ],
    duration: "0.4s",
    nextAction: "Correct the timeout value, then run validation again.",
  },
  raw: {
    label: "Validator output",
    detail: 'ValidationError: property "timeout" must satisfy type "number".',
  },
  retry: {
    safeToRetry: true,
    reason: "Retry after replacing the invalid timeout value.",
  },
} as const;

const failureTriageRecipe = defineRecipe({
  id: "failure-triage",
  title: "Failure triage",
  description:
    "A diagnostic account followed by the run-level result and its next action.",
  journey: {
    stages: [
      ".discern-result-summary",
      ".discern-diagnostic",
      ".discern-raw-output",
      ".discern-retry-notice",
    ],
  },
  definition: failureTriage,
  render: (definition) => (
    <div className="discern-example-stack">
      <ResultSummary
        state="failed"
        fact={definition.result.fact}
        counts={definition.result.counts}
        duration={definition.result.duration}
        nextAction={definition.result.nextAction}
      />
      <Diagnostic
        title={definition.diagnostic.title}
        impact={definition.diagnostic.impact}
        correction={definition.diagnostic.correction}
        path={definition.diagnostic.path}
        line={definition.diagnostic.line}
        evidence={definition.diagnostic.evidence}
        reproductionCommand={definition.diagnostic.reproductionCommand}
        workingDirectory={definition.diagnostic.workingDirectory}
      />
      <RawOutput label={definition.raw.label}>
        {definition.raw.detail}
      </RawOutput>
      <RetryNotice
        safeToRetry={definition.retry.safeToRetry}
        reason={definition.retry.reason}
      />
    </div>
  ),
  source: (definition) =>
    `import {
  Diagnostic,
  RawOutput,
  ResultSummary,
  RetryNotice,
} from "@discern-sh/design-system/react";

<div className="discern-example-stack">
  <ResultSummary
    state="failed"
    fact={${value(definition.result.fact)}}
    counts={${value(definition.result.counts)}}
    duration={${value(definition.result.duration)}}
    nextAction={${value(definition.result.nextAction)}}
  />
  <Diagnostic
    title={${value(definition.diagnostic.title)}}
    impact={${value(definition.diagnostic.impact)}}
    correction={${value(definition.diagnostic.correction)}}
    path={${value(definition.diagnostic.path)}}
    line={${value(definition.diagnostic.line)}}
    evidence={${value(definition.diagnostic.evidence)}}
    reproductionCommand={${
      value(
        definition.diagnostic.reproductionCommand,
      )
    }}
    workingDirectory={${value(definition.diagnostic.workingDirectory)}}
  />
  <RawOutput label={${value(definition.raw.label)}}>
    {${value(definition.raw.detail)}}
  </RawOutput>
  <RetryNotice
    safeToRetry={${value(definition.retry.safeToRetry)}}
    reason={${value(definition.retry.reason)}}
  />
</div>`,
});

const handoffVerificationReport = {
  report: {
    title: "Validation report",
    meta: [
      { label: "Run", value: "run-014" },
      { label: "Branch", value: "change/example" },
    ],
    checks: [
      { label: "Schema", state: "pass", value: "42 files" },
      { label: "Tests", state: "pass", value: "86 checks" },
    ],
    summary: "The handoff is ready for review.",
    footer: "Generated 2026-01-15 at 09:30 UTC",
  },
  artifact: {
    name: "Validation report",
    path: "build/reports/validation.json",
    summary: "Machine-readable evidence for the completed validation run.",
    provenance: "Generated from the current configuration and schema.",
  },
} as const;

const handoffVerificationReportRecipe = defineRecipe({
  id: "handoff-verification-report",
  title: "Handoff verification report",
  description:
    "A compact multi-check verification report paired with the artifact it produced.",
  definition: handoffVerificationReport,
  render: (definition) => (
    <div className="discern-example-stack">
      <VerificationReport
        title={definition.report.title}
        stamp="pass"
        meta={definition.report.meta}
        checks={definition.report.checks}
        summary={definition.report.summary}
        footer={definition.report.footer}
      />
      <ArtifactCard
        name={definition.artifact.name}
        path={definition.artifact.path}
        summary={definition.artifact.summary}
        ownership="generated"
        provenance={definition.artifact.provenance}
      />
    </div>
  ),
  source: (definition) =>
    `import { ArtifactCard, VerificationReport } from "@discern-sh/design-system/react";

<div className="discern-example-stack">
  <VerificationReport
    title={${value(definition.report.title)}}
    stamp="pass"
    meta={${value(definition.report.meta)}}
    checks={${value(definition.report.checks)}}
    summary={${value(definition.report.summary)}}
    footer={${value(definition.report.footer)}}
  />
  <ArtifactCard
    name={${value(definition.artifact.name)}}
    path={${value(definition.artifact.path)}}
    summary={${value(definition.artifact.summary)}}
    ownership="generated"
    provenance={${value(definition.artifact.provenance)}}
  />
</div>`,
});

const surveyArtifacts = {
  tree: [{
    name: "project",
    kind: "directory",
    children: [{
      name: "map",
      path: "project/map",
      kind: "directory",
      children: [{
        name: "commands.md",
        path: "project/map/70-reference/commands.md",
        kind: "file",
        annotation: "updated",
      }],
    }, {
      name: "component-registry.ts",
      path: "src/generated/component-registry.ts",
      kind: "file",
      annotation: "generated",
    }],
  }],
  changes: [{
    path: "project/map/70-reference/commands.md",
    disposition: "updated",
    magnitude: { added: 8, removed: 3 },
  }, {
    path: "src/generated/component-registry.ts",
    disposition: "generated",
    magnitude: { added: 4, removed: 4 },
  }],
  ownership: [{
    label: "Command reference",
    ownership: "project-owned",
  }, {
    label: "Component registry",
    ownership: "generated",
  }],
} as const;

const surveyArtifactsRecipe = defineRecipe({
  id: "survey-artifacts",
  title: "Survey artifacts",
  description:
    "A project tree followed by changed-file evidence and explicit ownership.",
  journey: {
    stages: [
      ".discern-artifact-tree",
      ".discern-artifact-survey__changes",
      ".discern-artifact-survey__ownership",
    ],
  },
  definition: surveyArtifacts,
  render: (definition) => (
    <div className="discern-example-stack">
      <ArtifactTree label="Project artifacts" nodes={definition.tree} />
      <section
        className="discern-artifact-survey__changes"
        aria-label="Changed files"
      >
        <h3>Changed files</h3>
        <ul>
          {definition.changes.map((change) => (
            <li key={change.path}>
              <FileChange
                path={change.path}
                disposition={change.disposition}
                magnitude={change.magnitude}
              />
            </li>
          ))}
        </ul>
      </section>
      <section
        className="discern-artifact-survey__ownership"
        aria-label="Artifact ownership"
      >
        <h3>Artifact ownership</h3>
        <dl>
          {definition.ownership.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>
                <OwnershipBadge ownership={item.ownership} />
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  ),
  source: (definition) =>
    `import {
  ArtifactTree,
  FileChange,
  OwnershipBadge,
} from "@discern-sh/design-system/react";

<div className="discern-example-stack">
  <ArtifactTree label="Project artifacts" nodes={${value(definition.tree)}} />
  <section
    className="discern-artifact-survey__changes"
    aria-label="Changed files"
  >
    <h3>Changed files</h3>
    <ul>
      {(${value(definition.changes)} as const).map((change) => (
        <li key={change.path}>
          <FileChange
            path={change.path}
            disposition={change.disposition}
            magnitude={change.magnitude}
          />
        </li>
      ))}
    </ul>
  </section>
  <section
    className="discern-artifact-survey__ownership"
    aria-label="Artifact ownership"
  >
    <h3>Artifact ownership</h3>
    <dl>
      {(${value(definition.ownership)} as const).map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>
            <OwnershipBadge ownership={item.ownership} />
          </dd>
        </div>
      ))}
    </dl>
  </section>
</div>`,
});

const readingFirstLanding = {
  journey: [{
    title: "Name the outcome",
    description: "Give the audience a destination before the explanation.",
    outcome: "The central promise is clear.",
  }, {
    title: "Reduce the machinery",
    description:
      "Show only the moments that change the reader's understanding.",
    outcome: "The method feels finite.",
  }, {
    title: "Return with evidence",
    description: "End on the result or decision that matters.",
    outcome: "The story resolves cleanly.",
  }],
  supporting: [{
    value: "3",
    label: "plain-language moments",
  }, {
    value: "1",
    label: "conceptual visual",
  }, {
    value: "0",
    label: "extra interfaces to decode",
  }],
} as const;

function ReadingFirstLandingVisual() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "relative",
        width: "100%",
        minHeight: "24rem",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "12% 40% 28% 8%",
          border: "1px solid var(--discern-color-border-strong)",
          borderRadius: "var(--discern-radius-lg)",
          background: "var(--discern-color-canvas)",
          transform: "rotate(-4deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "30% 8% 10% 42%",
          border: "1px solid var(--discern-color-accent-500)",
          borderRadius: "var(--discern-radius-lg)",
          background: "var(--discern-color-surface)",
          transform: "rotate(3deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "44% auto auto 47%",
          width: "4rem",
          aspectRatio: 1,
          borderRadius: "var(--discern-radius-pill)",
          background: "var(--discern-color-accent-500)",
          boxShadow: "var(--discern-shadow-card)",
        }}
      />
    </div>
  );
}

const readingFirstLandingRecipe = defineRecipe({
  id: "reading-first-landing",
  title: "Reading-first landing page",
  description:
    "A complete campaign rhythm that alternates explanation, conceptual relief, compression, evidence, human voice, and one final action.",
  journey: {
    stages: [
      ".discern-editorial-hero",
      ".discern-narrative-chapter",
      ".discern-marketing-stage",
      ".discern-journey-overview",
      ".discern-outcome-spotlight",
      ".discern-voice-break",
      ".discern-closing-statement",
    ],
  },
  definition: readingFirstLanding,
  render: (definition) => (
    <div>
      <EditorialHero
        headingLevel={2}
        eyebrow="A complex idea, clearly introduced"
        title={
          <>
            Make the difficult <em>feel navigable.</em>
          </>
        }
        description={
          <p>
            Lead with one promise in ordinary language, then let the rest of the
            page earn attention one idea at a time.
          </p>
        }
        actions={<Button href="#explanation">Begin with the idea</Button>}
        meta="No technical vocabulary is required to start."
        backdrop={<ApproachBackdrop />}
      />
      <NarrativeChapter
        id="explanation"
        eyebrow="Explain"
        title="Give substantial prose a comfortable reading shape."
        lead={
          <p>
            Complex products still need explanation. The design can make the
            route through that explanation obvious without manufacturing more
            things to inspect.
          </p>
        }
        aside={
          <>
            <span>Reading principle</span>
            <p>
              A visual earns its place when it compresses, demonstrates, proves,
              or creates relief.
            </p>
          </>
        }
      >
        <p>
          Begin with what changes for the audience. Introduce the method only
          after the destination is understood, and keep the detail in one stable
          reading flow.
        </p>
        <h3>Let each section perform one job</h3>
        <p>
          A section can orient, explain, demonstrate, prove, or invite action.
          When it attempts all five, the reader has to reconstruct the story.
        </p>
      </NarrativeChapter>
      <MarketingSection surface="sunken" spacing="spacious" frame="wide">
        <MarketingStage
          treatment="plain"
          label="Conceptual relief"
          caption="A quiet relationship replaces another realistic interface."
          aspect="landscape"
        >
          <ReadingFirstLandingVisual />
        </MarketingStage>
      </MarketingSection>
      <JourneyOverview
        eyebrow="Demonstrate"
        title="Compress the journey into the moments that matter."
        description={
          <p>
            The complete operational sequence can live elsewhere. This page
            needs the transformation the audience can remember.
          </p>
        }
        steps={definition.journey.map((step) => ({
          title: step.title,
          description: <p>{step.description}</p>,
          outcome: <span>{step.outcome}</span>,
        }))}
      />
      <OutcomeSpotlight
        eyebrow="Prove"
        title="Let one result carry the evidence."
        value="1"
        valueLabel="clear outcome to remember after the details have faded."
        supporting={definition.supporting}
      />
      <VoiceBreak
        eyebrow="A change of voice"
        quote="We understood the decision before we learned the machinery."
        attribution="An early reader"
        context="Encountering an unfamiliar technical product"
        portrait={<span>ER</span>}
      />
      <ClosingStatement
        eyebrow="One next step"
        title="End with a decision, not another explanation."
        description={
          <p>
            The story has done its work. The final chapter can now make the next
            action clear.
          </p>
        }
        actions={
          <>
            <Button href="#begin">Begin here</Button>
            <Button href="#details" variant="secondary">
              Read the details
            </Button>
          </>
        }
        reassurance={<p>No specialist knowledge is required to begin.</p>}
      />
    </div>
  ),
  source: (definition) =>
    `import {
  Button,
  ClosingStatement,
  EditorialHero,
  JourneyOverview,
  MarketingSection,
  MarketingStage,
  NarrativeChapter,
  OutcomeSpotlight,
  VoiceBreak,
} from "@discern-sh/design-system/react";

const journey = ${value(definition.journey)};

<div>
  <EditorialHero
    headingLevel={2}
    eyebrow="A complex idea, clearly introduced"
    title={<>Make the difficult <em>feel navigable.</em></>}
    description={<p>Lead with one promise in ordinary language.</p>}
    actions={<Button href="#explanation">Begin with the idea</Button>}
  />
  <NarrativeChapter
    id="explanation"
    eyebrow="Explain"
    title="Give substantial prose a comfortable reading shape."
    lead={<p>Complex products still need explanation.</p>}
  >
    <p>Keep the detail in one stable reading flow.</p>
  </NarrativeChapter>
  <MarketingSection surface="sunken" spacing="spacious" frame="wide">
    <MarketingStage label="Conceptual relief" treatment="plain">
      {/* Consumer-supplied conceptual artwork */}
    </MarketingStage>
  </MarketingSection>
  <JourneyOverview
    eyebrow="Demonstrate"
    title="Compress the journey into the moments that matter."
    steps={journey}
  />
  <OutcomeSpotlight
    eyebrow="Prove"
    title="Let one result carry the evidence."
    value="1"
    valueLabel="clear outcome to remember"
  />
  <VoiceBreak
    quote="We understood the decision before we learned the machinery."
    attribution="An early reader"
  />
  <ClosingStatement
    title="End with a decision, not another explanation."
    actions={<Button href="#begin">Begin here</Button>}
  />
</div>`,
});

export const compositionRecipes: readonly CompositionRecipe[] = [
  documentationTaskRecipe,
  nextActionRecipe,
  failureTriageRecipe,
  handoffVerificationReportRecipe,
  surveyArtifactsRecipe,
  readingFirstLandingRecipe,
];
