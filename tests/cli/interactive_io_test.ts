import { assertEquals, assertRejects } from "@std/assert";
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
  painter.replace("one\ntwo");
  painter.replace("three");
  painter.clear();
  assertEquals(io.writes, [
    "one\ntwo",
    "\x1b[1G\x1b[1A\x1b[Jthree",
    "\x1b[1G\x1b[J",
  ]);
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
