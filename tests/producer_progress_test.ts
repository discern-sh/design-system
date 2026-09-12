import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  Progress,
  progressLine,
  type ProgressReport,
  progressStep,
  reportingFailures,
} from "../scripts/progress.ts";
import { TapProgress } from "../scripts/test-unit.ts";

function capture(kind = "phases", total: number | null = null) {
  const reports: ProgressReport[] = [];
  const progress = new Progress(
    kind,
    "deno task conformance",
    total,
    (line) => reports.push(JSON.parse(line.slice("DISCERN_PROGRESS ".length))),
  );
  return { progress, reports };
}

Deno.test("producer progress bounds escaped Unicode diagnostics without inventing results", () => {
  const line = progressLine({
    units: { kind: "phases", completed: 1, total: null },
    active: Array(40).fill("\u0000🚀".repeat(300)),
    failure: {
      name: "\u0000".repeat(600),
      message: "\u0000🚀".repeat(10000),
      file: "\u0000".repeat(2000),
      reproduce: "\u0000".repeat(4000),
    },
  });
  assert(new TextEncoder().encode(line).length < 16 * 1024);
  const report = JSON.parse(line.slice("DISCERN_PROGRESS ".length));
  assertEquals(report.units.total, null);
  assertEquals(report.results, undefined);
  assert(report.failure.message.length > 0);
  assert(!line.includes("\n"));
});

Deno.test("progress derives completed work including future members and preserves thrown failures", async () => {
  const { progress, reports } = capture();
  const work = ["existing", "future member"];
  for (const name of work) {
    assertEquals(
      await progressStep(progress, name, () => Promise.resolve(name)),
      name,
    );
  }
  assertEquals(reports.at(-1)?.units?.completed, work.length);
  const error = new Error("synthetic failure");
  assertEquals(
    await assertRejects(() =>
      progress.run("failed unit", () => Promise.reject(error))
    ),
    error,
  );
  assertEquals(reports.at(-1)?.failure?.message, error.message);
  assertEquals(reports.at(-1)?.units?.completed, work.length);
  assertEquals(
    await progressStep(undefined, "silent import", () => Promise.resolve(7)),
    7,
  );
});

Deno.test("browser failure reporting retains array behavior and reports each failure immediately", () => {
  const { progress, reports } = capture();
  const failures = reportingFailures(progress);
  assertEquals(failures.push("first", "future failure"), 2);
  assertEquals([...failures], ["first", "future failure"]);
  assertEquals(failures.map((x) => x.toUpperCase()), [
    "FIRST",
    "FUTURE FAILURE",
  ]);
  assertEquals(reports.map((x) => x.failure?.message), [...failures]);
  assertEquals(JSON.stringify(failures), '["first","future failure"]');
});

Deno.test("TAP counts top-level results across files and keeps nested diagnostics separate", () => {
  const { progress, reports } = capture("tests");
  const tap = new TapProgress(progress);
  for (
    const line of [
      "TAP version 14",
      "# tests/first_test.ts",
      "# Subtest: parent",
      "    ok 1 - child",
      "    1..1",
      "ok 1 - parent",
      "# tests/future_test.ts",
      "ok 2 - ignored # SKIP",
      "not ok 3 - broken",
      "  ---",
      '  {"message":"expected 2, got 3","at":{"file":"tests/future_test.ts","line":42}}',
      "  ...",
      "1..3",
    ]
  ) tap.line(line);
  tap.finish();
  assertEquals(reports.at(-1)?.results, { passed: 1, failed: 1, skipped: 1 });
  assertEquals(reports.at(-1)?.units, {
    kind: "tests",
    completed: 3,
    total: 3,
  });
  assertEquals(reports.find((x) => x.failure)?.failure?.line, 42);
  assertEquals(reports.filter((x) => x.failure).length, 1);
  assertEquals(
    reports.find((x) => x.active?.[0] === "tests/future_test.ts")?.units
      ?.completed,
    1,
  );
});

Deno.test("unfinished TAP keeps unknown totals and establishes an undiagnosed failure", () => {
  const { progress, reports } = capture("tests");
  const tap = new TapProgress(progress);
  tap.line("not ok 1 - interrupted failure");
  tap.finish();
  assertEquals(reports.at(-1)?.units, {
    kind: "tests",
    completed: 1,
    total: null,
  });
  assertEquals(reports.at(-1)?.partial, true);
  assertEquals(
    reports.find((x) => x.failure)?.failure?.name,
    "interrupted failure",
  );
});

