import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  measureText,
  resolveTerminalTheme,
  stripAnsi,
  terminalTextToneColor,
} from "../../src/cli/mod.ts";
import {
  type ApplicationButton,
  type ApplicationLayer,
  type ApplicationSheet,
  type TerminalApplicationEffect,
  terminalApplicationLayerKeys,
  type TerminalApplicationView,
  validateTerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";
import { TERMINAL_KEY_SEQUENCES } from "../../src/cli/interactive/testing.ts";
import {
  isTextControl,
  tabOrder,
} from "../../src/cli/interactive/application/layer-controls.ts";
import { decodableChord } from "../../src/cli/interactive/application/keymap.ts";
import {
  APPLICATION_REVIEW_SIZES,
  applicationDemoView,
  DEMO_JOBS,
  DEMO_KEYMAP,
  type DemoJob,
} from "../../scripts/playground/application.ts";
import {
  demoActionsMenu,
  demoDeleteSheet,
  demoKeysReader,
  demoLogReader,
  demoNewJobForm,
  demoPalette,
  demoRunSheet,
} from "../../scripts/playground/application-layers.ts";
import { ApplicationDriver } from "../fixtures/application-driver.ts";

function job(id: string): DemoJob {
  const found = DEMO_JOBS.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no sample job ${id}`);
  return found;
}

const IMAGE = job("image-resize");
const ARCHIVE = job("photo-archive");

function withLayers(
  ...layers: readonly ApplicationLayer<string>[]
): TerminalApplicationView<string> {
  return applicationDemoView(DEMO_JOBS, undefined, { layers });
}

/** Sheets and forms that ask before an effect, with their consequential actions. */
const PANELS: readonly (() => ApplicationLayer<string>)[] = [
  () => demoRunSheet(IMAGE),
  () => demoDeleteSheet(ARCHIVE),
  () => demoNewJobForm(),
  () => demoRunSheet(IMAGE, "working", { startedAt: 0, now: 11_000 }),
];

function consequential(layer: ApplicationLayer<string>): ReadonlySet<string> {
  if (layer.kind !== "sheet" && layer.kind !== "form") return new Set();
  return new Set(
    layer.buttons.flatMap((button) =>
      (button.role === "confirm" || button.role === "destructive") &&
        button.action !== undefined
        ? [button.action]
        : []
    ),
  );
}

function actions(effects: readonly TerminalApplicationEffect<string>[]) {
  return effects.flatMap((effect) =>
    effect.kind === "action" ? [effect.action] : []
  );
}

function dismissals(effects: readonly TerminalApplicationEffect<string>[]) {
  return effects.flatMap((effect) =>
    effect.kind === "dismiss" && "layer" in effect.target
      ? [`${effect.target.layer}:${effect.via}`]
      : []
  );
}

/** A driver showing one layer, with focus moved by Tab `steps` times. */
function focused(
  layer: ApplicationLayer<string>,
  steps: number,
  options: { readonly columns?: number; readonly rows?: number } = {},
): ApplicationDriver {
  const driver = new ApplicationDriver(withLayers(layer), options);
  for (let step = 0; step < steps; step += 1) driver.key("tab");
  driver.take();
  return driver;
}

function controls(layer: ApplicationLayer<string>): number {
  return Math.max(1, tabOrder(layer, () => false).length);
}

Deno.test("Enter on open never confirms", () => {
  for (const build of PANELS) {
    const layer = build();
    const driver = focused(layer, 0);
    driver.key("enter");
    const effects = driver.take();
    for (const action of actions(effects)) {
      assert(
        !consequential(layer).has(action),
        `${layer.id} confirmed ${action} on open`,
      );
    }
  }
  const sheet = focused(demoRunSheet(IMAGE), 0);
  sheet.key("enter");
  assertEquals(dismissals(sheet.take()), ["run:safe"]);
  const challenge = focused(demoDeleteSheet(ARCHIVE), 0);
  assertEquals(challenge.state.focusedControlId, "delete:field:confirm");
  challenge.key("enter");
  assertEquals(challenge.take(), []);
  assertEquals(challenge.state.focusedControlId, "delete:button:keep");
});

Deno.test("Escape is the safe choice from every control", () => {
  for (const build of PANELS) {
    const layer = build();
    for (let steps = 0; steps < controls(layer); steps += 1) {
      const driver = focused(layer, steps);
      driver.key("escape");
      const effects = driver.take();
      assertEquals(actions(effects), [], `${layer.id} after ${steps} tabs`);
      assertEquals(dismissals(effects), [`${layer.id}:escape`]);
      assertEquals(driver.state.topLayerId, undefined, "hidden at once");
    }
  }
  for (const layer of [demoActionsMenu(IMAGE), demoKeysReader()]) {
    const driver = focused(layer, 0);
    driver.key("escape");
    assertEquals(dismissals(driver.take()), [`${layer.id}:escape`]);
  }
});

Deno.test("letters never activate a confirm or destructive button", () => {
  const letters = Array.from(
    { length: 0x7e - 0x20 },
    (_, index) => String.fromCharCode(0x21 + index),
  );
  // Each letter in turn, from every control: letters may toggle disclosures
  // or type into a field, but never reach a confirm or destructive action.
  for (const build of PANELS) {
    const layer = build();
    for (let steps = 0; steps < controls(layer); steps += 1) {
      const driver = focused(layer, 0);
      if (layer.kind === "sheet" && layer.challenge !== undefined) {
        driver.type(layer.challenge.mustEqual);
      }
      for (let step = 0; step < steps; step += 1) driver.key("tab");
      const focus = driver.state.focusedControlId;
      driver.take();
      for (const letter of letters) {
        driver.key(letter);
        for (const action of actions(driver.take())) {
          assert(
            !consequential(layer).has(action),
            `${letter} ran ${action} in ${layer.id} from ${focus}`,
          );
        }
      }
    }
  }
  const keyed = withLayers({
    ...demoRunSheet(IMAGE),
    buttons: [
      { id: "keep", label: "Keep", role: "safe" },
      // The type refuses this; the runtime rule protects untyped callers.
      untyped<ApplicationButton<string>>({
        id: "run",
        label: "Run",
        role: "confirm",
        action: "run",
        key: "r",
      }),
    ],
  });
  assert(
    validateTerminalApplicationView(keyed).some((issue) =>
      issue.path === "layers[0].buttons[1].key"
    ),
  );
});

/** A value an untyped caller could pass, to test the rules that guard it. */
function untyped<T>(value: unknown): T {
  return value as T;
}

Deno.test("every disclosure is one key from the initial focus", () => {
  for (const build of PANELS) {
    const layer = build();
    if (layer.kind !== "sheet" && layer.kind !== "form") continue;
    for (const disclosure of layer.disclosures ?? []) {
      const driver = focused(layer, 0);
      const initial = driver.state.layers[layer.id]?.focusedControlId ?? "";
      const inField = initial.startsWith("field:");
      const key = inField ? disclosure.fieldKey : disclosure.key;
      assert(key !== undefined, `${layer.id} ${disclosure.id} has no key`);
      driver.key(decodableChord(key) ?? key);
      assert(
        driver.state.layers[layer.id]?.open.includes(disclosure.id),
        `${disclosure.id} did not open from ${initial}`,
      );
    }
  }
  const missing = withLayers({
    ...demoDeleteSheet(ARCHIVE),
    disclosures: [{ id: "plan", label: "Plan", key: "d", content: [] }],
  });
  assert(
    validateTerminalApplicationView(missing).some((issue) =>
      issue.path === "layers[0].disclosures[0].fieldKey"
    ),
  );
});

Deno.test("confirm stays disabled while a sheet is loading, changed, or gone", () => {
  for (const state of ["loading", "changed", "gone"] as const) {
    const driver = new ApplicationDriver(
      withLayers(demoRunSheet(IMAGE, state)),
      { colorDepth: "none" },
    );
    assert(driver.text.includes("( Run )"), `${state} shows Run disabled`);
    driver.key("right");
    assert(
      driver.text.includes("›(Run)‹"),
      `${state} keeps focus distinct from permission`,
    );
    driver.key("enter");
    assertEquals(actions(driver.take()), [], state);
  }
  const ready = new ApplicationDriver(withLayers(demoRunSheet(IMAGE)), {
    colorDepth: "none",
  });
  ready.key("right", "enter");
  assertEquals(actions(ready.take()), ["confirm-run:image-resize"]);
});

Deno.test("a body that does not fit must be read before confirming", () => {
  const driver = new ApplicationDriver(withLayers(demoRunSheet(IMAGE)), {
    columns: 80,
    rows: 13,
    colorDepth: "none",
  });
  assertEquals(driver.state.fullyRead.run, false);
  assert(driver.text.includes("PgDn to read before running"));
  driver.key("right", "enter");
  assertEquals(actions(driver.take()), []);
  driver.key("page-down", "page-down");
  assertEquals(driver.state.fullyRead.run, true);
  driver.key("page-up", "page-up", "enter");
  assertEquals(
    actions(driver.take()),
    ["confirm-run:image-resize"],
    "the read gate lifts once per review",
  );
  driver.update(withLayers(demoRunSheet(IMAGE, "loading")));
  assertEquals(driver.state.fullyRead.run, false, "a new review resets it");
});

Deno.test("the challenge enables its destructive button on an exact match only", () => {
  const sheet = demoDeleteSheet(ARCHIVE);
  const mustEqual = sheet.challenge?.mustEqual ?? "";
  const attempts: readonly (readonly [string, boolean])[] = [
    [mustEqual.slice(0, -1), false],
    [mustEqual.toUpperCase(), false],
    [`${mustEqual} `, false],
    [` ${mustEqual}`, false],
    [mustEqual, true],
  ];
  for (const [typed, enabled] of attempts) {
    const driver = new ApplicationDriver(withLayers(sheet), {
      colorDepth: "none",
    });
    driver.type(typed);
    assertEquals(driver.state.fields.delete?.confirm, typed);
    assert(
      driver.text.includes(enabled ? "[ Delete ]" : "( Delete )"),
      JSON.stringify(typed),
    );
    driver.key("enter", "right", "enter");
    assertEquals(
      actions(driver.take()),
      enabled ? ["confirm-delete:photo-archive"] : [],
      JSON.stringify(typed),
    );
  }
});

Deno.test("a view that keeps a dismissed layer is refused", () => {
  const view = withLayers(demoRunSheet(IMAGE));
  const driver = new ApplicationDriver(view);
  driver.key("escape");
  assertEquals(dismissals(driver.take()), ["run:escape"]);
  assertEquals(driver.state.topLayerId, undefined);
  assertThrows(() => driver.update(view), TypeError, "dismissed");
  assertEquals(driver.state.dismissed.layers, ["run"], "pending until omitted");
  assert(
    validateTerminalApplicationView(view, { state: driver.state }).some((
      issue,
    ) => issue.path === "layers[0].id"),
    "a caller can check its next view against the package's state",
  );
  driver.update(withLayers());
  driver.update(view);
  assertEquals(driver.state.topLayerId, "run", "a later view may reopen it");
});

Deno.test("closing a layer restores the one beneath with its remembered position", () => {
  const palette = demoPalette(DEMO_JOBS, false);
  const driver = new ApplicationDriver(withLayers(palette));
  driver.type("run");
  driver.key("down");
  const before = driver.state.layers.palette;
  driver.update(withLayers(palette, demoKeysReader()));
  assertEquals(driver.state.topLayerId, "keys");
  driver.key("down", "escape");
  assertEquals(dismissals(driver.take()), ["keys:escape"]);
  assertEquals(driver.state.topLayerId, "palette");
  driver.update(withLayers(palette));
  assertEquals(driver.state.layers.palette, before);
  assertEquals(driver.state.focusedControlId, "palette:input");
});

Deno.test("view updates keep the layer and its focus", () => {
  const driver = new ApplicationDriver(withLayers(demoRunSheet(IMAGE)));
  driver.key("right");
  assertEquals(driver.state.focusedControlId, "run:button:run");
  const changed: ApplicationSheet<string> = {
    ...demoRunSheet(IMAGE, "changed"),
    banner: {
      tone: "warning",
      runs: [{ text: "Changed since you opened this" }],
    },
  };
  driver.update(withLayers(changed));
  assertEquals(driver.state.focusedControlId, "run:button:run");
  assert(driver.text.includes("Changed since you opened this"));
  const fewer: ApplicationSheet<string> = {
    ...changed,
    buttons: [{ id: "close", label: "Close", role: "safe" }],
  };
  driver.update(withLayers(fewer));
  assertEquals(
    driver.state.focusedControlId,
    "run:button:close",
    "a vanished control gives focus back to the initial one",
  );
});

Deno.test("menus read down the first column, then the second, and letters run items", () => {
  const menu = demoActionsMenu(IMAGE);
  const driver = new ApplicationDriver(withLayers(menu));
  const order = [driver.state.layers.actions?.focusedControlId];
  for (let step = 0; step < 7; step += 1) {
    driver.key("down");
    order.push(driver.state.layers.actions?.focusedControlId);
  }
  assertEquals(order, [
    "item:run",
    "item:log",
    "item:folder",
    "item:schedule",
    "item:pause",
    "unavailable:calendar",
    "item:delete",
    "unavailable",
  ]);
  driver.key("tab");
  assertEquals(driver.state.layers.actions?.focusedControlId, "unavailable");
  driver.key("shift-tab");
  assertEquals(driver.state.layers.actions?.focusedControlId, "item:delete");
  driver.take();
  driver.key("l");
  assertEquals(actions(driver.take()), ["log:image-resize"]);
});

Deno.test("a section's own unavailable item sits inline with its reason and never runs", () => {
  const driver = new ApplicationDriver(withLayers(demoActionsMenu(IMAGE)), {
    colorDepth: "none",
  });
  assert(driver.text.includes("× Add to calendar  no calendar"));
  assert(driver.text.includes("Changes apply from the next run."));
  driver.key("down", "down", "down", "down", "down");
  assertEquals(
    driver.state.layers.actions?.focusedControlId,
    "unavailable:calendar",
  );
  driver.take();
  driver.key("enter");
  assertEquals(actions(driver.take()), [], "it explains itself, never runs");
});

Deno.test("an unavailable menu item explains itself on Enter and never runs", () => {
  const driver = new ApplicationDriver(withLayers(demoActionsMenu(IMAGE)), {
    columns: 120,
    rows: 30,
  });
  driver.key("end", "enter", "down");
  assertEquals(
    driver.state.layers.actions?.focusedControlId,
    "unavailable:resume",
  );
  assert(!driver.text.includes("the job is not paused"));
  driver.take();
  driver.key("enter");
  assertEquals(driver.take(), []);
  assert(
    driver.text.includes("Resume isn't available: the job is not paused."),
  );
});

Deno.test("a menu filter narrows its items and Escape clears it before closing", () => {
  const driver = new ApplicationDriver(withLayers(demoActionsMenu(IMAGE)));
  driver.key("/").type("pau");
  assertEquals(driver.state.layers.actions?.focusedControlId, "filter");
  assertEquals(driver.state.layers.actions?.query, "pau");
  driver.take();
  driver.key("enter");
  assertEquals(actions(driver.take()), ["pause:image-resize"]);
  driver.key("escape");
  assertEquals(driver.state.layers.actions?.query, "");
  assertEquals(driver.take(), []);
  driver.key("escape");
  assertEquals(dismissals(driver.take()), ["actions:escape"]);
});

Deno.test("the palette ranks matches while typing and Escape clears before it closes", () => {
  const driver = new ApplicationDriver(
    withLayers(demoPalette(DEMO_JOBS, false)),
  );
  driver.type("mail");
  assertEquals(driver.state.layers.palette?.highlightedId, "next-mail-digest");
  driver.take();
  driver.key("enter");
  assertEquals(actions(driver.take()), ["rerun:mail-digest"]);
  driver.key("escape");
  assertEquals(driver.state.layers.palette?.query, "");
  assertEquals(driver.take(), []);
  driver.key("escape");
  assertEquals(dismissals(driver.take()), ["palette:escape"]);
});

Deno.test("forms cycle with Tab, move to the safe button on Enter, and report fields first", () => {
  const driver = new ApplicationDriver(withLayers(demoNewJobForm()), {
    colorDepth: "none",
  });
  assertEquals(driver.state.focusedControlId, "new:field:title");
  driver.key("tab", "tab", "tab", "tab", "tab");
  assertEquals(driver.state.focusedControlId, "new:button:create");
  driver.take();
  driver.key("enter");
  assertEquals(actions(driver.take()), [], "Create needs its required title");
  driver.key("tab", "tab");
  assertEquals(driver.state.focusedControlId, "new:field:title", "Tab wraps");
  driver.type("Weekly");
  const fields = driver.take().filter((effect) => effect.kind === "field");
  assertEquals(fields.at(-1), {
    kind: "field",
    layerId: "new",
    fieldId: "title",
    value: "Weekly",
  });
  driver.key("enter");
  assertEquals(driver.state.focusedControlId, "new:button:cancel");
  driver.key("right", "enter");
  assertEquals(actions(driver.take()), ["create"]);
});

Deno.test("choice fields move between options and skip disabled ones", () => {
  const driver = new ApplicationDriver(withLayers(demoNewJobForm()));
  driver.key("tab", "enter");
  assert(driver.state.layers.new?.open.includes("options"));
  driver.key("tab");
  assertEquals(driver.state.focusedControlId, "new:field:schedule");
  driver.take();
  driver.key("right");
  assertEquals(driver.state.fields.new?.schedule, "weekly");
  assertEquals(driver.take().map((effect) => effect.kind), ["field"]);
  driver.key("tab", "tab");
  assertEquals(driver.state.focusedControlId, "new:field:runner");
  driver.key("right");
  assertEquals(driver.state.fields.new?.runner, "default");
});

Deno.test("the caller writes a field back after an external editor", () => {
  const driver = new ApplicationDriver(withLayers(demoNewJobForm()));
  driver.key("tab", "enter", "tab", "tab");
  assertEquals(driver.state.focusedControlId, "new:field:notes");
  driver.take();
  driver.key("ctrl-o");
  assertEquals(actions(driver.take()), ["edit-notes"]);
  driver.input({
    kind: "field",
    layerId: "new",
    fieldId: "notes",
    value: "Written elsewhere.",
  });
  assertEquals(driver.state.fields.new?.notes, "Written elsewhere.");
});

Deno.test("readers move between their rows and open them", () => {
  const driver = new ApplicationDriver(withLayers(demoLogReader(IMAGE)));
  assertEquals(driver.state.focusedControlId, "log:rows");
  assertEquals(driver.state.lists.outputs?.selectedId, "summary.csv");
  driver.take();
  driver.key("down");
  assertEquals(driver.state.lists.outputs?.selectedId, "thumbnails/");
  assertEquals(driver.take(), [{
    kind: "selection-change",
    listId: "outputs",
    itemId: "thumbnails/",
  }]);
  driver.key("enter", "o");
  assertEquals(actions(driver.take()), [
    "open:thumbnails/",
    "run:image-resize",
  ]);
});

/** Keys a layer gives meaning to beyond its kind's navigation. */
function declaredKeys(layer: ApplicationLayer<string>): ReadonlySet<string> {
  const keys: (string | undefined)[] = [];
  if (layer.kind === "sheet" || layer.kind === "form") {
    for (const disclosure of layer.disclosures ?? []) {
      keys.push(disclosure.key, disclosure.fieldKey);
    }
    for (const button of layer.buttons) keys.push(button.key);
  }
  if (layer.kind === "menu") {
    for (const section of layer.sections) {
      for (const item of section.items) keys.push(item.key);
    }
    for (const item of layer.unavailable?.items ?? []) keys.push(item.key);
  }
  if (layer.kind === "reader") {
    for (const hint of layer.keys ?? []) {
      if (typeof hint.key === "string") keys.push(hint.key);
    }
  }
  return new Set(
    keys.flatMap((key) =>
      key === undefined ? [] : [decodableChord(key) ?? key]
    ),
  );
}

Deno.test("every key a layer acts on outside a text field is reserved or declared", () => {
  const keys: readonly string[] = [
    ...Object.keys(TERMINAL_KEY_SEQUENCES),
    ...Array.from(
      { length: 0x7e - 0x20 },
      (_, index) => String.fromCharCode(0x21 + index),
    ),
    "space",
  ];
  // Prepared states put focus on each kind of non-text control.
  const prepared: readonly (readonly [
    ApplicationLayer<string>,
    readonly string[],
  ])[] = [
    [demoRunSheet(IMAGE), []],
    [demoRunSheet(IMAGE), ["page-down"]],
    [demoRunSheet(IMAGE), ["right"]],
    [demoRunSheet(IMAGE), ["tab", "tab"]],
    [demoRunSheet(IMAGE), ["tab"]],
    [demoDeleteSheet(ARCHIVE), ["tab", "tab", "tab"]],
    [demoNewJobForm(), ["tab"]],
    [demoNewJobForm(), ["tab", "enter", "tab"]],
    [demoNewJobForm(), ["tab", "tab", "tab"]],
    [demoActionsMenu(IMAGE), []],
    [demoActionsMenu(IMAGE), ["end"]],
    [demoKeysReader(), []],
    [demoKeysReader(), ["page-down"]],
    [demoLogReader(IMAGE), []],
    [demoLogReader(IMAGE), ["down"]],
  ];
  const handled = new Map<string, Set<string>>();
  for (const [layer, steps] of prepared) {
    for (const key of keys) {
      const driver = new ApplicationDriver(withLayers(layer), {
        rows: 13,
      });
      driver.key(...steps);
      const focus = driver.state.layers[layer.id]?.focusedControlId ?? "";
      if (isTextControl(layer, focus)) continue;
      const before = JSON.stringify(driver.state);
      driver.take();
      driver.key(key);
      const effects = driver.take().filter((effect) =>
        effect.kind !== "selection-change"
      );
      if (JSON.stringify(driver.state) === before && effects.length === 0) {
        continue;
      }
      const kind = handled.get(layer.kind) ?? new Set();
      kind.add(key);
      handled.set(layer.kind, kind);
      const reserved = new Set<string>(terminalApplicationLayerKeys(layer));
      assert(
        reserved.has(key) || declaredKeys(layer).has(key) || key === "ctrl-c",
        `${layer.id} acts on ${key} from ${focus}, but neither reserves nor declares it`,
      );
    }
  }
  for (
    const layer of [
      demoRunSheet(IMAGE),
      demoNewJobForm(),
      demoActionsMenu(IMAGE),
      demoKeysReader(),
    ]
  ) {
    for (const key of terminalApplicationLayerKeys(layer)) {
      assert(
        handled.get(layer.kind)?.has(key) === true,
        `${layer.kind} reserves ${key} but no prepared state acts on it`,
      );
    }
  }
});

Deno.test("the layer rules report every broken rule as data", () => {
  const sheet = demoRunSheet(IMAGE);
  const cases: readonly (readonly [string, TerminalApplicationView<string>])[] =
    [
      [
        "layers",
        withLayers(sheet, demoKeysReader(), demoPalette(DEMO_JOBS, false)),
      ],
      ["layers[1].id", withLayers(sheet, { ...demoKeysReader(), id: "run" })],
      [
        "layers[0].buttons",
        withLayers({
          ...sheet,
          buttons: [
            { id: "a", label: "A", role: "safe" },
            { id: "b", label: "B", role: "safe" },
          ],
        }),
      ],
      [
        "layers[0].buttons[1].action",
        withLayers({
          ...sheet,
          buttons: [
            { id: "keep", label: "Keep", role: "safe" },
            untyped<ApplicationButton<string>>({
              id: "run",
              label: "Run",
              role: "confirm",
            }),
          ],
        }),
      ],
      [
        "layers[0].buttons[1].requiresChallenge",
        withLayers({
          ...sheet,
          buttons: [
            { id: "keep", label: "Keep", role: "safe" },
            {
              id: "run",
              label: "Run",
              role: "destructive",
              action: "run",
              requiresChallenge: true,
            },
          ],
        }),
      ],
      [
        "layers[0].disclosures[1].key",
        withLayers({
          ...sheet,
          disclosures: [
            { id: "a", label: "A", key: "d", content: [] },
            { id: "b", label: "B", key: "d", content: [] },
          ],
        }),
      ],
      [
        "layers[0].disclosures[0].key",
        withLayers({
          ...sheet,
          disclosures: [{ id: "a", label: "A", key: "enter", content: [] }],
        }),
      ],
      [
        "layers[0].unavailable.items[0].id",
        withLayers({
          ...demoActionsMenu(IMAGE),
          unavailable: {
            title: "Unavailable",
            items: [{ id: "run", label: "Run", sentence: "Not now." }],
          },
        }),
      ],
      [
        "layers[0].initialItemId",
        withLayers({ ...demoActionsMenu(IMAGE), initialItemId: "resume" }),
      ],
      [
        "layers[0].fields[1].fields[1].editor.key",
        withLayers({
          ...demoNewJobForm(),
          fields: demoNewJobForm().fields.map((field) =>
            field.kind === "group"
              ? {
                ...field,
                fields: field.fields.map((inner) =>
                  inner.kind === "text"
                    ? { ...inner, editor: { key: "e", action: "edit" } }
                    : inner
                ),
              }
              : field
          ),
        }),
      ],
    ];
  const log = demoLogReader(IMAGE);
  const shared = withLayers({
    ...log,
    rows: log.rows === undefined ? undefined : { ...log.rows, id: "jobs" },
  } as ApplicationLayer<string>);
  for (
    const [path, view] of [...cases, ["layers[0].rows.id", shared] as const]
  ) {
    const issues = validateTerminalApplicationView(view);
    assert(
      issues.some((issue) => issue.path === path),
      `${path} not reported; got ${JSON.stringify(issues)}`,
    );
  }
  for (const build of [...PANELS, () => demoActionsMenu(IMAGE)]) {
    assertEquals(
      validateTerminalApplicationView(withLayers(build()), {
        keymap: DEMO_KEYMAP,
      }),
      [],
    );
  }
  const keymap = [
    { key: "up", action: "up", scope: { layer: "run" } },
    { key: "x", action: "x", scope: { layer: "palette" } },
  ];
  const issues = validateTerminalApplicationView(withLayers(sheet), { keymap });
  assert(issues.some((issue) => issue.path === "keymap.run.up"));
  assert(
    validateTerminalApplicationView(
      withLayers(demoPalette(DEMO_JOBS, false)),
      { keymap },
    ).some((issue) => issue.path === "keymap.palette.x"),
  );
});

Deno.test("no single key reaches a confirm or destructive action around its gates", () => {
  const run = demoRunSheet(IMAGE, "loading");
  const confirm = run.buttons.find((button) => button.role === "confirm");
  assert(confirm?.action !== undefined);
  const bound = validateTerminalApplicationView(withLayers(run), {
    keymap: [{ key: "y", action: confirm.action, scope: { layer: "run" } }],
  });
  assert(
    bound.some((issue) => issue.path === "keymap.run.y"),
    JSON.stringify(bound),
  );
  const deleting = demoDeleteSheet(ARCHIVE);
  const destructive = deleting.buttons.find((button) =>
    button.role === "destructive"
  );
  assert(destructive?.action !== undefined);
  const destroy = destructive.action;
  const alternative = validateTerminalApplicationView(withLayers({
    ...deleting,
    buttons: deleting.buttons.map((button) =>
      button.role === "alternative" ? { ...button, action: destroy } : button
    ),
  }));
  assert(
    alternative.some((issue) =>
      issue.path.endsWith(".action") &&
      issue.message.includes("without its gates")
    ),
    JSON.stringify(alternative),
  );
  const form = demoNewJobForm();
  const create = form.buttons.find((button) => button.role === "confirm");
  assert(create?.action !== undefined);
  const created = create.action;
  const editor = validateTerminalApplicationView(withLayers({
    ...form,
    fields: form.fields.map((field) =>
      field.kind === "group"
        ? {
          ...field,
          fields: field.fields.map((inner) =>
            inner.kind === "text" && inner.editor !== undefined
              ? { ...inner, editor: { ...inner.editor, action: created } }
              : inner
          ),
        }
        : field
    ),
  }));
  assert(
    editor.some((issue) => issue.path.endsWith(".editor")),
    JSON.stringify(editor),
  );
});

const LAYERS: readonly (() => ApplicationLayer<string>)[] = [
  ...PANELS,
  () => demoActionsMenu(IMAGE),
  () => demoPalette(DEMO_JOBS, false),
  () => demoKeysReader(),
  () => demoLogReader(IMAGE),
];

Deno.test("layered frames fill every geometry and posture exactly", () => {
  for (const size of APPLICATION_REVIEW_SIZES) {
    for (const build of LAYERS) {
      for (
        const posture of [
          { colorDepth: "truecolor", unicode: true },
          { colorDepth: "none", unicode: false },
        ] as const
      ) {
        const layer = build();
        const driver = new ApplicationDriver(withLayers(layer), {
          ...size,
          ...posture,
        });
        driver.key("down");
        const lines = driver.last.frame.split("\n");
        assertEquals(lines.length, size.rows, `${layer.id} ${size.columns}`);
        for (const line of lines) {
          assertEquals(
            measureText(line),
            size.columns,
            `${layer.id} at ${size.columns}x${size.rows}`,
          );
        }
      }
    }
  }
});

Deno.test("a bottom layer keeps the selected item in view above it", () => {
  for (
    const size of [{ columns: 80, rows: 24 }, { columns: 80, rows: 13 }, {
      columns: 60,
      rows: 20,
    }]
  ) {
    for (
      const build of [() => demoRunSheet(IMAGE), () => demoActionsMenu(IMAGE)]
    ) {
      const driver = new ApplicationDriver(applicationDemoView(), size);
      driver.key("down");
      assertEquals(driver.state.lists.jobs?.selectedId, "image-resize");
      driver.update(withLayers(build()));
      const lines = driver.text.split("\n");
      const top = lines.findIndex((line) =>
        line.includes("Run Image resize again?") ||
        line.includes("Actions · 6 of 8")
      );
      assert(top > 0, `${size.columns}x${size.rows} shows no layer`);
      assert(
        lines.slice(0, top).some((line) => line.includes("Image resize")),
        `the selected row hides beneath the layer at ${size.columns}x${size.rows}`,
      );
    }
  }
});

Deno.test("on wide screens a layer occupies the detail column beside the list", () => {
  const driver = new ApplicationDriver(
    withLayers(demoRunSheet(IMAGE)),
    { columns: 120, rows: 30 },
  );
  const lines = driver.text.split("\n");
  const title = lines.findIndex((line) =>
    line.includes("Run Image resize again?")
  );
  assert(title > 0);
  assert(
    (lines[title] ?? "").includes("Quarterly report") ||
      (lines[title] ?? "").includes("Ready"),
  );
  const narrow = new ApplicationDriver(withLayers(demoRunSheet(IMAGE)), {
    columns: 40,
    rows: 20,
  });
  assert(
    !narrow.text.includes("Quarterly report"),
    "narrow layers take the body",
  );
});

Deno.test("mouse input reaches the model only while the view asks for it", () => {
  const view = applicationDemoView();
  const driver = new ApplicationDriver(view, { columns: 120, rows: 30 });
  const mail = driver.find("Mail digest");
  driver.click(mail.column, mail.row);
  assertEquals(driver.state.lists.jobs?.selectedId, "quarterly-report");
  driver.update({ ...view, input: { mouse: true } });
  assert(driver.text.includes("Shift-drag to select text"));
  driver.click(mail.column, mail.row);
  assertEquals(driver.state.lists.jobs?.selectedId, "mail-digest");
  assert(
    !driver.text.includes("Shift-drag"),
    "the hint goes at the first input",
  );
});

Deno.test("a click on a header chip runs its action", () => {
  const view = applicationDemoView();
  const chipped: TerminalApplicationView<string> = {
    ...view,
    header: {
      ...view.header,
      chips: [
        { runs: [{ text: "! 2 waiting", tone: "warning" }], action: "waiting" },
        { runs: [{ text: "plain" }] },
      ],
    },
    input: { mouse: true },
  };
  const driver = new ApplicationDriver(chipped, { columns: 120, rows: 30 });
  driver.take();
  const chip = driver.find("2 waiting");
  driver.click(chip.column, chip.row);
  assertEquals(driver.take().filter((effect) => effect.kind === "action"), [{
    kind: "action",
    action: "waiting",
    source: "chip",
  }]);
  const plain = driver.find("plain");
  driver.click(plain.column, plain.row);
  assertEquals(driver.take(), [], "a chip without an action is not clickable");
});

Deno.test("a click outside the top layer dismisses only that layer", () => {
  const driver = new ApplicationDriver(
    {
      ...withLayers(demoPalette(DEMO_JOBS, false), demoRunSheet(IMAGE)),
      input: { mouse: true },
    },
    { columns: 120, rows: 30 },
  );
  driver.take();
  driver.click(4, 1);
  assertEquals(dismissals(driver.take()), ["run:click-outside"]);
  assertEquals(driver.state.topLayerId, "palette");
});

Deno.test("a two-click confirmation starts over after any other click or a new review", async (t) => {
  /** The sheets whose consequential buttons take two clicks, each with its button's text. */
  const cases = [
    {
      sheet: () => demoRunSheet(IMAGE),
      button: "Run",
      action: "confirm-run:image-resize",
    },
  ] as const;
  for (const entry of cases) {
    const open = () => {
      const driver = new ApplicationDriver(
        applicationDemoView(DEMO_JOBS, undefined, {
          layers: [entry.sheet()],
          mouse: true,
        }),
        { columns: 80, rows: 24, colorDepth: "none" },
      );
      const target = driver.find(`[ ${entry.button} ]`);
      const button = { column: target.column + 2, row: target.row };
      driver.click(button.column, button.row);
      assertEquals(driver.actions(), [], "the first click only focuses");
      return { driver, button };
    };
    // Every other clickable control the open sheet shows, enumerated from
    // the frame's own hit regions so a new control enrols itself.
    const sheet = entry.sheet();
    const own = `button:${
      sheet.buttons.find((candidate) => candidate.label === entry.button)?.id
    }`;
    const { driver: survey } = open();
    const others = survey.hits.filter((hit) =>
      hit.target.kind === "control" && hit.target.control !== own
    );
    assert(others.length > 0);
    for (const hit of others) {
      if (hit.target.kind !== "control") continue;
      const control = hit.target.control;
      await t.step(`${entry.button} then ${control}`, () => {
        const { driver } = open();
        driver.click(hit.start + 1, hit.row + 1);
        if (driver.state.topLayerId !== "run") return;
        // The button may have moved, as when a disclosure opened.
        const again = driver.hits.find((candidate) =>
          candidate.target.kind === "control" &&
          candidate.target.control === own
        );
        if (again === undefined) return;
        driver.take();
        driver.click(again.start + 1, again.row + 1);
        assert(
          !driver.actions().includes(entry.action),
          `one click on ${entry.button} ran it after ${control}`,
        );
      });
    }
    await t.step(`${entry.button} across a new review`, () => {
      const { driver, button: at } = open();
      driver.update(withLayers(demoRunSheet(IMAGE, "loading")));
      driver.update(
        applicationDemoView(DEMO_JOBS, undefined, {
          layers: [entry.sheet()],
          mouse: true,
        }),
      );
      driver.take();
      driver.click(at.column, at.row);
      assert(!driver.actions().includes(entry.action));
    });
  }
});

Deno.test("a new review clears the challenge and returns focus to where a sheet starts", () => {
  const deleting = (state: "ready" | "loading") =>
    withLayers({ ...demoDeleteSheet(ARCHIVE), state });
  const driver = new ApplicationDriver(deleting("ready"), {
    colorDepth: "none",
  });
  const mustEqual = demoDeleteSheet(ARCHIVE).challenge?.mustEqual ?? "";
  driver.type(mustEqual);
  assertEquals(driver.state.fields.delete?.confirm, mustEqual);
  driver.update(deleting("loading"));
  driver.update(deleting("ready"));
  assertEquals(driver.state.fields.delete?.confirm, "");
  assertEquals(driver.state.layers.delete?.focusedControlId, "field:confirm");

  const running = new ApplicationDriver(withLayers(demoRunSheet(IMAGE)), {
    colorDepth: "none",
  });
  running.key("right");
  assertEquals(running.state.layers.run?.focusedControlId, "button:run");
  running.update(withLayers(demoRunSheet(IMAGE, "loading")));
  running.update(withLayers(demoRunSheet(IMAGE)));
  assertEquals(running.state.layers.run?.focusedControlId, "button:keep");
  running.take();
  running.key("enter");
  assertEquals(actions(running.take()), [], "Enter lands on the safe button");
});

Deno.test("only the body that arrives after loading counts as read", () => {
  const filling = new ApplicationDriver(
    withLayers({ ...demoRunSheet(IMAGE, "loading"), body: [] }),
    { columns: 80, rows: 13, colorDepth: "none" },
  );
  assertEquals(filling.state.fullyRead.run, false, "an empty loading body");
  filling.update(withLayers(demoRunSheet(IMAGE)));
  assertEquals(filling.state.fullyRead.run, false);
  assert(filling.text.includes("PgDn to read before running"));
  filling.key("right", "enter");
  assertEquals(actions(filling.take()), [], "the arrived body is unread");
  filling.key("page-down", "page-down");
  assertEquals(filling.state.fullyRead.run, true);

  const shown = new ApplicationDriver(
    withLayers(demoRunSheet(IMAGE, "loading")),
    { columns: 120, rows: 30 },
  );
  assertEquals(
    shown.state.fullyRead.run,
    false,
    "lines on screen while loading are not under review",
  );
  shown.update(withLayers(demoRunSheet(IMAGE)));
  assertEquals(shown.state.fullyRead.run, true, "the ready body fits");
});

Deno.test("a challenge that arrives with the plan takes focus", () => {
  const { challenge, ...plan } = demoDeleteSheet(ARCHIVE);
  const mustEqual = challenge?.mustEqual ?? "";
  assert(
    plan.buttons.some((button) =>
      button.role === "alternative" && button.key === mustEqual[0]
    ),
    "the challenge's first letter is an alternative button's key",
  );
  // The loading sheet cannot know the challenge before its plan arrives.
  const buttons = plan.buttons.map((button) => {
    if (button.role !== "destructive") return button;
    const { requiresChallenge: _requires, ...rest } = button;
    return rest;
  });
  const driver = new ApplicationDriver(
    withLayers({ ...plan, buttons, state: "loading" }),
    { colorDepth: "none" },
  );
  assertEquals(driver.state.layers.delete?.focusedControlId, "button:keep");
  driver.update(withLayers(demoDeleteSheet(ARCHIVE)));
  assertEquals(driver.state.layers.delete?.focusedControlId, "field:confirm");
  driver.type(mustEqual);
  assertEquals(actions(driver.take()), [], "letters reach the field");
  assertEquals(driver.state.fields.delete?.confirm, mustEqual);
});

/** One sheet's reported state: focus, scroll, disclosures, fields, and read progress. */
function sheetState(driver: ApplicationDriver, id: string): string {
  const state = driver.state;
  return JSON.stringify({
    layer: state.layers[id],
    fields: state.fields[id],
    fullyRead: state.fullyRead[id],
  });
}

Deno.test("a sheet entering or leaving loading is the sheet a new one would be", () => {
  const sheets: readonly ((
    state: "ready" | "loading",
  ) => ApplicationSheet<string>)[] = [
    (state) => demoRunSheet(IMAGE, state),
    (state) => ({ ...demoDeleteSheet(ARCHIVE), state }),
  ];
  const crossings = [["loading", "ready"], ["ready", "loading"]] as const;
  const sizes = [[120, 30], [80, 24], [80, 13]] as const;
  for (const build of sheets) {
    for (const [from, to] of crossings) {
      for (const [columns, rows] of sizes) {
        const size = { columns, rows, colorDepth: "none" as const };
        const target = build(to);
        const label = `${target.id} ${from} → ${to} at ${columns} × ${rows}`;
        const crossed = new ApplicationDriver(withLayers(build(from)), size);
        const untouched = sheetState(crossed, target.id);
        // Everything a person can do to a sheet short of answering it:
        // type into the challenge, read on, and move focus.
        if (target.challenge !== undefined) {
          crossed.type(target.challenge.mustEqual);
        }
        crossed.key("page-down", "page-down", "tab", "tab");
        assert(
          sheetState(crossed, target.id) !== untouched,
          `${label}: the interaction changed the sheet`,
        );
        crossed.update(withLayers(target));
        assertEquals(
          sheetState(crossed, target.id),
          sheetState(
            new ApplicationDriver(withLayers(target), size),
            target.id,
          ),
          label,
        );
      }
    }
  }
});

/** Whether the frame drew a clickable region for a layer's control. */
function controlShown(driver: ApplicationDriver, layer: string): boolean {
  const state = driver.state.layers[layer];
  if (state === undefined) return false;
  const focus = state.focusedControlId;
  if (focus === "input" || focus === "body") return true;
  if (focus === "rows") {
    const list = Object.entries(driver.state.lists).find(([id]) =>
      id !== "jobs"
    );
    const selected = list?.[1].selectedId;
    return selected === undefined ||
      driver.hits.some((hit) =>
        hit.target.kind === "row" && hit.target.key === `i:${selected}`
      );
  }
  const control = state.highlightedId === undefined
    ? focus
    : `item:${state.highlightedId}`;
  return driver.hits.some((hit) =>
    hit.target.kind === "control" && hit.target.layerId === layer &&
    hit.target.control === control
  );
}

/** A challenge sheet whose consequences outrun a narrow panel. */
function longDeleteSheet(): ApplicationSheet<string> {
  const sheet = demoDeleteSheet(ARCHIVE);
  return {
    ...sheet,
    id: "long-delete",
    body: [
      ...sheet.body,
      {
        kind: "text",
        runs: [{
          text:
            "Anything it published stays where it was published; the steps below say what moves and what is deleted for good.",
        }],
      },
    ],
  };
}

Deno.test("the focused control of every layer stays on screen as focus moves and fields take keys", async (t) => {
  const layers: readonly (() => ApplicationLayer<string>)[] = [
    () => demoRunSheet(IMAGE),
    () => demoDeleteSheet(ARCHIVE),
    longDeleteSheet,
    () => demoNewJobForm(),
    () => demoActionsMenu(IMAGE),
    () => demoPalette(DEMO_JOBS, false),
    () => demoKeysReader(),
    () => demoLogReader(IMAGE),
  ];
  for (const make of layers) {
    const layer = make();
    for (const { columns, rows } of APPLICATION_REVIEW_SIZES) {
      await t.step(`${layer.id} at ${columns}x${rows}`, () => {
        const driver = new ApplicationDriver(withLayers(layer), {
          columns,
          rows,
          colorDepth: "none",
        });
        const check = (after: string) =>
          assert(
            controlShown(driver, layer.id),
            `${
              driver.state.layers[layer.id]?.focusedControlId
            } is off screen after ${after}\n${driver.text}`,
          );
        // A layer opens on its control where the person can see it, and a
        // sheet with its consequences first wherever they fit beside it.
        check("opening");
        if (layer.kind === "sheet" && rows >= 20) {
          assertEquals(
            driver.state.layers[layer.id]?.scroll,
            0,
            `${layer.id} opened past its first consequence\n${driver.text}`,
          );
        }
        if (layer.kind === "sheet") {
          const arriving = new ApplicationDriver(
            withLayers({ ...layer, state: "loading", body: [] }),
            { columns, rows, colorDepth: "none" },
          );
          arriving.update(withLayers(layer));
          assert(
            controlShown(arriving, layer.id),
            `${
              arriving.state.layers[layer.id]?.focusedControlId
            } is off screen once the plan arrives\n${arriving.text}`,
          );
        }
        const focus = () => driver.state.layers[layer.id]?.focusedControlId;
        if (focus()?.startsWith("field:") === true) {
          driver.type("x");
          check("typing into it");
          for (const page of ["page-up", "page-down"]) {
            driver.key(page, page, page);
            driver.type("x");
            check(`${page} and typing`);
          }
        }
        for (let turn = 0; turn < 12; turn += 1) {
          driver.key(
            layer.kind === "sheet" || layer.kind === "form" ? "tab" : "down",
          );
          if (driver.state.topLayerId !== layer.id) return;
          check(`move ${turn + 1}`);
        }
      });
    }
  }
});

Deno.test("a layer footer's accent belongs to Enter, and Escape leads when Enter does nothing", async (t) => {
  const theme = resolveTerminalTheme({});
  const color = terminalTextToneColor(theme, "accent");
  const accent = `38;2;${color.red};${color.green};${color.blue}m`;
  const { buttons: _buttons, ...progress } = demoRunSheet(IMAGE, "working", {
    startedAt: 0,
    now: 11_000,
  });
  const layers: readonly (() => ApplicationLayer<string>)[] = [
    () => demoRunSheet(IMAGE),
    () => demoRunSheet(IMAGE, "loading"),
    () => demoDeleteSheet(ARCHIVE),
    () => demoNewJobForm(),
    () => ({
      ...progress,
      buttonRow: false,
      buttons: [{ id: "hide", label: "Hide", role: "safe" }],
    }),
    () => demoActionsMenu(IMAGE),
    () => demoPalette(DEMO_JOBS, false),
    () => demoKeysReader(),
    () => demoLogReader(IMAGE),
  ];
  for (const [index, make] of layers.entries()) {
    const layer = make();
    await t.step(`${index} ${layer.id} ${layer.kind}`, () => {
      const driver = new ApplicationDriver(withLayers(layer), {
        columns: 80,
        rows: 24,
        colorDepth: "truecolor",
      });
      const check = (after: string) => {
        if (driver.state.topLayerId !== layer.id) return;
        const footer = driver.last.frame.split("\n").at(-1) ?? "";
        const plain = stripAnsi(footer).trimStart();
        const enter = plain.startsWith("↵");
        assertEquals(
          footer.includes(accent),
          enter,
          `${layer.id} after ${after}: the accent must mark Enter alone\n${plain}`,
        );
        if (!enter) {
          assert(
            plain.startsWith("Esc"),
            `${layer.id} after ${after}: Escape leads when Enter does nothing\n${plain}`,
          );
        }
      };
      check("opening");
      const step = layer.kind === "sheet" || layer.kind === "form"
        ? "tab"
        : "down";
      for (let turn = 0; turn < 8; turn += 1) {
        driver.key(step);
        check(`${step} ${turn + 1}`);
      }
      if (layer.kind === "palette") {
        driver.type("zzzz");
        check("a query that matches nothing");
      }
    });
  }
});

Deno.test("a layer's footer keeps Escape and the keys of buttons on screen over generic hints", async (t) => {
  const layers: readonly (() => ApplicationLayer<string>)[] = [
    ...PANELS,
    () => demoActionsMenu(IMAGE),
    () => demoPalette(DEMO_JOBS, false),
    () => demoKeysReader(),
    () => demoLogReader(IMAGE),
  ];
  for (const make of layers) {
    const layer = make();
    for (const { columns, rows } of APPLICATION_REVIEW_SIZES) {
      await t.step(`${layer.id} at ${columns}x${rows}`, () => {
        const driver = new ApplicationDriver(withLayers(layer), {
          columns,
          rows,
        });
        for (let step = 0; step <= controls(layer); step += 1) {
          if (step > 0) driver.key("tab");
          if (driver.state.topLayerId !== layer.id) break;
          const focus = driver.state.layers[layer.id]?.focusedControlId ?? "";
          const buttonKeys = new Set(
            (layer.kind === "sheet" || layer.kind === "form") &&
              !isTextControl(layer, focus)
              ? layer.buttons.flatMap((button) =>
                button.role === "alternative" && button.key !== undefined
                  ? [button.key]
                  : []
              )
              : [],
          );
          const footer = driver.hits.flatMap((hit) =>
            hit.row === rows - 1 && hit.target.kind === "hint"
              ? [hit.target.chord]
              : []
          );
          const rank = (chord: string) =>
            chord === "escape" ? 2 : buttonKeys.has(chord) ? 1 : 0;
          const shown = new Set(footer.slice(1));
          const missing = [...buttonKeys, "escape"].filter((chord) =>
            footer[0] !== chord && !shown.has(chord)
          );
          assert(
            !missing.includes("escape"),
            `after ${step} Tab: the footer lost Escape\n${driver.text}`,
          );
          for (const chord of shown) {
            for (const lost of missing) {
              assert(
                rank(chord) >= rank(lost),
                `after ${step} Tab: "${chord}" outlasted "${lost}"\n${driver.text}`,
              );
            }
          }
        }
      });
    }
  }
});

Deno.test("a panel never holds blank rows while it hides body rows", async (t) => {
  const layers: readonly (() => ApplicationLayer<string>)[] = [
    () => demoRunSheet(IMAGE),
    () => demoDeleteSheet(ARCHIVE),
    () => demoNewJobForm(),
    () => demoActionsMenu(IMAGE),
    () => demoPalette(DEMO_JOBS, false),
    () => demoKeysReader(),
    () => demoLogReader(IMAGE),
  ];
  for (const make of layers) {
    const layer = make();
    for (const { columns, rows } of APPLICATION_REVIEW_SIZES) {
      for (const colorDepth of ["truecolor", "none"] as const) {
        await t.step(`${layer.id} at ${columns}x${rows} ${colorDepth}`, () => {
          const driver = new ApplicationDriver(withLayers(layer), {
            columns,
            rows,
            colorDepth,
          });
          const panel = new Set(
            driver.hits.flatMap((hit) =>
              hit.target.kind === "layer" ? [hit.row] : []
            ),
          );
          const lines = driver.text.split("\n");
          const inside = [...panel].sort((a, b) => a - b).slice(1, -1).map(
            (row) => lines[row] ?? "",
          );
          const left = Math.min(
            ...[...panel].map((row) =>
              driver.hits.find((hit) =>
                hit.row === row && hit.target.kind === "layer"
              )?.start ?? 0
            ),
          );
          const blank = (line: string) =>
            line.slice(left).replace(/[│|]/gu, "").trim() === "";
          if (!inside.some((line) => /more · PgDn|more below/u.test(line))) {
            return;
          }
          for (let index = 1; index < inside.length; index += 1) {
            assert(
              !(blank(inside[index - 1] ?? "") && blank(inside[index] ?? "")),
              `two blank rows inside a panel that hides rows:\n${driver.text}`,
            );
          }
        });
      }
    }
  }
});

Deno.test("a layer's footer lists the caller's hints, and each must name a key the layer handles", () => {
  const run = demoRunSheet(IMAGE);
  const sheet: ApplicationSheet<string> = {
    ...run,
    hints: [{ key: "R", label: "Review again" }],
    escapeLabel: "Not now",
    disclosures: (run.disclosures ?? []).map((disclosure) => ({
      ...disclosure,
      openHint: `Hide ${disclosure.label.toLowerCase()}`,
    })),
  };
  const keymap = [
    ...DEMO_KEYMAP,
    { key: "R", action: "review-again", scope: { layer: "run" } },
  ];
  const driver = new ApplicationDriver(withLayers(sheet), {
    colorDepth: "none",
    keymap,
  });
  const footer = () => driver.text.split("\n").at(-1) ?? "";
  assert(footer().includes("R Review again"), footer());
  assert(footer().includes("Esc Not now"), footer());
  const disclosure = run.disclosures?.[0];
  assert(disclosure !== undefined);
  driver.key(disclosure.key);
  assert(
    footer().includes(`Hide ${disclosure.label.toLowerCase()}`),
    footer(),
  );
  driver.take();
  driver.key("R");
  assertEquals(driver.actions(), ["review-again"]);
  const unbound = validateTerminalApplicationView(withLayers(sheet), {
    keymap: DEMO_KEYMAP,
  });
  assert(
    unbound.some((issue) => issue.path === "layers[0].hints[0].key"),
    JSON.stringify(unbound),
  );
});

Deno.test("a menu can rename Enter and Escape and leave / to a binding", () => {
  const menu = {
    ...demoActionsMenu(IMAGE),
    enterLabel: "Open",
    escapeLabel: "Back",
    filter: false,
    hints: [{ key: "/", label: "Search" }],
  };
  const driver = new ApplicationDriver(withLayers(menu), {
    colorDepth: "none",
    keymap: [
      ...DEMO_KEYMAP,
      { key: "/", action: "search", scope: { layer: menu.id } },
    ],
  });
  const footer = driver.text.split("\n").at(-1) ?? "";
  assert(footer.includes("↵ Open"), footer);
  assert(footer.includes("Esc Back"), footer);
  assert(!footer.includes("Filter"), footer);
  driver.take();
  driver.key("/");
  assertEquals(driver.actions(), ["search"]);
  assertEquals(
    driver.state.layers[menu.id]?.focusedControlId?.startsWith("item:"),
    true,
  );
});

Deno.test("without Unicode every frame is pure ASCII", async (t) => {
  const scenes: readonly (readonly [
    string,
    () => TerminalApplicationView<string>,
    readonly string[],
  ])[] = [
    ["list", () => withLayers(), ["down"]],
    ["zoom", () => withLayers(), ["down", "space"]],
    ["run", () => withLayers(demoRunSheet(IMAGE)), ["d"]],
    [
      "progress",
      () =>
        withLayers(
          demoRunSheet(IMAGE, "working", { startedAt: 0, now: 11_000 }),
        ),
      [],
    ],
    ["delete", () => withLayers(demoDeleteSheet(ARCHIVE)), ["p"]],
    ["form", () => withLayers(demoNewJobForm()), ["tab", "enter"]],
    ["menu", () => withLayers(demoActionsMenu(IMAGE)), ["end", "enter"]],
    ["palette", () => withLayers(demoPalette(DEMO_JOBS, false)), []],
    ["keys", () => withLayers(demoKeysReader()), []],
    ["log", () => withLayers(demoLogReader(IMAGE)), []],
  ];
  for (const [name, view, keys] of scenes) {
    for (const { columns, rows } of APPLICATION_REVIEW_SIZES) {
      await t.step(`${name} at ${columns}x${rows}`, () => {
        const driver = new ApplicationDriver(view(), {
          columns,
          rows,
          colorDepth: "none",
          unicode: false,
        });
        driver.key(...keys);
        const strange = [...driver.text].filter((character) =>
          !/[ -~\n]/u.test(character)
        );
        assertEquals(strange, [], driver.text);
      });
    }
  }
});

Deno.test("wrapped button rows stay parted, with their overflow line above them", async (t) => {
  for (const make of PANELS) {
    const layer = make();
    for (const { columns, rows } of APPLICATION_REVIEW_SIZES) {
      await t.step(`${layer.id} at ${columns}x${rows}`, () => {
        const driver = new ApplicationDriver(withLayers(layer), {
          columns,
          rows,
          colorDepth: "truecolor",
        });
        const buttonRows = [
          ...new Set(
            driver.hits.flatMap((hit) =>
              hit.target.kind === "control" &&
                hit.target.control.startsWith("button:")
                ? [hit.row]
                : []
            ),
          ),
        ].sort((a, b) => a - b);
        const lines = driver.text.split("\n");
        for (let index = 1; index < buttonRows.length; index += 1) {
          const [above, below] = [buttonRows[index - 1], buttonRows[index]];
          if (above === undefined || below === undefined) continue;
          assert(below - above >= 2, `touching button rows:\n${driver.text}`);
          for (let row = above + 1; row < below; row += 1) {
            assertEquals(
              (lines[row] ?? "").trim(),
              "",
              `text between button rows:\n${driver.text}`,
            );
          }
        }
      });
    }
  }
});
