/**
 * Prose the package fits to one line — a message, a description, a
 * footnote, a reason — is cut after its last whole word, never mid-word;
 * names keep cutting where the room runs out.
 */
import { assert, assertEquals } from "@std/assert";
import { truncateStyledText, truncateText } from "../../src/cli/text.ts";
import { stripAnsi, styleText } from "../../src/cli/ansi.ts";
import type {
  ApplicationLayer,
  TerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import { ApplicationDriver } from "../fixtures/application-driver.ts";
import { testView } from "../fixtures/application-views.ts";

/** Distinct words, none a prefix of another, so a cut word is recognisable. */
const WORDS = [
  "Alpha",
  "bravo,",
  "charlie",
  "delta",
  "echo",
  "foxtrot",
  "golf",
  "hotel",
  "india",
  "juliet",
  "kilo",
  "lima",
  "mike",
  "november",
  "oscar",
  "papa",
  "quebec",
  "romeo",
  "sierra",
  "tango",
  "uniform",
  "victor",
  "whiskey",
  "xray",
  "yankee",
  "zulu",
] as const;
const PROSE = WORDS.join(" ");
const WHOLE = new Set(WORDS.map((word) => word.replace(/[,;:]$/u, "")));

Deno.test("a word cut keeps whole words and drops the separator before the marker", () => {
  assertEquals(
    truncateText("See its commits, changed files and checks", 40, "…", {
      at: "word",
    }),
    "See its commits, changed files and…",
  );
  assertEquals(
    truncateText("See its commits, changed files", 20, "…", { at: "word" }),
    "See its commits…",
  );
  assertEquals(
    truncateText("Unbreakable-identifier-name tail", 10, "…", { at: "word" }),
    "Unbreakab…",
  );
  assertEquals(
    truncateText("See its commits", 12, "…"),
    "See its com…",
  );
  const capabilities = testTerminalCapabilities({ colorDepth: "truecolor" });
  const styled = truncateStyledText(
    `${styleText("Exit it", { bold: true }, capabilities)} to return here`,
    14,
    "…",
    { at: "word" },
  );
  assertEquals(stripAnsi(styled), "Exit it to…");
});

const run = { text: PROSE };

function withLayer(layer: ApplicationLayer<string>): TerminalApplicationView<
  string
> {
  return { ...testView(), layers: [layer] };
}

const SCENES: readonly {
  readonly name: string;
  readonly view: TerminalApplicationView<string>;
  /** Keys that bring the prose on screen. */
  readonly keys?: readonly string[];
  /** Widths at which the surface shows; a detail needs its split. */
  readonly widths?: readonly number[];
}[] = [
  {
    name: "message line",
    view: testView(["a"], { message: { id: "note", runs: [run] } }),
  },
  {
    name: "selection hint",
    view: { ...testView(), input: { mouse: true, selectionHint: [run] } },
  },
  {
    name: "hints description",
    widths: [100, 120],
    view: {
      ...testView(["a"]),
      body: {
        ...(testView(["a"]).body as Extract<
          TerminalApplicationView<string>["body"],
          { kind: "master-detail" }
        >),
        detail: {
          follows: "items",
          content: {
            a: [{
              kind: "hints",
              items: [{ key: "enter", label: "Open", description: PROSE }],
            }],
          },
        },
      },
    },
  },
  {
    name: "detail rows",
    widths: [80, 100, 120],
    view: {
      ...testView(["a"]),
      body: {
        ...(testView(["a"]).body as Extract<
          TerminalApplicationView<string>["body"],
          { kind: "master-detail" }
        >),
        detail: {
          follows: "items",
          content: { a: [{ kind: "rows", items: [{ text: [run] }] }] },
        },
      },
    },
  },
  {
    name: "menu description",
    view: withLayer({
      kind: "menu",
      id: "menu",
      scope: "global",
      title: "Actions",
      sections: [{
        title: "Item",
        items: [{
          id: "open",
          label: "Open",
          action: "open",
          description: [run],
        }],
      }],
    }),
  },
  {
    name: "unavailable sentence",
    view: withLayer({
      kind: "menu",
      id: "menu",
      scope: "global",
      title: "Actions",
      sections: [{
        title: "Item",
        items: [{ id: "open", label: "Open", action: "open" }],
        unavailable: [{ id: "move", label: "Move", sentence: PROSE }],
      }],
    }),
  },
  {
    name: "busy line",
    view: withLayer({
      kind: "sheet",
      id: "sheet",
      scope: "global",
      title: "Review",
      state: "loading",
      busy: PROSE,
      body: [],
      buttons: [{ id: "keep", label: "Keep", role: "safe" }],
    }),
  },
  {
    name: "footnote",
    view: withLayer({
      kind: "sheet",
      id: "sheet",
      scope: "global",
      title: "Review",
      state: "ready",
      body: [],
      footnote: [run],
      buttons: [
        { id: "keep", label: "Keep", role: "safe" },
        { id: "go", label: "Go", role: "confirm", action: "go" },
      ],
    }),
  },
  {
    name: "footnote without a button row",
    view: withLayer({
      kind: "sheet",
      id: "sheet",
      scope: "global",
      title: "Working",
      state: "working",
      body: [],
      activity: {
        startedAt: 0,
        steps: [{ id: "one", label: "Step", state: "active", startedAt: 0 }],
      },
      footnote: [run],
      buttonRow: false,
      buttons: [{ id: "hide", label: "Hide", role: "safe" }],
    }),
  },
  {
    name: "disabled reason",
    view: withLayer({
      kind: "sheet",
      id: "sheet",
      scope: "global",
      title: "Review",
      state: "ready",
      body: [],
      buttons: [
        { id: "keep", label: "Keep", role: "safe" },
        {
          id: "go",
          label: "Go",
          role: "confirm",
          action: "go",
          enabled: false,
          disabledReason: PROSE,
        },
      ],
    }),
    keys: ["right"],
  },
];

/** Every ellipsis that ends the prose on screen follows a whole word. */
function assertWordCuts(text: string, label: string): number {
  let cuts = 0;
  for (const line of text.split("\n")) {
    for (const match of line.matchAll(/(\S+)…/gu)) {
      const token = (match[1] ?? "").replace(/^[^A-Za-z]+/u, "");
      const ours = WORDS.some((word) =>
        word.startsWith(token) && token.length > 0
      );
      if (!ours) continue;
      cuts += 1;
      assert(
        WHOLE.has(token),
        `${label}: "${token}…" cuts a word\n${text}`,
      );
    }
  }
  return cuts;
}

Deno.test("every prose surface cuts after a whole word", async (t) => {
  for (const scene of SCENES) {
    await t.step(scene.name, () => {
      let cuts = 0;
      for (const columns of scene.widths ?? [40, 60, 80, 120]) {
        for (const unicode of [true, false]) {
          const driver = new ApplicationDriver(scene.view, {
            columns,
            rows: 24,
            colorDepth: "none",
            unicode,
          });
          driver.key(...(scene.keys ?? []));
          assert(
            driver.text.includes(WORDS[0]),
            `${scene.name} at ${columns}: the prose is not on screen\n${driver.text}`,
          );
          cuts += assertWordCuts(
            unicode ? driver.text : driver.text.replaceAll("...", "…"),
            `${scene.name} at ${columns}`,
          );
        }
      }
      assert(cuts > 0, `${scene.name}: the prose never needed a cut`);
    });
  }
});
