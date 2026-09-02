/**
 * Project Component Metadata into the eval set of the
 * `use-discern-design-system` skill.
 *
 * Each Component's first use-when statement becomes a selection prompt whose
 * expected answer is that Component, its first do-not-use-when statement
 * becomes a refusal prompt, and its canonical default Web example names the
 * pinned Catalogue image a reviewer compares against. The set is generated
 * beside the other codegen outputs, so it cannot drift from the Metadata and
 * imagery it tests.
 */

import type { ComponentAuthorGuideSource } from "./component-author-guide.ts";
import { componentReactExportName } from "./component-author-guide.ts";

/** The skill whose `evals/evals.json` this renderer owns. */
export const COMPONENT_AUTHOR_SKILL = "use-discern-design-system";

/** One prompt with its human-readable expectation and gradable assertions. */
export interface ComponentAuthorEval {
  readonly id: number;
  readonly prompt: string;
  readonly expected_output: string;
  readonly files: readonly string[];
  readonly expectations: readonly string[];
}

/** The complete generated eval set. */
export interface ComponentAuthorEvalSet {
  readonly skill_name: typeof COMPONENT_AUTHOR_SKILL;
  readonly evals: readonly ComponentAuthorEval[];
}

const PUBLIC_ENTRYPOINTS =
  "@discern-sh/design-system or one of its documented entrypoints (/react, /cli, /runtime, /manifest, /tokens, /theme/discern, /chart, /diagram)";

const VERSION_EXPECTATION =
  "States the exact package version or checkout the answer was authored against.";

/**
 * The pinned light-theme image for a Component's canonical Web example. Every
 * validated vocabulary carries one — a rendered stance needs a shared example
 * and an exempt stance is Web-only — so an inventory without it is a defect.
 */
export function componentReferenceImage(
  source: ComponentAuthorGuideSource,
): string {
  const example = source.examples.find(({ surfaces }) =>
    surfaces.includes("web")
  );
  if (example === undefined) {
    throw new Error(
      `${source.meta.slug} has no Web example to pin a reference image to`,
    );
  }
  return `catalogue/generated/example-images/${source.meta.slug}--${example.id}--light.png`;
}

function selectionEval(
  source: ComponentAuthorGuideSource,
  statement: string,
  id: number,
): ComponentAuthorEval {
  const { meta } = source;
  const pascal = componentReactExportName(meta.slug);
  const terminal = meta.cli.stance === "rendered"
    ? `or \`render${pascal}Cli\` from ./cli`
    : "(no terminal renderer: the Component is exempt)";
  return {
    id,
    prompt:
      `Situation: ${statement}\n\nI'm building this in a Deno project that already depends on @discern-sh/design-system. Which package Component fits this situation? Justify the choice from the package's own guidance, then show how to author it through the public contract: runtime selection and either the React adapter or the terminal renderer.`,
    expected_output:
      `Selects ${meta.name} (\`${meta.slug}\`) and authors it as \`${pascal}\` from ./react ${terminal} after emitting a runtime that selects \`${meta.slug}\`. Reference image: ${
        componentReferenceImage(source)
      }`,
    files: [],
    expectations: [
      `Recommends ${meta.name} as the primary choice, naming its slug \`${meta.slug}\` or its React adapter \`${pascal}\`.`,
      `Every package import resolves ${PUBLIC_ENTRYPOINTS}; nothing imports a path inside the package source.`,
      `Does not style ${meta.name} by targeting its owned \`discern-${meta.slug}\` classes, copying its CSS, or forking the Component.`,
      `Cites at least one Metadata fact for ${meta.name} — a use-when, do-not-use-when, or accessibility note — as the reason for the choice.`,
      VERSION_EXPECTATION,
    ],
  };
}

function refusalEval(
  source: ComponentAuthorGuideSource,
  statement: string,
  id: number,
): ComponentAuthorEval {
  const { meta } = source;
  return {
    id,
    prompt:
      `Situation: ${statement}\n\nI'm building this in a Deno project that already depends on @discern-sh/design-system, and a teammate proposed the ${meta.name} Component (\`${meta.slug}\`). Is that the right choice? If not, name what the package's own guidance points to instead and explain the refusal.`,
    expected_output:
      `Refuses ${meta.name} (\`${meta.slug}\`) for this situation and routes to the alternative the Metadata names: ${statement}`,
    files: [],
    expectations: [
      `Does not recommend ${meta.name} (\`${meta.slug}\`) as the answer for this situation.`,
      `Names the alternative route — another package Component or a consumer-owned pattern — and explains why ${meta.name} is refused here.`,
      VERSION_EXPECTATION,
    ],
  };
}

/** Render the JSON eval set: every selection prompt, then every refusal. */
export function renderComponentAuthorEvals(
  components: readonly ComponentAuthorGuideSource[],
): string {
  const evals: ComponentAuthorEval[] = [];
  for (const source of components) {
    const statement = source.meta.useWhen?.[0];
    if (statement !== undefined) {
      evals.push(selectionEval(source, statement, evals.length + 1));
    }
  }
  for (const source of components) {
    const statement = source.meta.notWhen?.[0];
    if (statement !== undefined) {
      evals.push(refusalEval(source, statement, evals.length + 1));
    }
  }
  const set: ComponentAuthorEvalSet = {
    skill_name: COMPONENT_AUTHOR_SKILL,
    evals,
  };
  return `${JSON.stringify(set, null, 2)}\n`;
}
