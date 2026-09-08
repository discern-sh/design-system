import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  captureTerminalFrame,
  runPtyProcess,
} from "../../src/cli/interactive/testing.ts";

Deno.test({
  name:
    "real PTY Escape, abort, and provider failure release stdin for a child and resumed application",
  ignore: Deno.build.os === "windows",
  fn: async () => {
    const geometry = { columns: 80, rows: 24 };
    const ready = {
      description: "complete Studio frame",
      test: (output: { phaseStdout: string }) => {
        try {
          return captureTerminalFrame(output.phaseStdout, geometry).frame
            .includes("Studio");
        } catch {
          return false;
        }
      },
    };
    for (const mode of ["escape", "abort", "provider"] as const) {
      const result = await runPtyProcess({
        command: Deno.execPath(),
        args: [
          "run",
          "--config",
          new URL("../../deno.json", import.meta.url).pathname,
          "--allow-env",
          "--allow-run",
          new URL("../fixtures/input-ownership-pty.ts", import.meta.url)
            .pathname,
          mode,
        ],
        cwd: new URL("../../", import.meta.url).pathname,
        geometry,
        env: { TERM: "xterm-256color", NO_COLOR: "1" },
        input: [
          ...(mode === "escape"
            ? [{
              waitFor: ready,
              steps: [{ bytes: "\x1b", allowLoneEscape: true }],
            }]
            : []),
          { waitFor: "CHILD_READY", steps: [{ bytes: "\r" }] },
          { waitFor: ready, steps: [{ bytes: "abq" }] },
        ],
        timeoutMs: 5_000,
      });
      assertEquals(result.code, 0, `${mode}: ${result.transcript}`);
      assertStringIncludes(result.transcript, "CHILD_DONE");
      assertStringIncludes(result.transcript, "OWNERSHIP_RESTORED");
    }
  },
});
