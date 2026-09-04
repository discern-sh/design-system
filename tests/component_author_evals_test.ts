import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  COMPONENT_AUTHOR_SKILL,
  COMPONENT_AUTHOR_SMOKE_CASES,
  type ComponentAuthorEvalSet,
  componentReferenceImage,
  renderComponentAuthorEvals,
} from "../scripts/component-author-evals.ts";
import type { ComponentAuthorGuideSource } from "../scripts/component-author-guide.ts";
import { componentMetadata } from "../src/component-metadata.ts";
import {
  type ComponentExampleDefinition,
  resolveComponentExampleVocabulary,
} from "../src/types/component-examples.ts";
import type { ComponentMeta } from "../src/types/component-meta.ts";

const PACKAGE_ROOT = new URL("../", import.meta.url);
const SKILL_ROOT = new URL("skills/use-discern-design-system/", PACKAGE_ROOT);

function source(
  meta: ComponentMeta,
  vocabulary: readonly ComponentExampleDefinition[] = [
    { id: "default", label: `${meta.name} at rest` },
  ],
): ComponentAuthorGuideSource {
  return {
    meta,
    examples: resolveComponentExampleVocabulary(meta, vocabulary),
  };
}

const probe: ComponentMeta = {
  name: "Probe panel",
  slug: "probe-panel",
  group: "Feedback",
  order: 999,
  cli: { stance: "rendered" },
  description: "A synthetic future Component proving eval enrolment.",
  useWhen: [
    "A probe result must stay visible beside its cause.",
    "A second situation the eval set deliberately leaves out.",
  ],
  notWhen: [
    "The result is a single number; Stat serves it.",
    "A second refusal the eval set deliberately leaves out.",
  ],
};

Deno.test("a future Component's first use-when and refusal become one eval each", () => {
  const set = JSON.parse(
    renderComponentAuthorEvals([source(probe)]),
  ) as ComponentAuthorEvalSet;
  assertEquals(set.skill_name, COMPONENT_AUTHOR_SKILL);
  assertEquals(set.evals.map(({ id }) => id), [1, 2]);
  const [selection, refusal] = set.evals;
  assert(selection && refusal);
  assertStringIncludes(
    selection.prompt,
    "Situation: A probe result must stay visible beside its cause.",
  );
  assert(!selection.prompt.includes("deliberately leaves out"));
  assertStringIncludes(
    selection.expected_output,
    "Probe panel (`probe-panel`)",
  );
  assertStringIncludes(selection.expected_output, "`renderProbePanelCli`");
  assertStringIncludes(
    selection.expected_output,
    "Reference image: catalogue/generated/example-images/probe-panel--default--light.png",
  );
  assertEquals(selection.files, [
    "catalogue/generated/example-images/probe-panel--default--light.png",
  ]);
  assert(
    selection.expectations.some((expectation) =>
      expectation.includes("`probe-panel`") &&
      expectation.includes("`ProbePanel`")
    ),
    "the selection expectation names slug and React adapter",
  );
  assertStringIncludes(
    refusal.prompt,
    "Situation: The result is a single number; Stat serves it.",
  );
  assertStringIncludes(refusal.prompt, "Probe panel Component (`probe-panel`)");
  assert(
    refusal.expectations.some((expectation) =>
      expectation.startsWith("Does not recommend Probe panel")
    ),
  );
});

Deno.test("Components without guidance statements contribute no evals", () => {
  const bare: ComponentMeta = {
    name: "Bare mark",
    slug: "bare-mark",
    group: "Core",
    order: 999,
    cli: { stance: "rendered" },
    description: "A primitive with no use-when or not-when statements.",
  };
  const set = JSON.parse(
    renderComponentAuthorEvals([source(bare)]),
  ) as ComponentAuthorEvalSet;
  assertEquals(set.evals, []);
  assertEquals(
    componentReferenceImage(source(bare)),
    "catalogue/generated/example-images/bare-mark--default--light.png",
  );
});

