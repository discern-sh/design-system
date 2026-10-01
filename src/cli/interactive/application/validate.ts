/**
 * The view rules as data. Every issue is a caller error: the runtime refuses
 * a view with issues before it reaches the screen.
 *
 * @module
 */

import { decodableChord } from "./keymap.ts";
import { type LayerBindings, layerRules } from "./layer-validate.ts";
import {
  blocks,
  count,
  hints,
  type Issues,
  list,
  runs,
  type TerminalApplicationViewIssue,
  text,
  tone,
} from "./validate-rules.ts";
import type { SplitRules, TerminalApplicationView } from "./view.ts";

export type { TerminalApplicationViewIssue } from "./validate-rules.ts";

/** Facts from the running application that a new view must respect. */
export interface TerminalApplicationViewContext {
  /** Message ids the application reported dismissed; the view must omit them. */
  readonly dismissedMessages?: readonly string[];
  /** Layer ids the application reported dismissed; the view must omit them. */
  readonly dismissedLayers?: readonly string[];
  /**
   * The caller's layer-scoped bindings by layer id, then normalised chord;
   * a binding may not take a key its layer already uses.
   */
  readonly layerBindings?: LayerBindings;
}

function split(issues: Issues, path: string, value: SplitRules): void {
  count(issues, `${path}.wideAtColumns`, value.wideAtColumns, 1);
  count(issues, `${path}.collapseBelowColumns`, value.collapseBelowColumns, 1);
  if (value.wideAtColumns < value.collapseBelowColumns) {
    issues.push({
      path: `${path}.wideAtColumns`,
      message: "must be at least collapseBelowColumns",
    });
  }
  count(issues, `${path}.list.min`, value.list.min, 1);
  if (value.list.sizing === "content") {
    count(issues, `${path}.list.maxTitle`, value.list.maxTitle, 1);
  } else if (
    !(value.list.share > 0 && value.list.share < 1) ||
    value.list.max < value.list.min
  ) {
    issues.push({
      path: `${path}.list`,
      message: "share must lie between 0 and 1, with max at least min",
    });
  }
  count(issues, `${path}.detailMin.standard`, value.detailMin.standard, 1);
  count(issues, `${path}.detailMin.wide`, value.detailMin.wide, 1);
  for (const tier of ["standard", "wide"] as const) {
    for (const [side, cells] of value.detailPadding[tier].entries()) {
      count(issues, `${path}.detailPadding.${tier}[${side}]`, cells, 0);
    }
  }
  count(issues, `${path}.strip.shortBelowRows`, value.strip.shortBelowRows, 1);
}

/**
 * Check a view against the application rules and return every broken rule.
 * An empty result means the view may be shown.
 */
