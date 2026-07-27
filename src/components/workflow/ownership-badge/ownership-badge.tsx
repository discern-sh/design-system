import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { Badge } from "../../display/badge/badge.tsx";

/** Canonical ownership relationships the {@linkcode OwnershipBadge} component names. */
export const artifactOwnerships = [
  "authored",
  "generated",
  "project-owned",
  "tool-owned",
] as const;

/** One canonical ownership relationship. */
export type ArtifactOwnership = (typeof artifactOwnerships)[number];

/** Props for the {@linkcode OwnershipBadge} component. */
export interface OwnershipBadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  readonly ownership: ArtifactOwnership;
}

const ownershipLabels: Record<ArtifactOwnership, string> = {
  authored: "Authored",
  generated: "Generated",
  "project-owned": "Project-owned",
  "tool-owned": "Tool-owned",
};

/** Inline ownership label that always names the relationship in text. */
export const OwnershipBadge: DiscernComponent<
  HTMLSpanElement,
  OwnershipBadgeProps
> = forwardRef<HTMLSpanElement, OwnershipBadgeProps>(function OwnershipBadge(
  { ownership, className, ...props },
  ref,
) {
  return (
    <Badge
      ref={ref}
      tone="neutral"
      className={classNames("discern-ownership-badge", className)}
      data-discern-ownership={ownership}
      {...props}
    >
      {ownershipLabels[ownership]}
    </Badge>
  );
});
