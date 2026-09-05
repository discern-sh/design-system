import { assertEquals } from "@std/assert";
import { toFileUrl } from "@std/path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser } from "../scripts/browser.ts";
import { misalignedGridText } from "../scripts/conformance/centered-grid-text.ts";
import { Button } from "../src/components/core/button/button.tsx";
import type { ButtonSize } from "../src/components/core/button/button.types.ts";
import { IconButton } from "../src/components/core/icon-button/icon-button.tsx";
import { Icon } from "../src/components/core/icon/icon.tsx";
import { Banner } from "../src/components/feedback/banner/banner.tsx";
import { Toast } from "../src/components/feedback/toast/toast.tsx";
import { RawOutput } from "../src/components/workflow/raw-output/raw-output.tsx";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import { baseTokens } from "../src/tokens/tokens.ts";

Deno.test("the centered text guard catches a fresh grid without mistaking graphics or natural rows", async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(
      `<style>.future-command { display:grid; place-items:center; width:16px; height:16px; font:20px/2 Arial; }</style>
      <div class="future-command">+</div>
      <button class="future-command"><span>+</span></button>
      <div class="future-command" style="place-content:center">+</div>
      <div class="future-command" style="height:auto">A natural row</div>
      <div class="future-command"><svg width="16" height="16"></svg></div>`,
    );
    assertEquals((await misalignedGridText(page)).length, 2);
    await page.locator(".future-command").evaluateAll((nodes) => {
      for (const node of nodes) {
        (node as HTMLElement).style.alignContent = "center";
      }
    });
    assertEquals(await misalignedGridText(page), []);
  } finally {
    await browser.close();
  }
});

Deno.test("compact icon slots center text rows independently of text size and leading", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: [
        "button",
        "icon-button",
        "icon",
        "banner",
        "toast",
        "raw-output",
      ],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const sizes = baseTokens.filter(({ name }) =>
      name.startsWith("--discern-control-size-")
    ).map(({ name }) =>
      name.slice("--discern-control-size-".length) as ButtonSize
    );
    const svg = createElement("svg", {
      viewBox: "0 0 16 16",
      "data-graphic-witness": true,
    }, createElement("path", { d: "M8 2v12M2 8h12", stroke: "currentColor" }));
    const markup = [
      ...sizes.flatMap((size) => [
        createElement(Button, {
          size,
          leadingIcon: "+",
          trailingIcon: "→",
          children: "Continue",
        }),
        createElement(IconButton, { size, icon: "+", label: "Add" }),
        createElement(IconButton, { size, icon: svg, label: "Graphic" }),
      ]),
      createElement(Icon, { size: "0.6em", children: "+" }),
      createElement(Banner, { children: "Message" }),
      createElement(Toast, { children: "Saved" }),
      createElement(RawOutput, { children: "Details" }),
    ].map((node) => renderToStaticMarkup(node)).join("");
    const page = await browser.newPage();
    await page.setContent(
      `<html data-discern-root><head><style>${css}</style></head><body>${markup}</body></html>`,
    );
    for (const fontSize of [16, 24]) {
      for (const lineHeight of [1.58, 2.4]) {
        await page.locator("body").evaluate((node, values) => {
          node.style.fontSize = `${values.fontSize}px`;
          node.style.lineHeight = String(values.lineHeight);
        }, { fontSize, lineHeight });
        assertEquals(
          await misalignedGridText(page),
          [],
          `font ${fontSize}, leading ${lineHeight}`,
        );
        const offsets = await page.locator("[data-graphic-witness]")
          .evaluateAll((nodes) =>
            nodes.map((node) => {
              const graphic = node.getBoundingClientRect(),
                slot = node.parentElement!.getBoundingClientRect();
              return {
                x: Math.abs(
                  graphic.x + graphic.width / 2 - slot.x - slot.width / 2,
                ),
                y: Math.abs(
                  graphic.y + graphic.height / 2 - slot.y - slot.height / 2,
                ),
                width: Math.abs(graphic.width - slot.width),
                height: Math.abs(graphic.height - slot.height),
              };
            })
          );
        assertEquals(
          offsets.every(({ x, y, width, height }) =>
            x < 0.5 && y < 0.5 && width < 0.5 && height < 0.5
          ),
          true,
        );
      }
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});
