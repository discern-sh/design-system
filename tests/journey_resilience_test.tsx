import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Command } from "../src/components/workflow/command/command.tsx";
import {
  type CompositionRecipe,
  compositionRecipes,
} from "../styleguide/compositions.tsx";

interface RenderedJourney {
  readonly id: string;
  readonly html: string;
}

interface JourneyStageDeclaration {
  readonly id: string;
  readonly stages: readonly string[];
}

// These three sequences are a closed product contract. This test-only oracle is
// intentionally independent of the recipes: deriving it from journey.stages
// would let a removed middle stage authorize its own regression. Generic future
// journeys still auto-enrol in the structural and plaintext guards below.
const interactionGrammarJourneyStages = {
  "documentation-task": [
    ".discern-procedure__prerequisites",
    ".discern-procedure__steps",
    ".discern-procedure-step__branch",
    ".discern-procedure__completion",
  ],
  "failure-triage": [
    ".discern-result-summary",
    ".discern-diagnostic",
    ".discern-raw-output",
    ".discern-retry-notice",
  ],
  "survey-artifacts": [
    ".discern-artifact-tree",
    ".discern-artifact-survey__changes",
    ".discern-artifact-survey__ownership",
  ],
} as const satisfies Readonly<Record<string, readonly string[]>>;

function namedJourneyStageFailures(
  declarations: readonly JourneyStageDeclaration[],
): readonly string[] {
  const actual = new Map(
    declarations.map(({ id, stages }) => [id, stages] as const),
  );
  const failures: string[] = [];
  for (
    const [id, expected] of Object.entries(interactionGrammarJourneyStages)
  ) {
    const stages = actual.get(id);
    if (stages === undefined) {
      failures.push(`${id}: required journey is missing`);
      continue;
    }
    if (
      stages.length !== expected.length ||
      stages.some((stage, index) => stage !== expected[index])
    ) {
      failures.push(
        `${id}: expected ${expected.join(" → ")}, received ${
          stages.join(" → ")
        }`,
      );
    }
  }
  return failures;
}

function blocks(
  html: string,
  tag: string,
  className: string,
): readonly string[] {
  const escaped = className.replaceAll("-", "\\-");
  const pattern = new RegExp(
    `<${tag}[^>]*class="[^"]*\\b${escaped}\\b[^"]*"[^>]*>[\\s\\S]*?<\\/${tag}>`,
    "g",
  );
  return [...html.matchAll(pattern)].map((match) => match[0] ?? "");
}

function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function classText(html: string, className: string): string {
  const escaped = className.replaceAll("-", "\\-");
  const pattern = new RegExp(
    `<([a-z][a-z0-9-]*)[^>]*class="[^"]*\\b${escaped}\\b[^"]*"[^>]*>` +
      "([\\s\\S]*?)<\\/\\1>",
  );
  return plainText(pattern.exec(html)?.[2] ?? "");
}

function journeyMarkupFailures(
  journeys: readonly RenderedJourney[],
): readonly string[] {
  const failures: string[] = [];
  for (const journey of journeys) {
    for (
      const procedure of blocks(
        journey.html,
        "section",
        "discern-procedure",
      )
    ) {
      if (!procedure.includes('<ol class="discern-procedure__steps">')) {
        failures.push(`${journey.id}: Procedure steps are not an ordered list`);
      }
      if (
        !procedure.includes('<li class="discern-procedure__step">')
      ) {
        failures.push(`${journey.id}: Procedure has no ordered-list item`);
      }
      if (!plainText(procedure).includes("You are done when")) {
        failures.push(`${journey.id}: Procedure loses its completion label`);
      }
    }

    for (
      const diagnostic of blocks(
        journey.html,
        "article",
        "discern-diagnostic",
      )
    ) {
      const required = [
        ["discern-diagnostic__title", "what failed"],
        ["discern-diagnostic__location", "where it failed"],
        ["discern-diagnostic__correction", "the next action"],
      ] as const;
      for (const [className, fact] of required) {
        if (classText(diagnostic, className).length === 0) {
          failures.push(`${journey.id}: Diagnostic loses ${fact}`);
        }
      }
    }
  }
  return failures;
}

function renderedJourneys(
  recipes: readonly CompositionRecipe[],
): readonly RenderedJourney[] {
  return recipes.filter((recipe) => recipe.journey !== undefined).map((
    recipe,
  ) => ({
    id: recipe.id,
    html: renderToStaticMarkup(createElement(recipe.Example)),
  }));
}

Deno.test("every composition journey preserves its plaintext grammar", () => {
  const recipes = compositionRecipes.filter((recipe) =>
    recipe.journey !== undefined
  );
  assert(recipes.length > 0);
  for (const recipe of recipes) {
    const stages = recipe.journey?.stages ?? [];
    assert(stages.length > 0, `${recipe.id} has no journey stages`);
    assertEquals(
      new Set(stages).size,
      stages.length,
      `${recipe.id} repeats a journey stage`,
    );
  }
  assertEquals(
    namedJourneyStageFailures(
      recipes.map((recipe) => ({
        id: recipe.id,
        stages: recipe.journey?.stages ?? [],
      })),
    ),
    [],
  );
  assertEquals(journeyMarkupFailures(renderedJourneys(recipes)), []);
});

Deno.test("the named journey oracle catches a removed middle stage", () => {
  const declarations = compositionRecipes.flatMap((recipe) =>
    recipe.journey === undefined
      ? []
      : [{ id: recipe.id, stages: recipe.journey.stages }]
  );
  const missingRawOutput = declarations.map((declaration) =>
    declaration.id === "failure-triage"
      ? {
        ...declaration,
        stages: declaration.stages.filter((stage) =>
          stage !== ".discern-raw-output"
        ),
      }
      : declaration
  );
  const failures = namedJourneyStageFailures(missingRawOutput);
  assertEquals(failures.length, 1);
  assertStringIncludes(failures[0] ?? "", "failure-triage");
  assertStringIncludes(failures[0] ?? "", ".discern-raw-output");
});

Deno.test("the plaintext detector catches a future incomplete journey", () => {
  const failures = journeyMarkupFailures([{
    id: "future-incomplete-journey",
    html: `
      <section class="discern-procedure">
        <div class="discern-procedure__steps">Unnumbered action</div>
      </section>
      <article class="discern-diagnostic">
        <strong class="discern-diagnostic__title">Build failed</strong>
        <div class="discern-diagnostic__location"></div>
        <div class="discern-diagnostic__correction"></div>
      </article>
    `,
  }]);
  assert(
    failures.some((failure) => failure.includes("ordered list")),
    "future Procedure escaped ordered-list detection",
  );
  assert(
    failures.some((failure) => failure.includes("where it failed")),
    "future Diagnostic escaped location detection",
  );
  assert(
    failures.some((failure) => failure.includes("the next action")),
    "future Diagnostic escaped correction detection",
  );
});

Deno.test("Command keeps an executable payload in CSS-free markup", () => {
  const command = 'deno task check --filter "journey contract"';
  const html = renderToStaticMarkup(
    <Command
      command={command}
      workingDirectory="/path/to/project"
      expectedResult="The journey contract passes."
    />,
  );
  assertStringIncludes(
    html,
    "<code>deno task check --filter &quot;journey contract&quot;</code>",
  );
  assertStringIncludes(html, "<code>/path/to/project</code>");
  assertStringIncludes(html, "The journey contract passes.");
});
