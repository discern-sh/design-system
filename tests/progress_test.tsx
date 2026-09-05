import { assert, assertEquals, assertThrows } from "@std/assert";
import { toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser } from "../scripts/browser.ts";
import { Progress } from "../src/components/feedback/progress/progress.tsx";
import { resolveProgress } from "../src/components/feedback/progress/progress.types.ts";
import renderProgressCli, {
  cliExamples,
} from "../src/components/feedback/progress/progress.cli.ts";
import { testTerminalCapabilities } from "../src/cli/interactive/testing.ts";
import { stripAnsi } from "../src/cli/ansi.ts";
import { measureText } from "../src/cli/text.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";

Deno.test("Progress normalizes unknown and invalid input without inventing completion", () => {
  for (const value of [undefined, NaN, Infinity, -Infinity]) {
    assertEquals(resolveProgress(value === undefined ? {} : { value }), {
      value: undefined,
      max: 100,
      fraction: undefined,
      reading: "Waiting",
    });
  }
  for (const max of [0, -8, NaN, Infinity]) {
    assertEquals(resolveProgress({ value: 3, max }).max, 100);
  }
  assertEquals(resolveProgress({ value: -1, max: 8 }).value, 0);
  assertEquals(resolveProgress({ value: 99, max: 8 }).value, 8);
  assertEquals(resolveProgress({ value: 0.5, max: 2 }).fraction, 0.25);
  assertThrows(() => renderToStaticMarkup(<Progress label=" " />), TypeError);
});

Deno.test("Progress exposes named, truthful value semantics and a still waiting state", async () => {
  const browser = await launchBrowser();
  const output = await Deno.makeTempDir();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["progress"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const page = await browser.newPage();
    for (
      const [value, expected] of [[0, 0], [3, 3], [8, 8], [-1, 0], [99, 8], [
        NaN,
        undefined,
      ], [undefined, undefined]] as const
    ) {
      const html = renderToStaticMarkup(
        <Progress
          label="Process files"
          max={8}
          context="Files completed"
          {...(value === undefined ? {} : { value })}
        />,
      );
      await page.setContent(
        `<html data-discern-root><head><style>${css}</style></head><body><main style="width:260px">${html}</main></body></html>`,
      );
      const bar = page.getByRole("progressbar", { name: "Process files" });
      assertEquals(await bar.count(), 1);
      assertEquals(
        await bar.getAttribute("aria-valuenow"),
        expected === undefined ? null : String(expected),
      );
      assertEquals(await bar.getAttribute("aria-valuemin"), "0");
      assertEquals(await bar.getAttribute("aria-valuemax"), "8");
      assert(
        (await bar.getAttribute("aria-valuetext"))?.includes("Files completed"),
      );
      if (expected === undefined) {
        assert(await page.getByText("Waiting", { exact: true }).isVisible());
        await page.emulateMedia({
          reducedMotion: "reduce",
          forcedColors: "active",
        });
        const fill = bar.locator(".discern-progress__fill");
        assertEquals(
          await fill.evaluate((node) => getComputedStyle(node).animationName),
          "none",
        );
        assert(
          await fill.evaluate((node) =>
            parseFloat(getComputedStyle(node).borderBottomWidth) > 0
          ),
        );
        assert(await page.getByText("Waiting", { exact: true }).isVisible());
        await page.emulateMedia({
          reducedMotion: "no-preference",
          forcedColors: "none",
        });
      } else {
        const fraction = await bar.evaluate((node) =>
          node.firstElementChild!.getBoundingClientRect().width /
          (node.clientWidth)
        );
        assert(Math.abs(fraction - expected / 8) < 0.01);
      }
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("Progress CLI prints exact supplied work or waiting across widths and capabilities", () => {
  const plain = testTerminalCapabilities({ columns: 20, unicode: false });
  assertEquals(
    stripAnsi(
      renderProgressCli({ label: "Task", context: "Finding files" }, plain),
    ),
    "Task\nWaiting\nFinding files",
  );
  const progress = stripAnsi(
    renderProgressCli({ label: "Task", value: 3, max: 8 }, plain),
  );
  assert(progress.includes("[ 37%]"));
  assert(progress.endsWith("3 / 8"));
  assert(
    stripAnsi(renderProgressCli({ label: "Task", value: 8, max: 8 }, plain))
      .endsWith("8 / 8 - Complete"),
  );
  assert(
    !renderProgressCli({ label: "Task", value: NaN }, plain).includes("%"),
  );
  for (const columns of [8, 28, 72]) {
    for (const unicode of [false, true]) {
      for (
        const colorDepth of ["none", "ansi16", "ansi256", "truecolor"] as const
      ) {
        const capabilities = testTerminalCapabilities({
          columns,
          unicode,
          colorDepth,
        });
        for (const example of cliExamples) {
          const frame = renderProgressCli(example.props, capabilities);
          assertEquals(frame, renderProgressCli(example.props, capabilities));
          assert(
            frame.split("\n").every((line) => measureText(line) <= columns),
          );
          if (!unicode) assert(/^[\x20-\x7e\n]*$/.test(stripAnsi(frame)));
        }
      }
    }
  }
});
