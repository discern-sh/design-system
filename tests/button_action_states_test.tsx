import { assert, assertEquals } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "../src/components/core/button/button.tsx";
import { Icon } from "../src/components/core/icon/icon.tsx";
import { IconButton } from "../src/components/core/icon-button/icon-button.tsx";

Deno.test("Unavailable static actions cannot retain native activation", () => {
  for (const unavailable of [true, "true"] as const) {
    for (
      const element of [
        <Button key="text" aria-disabled={unavailable}>Archive records</Button>,
        <IconButton
          key="icon"
          aria-disabled={unavailable}
          icon="×"
          label="Close inspector"
        />,
      ]
    ) {
      assert(renderToStaticMarkup(element).includes('disabled=""'));
    }
    const html = renderToStaticMarkup(
      <Button href="#archive" aria-disabled={unavailable}>
        Archive records
      </Button>,
    );
    assert(!html.includes("href="));
    assert(html.includes('role="link"'));
    assert(html.includes('tabindex="-1"'));
  }
  assertEquals(
    renderToStaticMarkup(<Button aria-disabled="false">Archive</Button>)
      .includes('disabled=""'),
    false,
  );
});

import { toFileUrl } from "@std/path";
import { launchBrowser } from "../scripts/browser.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import { catalogueExamples as buttonExamples } from "../src/components/core/button/button.examples.tsx";
import { catalogueExamples as iconExamples } from "../src/components/core/icon-button/icon-button.examples.tsx";

