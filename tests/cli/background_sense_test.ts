import { assert, assertEquals, assertRejects } from "@std/assert";
import { senseTerminalBackground } from "../../src/cli/interactive/background.ts";
import { TerminalKeyReader } from "../../src/cli/interactive/keys.ts";
import {
  FakeSignalSource,
  FakeTerminalIO,
} from "../../src/cli/interactive/testing.ts";

const QUERY = "\x1b]11;?\x1b\\";
const NO_HINT = {} as const;

async function until(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("condition never held");
}

async function readAllText(io: FakeTerminalIO): Promise<string> {
  const reader = new TerminalKeyReader(io);
  let text = "";
  while (true) {
    const key = await reader.readKey();
    if (key === null) return text;
    if (key.kind === "text") text += key.text;
  }
}

Deno.test("a reported near-white background reads light with its evidence", async () => {
  const io = new FakeTerminalIO(["\x1b]11;rgb:ffff/ffff/ffff\x1b\\"], {
    columns: 80,
  });
  const reading = await senseTerminalBackground({ io, environment: NO_HINT });
  assertEquals(reading, {
    ground: "light",
    evidence: {
      source: "terminal-report",
      report: "rgb:ffff/ffff/ffff",
      color: { red: 255, green: 255, blue: 255 },
    },
  });
  assertEquals(io.writes, [QUERY], "sensing may only write its query");
  assertEquals(io.rawTransitions, [true, false]);
});

Deno.test("a BEL-terminated rgba report reads dark and ignores alpha", async () => {
  const io = new FakeTerminalIO(["\x1b]11;rgba:0000/0000/0000/ffff\x07"], {
    columns: 80,
  });
  const reading = await senseTerminalBackground({ io, environment: NO_HINT });
  assertEquals(reading.ground, "dark");
  assert(reading.evidence.source === "terminal-report");
  assertEquals(reading.evidence.color, { red: 0, green: 0, blue: 0 });
});

Deno.test("the luminance threshold splits mid-greys at the text-contrast flip", async () => {
  const grey = async (hex: string) => {
    const io = new FakeTerminalIO([`\x1b]11;rgb:${hex}/${hex}/${hex}\x1b\\`], {
      columns: 80,
    });
    return (await senseTerminalBackground({ io, environment: NO_HINT })).ground;
  };
  assertEquals(await grey("8080"), "light");
  assertEquals(await grey("4040"), "dark");
});

Deno.test("a report split across input chunks still parses", async () => {
  const io = new FakeTerminalIO(["\x1b]11;rgb:00", "00/0000/0000\x1b\\"], {
    columns: 80,
  });
  const reading = await senseTerminalBackground({ io, environment: NO_HINT });
  assertEquals(reading.ground, "dark");
});

Deno.test("bytes around the report survive as input for the next reader", async () => {
  const io = new FakeTerminalIO(["ab\x1b]11;rgb:0000/0000/0000\x1b\\cd"], {
    columns: 80,
  });
  const reading = await senseTerminalBackground({ io, environment: NO_HINT });
  assertEquals(reading.ground, "dark");
  assertEquals(await readAllText(io), "abcd");
});

Deno.test("a silent terminal times out into the environment hint", async () => {
  const io = new FakeTerminalIO([], { columns: 80, holdOpen: true });
  const reading = await senseTerminalBackground({
    io,
    environment: { COLORFGBG: "15;0" },
    timeoutMs: 5,
  });
  assertEquals(reading, {
    ground: "dark",
    evidence: { source: "environment-hint", value: "15;0" },
  });
  assertEquals(io.rawTransitions, [true, false]);
  // The abandoned read stays parked: the next reader adopts it instead of
  // racing it, so input typed after the timeout is not stolen.
  io.enqueue("x");
  io.close();
  assertEquals(await readAllText(io), "x");
});

Deno.test("a reply arriving after the deadline never becomes keyboard input", async () => {
  const io = new FakeTerminalIO([], { columns: 80, holdOpen: true });
  await senseTerminalBackground({
    io,
    environment: NO_HINT,
    timeoutMs: 5,
  });

  const text = readAllText(io);
  io.enqueue("\x1b]11;rgb:ffff/ffff/ffff\x1b\\");
  await new Promise((resolve) => setTimeout(resolve, 0));
  io.enqueue("x");
  io.close();
  assertEquals(
    await text,
    "x",
    "the protocol reply must be filtered while later typed input survives",
  );
});

Deno.test("the late-reply filter survives ordinary input and split protocol chunks", async () => {
  const io = new FakeTerminalIO([], { columns: 80, holdOpen: true });
  await senseTerminalBackground({
    io,
    environment: NO_HINT,
    timeoutMs: 5,
  });

  const text = readAllText(io);
  io.enqueue("a");
  await new Promise((resolve) => setTimeout(resolve, 0));
  io.enqueue("\x1b]11;rgb:00");
  await new Promise((resolve) => setTimeout(resolve, 0));
  io.enqueue("00/0000/0000\x1b\\b");
  io.close();
  assertEquals(
    await text,
    "ab",
    "input on either side of a split late report must remain byte-ordered",
  );
});

