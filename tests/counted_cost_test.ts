import { assertEquals } from "@std/assert";
import { fromFileUrl, join, relative } from "@std/path";

const PACKAGE_ROOT = fromFileUrl(new URL("..", import.meta.url));

/**
 * The unit tests that may read the clock, and why. A test that times a call
 * to judge its cost fails whenever a shared machine is loaded, so it counts
 * the work the call causes instead. Browser conformance times rendered
 * responsiveness, which only a clock observes, and is outside this suite.
 */
const CLOCK_READERS: Readonly<Record<string, string>> = {
  "tests/producer_progress_test.ts":
    "bounds a wait for a child runner's report, and judges no cost by it",
};

const CLOCK = /\b(?:performance\.now|Date\.now)\s*\(/u;

async function testSources(root: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(root)) {
    const path = join(root, entry.name);
    if (entry.isDirectory) files.push(...await testSources(path));
    else if (entry.isFile && /\.tsx?$/u.test(entry.name)) files.push(path);
  }
  return files;
}

Deno.test("unit tests count cost instead of timing it", async () => {
  const offenders: string[] = [];
  const reading = new Set<string>();
  for (const path of await testSources(join(PACKAGE_ROOT, "tests"))) {
    const name = relative(PACKAGE_ROOT, path);
    const lines = (await Deno.readTextFile(path)).split("\n");
    for (const [index, line] of lines.entries()) {
      if (/^\s*(?:\/\/|\*)/u.test(line) || !CLOCK.test(line)) continue;
      reading.add(name);
      if (CLOCK_READERS[name] === undefined) {
        offenders.push(`${name}:${index + 1}: ${line.trim()}`);
      }
    }
  }
  assertEquals(
    offenders,
    [],
    "Count the work a call causes as its input grows, as tests/cli/layout_work.ts does, instead of timing it.",
  );
  // Every exemption still earns its place.
  assertEquals(
    Object.keys(CLOCK_READERS).filter((name) => !reading.has(name)),
    [],
  );
});