Deno.test("Action matrix preserves meaning, size floors, icon slots and unavailable posture", async () => {
  const browser = await launchBrowser();
  const output = await Deno.makeTempDir();
  try {
    const isolated = await browser.newPage();
    for (const action of ["button", "icon-button"]) {
      await emitDesignSystemRuntime({
        outputRoot: toFileUrl(`${output}/`),
        components: [action],
      });
      const selectedCss = await Deno.readTextFile(`${output}/discern.css`);
      assert(
        selectedCss.includes("@keyframes discern-icon-busy"),
        `${action} alone includes its loading ring motion`,
      );
      await isolated.setContent(
        `<html data-discern-root><style>${selectedCss}</style>${
          renderToStaticMarkup(
            action === "button"
              ? <Button busy>Continue</Button>
              : <IconButton busy label="Continue" icon="+" />,
          )
        }</html>`,
      );
      assertEquals(
        await isolated.locator(".discern-icon--busy path").evaluate((path) => {
          const paint = getComputedStyle(path);
          return paint.fill === "none" && paint.stroke !== "none" &&
            parseFloat(paint.strokeWidth) > 0;
        }),
        true,
        `${action} alone paints its loading ring`,
      );
    }
    await isolated.close();
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["button", "icon-button", "icon"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const page = await browser.newPage({
      hasTouch: true,
      viewport: { width: 390, height: 900 },
    });
    const html = [...buttonExamples, ...iconExamples].map(({ Example }) =>
      renderToStaticMarkup(<Example />)
    ).join("");
    for (const theme of ["light", "dark"]) {
      for (const density of [0.5, 1, 2]) {
        for (const fontSize of [16, 24]) {
          await page.setContent(
            `<html data-discern-root data-discern-theme="${theme}" style="font-size:${fontSize}px;--discern-density:${density}"><head><style>${css}.discern-example-row{display:flex;flex-wrap:wrap;gap:8px}body{margin:16px}main{width:320px;max-width:100%}</style></head><body><main>${html}</main></body></html>`,
          );
          for (const forcedColors of ["none", "active"] as const) {
            await page.emulateMedia({ forcedColors, reducedMotion: "reduce" });
            const failures = await page.locator(
              ".discern-button, .discern-icon-button",
            ).evaluateAll((nodes) =>
              nodes.flatMap((node) => {
                const box = node.getBoundingClientRect();
                const style = getComputedStyle(node);
                const size = ["sm", "md", "lg"].find((size) =>
                  node.classList.contains(`discern-button--${size}`) ||
                  node.classList.contains(`discern-icon-button--${size}`)
                )!;
                const floor = ({ sm: 2, md: 2.5, lg: 3 })[size]! *
                  parseFloat(
                    getComputedStyle(document.documentElement).fontSize,
                  );
                const errors = [];
                if (box.height + 0.1 < floor) errors.push("target floor");
                if (node.scrollWidth > node.clientWidth + 1) {
                  errors.push("horizontal overflow");
                }
                if (
                  node.matches(':disabled, [aria-disabled="true"]') &&
                  (style.opacity !== "1" || style.borderTopStyle !== "dashed")
                ) errors.push("disabled witness");
                if (node.getAttribute("aria-busy") === "true") {
                  const glyph = node.querySelector(".discern-icon--busy svg");
                  if (
                    !glyph || getComputedStyle(glyph).animationName !== "none"
                  ) {
                    errors.push("still loading ring");
                  } else {
                    const ring = glyph.getBoundingClientRect();
                    if (
                      ring.width <= 0 || ring.height <= 0 ||
                      ring.left < box.left || ring.right > box.right ||
                      ring.top < box.top || ring.bottom > box.bottom
                    ) {
                      errors.push("contained loading ring");
                    }
                    const label = node.querySelector(".discern-button__label")
                      ?.getBoundingClientRect();
                    if (
                      label && ring.right > label.left &&
                      ring.left < label.right &&
                      ring.bottom > label.top && ring.top < label.bottom
                    ) {
                      errors.push("loading ring overlaps action label");
                    }
                  }
                }
                for (
                  const icon of node.querySelectorAll(
                    ".discern-button__icon, .discern-icon-button > span",
                  )
                ) {
                  const slot = icon.getBoundingClientRect();
                  if (
                    Math.abs(
                      slot.y + slot.height / 2 - box.y - box.height / 2,
                    ) > 1
                  ) errors.push("icon centering");
                }
                return errors.map((error) => `${node.textContent}: ${error}`);
              })
            );
            assertEquals(
              failures,
              [],
              `${theme}/${density}/${fontSize}/${forcedColors}`,
            );
          }
        }
      }
    }
    await page.emulateMedia({
      forcedColors: "none",
      reducedMotion: "no-preference",
    });
    assertEquals(
      await page.locator(".discern-icon--busy svg").evaluateAll((nodes) =>
        nodes.length > 0 && nodes.every((node) => {
          const style = getComputedStyle(node);
          return style.animationName === "discern-icon-busy" &&
            parseFloat(style.animationDuration) > 0;
        })
      ),
      true,
      "loading rings rotate when motion is allowed",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const darkness of [0, 0.25, 0.5, 0.75, 1]) {
      for (const hue of [undefined, 2, 120, 255, 360]) {
        await page.locator("html").evaluate((node, point) => {
          node.style.setProperty("--discern-darkness", String(point.darkness));
          node.style.setProperty("--discern-font-ui", "serif");
          if (point.hue === undefined) {
            node.style.removeProperty("--discern-accent-hue");
          } else {node.style.setProperty(
              "--discern-accent-hue",
              String(point.hue),
            );}
        }, { darkness, hue });
        assertEquals(
          await page.locator(".discern-button__label").evaluateAll((nodes) =>
            nodes.every((node) => node.scrollWidth <= node.clientWidth + 1)
          ),
          true,
        );
      }
    }
    await page.emulateMedia({ forcedColors: "active" });
    await page.getByRole("button", { name: "Continue", exact: true }).focus();
    assertEquals(
      await page.getByRole("button", { name: "Continue", exact: true })
        .evaluate((node) => getComputedStyle(node).outlineStyle),
      "solid",
    );
    for (const size of ["sm", "md", "lg"] as const) {
      const art = (
        <svg width="7" height="3" viewBox="0 0 14 6">
          <path d="M0 3h14" />
        </svg>
      );
      const fixture = renderToStaticMarkup(
        <>
          <Button size={size} leadingIcon={art} trailingIcon={art}>
            Review
          </Button>
          <IconButton size={size} icon={art} label="Inspect" />
          <Icon size={24}>{art}</Icon>
        </>,
      );
      await page.setContent(
        `<html data-discern-root><head><style>${css}</style></head><body>${fixture}</body></html>`,
      );
      assertEquals(
        await page.locator("svg").evaluateAll((nodes) =>
          nodes.map((node) => ({
            width: node.getBoundingClientRect().width,
            height: node.getBoundingClientRect().height,
          }))
        ),
        Array(4).fill({ width: 7, height: 3 }),
      );
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("Caller-rendered idle busy idle keeps geometry and blocks repeat native activation", async () => {
  const browser = await launchBrowser();
  const output = await Deno.makeTempDir();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["button", "icon-button", "icon"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const page = await browser.newPage();
    for (const kind of ["button", "icon", "link"] as const) {
      const markup = (busy: boolean) =>
        renderToStaticMarkup(
          kind === "button"
            ? (
              <Button id="action" busy={busy} type="submit" leadingIcon="✓">
                Save changes
              </Button>
            )
            : kind === "icon"
            ? (
              <IconButton
                id="action"
                busy={busy}
                type="submit"
                icon="✓"
                label="Save changes"
              />
            )
            : (
              <Button id="action" busy={busy} href="#saved">
                Save changes
              </Button>
            ),
        );
      await page.setContent(
        `<html data-discern-root><head><style>${css}</style></head><body><form>${
          markup(false)
        }</form><button id="after">After</button></body></html>`,
      );
      const idle = await page.locator("#action").boundingBox();
      await page.evaluate((busyHtml) => {
        let count = 0;
        document.querySelector("form")!.addEventListener(
          "submit",
          (event) => event.preventDefault(),
        );
        document.addEventListener("click", (event) => {
          if ((event.target as Element).closest("#action")) {
            event.preventDefault();
            document.body.dataset.count = String(++count);
            document.querySelector("#action")!.outerHTML = busyHtml;
          }
        });
      }, markup(true));
      await page.locator("#action").focus();
      await page.keyboard.press("Enter");
      assertEquals(await page.locator("body").getAttribute("data-count"), "1");
      assertEquals(
        await page.locator("#action").getAttribute("aria-busy"),
        "true",
      );
      assertEquals(
        await page.getByRole(kind === "link" ? "link" : "button", {
          name: "Save changes",
          exact: true,
        }).count(),
        1,
      );
      const busy = await page.locator("#action").boundingBox();
      assertEquals(busy, idle);
      // Enter, Space and native .click() cannot submit a pending button.
      await page.keyboard.press("Enter");
      await page.keyboard.press("Space");
      if (kind !== "link") {
        await page.locator("#action").evaluate((node) =>
          (node as HTMLButtonElement).click()
        );
      } else {assertEquals(
          await page.locator("#action").getAttribute("href"),
          null,
        );}
      assertEquals(await page.locator("body").getAttribute("data-count"), "1");
      await page.locator("#action").evaluate((node, html) => {
        node.outerHTML = html;
      }, markup(false));
      assertEquals(await page.locator("#action").boundingBox(), idle);
      await page.locator("#action").focus();
      await page.keyboard.press(kind === "link" ? "Enter" : "Space");
      assertEquals(await page.locator("body").getAttribute("data-count"), "2");
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});
