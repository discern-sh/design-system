import { assert, assertEquals } from "@std/assert";
import {
  auditDiagramFontMetricAssets,
  DIAGRAM_FONT_METRICS,
  measureDiagramText,
} from "../../src/diagram/font-metrics.ts";

const repositoryRoot = decodeURIComponent(
  new URL("../../", import.meta.url).pathname,
).replace(/\/$/u, "");

Deno.test("committed diagram font measurements remain bound to inspected bytes", async () => {
  const interfaceBytes = await Deno.readFile(
    new URL("../../assets/fonts/inter.woff2", import.meta.url),
  );
  const monoBytes = await Deno.readFile(
    new URL("../../assets/fonts/jetbrains-mono.woff2", import.meta.url),
  );
  const assets = [
    { source: DIAGRAM_FONT_METRICS.interface.source, bytes: interfaceBytes },
    { source: DIAGRAM_FONT_METRICS.mono.source, bytes: monoBytes },
  ];
  assertEquals(await auditDiagramFontMetricAssets(assets), []);

  const corrupt = Uint8Array.from(interfaceBytes);
  corrupt[0] = (corrupt[0] ?? 0) ^ 1;
  const failures = await auditDiagramFontMetricAssets([
    { source: DIAGRAM_FONT_METRICS.interface.source, bytes: corrupt },
    { source: DIAGRAM_FONT_METRICS.mono.source, bytes: monoBytes },
  ]);
  assertEquals(failures.length, 1);
  assert(failures[0]?.includes("recalibrate before changing the authority"));
});

Deno.test("conservative metric fallbacks are deterministic across script classes", () => {
  const samples = [
    ["Reference flow", "interface"],
    ["準備された変更", "interface"],
    ["Cafe\u0301", "interface"],
    ["status=ready", "mono"],
  ] as const;
  for (const [sample, role] of samples) {
    const first = measureDiagramText(sample, 16, role);
    assert(first > 0 && Number.isFinite(first));
    for (let run = 0; run < 10; run += 1) {
      assertEquals(measureDiagramText(sample, 16, role), first);
    }
  }
  assert(
    measureDiagramText("準", 16, "interface") >
      measureDiagramText("i", 16, "interface"),
  );
});

Deno.test("neutral diagram import graph contains no React or external runtime package", async () => {
  const command = new Deno.Command(Deno.execPath(), {
    args: ["info", "--json", "src/diagram/mod.ts"],
    cwd: repositoryRoot,
    stdout: "piped",
    stderr: "piped",
  });
  const output = await command.output();
  assert(output.success, new TextDecoder().decode(output.stderr));
  const info = JSON.parse(new TextDecoder().decode(output.stdout)) as {
    readonly modules: readonly {
      readonly specifier: string;
      readonly local?: string;
      readonly mediaType?: string;
    }[];
  };
  assert(info.modules.length > 0);
  for (const module of info.modules) {
    assert(module.specifier.startsWith("file:"), module.specifier);
    assert(module.local?.startsWith(`${repositoryRoot}/src/`), module.local);
    assert(!module.specifier.toLocaleLowerCase().includes("react"));
    assert(module.mediaType !== "TSX" && !module.specifier.endsWith(".tsx"));
  }
});

Deno.test("neutral entry module imports with no ambient runtime permissions", async () => {
  const source =
    'const diagram = await import("./src/diagram/mod.ts"); if (typeof diagram.layoutDiagram !== "function") Deno.exit(1);';
  const output = await new Deno.Command(Deno.execPath(), {
    args: ["eval", "--no-config", source],
    cwd: repositoryRoot,
    stdout: "piped",
    stderr: "piped",
  }).output();
  assert(output.success, new TextDecoder().decode(output.stderr));
});
