/** Capture named application states through the optional public PTY instruments. */
import {
  captureTerminalFrame,
  type PtyInputPhase,
  type PtyOutputCondition,
  ptyOutputContains,
  ptySettledFrame,
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
      ["60x20-dark", 60, 20, "dark", true, true],
      ["40x20-dark", 40, 20, "dark", true, true],
      ["80x13-dark", 80, 13, "dark", true, true],
      ["80x24-light", 80, 24, "light", true, true],
      ["80x24-no-color", 80, 24, "dark", false, true],
      ["40x20-ascii", 40, 20, "dark", false, false],
      ["32x10-dark", 32, 10, "dark", true, true],
      ["24x6-fallback", 24, 6, "dark", false, false],
    ] as const
  ) {
    const size = { columns, rows };
    const when = (marker: string): PtyOutputCondition =>
      ptySettledFrame(
        size,
        `settled ${name} frame containing ${marker}`,
        (capture) => capture.text.includes(marker),
      );
    const settled = ptySettledFrame(
      size,
      "updated settled overview",
      (capture) => capture.state?.selectedItemId === "search-index",
    );
    // A later spinner phase than the first frame shows the tick repainting.
    const spinning = ptySettledFrame(
      size,
      "overview at a later spinner phase",
      (capture) => capture.text.includes("◑") && capture.state !== undefined,
    );
    const first = columns < 32 ? "Too small" : "Running";
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
        // The spinner is visible wherever its group is not folded to fit.
        ...(unicode && rows > 10
          ? [{
            waitFor: spinning,
            capture: { name: "spinning", when: spinning },
            steps: [],
          }]
          : []),
        {
          waitFor: when("2 to review"),
          capture: { name: "updated", when: when("2 to review") },
          steps: [{ bytes: "\x1b[B" }],
        },
        {
          waitFor: settled,
          capture: { name: "selected", when: settled },
          steps: [{ bytes: " " }],
        },
        {
          waitFor: ptySettledFrame(
            size,
            "zoomed detail",
            (capture) => capture.state?.zoomed === true,
          ),
          capture: {
            name: "zoomed",
            when: ptySettledFrame(
              size,
              "zoomed detail",
              (capture) => capture.state?.zoomed === true,
            ),
          },
          steps: [{ bytes: " \r" }],
        },
        {
          waitFor: ptyOutputContains("A short detour."),
          steps: [{ bytes: "\r" }],
        },
        {
          waitFor: when("Image resize"),
          capture: { name: "returned", when: when("Image resize") },
          steps: [{ bytes: "/re" }],
        },
        {
          waitFor: ptySettledFrame(
            size,
            "filtered list",
            (capture) => capture.state?.focusedControlId === "jobs:filter",
          ),
          capture: {
            name: "filtered",
            when: ptySettledFrame(
              size,
              "filtered list",
              (capture) => capture.state?.focusedControlId === "jobs:filter",
            ),
          },
          steps: [{ bytes: "\rq" }],
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
        TERMINAL_APPLICATION_STATE_REPORTS: "1",
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
      await Deno.writeTextFile(
        `${stem}.state.json`,
        `${JSON.stringify(captured.state ?? null)}\n`,
      );
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
