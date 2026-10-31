import { assert, assertEquals } from "@std/assert";
import { toFileUrl } from "@std/path";
import type { Page } from "playwright-core";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser, settleAnimations } from "../scripts/browser.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import { Brand } from "../src/components/core/brand/brand.tsx";
import { Button } from "../src/components/core/button/button.tsx";
import { IconButton } from "../src/components/core/icon-button/icon-button.tsx";
import { Logo } from "../src/components/core/logo/logo.tsx";
import { ThemeSwitcher } from "../src/components/core/theme-switcher/theme-switcher.tsx";
import { ThemeToggle } from "../src/components/core/theme-toggle/theme-toggle.tsx";
import { SegmentedControl } from "../src/components/forms/segmented-control/segmented-control.tsx";
import { Breadcrumbs } from "../src/components/navigation/breadcrumbs/breadcrumbs.tsx";
import { Tabs } from "../src/components/navigation/tabs/tabs.tsx";
import { ExampleIcon } from "../src/fixtures/example-icon.tsx";

const COMPONENTS = new URL("../src/components/", import.meta.url);

// Serialised for page.evaluate: perceptual lightness of a computed colour
// composited over a ground lightness, and its oklab chroma.
const PAINT_SOURCE = `(value, ground = 0) => {
  const match = value.match(/^(oklch|oklab|rgba?|color)\\(([^)]*)\\)/);
  if (!match) throw new Error("Unparsed colour " + value);
  const parts = match[2].replace(/^srgb\\s+/, "").split(/[\\s,/]+/).filter(Boolean);
  const alpha = parts.length > 3 ? parseFloat(parts[3]) : 1;
  let lightness;
  let chroma = 0;
  if (match[1].startsWith("ok")) {
    lightness = parts[0].endsWith("%") ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
    chroma = match[1] === "oklch"
      ? parseFloat(parts[1])
      : Math.hypot(parseFloat(parts[1]), parseFloat(parts[2]));
  } else {
    const scale = match[1] === "color" ? 1 : 255;
    const [r, g, b] = parts.slice(0, 3).map((part) => {
      const channel = parseFloat(part) / scale;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    lightness = Math.cbrt(0.2126 * r + 0.7152 * g + 0.0722 * b);
  }
  return { lightness: alpha * lightness + (1 - alpha) * ground, chroma, alpha };
}`;

interface Root {
  readonly theme?: "light" | "dark";
  readonly accent?: number;
  readonly density?: number;
}

