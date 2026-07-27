import { forwardRef } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** File or directory kind represented by one {@linkcode ArtifactTreeNode}. */
export type ArtifactTreeNodeKind = "file" | "directory";

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
          {node.kind === "directory" ? "▱" : "⌑"}
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