Deno.test("buffering pre-timeout input cannot orphan the pending raw read", async () => {
  const io = new FakeTerminalIO(["hi"], {
    columns: 80,
    holdOpen: true,
  });
  await senseTerminalBackground({
    io,
    environment: NO_HINT,
    timeoutMs: 5,
  });

  const reader = new TerminalKeyReader(io);
  assertEquals(await reader.readKey(), { kind: "text", text: "h" });
  assertEquals(await reader.readKey(), { kind: "text", text: "i" });
  const next = reader.readKey();
  const fallback = setTimeout(() => io.enqueue("y"), 20);
  io.enqueue("x");
  const key = await next;
  clearTimeout(fallback);
  io.close();
  assertEquals(
    key,
    { kind: "text", text: "x" },
    "the still-pending read must remain behind buffered input and receive the next byte",
  );
});

Deno.test("a silent terminal without a hint stays unknown as a first-class answer", async () => {
  const io = new FakeTerminalIO([], { columns: 80, holdOpen: true });
  const reading = await senseTerminalBackground({
    io,
    environment: NO_HINT,
    timeoutMs: 5,
  });
  assertEquals(reading, {
    ground: "unknown",
    evidence: { source: "none", reason: "unanswered" },
  });
  io.close();
});

Deno.test("unanswering input is parked rather than swallowed", async () => {
  const io = new FakeTerminalIO(["hi"], { columns: 80 });
  const reading = await senseTerminalBackground({ io, environment: NO_HINT });
  assertEquals(reading.evidence, { source: "none", reason: "unanswered" });
  assertEquals(await readAllText(io), "hi");
});

Deno.test("without ANSI control the hint alone answers and nothing is written", async () => {
  const verdicts: [string, string][] = [
    ["15;default;7", "light"],
    ["0;15", "light"],
    ["15;0", "dark"],
    ["7;8", "dark"],
    ["15;12", "unknown"],
    ["boo", "unknown"],
    ["3", "unknown"],
  ];
  for (const [value, ground] of verdicts) {
    const io = new FakeTerminalIO([], { columns: 80, ansiControl: false });
    const reading = await senseTerminalBackground({
      io,
      environment: { COLORFGBG: value },
    });
    assertEquals(reading.ground, ground, `COLORFGBG=${value}`);
    if (ground === "unknown") {
      assertEquals(reading.evidence, {
        source: "none",
        reason: "ansi-control-unavailable",
      });
    } else {
      assertEquals(reading.evidence, { source: "environment-hint", value });
    }
    assertEquals(io.writes, [], "a control-less terminal is never queried");
    assertEquals(io.rawTransitions, []);
  }
});

Deno.test("non-TTY handles are inert and never consult the hint", async () => {
  const io = new FakeTerminalIO([], { columns: 80, interactive: false });
  const reading = await senseTerminalBackground({
    io,
    environment: { COLORFGBG: "15;0" },
  });
  assertEquals(reading, {
    ground: "unknown",
    evidence: { source: "none", reason: "non-interactive" },
  });
  assertEquals(io.writes, []);
  assertEquals(io.rawTransitions, []);
});

Deno.test("an unrecognised report falls back to the hint, then to unknown", async () => {
  const hinted = new FakeTerminalIO(["\x1b]11;#ffffff\x1b\\"], { columns: 80 });
  const viaHint = await senseTerminalBackground({
    io: hinted,
    environment: { COLORFGBG: "15;0" },
  });
  assertEquals(viaHint.ground, "dark");
  assertEquals(viaHint.evidence, {
    source: "environment-hint",
    value: "15;0",
  });

  const unhinted = new FakeTerminalIO(["\x1b]11;#ffffff\x1b\\"], {
    columns: 80,
  });
  const reading = await senseTerminalBackground({
    io: unhinted,
    environment: NO_HINT,
  });
  assertEquals(reading, {
    ground: "unknown",
    evidence: { source: "none", reason: "unrecognised-report" },
  });
});

Deno.test("sensing validates its timeout", async () => {
  const io = new FakeTerminalIO([], { columns: 80 });
  await assertRejects(
    () => senseTerminalBackground({ io, environment: NO_HINT, timeoutMs: 0 }),
    TypeError,
    "positive safe integer",
  );
});

Deno.test("SIGINT during a pending query restores raw mode before re-raising", async () => {
  const io = new FakeTerminalIO([], { columns: 80, holdOpen: true });
  const signals = new FakeSignalSource();
  const pending = senseTerminalBackground({
    io,
    environment: NO_HINT,
    timeoutMs: 5,
    signals,
  });
  await until(() => io.rawTransitions.length === 1);
  signals.deliver();
  assertEquals(signals.raised, 1);
  assertEquals(io.rawTransitions, [true, false]);
  assertEquals(io.writes, [QUERY], "no cursor bytes even under a signal");
  const reading = await pending;
  assertEquals(reading.ground, "unknown");
  io.close();
});