async function withRuntime(
  components: readonly string[],
  run: (
    page: Page,
    render: (node: ReactNode, root?: Root) => Promise<void>,
  ) => Promise<void>,
): Promise<void> {
  const browser = await launchBrowser();
  const output = await Deno.makeTempDir();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: [...components],
      appearanceScopes: true,
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const page = await browser.newPage({
      viewport: { width: 720, height: 900 },
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await run(page, async (node, root = {}) => {
      const style = [
        root.accent === undefined ? "" : `--discern-accent-hue:${root.accent}`,
        root.density === undefined ? "" : `--discern-density:${root.density}`,
      ].filter(Boolean).join(";");
      await page.setContent(
        `<html data-discern-root data-discern-theme="${root.theme ?? "light"}"${
          root.accent === undefined ? "" : ' data-discern-accent=""'
        } style="${style}"><head><style>${css}body{margin:32px;background:var(--discern-color-surface)}section{margin-block-end:32px;display:flex;flex-wrap:wrap;gap:16px;align-items:center}</style></head><body>${
          renderToStaticMarkup(<>{node}</>)
        }</body></html>`,
      );
    });
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
}

/** Resolve a background on a throwaway probe as computed `colour|image`. */
function backgroundOf(page: Page, value: string): Promise<string> {
  return page.evaluate((value) => {
    const node = document.createElement("span");
    node.style.background = value;
    document.body.append(node);
    const style = getComputedStyle(node);
    const resolved = `${style.backgroundColor}|${style.backgroundImage}`;
    node.remove();
    return resolved;
  }, value);
}

function stripMedia(css: string, condition: string): string {
  let rest = css;
  for (;;) {
    const start = rest.indexOf(`@media ${condition}`);
    if (start < 0) return rest;
    let depth = 0;
    let end = rest.indexOf("{", start);
    for (; end < rest.length; end++) {
      if (rest[end] === "{") depth++;
      if (rest[end] === "}" && --depth === 0) break;
    }
    rest = rest.slice(0, start) + rest.slice(end + 1);
  }
}

const tabItems = ["Overview", "Details", "History"].map((label) => ({
  value: label.toLowerCase(),
  label,
  content: <p>{label} content.</p>,
  disabled: label === "History",
}));
const crowded = [
  "Overview and responsibilities",
  "Research across several regions",
  "Publication history and correspondence",
].map((label, index) => ({
  value: String(index),
  label,
  content: <p>{label}</p>,
}));

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

Deno.test("Hover feedback is gated to pointers that can hover", async () => {
  for (
    const path of [
      "core/button/button.css",
      "core/icon-button/icon-button.css",
      "core/theme-switcher/theme-switcher.css",
      "navigation/tabs/tabs.css",
    ]
  ) {
    const css = await Deno.readTextFile(new URL(path, COMPONENTS));
    assert(
      !stripMedia(css, "(hover: hover)").includes(":hover"),
      `${path} leaves a sticky hover outside (hover: hover)`,
    );
  }
});

Deno.test("Tabs sit every indicator on its own row baseline and keep transient states neutral", async () => {
  await withRuntime(["tabs", "segmented-control"], async (page, render) => {
    for (const density of [0.5, 1, 2]) {
      await render(
        <>
          <section style={{ display: "block", width: "480px" }}>
            <Tabs label="Single row" items={tabItems} />
          </section>
          <section style={{ display: "block", width: "240px" }}>
            <Tabs label="Wrapped" items={crowded} defaultValue="0" />
          </section>
        </>,
        { density },
      );
      const tabs = await page.locator(".discern-tabs__tab").evaluateAll((
        nodes,
      ) =>
        nodes.map((tab) => {
          const box = tab.getBoundingClientRect();
          const self = getComputedStyle(tab);
          const indicator = getComputedStyle(tab, "::after");
          const shift = parseFloat(indicator.translate.split(" ")[1] ?? "0");
          const bottom = box.bottom - parseFloat(self.borderBottomWidth) -
            parseFloat(indicator.bottom) + shift;
          return {
            label: tab.textContent,
            baseline: self.borderBottomStyle === "solid" &&
              parseFloat(self.borderBottomWidth) >= 1 &&
              !self.borderBottomColor.endsWith(" 0)"),
            offset: bottom - box.bottom,
            covers: parseFloat(indicator.borderBottomWidth) >
              parseFloat(self.borderBottomWidth),
          };
        })
      );
      for (const tab of tabs) {
        assert(tab.baseline, `${density}: ${tab.label} has no row baseline`);
        assert(
          Math.abs(tab.offset) <= 0.5,
          `${density}: ${tab.label} indicator floats ${tab.offset}px off its baseline`,
        );
        assert(tab.covers, `${density}: ${tab.label} indicator is thinner`);
      }
    }

    await render(
      <section style={{ display: "block", width: "480px" }}>
        <Tabs label="Single row" items={tabItems} />
      </section>,
    );
    const alignment = await page.locator(".discern-tabs").evaluate((root) => {
      const tab = root.querySelector<HTMLElement>(".discern-tabs__tab")!;
      const panel = root.querySelector<HTMLElement>(".discern-tabs__panel")!;
      const text = document.createRange();
      text.selectNodeContents(tab);
      const label = text.getBoundingClientRect();
      const next = document.createRange();
      next.selectNodeContents(tab.nextElementSibling!);
      const nextLabel = next.getBoundingClientRect();
      const y = label.top + label.height / 2;
      const gap = document.elementFromPoint(
        (label.right + nextLabel.left) / 2,
        y,
      );
      const centre = document.elementFromPoint(
        label.left + label.width / 2,
        y,
      );
      return {
        label: label.left,
        content: panel.firstElementChild!.getBoundingClientRect().left,
        gapHitsTab: tab.contains(gap),
        labelHitsTab: centre === tab,
      };
    });
    assert(
      Math.abs(alignment.label - alignment.content) <= 1,
      `the first tab label starts ${
        alignment.label - alignment.content
      }px from the panel content edge`,
    );
    assert(alignment.labelHitsTab, "a tab label no longer activates its tab");
    assert(!alignment.gapHitsTab, "the gap between labels activates a tab");

    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const tab = document.activeElement as HTMLElement;
      const box = tab.getBoundingClientRect();
      const self = getComputedStyle(tab);
      const pill = getComputedStyle(tab, "::before");
      const divider = box.bottom - parseFloat(self.borderBottomWidth);
      const ringBottom = divider - parseFloat(pill.bottom) +
        parseFloat(pill.outlineOffset) + parseFloat(pill.outlineWidth);
      return {
        isTab: tab.classList.contains("discern-tabs__tab"),
        own: self.outlineStyle,
        pill: pill.outlineStyle,
        clearance: divider - ringBottom,
      };
    });
    assert(focused.isTab, "the first Tab stop is a tab");
    assertEquals(
      [focused.own, focused.pill],
      ["none", "solid"],
      "the focus ring is not drawn on the hover pill",
    );
    assert(
      focused.clearance >= 1,
      `the tab focus ring reaches the divider (${focused.clearance}px clear)`,
    );

    // Hover and press stay neutral washes that never outrank the indicator,
    // however loud the dark accent ladder is.
    const washes: Record<string, number> = {};
    for (
      const [name, root] of [
        ["light", {}],
        ["dark-accent", { theme: "dark", accent: 255 }],
      ] as const
    ) {
      await render(
        <>
          <section style={{ display: "block", width: "480px" }}>
            <Tabs label="Single row" items={tabItems} />
          </section>
          <section>
            <SegmentedControl
              label="Views"
              name="views"
              items={[{ value: "list", label: "List" }, {
                value: "grid",
                label: "Grid",
                disabled: true,
              }]}
            />
          </section>
        </>,
        root,
      );
      const details = page.getByRole("tab", { name: "Details" });
      const wash = () =>
        details.evaluate((tab, source) => {
          const paint = new Function(`return ${source}`)();
          const ground = paint(getComputedStyle(document.body).backgroundColor)
            .lightness;
          const fill = getComputedStyle(tab, "::before").backgroundColor;
          return {
            delta: Math.abs(paint(fill, ground).lightness - ground),
            chroma: paint(fill).chroma,
          };
        }, PAINT_SOURCE);
      await details.hover();
      await settleAnimations(page);
      const hover = await wash();
      const box = (await details.boundingBox())!;
      await page.mouse.move(box.x + box.width / 3, box.y + box.height / 2);
      await page.mouse.down();
      await settleAnimations(page);
      const press = await wash();
      await page.mouse.up();
      await page.mouse.move(0, 0);
      for (const [state, value] of [["hover", hover], ["press", press]]) {
        assert(
          (value as typeof hover).chroma < 0.01,
          `${name}: the tab ${state} wash picks up the accent hue`,
        );
      }
      assert(press.delta > hover.delta, `${name}: tab press repeats hover`);
      washes[name] = hover.delta;

      const disabled = await page.getByRole("tab", { name: "History" })
        .evaluate((tab) => getComputedStyle(tab).color);
      const segmented = await page.locator(
        ".discern-segmented-control__input:disabled + .discern-segmented-control__surface",
      ).evaluate((surface) => getComputedStyle(surface).color);
      assertEquals(
        disabled,
        segmented,
        `${name}: a disabled tab departs from the unavailable segment ink`,
      );
    }
    assert(
      washes["dark-accent"]! <= washes.light! * 2,
      `dark accent tab hover (${
        washes["dark-accent"]
      }) outweighs the light pole (${washes.light})`,
    );

    await render(
      <section style={{ display: "block", width: "480px" }}>
        <Tabs label="Single row" items={tabItems} />
      </section>,
    );
    await page.emulateMedia({ forcedColors: "active" });
    const forced = await page.getByRole("tab", { name: "Overview" }).evaluate(
      (tab) => {
        const canvas = document.createElement("span");
        canvas.style.color = "Canvas";
        document.body.append(canvas);
        const background = getComputedStyle(canvas).color;
        canvas.remove();
        const indicator = getComputedStyle(tab, "::after");
        return {
          paint: indicator.borderBottomColor,
          background,
          weight: parseFloat(indicator.borderBottomWidth) /
            parseFloat(getComputedStyle(tab).borderBottomWidth),
        };
      },
    );
    await page.emulateMedia({ forcedColors: "none" });
    assert(
      forced.paint !== forced.background,
      "forced colours cut the selected indicator out of the divider",
    );
    assert(
      forced.weight >= 3,
      `forced colours leave the indicator ${forced.weight}x the baseline`,
    );
  });
});

