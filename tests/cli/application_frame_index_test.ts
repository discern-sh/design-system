/**
 * One neutral fixture per frame in the redesign's frame index: each frame's
 * shape — not its product words — must be expressible with the package
 * vocabulary and render with its distinctive parts. A frame the vocabulary
 * cannot express fails here instead of being drawn by hand.
 */
import { assert, assertEquals } from "@std/assert";
import type {
  ApplicationLayer,
  ApplicationMenu,
  ApplicationSheet,
  TerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";
import { TERMINAL_GLYPHS } from "../../src/cli/mod.ts";
import {
  applicationDemoView,
  DEMO_JOBS,
  DEMO_KEYMAP,
  DEMO_TIP,
  type DemoJob,
} from "../../scripts/playground/application.ts";
import {
  demoActionsMenu,
  demoDeleteSheet,
  demoKeysReader,
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

/** A launcher menu: a remembered choice, an unavailable one with its reason, and how to come back. */
function launcher(): ApplicationMenu<string> {
  return {
    kind: "menu",
    id: "launch",
    scope: "item",
    title: `Open a tool in ${IMAGE.title}`,
    initialItemId: "first-continue",
    enterLabel: "Open",
    escapeLabel: "Back",
    filter: false,
    sections: [
      {
        title: "First tool",
        items: [
          {
            id: "first-continue",
            label: "Continue",
            action: "launch:first",
            detail: [{ text: "picks up where it left off" }],
          },
          { id: "first-new", label: "New session", action: "launch:first-new" },
        ],
      },
      {
        title: "Second tool",
        items: [{
          id: "second",
          label: "New session",
          action: "launch:second",
        }],
        unavailable: [{
          id: "third",
          label: "Third tool",
          sentence: "not on your PATH",
        }],
      },
    ],
    footnote: [{
      text: "The tool takes over this window. Exit it to come back here.",
    }],
  };
}

/** The run sheet in progress without a button row: Escape hides it. */
function progress(): ApplicationSheet<string> {
  return {
    ...demoRunSheet(IMAGE, "working", { startedAt: 0, now: 11_000 }),
    buttons: [{ id: "hide", label: "Hide", role: "safe" }],
    buttonRow: false,
    hints: [{ key: "o", label: "Full output" }],
  };
}

/** A result sheet after a run stopped: what went wrong, its files, and alternatives. */
function result(): ApplicationSheet<string> {
  return {
    kind: "sheet",
    id: "result",
    scope: "item",
    title: `${IMAGE.title} didn't finish`,
    state: "failed",
    body: [{
      kind: "marks",
      items: [
        {
          mark: { ...TERMINAL_GLYPHS.failed, tone: "danger" },
          runs: [{
            text: "Writing the thumbnails stopped: 2 files are locked",
          }],
          lines: [
            [{ text: "thumbnails/beach.jpg", role: "code" }],
            [{ text: "thumbnails/hills.jpg", role: "code" }],
          ],
        },
        {
          mark: { ...TERMINAL_GLYPHS.keeps, tone: "muted" },
          runs: [{ text: "Nothing else changed" }],
        },
      ],
    }],
    buttons: [
      { id: "close", label: "Close", role: "safe" },
      {
        id: "again",
        label: "Run again",
        role: "alternative",
        key: "a",
        action: "rerun",
      },
    ],
  };
}

/** A sheet that discloses details before something opens elsewhere. */
function disclosure(): ApplicationSheet<string> {
  return {
    kind: "sheet",
    id: "updates",
    scope: "global",
    title: "Check for updates?",
    state: "ready",
    body: [{ kind: "text", runs: [{ text: "This opens the release page." }] }],
    disclosures: [{
      id: "details",
      label: "What is sent",
      key: "d",
      content: [{
        kind: "text",
        runs: [{ text: "Only the version you run." }],
      }],
    }],
    buttons: [
      { id: "cancel", label: "Cancel", role: "safe" },
      { id: "open", label: "Open", role: "confirm", action: "open" },
    ],
  };
}

interface Frame {
  readonly size: readonly [number, number];
  readonly view: () => TerminalApplicationView<string>;
  readonly keys?: readonly string[];
  readonly unicode?: boolean;
  readonly expect: (text: string, driver: ApplicationDriver) => void;
}

function shows(text: string, ...parts: readonly string[]): void {
  for (const part of parts) {
    assert(text.includes(part), `missing ${JSON.stringify(part)}:\n${text}`);
  }
}

function footer(text: string): string {
  return text.split("\n").at(-1) ?? "";
}

/** Every frame of the index, by name. */
const FRAMES: Readonly<Record<string, Frame>> = {
  "overview-120x30": {
    size: [120, 30],
    view: () => applicationDemoView(DEMO_JOBS, DEMO_TIP),
    expect: (text, driver) => {
      assertEquals(driver.last.layout, "split");
      shows(text, "⇄", "━", "Lend the terminal", "Tip");
    },
  },
  "overview-80x24": {
    size: [80, 24],
    view: () => applicationDemoView(),
    expect: (text, driver) => {
      assertEquals(driver.last.layout, "split");
      shows(text, "more · PgDn", ". Actions");
    },
  },
  "zoom-80x24": {
    size: [80, 24],
    view: () => applicationDemoView(),
    keys: ["space", "down"],
    expect: (text, driver) => {
      assertEquals(driver.last.layout, "zoom");
      shows(text, "›", "2 of 8");
    },
  },
  "stale-80x24": {
    size: [80, 24],
    view: () => applicationDemoView(),
    keys: ["down", "down"],
    expect: (text) => shows(text, "Stale ↓12", "12 new albums"),
  },
  "failed-80x24": {
    size: [80, 24],
    view: () => applicationDemoView(),
    keys: ["down", "space"],
    expect: (text) =>
      shows(text, "Could not read 3 source images", "     originals/"),
  },
  "degraded-80x24": {
    size: [80, 24],
    view: () => applicationDemoView(),
    keys: ["down", "down", "down"],
    expect: (text) => shows(text, "Needs input"),
  },
  "running-80x24": {
    size: [80, 24],
    view: () => applicationDemoView(),
    keys: ["down", "down", "down", "down"],
    expect: (text) => shows(text, "1:12 of about 3m"),
  },
  "queued-80x24": {
    size: [80, 24],
    view: () => applicationDemoView(),
    keys: ["down", "down", "down", "down", "down", "down"],
    expect: (text) => shows(text, "Queued #1"),
  },
  "offline-80x24": {
    size: [80, 24],
    view: () => {
      const view = applicationDemoView(DEMO_JOBS, {
        id: "offline",
        tone: "warning",
        runs: [{ text: "Two refreshes failed; showing the last good data" }],
        trailing: [{ text: "r Retry" }],
      });
      const liveness = view.header.liveness;
      if (liveness === undefined) throw new Error("the sample has liveness");
      return {
        ...view,
        header: { ...view.header, liveness: { ...liveness, state: "stale" } },
      };
    },
    expect: (text) => shows(text, "! Offline", "Two refreshes failed"),
  },
  "return-80x24": {
    size: [80, 24],
    view: () => {
      const view = applicationDemoView(DEMO_JOBS, {
        id: "back",
        runs: [{ text: "Back from the shell" }],
        dismiss: { onKey: true },
      });
      if (view.body.kind !== "master-detail") {
        throw new Error("expected detail");
      }
      return {
        ...view,
        body: { ...view.body, detail: { ...view.body.detail, content: {} } },
      };
    },
    expect: (text) => shows(text, "Back from the shell", "Loading…"),
  },
  "overview-60x20": {
    size: [60, 20],
    view: () => applicationDemoView(),
    expect: (text, driver) => {
      assertEquals(driver.last.layout, "strip");
      shows(text, "⇄", "Space");
    },
  },
  "overview-40x20-ascii": {
    size: [40, 20],
    unicode: false,
    view: () => applicationDemoView(),
    expect: (text) => {
      shows(text, "x Image resize", "Enter");
      assert(!/[^ -~\n]/u.test(text), `non-ASCII in ASCII mode:\n${text}`);
    },
  },
  "overview-80x13": {
    size: [80, 13],
    view: () => applicationDemoView(),
    expect: (text) => shows(text, "▸ Scheduled 1 · Idle 1 · Paused 3"),
  },
  "tiny-32x10": {
    size: [32, 10],
    view: () => applicationDemoView(),
    expect: (text) => shows(text, "+3"),
  },
  "review-land-80x24": {
    size: [80, 24],
    view: () => withLayers(demoRunSheet(IMAGE)),
    expect: (text) =>
      shows(
        text,
        "› Keep ‹",
        "▸ Steps · 4",
        "Nothing runs until you choose Run.",
      ),
  },
  "review-land-plan-80x24": {
    size: [80, 24],
    view: () => withLayers(demoRunSheet(IMAGE)),
    keys: ["d"],
    expect: (text) => shows(text, "▾ Steps · 4", "Fetch the originals"),
  },
  "review-land-120x30": {
    size: [120, 30],
    view: () => withLayers(demoRunSheet(IMAGE)),
    expect: (text) =>
      shows(text, "Run Image resize again?", "Quarterly report"),
  },
  "review-land-80x13": {
    size: [80, 13],
    view: () => withLayers(demoRunSheet(IMAGE)),
    expect: (text, driver) => {
      shows(text, "PgDn to read before running");
      assertEquals(driver.state.fullyRead.run, false);
    },
  },
  "review-land-confirm-light-80x24": {
    size: [80, 24],
    view: () => withLayers(demoRunSheet(IMAGE)),
    keys: ["right"],
    expect: (text) => shows(text, "› Run ‹"),
  },
  "review-drop-80x24": {
    size: [80, 24],
    view: () => withLayers(demoDeleteSheet(ARCHIVE)),
    expect: (text, driver) => {
      shows(footer(text), "^T");
      shows(text, "Pause instead");
      assertEquals(
        driver.state.layers.delete?.focusedControlId,
        "field:confirm",
      );
    },
  },
  "review-drop-40x24": {
    size: [40, 24],
    view: () => withLayers(demoDeleteSheet(ARCHIVE)),
    expect: (text) => shows(text, "Pause instead", "Keep", "Delete"),
  },
  "actions-80x24": {
    size: [80, 24],
    view: () => withLayers(demoActionsMenu(IMAGE)),
    expect: (text) =>
      shows(text, "Schedule", "▸ Unavailable", "Review, then run every step"),
  },
  "actions-120x30": {
    size: [120, 30],
    view: () => withLayers(demoActionsMenu(IMAGE)),
    keys: ["end", "enter", "down", "enter"],
    expect: (text) => shows(text, "the job is not paused"),
  },
  "palette-80x24": {
    size: [80, 24],
    view: () => withLayers(demoPalette(DEMO_JOBS, false)),
    expect: (text) => shows(footer(text), "to search"),
  },
  "new-task-80x24": {
    size: [80, 24],
    view: () => withLayers(demoNewJobForm()),
    expect: (text) => {
      shows(text, "Title", "▸ More options");
      shows(footer(text), "^T");
    },
  },
  "agent-80x24": {
    size: [80, 24],
    view: () => withLayers(launcher()),
    expect: (text) => {
      shows(
        text,
        "× Third tool  not on your PATH",
        "Exit it to come back here",
      );
      shows(footer(text), "↵ Open", "Esc Back");
      assert(!footer(text).includes("Filter"));
    },
  },
  "landing-progress-80x24": {
    size: [80, 24],
    view: () => withLayers(progress()),
    expect: (text) => {
      shows(footer(text), "Esc Hide", "o Full output");
      assert(!footer(text).includes("↵"), footer(text));
      assert(!text.includes("› Hide ‹"), "the button row is hidden");
    },
  },
  "landing-failed-80x24": {
    size: [80, 24],
    view: () => withLayers(result()),
    expect: (text) => {
      shows(text, "     thumbnails/beach.jpg", "› Close ‹");
      shows(footer(text), "a Run again");
    },
  },
  "toast-80x24": {
    size: [80, 24],
    view: () =>
      applicationDemoView(DEMO_JOBS, {
        id: "moved",
        runs: [{ text: "Search index moved to Needs review" }],
        dismiss: { onKey: true },
      }),
    expect: (text) => shows(text, "moved to Needs review", "▸ Paused 3"),
  },
  "empty-80x24": {
    size: [80, 24],
    view: () => {
      const view = applicationDemoView();
      if (view.body.kind !== "master-detail") {
        throw new Error("expected detail");
      }
      return {
        ...view,
        footer: { left: [], right: [{ key: "ctrl-k", label: "Commands" }] },
        body: {
          kind: "empty",
          title: "No jobs yet",
          body: [{ text: "Make one to run it on a schedule." }],
          primary: { key: "enter", label: "New job…", action: "new" },
          secondary: [{ key: "ctrl-k", label: "Commands" }],
          list: {
            ...view.body.list,
            groups: view.body.list.groups.filter((group) =>
              group.id === "paused"
            ),
          },
        },
      };
    },
    expect: (text) => shows(text, "No jobs yet", "New job…", "▸ Paused 3"),
  },
  "help-80x24": {
    size: [80, 24],
    view: () => withLayers(demoKeysReader()),
    expect: (text) => {
      const row = text.split("\n").find((line) =>
        line.includes("Move") && line.includes("Act")
      );
      assert(
        row !== undefined,
        `the shortcuts are not in two columns:\n${text}`,
      );
    },
  },
  "updates-80x24": {
    size: [80, 24],
    view: () => withLayers(disclosure()),
    expect: (text) => shows(text, "› Cancel ‹", "▸ What is sent"),
  },
  "parked-light-120x30": {
    size: [120, 30],
    view: () => applicationDemoView(),
    keys: ["end", "enter"],
    expect: (text) => shows(text, "▾ Paused"),
  },
  "minimum-30x9": {
    size: [30, 9],
    view: () => applicationDemoView(),
    expect: (text, driver) => {
      assertEquals(driver.last.layout, "too-small");
      shows(text, "Too small", "q Quit");
    },
  },
};

Deno.test("every frame of the index is expressible with the package vocabulary", async (t) => {
  for (const [name, frame] of Object.entries(FRAMES)) {
    await t.step(name, () => {
      const [columns, rows] = frame.size;
      const driver = new ApplicationDriver(frame.view(), {
        columns,
        rows,
        colorDepth: "none",
        unicode: frame.unicode ?? true,
        keymap: [
          ...DEMO_KEYMAP,
          { key: "o", action: "output", scope: { layer: "run" } },
        ],
      });
      for (const key of frame.keys ?? []) driver.key(key);
      frame.expect(driver.text, driver);
    });
  }
});
