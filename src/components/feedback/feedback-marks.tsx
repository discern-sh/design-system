/**
 * Stroke-matched marks for feedback tones and dismissal.
 *
 * Every mark is drawn on one 16-unit grid at a 1.5 stroke, so a notice's tone
 * mark and its dismiss control share one weight whatever the fallback font.
 * Shape carries the tone without colour: a circle for information and
 * success, a spark for accent, a triangle for warning and an octagon for
 * danger. Only dismissal draws a cross.
 *
 * @module
 */

import type { ReactElement } from "react";
import type { BannerTone } from "./banner/banner.types.ts";

/** A drawn feedback mark: one per notice tone, plus dismissal. */
export type FeedbackMarkName = BannerTone | "dismiss";

const dot = (cy: number) => (
  <circle cx="8" cy={cy} r="0.9" fill="currentColor" stroke="none" />
);

const drawings: Readonly<Record<FeedbackMarkName, ReactElement>> = {
  neutral: (
    <>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 7.25v4" />
      {dot(4.9)}
    </>
  ),
  accent: (
    <path d="M8 1.5C8.4 5.2 10.8 7.6 14.5 8 10.8 8.4 8.4 10.8 8 14.5 7.6 10.8 5.2 8.4 1.5 8 5.2 7.6 7.6 5.2 8 1.5Z" />
  ),
  success: (
    <>
      <circle cx="8" cy="8" r="6.25" />
      <path d="m5.25 8.25 1.9 1.85 3.6-3.85" />
    </>
  ),
  warning: (
    <>
      <path d="M8 1.75 14.75 13.75H1.25Z" />
      <path d="M8 6.25v3.25" />
      {dot(11.6)}
    </>
  ),
  danger: (
    <>
      <path d="M5.47 1.9h5.06l3.57 3.57v5.06l-3.57 3.57H5.47L1.9 10.53V5.47Z" />
      <path d="M8 4.75V8.5" />
      {dot(11)}
    </>
  ),
  dismiss: <path d="m3.75 3.75 8.5 8.5m0-8.5-8.5 8.5" />,
};

/** Decorative feedback mark; its labelled or hidden wrapper owns size and name. */
export function FeedbackMark(
  { name }: { readonly name: FeedbackMarkName },
): ReactElement {
  return (
    <svg
      viewBox="0 0 16 16"
      width="100%"
      height="100%"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      aria-hidden="true"
    >
      {drawings[name]}
    </svg>
  );
}
