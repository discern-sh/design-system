import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type { ArtifactOwnership } from "../ownership-badge/ownership-badge.tsx";
import { OwnershipBadge } from "../ownership-badge/ownership-badge.tsx";
import { PathReference } from "../path-reference/path-reference.tsx";

/** Props for the {@linkcode ArtifactCard} component. */
export interface ArtifactCardProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly name: ReactNode;
  readonly path: string;
  readonly summary: ReactNode;
  readonly ownership: ArtifactOwnership;
  readonly provenance: ReactNode;
  readonly sourceLink?: ReactNode;
}

/** Whole created or modified artifact with path, ownership, provenance, and source context. */
export const ArtifactCard: DiscernComponent<HTMLElement, ArtifactCardProps> =
  forwardRef<HTMLElement, ArtifactCardProps>(function ArtifactCard(
    {
      name,
      path,
      summary,
      ownership,
      provenance,
      sourceLink,
      className,
      ...props
    },
    ref,
  ) {
    return (
      <article
        ref={ref}
        className={classNames("discern-artifact-card", className)}
        {...props}
      >
        <header className="discern-artifact-card__header">
          <h3>{name}</h3>
          <PathReference path={path} />
        </header>
        <div className="discern-artifact-card__summary">{summary}</div>
        <dl className="discern-artifact-card__meta">
          <div>
            <dt>Ownership</dt>
            <dd>
              <OwnershipBadge ownership={ownership} />
            </dd>
          </div>
          <div>
            <dt>Provenance</dt>
            <dd>{provenance}</dd>
          </div>
          {sourceLink !== undefined && sourceLink !== null
            ? (
              <div>
                <dt>Source</dt>
                <dd>{sourceLink}</dd>
              </div>
            )
            : null}
        </dl>
      </article>
    );
  });
