import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  BufferedTerminalKeyDecoder,
  decodeTerminalInputEvent,
  GraphemeTextEditor,
  HIDE_TERMINAL_CURSOR,
  InlineFramePainter,
  SHOW_TERMINAL_CURSOR,
  TERMINAL_MOUSE_MAX_COORDINATE,
  TerminalInputReader,
  TerminalKeyReader,
  tokenizeTerminalKeys,
  withRawTerminal,
} from "../../src/cli/interactive/mod.ts";
import {
  encodeTerminalMouseEvent,
  enqueueTerminalEvents,
  FakeTerminalIO,
} from "../../src/cli/interactive/testing.ts";

Deno.test("interactive key decoding buffers split escape sequences and UTF-8", () => {
  assertEquals(tokenizeTerminalKeys("a\x1b[").keys, [
    { kind: "text", text: "a" },
  ]);
  assertEquals(tokenizeTerminalKeys("a\x1b[").rest, "\x1b[");

  const arrows = new BufferedTerminalKeyDecoder();
  assertEquals(arrows.push(new TextEncoder().encode("\x1b[")), []);
  assertEquals(arrows.push(new TextEncoder().encode("A")), [
    { kind: "named", name: "up" },
  ]);

  const emoji = new TextEncoder().encode("👩‍💻");
  const unicode = new BufferedTerminalKeyDecoder();
  assertEquals(unicode.push(emoji.slice(0, 3)), []);
  assertEquals(unicode.push(emoji.slice(3)), [
    { kind: "text", text: "👩‍💻" },
  ]);
});

Deno.test("standalone Escape waits for EOF and unknown CSI stays non-printable", () => {
  const escape = new BufferedTerminalKeyDecoder();
  assertEquals(escape.push(new Uint8Array([27])), []);
  assertEquals(escape.bufferedText, "\x1b");
  assertEquals(escape.finish(), [{ kind: "named", name: "escape" }]);

  assertEquals(tokenizeTerminalKeys("\x1b[99~", true), {
    keys: [{ kind: "unknown", sequence: "\x1b[99~" }],
    rest: "",
  });
});

Deno.test("Alt and meta chords stay non-printable unknown sequences", () => {
  assertEquals(tokenizeTerminalKeys("\x1bb", true).keys, [
    { kind: "unknown", sequence: "\x1bb" },
  ]);
  const decoder = new BufferedTerminalKeyDecoder();
  assertEquals(decoder.push(new TextEncoder().encode("\x1bb")), [
    { kind: "unknown", sequence: "\x1bb" },
  ]);
  assertEquals(tokenizeTerminalKeys("\x1b\x1b[A").keys, [
    { kind: "named", name: "escape" },
    { kind: "named", name: "up" },
  ]);
});

Deno.test("SGR mouse input decodes presses, releases, wheels, coordinates, and modifiers", async () => {
  const events = [
    {
      kind: "mouse",
      action: "press",
      button: "left",
      column: 512,
      row: 4_096,
      modifiers: { shift: true, alt: true, control: true },
    },
    {
      kind: "mouse",
      action: "release",
      button: "right",
      column: 300,
      row: 301,
      modifiers: { shift: false, alt: false, control: false },
    },
    {
      kind: "mouse",
      action: "wheel",
      direction: "up",
      column: 999,
      row: 777,
      modifiers: { shift: false, alt: true, control: false },
    },
    {
      kind: "mouse",
      action: "wheel",
      direction: "down",
      column: 1,
      row: 1,
      modifiers: { shift: false, alt: false, control: true },
    },
  ] as const;
  const io = new FakeTerminalIO();
  enqueueTerminalEvents(io, events);
  const reader = new TerminalInputReader(io);
  for (const event of events) assertEquals(await reader.readEvent(), event);
  assertEquals(await reader.readEvent(), null);
});

Deno.test("the event reader buffers an SGR mouse report split at every boundary", async () => {
  const event = {
    kind: "mouse",
    action: "press",
    button: "middle",
    column: 640,
    row: 480,
    modifiers: { shift: true, alt: false, control: true },
  } as const;
  const encoded = new TextEncoder().encode(encodeTerminalMouseEvent(event));
  for (let split = 1; split < encoded.length; split += 1) {
    const io = new FakeTerminalIO([
      encoded.slice(0, split),
      encoded.slice(split),
    ]);
    assertEquals(await new TerminalInputReader(io).readEvent(), event);
  }
});

