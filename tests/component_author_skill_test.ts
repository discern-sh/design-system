import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { fromFileUrl, join } from "@std/path";
import {
  componentEntrypoint,
  detectPackageAlias,
  kindGuideEntrypoint,
} from "../skills/use-discern-design-system/scripts/component-guide.ts";
import {
  componentMetadata,
  packageVersion,
} from "../src/component-metadata.ts";

const PACKAGE_ROOT = fromFileUrl(new URL("..", import.meta.url));
const SCRIPT = join(
  PACKAGE_ROOT,
  "skills",
  "use-discern-design-system",
  "scripts",
  "component-guide.ts",
);
const ENTRYPOINT = new URL("../src/component-metadata.ts", import.meta.url)
  .href;

async function runScript(
  args: readonly string[],
  cwd = PACKAGE_ROOT,
): Promise<{ code: number; stdout: string; stderr: string }> {
  const result = await new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--allow-read",
      "--config",
      join(PACKAGE_ROOT, "deno.json"),
      SCRIPT,
      ...args,
    ],
    cwd,
    stdout: "piped",
    stderr: "piped",
  }).output();
  return {
    code: result.code,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
  };
}

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
  assertEquals(
    kindGuideEntrypoint("@discern-sh/design-system/components", "diagram"),
    "@discern-sh/design-system/diagram",
  );
  assertEquals(
    kindGuideEntrypoint("jsr:@discern-sh/design-system@0.30.1", "chart"),
    "jsr:@discern-sh/design-system@0.30.1/chart",
  );
  assertThrows(
    () =>
      kindGuideEntrypoint(
        "file:///checkout/src/component-metadata.ts",
        "diagram",
      ),
    Error,
    "cannot be derived",
  );
});

Deno.test("the skill helper finds the alias a project maps the package under", () => {
  assertEquals(
    detectPackageAlias({
      "discern-design-system": "jsr:@discern-sh/design-system@0.30.1",
    }),
    "discern-design-system/components",
  );
  assertEquals(
    detectPackageAlias({
      "@std/path": "jsr:@std/path@^1.0.8",
      "design/components": "../discern-design-system/src/component-metadata.ts",
    }),
    "design/components",
  );
  assertEquals(
    detectPackageAlias({
      "@discern-sh/design-system": "jsr:@discern-sh/design-system@0.30.1",
    }),
    undefined,
    "the package's own name is the mapped route, not an alias",
  );
  assertEquals(detectPackageAlias({ react: "npm:react@18.3.1" }), undefined);
});

Deno.test("the skill helper filters the installed guide and reports its source", async () => {
  const result = await runScript([
    "--package",
    ENTRYPOINT,
    "--component",
    "activity-log",
  ]);
  assertEquals(result.code, 0, result.stderr);
  assertStringIncludes(
    result.stdout,
    `1 of ${componentMetadata.length} Components match Component activity-log.`,
  );
  assertStringIncludes(result.stdout, "### Activity log (`activity-log`)");
  assertStringIncludes(result.stdout, "Props: `ActivityLogProps`");
  assert(!result.stdout.includes("### Marketing stage (`marketing-stage`)"));
  assertStringIncludes(
    result.stderr,
    `Component author guide from ${ENTRYPOINT} (${packageVersion}; via explicit --package)`,
  );
});

Deno.test("the skill helper prints the kind guides beside a package root", async () => {
  const result = await runScript([
    "--package",
    "jsr:@discern-sh/design-system@" + packageVersion,
    "--diagram-kinds",
    "--chart-kinds",
  ]);
  assertEquals(result.code, 0, result.stderr);
  assertStringIncludes(result.stdout, "# Built-in Diagram kinds");
  assertStringIncludes(result.stdout, "Wrapping:");
  assertStringIncludes(result.stdout, "## Common budgets");
  assertStringIncludes(result.stdout, "# Built-in Chart kinds");
  assertStringIncludes(result.stderr, "diagram kind guide from");
  const explicit = await runScript([
    "--package",
    ENTRYPOINT,
    "--diagram-kinds",
  ]);
  assertEquals(explicit.code, 2);
  assertStringIncludes(explicit.stderr, "cannot be derived");
});

Deno.test("the skill helper reaches the package through a project's alias", async () => {
  const project = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(
      join(project, "deno.json"),
      JSON.stringify({
        imports: { "probe-alias/components": "./component-metadata.ts" },
      }),
    );
    await Deno.writeTextFile(
      join(project, "component-metadata.ts"),
      `export const packageVersion = "9.9.9";
export const componentMetadata = [{ name: "Activity log", slug: "activity-log", group: "Workflow", purposes: ["displaying-tool-output"], cli: { stance: "rendered" } }];
export const componentAuthorGuide = "# Built-in Components\\n\\n## Workflow\\n\\n### Activity log (\`activity-log\`)\\n\\nStub.\\n";
`,
    );
    const installed = join(project, "component-guide.ts");
    await Deno.copyFile(SCRIPT, installed);
    const result = await new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "--allow-read",
        "--config",
        join(project, "deno.json"),
        installed,
        "--list",
      ],
      cwd: project,
      stdout: "piped",
      stderr: "piped",
    }).output();
    const stderr = new TextDecoder().decode(result.stderr);
    assertEquals(result.code, 0, stderr);
    assertStringIncludes(
      stderr,
      `Component author guide from probe-alias/components → ${
        new URL("component-metadata.ts", `file://${project}/`).href
      } (9.9.9; via the project's alias for the package)`,
    );
    assertStringIncludes(
      new TextDecoder().decode(result.stdout),
      "activity-log\tActivity log\tWorkflow\tdisplaying-tool-output\trendered",
    );
  } finally {
    await Deno.remove(project, { recursive: true });
  }
});
