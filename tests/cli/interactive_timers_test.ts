import { assertEquals } from "@std/assert";
import { fromFileUrl, join, relative } from "@std/path";

const PACKAGE_ROOT = fromFileUrl(new URL("../..", import.meta.url));

/**
 * The only modules that may start a raw timer or read the wall clock, and
 * why. Everything else waits through an `InteractionDelayScheduler` or a
 * `TerminalClock`, so an owned screen can hand every wait its own clock
 * and a test can drive it with a manual one.
 */
const PROCESS_TIME: Readonly<Record<string, string>> = {
  "src/cli/interactive/clock.ts":
    "defines the process TerminalClock every other wait defaults to",
  "src/cli/interactive/activity.ts":
    "defines the process repeat scheduler behind SpinnerScheduler",
  "src/cli/interactive/pty-testing.ts":
    "drives real child processes, whose time is real",
};

const RAW_TIME = /\b(?:setTimeout|setInterval|Date\.now)\s*\(/u;

async function sourceFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(root)) {
    const path = join(root, entry.name);
    if (entry.isDirectory) files.push(...await sourceFiles(path));
    else if (entry.isFile && entry.name.endsWith(".ts")) files.push(path);
  }
  return files;
}

Deno.test("terminal interaction waits only through an injectable clock", async () => {
  const offenders: string[] = [];
  const timed = new Set<string>();
  for (
    const path of await sourceFiles(
      join(PACKAGE_ROOT, "src", "cli", "interactive"),
    )
  ) {
    const name = relative(PACKAGE_ROOT, path);
    const lines = (await Deno.readTextFile(path)).split("\n");
    for (const [index, line] of lines.entries()) {
      if (/^\s*(?:\/\/|\*)/u.test(line) || !RAW_TIME.test(line)) continue;
      timed.add(name);
      if (PROCESS_TIME[name] === undefined) {
        offenders.push(`${name}:${index + 1}: ${line.trim()}`);
      }
    }
  }
  assertEquals(
    offenders,
    [],
    "Wait through raceTerminalDelay, a TerminalClock, or an InteractionDelayScheduler so the caller's clock times it.",
  );
  // Every exemption still earns its place.
  assertEquals(
    Object.keys(PROCESS_TIME).filter((name) => !timed.has(name)),
    [],
  );
});