Deno.test("Breadcrumb links give the focus ring air and share one row pitch", async () => {
  await withRuntime(["breadcrumbs"], async (page, render) => {
    await render(
      <Breadcrumbs
        items={[{ label: "Home", href: "#home" }, {
          label: "Library",
          href: "#library",
        }]}
        current="Navigation"
      />,
    );
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const ring = await page.evaluate(() => {
      const link = document.activeElement as HTMLAnchorElement;
      const style = getComputedStyle(link);
      const text = document.createRange();
      text.selectNodeContents(link);
      const label = text.getBoundingClientRect();
      const box = link.getBoundingClientRect();
      const reach = parseFloat(style.outlineOffset) +
        parseFloat(style.outlineWidth);
      const separator = link.nextElementSibling!.getBoundingClientRect();
      return {
        name: link.textContent,
        air: box.right + parseFloat(style.outlineOffset) - label.right,
        clearance: separator.left - (box.right + reach),
        underline: style.textDecorationColor,
      };
    });
    assertEquals(ring.name, "Library");
    assert(ring.air >= 3, `the crumb ring hugs its text (${ring.air}px)`);
    assert(
      ring.clearance >= 2,
      `the crumb ring crowds its separator (${ring.clearance}px)`,
    );
    assert(
      ring.underline.endsWith(" 0)") || ring.underline === "transparent",
      "a focused crumb stacks the hover underline inside its ring",
    );

    await render(
      <section style={{ display: "block", width: "240px" }}>
        <Breadcrumbs
          items={crowded.map((item, index) => ({
            label: item.label,
            href: `#${index}`,
          }))}
          current="Alexandrine Featherstonehaugh-Cholmondeley"
        />
      </section>,
    );
    const tops = await page.locator(".discern-breadcrumbs").evaluate((nav) => {
      const walker = document.createTreeWalker(nav, NodeFilter.SHOW_TEXT);
      const lines = new Set<number>();
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.parentElement?.closest('[aria-hidden="true"]')) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) {
          lines.add(Math.round(rect.top + rect.height / 2));
        }
      }
      return [...lines].sort((a, b) => a - b);
    });
    const pitches = tops.slice(1).map((top, index) => top - tops[index]!);
    assert(pitches.length >= 4, "the narrow trail no longer wraps");
    assert(
      Math.max(...pitches) - Math.min(...pitches) <= 1,
      `the wrapped trail mixes row pitches ${pitches.join(", ")}`,
    );
  });
});

