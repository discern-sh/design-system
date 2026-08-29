/** Source-backed, Catalogue-private visual review postures. */
import type { ComponentExampleDefinition } from "../src/types/component-examples.ts";
import { componentExamplesForSurface } from "../src/types/component-examples.ts";
import type { ComponentMeta } from "../src/types/component-meta.ts";
import type { ConformanceStep, ConformanceTarget } from "./conformance.ts";
import type { ComponentExampleCaptureDirective } from "./example-images/contract.ts";
import { validateComponentExampleCaptureDirective } from "./example-images/contract.ts";
import { catalogueAppearanceOption } from "./shell/appearance-options.ts";

/** Review actions own preparation; capture metadata names only visible regions. */
export type ComponentReviewCaptureDirective = Pick<
  ComponentExampleCaptureDirective,
  "selectors"
>;

/** Deliberately small categories used by stable review filtering. */
export const reviewStateCategories = [
  "default",
  "interaction",
  "validation",
  "motion",
  "responsive",
  "appearance",
] as const;
export type ReviewStateCategory = (typeof reviewStateCategories)[number];

export const reviewInlineSizes = Object.freeze(
  {
    narrow: 390,
    medium: 720,
    wide: 1120,
  } as const,
);
export type ReviewInlineSize = keyof typeof reviewInlineSizes;

export interface ReviewCheckpoint {
  readonly id: string;
  readonly label: string;
}

export type ReviewSequenceEntry =
  | ConformanceStep
  | { readonly checkpoint: ReviewCheckpoint };

export interface ReviewPostureRequirements {
  readonly inlineSize?: ReviewInlineSize | number;
  readonly viewport?: { readonly width: number; readonly height: number };
  readonly theme?: "light" | "dark";
  readonly reducedMotion?: boolean;
  readonly appearance?: string;
}

/** One meaningful Web posture authored beside its canonical example. */
export interface ComponentReviewPosture<ExampleId extends string = string> {
  readonly id: string;
  readonly label: string;
  readonly example: ExampleId;
  readonly category: ReviewStateCategory;
  readonly sequence: readonly ReviewSequenceEntry[];
  readonly requirements?: ReviewPostureRequirements;
  /** Projects visible regions from the Catalogue 3A capture authority. */
  readonly capture?: ComponentReviewCaptureDirective;
  /** Why an apparently relevant posture cannot be rendered truthfully. */
  readonly unavailableReason?: string;
}

export interface ResolvedComponentReviewPosture extends ComponentReviewPosture {
  readonly checkpoints: readonly ReviewCheckpoint[];
}

