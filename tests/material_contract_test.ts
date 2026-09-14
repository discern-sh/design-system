import { assert, assertEquals } from "@std/assert";
import { fromFileUrl, join, toFileUrl } from "@std/path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Page } from "playwright-core";
import { launchBrowser } from "../scripts/browser.ts";
import { waitForPaintedFrames } from "../scripts/browser-conformance-support.ts";
import {
  cssDeclarations,
  cssQualifiedRuleBlocks,
} from "../scripts/css-syntax.ts";
import { Icon } from "../src/components/core/icon/icon.tsx";
import { LightBackdrop } from "../src/components/artwork/light-backdrop/light-backdrop.tsx";
import { Card } from "../src/components/display/card/card.tsx";
import { Terminal } from "../src/components/display/terminal/terminal.tsx";
import { parseComputedAppearanceColor } from "../scripts/conformance/appearance-projection.ts";
import { compositeOklab, oklabContrast } from "../src/internal/oklch.ts";
import {
  filledShieldSvg,
  outlinedCompassSvg,
} from "../src/fixtures/imported-icons.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";

const root = fromFileUrl(new URL("..", import.meta.url));

Deno.test("Web Terminal semantic text stays readable on its fixed inverse surface", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["terminal"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const terminal = renderToStaticMarkup(createElement(Terminal, {
      variant: "showcase",
      children: ["command-prefix", "success"].map((role) =>
        createElement("span", {
          key: role,
          className: `discern-terminal__${role}`,
        }, role)
      ),
    }));
    const page = await browser.newPage();
    for (const theme of ["light", "dark"]) {
      await page.setContent(
        `<html data-discern-root data-discern-theme="${theme}"><style>${css}</style><body>${terminal}</body></html>`,
      );
      const background = parseComputedAppearanceColor(
        await page.locator(".discern-terminal").evaluate((node) =>
          getComputedStyle(node).backgroundColor
        ),
      );
      for (
        const foreground of await page.locator(".discern-terminal__body span")
          .evaluateAll((nodes) =>
            nodes.map((node) => getComputedStyle(node).color)
          )
      ) {
        const paint = parseComputedAppearanceColor(foreground);
        assert(
          oklabContrast(
            compositeOklab(paint.color, paint.alpha, background.color),
            background.color,
          ) >= 4.5,
          `${theme}: ${foreground} on the inverse surface`,
        );
      }
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

async function stylesheets(path: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(path)) {
    const child = join(path, entry.name);
    if (entry.isDirectory) files.push(...await stylesheets(child));
    else if (entry.isFile && entry.name.endsWith(".css")) files.push(child);
  }
  return files;
}

/** Untargeted SVG paint rules override the presentation attributes of supplied graphics. */
function suppliedPaintOverrides(css: string): string[] {
  return cssQualifiedRuleBlocks(css).rules.filter(({ selector, block }) =>
    /(?:^|[\s,(>+~])svg(?=[\s,)>+~:]|$)/u.test(selector) &&
    cssDeclarations(block).some(({ name }) =>
      name === "fill" || name === "stroke"
    )
  ).map(({ selector }) => selector);
}

/** Enrol moving gradient sheets by their CSS mechanism, independent of component names. */
function movingGradientSheets(css: string): string[] {
  return cssQualifiedRuleBlocks(css).rules.filter(({ block }) => {
    const declarations = cssDeclarations(block);
    return declarations.some(({ name, value }) =>
      /^background(?:-image)?$/u.test(name) && value.includes("gradient(")
    ) &&
      declarations.some(({ name, value }) =>
        name === "position" && value === "absolute"
      ) &&
      declarations.some(({ name }) => name === "transform") &&
      declarations.some(({ name }) =>
        name === "animation" || name === "animation-name"
      );
  }).map(({ selector }) => selector);
}

async function uncoveredSheets(page: Page): Promise<string[]> {
  return await page.locator(".clip > *").evaluateAll((nodes) =>
    nodes.flatMap((node) => {
      const clip = node.parentElement!.getBoundingClientRect();
      const animations = node.getAnimations();
      const failed: string[] = [];
      if (animations.length === 0) {
        return [`${node.className}: no active animation`];
      }
      for (const animation of animations) {
        const effect = animation.effect as KeyframeEffect;
        const duration = Number(effect.getComputedTiming().duration);
        if (!Number.isFinite(duration) || duration <= 0) {
          failed.push(`${node.className}: no finite positive duration`);
          continue;
        }
        animation.pause();
        const phases = new Set([
          0,
          0.25,
          0.5,
          0.75,
          0.999999,
          ...effect.getKeyframes().map(({ computedOffset }) =>
            Math.min(computedOffset, 0.999999)
          ),
        ]);
        for (const fraction of phases) {
          animation.currentTime = duration * fraction;
          const plane = node.getBoundingClientRect();
          if (
            plane.left > clip.left + 0.1 || plane.right < clip.right - 0.1 ||
            plane.top > clip.top + 0.1 || plane.bottom < clip.bottom - 0.1
          ) {
            failed.push(`${node.className} at ${fraction}`);
          }
        }
      }
      return failed;
    })
  );
}

Deno.test("supplied SVG paint stays with the asset across every authored wrapper sheet", async () => {
  assertEquals(
    suppliedPaintOverrides(
      ".unrelated-slot > svg { fill: none; stroke: currentColor; }",
    ),
    [".unrelated-slot > svg"],
  );
  assertEquals(
    suppliedPaintOverrides(".owned-vector-path { fill: currentColor; }"),
    [],
  );
  for (const directory of ["src", "catalogue"]) {
    for (const file of await stylesheets(join(root, directory))) {
      assertEquals(
        suppliedPaintOverrides(await Deno.readTextFile(file)),
        [],
        file,
      );
    }
  }
});

Deno.test("moving full-area gradient sheets keep their edges beyond the clip at every phase", async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const sources = await Promise.all(
      (await stylesheets(join(root, "src"))).map((file) =>
        Deno.readTextFile(file)
      ),
    );
    const css = sources.join("\n");
    const selectors = movingGradientSheets(css);
    assert(
      selectors.length > 0,
      "the mechanism census must have a real witness",
    );
    const future =
      ".unrelated-sheet { position:absolute; inset:-35% -20%; background:linear-gradient(110deg, transparent, gray); transform:translateX(-4%); animation:future-drift 24s infinite alternate; } @keyframes future-drift { to {transform:translateX(18%)} }";
    assertEquals(movingGradientSheets(future), [".unrelated-sheet"]);
    // A compound selector must be given a faithful fixture before it can pass.
    // New stylesheet containers and new class names enrol through the census above.
    for (const selector of selectors) {
      assert(
        /^\.[\w-]+$/u.test(selector),
        `Supply faithful ancestry for ${selector}`,
      );
    }
    for (const [width, height] of [[240, 520], [720, 240], [1120, 800]]) {
      await page.setContent(`<style>${css}${future}
        .clip {position:relative;overflow:hidden;width:${width}px;height:${height}px;--discern-backdrop-beat:2.4s;--discern-backdrop-ease-drift:linear;}
        </style>${
        [...selectors, ".unrelated-sheet"].map((selector) =>
          `<div class="clip"><div class="${selector.slice(1)}"></div></div>`
        ).join("")
      }`);
      const failures = await uncoveredSheets(page);
      assert(
        failures.some((failure) => failure.startsWith("unrelated-sheet")),
        "the independently named undersized plane must fail",
      );
      assertEquals(
        failures.filter((failure) => !failure.startsWith("unrelated-sheet")),
        [],
        `${width} × ${height}`,
      );
      await page.addStyleTag({ content: ".unrelated-sheet { inset:-35%; }" });
      assertEquals(
        await uncoveredSheets(page),
        [],
        "enough overscan cures the independent instance too",
      );
      await page.addStyleTag({
        content: ".unrelated-sheet { animation-duration: 0s; }",
      });
      assert(
        (await uncoveredSheets(page)).some((failure) =>
          failure.startsWith("unrelated-sheet: no")
        ),
        "a missing duration cannot make geometry coverage pass vacuously",
      );
    }
  } finally {
    await browser.close();
  }
});

