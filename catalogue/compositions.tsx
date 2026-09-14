import type { ComponentType, ReactNode } from "react";
import { VerificationReport } from "../src/components/agents/verification-report/verification-report.tsx";
import { Stack } from "../src/components/layout/stack/stack.tsx";
import { Button } from "../src/components/core/button/button.tsx";
import { ClosingStatement } from "../src/components/marketing/closing-statement/closing-statement.tsx";
import { EditorialHero } from "../src/components/marketing/editorial-hero/editorial-hero.tsx";
import { FeatureBento } from "../src/components/marketing/feature-bento/feature-bento.tsx";
import { JourneyOverview } from "../src/components/marketing/journey-overview/journey-overview.tsx";
import { MarketingIntro } from "../src/components/marketing/marketing-intro/marketing-intro.tsx";
import { MarketingSection } from "../src/components/marketing/marketing-section/marketing-section.tsx";
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
import { registry } from "./generated/registry.ts";

/** Catalogue posture shared by every Composition projection. */
export const illustrativePatternStatus = Object.freeze(
  {
    id: "illustrative-pattern",
    label: "Illustrative pattern",
    sourceGuidance:
      "Adapt this example to your context; it is not an exported package API or guaranteed drop-in source.",
  } as const,
);

/** Ordered semantic stages a conformance journey must render. */
export interface JourneyContract {
  readonly stages: readonly string[];
}

/** Intentional presentation boundary for a Composition demonstration. */
export type CompositionStage = "inset" | "full-bleed";

/** Host context that keeps a Composition's root heading semantic. */
export interface CompositionExampleProps {
  readonly rootHeadingLevel?: 1 | 2;
}

/** A Catalogue-only composition with a preview and source built from one definition. */
export interface CompositionRecipe {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: typeof illustrativePatternStatus;
  readonly stage: CompositionStage;
  readonly components: readonly string[];
  readonly journey?: JourneyContract;
  readonly Example: ComponentType<CompositionExampleProps>;
  readonly source: string;
}

interface RecipeDefinition<Definition> {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly components: readonly string[];
  readonly journey?: JourneyContract;
  readonly stage?: CompositionStage;
  readonly definition: Definition;
  readonly render: (
    definition: Definition,
    context: Required<CompositionExampleProps>,
  ) => ReactNode;
  readonly source: (definition: Definition) => string;
}

/** One registry-backed constituent suitable for links and source projection. */
export interface CompositionConstituent {
  readonly slug: string;
  readonly name: string;
  readonly reactExport: string;
}

const constituentBySlug = new Map<string, CompositionConstituent>(
  registry.map(({ meta, reactExport }) => [
    meta.slug,
    { slug: meta.slug, name: meta.name, reactExport },
  ]),
);

function constituent(slug: string, recipeId: string): CompositionConstituent {
  const entry = constituentBySlug.get(slug);
  if (entry === undefined) {
    throw new TypeError(
      `Composition ${recipeId} names unknown Component ${JSON.stringify(slug)}`,
    );
  }
  return entry;
}

/** Resolve deliberate membership through the generated Component registry. */
export function compositionConstituents(
  recipe: Pick<CompositionRecipe, "id" | "components">,
): readonly CompositionConstituent[] {
  return recipe.components.map((slug) => constituent(slug, recipe.id));
}

/** Derive the adaptable example import from the same ordered membership. */
export function compositionExampleImport(
  recipe: Pick<CompositionRecipe, "id" | "components">,
): string {
  const exports = compositionConstituents(recipe).map(({ reactExport }) =>
    reactExport
  );
  if (exports.length <= 2) {
    return `import { ${
      exports.join(", ")
    } } from "@discern-sh/design-system/react";`;
  }
  return `import {\n  ${
    exports.join(",\n  ")
  },\n} from "@discern-sh/design-system/react";`;
}