function isKebabCase(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function source(meta: ComponentMeta, posture: { readonly id: string }): string {
  return `${meta.slug}/${posture.id}`;
}

function targetsInStep(step: ConformanceStep): readonly ConformanceTarget[] {
  if ("action" in step) return step.target === undefined ? [] : [step.target];
  if (step.expect === "clipboard") return [];
  return step.expect === "describes"
    ? [step.target, step.description]
    : [step.target];
}

function validateTarget(target: ConformanceTarget, identity: string): void {
  const value = "selector" in target ? target.selector : target.role;
  if (value.trim() === "") {
    throw new TypeError(`${identity} contains an empty browser target`);
  }
  if (
    "name" in target && target.name !== undefined && target.name.trim() === ""
  ) {
    throw new TypeError(`${identity} contains an empty accessible name`);
  }
}

function validatePostures(
  meta: ComponentMeta,
  webIds: ReadonlySet<string>,
  postures: readonly ComponentReviewPosture[],
): void {
  const postureIds = new Set<string>();
  const checkpointIds = new Set<string>();
  for (const posture of postures) {
    const identity = source(meta, posture);
    if (!isKebabCase(posture.id)) {
      throw new TypeError(`${identity} posture id must be kebab-case`);
    }
    if (postureIds.has(posture.id)) {
      throw new TypeError(
        `${meta.slug} repeats posture ${JSON.stringify(posture.id)}`,
      );
    }
    postureIds.add(posture.id);
    if (posture.label.trim() === "") {
      throw new TypeError(`${identity} needs a label`);
    }
    if (!webIds.has(posture.example)) {
      throw new TypeError(
        `${identity} must name one declared Web example; received ${
          JSON.stringify(posture.example)
        }`,
      );
    }
    if (!reviewStateCategories.includes(posture.category)) {
      throw new TypeError(`${identity} has an unknown state category`);
    }
    const unavailable = posture.unavailableReason?.trim();
    if (unavailable !== undefined && unavailable.length < 32) {
      throw new TypeError(`${identity} needs a precise unavailable reason`);
    }
    if (unavailable !== undefined && posture.sequence.length > 0) {
      throw new TypeError(
        `${identity} cannot mix a sequence with an unavailable reason`,
      );
    }
    if (unavailable === undefined && posture.sequence.length === 0) {
      throw new TypeError(`${identity} needs a review sequence`);
    }
    let checkpointCount = 0;
    for (const [index, entry] of posture.sequence.entries()) {
      if ("checkpoint" in entry) {
        checkpointCount += 1;
        const checkpoint = entry.checkpoint;
        if (!isKebabCase(checkpoint.id) || checkpoint.label.trim() === "") {
          throw new TypeError(`${identity} has an invalid named checkpoint`);
        }
        if (checkpointIds.has(checkpoint.id)) {
          throw new TypeError(
            `${meta.slug} repeats checkpoint ${JSON.stringify(checkpoint.id)}`,
          );
        }
        checkpointIds.add(checkpoint.id);
        continue;
      }
      for (const target of targetsInStep(entry)) {
        validateTarget(target, identity);
      }
      if (
        "action" in entry && entry.action === "click" &&
        entry.terminal === "navigation" &&
        index !== posture.sequence.length - 1
      ) {
        throw new TypeError(
          `${identity} has an entry after terminal navigation`,
        );
      }
    }
    if (unavailable === undefined && checkpointCount === 0) {
      throw new TypeError(`${identity} needs at least one named checkpoint`);
    }
    const requirements = posture.requirements;
    if (requirements !== undefined) {
      const inlineSize = requirements.inlineSize;
      if (
        typeof inlineSize === "number" &&
        (!Number.isInteger(inlineSize) || inlineSize < 240 || inlineSize > 1600)
      ) throw new TypeError(`${identity} has an impossible local inline size`);
      const viewport = requirements.viewport;
      if (
        viewport !== undefined &&
        (!Number.isInteger(viewport.width) ||
          !Number.isInteger(viewport.height) ||
          viewport.width < 320 || viewport.height < 240)
      ) throw new TypeError(`${identity} has an impossible page viewport`);
      if (
        requirements.appearance !== undefined &&
        catalogueAppearanceOption(requirements.appearance) === undefined
      ) throw new TypeError(`${identity} names an unknown Appearance option`);
    }
    if (posture.capture !== undefined) {
      if ("prepare" in posture.capture) {
        throw new TypeError(
          `${identity} capture preparation belongs in its review sequence`,
        );
      }
      validateComponentExampleCaptureDirective(posture.capture, identity);
    }
  }
}

/** Validate authored additions immediately beside their example implementation. */
export function defineComponentReviewPostures<
  const Vocabulary extends readonly ComponentExampleDefinition[],
  const Postures extends readonly ComponentReviewPosture[],
>(
  meta: ComponentMeta,
  vocabulary: Vocabulary,
  postures: Postures,
): Postures {
  validatePostures(
    meta,
    new Set(
      componentExamplesForSurface(meta, vocabulary, "web").map(({ id }) => id),
    ),
    postures,
  );
  return postures;
}

function visibleReviewCapture(
  capture: ComponentExampleCaptureDirective | undefined,
): ComponentReviewCaptureDirective | undefined {
  return capture === undefined ? undefined : { selectors: capture.selectors };
}

function settledReviewCapture(
  capture: ComponentExampleCaptureDirective | undefined,
): ComponentReviewCaptureDirective | undefined {
  return (capture?.prepare?.length ?? 0) > 0
    ? undefined
    : visibleReviewCapture(capture);
}

/** Derive settled defaults for all Web examples, then append authored meaning. */
export function resolveComponentReviewPostures(
  meta: ComponentMeta,
  vocabulary: readonly ComponentExampleDefinition[],
  examples: readonly {
    readonly id: string;
    readonly capture?: ComponentExampleCaptureDirective;
  }[],
  authored: readonly ComponentReviewPosture[],
): readonly ResolvedComponentReviewPosture[] {
  const web = componentExamplesForSurface(meta, vocabulary, "web");
  const webIds = new Set(web.map(({ id }) => id));
  validatePostures(meta, webIds, authored);
  const exampleById = new Map(examples.map((example) => [example.id, example]));
  const defaults: ResolvedComponentReviewPosture[] = web.map((definition) => {
    const implementation = exampleById.get(definition.id);
    if (implementation === undefined) {
      throw new TypeError(
        `${meta.slug} review default lacks Web example ${definition.id}`,
      );
    }
    const checkpoint = { id: `settled-${definition.id}`, label: "Settled" };
    const capture = settledReviewCapture(implementation.capture);
    return {
      id: `settled-${definition.id}`,
      label: `${definition.label} settled`,
      example: definition.id,
      category: "default",
      sequence: [{ checkpoint }],
      checkpoints: [checkpoint],
      ...(capture === undefined ? {} : { capture }),
    };
  });
  const allIds = new Set(defaults.map(({ id }) => id));
  return [
    ...defaults,
    ...authored.map((posture): ResolvedComponentReviewPosture => {
      if (allIds.has(posture.id)) {
        throw new TypeError(
          `${meta.slug} repeats posture ${JSON.stringify(posture.id)}`,
        );
      }
      allIds.add(posture.id);
      const { capture, ...rest } = posture;
      const resolvedCapture = capture ??
        visibleReviewCapture(exampleById.get(posture.example)?.capture);
      return {
        ...rest,
        checkpoints: posture.sequence.flatMap((entry) =>
          "checkpoint" in entry ? [entry.checkpoint] : []
        ),
        ...(resolvedCapture === undefined ? {} : { capture: resolvedCapture }),
      };
    }),
  ];
}

/** Browser-time guard that every declared action/assertion target is real. */
export function validateReviewPostureTargets(
  meta: ComponentMeta,
  posture: ComponentReviewPosture,
  hasTarget: (target: ConformanceTarget) => boolean,
): void {
  for (const entry of posture.sequence) {
    if ("checkpoint" in entry) continue;
    for (const target of targetsInStep(entry)) {
      if (!hasTarget(target)) {
        throw new TypeError(
          `${source(meta, posture)} cannot resolve target ${
            JSON.stringify(target)
          }`,
        );
      }
    }
  }
}
