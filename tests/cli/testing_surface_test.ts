import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  requestSelection,
  requestText,
  type TerminalKeyName,
  tokenizeTerminalKeys,
} from "../../src/cli/interactive/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  encodeTerminalKeys,
  FakeTerminalIO,
  TERMINAL_KEY_SEQUENCES,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

Deno.test("every canonical key sequence decodes back to its own name", () => {
  const entries = Object.entries(TERMINAL_KEY_SEQUENCES) as readonly [
    TerminalKeyName,
    string,
  ][];
  for (const [name, sequence] of entries) {
    assertEquals(
      tokenizeTerminalKeys(sequence, true),
      { keys: [{ kind: "named", name }], rest: "" },
      `sequence for ${name} did not decode to ${name}`,
    );
  }
});

Deno.test("encoded keys compose one chunk in scripted order", () => {
  assertEquals(
    encodeTerminalKeys("down", "down", "enter"),
    `${TERMINAL_KEY_SEQUENCES.down}${TERMINAL_KEY_SEQUENCES.down}${TERMINAL_KEY_SEQUENCES.enter}`,
  );
  assertEquals(encodeTerminalKeys(), "");
});

Deno.test("scripted named keys drive a real selection to a real value", async () => {
  const io = new FakeTerminalIO([], { columns: 40 });
  io.enqueueKeys("down", "down", "enter");
  const value = await requestSelection({
    label: "Pick",
    choices: [
      { id: "one", label: "One", value: 1 },
      { id: "two", label: "Two", value: 2 },
      { id: "three", label: "Three", value: 3 },
    ],
  }, { io });
  assertEquals(value, 3);
  assertEquals(io.rawTransitions, [true, false]);
  assertStringIncludes(io.output(), "Three");
});

Deno.test("a queued resize applies between scripted keystrokes", async () => {
  const io = new FakeTerminalIO(["a"], { columns: 80, rows: 24 });
  io.enqueueResize(40, 8);
  io.enqueue("b");

  assertEquals(new TextDecoder().decode(await io.read() ?? undefined), "a");
  assertEquals(io.size(), { columns: 80, rows: 24 });
  const marker = await io.read();
  assertEquals(marker?.length, 0, "a resize yields one empty chunk");
  assertEquals(io.size(), { columns: 40, rows: 8 });
  assertEquals(io.capabilities().columns, 40);
  assertEquals(new TextDecoder().decode(await io.read() ?? undefined), "b");
  assertEquals(await io.read(), null);
});

Deno.test("a queued resize with omitted rows keeps the height current then", async () => {
  const io = new FakeTerminalIO([], { columns: 80, rows: 24 });
  io.enqueueResize(60, 10);
  io.enqueueResize(30);
  await io.read();
  await io.read();
  assertEquals(io.size(), { columns: 30, rows: 10 });
});

Deno.test("an interaction completes across a mid-script resize", async () => {
  const io = new FakeTerminalIO([], { columns: 60, rows: 30 });
  io.enqueue("Ada");
  io.enqueueResize(32, 10);
  io.enqueue(" Lovelace");
  io.enqueueKeys("enter");
  const value = await requestText({ label: "Name" }, { io });
  assertEquals(value, "Ada Lovelace");
  assertEquals(io.rawTransitions, [true, false]);
  assertEquals(io.size(), { columns: 32, rows: 10 });
});

Deno.test("scripted chunks are copied defensively", async () => {
  const bytes = new TextEncoder().encode("x");
  const io = new FakeTerminalIO([bytes]);
  bytes[0] = "y".charCodeAt(0);
  assertEquals(new TextDecoder().decode(await io.read() ?? undefined), "x");
});

Deno.test("exact-frame assertion names the first differing line", () => {
  const capabilities = testTerminalCapabilities({ columns: 12 });
  assertExactFrame("one\ntwo", "one\ntwo", capabilities);

  const differs = assertThrows(
    () => assertExactFrame("one\ntwo", "one\nTWO", capabilities),
    Error,
    "differs from the expected frame at line 2",
  );
  assertStringIncludes(differs.message, 'expected line: "TWO"');
  assertStringIncludes(differs.message, 'received line: "two"');

  assertThrows(
    () => assertExactFrame("one\ntwo\nthree", "one\ntwo", capabilities),
    Error,
    "line 3",
  );
  assertThrows(
    () =>
      assertExactFrame("wider than twelve", "wider than twelve", capabilities),
    Error,
    "wider than 12 columns",
  );
});

Deno.test("styled-frame assertion demands styling and strips it for comparison", () => {
  const capabilities = testTerminalCapabilities();
  assertStyledFrame("\u001b[1mbold\u001b[0m plain", "bold plain", capabilities);
  assertThrows(
    () => assertStyledFrame("plain", "plain", capabilities),
    Error,
    "no ANSI styling",
  );
  assertThrows(
    () =>
      assertStyledFrame("\u001b[1mbold\u001b[0m", "different", capabilities),
    Error,
    "differs from the expected frame",
  );
});

Deno.test("test capabilities stay deterministic and overridable", () => {
  assertEquals(testTerminalCapabilities(), {
    ansiControl: true,
    colorDepth: "none",
    columns: 80,
    unicode: true,
  });
  assertEquals(
    testTerminalCapabilities({ colorDepth: "truecolor", columns: 40 }).columns,
    40,
  );
});

Deno.test("non-interactive and degraded terminal facts stay scriptable", () => {
  const io = new FakeTerminalIO([], {
    ansiControl: false,
    interactive: false,
    colorDepth: "ansi256",
    columns: 40,
    rows: 12,
    unicode: false,
  });
  assertEquals(io.isInteractive(), false);
  assertEquals(io.capabilities(), {
    ansiControl: false,
    colorDepth: "ansi256",
    columns: 40,
    unicode: false,
  });
  assert(io.writes.length === 0 && io.rawTransitions.length === 0);
});
