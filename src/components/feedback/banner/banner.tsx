import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type { BannerTone } from "./banner.types.ts";

export type { BannerTone } from "./banner.types.ts";
/** Props for the {@linkcode Banner} component. */
export interface BannerProps extends HTMLAttributes<HTMLDivElement> {
  readonly tone?: BannerTone;
  readonly icon?: ReactNode;
  readonly children: ReactNode;
}

const toneGlyphs: Readonly<Record<BannerTone, string>> = {
  neutral: "i",
  accent: "✦",
  success: "✓",
  warning: "!",
  danger: "×",
};

/** Inline semantic message with neutral, accent, success, warning, and danger tones. */
export const Banner: DiscernComponent<HTMLDivElement, BannerProps> = forwardRef<
  HTMLDivElement,
  BannerProps
>(function Banner(
  { tone = "neutral", icon, children, className, role, ...props },
  ref,
) {
  const semanticRole = role ?? (tone === "danger" ? "alert" : "status");
  const toneLabel = tone[0]?.toLocaleUpperCase() + tone.slice(1);
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
      data-discern-tone={tone}
    >
      <span
        className="discern-banner__icon"
        role="img"
        aria-label={toneLabel}
      >
        {icon ?? toneGlyphs[tone]}
      </span>
      <div>{children}</div>
    </div>
  );
});
