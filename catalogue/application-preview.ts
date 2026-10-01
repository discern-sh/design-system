/**
 * A synchronous preview of a terminal application: the pure model driven
 * the way the runtime drives it — one input, the callbacks it owes in
 * order, then a frame — so the Catalogue and tests can show any state an
 * application reaches without a terminal or a clock.
 */
import type { TerminalCapabilities } from "../src/cli/capabilities.ts";
import type { CliPresentationOptions } from "../src/cli/contracts.ts";
import { stripAnsi } from "../src/cli/ansi.ts";
import {
  createTerminalApplicationModel,
  renderTerminalApplication,
  type TerminalApplicationCommand,
  type TerminalApplicationContext,
  type TerminalApplicationEffect,
  type TerminalApplicationFrame,
  type TerminalApplicationInput,
  type TerminalApplicationModel,
  type TerminalApplicationOptions,
  terminalApplicationState,
  transitionTerminalApplication,
  updateTerminalApplication,
} from "../src/cli/interactive/mod.ts";
import type {
  TerminalKey,
  TerminalKeyName,
} from "../src/cli/interactive/keys.ts";

/** The decoded key for a decoder name, `space`, or one character. */
export function previewKey(name: TerminalKeyName | string): TerminalKey {
  if (name === "space") return { kind: "text", text: " " };
  return [...name].length === 1
    ? { kind: "text", text: name }
    : { kind: "named", name: name as TerminalKeyName };
}

/** Drives one application's options through inputs and frames. */
export class ApplicationPreview<A> {
  readonly #options: TerminalApplicationOptions<A>;
  #size: { readonly columns: number; readonly rows: number };
  #capabilities: TerminalCapabilities;
  readonly #presentation: CliPresentationOptions;
  #model: TerminalApplicationModel<A>;
  #queue: TerminalApplicationEffect<A>[] = [];
  #frame!: TerminalApplicationFrame<A>;
  /** Commands the application returned, in order. */
  readonly commands: TerminalApplicationCommand[] = [];

  constructor(
    options: TerminalApplicationOptions<A>,
    capabilities: TerminalCapabilities,
    rows: number,
    presentation: CliPresentationOptions = {},
  ) {
    this.#options = options;
    this.#capabilities = capabilities;
    this.#size = { columns: capabilities.columns, rows };
    this.#presentation = presentation;
    const created = createTerminalApplicationModel(options.view, {
      ...(options.keymap === undefined ? {} : { keymap: options.keymap }),
      ...(options.viKeys === undefined ? {} : { viKeys: options.viKeys }),
    });
    this.#model = created.model;
    this.#queue.push(...created.effects);
    this.#render();
    options.start?.(this.#context());
    this.#settle();
  }

  /** The frame on screen, styled. */
  get frame(): string {
    return this.#frame.frame;
  }

  /** The frame on screen, plain. */
  get text(): string {
    return stripAnsi(this.#frame.frame);
  }

  #render(): void {
    this.#frame = renderTerminalApplication(
      this.#model,
      this.#size,
      this.#capabilities,
      this.#presentation,
    );
    this.#model = this.#frame.model;
  }

  #apply(input: TerminalApplicationInput): void {
    const step = transitionTerminalApplication(this.#model, input, 0);
    this.#model = step.model;
    this.#queue.push(...step.effects);
  }

  #context(): TerminalApplicationContext<A> {
    const model = () => this.#model;
    return {
      get state() {
        return terminalApplicationState(model());
      },
      update: (view) => {
        const step = updateTerminalApplication(this.#model, view, 0);
        this.#model = step.model;
        this.#queue.push(...step.effects);
      },
      select: (listId, itemId, options = {}) =>
        this.#apply({
          kind: "select",
          listId,
          itemId,
          ...(options.reveal === true ? { reveal: true } : {}),
        }),
      setField: (layerId, fieldId, value) =>
        this.#apply({ kind: "field", layerId, fieldId, value }),
      reveal: (readingId, target) =>
        this.#apply({ kind: "reveal", readingId, target }),
      abort: () => {},
      fail: (error) => {
        throw error;
      },
      now: () => 0,
    };
  }

  /** Run the callbacks the queue owes, as the runtime does, then render. */
  #settle(): void {
    const context = this.#context();
    const options = this.#options;
    for (let calls = 0; this.#queue.length > 0; calls += 1) {
      if (calls > 512) throw new TypeError("preview callbacks did not settle");
      const effect = this.#queue.shift();
      if (effect === undefined) break;
      let command: TerminalApplicationCommand | void = undefined;
      switch (effect.kind) {
        case "field":
          options.onField?.(
            effect.layerId,
            effect.fieldId,
            effect.value,
            context,
          );
          break;
        case "selection-moved":
          options.onSelectionMoved?.(
            effect.listId,
            effect.itemId,
            effect.move,
            context,
          );
          break;
        case "selection-change":
          options.onSelectionChange?.(effect.listId, effect.itemId, context);
          break;
        case "dismiss":
          options.onDismiss?.(effect.target, effect.via, context);
          break;
        case "action":
          command = options.onAction?.(effect.action, context, effect.source);
          break;
        case "link":
          command = options.onLink?.(effect.link, context, effect.source);
          break;
        case "cancel":
          break;
      }
      if (command !== undefined) this.commands.push(command);
    }
    this.#render();
  }

  /** Apply one input, its callbacks, and a frame. */
  input(input: TerminalApplicationInput): this {
    this.#apply(input);
    this.#settle();
    return this;
  }

  /** Resize the terminal and paint again, as a resize notification does. */
  resize(columns: number, rows: number = this.#size.rows): this {
    this.#size = { columns, rows };
    this.#capabilities = { ...this.#capabilities, columns };
    this.#render();
    return this;
  }

  /** The application's state, as its callbacks read it. */
  get state(): ReturnType<typeof terminalApplicationState> {
    return terminalApplicationState(this.#model);
  }

  /** Press keys by decoder name or character. */
  key(...names: (TerminalKeyName | string)[]): this {
    for (const name of names) {
      this.input({ kind: "key", key: previewKey(name) });
    }
    return this;
  }

  /** Type text one character at a time. */
  type(text: string): this {
    for (const character of text) {
      this.input({ kind: "key", key: { kind: "text", text: character } });
    }
    return this;
  }

  /** The one-based cell where a text first appears on screen. */
  find(text: string): { readonly column: number; readonly row: number } {
    for (const [index, line] of this.text.split("\n").entries()) {
      const at = line.indexOf(text);
      if (at >= 0) {
        return { column: [...line.slice(0, at)].length + 1, row: index + 1 };
      }
    }
    throw new TypeError(`${JSON.stringify(text)} is not on screen`);
  }

  /** Click the left button on the first cell of a text on screen. */
  click(text: string): this {
    return this.clickAt(this.find(text));
  }

  /** Click the left button at a one-based cell. */
  clickAt(at: { readonly column: number; readonly row: number }): this {
    return this.input({
      kind: "mouse",
      event: {
        kind: "mouse",
        action: "press",
        button: "left",
        column: at.column,
        row: at.row,
        modifiers: { shift: false, alt: false, control: false },
      },
    });
  }
}
