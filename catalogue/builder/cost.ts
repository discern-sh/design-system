/**
 * Live composition cost: the dependency-closed component set a document ships
 * and the exact component CSS bytes the runtime emitter would emit for it,
 * read from the same generated facts the emitter resolves against.
 */
import { componentRegistry } from "../../src/generated/component-registry.ts";
import { packageManifest } from "../../src/manifest.ts";

/** What a composition costs a consumer that emits a runtime for it. */
export interface CompositionCost {
  /** Directly placed component ids, sorted. */
  readonly placed: readonly string[];
  /** The dependency closure in canonical registry order. */
  readonly resolved: readonly string[];
  /** Per-component CSS bytes across the closure, in canonical order. */
  readonly breakdown: readonly {
    readonly id: string;
    readonly cssBytes: number;
  }[];
  /** Component CSS bytes across the closure (base styles excluded). */
  readonly componentCssBytes: number;
  /** True when a resolved component opts into the emitted behavior script. */
  readonly needsBehaviorScript: boolean;
}

const encoder = new TextEncoder();
const cssBytesBySlug = new Map<string, number>(
  componentRegistry.map((entry) => [
    entry.meta.slug,
    encoder.encode(entry.css).byteLength,
  ]),
);
const manifestById = new Map(
  packageManifest.components.map((component) => [component.id, component]),
);
const canonicalOrder = new Map(
  packageManifest.components.map((component, index) => [component.id, index]),
);

/** Resolve placed slugs to the emitter's dependency closure and byte cost. */
export function compositionCost(slugs: readonly string[]): CompositionCost {
  const resolved = new Set<string>();
  const visit = (id: string): void => {
    if (resolved.has(id)) return;
    const component = manifestById.get(id);
    if (component === undefined) {
      throw new Error(`Unknown component id "${id}".`);
    }
    resolved.add(id);
    for (const dependency of component.dependencies) visit(dependency);
  };
  for (const slug of slugs) visit(slug);

  const ordered = [...resolved].sort(
    (a, b) => (canonicalOrder.get(a) ?? 0) - (canonicalOrder.get(b) ?? 0),
  );
  const breakdown = ordered.map((id) => ({
    id,
    cssBytes: cssBytesBySlug.get(id) ?? 0,
  }));
  return {
    placed: [...new Set(slugs)].sort((a, b) => a.localeCompare(b)),
    resolved: ordered,
    breakdown,
    componentCssBytes: breakdown.reduce(
      (total, entry) => total + entry.cssBytes,
      0,
    ),
    needsBehaviorScript: ordered.some(
      (id) => (manifestById.get(id)?.behaviors.length ?? 0) > 0,
    ),
  };
}
