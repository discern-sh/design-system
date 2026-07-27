import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { CopyButton } from "../../docs/copy-button/copy-button.tsx";

/** Props for the {@linkcode PathReference} component. */
export interface PathReferenceProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  readonly path: string;
  readonly copyable?: boolean;
  readonly copyLabel?: ReactNode;
  readonly copiedLabel?: ReactNode;
}

function splitPath(path: string): readonly [string, string] {
  const trailingSeparator = /[\\/]$/.test(path);
  const searchFrom = trailingSeparator ? path.length - 2 : path.length - 1;
  const separator = Math.max(
    path.lastIndexOf("/", searchFrom),
    path.lastIndexOf("\\", searchFrom),
  );
  return separator < 0
    ? ["", path]
    : [path.slice(0, separator + 1), path.slice(separator + 1)];
}

/** Inline file or directory path that preserves both its rootward context and terminal segment under truncation. */
export const PathReference: DiscernComponent<
  HTMLSpanElement,
  PathReferenceProps
> = forwardRef<HTMLSpanElement, PathReferenceProps>(function PathReference(
  {
    path,
    copyable = false,
    copyLabel = "Copy path",
    copiedLabel = "Path copied",
    className,
    ...props
  },
  ref,
) {
  const [prefix, suffix] = splitPath(path);
  return (
    <span
      ref={ref}
      className={classNames("discern-path-reference", className)}
      {...props}
    >
      <code
        className="discern-path-reference__path"
        title={path}
      >
        <span className="discern-visually-hidden">{path}</span>
        {prefix
          ? (
            <span className="discern-path-reference__prefix" aria-hidden="true">
              {prefix}
            </span>
          )
          : null}
        <span className="discern-path-reference__suffix" aria-hidden="true">
          {suffix}
        </span>
      </code>
      {copyable
        ? (
          <CopyButton
            className="discern-path-reference__copy"
            value={path}
            label={copyLabel}
            copiedLabel={copiedLabel}
          />
        )
        : null}
    </span>
  );
});
