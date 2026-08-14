/** Shared, renderer-measured prompt viewport budgeting. */

/** Per-frame visual budget offered to prompt state machines. */
export interface PromptFrameViewport {
  /** Maximum control rows the machine may expose in this fitting attempt. */
  readonly maximumControlRows: number;
}

/** One prompt frame proven to fit the current terminal height. */
export interface FittedPromptFrame<State> {
  readonly state: State;
  readonly rendered: string;
  readonly frameRows: number;
  readonly viewportRows: number;
  readonly controlRows: number;
}

function renderedRows(value: string): number {
  return value === "" ? 0 : value.split("\n").length;
}

/**
 * Fit a prompt through its real renderer, reducing only its variable control
 * rows. This keeps heading, border, query, footer, and lifecycle geometry in
 * the measurement instead of duplicating those facts in each prompt machine.
 */
export function fitPromptFrame<State>(options: {
  readonly viewportRows: number;
  readonly frame: (viewport: PromptFrameViewport) => State;
  readonly render: (state: State) => string;
}): FittedPromptFrame<State> {
  const viewportRows = Math.max(1, options.viewportRows);
  let controlRows = viewportRows;
  while (controlRows >= 1) {
    const state = options.frame({ maximumControlRows: controlRows });
    const rendered = options.render(state);
    const frameRows = renderedRows(rendered);
    if (frameRows <= viewportRows) {
      return { state, rendered, frameRows, viewportRows, controlRows };
    }
    const overflow = frameRows - viewportRows;
    controlRows -= Math.max(1, overflow);
  }
  throw new TypeError(
    `terminal viewport of ${viewportRows} row(s) cannot hold a coherent prompt frame`,
  );
}
