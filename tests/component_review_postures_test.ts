import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  type ConformanceTarget,
  defineCatalogueExamples,
} from "../catalogue/conformance.ts";
import {
  defineComponentReviewPostures,
  resolveComponentReviewPostures,
  validateReviewPostureTargets,
} from "../catalogue/review-postures.ts";
import { registry } from "../catalogue/generated/registry.ts";
import { defineComponentExampleVocabulary } from "../src/types/component-examples.ts";
import type { ComponentMeta } from "../src/types/component-meta.ts";

const meta = {
  name: "Future sampler",
  slug: "future-sampler",
  group: "Core",
  order: 999,
  description: "Synthetic future-member posture fixture.",
  cli: { stance: "rendered" },
} as const satisfies ComponentMeta;
const vocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Default" },
    { id: "expanded", label: "Expanded" },
  ] as const,
);
const examples = defineCatalogueExamples(
  meta,
  vocabulary,
  [
    { id: "default", Example: () => null },
    {
      id: "expanded",
      Example: () => null,
      capture: { selectors: [".discern-future-sampler", "[role=dialog]"] },
    },
  ] as const,
);

Deno.test("every current and synthetic future Web example auto-enrols in settled review", () => {
  const resolved = resolveComponentReviewPostures(
    meta,
    vocabulary,
    examples,
    [],
  );
  assertEquals(resolved.map(({ example, id }) => [example, id]), [
    ["default", "settled-default"],
    ["expanded", "settled-expanded"],
  ]);
  assertEquals(
    resolved.map(({ capture }) => capture?.selectors ?? []),
    [[], [".discern-future-sampler", "[role=dialog]"]],
  );

  const futureVocabulary = defineComponentExampleVocabulary(
    meta,
    [
      { id: "default", label: "Default" },
      { id: "expanded", label: "Expanded" },
      { id: "future-state", label: "Future state" },
    ] as const,
  );
  const futureExamples = defineCatalogueExamples(
    meta,
    futureVocabulary,
    [
      { id: "default", Example: () => null },
      { id: "expanded", Example: () => null },
      { id: "future-state", Example: () => null },
    ] as const,
  );
  assertEquals(
    resolveComponentReviewPostures(
      meta,
      futureVocabulary,
      futureExamples,
      [],
    ).length,
    3,
  );
});

Deno.test("settled review does not inherit capture regions that require preparation", () => {
  const futureVocabulary = defineComponentExampleVocabulary(
    meta,
    [
      { id: "default", label: "Default" },
      { id: "latent-evidence", label: "Latent evidence" },
    ] as const,
  );
  const futureExamples = defineCatalogueExamples(
    meta,
    futureVocabulary,
    [
      {
        id: "default",
        Example: () => null,
        capture: { selectors: [".discern-future-sampler"] },
      },
      {
        id: "latent-evidence",
        Example: () => null,
        capture: {
          prepare: [{ action: "focus", selector: "[data-reveal]" }],
          selectors: ["[data-latent-region]"],
        },
      },
    ] as const,
  );
  const postures = defineComponentReviewPostures(
    meta,
    futureVocabulary,
    [{
      id: "reveal-latent-evidence",
      label: "Reveal latent evidence",
      example: "latent-evidence",
      category: "interaction",
      sequence: [
        { action: "focus", target: { selector: "[data-reveal]" } },
        { checkpoint: { id: "latent-visible", label: "Latent visible" } },
      ],
    }] as const,
  );
  const resolved = resolveComponentReviewPostures(
    meta,
    futureVocabulary,
    futureExamples,
    postures,
  );

  assertEquals(resolved[0]?.capture?.selectors, [
    ".discern-future-sampler",
  ]);
  assertEquals(resolved[1]?.capture, undefined);
  assertEquals(resolved[2]?.capture, {
    selectors: ["[data-latent-region]"],
  });
});

Deno.test("every current canonical Web example is present in generated settled review", () => {
  let preparedCaptureExamples = 0;
  const preparationDependentCaptures: string[] = [];
  for (const entry of registry) {
    for (const example of entry.webExamples) {
      const settled = entry.reviewPostures.filter((posture) =>
        posture.id === `settled-${example.id}` && posture.example === example.id
      );
      assertEquals(
        settled.length,
        1,
        `${entry.meta.slug}/${example.id} must have exactly one generated settled posture`,
      );
      if ((example.capture?.prepare?.length ?? 0) > 0) {
        preparedCaptureExamples += 1;
        if (settled[0]?.capture !== undefined) {
          preparationDependentCaptures.push(
            `${entry.meta.slug}/${example.id}`,
          );
        }
      }
    }
  }
  assert(
    preparedCaptureExamples > 0,
    "The registry needs a preparation-dependent capture witness",
  );
  assertEquals(
    preparationDependentCaptures,
    [],
    "Settled review must not inherit preparation-dependent capture regions",
  );
});