Deno.test("malformed and unsupported mouse controls never become text", () => {
  for (
    const [sequence, reason] of [
      ["\x1b[<0;0;1M", "malformed"],
      [`\x1b[<0;${TERMINAL_MOUSE_MAX_COORDINATE + 1};1M`, "malformed"],
      ["\x1b[<32;8;9M", "unsupported"],
      ["\x1b[<66;8;9M", "unsupported"],
      ["\x1b[<0;;9M", "malformed"],
    ] as const
  ) {
    const token = tokenizeTerminalKeys(sequence, true).keys[0];
    if (token === undefined) throw new Error("expected one unknown token");
    assertEquals(decodeTerminalInputEvent(token), {
      kind: "unknown",
      sequence,
      category: "mouse",
      reason,
    });
    assertEquals(
      tokenizeTerminalKeys(sequence, true).keys.some((key) =>
        key.kind === "text"
      ),
      false,
    );
  }

  const incomplete = tokenizeTerminalKeys("\x1b[<0;12;", true);
  assertEquals(incomplete, {
    keys: [{ kind: "unknown", sequence: "\x1b[<0;12;" }],
    rest: "",
  });
});

Deno.test("flushLoneEscape delivers only an exactly-lone Escape", () => {
  const lone = new BufferedTerminalKeyDecoder();
  lone.push(new Uint8Array([27]));
  assertEquals(lone.flushLoneEscape(), [{ kind: "named", name: "escape" }]);
  assertEquals(lone.bufferedText, "");
  assertEquals(lone.flushLoneEscape(), []);

  const partial = new BufferedTerminalKeyDecoder();
  partial.push(new TextEncoder().encode("\x1b["));
  assertEquals(partial.flushLoneEscape(), []);
  assertEquals(partial.bufferedText, "\x1b[");
});

Deno.test("the reader delivers a lone Escape once its continuation window elapses", async () => {
  const io = new FakeTerminalIO(["\x1b"], { holdOpen: true });
  const reader = new TerminalKeyReader(io, { escapeDelayMs: 5 });
  assertEquals(await reader.readKey(), { kind: "named", name: "escape" });
});

Deno.test("continuation bytes inside the window complete a split escape sequence", async () => {
  const io = new FakeTerminalIO(["\x1b"], { holdOpen: true });
  const reader = new TerminalKeyReader(io, { escapeDelayMs: 60_000 });
  const first = reader.readKey();
  await new Promise((resolve) => setTimeout(resolve, 0));
  io.enqueue("[A");
  assertEquals(await first, { kind: "named", name: "up" });
});

Deno.test("a read left pending by an elapsed window is adopted by the next reader", async () => {
  const io = new FakeTerminalIO(["\x1b"], { holdOpen: true });
  const first = new TerminalKeyReader(io, { escapeDelayMs: 5 });
  assertEquals(await first.readKey(), { kind: "named", name: "escape" });

  const second = new TerminalKeyReader(io);
  const next = second.readKey();
  io.enqueue("x");
  assertEquals(await next, { kind: "text", text: "x" });
});

Deno.test("grapheme editor handles emoji clusters, Emacs keys, and multiline movement", () => {
  const editor = new GraphemeTextEditor("A👩‍💻B");
  editor.handle({ kind: "named", name: "ctrl-b" });
  editor.handle({ kind: "named", name: "backspace" });
  assertEquals(editor.value, "AB");
  assertEquals(editor.cursor, 1);

  editor.handle({ kind: "named", name: "ctrl-a" });
  editor.handle({ kind: "text", text: "e\u0301" });
  assertEquals(editor.value, "e\u0301AB");
  assertEquals(editor.cursor, 1);

  const multiline = new GraphemeTextEditor("ab\ncd");
  multiline.handle({ kind: "named", name: "ctrl-p" }, { multiline: true });
  multiline.handle({ kind: "text", text: "!" }, { multiline: true });
  assertEquals(multiline.value, "ab!\ncd");
});