Deno.test("Theme switcher shares the Segmented control geometry and every state recipe", async () => {
  await withRuntime(
    ["theme-switcher", "segmented-control"],
    async (page, render) => {
      const paint = [
        "background-color",
        "background-image",
        "box-shadow",
        "color",
        "transform",
      ] as const;
      const read = (selector: string, properties: readonly string[]) =>
        page.locator(selector).evaluate((node, properties) => {
          const style = getComputedStyle(node);
          return properties.map((name) =>
            name === "height"
              ? String(node.getBoundingClientRect().height)
              : style.getPropertyValue(name)
          );
        }, properties);
      const option = '.discern-theme-switcher input[value="light"] + span';
      const segment =
        '.discern-segmented-control__input[value="regular"] + .discern-segmented-control__surface';
      for (const theme of ["light", "dark"] as const) {
        for (const disabled of [false, true]) {
          await render(
            <section>
              <ThemeSwitcher
                mode="system"
                onModeChange={() => undefined}
                disabled={disabled}
              />
              <div style={{ inlineSize: "360px" }}>
                <SegmentedControl
                  label="Density"
                  name="density"
                  defaultValue="compact"
                  items={["Compact", "Regular", "Relaxed"].map((label) => ({
                    value: label.toLowerCase(),
                    label,
                    disabled,
                  }))}
                />
              </div>
            </section>,
            { theme, accent: 255 },
          );
          const where = `${theme}${disabled ? " disabled" : ""}`;
          assertEquals(
            await read(".discern-theme-switcher input:checked + span", paint),
            await read(
              ".discern-segmented-control__input:checked + .discern-segmented-control__surface",
              paint,
            ),
            `${where}: the selected theme segment departs from the segmented recipe`,
          );
          assertEquals(
            await read(option, paint),
            await read(segment, paint),
            `${where}: a resting theme segment departs from the segmented recipe`,
          );
          if (disabled) continue;
          const track = ["padding-top", "row-gap", "height"];
          assertEquals(
            await read(".discern-theme-switcher", track),
            await read(".discern-segmented-control__items", track),
            `${where}: the theme switcher track departs from the segmented geometry`,
          );
          const shape = ["min-height", "border-top-left-radius", "line-height"];
          assertEquals(
            await read(option, shape),
            await read(segment, shape),
            `${where}: a theme segment departs from the segmented geometry`,
          );
          for (const press of [false, true]) {
            const states = [];
            for (const target of [option, segment]) {
              const box = (await page.locator(target).boundingBox())!;
              await page.mouse.move(
                box.x + box.width / 2,
                box.y + box.height / 2,
              );
              if (press) await page.mouse.down();
              await settleAnimations(page);
              states.push(await read(target, paint));
              if (press) await page.mouse.up();
              await page.mouse.move(0, 0);
            }
            assertEquals(
              states[0],
              states[1],
              `${where}: the theme switcher ${
                press ? "press" : "hover"
              } departs from the segmented recipe`,
            );
          }
        }
      }
    },
  );
});

