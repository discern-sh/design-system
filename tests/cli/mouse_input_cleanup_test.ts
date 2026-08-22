import { assertEquals } from "@std/assert";
import { TerminalKeyReader } from "../../src/cli/interactive/keys.ts";
import {
  drainTerminalMouseInput,
  QUERY_TERMINAL_CURSOR_POSITION,
} from "../../src/cli/interactive/mouse-input.ts";
import {
  encodeTerminalMouseEvent,
  FakeTerminalIO,
} from "../../src/cli/interactive/testing.ts";

const wheel = encodeTerminalMouseEvent({
  kind: "mouse",
  action: "wheel",
  direction: "down",
  column: 512,
  row: 4_096,
  modifiers: { shift: true, alt: false, control: true },
});

async function readText(io: FakeTerminalIO): Promise<string> {
  const reader = new TerminalKeyReader(io);
  let value = "";
  while (true) {
    const key = await reader.readKey();
    if (key === null) return value;
    if (key.kind === "text") value += key.text;
  }
}

Deno.test("the mouse-disable input fence drains split SGR reports and preserves surrounding bytes", async () => {
  const split = Math.floor(wheel.length / 2);
  const io = new FakeTerminalIO([
    `a${wheel.slice(0, split)}`,
    `${wheel.slice(split)}b\x1b[12`,
    ";34Rc",
  ]);

  await drainTerminalMouseInput(io);

  assertEquals(io.writes, [QUERY_TERMINAL_CURSOR_POSITION]);
  assertEquals(await readText(io), "abc");
});

Deno.test("a late cursor fence keeps filtering split mouse reports without swallowing later input", async () => {
  const io = new FakeTerminalIO([], { holdOpen: true });
  await drainTerminalMouseInput(io);

  const text = readText(io);
  const split = Math.floor(wheel.length / 2);
  io.enqueue(wheel.slice(0, split));
  await new Promise((resolve) => setTimeout(resolve, 0));
  io.enqueue(`${wheel.slice(split)}\x1b[12;34Rx`);
  io.close();

  assertEquals(await text, "x");
});
