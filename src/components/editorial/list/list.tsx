import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type { ListKind, ListSpacing } from "./list.types.ts";

export type { ListKind, ListSpacing } from "./list.types.ts";

/** One semantic item rendered by {@linkcode List}. */
export interface ListItem {
  /** Rich phrasing content that opens the item. */
  readonly content?: ReactNode;
  /** Read-only task state; omit for an ordinary item inside a task list. */
  readonly checked?: boolean;
  /** Continuation paragraphs, nested lists, or other structural blocks. */
  readonly blocks?: readonly ReactNode[];
}

/** Props for the {@linkcode List} component. */
export interface ListProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Semantic list form; defaults to unordered. */
  readonly kind?: ListKind;
  /** First ordinal for an ordered list. */
  readonly start?: number;
  /** Semantic items in document order. */
  readonly items: readonly ListItem[];
  /** Vertical rhythm between items and their continuation blocks. */
  readonly spacing?: ListSpacing;
}

function listItems(items: readonly ListItem[], kind: ListKind) {
  return items.map((item, index) => {
    const task = item.checked !== undefined;
    return (
      <li
        className={classNames(
          "discern-list__item",
          task && kind === "task" && "discern-list__item--task",
        )}
        key={index}
      >
        <span className="discern-list__content">
          {task
            ? (
              <input
                className="discern-list__task-marker"
                type="checkbox"
                checked={item.checked}
                disabled
                readOnly
                aria-label={item.checked ? "Completed" : "Not completed"}
              />
            )
            : null}
          {item.content !== undefined ? <span>{item.content}</span> : null}
        </span>
        {item.blocks !== undefined && item.blocks.length > 0
          ? (
            <div className="discern-list__blocks">
              {item.blocks.map((block, blockIndex) => (
                <div className="discern-list__block" key={blockIndex}>
                  {block}
                </div>
              ))}
            </div>
          )
          : null}
      </li>
    );
  });
}

/** Neutral unordered, ordered, or read-only task list with structural items. */
export const List: DiscernComponent<
  HTMLUListElement | HTMLOListElement,
  ListProps
> = forwardRef<
  HTMLUListElement | HTMLOListElement,
  ListProps
>(function List(
  {
    kind = "unordered",
    start,
    items,
    spacing = "tight",
    className,
    ...props
  },
  ref,
) {
  const classes = classNames(
    "discern-list",
    `discern-list--${kind}`,
    items.some((item) => item.checked !== undefined) &&
      "discern-list--contains-tasks",
    `discern-list--${spacing}`,
    className,
  );
  const children = listItems(items, kind);
  const listRef = (node: HTMLUListElement | HTMLOListElement | null) => {
    if (typeof ref === "function") ref(node);
    else if (ref !== null) ref.current = node;
  };

  return kind === "ordered"
    ? (
      <ol ref={listRef} className={classes} start={start} {...props}>
        {children}
      </ol>
    )
    : (
      <ul ref={listRef} className={classes} {...props}>
        {children}
      </ul>
    );
});
