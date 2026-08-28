import {
  type ComponentBehavior,
  componentBehaviors,
} from "../types/component-meta.ts";

/** Derive selected browser behaviors from any resolved Component population. */
export function selectedComponentBehaviors(
  entries: readonly { readonly behaviors: readonly ComponentBehavior[] }[],
): ComponentBehavior[] {
  return componentBehaviors.filter((behavior) =>
    entries.some((entry) => entry.behaviors.includes(behavior))
  );
}
