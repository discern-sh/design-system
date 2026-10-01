/**
 * The view rules as data. Every issue is a caller error: the runtime refuses
 * a view with issues before it reaches the screen.
 *
 * @module
 */

import type { KeyHint, KeyHints } from "../../key-hints.ts";
import {
  type CompiledKeymap,
  compileKeymap,
  decodableChord,
  keymapIssues,
  keymapViewIssues,
  terminalApplicationReservedKeys,
  throwIssues,
} from "./keymap.ts";
import {
  DEFAULT_TERMINAL_APPLICATION_COPY,
  type TerminalApplicationCopy,
} from "./copy.ts";
import { layerRules } from "./layer-validate.ts";
import {
  applicationMarkdownIssues,
  isApplicationMarkdown,
} from "./markdown-reading.ts";
import type { TerminalApplicationState } from "./model.ts";
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
import type {
  ApplicationKeyBinding,
  ApplicationSplitRules,
  TerminalApplicationView,
} from "./view.ts";

export type { TerminalApplicationViewIssue } from "./validate-rules.ts";

/** What a view is checked against besides itself. */
export interface TerminalApplicationViewContext<A> {
  /**
   * The caller's bindings. Their own rules are reported, and against the
   * view: a base binding may not take a key the body reserves, and a layer
   * binding may not take a key its layer uses or reach a confirm or
   * destructive button's action.
   */
  readonly keymap?: readonly ApplicationKeyBinding<A>[];
  /** Whether j and k move, so the body reserves them. */
  readonly viKeys?: boolean;
  /**
   * The running application's state: the view must omit every message and
   * layer it lists as dismissed.
   */
  readonly state?: TerminalApplicationState;
}

/** The package's own checking context, with the keymap already compiled. */
export interface ViewRuleContext<A> {
  readonly keymap?: CompiledKeymap<A>;
  readonly dismissedMessages?: readonly string[];
  readonly dismissedLayers?: readonly string[];
}

function split(
  issues: Issues,
  path: string,
  value: ApplicationSplitRules,
): void {
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
 * A view's copy: only known entries, each the kind its default is — plain
 * control-free text, runs, or a function whose words for sample counts
 * are plain text too.
 */
function copyRules(
  issues: Issues,
  copy: Partial<TerminalApplicationCopy> | undefined,
): void {
  if (copy === undefined) return;
  for (const [name, value] of Object.entries(copy)) {
    const path = `copy.${name}`;
    if (!(name in DEFAULT_TERMINAL_APPLICATION_COPY)) {
      issues.push({ path, message: "is not a word the package writes" });
      continue;
    }
    const fallback: unknown = Reflect.get(
      DEFAULT_TERMINAL_APPLICATION_COPY,
      name,
    );
    if (typeof fallback === "string") text(issues, path, value);
    else if (Array.isArray(fallback)) {
      if (Array.isArray(value)) runs(issues, path, value);
      else issues.push({ path, message: "must be an array of runs" });
    } else if (typeof value !== "function") {
      issues.push({ path, message: "must be a function, like its default" });
    } else {
      for (const sample of [0, 1, 12]) {
        const words: unknown = Reflect.apply(value, undefined, [
          sample,
          sample + 1,
          "x",
        ]);
        text(issues, path, words);
      }
    }
  }
}

/** Hints a view shows in the base scope, by where they sit. */
function baseHintSlots<A>(
  view: TerminalApplicationView<A>,
): readonly { readonly path: string; readonly hints: readonly KeyHint[] }[] {
  const clusters = (path: string, value: KeyHints | undefined) =>
    value === undefined ? [] : (["left", "right", "extra"] as const).map((
      cluster,
    ) => ({ path: `${path}.${cluster}`, hints: value[cluster] ?? [] }));
  const body = view.body;
  return [
    ...clusters("footer", view.footer),
    ...(body.kind === "master-detail"
      ? clusters("body.zoomFooter", body.zoomFooter)
      : []),
    ...(body.kind === "empty"
      ? [
        { path: "body.primary", hints: [body.primary] },
        { path: "body.secondary", hints: body.secondary ?? [] },
      ]
      : []),
  ];
}

/**
 * Every key a view advertises in the base scope must do something there:
 * the body reserves it, the package handles it (Escape, Ctrl+C), or a base
 * binding runs it. Without a keymap the view is checked as if none bound.
 */
function advertisedKeys<A>(
  issues: Issues,
  view: TerminalApplicationView<A>,
  keymap: CompiledKeymap<A> | undefined,
): void {
  const handled = new Set<string>([
    ...terminalApplicationReservedKeys(view.body, {
      viKeys: keymap?.viKeys === true,
    }),
    "escape",
    "ctrl-c",
    ...(keymap?.base.keys() ?? []),
  ]);
  // Below the minimum only bindings run, so the notice's hints need one.
  const bound = new Set<string>(["ctrl-c", ...(keymap?.base.keys() ?? [])]);
  const slots = [
    ...baseHintSlots(view).map((slot) => ({ ...slot, handled })),
    { path: "tooSmallHints", hints: view.tooSmallHints ?? [], handled: bound },
  ];
  for (const slot of slots) {
    for (const [index, hint] of slot.hints.entries()) {
      const keys = typeof hint.key === "string" ? [hint.key] : hint.key;
      for (const key of keys) {
        if (typeof key !== "string") continue;
        const chord = decodableChord(key);
        if (chord === undefined || !slot.handled.has(chord)) {
          issues.push({
            path: `${slot.path}[${index}].key`,
            message: `advertises ${
              JSON.stringify(key)
            }, which nothing handles here; bind it or drop the hint`,
          });
        }
      }
    }
  }
}

/**
 * Check a view, and the keymap it will run with, against the application
 * rules and return every broken rule. An empty result means the view may
 * be shown.
 */
export function validateTerminalApplicationView<A>(
  view: TerminalApplicationView<A>,
  context: TerminalApplicationViewContext<A> = {},
): readonly TerminalApplicationViewIssue[] {
  const entries = context.keymap ?? [];
  const keymapProblems = keymapIssues(entries);
  const keymap = keymapProblems.length === 0
    ? compileKeymap(entries, context.viKeys === true)
    : undefined;
  return [
    ...keymapProblems,
    ...viewIssues(view, {
      ...(keymap === undefined ? {} : { keymap }),
      ...(context.state === undefined ? {} : {
        dismissedMessages: context.state.dismissed.messages,
        dismissedLayers: context.state.dismissed.layers,
      }),
    }),
  ];
}

/** Every broken view rule, with the keymap already compiled. */
export function viewIssues<A>(
  view: TerminalApplicationView<A>,
  context: ViewRuleContext<A>,
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
      if (isApplicationMarkdown(body.content)) {
        for (const issue of applicationMarkdownIssues(body.content)) {
          issues.push({
            path: `body.content.${issue.path}`,
            message: issue.message,
          });
        }
      }
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
  hints(issues, "tooSmallHints", { left: view.tooSmallHints ?? [] });
  advertisedKeys(issues, view, context.keymap);
  copyRules(issues, view.copy);
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
    ...(context.keymap === undefined
      ? {}
      : { layerBindings: context.keymap.layers }),
  });
  if (context.keymap !== undefined) {
    issues.push(...keymapViewIssues(context.keymap, body));
  }
  return issues;
}

/** Throw a `TypeError` naming every broken rule. */
export function assertTerminalApplicationView<A>(
  view: TerminalApplicationView<A>,
  context: ViewRuleContext<A> = {},
): void {
  throwIssues("application view", viewIssues(view, context));
}
