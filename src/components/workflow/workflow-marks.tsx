/**
 * Browser marks for Workflow states and copy controls.
 *
 * A Workflow state that is a feedback tone wears the Feedback mark of that
 * tone, so a failed check, a Banner and a Field error share one octagon. The
 * lifecycle states that are not tones (active, waiting, idle) are drawn here
 * on the same 16-unit grid at the same 1.5 stroke, as one circle family with
 * the success and information marks. Terminal renderers keep their own glyph
 * tables; these marks are web-only.
 *
 * @module
 */

import type { ReactElement } from "react";
import { getGlyph } from "../../glyphs/mod.ts";
import {
  FeedbackMark,
  type FeedbackMarkName,
} from "../feedback/feedback-marks.tsx";

/** A Workflow state mark, named by meaning. */
export type WorkflowMarkName =
  | "done"
  | "attention"
  | "failed"
  | "note"
  | "active"
  | "waiting"
  | "idle";

const ring = <circle cx="8" cy="8" r="6.25" />;

const marks: Readonly<
  Record<WorkflowMarkName, FeedbackMarkName | ReactElement>
> = {
  done: "success",
  attention: "warning",
  failed: "danger",
  note: "neutral",
  active: (
    <>
      {ring}
      <circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none" />
    </>
  ),
  waiting: (
    <>
      {ring}
      <path d="M8 4.75V8l2.25 1.5" />
    </>
  ),
  idle: ring,
};

/** Decorative state mark; its hidden or labelled wrapper owns size and name. */
export function WorkflowMark(
  { name }: { readonly name: WorkflowMarkName },
): ReactElement {
  const mark = marks[name];
  if (typeof mark === "string") return <FeedbackMark name={mark} />;
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
      {mark}
    </svg>
  );
}

/** The copy and copied glyphs every Workflow copy control leads with. */
export const WORKFLOW_COPY_ICONS = {
  icon: getGlyph("copy").unicode,
  copiedIcon: getGlyph("status-complete").unicode,
} as const;
