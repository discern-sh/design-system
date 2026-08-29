import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { Diffstat } from "../../display/diffstat/diffstat.tsx";
import { PathReference } from "../path-reference/path-reference.tsx";
import type {
  FileChangeMagnitude,
  FileDisposition,
} from "./file-change.types.ts";

export { fileDispositions } from "./file-change.types.ts";
export type {
  FileChangeMagnitude,
  FileDisposition,
} from "./file-change.types.ts";

/** Props for the {@linkcode FileChange} component. */
export interface FileChangeProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  readonly path: string;
  readonly disposition: FileDisposition;
  readonly magnitude?: FileChangeMagnitude;
}

const dispositionLabels: Record<FileDisposition, string> = {
  added: "Added",
  updated: "Updated",
  generated: "Generated",
  removed: "Removed",
  unchanged: "Unchanged",
};

const dispositionMarkers: Record<FileDisposition, string> = {
  added: "+",
  updated: "~",
  generated: "◇",
  removed: "−",
  unchanged: "=",
};

/** One file's textual disposition, path, and optional change magnitude. */
export const FileChange: DiscernComponent<HTMLDivElement, FileChangeProps> =
  forwardRef<HTMLDivElement, FileChangeProps>(function FileChange(
    { path, disposition, magnitude, className, ...props },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={classNames("discern-file-change", className)}
        data-discern-disposition={disposition}
        {...props}
      >
        <div className="discern-file-change__layout">
          <span className="discern-file-change__state">
            <span className="discern-file-change__marker" aria-hidden="true">
              {dispositionMarkers[disposition]}
            </span>
            {dispositionLabels[disposition]}
          </span>
          <span className="discern-file-change__path">
            <PathReference path={path} />
          </span>
          {magnitude
            ? (
              <span className="discern-file-change__magnitude">
                <Diffstat
                  added={magnitude.added}
                  removed={magnitude.removed}
                />
              </span>
            )
            : null}
        </div>
      </div>
    );
  });
