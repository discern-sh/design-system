import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  captureTerminalFrame,
  ptyOutputContains,
  runPtyProcess,
} from "../../src/cli/interactive/testing.ts";

Deno.test({
  name: "real PTY application updates, foreground return, and line discipline",
  ignore: Deno.build.os === "windows",
  fn: async () => {
    const size = { columns: 80, rows: 24 };
    const ready = (marker: string) => ({
      description: `complete Studio frame containing ${marker}`,
      test: (output: { phaseStdout: string }) => {
        try {
          const frame = captureTerminalFrame(output.phaseStdout, size).frame;
          return frame.includes(marker);
        } catch {
          return false;
        }
      },
    });
    const result = await runPtyProcess({
      command: Deno.execPath(),
      args: [
        "run",
        "--config",
        "deno.json",
        "--allow-env",
        "--allow-run",
        "tests/fixtures/application-pty.ts",
      ],
      cwd: new URL("../../", import.meta.url).pathname,
      geometry: size,
      env: { TERM: "xterm-256color", NO_COLOR: "1", LANG: "en_US.UTF-8" },
      input: [
        {
          waitFor: ready("Working"),
          capture: { name: "working", when: ready("Working") },
          steps: [{ bytes: "\x1b[B" }],
        },
        {
          waitFor: ready("✓ Field notes"),
          capture: { name: "ready", when: ready("✓ Field notes") },
          steps: [{ bytes: "\r" }],
        },
        { waitFor: ready("Run sample"), steps: [{ bytes: "\x1b[B\r" }] },
        { waitFor: "Press Enter to return", steps: [{ bytes: "\r" }] },
        {
          waitFor: ready("Run sample"),
          capture: { name: "returned", when: ready("Run sample") },
          steps: [{ bytes: "r" }],
        },
        ...([
          { columns: 40, rows: 20 },
          { columns: 120, rows: 30 },
          { columns: 80, rows: 13 },
          { columns: 24, rows: 6 },
          { columns: 80, rows: 24 },
        ] as const).map((geometry, i) => {
          const when = {
            description:
              `complete resized ${geometry.columns} x ${geometry.rows}`,
            test: (output: { phaseStdout: string }) => {
              try {
                return captureTerminalFrame(output.phaseStdout, geometry).frame
                  .includes(geometry.columns < 32 ? "Resize" : "Run sample");
              } catch {
                return false;
              }
            },
          };
          return {
            waitFor: when,
            capture: { name: `resize-${i}`, when },
            steps: [{ bytes: i === 4 ? "q" : "r" }] as const,
          };
        }),
      ],
      timeoutMs: 10_000,
    });
    assertEquals(result.code, 0, result.transcript);
    assertStringIncludes(result.transcript, "LINE_MODE_RESTORED");
    const captured = captureTerminalFrame(result.keyframes.returned!, size);
    assertStringIncludes(captured.frame, "Small atlas");
    assert(captured.html.includes("Run sample"));
    assert(
      ptyOutputContains("Studio").test({
        stdout: result.stdout,
        stderr: "",
        transcript: result.transcript,
        phaseStdout: result.stdout,
        phaseStderr: "",
      }),
    );
  },
});
