import { assertEquals } from "@std/assert";
import { fromFileUrl, join, relative } from "@std/path";

const PACKAGE_ROOT = fromFileUrl(new URL("../..", import.meta.url));
const RESERVED_TERM = "pro" + "mpt";
const RESERVED_PATTERN = new RegExp(RESERVED_TERM, "iu");

async function sourceFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(root)) {
    const path = join(root, entry.name);
    if (entry.isDirectory) {
      files.push(...await sourceFiles(path));
    } else if (entry.isFile && /\.(?:ts|tsx|css)$/u.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

Deno.test("terminal interaction reserves prompt vocabulary for agent instructions", async () => {
  const files = [
    ...await sourceFiles(join(PACKAGE_ROOT, "src", "cli", "interactive")),
    ...await sourceFiles(
      join(PACKAGE_ROOT, "src", "components", "display", "terminal"),
    ),
    join(PACKAGE_ROOT, "src", "cli", "interactive-choice.ts"),
    join(PACKAGE_ROOT, "src", "cli", "interactive-states.ts"),
  ];
  const offenders: string[] = [];
  for (const path of files) {
    const source = await Deno.readTextFile(path);
    if (RESERVED_PATTERN.test(relative(PACKAGE_ROOT, path))) {
      offenders.push(`${relative(PACKAGE_ROOT, path)}: filename`);
    }
    if (RESERVED_PATTERN.test(source)) {
      offenders.push(`${relative(PACKAGE_ROOT, path)}: source`);
    }
  }
  assertEquals(
    offenders,
    [],
    "Terminal interaction uses request*/Interaction* vocabulary; prompt is reserved for coding-agent instructions.",
  );
});
