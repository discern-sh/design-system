import { assert, assertEquals } from "@std/assert";
import { designTokens } from "../../src/tokens/tokens.ts";
import { stripAnsi } from "../../src/cli/ansi.ts";
import { measureText } from "../../src/cli/text.ts";
import {
  renderInputCli,
  renderMeterCli,
  renderSelectCli,
  renderTextareaCli,
  renderToastCli,
} from "../../src/cli/mod.ts";
import {
  createSequentialForm,
  withDeterminateProgress,
} from "../../src/cli/interactive/mod.ts";
import {
  FakeTerminalIO,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

function authoredMeasureCells(): number {
  const token = designTokens.find(({ name }) => name === "--discern-measure");
  const match = token === undefined
    ? null
    : /^(\d+)ch$/u.exec(token.value.trim());
  const cells = match?.[1] === undefined ? Number.NaN : Number(match[1]);
  assert(Number.isSafeInteger(cells) && cells >= 8, "measure token missing");
  return cells;
}

function widestLine(frame: string): number {
  return Math.max(
    ...stripAnsi(frame).split("\n").map((line) => measureText(line)),
  );
}

Deno.test("prose frames derive from the authored measure while choice frames use available width", async () => {
  const measure = authoredMeasureCells();
  const wide = testTerminalCapabilities({ columns: 200 });

  const select = renderSelectCli({
    kind: "select",
    label: "Pick",
    lifecycle: { status: "active" },
    options: [{ id: "one", label: "One" }],
    highlightedIndex: 0,
  }, wide);
  assertEquals(widestLine(select), wide.columns);

  const input = renderInputCli({
    kind: "text-input",
    label: "Name",
    lifecycle: { status: "active" },
    value: "",
    cursor: 0,
  }, wide);
  assertEquals(widestLine(input), measure);

  const textarea = renderTextareaCli({
    kind: "textarea",
    label: "Notes",
    lifecycle: { status: "active" },
    value: "",
    cursor: 0,
    rows: 5,
  }, wide);
  assertEquals(widestLine(textarea), measure);

  const toast = renderToastCli({ message: "Saved.", tone: "success" }, wide);
  assertEquals(widestLine(toast), measure);

  const meter = renderMeterCli({
    kind: "determinate-progress",
    label: "Work",
    lifecycle: { status: "active" },
    completed: 1,
    total: 4,
  }, wide);
  assertEquals(widestLine(meter), measure);

  const progressIo = new FakeTerminalIO([], { columns: 200 });
  await withDeterminateProgress(
    { label: "Work", total: 2, io: progressIo },
    (progress) => progress.advance(),
  );
  const progressWidths = progressIo.writes.map((write) => widestLine(write));
  assert(
    progressWidths.every((width) => width <= measure),
    "progress painted wider than the authored measure",
  );
  assert(
    progressWidths.includes(measure),
    "no progress frame reached the authored measure",
  );

  const formIo = new FakeTerminalIO([], { columns: 200 });
  await createSequentialForm({ label: "Setup", io: formIo })
    .add({ id: "step", label: "Step", run: () => true })
    .submit();
  assert(
    widestLine(formIo.output()) <= measure,
    "sequential form painted wider than the authored measure",
  );
});

Deno.test("default frame widths clamp to narrower terminals", () => {
  const narrow = testTerminalCapabilities({ columns: 40 });
  const select = renderSelectCli({
    kind: "select",
    label: "Pick",
    lifecycle: { status: "active" },
    options: [{ id: "one", label: "One" }],
    highlightedIndex: 0,
  }, narrow);
  assertEquals(widestLine(select), 40);
});