/** Build every Composition projection from one structured recipe definition. */
export function defineRecipe<Definition>(
  recipe: RecipeDefinition<Definition>,
): CompositionRecipe {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(recipe.id)) {
    throw new TypeError(`Composition id must be kebab-case: ${recipe.id}`);
  }
  if (recipe.components.length === 0) {
    throw new TypeError(`Composition ${recipe.id} needs a Component`);
  }
  if (new Set(recipe.components).size !== recipe.components.length) {
    throw new TypeError(`Composition ${recipe.id} repeats a Component`);
  }
  const components = Object.freeze([...recipe.components]);
  const identity = { id: recipe.id, components };
  compositionConstituents(identity);

  function Example(
    { rootHeadingLevel = 1 }: CompositionExampleProps,
  ): ReactNode {
    return recipe.render(recipe.definition, {
      rootHeadingLevel,
    });
  }

  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    status: illustrativePatternStatus,
    stage: recipe.stage ?? "inset",
    components,
    ...(recipe.journey === undefined ? {} : { journey: recipe.journey }),
    Example,
    source: `${compositionExampleImport(identity)}\n\n${
      recipe.source(recipe.definition).trim()
    }`,
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
    "Guide someone from prerequisites through one executable documentation change to a clear finish.",
  components: ["procedure", "path-reference"],
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
    `<Procedure
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
    "Help someone choose the right next step when one recommendation and several conditions compete.",
  components: ["branch-choice"],
  definition: nextAction,
  render: (definition) => (
    <BranchChoice
      title={definition.title}
      choices={definition.choices}
    />
  ),
  source: (definition) =>
    `<BranchChoice
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
    "Explain why a run failed, what evidence matters, and when it is safe to try again.",
  components: [
    "stack",
    "result-summary",
    "diagnostic",
    "raw-output",
    "retry-notice",
  ],
  journey: {
    stages: [
      ".discern-result-summary",
      ".discern-diagnostic",
      ".discern-diagnostic + .discern-raw-output",
      ".discern-retry-notice",
    ],
  },
  definition: failureTriage,
  render: (definition) => (
    <Stack gap={6}>
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
    </Stack>
  ),
  source: (definition) =>
    `<Stack gap={6}>
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
</Stack>`,
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
    "Hand off a completed check with compact proof and the artifact another person can inspect.",
  components: ["stack", "verification-report", "artifact-card"],
  definition: handoffVerificationReport,
  render: (definition) => (
    <Stack gap={6}>
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
    </Stack>
  ),
  source: (definition) =>
    `<Stack gap={6}>
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
</Stack>`,
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
    "Make changed files and their ownership legible before a review or handoff.",
  components: ["stack", "artifact-tree", "file-change", "ownership-badge"],
  journey: {
    stages: [
      ".discern-artifact-tree",
      ".discern-artifact-survey__changes",
      ".discern-artifact-survey__ownership",
    ],
  },
  definition: surveyArtifacts,
  render: (definition) => (
    <Stack gap={6}>
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
    </Stack>
  ),
  source: (definition) =>
    `<Stack gap={6}>
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
</Stack>`,
});

