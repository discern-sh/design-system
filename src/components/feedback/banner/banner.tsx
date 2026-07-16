import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Tone options for the Banner component. */
export type BannerTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger";
/** Props for the {@linkcode Banner} component. */
export interface BannerProps extends HTMLAttributes<HTMLDivElement> {
  readonly tone?: BannerTone;
  readonly icon?: ReactNode;
  readonly children: ReactNode;
}
/** Inline semantic message with neutral, accent, success, warning, and danger tones. */
export const Banner: DiscernComponent<HTMLDivElement, BannerProps> = forwardRef<
  HTMLDivElement,
  BannerProps
>(function Banner(
  { tone = "neutral", icon, children, className, role, ...props },
  ref,
) {
  const semanticRole = role ?? (tone === "danger" ? "alert" : "status");
  return (
    <div
      ref={ref}
      role={semanticRole}
      className={classNames(
        "discern-banner",
        `discern-banner--${tone}`,
        className,
      )}
      {...props}
    >
      {icon
        ? (
          <span className="discern-banner__icon" aria-hidden="true">
            {icon}
          </span>
        )
        : null}
      <div>{children}</div>
    </div>
  );
});
