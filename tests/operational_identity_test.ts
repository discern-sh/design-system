import { assertEquals } from "@std/assert";
import {
  cssDeclarations,
  cssQualifiedRuleBlocks,
} from "../scripts/css-syntax.ts";

function clippedRules(css: string): string[] {
  const parsed = cssQualifiedRuleBlocks(css);
  assertEquals(parsed.failures, []);
  return parsed.rules.filter(({ block }) =>
    cssDeclarations(block).some(({ name, value }) =>
      name === "text-overflow" && value !== "clip"
    )
  ).map(({ selector }) => selector);
}

async function styles(directory: URL): Promise<URL[]> {
  const found: URL[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const path = new URL(
      entry.name + (entry.isDirectory ? "/" : ""),
      directory,
    );
    if (entry.isDirectory) found.push(...await styles(path));
    else if (entry.isFile && entry.name.endsWith(".css")) found.push(path);
  }
  return found;
}

Deno.test("operational text never substitutes ellipsis for distinguishing content", async () => {
  const failures: string[] = [];
  for (const group of ["workflow", "agents"]) {
    for (
      const path of await styles(
        new URL(`../src/components/${group}/`, import.meta.url),
      )
    ) {
      failures.push(...clippedRules(await Deno.readTextFile(path)));
    }
  }
  assertEquals(failures, []);
});

Deno.test("operational clipping guard enrolls an unrelated nested future rule", () => {
  assertEquals(
    clippedRules(
      "@layer discern.components { @container (width < 30rem) { .discern-future-ledger { text-overflow: ellipsis; } } }",
    ),
    [".discern-future-ledger"],
  );
  assertEquals(
    clippedRules(
      '.discern-future-ledger { overflow-wrap: anywhere; content: "text-overflow: ellipsis"; }',
    ),
    [],
  );
});
