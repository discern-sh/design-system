import { assert, assertEquals } from "@std/assert";
import { dirname, fromFileUrl } from "@std/path";
import { chartKindRegistry } from "../../src/generated/chart-registry.ts";

const TEST_DIRECTORY = dirname(fromFileUrl(import.meta.url));
const PACKAGE_ROOT = dirname(dirname(TEST_DIRECTORY));
const PROBE = fromFileUrl(
  new URL("./determinism_probe.ts", import.meta.url),
);

async function freshProcessEvidence(): Promise<Uint8Array> {
  const result = await new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--quiet",
      "--allow-env",
      "--config",
      "deno.json",
      PROBE,
    ],
    cwd: PACKAGE_ROOT,
    stdout: "piped",
    stderr: "piped",
  }).output();
  assertEquals(
    result.code,
    0,
    new TextDecoder().decode(result.stderr),
  );
  assertEquals(new TextDecoder().decode(result.stderr), "");
  return result.stdout;
}

Deno.test("every corpus scene, description, SVG, and CLI frame is byte-equal across fresh processes", async () => {
  const first = await freshProcessEvidence();
  assert(first.length > 0, "the determinism probe emitted evidence");
  for (let run = 0; run < 2; run += 1) {
    assertEquals(
      await freshProcessEvidence(),
      first,
      `fresh process ${run + 2}`,
    );
  }
  const records = JSON.parse(new TextDecoder().decode(first)) as unknown[];
  assertEquals(
    records.length,
    chartKindRegistry.reduce(
      (count, entry) => count + entry.releaseCorpus.cases.length,
      0,
    ),
  );
});
