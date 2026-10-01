import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  captureTerminalFrame,
  ptyOutputContains,
  ptySettledFrame,
  runPtyProcess,
} from "../../src/cli/interactive/testing.ts";

Deno.test({
  name: "real PTY application updates, foreground return, and line discipline",
  ignore: Deno.build.os === "windows",
  fn: async () => {
    const size = { columns: 80, rows: 24 };
    const ready = (marker: string) =>
      ptySettledFrame(
        size,
        `settled Studio frame containing ${marker}`,
        (capture) => capture.text.includes(marker),
      );
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
          waitFor: ready("1 to review"),
          capture: { name: "working", when: ready("1 to review") },
          steps: [{ bytes: "\x1b[B" }],
        },
        {
          waitFor: ready("2 to review"),
          capture: { name: "ready", when: ready("2 to review") },
          steps: [{ bytes: "\r" }],
        },
        { waitFor: "Press Enter to return", steps: [{ bytes: "\r" }] },
        {
          waitFor: ready("Run sample"),
          capture: { name: "returned", when: ready("Run sample") },
          steps: [{ bytes: "R" }],
        },
        ...([
          { columns: 40, rows: 20 },
          { columns: 120, rows: 30 },
          { columns: 80, rows: 13 },
          { columns: 24, rows: 6 },
          { columns: 80, rows: 24 },
        ] as const).map((geometry, i) => {
          const when = ptySettledFrame(
            geometry,
            `settled resized ${geometry.columns} x ${geometry.rows}`,
            (capture) =>
              capture.text.includes(
                geometry.columns < 32 ? "Too small" : "Image resize",
              ),
          );
          return {
            waitFor: when,
            capture: { name: `resize-${i}`, when },
            steps: [{ bytes: i === 4 ? "q" : "R" }] as const,
          };
        }),
      ],
      timeoutMs: 10_000,
    });
    assertEquals(result.code, 0, result.transcript);
    assertStringIncludes(result.transcript, "LINE_MODE_RESTORED");
    const returned = result.keyframes.returned;
    assert(returned !== undefined, "the returned frame was captured");
    const captured = captureTerminalFrame(returned, size);
    assertStringIncludes(captured.frame, "Image resize");
    assert(captured.html.includes("Run sample"));
    assertStringIncludes(result.transcript, "Running ");
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