Deno.test("Actions keep whole words, opaque raised washes, one press travel and readable busy states", async () => {
  await withRuntime(["button", "icon-button", "icon"], async (page, render) => {
    await render(
      <>
        <section style={{ width: "200px", flexWrap: "nowrap", gap: "8px" }}>
          <span style={{ flex: "1 0 auto" }}>Northstar field guide</span>
          <Button size="sm" variant="secondary">Search</Button>
        </section>
        <section>
          <Button>Continue</Button>
          <Button variant="secondary">Preview</Button>
          <Button variant="ghost">Cancel</Button>
          <IconButton icon="+" label="Add quietly" />
          <IconButton icon="+" label="Add with outline" variant="outline" />
          <Button busy>Save changes</Button>
          <IconButton busy icon="+" label="Refresh" variant="outline" />
        </section>
      </>,
      { density: 2 },
    );
    assertEquals(
      await page.locator(".discern-button__label", { hasText: "Search" })
        .evaluate((label) => {
          const range = document.createRange();
          range.selectNodeContents(label);
          return range.getClientRects().length;
        }),
      1,
      "a squeezed Button breaks its label inside a word",
    );

    const surface = (await backgroundOf(page, "var(--discern-color-surface)"))
      .split("|")[0];
    for (const name of ["Preview", "Add with outline"]) {
      const action = page.getByRole("button", { name, exact: true });
      await action.hover();
      await settleAnimations(page);
      const fill = await action.evaluate((node) => {
        const style = getComputedStyle(node);
        return [style.backgroundColor, style.backgroundImage];
      });
      await page.mouse.move(0, 0);
      assertEquals(fill[0], surface, `${name} hover lets its backdrop through`);
      assert(fill[1] !== "none", `${name} hover shows no wash`);
    }

    const wash = await backgroundOf(page, "var(--discern-color-accent-200)");
    const raised = await backgroundOf(
      page,
      "linear-gradient(var(--discern-color-accent-200) 0 0) var(--discern-color-surface)",
    );
    for (
      const [name, expected] of [
        ["Cancel", wash],
        ["Add quietly", wash],
        ["Add with outline", raised],
        ["Continue", undefined],
      ] as const
    ) {
      const action = page.getByRole("button", { name, exact: true });
      const box = (await action.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      // Pointer state lands asynchronously; wait for the press to paint.
      await page.waitForFunction(
        (node) =>
          new DOMMatrixReadOnly(getComputedStyle(node as Element).transform)
            .m42 > 0,
        await action.elementHandle(),
        { timeout: 2000 },
      ).catch(() => undefined);
      await settleAnimations(page);
      const pressed = await action.evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          fill: `${style.backgroundColor}|${style.backgroundImage}`,
          travel: new DOMMatrixReadOnly(style.transform).m42,
        };
      });
      await page.mouse.up();
      await page.mouse.move(0, 0);
      if (expected !== undefined) {
        assertEquals(pressed.fill, expected, `${name} press fill`);
      }
      assertEquals(pressed.travel, 1, `${name} press travel at density 2`);
    }

    await page.emulateMedia({ forcedColors: "active" });
    await settleAnimations(page);
    const busy = await page.locator('[aria-busy="true"]').evaluateAll(
      (nodes) => {
        const node = document.createElement("span");
        node.style.color = "GrayText";
        document.body.append(node);
        const gray = getComputedStyle(node).color;
        node.remove();
        return nodes.map((node) => ({
          name: node.getAttribute("aria-label") ?? node.textContent,
          gray: getComputedStyle(node).color === gray,
        }));
      },
    );
    await page.emulateMedia({ forcedColors: "none" });
    assertEquals(busy.length, 2);
    for (const action of busy) {
      assert(!action.gray, `${action.name} looks unavailable while busy`);
    }

    const head = await page.locator(".discern-icon--busy path").first()
      .evaluate((path) => (path as SVGPathElement).getTotalLength());
    assert(
      head <= (2 * Math.PI * 9) / 3,
      `the busy head (${head}) reads as a near-closed ring`,
    );
  });
});

