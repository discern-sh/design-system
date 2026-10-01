/** A pure application model driven like the runtime drives it: one input, then a render. */
import { stripAnsi } from "../../src/cli/mod.ts";
import {
  createTerminalApplicationModel,
  type KeymapEntry,
  renderTerminalApplication,
  type TerminalApplicationEffect,
  type TerminalApplicationFrame,
  type TerminalApplicationInput,
  type TerminalApplicationModel,
  type TerminalApplicationState,
  terminalApplicationState,
  type TerminalApplicationView,
  transitionTerminalApplication,
  updateTerminalApplication,
} from "../../src/cli/interactive/mod.ts";
import type {
  TerminalKey,
  TerminalKeyName,
  TerminalMouseEvent,
} from "../../src/cli/interactive/keys.ts";
import {
  FakeTerminalIO,
  type FakeTerminalIOOptions,
} from "../../src/cli/interactive/testing.ts";

/** The decoded key for a decoder name or one character. */
export function keyOf(name: TerminalKeyName | string): TerminalKey {
  if (name === "space") return { kind: "text", text: " " };
  return [...name].length === 1
    ? { kind: "text", text: name }
    : { kind: "named", name: name as TerminalKeyName };
}

/** Options for {@linkcode ApplicationDriver}. */
export interface ApplicationDriverOptions extends FakeTerminalIOOptions {
  readonly keymap?: readonly KeymapEntry<string>[];
}

/** Drive a model through inputs, rendering after each like the runtime. */
export class ApplicationDriver {
  model: TerminalApplicationModel<string>;
  effects: TerminalApplicationEffect<string>[] = [];
  last!: TerminalApplicationFrame<string>;
  now = 0;
  readonly io: FakeTerminalIO;

  constructor(
    view: TerminalApplicationView<string>,
    options: ApplicationDriverOptions = {},
  ) {
    this.io = new FakeTerminalIO([], { columns: 80, rows: 24, ...options });
    const created = createTerminalApplicationModel(view, {
      ...(options.keymap === undefined ? {} : { keymap: options.keymap }),
    });
    this.model = created.model;
    this.effects.push(...created.effects);
    this.render();
  }

  /** Render one frame and return its plain text. */
  render(): string {
    this.last = renderTerminalApplication(
      this.model,
      this.io.size(),
      this.io.capabilities(),
      {},
      { phase: 0, now: this.now },
    );
    this.model = this.last.model;
    return stripAnsi(this.last.frame);
  }

  get text(): string {
    return stripAnsi(this.last.frame);
  }

  input(input: TerminalApplicationInput): this {
    const step = transitionTerminalApplication(this.model, input, this.now);
    this.model = step.model;
    this.effects.push(...step.effects);
    this.render();
    return this;
  }

  key(...names: (TerminalKeyName | string)[]): this {
    for (const name of names) this.input({ kind: "key", key: keyOf(name) });
    return this;
  }

  type(text: string): this {
    for (const character of text) {
      this.input({ kind: "key", key: { kind: "text", text: character } });
    }
    return this;
  }

  mouse(event: TerminalMouseEvent): this {
    return this.input({ kind: "mouse", event });
  }

  /** Click the left button at a one-based cell. */
  click(column: number, row: number): this {
    const modifiers = { shift: false, alt: false, control: false };
    return this.mouse({
      kind: "mouse",
      action: "press",
      button: "left",
      column,
      row,
      modifiers,
    });
  }

  update(view: TerminalApplicationView<string>): this {
    const step = updateTerminalApplication(this.model, view, this.now);
    this.model = step.model;
    this.effects.push(...step.effects);
    this.render();
    return this;
  }

  get state(): TerminalApplicationState {
    return terminalApplicationState(this.model);
  }

  take(): TerminalApplicationEffect<string>[] {
    return this.effects.splice(0);
  }

  /** The actions taken since the last `take`, without consuming them. */
  actions(): string[] {
    return this.effects.flatMap((effect) =>
      effect.kind === "action" ? [effect.action] : []
    );
  }

  /** The one-based cell where a text first appears on screen. */
  find(text: string): { readonly column: number; readonly row: number } {
    const lines = this.text.split("\n");
    for (const [index, line] of lines.entries()) {
      const at = line.indexOf(text);
      if (at >= 0) {
        return { column: [...line.slice(0, at)].length + 1, row: index + 1 };
      }
    }
    throw new Error(`${JSON.stringify(text)} is not on screen`);
  }
}
