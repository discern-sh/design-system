/** Shared, renderer-measured interaction viewport budgeting. */

/** Per-frame visual budget offered to interaction state machines. */
export interface InteractionFrameViewport {
  /** Maximum control rows the machine may expose in this fitting attempt. */
  readonly maximumControlRows: number;
  /** Clamp and register a variable region's requested row ceiling. */
  readonly controlRows: (requested: number) => number;
}

/** One interaction frame proven to fit the current terminal height. */
export interface FittedInteractionFrame<State> {
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
 * Fit an interaction through its real renderer, reducing only its variable control
 * rows. This keeps heading, border, query, footer, and lifecycle geometry in
 * the measurement instead of duplicating those facts in each interaction machine.
 */
export function fitInteractionFrame<State>(options: {
  readonly viewportRows: number;
  readonly frame: (viewport: InteractionFrameViewport) => State;
  readonly render: (state: State) => string;
}): FittedInteractionFrame<State> {
  const viewportRows = Math.max(1, options.viewportRows);
  let controlRows = viewportRows;
  while (controlRows >= 1) {
    let used = 0;
    const state = options.frame({
      get maximumControlRows() {
        used = controlRows;
        return controlRows;
      },
      controlRows: (requested) => {
        if (!Number.isSafeInteger(requested) || requested < 1) {
          throw new TypeError(
            "control row ceiling must be a positive safe integer",
          );
        }
        const rows = Math.min(requested, controlRows);
        used = Math.max(used, rows);
        return rows;
      },
    });
    const rendered = options.render(state);
    const frameRows = renderedRows(rendered);
    if (frameRows <= viewportRows) {
      return { state, rendered, frameRows, viewportRows, controlRows };
    }
    // Only skip budgets certified equivalent by every variable region.
    // Raw maximumControlRows access conservatively disables that shortcut.
    controlRows = used - 1;
  }
  throw new TypeError(
    `terminal viewport of ${viewportRows} row(s) cannot hold a coherent interaction frame`,
  );
}