Deno.test("Text glyphs in Icon buttons match the optical size of SVG icons", async () => {
  await withRuntime(["icon-button"], async (page, render) => {
    await render(
      <section>
        {(["sm", "md", "lg"] as const).flatMap((size) => [
          <IconButton key={`${size}-text`} size={size} icon="×" label="Text" />,
          <IconButton
            key={`${size}-svg`}
            size={size}
            icon={<ExampleIcon name="close" />}
            label="Drawn"
          />,
        ])}
      </section>,
    );
    // Measure in the package's bundled Inter, not the host's system face:
    // the optical boost is tuned to the face the font asset ships.
    const inter = await Deno.readFile(
      new URL("../assets/fonts/inter.woff2", import.meta.url),
    );
    await page.addStyleTag({
      content:
        `@font-face{font-family:"Pinned Inter";src:url("data:font/woff2;base64,${inter.toBase64()}") format("woff2")}:root{--discern-font-ui:"Pinned Inter"}`,
    });
    await page.evaluate(async () => {
      await document.fonts.load('16px "Pinned Inter"', "×");
    });
    const inks = await page.locator(".discern-icon-button").evaluateAll((
      nodes,
    ) =>
      nodes.map((node) => {
        const slot = node.querySelector<HTMLElement>(
          ".discern-icon-button__glyph",
        )!;
        const svg = slot.querySelector("svg");
        if (svg) {
          const path = svg.querySelector("path")!.getBoundingClientRect();
          return path.width + 2 * svg.getBoundingClientRect().width / 24;
        }
        const style = getComputedStyle(slot);
        const context = document.createElement("canvas").getContext("2d")!;
        context.font =
          `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const metrics = context.measureText(slot.textContent ?? "");
        return metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
      })
    );
    for (let index = 0; index < inks.length; index += 2) {
      assert(
        Math.abs(inks[index]! - inks[index + 1]!) <= 2,
        `a text × (${inks[index]}px) sits beside a ${
          inks[index + 1]
        }px drawn cross`,
      );
    }
  });
});

Deno.test("Brand marks share the lockup typeface and every tagline size steps", async () => {
  await withRuntime(["brand", "logo"], async (page, render) => {
    for (const theme of ["light", "dark"] as const) {
      await render(
        <>
          <section data-case="lockups">
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
          <section data-case="faces">
            {(["display", "ui", "mono"] as const).map((typeface) => (
              <Brand
                key={typeface}
                name="Elmwood"
                mark="E"
                typeface={typeface}
              />
            ))}
          </section>
        </>,
        { theme },
      );
      const lockups = await page.locator(
        '[data-case="lockups"] .discern-brand',
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
      for (let index = 2; index < lockups.length; index++) {
        assert(
          lockups[index]!.copy >= lockups[index - 2]!.copy * 1.1,
          `${theme}: ${lockups[index]!.name} barely outgrows the size below`,
        );
      }
      const faces = await page.locator('[data-case="faces"] .discern-brand')
        .evaluateAll((brands) =>
          brands.map((brand) =>
            [".discern-brand__mark", ".discern-brand__name"].map((part) => {
              const style = getComputedStyle(brand.querySelector(part)!);
              return `${style.fontFamily}|${style.fontWeight}`;
            })
          )
        );
      for (const [mark, name] of faces) {
        assertEquals(mark, name, `${theme}: a text mark leaves the Brand face`);
      }
    }
  });
});

Deno.test("Logo keeps the action fill for app tiles and a quiet plate for wordmark tiles", async () => {
  await withRuntime(["logo"], async (page, render) => {
    for (const theme of ["light", "dark"] as const) {
      await render(
        <section>
          <Logo treatment="tile">N Northstar</Logo>
          <Logo treatment="tile" shape="square">N</Logo>
        </section>,
        { theme, accent: 255 },
      );
      const action = (await backgroundOf(page, "var(--discern-color-action)"))
        .split("|")[0];
      const [wordmark, app] = await page.locator(".discern-logo")
        .evaluateAll((nodes) =>
          nodes.map((node) => getComputedStyle(node).backgroundColor)
        );
      assert(
        wordmark !== action,
        `${theme}: a wordmark tile wears the primary action fill`,
      );
      assertEquals(app, action, `${theme}: the app tile lost its action fill`);
    }
  });
});
