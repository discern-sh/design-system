/**
 * The private state report an owned application may announce before each
 * paint: one OSC sequence carrying a flat JSON summary of navigation state.
 * Terminals ignore an OSC number they do not know, so the report never
 * reaches the screen; test instruments decode it to key on stable
 * identities instead of prose.
 *
 * @module
 */

/**
 * The navigation identities an application reports. Every field is optional,
 * and later versions may add flat scalar fields, so readers ignore names they
 * do not know.
 */
export interface TerminalApplicationStateReport {
  /** The topmost open layer, when one is open. */
  readonly topLayerId?: string;
  /** The control or region that receives the next key. */
  readonly focusedControlId?: string;
  /** The list whose selection is reported. */
  readonly listId?: string;
  /** The selected item in that list. */
  readonly selectedItemId?: string;
  /** Whether that list's detail fills the body. */
  readonly zoomed?: boolean;
  readonly [field: string]: string | number | boolean | undefined;
}

/** The private OSC number that carries a state report. */
export const TERMINAL_STATE_REPORT_OSC = 7719;

const ESCAPE = "\x1b";
const STRING_TERMINATOR = `${ESCAPE}\\`;

/** The bytes that open a state report, before its JSON payload. */
export const TERMINAL_STATE_REPORT_PREFIX =
  `${ESCAPE}]${TERMINAL_STATE_REPORT_OSC};`;

function assertReportField(name: string, value: unknown): void {
  if (
    typeof value !== "string" && typeof value !== "boolean" &&
    !(typeof value === "number" && Number.isFinite(value))
  ) {
    throw new TypeError(
      `state report field ${
        JSON.stringify(name)
      } must be a string, finite number, or boolean`,
    );
  }
}

/**
 * Encode one report as its OSC sequence. Undefined fields are omitted; JSON
 * escapes every control character, so the payload cannot end the sequence
 * early.
 */
export function encodeTerminalStateReport(
  report: TerminalApplicationStateReport,
): string {
  const fields: Record<string, string | number | boolean> = {};
  for (const [name, value] of Object.entries(report)) {
    if (value === undefined) continue;
    assertReportField(name, value);
    fields[name] = value;
  }
  return `${TERMINAL_STATE_REPORT_PREFIX}${
    JSON.stringify(fields)
  }${STRING_TERMINATOR}`;
}

/** Decode one report payload, rejecting anything but a flat object of scalars. */
export function decodeTerminalStateReport(
  payload: string,
): TerminalApplicationStateReport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new TypeError("state report payload is not JSON");
  }
  if (
    typeof parsed !== "object" || parsed === null || Array.isArray(parsed)
  ) {
    throw new TypeError("state report payload must be a JSON object");
  }
  const report: Record<string, string | number | boolean> = {};
  for (const [name, value] of Object.entries(parsed)) {
    assertReportField(name, value);
    report[name] = value as string | number | boolean;
  }
  return Object.freeze(report);
}
