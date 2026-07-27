import type { ComponentType, ReactNode } from "react";
import { Receipt } from "../src/components/agents/receipt/receipt.tsx";
import { ArtifactCard } from "../src/components/workflow/artifact-card/artifact-card.tsx";
import { BranchChoice } from "../src/components/workflow/branch-choice/branch-choice.tsx";
import { Diagnostic } from "../src/components/workflow/diagnostic/diagnostic.tsx";
import { PathReference } from "../src/components/workflow/path-reference/path-reference.tsx";
import { Procedure } from "../src/components/workflow/procedure/procedure.tsx";
import { ResultSummary } from "../src/components/workflow/result-summary/result-summary.tsx";

/** A styleguide-only composition with a preview and source built from one definition. */
export interface CompositionRecipe {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly Example: ComponentType;
  readonly source: string;
}

interface RecipeDefinition<Definition> {
  readonly id: string;
  readonly title: string;
  readonly description: string;
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
  stepTitle: "Build the reference",
  action: "Run the source-backed generator from the project root.",
  command: "deno task codegen",
  workingDirectory: "/path/to/project",
  expected: "The generated reference matches the command registry.",
  stepCompletion: "The generator exits successfully.",
  completion:
    "The build passes and the generated reference has no uncommitted drift.",
} as const;

const documentationTaskRecipe = defineRecipe({
  id: "documentation-task",
  title: "Documentation task",
  description:
    "A complete operational page with a target path, executable step, and finish condition.",
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
      steps={[{
        title: definition.stepTitle,
        action: definition.action,
        command: {
          command: definition.command,
          workingDirectory: definition.workingDirectory,
        },
        expectedResult: { children: definition.expected },
        completionCriterion: definition.stepCompletion,
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
  steps={[{
    title: ${value(definition.stepTitle)},
    action: ${value(definition.action)},
    command: {
      command: ${value(definition.command)},
      workingDirectory: ${value(definition.workingDirectory)},
    },
    expectedResult: { children: ${value(definition.expected)} },
    completionCriterion: ${value(definition.stepCompletion)},
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
    rawDetail:
      'ValidationError: property "timeout" must satisfy type "number".',
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
} as const;

const failureTriageRecipe = defineRecipe({
  id: "failure-triage",
  title: "Failure triage",
  description:
    "A diagnostic account followed by the run-level result and its next action.",
  definition: failureTriage,
  render: (definition) => (
    <div className="discern-example-stack">
      <Diagnostic
        title={definition.diagnostic.title}
        impact={definition.diagnostic.impact}
        correction={definition.diagnostic.correction}
        path={definition.diagnostic.path}
        line={definition.diagnostic.line}
        evidence={definition.diagnostic.evidence}
        reproductionCommand={definition.diagnostic.reproductionCommand}
        workingDirectory={definition.diagnostic.workingDirectory}
        rawDetail={definition.diagnostic.rawDetail}
      />
      <ResultSummary
        state="failed"
        fact={definition.result.fact}
        counts={definition.result.counts}
        duration={definition.result.duration}
        nextAction={definition.result.nextAction}
      />
    </div>
  ),
  source: (definition) =>
    `import { Diagnostic, ResultSummary } from "@discern-sh/design-system/react";

<div className="discern-example-stack">
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
    rawDetail={${value(definition.diagnostic.rawDetail)}}
  />
  <ResultSummary
    state="failed"
    fact={${value(definition.result.fact)}}
    counts={${value(definition.result.counts)}}
    duration={${value(definition.result.duration)}}
    nextAction={${value(definition.result.nextAction)}}
  />
</div>`,
});

const handoffReceipt = {
  receipt: {
    title: "Validation receipt",
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

const handoffReceiptRecipe = defineRecipe({
  id: "handoff-receipt",
  title: "Handoff receipt",
  description:
    "A compact proof-of-work receipt paired with the artifact it produced.",
  definition: handoffReceipt,
  render: (definition) => (
    <div className="discern-example-stack">
      <Receipt
        title={definition.receipt.title}
        stamp="pass"
        meta={definition.receipt.meta}
        checks={definition.receipt.checks}
        summary={definition.receipt.summary}
        footer={definition.receipt.footer}
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
    `import { ArtifactCard, Receipt } from "@discern-sh/design-system/react";

<div className="discern-example-stack">
  <Receipt
    title={${value(definition.receipt.title)}}
    stamp="pass"
    meta={${value(definition.receipt.meta)}}
    checks={${value(definition.receipt.checks)}}
    summary={${value(definition.receipt.summary)}}
    footer={${value(definition.receipt.footer)}}
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

export const compositionRecipes: readonly CompositionRecipe[] = [
  documentationTaskRecipe,
  nextActionRecipe,
  failureTriageRecipe,
  handoffReceiptRecipe,
];
