import { assert, assertEquals } from "@std/assert";
import { toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser } from "../scripts/browser.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import { Brand } from "../src/components/core/brand/brand.tsx";
import { IconButton } from "../src/components/core/icon-button/icon-button.tsx";
import { ThemeSwitcher } from "../src/components/core/theme-switcher/theme-switcher.tsx";
import { ThemeToggle } from "../src/components/core/theme-toggle/theme-toggle.tsx";
import { SegmentedControl } from "../src/components/forms/segmented-control/segmented-control.tsx";
import { Tabs } from "../src/components/navigation/tabs/tabs.tsx";

Deno.test("Brand leaves no wrapper for a mark or tagline that renders nothing", () => {
  for (const empty of [undefined, null, false, true, ""] as const) {
    const html = renderToStaticMarkup(
      <Brand name="Open Index" mark={empty} tagline={empty} />,
    );
    assert(!html.includes("discern-brand__mark"), `mark=${String(empty)}`);
    assert(!html.includes("discern-brand__tagline"), `tagline=${empty}`);
  }
  const html = renderToStaticMarkup(
    <Brand name="Open Index" mark={0} tagline="Field guide" />,
  );
  assert(html.includes("discern-brand__mark"));
  assert(html.includes("discern-brand__tagline"));
});

Deno.test("Theme toggle destinations default to one stroke weight", () => {
  const html = renderToStaticMarkup(<ThemeToggle theme="light" />);
  const glyphs = [
    ...html.matchAll(
      /data-discern-theme-destination="(light|dark)"[^>]*>(.*?)<\/span>/g,
    ),
  ];
  assertEquals(glyphs.map((glyph) => glyph[1]).toSorted(), ["dark", "light"]);
  for (const [, destination, glyph] of glyphs) {
    assert(
      /^<svg[^>]*stroke="currentColor"[^>]*stroke-width="2"/.test(glyph ?? ""),
      `${destination} glyph is not the shared stroke SVG`,
    );
  }
});

