import { assertEquals, assertRejects } from "@std/assert";
import { toFileUrl } from "@std/path";
import {
  type GeneratedOutput,
  reconcileGeneratedOutputs,
} from "../scripts/generate.ts";

async function filesBelow(directory: URL): Promise<readonly string[]> {
  const files: string[] = [];
  async function visit(current: URL, prefix: string): Promise<void> {
    for await (const entry of Deno.readDir(current)) {
      const relative = `${prefix}${entry.name}`;
      if (entry.isDirectory) {
        await visit(new URL(`${entry.name}/`, current), `${relative}/`);
      } else {
        files.push(relative);
      }
    }
  }
  await visit(directory, "");
  return files.toSorted();
}

Deno.test("generated roots converge completely, including ignored system fluff", async () => {
  const temporary = await Deno.makeTempDir({ prefix: "discern-codegen-" });
  const temporaryRoot = toFileUrl(`${temporary}/`);
  const sourceRoot = new URL("src-generated/", temporaryRoot);
  const scriptRoot = new URL("script-generated/", temporaryRoot);
  try {
    await Deno.mkdir(new URL("stale/tree/", sourceRoot), { recursive: true });
    await Deno.mkdir(new URL("nested/", scriptRoot), { recursive: true });
    await Deno.writeTextFile(new URL("kept.ts", sourceRoot), "stale\n");
    await Deno.writeTextFile(new URL(".DS_Store", sourceRoot), "system fluff");
    await Deno.writeTextFile(
      new URL("stale/tree/Thumbs.db", sourceRoot),
      "future system fluff",
    );
    await Deno.writeTextFile(
      new URL("nested/.localized", scriptRoot),
      "nested system fluff",
    );

    const kept = new URL("kept.ts", sourceRoot);
    const nestedKept = new URL("nested/kept.ts", scriptRoot);
    const outputs: readonly GeneratedOutput[] = [
      { target: kept, source: "current\n" },
      {
        target: nestedKept,
        source: "also current\n",
      },
    ];
    const first = await reconcileGeneratedOutputs(
      [sourceRoot, scriptRoot],
      outputs,
    );

    assertEquals(await filesBelow(sourceRoot), ["kept.ts"]);
    assertEquals(await filesBelow(scriptRoot), ["nested/kept.ts"]);
    assertEquals(await Deno.readTextFile(kept), "current\n");
    assertEquals(
      await Deno.readTextFile(nestedKept),
      "also current\n",
    );
    assertEquals(first.written.length, 2);
    assertEquals(first.removed.length, 3);

    assertEquals(
      await reconcileGeneratedOutputs(
        [sourceRoot, scriptRoot],
        outputs,
      ),
      {
        removed: [],
        written: [],
      },
    );
  } finally {
    await Deno.remove(temporary, { recursive: true });
  }
});

Deno.test("generated reconciliation plans every boundary before changing disk", async () => {
  const temporary = await Deno.makeTempDir({ prefix: "discern-codegen-" });
  const temporaryRoot = toFileUrl(`${temporary}/`);
  const generatedRoot = new URL("generated/", temporaryRoot);
  const sentinel = new URL("sentinel.ts", generatedRoot);
  try {
    await Deno.mkdir(generatedRoot, { recursive: true });
    await Deno.writeTextFile(sentinel, "untouched\n");
    await assertRejects(
      () =>
        reconcileGeneratedOutputs([generatedRoot], [{
          target: new URL("outside.ts", temporaryRoot),
          source: "must not write\n",
        }]),
      Error,
      "outside every generated root",
    );
    assertEquals(await Deno.readTextFile(sentinel), "untouched\n");
    await assertRejects(
      () =>
        reconcileGeneratedOutputs([generatedRoot], [
          { target: sentinel, source: "first\n" },
          { target: sentinel, source: "second\n" },
        ]),
      Error,
      "Duplicate generated output",
    );
    assertEquals(await Deno.readTextFile(sentinel), "untouched\n");
  } finally {
    await Deno.remove(temporary, { recursive: true });
  }
});