export function validateTerminalApplicationView<A>(
  view: TerminalApplicationView<A>,
  context: TerminalApplicationViewContext = {},
): readonly TerminalApplicationViewIssue[] {
  const issues: Issues = [];
  runs(issues, "header.leading", view.header.leading);
  runs(issues, "header.trailing", view.header.trailing);
  for (const [index, chip] of (view.header.chips ?? []).entries()) {
    runs(issues, `header.chips[${index}].runs`, chip.runs);
  }
  const liveness = view.header.liveness;
  if (liveness !== undefined) {
    for (const state of ["idle", "busy", "retrying", "stale"] as const) {
      text(issues, `header.liveness.labels.${state}`, liveness.labels[state]);
    }
    if (!["idle", "busy", "retrying", "stale"].includes(liveness.state)) {
      issues.push({ path: "header.liveness.state", message: "is unknown" });
    }
    if (liveness.busyAfterMs !== undefined) {
      count(issues, "header.liveness.busyAfterMs", liveness.busyAfterMs, 0);
    }
  }
  const body = view.body;
  switch (body.kind) {
    case "master-detail":
      list(issues, "body.list", body.list);
      if (body.detail.follows !== body.list.id) {
        issues.push({
          path: "body.detail.follows",
          message: "must name the body's list",
        });
      }
      for (const [id, content] of Object.entries(body.detail.content)) {
        blocks(issues, `body.detail.content.${id}`, content);
      }
      for (const [id, strip] of Object.entries(body.detail.strip ?? {})) {
        runs(issues, `body.detail.strip.${id}.title`, strip.title);
        for (const [index, fact] of strip.facts.entries()) {
          runs(issues, `body.detail.strip.${id}.facts[${index}]`, fact);
        }
      }
      for (const [id, crumb] of Object.entries(body.detail.breadcrumb ?? {})) {
        runs(issues, `body.detail.breadcrumb.${id}`, crumb);
      }
      if (body.detail.pending !== undefined) {
        text(issues, "body.detail.pending", body.detail.pending);
      }
      if (body.split !== undefined) split(issues, "body.split", body.split);
      hints(issues, "body.zoomFooter", body.zoomFooter);
      break;
    case "list":
      list(issues, "body.list", body.list);
      break;
    case "reading":
      text(issues, "body.id", body.id);
      break;
    case "empty":
      text(issues, "body.title", body.title);
      runs(issues, "body.body", body.body);
      hints(issues, "body.primary", { left: [body.primary] });
      hints(issues, "body.secondary", { left: body.secondary ?? [] });
      if (body.list !== undefined) list(issues, "body.list", body.list);
      break;
    default:
      issues.push({ path: "body.kind", message: "is not a body kind" });
  }
  const message = view.message;
  if (message !== undefined) {
    text(issues, "message.id", message.id);
    tone(issues, "message.tone", message.tone);
    runs(issues, "message.runs", message.runs);
    runs(issues, "message.trailing", message.trailing);
    if (message.dismiss?.afterMs !== undefined) {
      count(issues, "message.dismiss.afterMs", message.dismiss.afterMs, 1);
    }
    if (context.dismissedMessages?.includes(message.id) === true) {
      issues.push({
        path: "message.id",
        message:
          "was dismissed; the view that follows a dismissal must omit it",
      });
    }
  }
  hints(issues, "footer", view.footer);
  for (const [cluster, value] of Object.entries(view.footer)) {
    if (!Array.isArray(value)) continue;
    for (const [index, hint] of value.entries()) {
      const keys = typeof hint.key === "string" ? [hint.key] : hint.key;
      for (const key of keys) {
        // A hint may name a word such as "Letters" instead of one key.
        if (
          decodableChord(key) === undefined && !/^[\p{L}\p{N} ]+$/u.test(key)
        ) {
          issues.push({
            path: `footer.${cluster}[${index}].key`,
            message: "is neither a key nor a word",
          });
        }
      }
    }
  }
  if (view.windowTitle !== undefined) {
    text(issues, "windowTitle", view.windowTitle, true);
  }
  if (
    view.input?.mouse !== undefined && typeof view.input.mouse !== "boolean"
  ) {
    issues.push({ path: "input.mouse", message: "must be a boolean" });
  }
  runs(issues, "input.selectionHint", view.input?.selectionHint);
  const shown = body.kind === "master-detail" || body.kind === "list"
    ? body.list.id
    : body.kind === "empty"
    ? body.list?.id
    : undefined;
  layerRules(issues, view.layers, {
    ...(shown === undefined ? {} : { listIds: [shown] }),
    ...(context.dismissedLayers === undefined
      ? {}
      : { dismissedLayers: context.dismissedLayers }),
    ...(context.layerBindings === undefined
      ? {}
      : { layerBindings: context.layerBindings }),
  });
  return issues;
}

/** Throw a `TypeError` naming every broken rule. */
export function assertTerminalApplicationView<A>(
  view: TerminalApplicationView<A>,
  context: TerminalApplicationViewContext = {},
): void {
  const issues = validateTerminalApplicationView(view, context);
  if (issues.length === 0) return;
  throw new TypeError(
    `application view breaks ${issues.length} rule${
      issues.length === 1 ? "" : "s"
    }: ${
      issues.slice(0, 5).map((issue) => `${issue.path} ${issue.message}`)
        .join("; ")
    }`,
  );
}
