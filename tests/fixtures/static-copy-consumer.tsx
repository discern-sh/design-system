import { renderToStaticMarkup } from "react-dom/server";
import {
  Command,
  CopyButton,
  Diagnostic,
  PathReference,
  ResultSummary,
} from "../../src/react.ts";
import { emitDesignSystemRuntime } from "../../src/runtime.ts";

// Build-time only: the served document contains no React or hydration bundle.
export const exactValues = [
  "  first\r\nsecond\n\t終 🎨 `code` ${x} <&> \"' ",
  "",
  "\u0000\ud800",
];
export async function buildStaticCopyConsumer(output: URL): Promise<void> {
  const runtime = await emitDesignSystemRuntime({
    outputRoot: new URL("runtime/", output),
    components: ["command", "diagnostic", "path-reference", "result-summary"],
  });
  const machineReadable = JSON.stringify({ ok: true }, null, 2) + "\n";
  const markup = renderToStaticMarkup(
    <>
      <main data-discern-root="" style={{ padding: "1rem" }}>
        <h1>Static copy consumer</h1>
        <p>
          Copy requires the selected script. If unavailable, select the source
          text manually.
        </p>
        {exactValues.map((value, index) => (
          <section key={index}>
            <pre>{value}</pre>
            <CopyButton id={`exact-${index}`} value={value} />
          </section>
        ))}
        <Command command={exactValues[0]!} />
        <PathReference path=" /tmp/終/ sample.ts " copyable />
        <Diagnostic
          title="Check failed"
          impact="Output needs attention"
          correction="Retry the check"
          path="src/sample.ts"
          pathCopyable
          reproductionCommand="tool check\n"
        />
        <ResultSummary
          state="passed"
          fact="Check complete"
          machineReadable={machineReadable}
        />
        <CopyButton id="disabled" value="disabled" disabled />
        <CopyButton id="cancelled" value="cancelled" />
        <CopyButton
          id="custom"
          value="custom"
          label={<strong>Save text</strong>}
          copiedLabel={<em>Saved text</em>}
          icon={<b id="custom-icon">+</b>}
          copiedIcon={<b>✓</b>}
          copiedForMs={80}
        />
      </main>
      <aside data-discern-root="">
        <CopyButton id="second-root" value="second root" />
      </aside>
      <CopyButton id="outside-root" value="outside" />
    </>,
  );
  await Deno.writeTextFile(
    new URL("index.html", output),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Static copy consumer</title><link rel="stylesheet" href="runtime/discern.css"><body>${markup}${
      runtime.manifest.outputs.scripts.map((path) =>
        `<script type="module" src="runtime/${path}"></script>`
      ).join("")
    }</body></html>`,
  );
}
if (import.meta.main) await buildStaticCopyConsumer(new URL(Deno.args[0]!));