Deno.test("a reference image needs a Web example, which every valid vocabulary has", () => {
  const exempt: ComponentMeta = {
    name: "Probe field",
    slug: "probe-field",
    group: "Artwork",
    order: 999,
    cli: {
      stance: "exempt",
      reason:
        "Probe field paints a continuous decorative browser plane that terminal cells cannot represent.",
    },
    description: "A synthetic decorative field.",
    useWhen: ["A canvas needs a synthetic field."],
  };
  assertEquals(
    componentReferenceImage(
      source(exempt, [{ id: "default", label: "Probe field", only: "web" }]),
    ),
    "catalogue/generated/example-images/probe-field--default--light.png",
  );
  const terminalOnly: ComponentAuthorGuideSource = {
    meta: exempt,
    examples: [{ id: "frame", label: "Frame", surfaces: ["cli"] }],
  };
  assertThrows(
    () => componentReferenceImage(terminalOnly),
    Error,
    "no Web example",
  );
  assertThrows(
    () => renderComponentAuthorEvals([terminalOnly]),
    Error,
    "no Web example",
  );
});

Deno.test("the committed eval set is named for the skill and pinned to existing imagery", async () => {
  const set = JSON.parse(
    await Deno.readTextFile(new URL("evals/evals.json", SKILL_ROOT)),
  ) as ComponentAuthorEvalSet;
  const skill = await Deno.readTextFile(new URL("SKILL.md", SKILL_ROOT));
  assertEquals(set.skill_name, COMPONENT_AUTHOR_SKILL);
  assertStringIncludes(skill, `\nname: ${COMPONENT_AUTHOR_SKILL}\n`);
  assertEquals(
    set.evals.map(({ id }) => id),
    set.evals.map((_, index) => index + 1),
  );
  const selections =
    componentMetadata.filter((meta) => (meta.useWhen?.length ?? 0) > 0).length;
  const refusals =
    componentMetadata.filter((meta) => (meta.notWhen?.length ?? 0) > 0).length;
  assertEquals(set.evals.length, selections + refusals);
  let images = 0;
  for (const candidate of set.evals) {
    for (const image of candidate.files) {
      images += 1;
      assertStringIncludes(
        candidate.expected_output,
        `Reference image: ${image}`,
      );
      const info = await Deno.stat(new URL(image, PACKAGE_ROOT));
      assert(info.isFile, `${image} is not a committed file`);
    }
  }
  assertEquals(images, selections, "every selection eval attaches one image");
  assertEquals(
    set.evals.slice(selections).flatMap(({ files }) => files),
    [],
    "refusal evals need Metadata rather than imagery",
  );
});

Deno.test("the routine smoke set binds every deliberate behavioural posture", async () => {
  const set = JSON.parse(
    await Deno.readTextFile(new URL("evals/smoke.json", SKILL_ROOT)),
  ) as ComponentAuthorEvalSet;
  assertEquals(set.skill_name, COMPONENT_AUTHOR_SKILL);
  assertEquals(set.evals.length, COMPONENT_AUTHOR_SMOKE_CASES.length);
  assertEquals(
    COMPONENT_AUTHOR_SMOKE_CASES.map(({ posture }) => posture),
    [
      "semantic-selection",
      "refusal",
      "cli-exemption",
      "browser-behavior",
      "imagery",
    ],
  );
  for (const [index, candidate] of COMPONENT_AUTHOR_SMOKE_CASES.entries()) {
    const evaluation = set.evals[index];
    assert(evaluation, `missing ${candidate.posture} smoke eval`);
    assertEquals(evaluation.id, index + 1);
    assertStringIncludes(evaluation.expected_output, `\`${candidate.slug}\``);
  }
  const cliExemption = set.evals[2];
  const browserBehavior = set.evals[3];
  const imagery = set.evals[4];
  assert(cliExemption && browserBehavior && imagery);
  assertStringIncludes(cliExemption.expected_output, "no terminal renderer");
  assert(
    browserBehavior.expectations.some((expectation) =>
      expectation.includes("generated browser behavior")
    ),
  );
  assertEquals(imagery.files.length, 1);
  const image = imagery.files[0];
  assert(image);
  assert((await Deno.stat(new URL(image, PACKAGE_ROOT))).isFile);
});