Deno.test("inline painter replaces and clears the prior frame exactly", () => {
  const io = new FakeTerminalIO([], { columns: 20, rows: 10 });
  const painter = new InlineFramePainter(io);
  assertEquals(painter.replace("one\ntwo"), {
    status: "painted",
    frameLines: 2,
    previousFrameLines: 0,
    viewportRows: 10,
  });
  assertEquals(painter.replace("three"), {
    status: "painted",
    frameLines: 1,
    previousFrameLines: 2,
    viewportRows: 10,
  });
  painter.clear();
  assertEquals(io.writes, [
    "one\ntwo",
    "\x1b[1G\x1b[1A\x1b[Jthree",
    "\x1b[1G\x1b[J",
  ]);
});

Deno.test("inline painter refuses initial oversized frames without writing", () => {
  const io = new FakeTerminalIO([], { columns: 20, rows: 2 });
  const painter = new InlineFramePainter(io);
  assertEquals(painter.replace("one\ntwo\nthree"), {
    status: "refused",
    reason: "frame-exceeds-viewport",
    frameLines: 3,
    previousFrameLines: 0,
    viewportRows: 2,
  });
  assertEquals(io.writes, []);
  assertEquals(painter.currentFrame, "");
});

Deno.test("inline painter counts empty and trailing-newline rows exactly", () => {
  const io = new FakeTerminalIO([], { columns: 20, rows: 1 });
  const painter = new InlineFramePainter(io);
  assertEquals(painter.replace(""), {
    status: "unchanged",
    frameLines: 0,
    previousFrameLines: 0,
    viewportRows: 1,
  });
  assertEquals(painter.replace("one\n"), {
    status: "refused",
    reason: "frame-exceeds-viewport",
    frameLines: 2,
    previousFrameLines: 0,
    viewportRows: 1,
  });
  assertEquals(io.writes, []);
});

Deno.test("inline painter abandons rather than partially erasing after a viewport shrink", () => {
  const io = new FakeTerminalIO([], { columns: 20, rows: 4 });
  const painter = new InlineFramePainter(io);
  painter.replace("one\ntwo\nthree");
  io.resize(20, 2);
  assertEquals(painter.replace("next"), {
    status: "refused",
    reason: "current-frame-exceeds-viewport",
    frameLines: 1,
    previousFrameLines: 3,
    viewportRows: 2,
  });
  assertEquals(io.writes, ["one\ntwo\nthree"]);
  assertEquals(painter.currentFrame, "one\ntwo\nthree");

  assertEquals(painter.replace("one\ntwo\nthree"), {
    status: "refused",
    reason: "current-frame-exceeds-viewport",
    frameLines: 3,
    previousFrameLines: 3,
    viewportRows: 2,
  });
  assertEquals(io.writes, ["one\ntwo\nthree"]);

  painter.clear();
  assertEquals(io.writes, ["one\ntwo\nthree", "\n"]);
  assertEquals(painter.currentFrame, "");
  assertEquals(painter.replace("next"), {
    status: "painted",
    frameLines: 1,
    previousFrameLines: 0,
    viewportRows: 2,
  });
});

Deno.test("inline painter reports unavailable cursor control without emitting escapes", () => {
  const io = new FakeTerminalIO([], {
    ansiControl: false,
    columns: 20,
    rows: 10,
  });
  const painter = new InlineFramePainter(io);
  assertEquals(painter.replace("static only"), {
    status: "refused",
    reason: "ansi-control-unavailable",
    frameLines: 1,
    previousFrameLines: 0,
    viewportRows: 10,
  });
  assertEquals(io.writes, []);
});

Deno.test("inline painter keeps its prior frame when a terminal write fails", () => {
  class FailingTerminal extends FakeTerminalIO {
    #remainingWrites = 1;

    override write(value: string): void {
      if (this.#remainingWrites === 0) throw new Error("write failed");
      this.#remainingWrites -= 1;
      super.write(value);
    }
  }

  const io = new FailingTerminal([], { columns: 20, rows: 10 });
  const painter = new InlineFramePainter(io);
  painter.replace("first");
  assertThrows(() => painter.replace("second"), Error, "write failed");
  assertEquals(painter.currentFrame, "first");
  assertEquals(io.writes, ["first"]);
});

Deno.test("raw terminal lifecycle restores mode and cursor after exceptions", async () => {
  const io = new FakeTerminalIO();
  await assertRejects(
    () => withRawTerminal(io, () => Promise.reject(new Error("boom"))),
    Error,
    "boom",
  );
  assertEquals(io.rawTransitions, [true, false]);
  assertEquals(io.writes, [HIDE_TERMINAL_CURSOR, SHOW_TERMINAL_CURSOR]);
});