const readingFirstLanding = {
  hero: {
    eyebrow: "A practical workshop guide",
    title: "Turn an open question into a shared plan.",
    description:
      "Bring the people closest to a decision together. Prepare a focused discussion and leave with a next step everyone can find.",
    meta:
      "For facilitators and participants, in the room or contributing in writing.",
  },
  introduction: {
    eyebrow: "Before you invite anyone",
    title: "Start with a decision worth making together.",
    description:
      "A workshop needs a question that benefits from different perspectives. Write it in one sentence, then name the constraints and the people affected.",
  },
  preparation: {
    eyebrow: "Your preparation checklist",
    title: "Give everyone the same starting point.",
    description:
      "Send these four things with the invitation. Keep the reading short enough that participants can prepare thoughtfully.",
    items: [
      {
        title: "The question",
        description:
          "State what the group needs to decide and what is outside this session. Include the constraints that every option must respect.",
        size: "wide",
        tone: "accent",
      },
      {
        title: "The evidence",
        description:
          "Link the relevant observations and research notes. Label assumptions and open questions so they can be challenged.",
        size: "wide",
      },
      {
        title: "The participants",
        description:
          "Invite the people affected by the decision, including someone who can explain how the work happens today.",
        size: "wide",
      },
      {
        title: "The decision record",
        description:
          "Prepare a place for the options, the reasons for the choice, an action owner, and a review date.",
        size: "wide",
      },
    ],
  },
  journey: {
    eyebrow: "During the session",
    title: "Move from individual thinking to a shared next step.",
    description:
      "Use the sequence as a starting point. Allow more time when the question is unfamiliar or the group needs to hear additional perspectives.",
    steps: [
      {
        title: "Make room to think",
        description:
          "Restate the question and give everyone time to write privately before anyone presents an answer.",
        outcome: "A set of independent perspectives.",
      },
      {
        title: "Compare the options",
        description:
          "Look for differences in evidence and assumptions. Test the options against the constraints you agreed.",
        outcome: "Reasons for a choice, with uncertainty recorded.",
      },
      {
        title: "Agree the next step",
        description:
          "Write down the action, its owner, and when to review it. Share the record with people who contributed in writing.",
        outcome: "A decision people can act on and revisit.",
      },
    ],
  },
  closing: {
    eyebrow: "Ready to prepare?",
    title: "Write the question before you book the room.",
    description:
      "Use the checklist to draft the invitation. If the question is still too broad, ask the people closest to it what they need to decide first.",
    reassurance:
      "Keep the preparation and decision record together so the next conversation starts with context.",
  },
} as const;

const readingFirstLandingRecipe = defineRecipe({
  id: "reading-first-landing",
  title: "Reading-first landing page",
  description:
    "A complete workshop-planning guide: a clear invitation, preparation checklist, discussion sequence, and useful next action.",
  stage: "full-bleed",
  components: [
    "editorial-hero",
    "button",
    "marketing-section",
    "marketing-intro",
    "feature-bento",
    "journey-overview",
    "closing-statement",
  ],
  journey: {
    stages: [
      ".discern-editorial-hero",
      "#workshop-question",
      ".discern-feature-bento",
      ".discern-journey-overview",
      ".discern-closing-statement",
    ],
  },
  definition: readingFirstLanding,
  render: (definition, { rootHeadingLevel }) => (
    <div>
      <EditorialHero
        {...definition.hero}
        headingLevel={rootHeadingLevel}
        actions={
          <Button href="#workshop-preparation">
            Use the preparation checklist
          </Button>
        }
      />
      <MarketingSection
        id="workshop-question"
        spacing="standard"
        frame="wide"
        style={{ paddingBlockStart: 0 }}
      >
        <MarketingIntro
          {...definition.introduction}
          style={{ marginBlockEnd: 0 }}
        />
      </MarketingSection>
      <FeatureBento id="workshop-preparation" {...definition.preparation} />
      <JourneyOverview
        id="workshop-sequence"
        {...definition.journey}
        surface="canvas"
      />
      <ClosingStatement
        {...definition.closing}
        actions={
          <>
            <Button href="#workshop-preparation">Prepare the invitation</Button>
            <Button href="#workshop-sequence" variant="secondary">
              Review the session sequence
            </Button>
          </>
        }
      />
    </div>
  ),
  source: (definition) =>
    `const guide = ${value(definition)} as const;

<div>
  <EditorialHero {...guide.hero}
    actions={<Button href="#workshop-preparation">Use the preparation checklist</Button>}
  />
  <MarketingSection id="workshop-question" spacing="standard" frame="wide" style={{ paddingBlockStart: 0 }}>
    <MarketingIntro {...guide.introduction} style={{ marginBlockEnd: 0 }} />
  </MarketingSection>
  <FeatureBento id="workshop-preparation" {...guide.preparation} />
  <JourneyOverview id="workshop-sequence" {...guide.journey} surface="canvas" />
  <ClosingStatement {...guide.closing} actions={
    <>
      <Button href="#workshop-preparation">Prepare the invitation</Button>
      <Button href="#workshop-sequence" variant="secondary">Review the session sequence</Button>
    </>
  } />
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
