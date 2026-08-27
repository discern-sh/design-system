import { forwardRef } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type { LogoCloudVariant } from "./logo-cloud.types.ts";

export type { LogoCloudVariant } from "./logo-cloud.types.ts";

/** One item entry rendered by the Logo cloud component. */
export interface LogoCloudItem {
  readonly name: string;
  readonly mark?: ReactNode;
  /** Optional CSS image that replaces supplied image artwork with a neutral dark-Theme silhouette. */
  readonly markMask?: string;
}

/** Props for the {@linkcode LogoCloud} component. */
export interface LogoCloudProps extends HTMLAttributes<HTMLElement> {
  readonly label?: ReactNode;
  readonly items: readonly LogoCloudItem[];
  readonly align?: "start" | "center";
  /** Divided trust grid or the looser campaign-page provider strip. */
  readonly variant?: LogoCloudVariant;
}

/** Quiet trust band for customer, partner, integration, or publication marks without requiring image assets. */
export const LogoCloud: DiscernComponent<HTMLElement, LogoCloudProps> =
  forwardRef<HTMLElement, LogoCloudProps>(function LogoCloud(
    {
      label,
      items,
      align = "center",
      variant = "grid",
      className,
      ...props
    },
    ref,
  ) {
    return (
      <section
        ref={ref}
        className={classNames(
          "discern-logo-cloud",
          `discern-logo-cloud--${align}`,
          variant === "strip" && "discern-logo-cloud--strip",
          className,
        )}
        {...props}
      >
        {label ? <p className="discern-logo-cloud__label">{label}</p> : null}
        <ul className="discern-logo-cloud__list">
          {items.map((item) => (
            <li key={item.name}>
              {item.mark
                ? (
                  <span
                    className={classNames(
                      "discern-logo-cloud__mark",
                      item.markMask && "discern-logo-cloud__mark--masked",
                    )}
                    style={item.markMask
                      ? {
                        "--discern-logo-cloud-mark-mask": item.markMask,
                      } as CSSProperties
                      : undefined}
                    aria-hidden="true"
                  >
                    {item.mark}
                  </span>
                )
                : null}
              <span>{item.name}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  });
