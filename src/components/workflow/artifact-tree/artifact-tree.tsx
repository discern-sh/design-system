import { forwardRef } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type { ArtifactTreeNodeKind } from "./artifact-tree.types.ts";

export type { ArtifactTreeNodeKind } from "./artifact-tree.types.ts";

/** One file or directory in an {@linkcode ArtifactTree}. */
export interface ArtifactTreeNode {
  readonly name: string;
  readonly path?: string;
  readonly kind: ArtifactTreeNodeKind;
  readonly annotation?: ReactNode;
  readonly children?: readonly ArtifactTreeNode[];
}

/** Props for the {@linkcode ArtifactTree} component. */
export interface ArtifactTreeProps
  extends Omit<HTMLAttributes<HTMLUListElement>, "children"> {
  readonly nodes: readonly ArtifactTreeNode[];
  readonly label?: string;
}

function splitName(name: string): readonly [string, string] {
  if (name.length <= 24) return [name, ""];
  const suffixLength = Math.min(16, Math.ceil(name.length / 3));
  return [name.slice(0, -suffixLength), name.slice(-suffixLength)];
}

const kindOutlines: Readonly<Record<ArtifactTreeNodeKind, string>> = {
  directory:
    "M1.75 4.5c0-.7.55-1.25 1.25-1.25h3.1l1.5 1.5H13c.7 0 1.25.55 1.25 1.25v5.5c0 .7-.55 1.25-1.25 1.25H3c-.7 0-1.25-.55-1.25-1.25z",
  file:
    "M3.75 2.75c0-.55.45-1 1-1H9.5l2.75 2.75v8.75c0 .55-.45 1-1 1h-6.5c-.55 0-1-.45-1-1zM9.25 1.75V4.75h3",
};

function treeNode(node: ArtifactTreeNode, index: number): ReactElement {
  const fullPath = node.path ?? node.name;
  const [prefix, suffix] = splitName(node.name);
  return (
    <li
      className="discern-artifact-tree__node"
      data-discern-kind={node.kind}
      key={`${fullPath}-${index}`}
    >
      <div className="discern-artifact-tree__row">
        <span className="discern-artifact-tree__kind" aria-hidden="true">
          <svg viewBox="0 0 16 16" focusable="false">
            <path
              d={kindOutlines[node.kind]}
              fill="none"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth={1.25}
            />
          </svg>
        </span>
        <span className="discern-artifact-tree__name" title={fullPath}>
          <span className="discern-visually-hidden">
            {`${node.kind === "directory" ? "Directory" : "File"}: ${fullPath}`}
          </span>
          <span
            className="discern-artifact-tree__name-visual"
            aria-hidden="true"
          >
            <span className="discern-artifact-tree__name-prefix">
              {prefix}
            </span>
            {suffix
              ? (
                <span className="discern-artifact-tree__name-suffix">
                  {suffix}
                </span>
              )
              : null}
          </span>
        </span>
        {node.annotation !== undefined && node.annotation !== null
          ? (
            <div className="discern-artifact-tree__annotation">
              {node.annotation}
            </div>
          )
          : null}
      </div>
      {node.children !== undefined && node.children.length > 0
        ? nodeList(node.children)
        : null}
    </li>
  );
}

function nodeList(nodes: readonly ArtifactTreeNode[]): ReactElement {
  return (
    <ul className="discern-artifact-tree__list discern-artifact-tree__children">
      {nodes.map(treeNode)}
    </ul>
  );
}

/** Semantic project file tree with nested lists, middle-truncated names, and per-node annotations. */
export const ArtifactTree: DiscernComponent<
  HTMLUListElement,
  ArtifactTreeProps
> = forwardRef<HTMLUListElement, ArtifactTreeProps>(function ArtifactTree(
  { nodes, label, className, ...props },
  ref,
) {
  return (
    <ul
      ref={ref}
      className={classNames(
        "discern-artifact-tree",
        "discern-artifact-tree__list",
        className,
      )}
      {...(label !== undefined ? { "aria-label": label } : {})}
      {...props}
    >
      {nodes.map(treeNode)}
    </ul>
  );
});
