import { assert, assertEquals, assertThrows } from "@std/assert";
import type {
  TerminalApplicationContext,
  TerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";
import { assertPaintableRow } from "../../src/cli/interactive/painter.ts";
import {
  FakeTerminalIO,
  ManualTerminalClock,
} from "../../src/cli/interactive/testing.ts";
import { runTerminalApplication } from "../../src/cli/interactive/mod.ts";
import {
  applicationDemoView,
  DEMO_JOBS,
  DEMO_KEYMAP,
} from "../../scripts/playground/application.ts";
import {
  demoDeleteSheet,
  demoNewJobForm,
} from "../../scripts/playground/application-layers.ts";
import { ApplicationDriver } from "../fixtures/application-driver.ts";
import { settle } from "../fixtures/application-session.ts";

/** Every C0 and C1 control and every format character, in one string. */
const HOSTILE = (() => {
  let text = "";
  for (let code = 0; code <= 0x10ffff; code += 1) {
    if (code >= 0xd800 && code <= 0xdfff) continue;
    const character = String.fromCodePoint(code);
    if (/[\p{Cc}\p{Cf}]/u.test(character)) text += `a${character}`;
  }
  return `${text}b\r\nc\rd\te\x1b[31mred\x1b]2;title\x07`;
})();

const ARCHIVE = DEMO_JOBS.find((job) => job.id === "photo-archive");

function paintable(driver: ApplicationDriver): void {
  for (const row of driver.last.frame.split("\n")) {
    assertPaintableRow(row, driver.io.size().columns);
  }
}

function formView(): TerminalApplicationView<string> {
  const form = demoNewJobForm();
  return applicationDemoView(DEMO_JOBS, undefined, {
    layers: [{
      ...form,
      fields: form.fields.map((field) =>
        field.kind === "disclosure" ? { ...field, initiallyOpen: true } : field
      ),
    }],
  });
}

Deno.test("text a caller writes into any field paints safely", async (t) => {
  if (ARCHIVE === undefined) throw new Error("the sample lost its archive job");
  const targets = [
    { name: "one-line field", view: formView, layer: "new", field: "title" },
    { name: "multi-line field", view: formView, layer: "new", field: "notes" },
    {
      name: "challenge",
      view: () =>
        applicationDemoView(DEMO_JOBS, undefined, {
          layers: [demoDeleteSheet(ARCHIVE)],
        }),
      layer: "delete",
      field: "confirm",
    },
  ];
  for (const target of targets) {
    for (const colorDepth of ["truecolor", "none"] as const) {
      await t.step(`${target.name} at ${colorDepth}`, () => {
        const driver = new ApplicationDriver(target.view(), {
          columns: 80,
          rows: 40,
          colorDepth,
        });
        driver.input({
          kind: "field",
          layerId: target.layer,
          fieldId: target.field,
          value: HOSTILE,
        });
        paintable(driver);
        const value = driver.state.fields[target.layer]?.[target.field] ?? "";
        const kept = target.field === "notes" ? /[\n‌‍]/gu : /[‌‍]/gu;
        assert(!/[\p{Cc}\p{Cf}]/u.test(value.replace(kept, "")));
        assert(value.includes("[31mred"), "the visible text survives");
        assertEquals(value.includes("\n"), target.field === "notes");
        driver.key("end");
        paintable(driver);
      });
    }
  }
});

Deno.test("a choice field takes only an option that can be chosen", () => {
  const driver = new ApplicationDriver(formView(), { colorDepth: "none" });
  driver.input({
    kind: "field",
    layerId: "new",
    fieldId: "schedule",
    value: "weekly",
  });
  assertEquals(driver.state.fields.new?.schedule, "weekly");
  for (const value of ["fast", "nonexistent"]) {
    assertThrows(
      () =>
        driver.input({
          kind: "field",
          layerId: "new",
          fieldId: "runner",
          value,
        }),
      TypeError,
      "fields.new.runner must name an option that can be chosen",
    );
  }
  driver.input({
    kind: "field",
    layerId: "gone",
    fieldId: "title",
    value: "x",
  });
  assertEquals(
    driver.state.fields.gone,
    undefined,
    "a closed layer is ignored",
  );
});

Deno.test("an editor's tabs and line endings never end the session", async () => {
  const io = new FakeTerminalIO([], { holdOpen: true, columns: 80, rows: 30 });
  let outcome = "running";
  let context: TerminalApplicationContext<string> | undefined;
  const running = runTerminalApplication<string>({
    view: formView(),
    keymap: DEMO_KEYMAP,
    start(live) {
      context = live;
    },
  }, { io, clock: new ManualTerminalClock() }).then(
    () => (outcome = "resolved"),
    (error: Error) => (outcome = `rejected: ${error.message}`),
  );
  await settle();
  context?.setField("new", "title", "Weekly\treport\r\n");
  context?.setField("new", "notes", "first\r\nsecond\tthird");
  await settle();
  assertEquals(outcome, "running");
  assertEquals(context?.state.fields.new?.title, "Weekly report ");
  assertEquals(context?.state.fields.new?.notes, "first\nsecond    third");
  io.enqueue("\x03");
  await running;
  io.close();
});