Deno.test("public material ingredients preserve paint, labels, small icons and motion opt-outs", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["icon", "card", "light-backdrop"],
      appearanceScopes: true,
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const graphics = [
      outlinedCompassSvg,
      filledShieldSvg,
      '<svg viewBox="0 0 16 16" fill="currentColor" stroke="none"><g><circle cx="8" cy="8" r="7"/></g></svg>',
    ];
    const markup = graphics.flatMap((svg, index) =>
      [16, 64].map((size) =>
        renderToStaticMarkup(createElement(Icon, {
          size,
          fit: "contain",
          relief: true,
          label: `Graphic ${index} at ${size}`,
          children: null,
          dangerouslySetInnerHTML: { __html: svg },
        }))
      )
    ).join("");
    const card = renderToStaticMarkup(
      createElement(Card, {
        texture: "shaded",
        arrival: "shimmer",
        children: "Complete information",
      }),
    );
    const backdrop = renderToStaticMarkup(createElement(LightBackdrop, {}));
    const page = await browser.newPage();
    await page.setContent(
      `<html data-discern-root><style>${css}</style><body>${markup}${card}<div style="position:relative;width:400px;height:200px">${backdrop}</div></body></html>`,
    );
    const observed = await page.locator(".discern-icon").evaluateAll((icons) =>
      icons.map((icon) => {
        const svg = icon.querySelector("svg")!;
        const path = svg.querySelector("path,circle")!;
        const style = getComputedStyle(path);
        return {
          label: icon.getAttribute("aria-label"),
          role: icon.getAttribute("role"),
          fill: style.fill,
          stroke: style.stroke,
          filter: getComputedStyle(svg).filter,
          width: svg.getBoundingClientRect().width,
        };
      })
    );
    for (const [index, item] of observed.entries()) {
      assertEquals(item.role, "img");
      assert(item.label?.startsWith("Graphic"));
      assertEquals(item.width, index % 2 === 0 ? 16 : 64);
      assertEquals(
        item.filter === "none",
        index % 2 === 0,
        "only expressive allocations take relief",
      );
      assertEquals(
        item.fill === "none",
        index < 2,
        "outlined and filled path paint must survive the wrapper",
      );
      assertEquals(item.stroke === "none", index >= 2);
    }
    await page.locator("body").evaluate(
      (body, html) => body.insertAdjacentHTML("beforeend", html),
      renderToStaticMarkup(createElement(Icon, {
        id: "intrinsic",
        size: 64,
        relief: true,
        children: null,
        dangerouslySetInnerHTML: { __html: outlinedCompassSvg },
      })),
    );
    assertEquals(
      await page.locator("#intrinsic > svg").evaluate((svg) => ({
        width: svg.getBoundingClientRect().width,
        filter: getComputedStyle(svg).filter,
      })),
      { width: 24, filter: "none" },
      "an oversized wrapper must not give a small intrinsic asset relief",
    );
    assertEquals(
      await page.locator(".discern-light-backdrop__light").evaluate((node) =>
        node.getAnimations().length
      ),
      0,
      "light starts still",
    );
    await page.locator(".discern-backdrop").evaluate((node) =>
      node.classList.remove("discern-backdrop--still")
    );
    assertEquals(
      await page.locator(".discern-light-backdrop__light").evaluate((node) =>
        node.getAnimations().length
      ),
      1,
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    assertEquals(
      await page.locator(".discern-light-backdrop__light").evaluate((node) =>
        node.getAnimations().length
      ),
      0,
    );
    assertEquals(
      await page.locator(".discern-card").evaluate((node) =>
        getComputedStyle(node, "::after").display
      ),
      "none",
    );
    assertEquals(
      await page.locator(".discern-card").innerText(),
      "Complete information",
    );
    await page.emulateMedia({ forcedColors: "active" });
    await waitForPaintedFrames(page);
    assertEquals(await page.locator(".discern-backdrop").isVisible(), false);
    assertEquals(
      await page.locator(".discern-icon > svg").evaluateAll((nodes) =>
        nodes.map((node) => getComputedStyle(node).filter)
      ),
      Array(7).fill("none"),
    );
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});
