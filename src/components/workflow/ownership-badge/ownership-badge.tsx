import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { Badge } from "../../display/badge/badge.tsx";
import type { ArtifactOwnership } from "./ownership-badge.types.ts";

export { artifactOwnerships } from "./ownership-badge.types.ts";
export type { ArtifactOwnership } from "./ownership-badge.types.ts";

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
