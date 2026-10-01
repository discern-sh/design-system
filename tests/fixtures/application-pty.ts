/** Real terminal line-discipline canary around the public demo. */
import { runTerminalApplication } from "../../src/cli/interactive/mod.ts";
import { applicationDemoOptions } from "../../scripts/playground/application.ts";
async function lineMode(): Promise<string> {
  const output = await new Deno.Command("stty", {
    args: ["-a"],
    stdin: "inherit",
    stdout: "piped",
  }).output();
  if (!output.success) throw new Error("stty failed");
  const description = new TextDecoder().decode(output.stdout);
  const enabled = (name: string) =>
    new RegExp(`(?:^|[\\s;])${name}(?:[\\s;]|$)`).test(description);
  return JSON.stringify(
    ["icanon", "echo", "isig", "iexten", "opost"].map(enabled),
  );
}
const before = await lineMode();
const demo = applicationDemoOptions(async () => {
  if (await lineMode() !== before) {
    throw new Error("foreground line mode differs");
  }
  const child = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      new URL("../../scripts/playground/application-child.ts", import.meta.url)
        .pathname,
    ],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();
  if (!(await child.status).success) throw new Error("child failed");
}, { updateAfterMs: 250 });
let resizeIndex = 0;
const geometries = [[40, 20], [120, 30], [80, 13], [24, 6], [80, 24]] as const;
await runTerminalApplication({
  ...demo,
  keymap: [...demo.keymap ?? [], { key: "R", action: "resize" }],
  onAction: (action, context, source) => {
    if (action === "resize") {
      const [columns, rows] = geometries[resizeIndex++ % geometries.length] ??
        [80, 24];
      void new Deno.Command("stty", {
        args: ["cols", String(columns), "rows", String(rows)],
        stdin: "inherit",
        stdout: "null",
        stderr: "piped",
      }).output().then((result) => {
        if (!result.success) throw new Error("resize failed");
        Deno.kill(Deno.pid, "SIGWINCH");
      }).catch(context.fail);
      return undefined;
    }
    return demo.onAction?.(action, context, source);
  },
});
if (await lineMode() !== before) {
  throw new Error("line mode differs after exit");
}
console.log("LINE_MODE_RESTORED");
