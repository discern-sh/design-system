import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { Command } from "../command/command.tsx";
import type { CommandProps } from "../command/command.tsx";

/** One labelled command alternative rendered by {@linkcode CommandGroup}. */
export type CommandGroupItem = Readonly<
  Pick<
    CommandProps,
    | "command"
    | "workingDirectory"
    | "explanation"
    | "expectedResult"
    | "expectedResultLabel"
    | "expectedResultVariant"
    | "failureNote"
    | "platform"
    | "copyLabel"
    | "copiedLabel"
  > & {
    readonly label: ReactNode;
  }
>;

/** Props for the {@linkcode CommandGroup} component. */
export interface CommandGroupProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  readonly title?: ReactNode;
  readonly items: readonly CommandGroupItem[];
}

/** Stacked, clearly labelled command alternatives that remain complete in static HTML. */
export const CommandGroup: DiscernComponent<
  HTMLDivElement,
  CommandGroupProps
> = forwardRef<HTMLDivElement, CommandGroupProps>(function CommandGroup(
  {
    title,
    items,
    className,
    "aria-label": ariaLabel,
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={classNames("discern-command-group", className)}
      role="group"
      aria-label={ariaLabel ??
        (typeof title === "string" ? title : undefined)}
      {...props}
    >
      {title !== undefined
        ? <div className="discern-command-group__title">{title}</div>
        : null}
      <ol className="discern-command-group__list">
        {items.map(({ label, ...command }, index) => (
          <li className="discern-command-group__item" key={index}>
            <div className="discern-command-group__label">{label}</div>
            <Command {...command} />
          </li>
        ))}
      </ol>
    </div>
  );
});
