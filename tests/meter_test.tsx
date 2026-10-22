import { assert, assertEquals } from "@std/assert";
import { toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser } from "../scripts/browser.ts";
import { Meter } from "../src/components/feedback/meter/meter.tsx";
import type { MeterTone } from "../src/components/feedback/meter/meter.types.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";

Deno.test("Meter fill and track stay visible when forced colours strip backgrounds", async () => {
  const browser = await launchBrowser();
  const output = await Deno.makeTempDir();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["meter"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const tones: readonly MeterTone[] = ["neutral", "warning", "danger"];
    const html = tones.map((tone) =>
      renderToStaticMarkup(
        <Meter label={`Storage ${tone}`} value={60} tone={tone} />,
      )
    ).join("");
    const page = await browser.newPage();
    await page.setContent(
      `<html data-discern-root><head><style>${css}</style></head><body><main style="width:320px">${html}</main></body></html>`,
    );
    const fractions = await page.locator(".discern-meter__track").evaluateAll(
      (tracks) =>
        tracks.map((track) =>
          track.firstElementChild!.getBoundingClientRect().width /
          track.clientWidth
        ),
    );
    assertEquals(fractions.length, tones.length);
    for (const fraction of fractions) assert(Math.abs(fraction - 0.6) < 0.01);

    await page.emulateMedia({ forcedColors: "active" });
    const forced = await page.locator(".discern-meter__track").evaluateAll(
      (tracks) =>
        tracks.map((track) => ({
          track: parseFloat(getComputedStyle(track).borderTopWidth),
          fill: parseFloat(
            getComputedStyle(track.firstElementChild!).borderBottomWidth,
          ),
        })),
    );
    for (const { track, fill } of forced) {
      assert(track > 0, "the forced-colours track keeps an edge");
      assert(fill > 0, "the forced-colours fill keeps a painted border");
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});
