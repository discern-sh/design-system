import { assert, assertEquals } from "@std/assert";
import type {
  ApplicationLayer,
  ApplicationSheet,
} from "../../src/cli/interactive/mod.ts";
import {
  applicationDemoView,
  DEMO_JOBS,
} from "../../scripts/playground/application.ts";
import {
  demoKeysReader,
  demoRunSheet,
} from "../../scripts/playground/application-layers.ts";
import { ApplicationDriver } from "../fixtures/application-driver.ts";

const LINES = 30;

function label(index: number): string {
  return `body line ${String(index + 1).padStart(2, "0")}`;
}

/** A run sheet whose body is thirty marked lines, each findable on screen. */
function longSheet(): ApplicationSheet<string> {
  const job = DEMO_JOBS[0];
  if (job === undefined) throw new Error("the sample has no jobs");
  return {
    ...demoRunSheet(job),
    body: [{
      kind: "marks",
      items: Array.from({ length: LINES }, (_, index) => ({
        mark: { unicode: "→", ascii: ">", tone: "muted" as const },
        runs: [{ text: label(index) }],
      })),
    }],
  };
}

function view(...layers: ApplicationLayer<string>[]) {
  return applicationDemoView(DEMO_JOBS, undefined, { layers, mouse: true });
}

/** A small deterministic generator, so a failing seed reproduces. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const SIZES = [
  [80, 24],
  [60, 16],
  [40, 10],
  [50, 13],
  [50, 60],
  [32, 10],
  [120, 30],
] as const;

type Step =
  | { readonly kind: "key"; readonly key: string }
  | { readonly kind: "wheel"; readonly direction: "up" | "down" }
  | { readonly kind: "resize"; readonly size: readonly [number, number] }
  | { readonly kind: "cover"; readonly covered: boolean };

function step(next: () => number): Step {
  const roll = next();
  if (roll < 0.45) {
    const keys = ["end", "home", "page-down", "page-up", "down", "up", "tab"];
    return {
      kind: "key",
      key: keys[Math.floor(next() * keys.length)] ?? "end",
    };
  }
  if (roll < 0.7) {
    return { kind: "wheel", direction: next() < 0.6 ? "down" : "up" };
  }
  if (roll < 0.9) {
    const size = SIZES[Math.floor(next() * SIZES.length)] ?? SIZES[0];
    return { kind: "resize", size };
  }
  return { kind: "cover", covered: next() < 0.5 };
}

Deno.test("the read gate lifts only once every body line has been on screen", async (t) => {
  const reader = demoKeysReader();
  for (let seed = 1; seed <= 60; seed += 1) {
    await t.step(`seed ${seed}`, () => {
      const next = random(seed);
      const driver = new ApplicationDriver(view(longSheet()), {
        columns: 80,
        rows: 24,
        colorDepth: "none",
      });
      const shown = new Set<string>();
      let covered = false;
      const record = () => {
        if (driver.state.topLayerId !== "run") return;
        for (let index = 0; index < LINES; index += 1) {
          if (driver.text.includes(label(index))) shown.add(label(index));
        }
      };
      record();
      const trail: string[] = [];
      for (let turn = 0; turn < 40; turn += 1) {
        const action = step(next);
        trail.push(JSON.stringify(action));
        switch (action.kind) {
          case "key":
            if (!covered) driver.key(action.key);
            break;
          case "wheel": {
            if (covered) break;
            const at = (() => {
              try {
                return driver.find("Run Image");
              } catch {
                return undefined;
              }
            })();
            if (at === undefined) break;
            driver.mouse({
              kind: "mouse",
              action: "wheel",
              direction: action.direction,
              column: at.column,
              row: at.row + 2,
              modifiers: { shift: false, alt: false, control: false },
            });
            break;
          }
          case "resize":
            driver.io.resize(action.size[0], action.size[1]);
            driver.render();
            break;
          case "cover":
            covered = action.covered;
            driver.update(
              covered ? view(longSheet(), reader) : view(longSheet()),
            );
            break;
        }
        record();
        if (driver.state.fullyRead.run === true) {
          const missing = Array.from(
            { length: LINES },
            (_, index) => label(index),
          )
            .filter((line) => !shown.has(line));
          assertEquals(
            missing,
            [],
            `the gate lifted with lines never shown, after ${trail.join(" ")}`,
          );
        }
      }
    });
  }
});

Deno.test("one End from the top of a long body leaves the gate closed", () => {
  const driver = new ApplicationDriver(view(longSheet()), {
    columns: 60,
    rows: 16,
    colorDepth: "none",
  });
  driver.key("end");
  assert(driver.text.includes(label(LINES - 1)));
  assertEquals(driver.state.fullyRead.run, false);
  driver.take();
  driver.key("right", "enter");
  assertEquals(driver.actions(), [], "confirm stays disabled");
});

Deno.test("a sheet beneath another layer does not count lines toward its read gate", () => {
  const reader = demoKeysReader();
  const driver = new ApplicationDriver(view(longSheet(), reader), {
    columns: 50,
    rows: 13,
    colorDepth: "none",
  });
  driver.io.resize(50, 60);
  driver.render();
  driver.io.resize(50, 13);
  driver.render();
  driver.update(view(longSheet()));
  assertEquals(driver.state.fullyRead.run, false);
});