Deno.test("unit wrapper preserves real Deno TAP results, filters, diagnostics and nonzero status", async () => {
  const directory = await Deno.makeTempDir();
  try {
    await Deno.mkdir(`${directory}/tests`);
    await Deno.writeTextFile(`${directory}/deno.json`, "{}");
    await Deno.writeTextFile(
      `${directory}/tests/first_test.ts`,
      'Deno.test("pass", async t => { await t.step("nested", () => {}); });\nDeno.test({ name: "skip", ignore: true, fn() {} });\n',
    );
    await Deno.writeTextFile(
      `${directory}/tests/future_test.ts`,
      'Deno.test("broken", () => { throw new Error("fixture diagnostic"); });\n',
    );
    const wrapper =
      new URL("../scripts/test-unit.ts", import.meta.url).pathname;
    for (const filtered of [false, true]) {
      const output = await new Deno.Command(Deno.execPath(), {
        cwd: directory,
        args: [
          "run",
          "--no-config",
          "--allow-run",
          wrapper,
          ...(filtered ? ["--filter=pass"] : []),
        ],
        stdout: "piped",
        stderr: "piped",
      }).output();
      const stderr = new TextDecoder().decode(output.stderr);
      const stdout = new TextDecoder().decode(output.stdout);
      assertEquals(output.success, filtered, stderr);
      assert(stdout.includes("TAP version 14"));
      const reports: ProgressReport[] = stderr.split("\n").filter((x) =>
        x.startsWith("DISCERN_PROGRESS ")
      ).map((x) => JSON.parse(x.slice(17)));
      assertEquals(
        reports.at(-1)?.results,
        filtered
          ? { passed: 1, failed: 0, skipped: 0 }
          : { passed: 1, failed: 1, skipped: 1 },
      );
      if (!filtered) {
        assert(stdout.includes("fixture diagnostic"));
        assert(
          reports.some((x) =>
            x.failure?.message.includes("fixture diagnostic")
          ),
        );
      }
    }
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("unit wrapper forwards cancellation and retains incomplete counts", async () => {
  const directory = await Deno.makeTempDir();
  try {
    await Deno.mkdir(`${directory}/tests`);
    await Deno.writeTextFile(`${directory}/deno.json`, "{}");
    await Deno.writeTextFile(
      `${directory}/tests/wait_test.ts`,
      'Deno.test("done", () => {});\nDeno.test("waiting", async () => { await Deno.writeTextFile("ready", String(Deno.pid)); await new Promise(resolve => setTimeout(resolve, 30000)); });\n',
    );
    const child = new Deno.Command(Deno.execPath(), {
      cwd: directory,
      args: [
        "run",
        "--no-config",
        "--allow-run",
        new URL("../scripts/test-unit.ts", import.meta.url).pathname,
      ],
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const output = child.output();
    let runner: number | undefined;
    try {
      const deadline = performance.now() + 3000;
      while (runner === undefined && performance.now() < deadline) {
        try {
          runner = Number(await Deno.readTextFile(`${directory}/ready`));
        } catch (error) {
          if (!(error instanceof Deno.errors.NotFound)) throw error;
        }
        if (runner === undefined) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
      assert(runner !== undefined, "Fixture runner did not become ready");
      child.kill("SIGTERM");
      const result = await output;
      assert(!result.success);
      const reports: ProgressReport[] = new TextDecoder().decode(result.stderr)
        .split("\n").filter((x) => x.startsWith("DISCERN_PROGRESS ")).map((x) =>
          JSON.parse(x.slice(17))
        );
      assertEquals(reports.at(-1)?.results?.passed, 1);
      assertEquals(reports.at(-1)?.partial, true);
      assertEquals(reports.at(-1)?.units?.total, null);
    } finally {
      if (runner !== undefined) {
        try {
          Deno.kill(runner, "SIGKILL");
        } catch (error) {
          assert(error instanceof Deno.errors.NotFound);
        }
      }
      try {
        child.kill("SIGKILL");
      } catch (error) {
        assert(
          error instanceof Deno.errors.NotFound || error instanceof TypeError,
        );
      }
      await output;
    }
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("gate test producers preserve the local task's complete sequential pipeline", async () => {
  const root = new URL("../", import.meta.url);
  const tasks =
    JSON.parse(await Deno.readTextFile(new URL("deno.json", root))).tasks;
  const config = await Deno.readTextFile(new URL("discern.toml", root));
  const tables = [
    ...config.matchAll(
      /^[ \t]*\[(jobs(?:\.[^\]]+)?)\]\s*([\s\S]*?)(?=^[ \t]*\[|(?![\s\S]))/gm,
    ),
  ];
  const known = tables.find((x) => x[1] === "jobs")![2]!;
  const first = /^\s*test\s*=\s*\{\s*run\s*=\s*"([^"]+)"/m.exec(known)![1]!;
  const producers = tables.filter((x) => /^\s*stage\s*=\s*"test"/m.test(x[2]!))
    .map((x) => ({
      name: x[1]!,
      command: /^\s*run\s*=\s*"([^"]+)"/m.exec(x[2]!)![1]!,
      needs: /^\s*needs\s*=\s*\["([^"]+)"\]/m.exec(x[2]!)![1]!,
    }));
  const commands = [first];
  let previous = "jobs.test";
  while (producers.length) {
    const index = producers.findIndex((x) => x.needs === previous);
    assert(index >= 0, "Every test producer must follow its predecessor");
    const [producer] = producers.splice(index, 1);
    commands.push(producer!.command);
    previous = producer!.name;
  }
  assertEquals(
    commands,
    tasks.test.split("&&").map((command: string) => command.trim()),
  );
});

Deno.test("nested progress restores the enclosing activity after success and failure", async () => {
  const { progress, reports } = capture();
  progress.active("Component contracts");
  await progress.activity("Interactions", async () => {
    progress.active("last scenario");
    await Promise.resolve();
  });
  assertEquals(reports.at(-1)?.active, ["Component contracts"]);
  await assertRejects(() =>
    progress.activity(
      "Screenshot capture",
      () => Promise.reject(new Error("capture failed")),
    )
  );
  assertEquals(reports.at(-1)?.active, ["Component contracts"]);
  assertEquals(reports.at(-1)?.units?.completed, 0);
});
