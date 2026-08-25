/**
 * Synthetic-kind harness shared by the kind-family generator suites: it
 * fabricates conforming and deliberately malformed kind folders in temporary
 * roots so every family proves its enrolment guards against future members,
 * not today's population.
 *
 * @module
 */

import { assert } from "@std/assert";

/** The family vocabulary a fabricated kind writes its sources against. */
export interface FamilyVocabulary {
  readonly word: string;
  readonly typeName: string;
  readonly postures: readonly string[];
}

/** Options shaping one fabricated kind folder. */
export interface FixtureKindOptions {
  readonly slug?: string;
  readonly order?: number;
  readonly stance?: string;
  /** Raw source for the Metadata `cli` value, overriding the stance form. */
  readonly cliValue?: string;
  readonly include?: readonly string[];
  readonly useWhen?: readonly string[];
  readonly budgetDescription?: string;
  readonly budgetRemedy?: string;
  readonly family?: FamilyVocabulary;
}

/** The diagram family's vocabulary, the framework's first client. */
export const DIAGRAM_FAMILY: FamilyVocabulary = {
  word: "diagram",
  typeName: "Diagram",
  postures: [
    "minimal",
    "representative",
    "structural",
    "long-text",
    "maximum-density",
    "semantic-roles",
  ],
};

/** The mandatory kind surfaces every fabricated kind writes by default. */
export const REQUIRED = [
  "meta",
  "spec",
  "validation",
  "layout",
  "description",
  "fixtures",
  "mod",
] as const;

/** Directory URL for a temporary kind root path. */
export function rootUrl(path: string): URL {
  return new URL(`file://${path.endsWith("/") ? path : `${path}/`}`);
}

/** Write one fabricated kind folder beneath a temporary root. */
export async function writeKind(
  root: string,
  directory: string,
  options: FixtureKindOptions = {},
): Promise<void> {
  const slug = options.slug ?? directory.split("/").at(-1) ?? "probe";
  const family = options.family ?? DIAGRAM_FAMILY;
  const pascal = `${slug[0]?.toUpperCase()}${slug.slice(1)}${family.typeName}`;
  const include = new Set(options.include ?? REQUIRED);
  const path = `${root}/${directory}`;
  await Deno.mkdir(path, { recursive: true });
  const cliValue = options.cliValue ??
    `{ stance: "${options.stance ?? "description"}" }`;
  const files = new Map<string, string>([
    [
      "meta",
      `export default {
  name: "${slug}",
  slug: "${slug}",
  order: ${options.order ?? 10},
  description: "A temporary generator conformance kind.",
  useWhen: ${
        JSON.stringify(options.useWhen ?? ["Proving generated enrolment."])
      },
  notWhen: ["A real ${family.word} kind is required."],
  budgets: {
    entities: {
      limit: 3,
      unit: "entities",
      remedy: "${options.budgetRemedy ?? "split-overview"}",
      description: ${
        JSON.stringify(
          options.budgetDescription ?? "A measurable temporary ceiling.",
        )
      },
    },
  },
  cli: ${cliValue},
} as const;
`,
    ],
    [
      "spec",
      `export interface ${pascal}Spec { readonly kind: "${slug}"; readonly title: string; readonly summary: string; }
export interface Validated${pascal} extends ${pascal}Spec {}\n`,
    ],
    [
      "validation",
      "export default function validate(value: unknown): unknown { return value; }\n",
    ],
    [
      "layout",
      "export default function layout(value: unknown): unknown { return value; }\n",
    ],
    [
      "description",
      'export default function describe(): string { return "temporary"; }\n',
    ],
    [
      "fixtures",
      `const spec = { kind: "${slug}", title: "Temporary", summary: "Temporary." };
export const releaseCorpus = {
  kind: "${slug}",
  cases: [{
    name: "complete",
    postures: [${
        family.postures.map((posture) => JSON.stringify(posture)).join(", ")
      }],
    spec,
  }],
  overBudget: {
    dimension: "entities",
    authorAction: "${options.budgetRemedy ?? "split-overview"}",
    spec,
  },
  invalid: [{ name: "invalid", code: "${family.word}/invalid-spec", spec: { ...spec, extra: true } }],
};
export default releaseCorpus.cases.map(({ spec }) => spec);\n`,
    ],
    ["mod", "export const temporaryKind = true;\n"],
    [
      "cli",
      'export default function render(): string { return "temporary"; }\n',
    ],
  ]);
  for (const surface of include) {
    const source = files.get(surface);
    assert(source !== undefined);
    const name = surface === "mod" ? "mod.ts" : `${slug}.${surface}.ts`;
    await Deno.writeTextFile(`${path}/${name}`, source);
  }
}

/** Run one action against a fresh temporary kind root, then remove it. */
export async function withTemporaryRoot(
  action: (path: string, url: URL) => Promise<void>,
  prefix = "diagram-kind-generator-",
): Promise<void> {
  const path = await Deno.makeTempDir({ prefix });
  try {
    await action(path, rootUrl(path));
  } finally {
    await Deno.remove(path, { recursive: true });
  }
}
