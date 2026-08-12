/** One browser-safe visual style decoded from terminal SGR output. */
export interface TerminalAnsiStyle {
  readonly bold?: true;
  readonly dim?: true;
  readonly italic?: true;
  readonly underline?: true;
  readonly strikethrough?: true;
  readonly color?: string;
}

/** One text run and the terminal style active for that run. */
export interface TerminalAnsiSpan {
  readonly text: string;
  readonly style?: TerminalAnsiStyle;
}

interface MutableTerminalAnsiStyle {
  bold?: true;
  dim?: true;
  italic?: true;
  underline?: true;
  strikethrough?: true;
  color?: string;
}

const ESCAPE = String.fromCharCode(27);
const SGR_SEQUENCE = new RegExp(`${ESCAPE}\\[([0-9;]*)m`, "gu");

function plainText(value: string): void {
  for (const character of value) {
    const code = character.codePointAt(0);
    if (
      code !== undefined &&
      (code <= 8 || (code >= 11 && code <= 31) || code === 127)
    ) {
      throw new TypeError(
        "CLI preview contains an unsupported control character",
      );
    }
  }
}

function snapshotStyle(
  style: MutableTerminalAnsiStyle,
): TerminalAnsiStyle | undefined {
  return Object.keys(style).length === 0 ? undefined : { ...style };
}

function appendSpan(
  spans: TerminalAnsiSpan[],
  text: string,
  style: MutableTerminalAnsiStyle,
): void {
  if (text === "") return;
  const snapshot = snapshotStyle(style);
  spans.push(snapshot === undefined ? { text } : { text, style: snapshot });
}

function colorChannel(value: number | undefined): number {
  if (
    value === undefined || !Number.isInteger(value) || value < 0 || value > 255
  ) {
    throw new TypeError("CLI preview contains an invalid truecolour channel");
  }
  return value;
}

function applySgr(
  parameters: string,
  style: MutableTerminalAnsiStyle,
): MutableTerminalAnsiStyle {
  const codes = parameters === ""
    ? [0]
    : parameters.split(";").map((value) => Number(value));
  let next = style;
  for (let index = 0; index < codes.length; index += 1) {
    const code = codes[index];
    if (!Number.isInteger(code)) {
      throw new TypeError("CLI preview contains a malformed SGR sequence");
    }
    if (code === 0) {
      next = {};
    } else if (code === 1) {
      next.bold = true;
    } else if (code === 2) {
      next.dim = true;
    } else if (code === 3) {
      next.italic = true;
    } else if (code === 4) {
      next.underline = true;
    } else if (code === 9) {
      next.strikethrough = true;
    } else if (code === 38 && codes[index + 1] === 2) {
      const red = colorChannel(codes[index + 2]);
      const green = colorChannel(codes[index + 3]);
      const blue = colorChannel(codes[index + 4]);
      next.color = `rgb(${red} ${green} ${blue})`;
      index += 4;
    } else {
      throw new TypeError(`CLI preview does not support SGR code ${code}`);
    }
  }
  return next;
}

/**
 * Decode the truecolour SGR subset emitted by the fixed browser preview.
 *
 * Unsupported escape sequences fail closed so new terminal capabilities must
 * receive an intentional browser projection rather than leaking raw controls.
 */
export function parseTerminalAnsi(value: string): readonly TerminalAnsiSpan[] {
  const spans: TerminalAnsiSpan[] = [];
  let style: MutableTerminalAnsiStyle = {};
  let offset = 0;
  for (const match of value.matchAll(SGR_SEQUENCE)) {
    const matchIndex = match.index;
    const text = value.slice(offset, matchIndex);
    plainText(text);
    appendSpan(spans, text, style);
    style = applySgr(match[1] ?? "", style);
    offset = matchIndex + match[0].length;
  }
  const tail = value.slice(offset);
  plainText(tail);
  appendSpan(spans, tail, style);
  return spans;
}
