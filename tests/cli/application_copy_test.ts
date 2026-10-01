import { assert, assertEquals } from "@std/assert";
import { stripAnsi } from "../../src/cli/mod.ts";
import {
  DEFAULT_TERMINAL_APPLICATION_COPY,
  type TerminalApplicationCopy,
  type TerminalApplicationView,
  validateTerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";
import {
  applicationDemoView,
  DEMO_JOBS,
  DEMO_KEYMAP,
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

function job(id: string) {
  const found = DEMO_JOBS.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no sample job ${id}`);
  return found;
}

/** Every copy entry replaced by a marker that names it. */
const MARKED: TerminalApplicationCopy = Object.fromEntries(
  Object.entries(DEFAULT_TERMINAL_APPLICATION_COPY).map(([name, value]) => [
    name,
    typeof value === "string"
      ? `<${name}>`
      : Array.isArray(value)
      ? [{ text: `<${name}>` }]
      : (...args: readonly unknown[]) =>
        `<${name}:${args.slice(0, 2).join(",")}>`,
  ]),
) as unknown as TerminalApplicationCopy;

/** Words only the package writes, which no sample content uses. */
const PACKAGE_WORDS = [
  "Buttons",
  "Next field",
  "Read more",
  "No matches",
  "No items",
  "Does not match",
  "more character",
  "Too small",
  "Needs 32",
  "Shift-drag",
  "Letters",
  "to search",
  "Loading…",
  "more above",
  "more below",
  "Links",
];

interface Scene {
  readonly name: string;
  readonly view: (
    copy: Partial<TerminalApplicationCopy>,
  ) => TerminalApplicationView<string>;
  readonly keys: readonly string[];
  readonly size?: readonly [number, number];
  readonly unicode?: boolean;
}

const IMAGE = job("image-resize");
const ARCHIVE = job("photo-archive");
const with_ = (
  copy: Partial<TerminalApplicationCopy>,
  layers: Parameters<typeof applicationDemoView>[2] = {},
): TerminalApplicationView<string> => ({
  ...applicationDemoView(DEMO_JOBS, undefined, layers),
  copy,
});

/** A Markdown reading body with links, whose footer the package extends. */
const reading = (
  copy: Partial<TerminalApplicationCopy>,
): TerminalApplicationView<string> => ({
  header: { leading: [{ text: "Notes", role: "title" }] },
  body: {
    kind: "reading",
    id: "notes",
    content: {
      kind: "markdown",
      source:
        "# Notes\n\nSee the [guide](guide.md) and the [site](https://example.com/).",
    },
  },
  footer: { left: [], right: [{ key: "q", label: "Quit" }] },
  copy,
});

const SCENES: readonly Scene[] = [
  { name: "document", view: reading, keys: [] },
  { name: "link", view: reading, keys: ["tab"] },
  { name: "list", view: (copy) => with_(copy), keys: ["down"] },
  { name: "filter", view: (copy) => with_(copy), keys: ["/", "z", "z"] },
  {
    name: "filtered",
    view: (copy) => with_(copy),
    keys: ["/", "i", "n", "enter"],
  },
  { name: "zoom", view: (copy) => with_(copy), keys: ["down", "space"] },
  { name: "group", view: (copy) => with_(copy), keys: ["end"] },
  {
    name: "scrolled",
    view: (copy) => with_(copy),
    keys: ["page-down"],
    size: [80, 13],
  },
  {
    name: "ascii",
    view: (copy) => with_(copy),
    keys: ["page-down"],
    size: [80, 13],
    unicode: false,
  },
  { name: "small", view: (copy) => with_(copy), keys: [], size: [30, 9] },
  {
    name: "mouse",
    view: (copy) => ({ ...with_(copy, { mouse: true }) }),
    keys: [],
  },
  {
    name: "sheet",
    view: (copy) => with_(copy, { layers: [demoRunSheet(IMAGE)] }),
    keys: ["right"],
    size: [80, 13],
  },
  {
    name: "progress",
    view: (copy) =>
      with_(copy, {
        layers: [demoRunSheet(IMAGE, "working", { startedAt: 0, now: 11_000 })],
      }),
    keys: [],
  },
  {
    name: "delete",
    view: (copy) => with_(copy, { layers: [demoDeleteSheet(ARCHIVE)] }),
    keys: ["p"],
  },
  {
    name: "matched",
    view: (copy) => with_(copy, { layers: [demoDeleteSheet(ARCHIVE)] }),
    keys: [..."photo-archive-migration"],
  },
  {
    name: "mismatched",
    view: (copy) => with_(copy, { layers: [demoDeleteSheet(ARCHIVE)] }),
    keys: ["x"],
  },
  {
    name: "form",
    view: (copy) => with_(copy, { layers: [demoNewJobForm()] }),
    keys: ["down", "down", "down", "down"],
  },
  {
    name: "menu",
    view: (copy) =>
      with_(copy, {
        layers: [{ ...demoActionsMenu(IMAGE), lettersActivate: true }],
      }),
    keys: ["end"],
  },
  {
    name: "menufilter",
    view: (copy) => with_(copy, { layers: [demoActionsMenu(IMAGE)] }),
    keys: ["/", "z", "z"],
  },
  {
    name: "menuquery",
    view: (copy) => with_(copy, { layers: [demoActionsMenu(IMAGE)] }),
    keys: ["/", "r", "enter"],
  },
  {
    name: "palette",
    view: (copy) => with_(copy, { layers: [demoPalette(DEMO_JOBS, false)] }),
    keys: [],
  },
  {
    name: "paletteempty",
    view: (copy) => with_(copy, { layers: [demoPalette(DEMO_JOBS, false)] }),
    keys: ["z", "z", "z", "q"],
  },
  {
    name: "reader",
    view: (copy) => with_(copy, { layers: [demoKeysReader()] }),
    keys: [],
  },
  {
    name: "rows",
    view: (copy) => with_(copy, { layers: [demoLogReader(IMAGE)] }),
    keys: [],
  },
  {
    name: "pending",
    view: (copy) => {
      const view = with_(copy);
      if (view.body.kind !== "master-detail") {
        throw new Error("expected detail");
      }
      return {
        ...view,
        body: { ...view.body, detail: { ...view.body.detail, content: {} } },
      };
    },
    keys: [],
  },
  {
    name: "empty",
    view: (copy) => {
      const view = with_(copy);
      if (view.body.kind !== "master-detail") {
        throw new Error("expected detail");
      }
      return {
        ...view,
        body: { ...view.body, list: { ...view.body.list, groups: [] } },
      };
    },
    keys: [],
  },
  {
    name: "asciitop",
    view: (copy) => with_(copy),
    keys: [],
    size: [80, 13],
    unicode: false,
  },
  {
    name: "formfield",
    view: (copy) => with_(copy, { layers: [demoNewJobForm()] }),
    keys: [],
  },
  {
    name: "formeditor",
    view: (copy) => {
      const form = demoNewJobForm();
      return with_(copy, {
        layers: [{
          ...form,
          fields: form.fields.map((field) =>
            field.kind === "group"
              ? {
                ...field,
                initiallyOpen: true,
                fields: field.fields.map((inner) =>
                  inner.kind === "text" && inner.editor !== undefined
                    ? {
                      ...inner,
                      editor: {
                        key: inner.editor.key,
                        action: inner.editor.action,
                      },
                    }
                    : inner
                ),
              }
              : field
          ),
        }],
      });
    },
    keys: ["tab", "tab", "tab"],
  },
  {
    name: "disclosed",
    view: (copy) => with_(copy, { layers: [demoRunSheet(IMAGE)] }),
    keys: ["tab", "tab", "enter"],
  },
  {
    name: "why",
    view: (copy) => with_(copy, { layers: [demoActionsMenu(IMAGE)] }),
    keys: ["end", "enter", "down"],
  },
];

function render(scene: Scene, copy: Partial<TerminalApplicationCopy>): string {
  const [columns, rows] = scene.size ?? [80, 24];
  const driver = new ApplicationDriver(scene.view(copy), {
    columns,
    rows,
    colorDepth: "none",
    unicode: scene.unicode ?? true,
    keymap: DEMO_KEYMAP,
  });
  for (const key of scene.keys) driver.key(key);
  return stripAnsi(driver.last.frame);
}

Deno.test("every word the package writes comes from the copy table", () => {
  const used = new Set<string>();
  for (const scene of SCENES) {
    const frame = render(scene, MARKED);
    for (const word of PACKAGE_WORDS) {
      assert(
        !frame.includes(word),
        `${scene.name}: "${word}" is written without the copy table\n${frame}`,
      );
    }
    for (const match of frame.matchAll(/<(\w+)[:>]/gu)) {
      if (match[1] !== undefined) used.add(match[1]);
    }
  }
  const unused = Object.keys(DEFAULT_TERMINAL_APPLICATION_COPY).filter((
    name,
  ) => !used.has(name));
  assertEquals(
    unused,
    [],
    "copy entries no scene shows; cover them or drop them",
  );
});

Deno.test("a view's copy must replace known words with the right kind of value", () => {
  const issues = validateTerminalApplicationView({
    ...applicationDemoView(),
    copy: {
      close: "Fermer",
      ...({ unheard: "x" } as object),
      count: (shown: number, total: number) => `${shown}\n${total}`,
    },
  }, { keymap: DEMO_KEYMAP });
  assertEquals(issues.map((issue) => issue.path).sort(), [
    "copy.count",
    "copy.count",
    "copy.count",
    "copy.unheard",
  ]);
});
