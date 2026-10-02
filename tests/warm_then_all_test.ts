import { assert, assertEquals, assertRejects } from "@std/assert";
import { warmThenAll } from "../scripts/warm-then-all.ts";

interface Pending {
  readonly item: number;
  readonly settle: (value: string) => void;
  readonly fail: (error: Error) => void;
}

/** Record every started item and let the test settle each one by hand. */
function controlledRun(): {
  readonly started: Pending[];
  readonly run: (item: number) => Promise<string>;
} {
  const started: Pending[] = [];
  return {
    started,
    run: (item) =>
      new Promise<string>((resolve, reject) => {
        started.push({ item, settle: resolve, fail: reject });
      }),
  };
}

/** Let queued promise callbacks run without waiting on any real timer. */
async function drain(): Promise<void> {
  for (let turn = 0; turn < 10; turn++) await Promise.resolve();
}

Deno.test("warmThenAll starts nothing else until the first item settles", async () => {
  const { started, run } = controlledRun();
  const results = warmThenAll([1, 2, 3, 4], run);
  await drain();
  assertEquals(started.map((pending) => pending.item), [1]);
  started[0]?.settle("one");
  await drain();
  assertEquals(started.map((pending) => pending.item), [1, 2, 3, 4]);
  for (const pending of started.slice(1).toReversed()) {
    pending.settle(`item ${pending.item}`);
  }
  assertEquals(await results, ["one", "item 2", "item 3", "item 4"]);
});

Deno.test("warmThenAll runs the rest together once the first has settled", async () => {
  const { started, run } = controlledRun();
  const results = warmThenAll([1, 2, 3], run);
  await drain();
  started[0]?.settle("first");
  await drain();
  assert(started.length === 3, "every remaining item starts at once");
  started[2]?.settle("third");
  started[1]?.settle("second");
  assertEquals(await results, ["first", "second", "third"]);
});

Deno.test("warmThenAll starts no other item when the first fails", async () => {
  const { started, run } = controlledRun();
  const results = warmThenAll([1, 2, 3], run);
  await drain();
  started[0]?.fail(new Error("cold cache"));
  await assertRejects(() => results, Error, "cold cache");
  assertEquals(started.length, 1);
});

Deno.test("warmThenAll returns nothing for no items", async () => {
  assertEquals(
    await warmThenAll([], () => Promise.reject(new Error("never runs"))),
    [],
  );
});

Deno.test("browser behaviors are minified through warmThenAll, never all at once", async () => {
  const source = await Deno.readTextFile(
    new URL("../scripts/generate.ts", import.meta.url),
  );
  const start = source.indexOf("async function generateBehaviorSources(");
  const end = source.indexOf("\n}\n", start);
  assert(start >= 0 && end > start, "generateBehaviorSources is defined");
  const body = source.slice(start, end);
  assert(
    body.includes("warmThenAll(") && body.includes("minifyBehaviorSource("),
    "behavior minification goes through warmThenAll",
  );
  assert(
    !body.includes("Promise.all("),
    "starting every `deno bundle` child at once races to install esbuild on a cold cache",
  );
});
