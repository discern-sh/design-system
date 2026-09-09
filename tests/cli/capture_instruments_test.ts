import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  captureTerminalFrame,
  FakeTerminalIO,
  observeTerminalIO,
  runPtyProcess,
  type TerminalIOObservation,
} from "../../src/cli/interactive/testing.ts";
import {
  renderTerminalApplication,
  updateTerminalApplication,
} from "../../src/cli/interactive/mod.ts";
Deno.test("settled capture rejects partial and foreign controls and projects real frames", () => {
  const io = new FakeTerminalIO([], { columns: 40, rows: 13 });
  const rendered = renderTerminalApplication(
    updateTerminalApplication({
      title: "Sample",
      regions: [{
        kind: "choices",
        id: "items",
        title: "Items",
        entries: [{ id: "a", label: "Alpha", value: 1 }],
      }],
    }),
    io.size(),
    io.capabilities(),
  );
  const transcript = "unrelated earlier output\x1b[2J\x1b[H" +
    rendered.frame.replaceAll("\n", "\r\r\n") +
    "\x1b[?25h\x1b[?1049lchild output";
  const capture = captureTerminalFrame(transcript, io.size());
  assertEquals(capture.frame, rendered.frame);
  assert(capture.html.includes("Alpha"));
  assertThrows(
    () => captureTerminalFrame(transcript.slice(0, 100), io.size()),
    TypeError,
  );
  assertThrows(
    () =>
      captureTerminalFrame(
        transcript.replace("Alpha", "\x1b[3AAlpha"),
        io.size(),
      ),
    TypeError,
  );
});
Deno.test("observation passes through all bytes, modes, geometry and subscriptions", async () => {
  const source = new FakeTerminalIO(["x"]);
  const observations: TerminalIOObservation[] = [];
  const io = observeTerminalIO(source, (event) => observations.push(event));
  assertEquals(io.size(), source.size());
  io.setRawMode(true);
  io.write("a\nb");
  assertEquals(await io.read(), new TextEncoder().encode("x"));
  let resized = 0;
  const stop = io.listenResize!(() => resized++);
  source.resize(40, 20);
  stop();
  assertEquals(resized, 1);
  assertEquals(source.resizeListenerCount, 0);
  assertEquals(source.writes, ["a\nb"]);
  assertEquals(observations.map((event) => event.kind), [
    "size",
    "raw",
    "write",
    "read",
    "resize",
  ]);
});
Deno.test("PTY plans validate before launching a command", async () => {
  const base = { command: "must-never-launch", args: [], cwd: "/" };
  await assertRejects(
    () => runPtyProcess({ ...base, geometry: { columns: 0, rows: 1 } }),
    TypeError,
  );
  await assertRejects(
    () =>
      runPtyProcess({
        ...base,
        input: [{ waitFor: "", steps: [{ bytes: "x" }] }],
      }),
    TypeError,
  );
  await assertRejects(
    () =>
      runPtyProcess({
        ...base,
        input: [{
          waitFor: "ready",
          steps: [{ bytes: "\x1b" }, { bytes: "[A" }],
        }],
      }),
    TypeError,
  );
});

Deno.test("observer faults occur before terminal effect ownership changes", () => {
  const source = new FakeTerminalIO([]);
  const io = observeTerminalIO(source, () => {
    throw new Error("diagnostic sink failed");
  });
  assertThrows(() => io.setRawMode(true), Error, "diagnostic sink failed");
  assertThrows(() => io.write("\x1b[?1049h"), Error, "diagnostic sink failed");
  assertEquals(source.rawTransitions, []);
  assertEquals(source.writes, []);
});
