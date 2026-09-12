import { renderToStaticMarkup } from "react-dom/server";
import { CodeBlock, CodeListing } from "../../src/react.ts";
import { emitDesignSystemRuntime } from "../../src/runtime.ts";

export const sourceValues = [
  '\t  const message = "終 🎨 <&> ";  \n\n' + "longToken".repeat(40) + "\n  \n",
  "",
  "first\r\n\tsecond  \r\n",
];

/** Emit a script-selected static source inspection page with no React client. */
export async function buildStaticCodeListing(output: URL): Promise<void> {
  const runtime = await emitDesignSystemRuntime({
    outputRoot: new URL("runtime/", output),
    components: ["code-listing", "code-block"],
  });
  const markup = renderToStaticMarkup(
    <main
      data-discern-root=""
      style={{ padding: "1rem", maxWidth: "70rem", margin: "auto" }}
    >
      <h1>Source inspection</h1>
      <p>
        Copy exact source, or select it manually when copying is unavailable.
        Wrapping is chosen by the page author.
      </p>
      {(["standard", "showcase"] as const).flatMap((variant) =>
        [false, true].flatMap((wrap) =>
          sourceValues.map((code, index) => (
            <CodeListing
              key={`${variant}-${wrap}-${index}`}
              id={`${variant}-${wrap}-${index}`}
              variant={variant}
              wrap={wrap}
              code={code}
              filename="src/examples/a-long-uninterrupted-filename-for-source-inspection.ts"
              language="TypeScript"
              caption={`${variant}: ${
                wrap ? "wrapped" : "scrollable"
              } source. Lines 1 and 3 are highlighted.`}
              highlightLines={[1, 3]}
            />
          ))
        )
      )}
      <CodeListing id="manual" code={sourceValues[0]!} copyable={false} wrap />
      {[false, true].map((wrap) => (
        <CodeBlock
          key={String(wrap)}
          id={`block-${wrap}`}
          code={sourceValues[0]!}
          wrap={wrap}
        />
      ))}
    </main>,
  );
  await Deno.writeTextFile(
    new URL("index.html", output),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Static source inspection</title><link rel="stylesheet" href="runtime/discern.css"><body>${markup}${
      runtime.manifest.outputs.scripts.map((path) =>
        `<script type="module" src="runtime/${path}"></script>`
      ).join("")
    }</body></html>`,
  );
}

if (import.meta.main) await buildStaticCodeListing(new URL(Deno.args[0]!));
