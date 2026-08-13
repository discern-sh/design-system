import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  BufferedTerminalKeyDecoder,
  GraphemeTextEditor,
  HIDE_TERMINAL_CURSOR,
  InlineFramePainter,
  SHOW_TERMINAL_CURSOR,
  tokenizeTerminalKeys,
  withRawTerminal,
} from "../../src/cli/interactive/mod.ts";
import { FakeTerminal } from "./fake-terminal.ts";

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
  const io = new FakeTerminal([], { columns: 20, rows: 10 });
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
  const io = new FakeTerminal([], { columns: 20, rows: 2 });
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
  const io = new FakeTerminal([], { columns: 20, rows: 1 });
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
  const io = new FakeTerminal([], { columns: 20, rows: 4 });
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
  const io = new FakeTerminal([], {
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
  class FailingTerminal extends FakeTerminal {
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
  const io = new FakeTerminal();
  await assertRejects(
    () => withRawTerminal(io, () => Promise.reject(new Error("boom"))),
    Error,
    "boom",
  );
  assertEquals(io.rawTransitions, [true, false]);
  assertEquals(io.writes, [HIDE_TERMINAL_CURSOR, SHOW_TERMINAL_CURSOR]);
});
