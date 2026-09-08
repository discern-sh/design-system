/** Capture named application states through the optional public PTY instruments. */
import {
  captureTerminalFrame,
  type PtyInputPhase,
  type PtyOutputCondition,
  ptyOutputContains,
  runPtyProcess,
} from "@discern-sh/design-system/cli/interactive/testing";
import { launchBrowser } from "./browser.ts";
const root = new URL("../", import.meta.url).pathname;
const directory = `${root}.scratch/application`;
await Deno.mkdir(directory, { recursive: true });
const browser = await launchBrowser();
try {
  for (
    const [name, columns, rows, theme, color, unicode] of [
      ["80x24-dark", 80, 24, "dark", true, true],
      ["120x30-dark", 120, 30, "dark", true, true],
      ["60x50-dark", 60, 50, "dark", true, true],
      ["40x20-dark", 40, 20, "dark", true, true],
      ["80x13-dark", 80, 13, "dark", true, true],
      ["80x24-light", 80, 24, "light", true, true],
      ["80x24-no-color", 80, 24, "dark", false, true],
      ["40x20-ascii", 40, 20, "dark", false, false],
      ["24x6-fallback", 24, 6, "dark", false, false],
    ] as const
  ) {
    const size = { columns, rows };
    const when = (marker: string): PtyOutputCondition => ({
      description: `complete ${name} frame containing ${marker}`,
      test: (output) => {
        try {
          return captureTerminalFrame(output.phaseStdout, size).frame.includes(
            marker,
          );
        } catch {
          return false;
        }
      },
    });
    const settled: PtyOutputCondition = {
      description: "updated complete overview",
      test: (output) => {
        try {
          const frame = captureTerminalFrame(output.phaseStdout, size).frame;
          return frame.includes("Field notes") && !frame.includes("Working");
        } catch {
          return false;
        }
      },
    };
    const first = columns < 32 ? "Resize" : "Working";
    const phases: readonly PtyInputPhase[] = columns < 32
      ? [{
        waitFor: when(first),
        capture: { name: "fallback", when: when(first) },
        steps: [{ bytes: "q" }],
      }]
      : [
        {
          waitFor: when(first),
          capture: { name: "overview", when: when(first) },
          steps: [],
        },
        {
          waitFor: settled,
          capture: { name: "updated", when: settled },
          steps: [{ bytes: "\x1b[B\r" }],
        },
        {
          waitFor: when("Run sample"),
          capture: { name: "item", when: when("Run sample") },
          steps: [{ bytes: "\x1b[B\r" }],
        },
        {
          waitFor: ptyOutputContains("A short detour."),
          steps: [{ bytes: "\r" }],
        },
        {
          waitFor: when("Run sample"),
          capture: { name: "returned", when: when("Run sample") },
          steps: [{ bytes: "?" }],
        },
        {
          waitFor: when("Keep your place"),
          capture: { name: "reading", when: when("Keep your place") },
          steps: [{ bytes: "q" }],
        },
      ];
    const result = await runPtyProcess({
      command: color ? "/usr/bin/env" : Deno.execPath(),
      args: [
        ...(color ? ["-u", "NO_COLOR", Deno.execPath()] : []),
        "run",
        "--config",
        "deno.json",
        "--allow-env",
        "--allow-run",
        "scripts/application-demo.ts",
        ...(theme === "light" ? ["--light"] : []),
      ],
      cwd: root,
      geometry: size,
      env: {
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
        NO_COLOR: color ? "" : "1",
        LC_ALL: unicode ? "en_US.UTF-8" : "C",
      },
      input: phases,
      timeoutMs: 10_000,
    });
    if (result.code !== 0) throw new Error(result.transcript);
    await Deno.writeTextFile(`${directory}/${name}.ansi`, result.transcript);
    for (const [state, transcript] of Object.entries(result.keyframes)) {
      const captured = captureTerminalFrame(transcript, size, {
        theme,
        appearance: { accent: 220 },
      });
      const stem = `${directory}/${name}-${state}`;
      await Deno.writeTextFile(`${stem}.html`, captured.html);
      const page = await browser.newPage({
        viewport: { width: 1400, height: 1600 },
        deviceScaleFactor: 1,
      });
      await page.setContent(captured.html);
      await page.addStyleTag({ content: "pre { width: max-content; }" });
      await page.locator("pre").screenshot({ path: `${stem}.png` });
      await page.close();
      console.log(`${stem}.png`);
    }
  }
} finally {
  await browser.close();
}
