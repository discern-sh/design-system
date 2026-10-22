import { Cluster } from "../../layout/cluster/cluster.tsx";
import { Stack } from "../../layout/stack/stack.tsx";
import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { FeedbackMark } from "../feedback-marks.tsx";
import type { BannerTone } from "./banner.types.ts";

export type { BannerTone } from "./banner.types.ts";
/** Props for the {@linkcode Banner} component. */
export interface BannerProps extends HTMLAttributes<HTMLDivElement> {
  readonly tone?: BannerTone;
  readonly icon?: ReactNode;
  /** Optional visible heading; the native title attribute remains available. */
  readonly heading?: ReactNode;
  /** Follow-up controls rendered after the message. */
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

/** Inline semantic message with neutral, accent, success, warning, and danger tones. */
export const Banner: DiscernComponent<HTMLDivElement, BannerProps> = forwardRef<
  HTMLDivElement,
  BannerProps
>(function Banner(
  {
    tone = "neutral",
    icon,
    heading,
    actions,
    children,
    className,
    role,
    ...props
  },
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
        {icon ?? <FeedbackMark name={tone} />}
      </span>
      <Stack gap={3} className="discern-banner__content">
        <Stack gap={1}>
          {heading !== undefined && (
            <h3 className="discern-banner__heading">{heading}</h3>
          )}
          <Stack className="discern-banner__body">{children}</Stack>
        </Stack>
        {actions !== undefined && <Cluster>{actions}</Cluster>}
      </Stack>
    </div>
  );
});