Deno.test("authored review posture composes canonical example, action, checkpoint, and capture vocabularies", () => {
  const postures = defineComponentReviewPostures(
    meta,
    vocabulary,
    [{
      id: "pressed",
      label: "Pressed",
      example: "default",
      category: "interaction",
      sequence: [
        { action: "pointer-down", target: { role: "button", name: "Run" } },
        { checkpoint: { id: "contact", label: "Pointer contact" } },
        { action: "pointer-up", target: { role: "button", name: "Run" } },
      ],
      requirements: {
        inlineSize: "narrow",
        theme: "dark",
        reducedMotion: false,
        appearance: "violet",
      },
      capture: { selectors: [".discern-future-sampler"] },
    }] as const,
  );
  const resolved = resolveComponentReviewPostures(
    meta,
    vocabulary,
    examples,
    postures,
  );
  assertEquals(resolved.at(-1)?.id, "pressed");
  assertEquals(resolved.at(-1)?.checkpoints.map(({ id }) => id), ["contact"]);
  assertEquals(resolved.at(-1)?.requirements?.appearance, "violet");
});

Deno.test("malformed review postures fail closed with Component identity", () => {
  const define = (
    postures: Parameters<typeof defineComponentReviewPostures>[2],
  ) => defineComponentReviewPostures(meta, vocabulary, postures);
  for (
    const [postures, message] of [
      [[
        {
          id: "same",
          label: "One",
          example: "default",
          category: "interaction",
          sequence: [{ checkpoint: { id: "one", label: "One" } }],
        },
        {
          id: "same",
          label: "Two",
          example: "expanded",
          category: "interaction",
          sequence: [{ checkpoint: { id: "two", label: "Two" } }],
        },
      ], "repeats posture"],
      [[{
        id: "missing-example",
        label: "Missing example",
        example: "invented",
        category: "interaction",
        sequence: [{ checkpoint: { id: "missing", label: "Missing" } }],
      }], "declared Web example"],
      [[{
        id: "empty-checkpoints",
        label: "Empty checkpoints",
        example: "default",
        category: "interaction",
        sequence: [{ action: "focus", target: { role: "button" } }],
      }], "named checkpoint"],
      [[{
        id: "duplicate-checkpoint",
        label: "Duplicate checkpoint",
        example: "default",
        category: "interaction",
        sequence: [
          { checkpoint: { id: "same", label: "First" } },
          { checkpoint: { id: "same", label: "Second" } },
        ],
      }], "repeats checkpoint"],
      [[{
        id: "terminal-navigation",
        label: "Terminal navigation",
        example: "default",
        category: "interaction",
        sequence: [
          {
            action: "click",
            target: { role: "link", name: "Leave" },
            terminal: "navigation",
          },
          { checkpoint: { id: "after", label: "After" } },
        ],
      }], "after terminal navigation"],
      [[{
        id: "unsafe-appearance",
        label: "Unsafe Appearance",
        example: "default",
        category: "appearance",
        sequence: [{ checkpoint: { id: "unsafe", label: "Unsafe" } }],
        requirements: { appearance: "future-green" },
      }], "Appearance option"],
      [[{
        id: "duplicate-preparation",
        label: "Duplicate preparation",
        example: "default",
        category: "interaction",
        sequence: [{
          checkpoint: { id: "prepared", label: "Prepared" },
        }],
        capture: {
          prepare: [{ action: "focus", selector: "[data-reveal]" }],
          selectors: ["[data-latent-region]"],
        },
      }], "capture preparation belongs in its review sequence"],
    ] as const
  ) {
    const error = assertThrows(() => define(postures as never), TypeError);
    assertStringIncludes(error.message, "future-sampler");
    assertStringIncludes(error.message, message);
  }
});

Deno.test("missing review targets fail with posture and Component identity", () => {
  const target: ConformanceTarget = { role: "button", name: "Never rendered" };
  const postures = defineComponentReviewPostures(
    meta,
    vocabulary,
    [{
      id: "missing-target",
      label: "Missing target",
      example: "default",
      category: "interaction",
      sequence: [
        { action: "focus", target },
        { checkpoint: { id: "focused", label: "Focused" } },
      ],
    }] as const,
  );
  const error = assertThrows(
    () => validateReviewPostureTargets(meta, postures[0]!, () => false),
    TypeError,
  );
  assertStringIncludes(error.message, "future-sampler/missing-target");
  assertStringIncludes(error.message, "Never rendered");
});