Deno.test("core navigation states share one geometry and one recipe per role", async () => {
  const browser = await launchBrowser();
  const output = await Deno.makeTempDir();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: [
        "brand",
        "icon-button",
        "segmented-control",
        "tabs",
        "theme-switcher",
      ],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const page = await browser.newPage({
      viewport: { width: 720, height: 900 },
    });
    const markup = renderToStaticMarkup(
      <main>
        <section data-case="tabs">
          <Tabs
            defaultValue="overview"
            items={["Overview", "Details", "History"].map((label) => ({
              value: label.toLowerCase(),
              label,
              content: <p>{label} content.</p>,
            }))}
          />
        </section>
        <section data-case="brands">
          {(["sm", "md", "lg"] as const).flatMap((size) => [
            <Brand
              key={`${size}-plain`}
              size={size}
              name="Waypoint"
              mark="▲"
              tagline="Field guide"
            />,
            <Brand
              key={`${size}-tile`}
              size={size}
              name="Northstar"
              mark="N"
              markTreatment="tile"
              markShape="square"
              tagline="Field guide"
            />,
          ])}
        </section>
        <section data-case="icon-buttons">
          <IconButton icon="+" label="Add quietly" />
          <IconButton icon="+" label="Add with outline" variant="outline" />
        </section>
        <section data-case="segmented">
          <ThemeSwitcher mode="system" onModeChange={() => undefined} />
          <SegmentedControl
            label="Density"
            name="density"
            defaultValue="compact"
            items={[
              { value: "compact", label: "Compact" },
              { value: "regular", label: "Regular" },
              { value: "relaxed", label: "Relaxed" },
            ]}
          />
        </section>
      </main>,
    );
    for (const theme of ["light", "dark"]) {
      await page.setContent(
        `<html data-discern-root data-discern-theme="${theme}"><head><style>${css}body{margin:32px}section{margin-block-end:32px;display:flex;flex-wrap:wrap;gap:16px;align-items:center}section[data-case="tabs"]{display:block;width:480px}.discern-segmented-control{inline-size:360px}</style></head><body>${markup}</body></html>`,
      );
      await page.emulateMedia({ reducedMotion: "reduce" });

      const tabs = await page.locator(".discern-tabs").evaluate((root) => {
        const tab = root.querySelector<HTMLElement>(".discern-tabs__tab")!;
        const panel = root.querySelector<HTMLElement>(".discern-tabs__panel")!;
        const text = document.createRange();
        text.selectNodeContents(tab);
        const label = text.getBoundingClientRect();
        const content = panel.firstElementChild!.getBoundingClientRect();
        return { label: label.left, content: content.left };
      });
      assert(
        Math.abs(tabs.label - tabs.content) <= 1,
        `${theme}: the first tab label starts ${
          tabs.label - tabs.content
        }px from the panel content edge`,
      );
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const tab = document.activeElement as HTMLElement;
        const list = tab.parentElement!.getBoundingClientRect();
        const box = tab.getBoundingClientRect();
        const self = getComputedStyle(tab);
        const pill = getComputedStyle(tab, "::before");
        const ringBottom = box.bottom - parseFloat(pill.bottom) +
          parseFloat(pill.outlineOffset) + parseFloat(pill.outlineWidth);
        return {
          isTab: tab.classList.contains("discern-tabs__tab"),
          own: self.outlineStyle,
          pill: pill.outlineStyle,
          clearance: list.bottom - 1 - ringBottom,
        };
      });
      assert(focused.isTab, "the first Tab stop is a tab");
      assertEquals(
        [focused.own, focused.pill],
        ["none", "solid"],
        `${theme}: the focus ring is not drawn on the hover pill`,
      );
      assert(
        focused.clearance >= 1,
        `${theme}: the tab focus ring reaches the divider (${focused.clearance}px clear)`,
      );

      const lockups = await page.locator(
        '[data-case="brands"] .discern-brand',
      ).evaluateAll((brands) =>
        brands.map((brand) => {
          const mark = brand.querySelector(".discern-brand__mark")!
            .getBoundingClientRect();
          const copy = brand.querySelector(".discern-brand__copy")!
            .getBoundingClientRect();
          return {
            name: brand.className,
            mark: mark.height,
            copy: copy.height,
          };
        })
      );
      for (const lockup of lockups) {
        assert(
          Math.abs(lockup.mark - lockup.copy) <= 1,
          `${theme}: ${lockup.name} mark is ${lockup.mark}px beside ${lockup.copy}px of copy`,
        );
      }

      const pressFill = await page.evaluate(() => {
        const probe = document.createElement("span");
        probe.style.background = "var(--discern-color-accent-200)";
        document.body.append(probe);
        const fill = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return fill;
      });
      for (const name of ["Add quietly", "Add with outline"]) {
        const action = page.getByRole("button", { name, exact: true });
        const box = (await action.boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        // Pointer state lands asynchronously; wait for the press to paint.
        const node = await action.elementHandle();
        await page.waitForFunction(
          ([target, expected]) =>
            getComputedStyle(target as Element).backgroundColor === expected,
          [node, pressFill] as const,
        ).catch(() => undefined);
        const fill = await action.evaluate((target) =>
          getComputedStyle(target).backgroundColor
        );
        await page.mouse.up();
        assertEquals(fill, pressFill, `${theme}: ${name} press fill`);
      }

      const surface = (selector: string) =>
        page.locator(selector).evaluate((node) => {
          const style = getComputedStyle(node);
          return [
            style.backgroundColor,
            style.backgroundImage,
            style.boxShadow,
          ];
        });
      assertEquals(
        await surface(".discern-theme-switcher input:checked + span"),
        await surface(
          ".discern-segmented-control__input:checked + .discern-segmented-control__surface",
        ),
        `${theme}: the selected theme segment departs from the segmented recipe`,
      );
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});
