import { assert, assertEquals } from "@std/assert";
import { glyphUsageSource } from "../../catalogue/pages/glyphs/workbench.tsx";

Deno.test("copied glyph examples execute for both repertoires, unavailable fallbacks, and escaped labels", async () => {
  const directory = await Deno.makeTempDir({ prefix: "discern-glyph-usage-" });
  try {
    const source = [
      `import { getGlyph, resolveGlyph } from ${
        JSON.stringify(new URL("../../src/glyphs/mod.ts", import.meta.url).href)
      };`,
      `import { renderBox } from ${
        JSON.stringify(new URL("../../src/cli/box.ts", import.meta.url).href)
      };`,
      `import { Button } from ${
        JSON.stringify(
          new URL(
            "../../src/components/core/button/button.tsx",
            import.meta.url,
          ).href,
        )
      };`,
      `import { Icon } from ${
        JSON.stringify(
          new URL("../../src/components/core/icon/icon.tsx", import.meta.url)
            .href,
        )
      };`,
      'import { renderToStaticMarkup } from "react-dom/server";',
      "const outputs: string[] = []; const report = (value: string): void => { outputs.push(value); };",
    ];
    const label = 'An <&> "example" \\ label';
    for (
      const name of ["warning", "brand-mark", "copy", "selection-selected"]
    ) {
      for (const repertoire of ["unicode", "ascii"] as const) {
        for (const format of ["javascript", "react", "terminal"] as const) {
          let example = glyphUsageSource(name, label, format, repertoire)
            .split("\n").filter((line) => !line.startsWith("import ")).join(
              "\n",
            )
            .replaceAll("console.log(", "report(");
          if (format === "react") {
            example = example.replace("<Button", "const example = <Button") +
              ";\nreport(renderToStaticMarkup(example));";
          }
          source.push(`{\n${example}\n}`);
        }
      }
    }
    source.push("console.log(JSON.stringify(outputs));");
    const path = `${directory}/usage.tsx`;
    await Deno.writeTextFile(path, source.join("\n"));
    const result = await new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "--check",
        "--no-prompt",
        "--allow-env=NODE_ENV",
        "--config",
        new URL("../../deno.json", import.meta.url).pathname,
        path,
      ],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
    const outputs = JSON.parse(
      new TextDecoder().decode(result.stdout),
    ) as string[];
    assertEquals(outputs.length, 24);
    assert(
      outputs.some((value) =>
        value.includes("An &lt;&amp;&gt; &quot;example&quot;")
      ),
    );
    assert(outputs.some((value) => value === "⚠︎"));
    assert(outputs.some((value) => value === label));
    assert(outputs.some((value) => value.includes("+---")));
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});
