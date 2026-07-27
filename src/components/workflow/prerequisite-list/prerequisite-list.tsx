import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Verification state for one {@linkcode PrerequisiteItem}. */
export type PrerequisiteState = "satisfied" | "unresolved";

/** One requirement rendered by {@linkcode PrerequisiteList}. */
export interface PrerequisiteItem {
  readonly requirement: ReactNode;
  readonly state: PrerequisiteState;
  readonly detail?: ReactNode;
}

/** Props for the {@linkcode PrerequisiteList} component. */
export interface PrerequisiteListProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  readonly title?: ReactNode;
  readonly items: readonly PrerequisiteItem[];
}

const stateLabels: Readonly<Record<PrerequisiteState, string>> = {
  satisfied: "Satisfied",
  unresolved: "Unresolved",
};

const stateMarkers: Readonly<Record<PrerequisiteState, string>> = {
  satisfied: "✓",
  unresolved: "!",
};

/** Requirements checked before a procedure begins, with every state carried in visible text and shape. */
export const PrerequisiteList: DiscernComponent<
  HTMLDivElement,
  PrerequisiteListProps
> = forwardRef<HTMLDivElement, PrerequisiteListProps>(
  function PrerequisiteList(
    { title = "Before you start", items, className, ...props },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={classNames("discern-prerequisite-list", className)}
        {...props}
      >
        <div className="discern-prerequisite-list__title">{title}</div>
        <ul className="discern-prerequisite-list__items">
          {items.map((item, index) => (
            <li
              className="discern-prerequisite-list__item"
              data-discern-state={item.state}
              key={index}
            >
              <span
                className="discern-prerequisite-list__marker"
                aria-hidden="true"
              >
                {stateMarkers[item.state]}
              </span>
              <span className="discern-prerequisite-list__body">
                <span className="discern-prerequisite-list__requirement">
                  {item.requirement}
                </span>
                {item.detail !== undefined
                  ? (
                    <span className="discern-prerequisite-list__detail">
                      {item.detail}
                    </span>
                  )
                  : null}
              </span>
              <span className="discern-prerequisite-list__state">
                {stateLabels[item.state]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  },
);
