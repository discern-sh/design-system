import { assertEquals, assertThrows } from "@std/assert";
import {
  componentExamplesForSurface,
  defineComponentExampleVocabulary,
  resolveComponentExampleVocabulary,
  validateComponentExampleImplementations,
} from "../src/types/component-examples.ts";
import type { ComponentMeta } from "../src/types/component-meta.ts";
import { defineCatalogueExamples } from "../catalogue/conformance.ts";
import { defineCliExamples } from "../src/cli/component-examples.ts";

const renderedMeta = {
  name: "Future sampler",
  slug: "future-sampler",
  group: "Core",
  order: 999,
  description: "Synthetic future-member contract fixture.",
  cli: { stance: "rendered" },
} as const satisfies ComponentMeta;

const vocabulary = defineComponentExampleVocabulary(
  renderedMeta,
  [
    { id: "default", label: "Default" },
    { id: "stress-case", label: "Stress case" },
    {
      id: "terminal-control",
      label: "Terminal control sequence",
      only: "cli",
      reason:
        "Browser markup cannot emit or interpret a terminal control sequence.",
    },
  ] as const,
);

Deno.test("one neutral vocabulary binds incompatible Web and CLI implementations", () => {
  const Default = () => null;
  const Stress = () => null;
  const web = defineCatalogueExamples(
    renderedMeta,
    vocabulary,
    [
      { id: "default", Example: Default },
      { id: "stress-case", Example: Stress },
    ] as const,
  );
  const cli = defineCliExamples(
    renderedMeta,
    vocabulary,
    [
      { name: "default", props: { value: "ordinary" } },
      { name: "stress-case", props: { value: "wide" } },
      { name: "terminal-control", props: { value: "\u001b[1m" } },
    ] as const,
  );

  assertEquals(web.map(({ id }) => id), ["default", "stress-case"]);
  assertEquals(cli.map(({ name }) => name), [
    "default",
    "stress-case",
    "terminal-control",
  ]);
  assertEquals(
    componentExamplesForSurface(renderedMeta, vocabulary, "web").map(
      ({ id }) => id,
    ),
    ["default", "stress-case"],
  );
});

Deno.test("a CLI exemption supplies the reason for explicit Web-only entries", () => {
  const exemptMeta = {
    ...renderedMeta,
    slug: "future-overlay",
    cli: {
      stance: "exempt",
      reason:
        "This browser overlay depends on pointer hover with no terminal trigger analogue.",
    },
  } as const satisfies ComponentMeta;
  const definitions = defineComponentExampleVocabulary(
    exemptMeta,
    [{
      id: "default",
      label: "Default",
      only: "web",
    }] as const,
  );
  assertEquals(resolveComponentExampleVocabulary(exemptMeta, definitions), [{
    id: "default",
    label: "Default",
    surfaces: ["web"],
    reason: exemptMeta.cli.reason,
  }]);
});

Deno.test("canonical vocabulary validation rejects ambiguous facts", () => {
  assertThrows(
    () =>
      defineComponentExampleVocabulary(renderedMeta, [
        { id: "stress", label: "Stress" },
        { id: "default", label: "Default" },
      ]),
    TypeError,
    "default must be first",
  );
  assertThrows(
    () =>
      defineComponentExampleVocabulary(renderedMeta, [
        { id: "default", label: "Default" },
        { id: "default", label: "Repeated" },
      ]),
    TypeError,
    "repeats canonical example",
  );
  assertThrows(
    () =>
      defineComponentExampleVocabulary(renderedMeta, [
        { id: "default", label: "Default" },
        { id: "other", label: "Default" },
      ]),
    TypeError,
    "repeats canonical example label",
  );
  assertThrows(
    () =>
      defineComponentExampleVocabulary(renderedMeta, [{
        id: "web-only",
        label: "Web only",
        only: "web",
        reason: "Browser only.",
      }]),
    TypeError,
    "specific impossibility reason",
  );
  assertThrows(
    () =>
      defineComponentExampleVocabulary(renderedMeta, [{
        id: "web-only",
        label: "Web only",
        only: "web",
        reason:
          "This example cannot be represented accurately on the other surface.",
      }]),
    TypeError,
    "must name the absent CLI medium",
  );
  assertThrows(
    () =>
      defineComponentExampleVocabulary(renderedMeta, [{
        id: "terminal-only",
        label: "Terminal only",
        only: "cli",
        reason: "Browser markup cannot reproduce terminal cursor addressing.",
      }]),
    TypeError,
    "no shared Web/CLI example",
  );
});

Deno.test("the future-member guard rejects every implementation drift class", () => {
  const validate = (ids: readonly string[]) =>
    validateComponentExampleImplementations(
      renderedMeta,
      vocabulary,
      "cli",
      ids,
      "future-sampler.cli.ts",
    );
  assertThrows(
    () => validate(["default", "stress-case"]),
    TypeError,
    'omit canonical "terminal-control"',
  );
  assertThrows(
    () => validate(["default", "stress-case", "stress-case"]),
    TypeError,
    'duplicate "stress-case"',
  );
  assertThrows(
    () => validate(["stress-case", "default", "terminal-control"]),
    TypeError,
    "are reordered",
  );
  assertThrows(
    () => validate(["default", "invented", "terminal-control"]),
    TypeError,
    'contain undeclared "invented"',
  );
  assertThrows(
    () =>
      validateComponentExampleImplementations(
        renderedMeta,
        vocabulary,
        "web",
        ["default", "stress-case", "terminal-control"],
        "future-sampler.examples.tsx",
      ),
    TypeError,
    "declared for cli only",
  );
});
