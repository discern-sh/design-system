import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl, join } from "@std/path";
import { componentEntrypoint } from "../skills/use-discern-design-system/scripts/component-guide.ts";
import { componentMetadata } from "../src/component-metadata.ts";

const PACKAGE_ROOT = fromFileUrl(new URL("..", import.meta.url));
const SCRIPT = join(
  PACKAGE_ROOT,
  "skills",
  "use-discern-design-system",
  "scripts",
  "component-guide.ts",
);

Deno.test("the skill helper resolves package roots and explicit entrypoints", () => {
  assertEquals(
    componentEntrypoint("@discern-sh/design-system"),
    "@discern-sh/design-system/components",
  );
  assertEquals(
    componentEntrypoint("jsr:@discern-sh/design-system@0.29.0"),
    "jsr:@discern-sh/design-system@0.29.0/components",
  );
  assertEquals(
    componentEntrypoint("@discern-sh/design-system/components/"),
    "@discern-sh/design-system/components",
  );
  assertEquals(
    componentEntrypoint("file:///checkout/src/component-metadata.ts"),
    "file:///checkout/src/component-metadata.ts",
  );
});

Deno.test("the skill helper filters the installed guide through its public entrypoint", async () => {
  const entrypoint =
    new URL("../src/component-metadata.ts", import.meta.url).href;
  const result = await new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--allow-read",
      "--config",
      join(PACKAGE_ROOT, "deno.json"),
      SCRIPT,
      "--package",
      entrypoint,
      "--component",
      "activity-log",
    ],
    cwd: PACKAGE_ROOT,
    stdout: "piped",
    stderr: "piped",
  }).output();
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  assertEquals(result.code, 0, stderr);
  assertStringIncludes(
    stdout,
    `1 of ${componentMetadata.length} Components match Component activity-log.`,
  );
  assertStringIncludes(stdout, "### Activity log (`activity-log`)");
  assert(!stdout.includes("### Marketing stage (`marketing-stage`)"));
  assertStringIncludes(
    stderr,
    `Component author guide from ${entrypoint}`,
  );
});
