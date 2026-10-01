/**
 * What the package owns in a Markdown reading body: which link has focus,
 * moving it, following it, and the heading a fragment or the caller asked
 * the next frame to show. Link order and positions come from the last
 * frame, as list paging does, because only rendering knows where a link
 * sits.
 *
 * @module
 */

import {
  fragmentHeading,
  isApplicationMarkdown,
  type ReadingFocusOrigin,
} from "./markdown-reading.ts";
import type {
  KeyStep,
  ModelState,
  TerminalApplicationReadingTarget,
} from "./model.ts";

/** The focused link of one reading body and how it got focus. */
export interface ReadingFocus {
  readonly link: string;
  readonly origin: ReadingFocusOrigin;
}

/** Where a link sat relative to the last frame's viewport. */
export type ReadingLinkPosition = "above" | "visible" | "below";

/** The links and headings a Markdown reading body showed in the last frame. */
export interface ReadingFrame {
  readonly id: string;
  /** Link ids in document order. */
  readonly order: readonly string[];
  readonly destinations: Readonly<Record<string, string>>;
  readonly positions: Readonly<Record<string, ReadingLinkPosition>>;
  /** Heading ids a fragment may name. */
  readonly headings: readonly string[];
}

/** The width, length, and text a reading body last showed at its top, for rewrapping. */
export interface ReadingPlace {
  readonly width: number;
  readonly lines: number;
  readonly anchor?: string;
}

/** The Markdown reading body on screen, if the body is one. */
export function markdownReadingId<A>(
  model: Pick<ModelState<A>, "view">,
): string | undefined {
  const body = model.view.body;
  return body.kind === "reading" && isApplicationMarkdown(body.content)
    ? body.id
    : undefined;
}

/** The last frame's facts for a reading body, when they are its own. */
function frameFor<A>(
  model: ModelState<A>,
  id: string,
): ReadingFrame | undefined {
  return model.reading?.id === id ? model.reading : undefined;
}

function withFocus<A>(
  model: ModelState<A>,
  id: string,
  focus: ReadingFocus | undefined,
): ModelState<A> {
  const { [id]: _previous, ...rest } = model.readingFocus;
  return {
    ...model,
    readingFocus: focus === undefined ? rest : { ...rest, [id]: focus },
  };
}

/** Clear a reading body's link focus. */
export function clearReadingFocus<A>(
  model: ModelState<A>,
  id: string,
): ModelState<A> {
  return model.readingFocus[id] === undefined
    ? model
    : withFocus(model, id, undefined);
}

/**
 * Tab and Shift+Tab. With a link focused they move to the next or previous
 * one and stop at the ends; without one, Tab focuses the first link on
 * screen or below it, and Shift+Tab the last on screen or above it.
 */
export function moveReadingFocus<A>(
  model: ModelState<A>,
  id: string,
  direction: 1 | -1,
): ModelState<A> {
  const frame = frameFor(model, id);
  if (frame === undefined || frame.order.length === 0) return model;
  const current = model.readingFocus[id]?.link;
  const index = current === undefined ? -1 : frame.order.indexOf(current);
  let next: string | undefined;
  if (index >= 0) next = frame.order[index + direction];
  else if (direction > 0) {
    next = frame.order.find((link) => frame.positions[link] !== "above") ??
      frame.order.at(-1);
  } else {
    next = frame.order.findLast((link) => frame.positions[link] !== "below") ??
      frame.order[0];
  }
  return next === undefined || next === current
    ? model
    : withFocus(model, id, { link: next, origin: "keyboard" });
}

/**
 * Follow a link. A fragment naming a heading of the same document scrolls
 * there; every other link reaches the caller.
 */
export function followReadingLink<A>(
  model: ModelState<A>,
  id: string,
  link: string,
  source: "enter" | "click",
  step: KeyStep<A>,
): ModelState<A> {
  const frame = frameFor(model, id);
  const destination = frame?.destinations[link];
  if (frame === undefined || destination === undefined) return model;
  const heading = fragmentHeading(destination);
  if (heading !== undefined && frame.headings.includes(heading)) {
    return {
      ...clearReadingFocus(model, id),
      readingTargets: { ...model.readingTargets, [id]: { heading } },
    };
  }
  step.effects.push({
    kind: "link",
    link: { readingId: id, linkId: link, destination },
    source,
  });
  return withFocus(model, id, {
    link,
    origin: source === "click" ? "pointer" : "keyboard",
  });
}

/** The caller asks a reading body to show a position, a heading, or a link. */
export function revealReading<A>(
  model: ModelState<A>,
  id: string,
  target: TerminalApplicationReadingTarget,
): ModelState<A> {
  if ("scroll" in target) {
    if (!Number.isSafeInteger(target.scroll) || target.scroll < 0) {
      throw new TypeError("a reading scroll is a whole number from 0");
    }
    return {
      ...clearReadingFocus(model, id),
      readingScroll: { ...model.readingScroll, [id]: target.scroll },
    };
  }
  if ("heading" in target) {
    return {
      ...clearReadingFocus(model, id),
      readingTargets: {
        ...model.readingTargets,
        [id]: { heading: target.heading },
      },
    };
  }
  return withFocus(model, id, { link: target.link, origin: "keyboard" });
}
