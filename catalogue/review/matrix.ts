import type {
  ResolvedComponentReviewPosture,
  ReviewInlineSize,
  ReviewStateCategory,
} from "../review-postures.ts";
import { defaultCatalogueAppearanceOption } from "../shell/appearance-options.ts";

export interface ComponentReviewSource {
  readonly group: string;
  readonly slug: string;
  readonly examples: readonly string[];
  readonly postures: readonly ResolvedComponentReviewPosture[];
}

export interface PlannedComponentReviewItem {
  readonly id: string;
  readonly group: string;
  readonly component: string;
  readonly example: string;
  readonly posture: string;
  readonly checkpoint: string;
  readonly category: ReviewStateCategory;
  readonly width: ReviewInlineSize | number;
  readonly theme: "light" | "dark";
  readonly appearance: string;
  readonly motion: "ordinary" | "reduced";
}

const baselineAxes = [
  { width: "medium", theme: "light" },
  { width: "medium", theme: "dark" },
  { width: "narrow", theme: "light" },
  { width: "wide", theme: "light" },
] as const;

export function selectComponentReviewSources<
  const Sources extends readonly ComponentReviewSource[],
>(
  sources: Sources,
  filters: { readonly group?: string; readonly component?: string },
): readonly Sources[number][] {
  if (filters.component !== undefined) {
    return sources.filter(({ slug }) => slug === filters.component);
  }
  if (filters.group !== undefined) {
    return sources.filter(({ group }) => group === filters.group);
  }
  return [...sources];
}

function item(
  source: ComponentReviewSource,
  posture: ResolvedComponentReviewPosture,
  checkpoint: string,
  axis: {
    readonly width: ReviewInlineSize | number;
    readonly theme: "light" | "dark";
    readonly appearance: string;
    readonly motion: "ordinary" | "reduced";
  },
): PlannedComponentReviewItem {
  const id = [
    source.slug,
    posture.example,
    posture.id,
    checkpoint,
    axis.width,
    axis.theme,
    axis.appearance,
    axis.motion,
  ].join("--");
  return {
    id,
    group: source.group,
    component: source.slug,
    example: posture.example,
    posture: posture.id,
    checkpoint,
    category: posture.category,
    ...axis,
  };
}

/** Four baseline witnesses per canonical example; extras add only authored axes. */
export function planComponentReviewMatrix(
  sources: readonly ComponentReviewSource[],
): readonly PlannedComponentReviewItem[] {
  return sources.flatMap((source) =>
    source.postures.flatMap((posture) => {
      if (posture.unavailableReason !== undefined) return [];
      const checkpoints = posture.checkpoints.map(({ id }) => id);
      if (posture.category === "default") {
        return baselineAxes.flatMap((axis) =>
          checkpoints.map((checkpoint) =>
            item(source, posture, checkpoint, {
              ...axis,
              appearance: defaultCatalogueAppearanceOption.id,
              motion: "ordinary",
            })
          )
        );
      }
      const requirements = posture.requirements;
      return checkpoints.map((checkpoint) =>
        item(source, posture, checkpoint, {
          width: requirements?.inlineSize ?? "medium",
          theme: requirements?.theme ?? "light",
          appearance: requirements?.appearance ??
            defaultCatalogueAppearanceOption.id,
          motion: requirements?.reducedMotion ? "reduced" : "ordinary",
        })
      );
    })
  );
}

/** Ephemeral manifest bytes contain facts only: no clocks or machine paths. */
export function serializeComponentReviewManifest(
  items: readonly PlannedComponentReviewItem[],
): string {
  return `${JSON.stringify({ version: 1, items }, null, 2)}\n`;
}
