import type { Page } from "playwright-core";
import type {
  BuilderDocument,
  BuilderNode,
  BuilderSlot,
  BuilderTextChild,
} from "../../../catalogue/builder/model.ts";
import { BUILDER_STORAGE_KEYS } from "../../../catalogue/builder/persistence.ts";
import {
  ACTION_TIMEOUT,
  BUILDER_READY,
  BUILDER_SHELL,
  CANVAS_PAGE,
  FOCUSABLE_SELECTOR,
  invariant,
  type KeyboardSummary,
  useScopedTheme,
  visibleEnabledTargets,
} from "./support.ts";

function text(id: string, value: string): BuilderTextChild {
  return { kind: "text", id, text: value };
}

function slot(...children: BuilderSlot["children"]): BuilderSlot {
  return { kind: "slot", children };
}

function string(value: string) {
  return { kind: "string", value } as const;
}

function boolean(value: boolean) {
  return { kind: "boolean", value } as const;
}

function json(value: unknown) {
  return { kind: "json", source: JSON.stringify(value) } as const;
}

function button(id: string, label: string, href?: string): BuilderNode {
  return {
    kind: "component",
    id,
    slug: "button",
    props: {
      children: slot(text(`${id}-text`, label)),
      ...(href === undefined ? {} : { href: string(href) }),
    },
  };
}

function previewFixture(dialogOpen = false): BuilderDocument {
  return {
    version: 1,
    name: "Preview protocol witnesses",
    children: [
      {
        kind: "component",
        id: "preview-hero",
        slug: "hero-block",
        props: {
          title: slot(text("hero-title", "Truthful viewport")),
          description: slot(text(
            "hero-description",
            "The layout follows the frame viewport.",
          )),
          actions: slot(button(
            "hero-action",
            "Blocked destination",
            "https://example.test/blocked",
          )),
          visual: slot(text("hero-visual", "Hero visual")),
          layout: string("split"),
        },
      },
      {
        kind: "component",
        id: "preview-cta",
        slug: "cta-band",
        props: {
          title: slot(text("cta-title", "Responsive call to action")),
          description: slot(text(
            "cta-description",
            "The split follows the frame breakpoint.",
          )),
          actions: slot(button("cta-action", "Continue", "/contained")),
          visual: slot(text("cta-visual", "CTA visual")),
          align: string("split"),
        },
      },
      {
        kind: "component",
        id: "preview-editorial",
        slug: "editorial-hero",
        props: {
          title: slot(text("editorial-title", "Container-query witness")),
          description: slot(text(
            "editorial-description",
            "The lower grid belongs to the Component container.",
          )),
          visual: slot(text("editorial-visual", "Editorial visual")),
        },
      },
      {
        kind: "component",
        id: "preview-table",
        slug: "table",
        props: {
          caption: slot(text("table-caption", "Viewport measurements")),
          children: slot(text("table-empty", "")),
        },
      },
      {
        kind: "component",
        id: "preview-header",
        slug: "site-header",
        props: {
          brand: slot(text("header-brand", "Frame brand")),
          homeHref: string("/home"),
          navItems: json([
            { label: "Overview", href: "/overview" },
            { label: "Details", href: "/details" },
          ]),
          collapseNavOnNarrow: boolean(true),
        },
      },
      {
        kind: "component",
        id: "preview-diagnostic",
        slug: "diagnostic",
        props: {
          title: slot(text("diagnostic-title", "Dense workflow witness")),
          impact: slot(text(
            "diagnostic-impact",
            "Long diagnostic evidence stays inside its logical viewport.",
          )),
          correction: slot(text(
            "diagnostic-correction",
            "Keep logical layout and visual scale separate.",
          )),
          path: string("/workspace/src/very/long/path/to/component.tsx"),
          reproductionCommand: string("deno task preview"),
          rawDetail: slot(text("diagnostic-raw", "deterministic raw detail")),
        },
      },
      {
        kind: "component",
        id: "preview-tabs",
        slug: "tabs",
        props: {
          items: json([
            { value: "overview", label: "Overview", content: "Summary" },
            {
              value: "details",
              label: "Details",
              content: "Detailed content",
            },
          ]),
          defaultValue: string("overview"),
          label: string("Preview sections"),
        },
      },
      {
        kind: "component",
        id: "preview-raw",
        slug: "raw-output",
        props: {
          label: slot(text("raw-label", "Raw witness")),
          children: slot(text("raw-text", "line one\nline two")),
        },
      },
      {
        kind: "component",
        id: "preview-tooltip",
        slug: "tooltip",
        props: {
          label: string("Safe tooltip"),
          children: slot(button("tooltip-button", "Hover or focus")),
        },
      },
      {
        kind: "component",
        id: "preview-dialog",
        slug: "dialog",
        props: {
          open: boolean(dialogOpen),
          title: slot(text("dialog-title", "Contained dialog")),
          children: slot(text(
            "dialog-body",
            "The modal belongs to the preview frame.",
          )),
          closeLabel: string("Close contained dialog"),
        },
      },
      {
        kind: "component",
        id: "preview-theme-toggle",
        slug: "theme-toggle",
        props: { theme: string("light") },
      },
      button(
        "preview-external-link",
        "External link",
        "https://example.test/outside",
      ),
      {
        ...button(
          "preview-popup-link",
          "Popup link",
          "https://example.test/popup",
        ),
        extra: '{"target":"_blank"}',
      },
      {
        ...button(
          "preview-download-link",
          "Download link",
          "/catalogue/example.txt",
        ),
        extra: '{"download":"example.txt"}',
      },
    ],
  };
}

export async function focusState(page: Page): Promise<{
  readonly canvas: boolean;
  readonly focusVisible: boolean;
  readonly indicator: boolean;
  readonly description: string;
}> {
  return await page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) {
      return {
        canvas: false,
        focusVisible: false,
        indicator: false,
        description: "no HTMLElement",
      };
    }
    const candidates = [
      active,
      active.nextElementSibling,
      active.parentElement,
      active.closest("label"),
    ].filter((candidate): candidate is Element => candidate instanceof Element);
    const indicator = candidates.some((candidate) => {
      const style = getComputedStyle(candidate);
      return (style.outlineStyle !== "none" &&
        Number.parseFloat(style.outlineWidth) >= 2) ||
        style.boxShadow !== "none";
    });
    return {
      canvas: active.closest("#discern-builder-pane-canvas") !== null &&
        active.id !== "discern-builder-pane-canvas" &&
        active.closest(".discern-builder-canvas-actions") === null,
      focusVisible: active.matches(":focus-visible"),
      indicator,
      description: active.outerHTML.replace(/\s+/g, " ").slice(0, 180),
    };
  });
}

export async function verifyKeyboardTraversal(
  page: Page,
  label: string,
): Promise<KeyboardSummary> {
  if (label === "wide builder") await verifyLogicalPreviewFrame(page);
  const shell = page.locator(BUILDER_SHELL);
  const candidates = await visibleEnabledTargets(shell);
  await shell.evaluate((node) => {
    for (
      const [id, position] of [
        ["discern-builder-focus-before", "beforebegin"],
        ["discern-builder-focus-after", "afterend"],
      ] as const
    ) {
      const sentinel = document.createElement("button");
      sentinel.id = id;
      sentinel.type = "button";
      sentinel.textContent = `${id} sentinel`;
      sentinel.style.cssText =
        "position:fixed;inline-size:1px;block-size:1px;opacity:0;";
      node.insertAdjacentElement(position, sentinel);
    }
  });
  let stops = 0;
  let focusIndicators = 0;
  try {
    await page.locator("#discern-builder-focus-before").focus();
    const cap = candidates.length + 8;
    let escaped = false;
    for (let index = 0; index < cap; index += 1) {
      await page.keyboard.press("Tab");
      if (
        await page.locator("#discern-builder-focus-after").evaluate((node) =>
          node.ownerDocument.activeElement === node
        )
      ) {
        escaped = true;
        break;
      }
      const state = await focusState(page);
      invariant(
        !state.canvas,
        `${label} tabbed into canvas: ${state.description}`,
      );
      invariant(
        state.focusVisible,
        `${label} stop does not match :focus-visible: ${state.description}`,
      );
      invariant(
        state.indicator,
        `${label} stop has no visible focus indicator: ${state.description}`,
      );
      stops += 1;
      focusIndicators += 1;
    }
    invariant(escaped, `${label} keyboard traversal did not terminate`);
    const canvas = page.locator(CANVAS_PAGE);
    const canvasTargets = canvas.locator(FOCUSABLE_SELECTOR);
    invariant(
      await canvasTargets.count() > 0,
      `${label} canvas inertness check has no interactive witness`,
    );
    const exposed = await canvasTargets.evaluateAll((nodes) =>
      nodes.flatMap((node) => {
        if (!(node instanceof HTMLElement)) return [];
        return node.tabIndex >= 0 && node.closest("[inert]") === null &&
            node.closest(".discern-builder-canvas-actions") === null
          ? [node.outerHTML.replace(/\s+/g, " ").slice(0, 180)]
          : [];
      })
    );
    invariant(
      exposed.length === 0,
      `${label} canvas exposes sequential controls: ${exposed.join("; ")}`,
    );
    return { stops, focusIndicators };
  } finally {
    await page.locator(
      "#discern-builder-focus-before, #discern-builder-focus-after",
    ).evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
  }
}

async function verifyLogicalPreviewFrame(page: Page): Promise<void> {
  const selector = "iframe[data-discern-builder-preview-frame]";
  const originalSource = await page.evaluate(
    (key) => localStorage.getItem(key),
    BUILDER_STORAGE_KEYS.document,
  );
  const originalUrl = page.url();
  const originalAppearanceStorage = await page.evaluate(() => ({
    theme: localStorage.getItem("discern-catalogue-theme"),
    accent: localStorage.getItem("discern-catalogue-accent-hue"),
  }));
  try {
    await page.evaluate(
      ({ key, source }) => localStorage.setItem(key, source),
      {
        key: BUILDER_STORAGE_KEYS.document,
        source: JSON.stringify(previewFixture()),
      },
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(BUILDER_READY).waitFor({ timeout: ACTION_TIMEOUT });

    const frame = page.locator(selector);
    const preview = page.frameLocator(selector);
    invariant(await frame.count() === 1, "builder preview is not a real frame");
    invariant(
      await page.locator(".discern-theme-switcher").count() === 0 &&
        await page.locator(".discern-catalogue-appearance").count() === 2,
      "Builder forked the shared Appearance control or rendered it twice",
    );
    await preview.locator(".discern-builder-frame-document").waitFor({
      timeout: ACTION_TIMEOUT,
    });
    const width = page.getByLabel("Preview width");
    const responsive: Record<string, {
      readonly innerWidth: number;
      readonly media820: boolean;
      readonly heroInlineSize: number;
      readonly heroColumns: number;
      readonly ctaInlineSize: number;
      readonly ctaColumns: number;
      readonly editorialInlineSize: number;
      readonly editorialColumns: number;
      readonly headerNav: string;
      readonly bodyOverflow: boolean;
    }> = {};
    for (
      const [preset, expected] of [
        ["desktop", 1200],
        ["tablet", 768],
        ["phone", 390],
      ] as const
    ) {
      await width.selectOption(preset);
      await page.waitForFunction(
        ({ selector, expected }) =>
          document.querySelector<HTMLIFrameElement>(selector)?.contentWindow
            ?.innerWidth === expected,
        { selector, expected },
      );
      responsive[preset] = await preview.locator("html").evaluate(() => {
        const style = (selector: string): CSSStyleDeclaration => {
          const element = document.querySelector(selector);
          if (!(element instanceof HTMLElement)) {
            throw new Error(`Missing responsive witness ${selector}`);
          }
          return getComputedStyle(element);
        };
        const tracks = (selector: string): number => {
          const value = style(selector).gridTemplateColumns;
          return value === "none" ? 0 : value.trim().split(/\s+/).length;
        };
        const inlineSize = (selector: string): number => {
          const element = document.querySelector(selector);
          if (!(element instanceof HTMLElement)) {
            throw new Error(`Missing responsive witness ${selector}`);
          }
          return element.getBoundingClientRect().width;
        };
        return {
          innerWidth,
          media820: matchMedia("(max-width: 820px)").matches,
          heroInlineSize: inlineSize(".discern-hero-block"),
          heroColumns: tracks(".discern-hero-block__inner"),
          ctaInlineSize: inlineSize(".discern-cta-band"),
          ctaColumns: tracks(".discern-cta-band__inner"),
          editorialInlineSize: inlineSize(".discern-editorial-hero"),
          editorialColumns: tracks(".discern-editorial-hero__lower"),
          headerNav: style(".discern-site-header__nav").display,
          bodyOverflow: document.body.scrollWidth > innerWidth,
        };
      });
      invariant(
        responsive[preset]?.innerWidth === expected,
        `${preset} did not report innerWidth ${expected}px`,
      );
      invariant(
        await preview.locator(".discern-table").count() === 1 &&
          await preview.locator(".discern-diagnostic").count() === 1,
        `${preset} lost the Table or dense Workflow witness`,
      );
      invariant(
        responsive[preset]?.bodyOverflow === false,
        `${preset} leaked Component content beyond the frame body`,
      );
    }
    const desktop = responsive.desktop;
    const tablet = responsive.tablet;
    const phone = responsive.phone;
    invariant(
      desktop !== undefined && tablet !== undefined && phone !== undefined,
      "responsive witnesses were not measured",
    );
    invariant(
      !desktop.media820 && tablet.media820 && phone.media820,
      "frame matchMedia did not follow the selected logical viewport",
    );
    for (const [preset, result] of Object.entries(responsive)) {
      invariant(
        result.heroColumns === (result.heroInlineSize <= 820 ? 1 : 2),
        `Hero did not follow its allocated ${result.heroInlineSize}px inline size in the ${preset} frame`,
      );
      invariant(
        result.ctaColumns === (result.ctaInlineSize <= 720 ? 1 : 2),
        `CTA Band did not follow its allocated ${result.ctaInlineSize}px inline size in the ${preset} frame`,
      );
      invariant(
        result.editorialColumns ===
          (result.editorialInlineSize <= 860 ? 1 : 2),
        `Editorial Hero did not follow its allocated ${result.editorialInlineSize}px inline size in the ${preset} frame`,
      );
    }
    invariant(
      desktop.headerNav !== "none" && tablet.headerNav !== "none" &&
        phone.headerNav === "none",
      "Site header did not enter its real collapsed-navigation rule",
    );

    await width.selectOption("fluid");
    await page.waitForTimeout(50);
    const fluid = await frame.evaluate((element) => {
      const iframe = element as HTMLIFrameElement;
      return {
        logical: iframe.contentWindow?.innerWidth ?? 0,
        css: iframe.clientWidth,
      };
    });
    invariant(
      fluid.logical === fluid.css && fluid.logical > 0,
      `Fluid reported ${fluid.logical}px inside a ${fluid.css}px frame`,
    );

    await width.selectOption("desktop");
    await page.getByRole("button", { name: "Fit preview" }).click();
    const scaled = await frame.evaluate((element) => {
      const iframe = element as HTMLIFrameElement;
      return {
        logical: iframe.contentWindow?.innerWidth ?? 0,
        displayed: iframe.getBoundingClientRect().width,
      };
    });
    invariant(scaled.logical === 1200, "Fit changed the desktop logical width");
    invariant(
      scaled.displayed < scaled.logical,
      "desktop Fit did not visibly scale the frame in the wide Builder",
    );

    await page.getByRole("button", { name: "100% preview" }).click();
    const layoutAt100 = await preview.locator(".discern-hero-block__inner")
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns);
    await page.getByRole("button", { name: "50% preview" }).click();
    const layoutAt50 = await preview.locator(".discern-hero-block__inner")
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns);
    const half = await frame.evaluate((element) => ({
      logical: (element as HTMLIFrameElement).contentWindow?.innerWidth ?? 0,
      displayed: element.getBoundingClientRect().width,
    }));
    invariant(
      layoutAt100 === layoutAt50 && half.logical === 1200 &&
        Math.abs(half.displayed - 600) < 1,
      "visual zoom changed logical Component layout",
    );

    const storedBeforeSelection = await page.evaluate(
      (key) => localStorage.getItem(key),
      BUILDER_STORAGE_KEYS.document,
    );
    const heroRect = await preview.locator(".discern-hero-block").evaluate(
      (element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      },
    );
    await page.locator(".discern-builder-edit-layer").click({
      position: {
        x: (heroRect.x + Math.min(20, heroRect.width / 2)) * 0.5,
        y: (heroRect.y + Math.min(20, heroRect.height / 2)) * 0.5,
      },
    });
    invariant(
      await page.locator(
        '[data-discern-builder-outline-id="preview-hero"] .discern-builder-layers__select[aria-current="true"]',
      ).count() === 1,
      "50% pointer mapping did not select the logical Hero node",
    );
    invariant(
      await page.evaluate(() =>
        document.activeElement?.id !== "discern-builder-selection-heading" &&
        document.activeElement?.id !== "discern-builder-pane-canvas"
      ),
      "pointer selection moved focus into a large editor treatment",
    );
    invariant(
      await page.evaluate(
        (key) => localStorage.getItem(key),
        BUILDER_STORAGE_KEYS.document,
      ) === storedBeforeSelection,
      "zoom or Edit selection changed the accepted document",
    );
    invariant(
      await frame.getAttribute("tabindex") === "-1" &&
        await preview.locator(".discern-builder-frame-document")
            .getAttribute("inert") !== null &&
        await preview.locator(".discern-builder-frame-document")
            .getAttribute("aria-hidden") === "true",
      "Edit did not keep the preview inert and out of traversal",
    );

    await page.getByRole("button", { name: "100% preview" }).click();
    await page.getByRole("button", { name: "Interact", exact: true }).click();
    await page.waitForFunction(
      (selector) => {
        const iframe = document.querySelector<HTMLIFrameElement>(selector);
        const documentRoot = iframe?.contentDocument?.querySelector(
          ".discern-builder-frame-document",
        );
        return iframe?.tabIndex === 0 &&
          documentRoot?.hasAttribute("inert") === false;
      },
      selector,
    );
    invariant(
      await page.locator(".discern-builder-edit-layer").count() === 0 &&
        await frame.getAttribute("tabindex") === "0" &&
        await preview.locator(".discern-builder-frame-document")
            .getAttribute("inert") === null,
      "Interact left Edit interception or inertness active",
    );
    const previewStatus = page.locator(".discern-builder-preview-status");
    const restingStatusHeight = await previewStatus.evaluate((element) =>
      element.getBoundingClientRect().height
    );
    const tabs = preview.getByRole("tablist", { name: "Preview sections" });
    await tabs.getByRole("tab", { name: "Details" }).click();
    invariant(
      await tabs.getByRole("tab", { name: "Details" }).getAttribute(
            "aria-selected",
          ) === "true" &&
        await preview.getByRole("tabpanel").getByText("Detailed content")
          .isVisible(),
      "Interact did not switch Tabs",
    );
    const disclosure = preview.locator(
      '[data-discern-builder-frame-root-child="preview-raw"] .discern-raw-output',
    );
    await disclosure.locator("summary").click();
    invariant(
      await disclosure.getAttribute("open") !== null,
      "Interact did not open the disclosure",
    );
    const tooltipTrigger = preview.getByRole("button", {
      name: "Hover or focus",
    });
    await tooltipTrigger.focus();
    const tooltip = preview.getByRole("tooltip", { name: "Safe tooltip" });
    await page.waitForFunction(
      (selector) => {
        const iframe = document.querySelector<HTMLIFrameElement>(
          "iframe[data-discern-builder-preview-frame]",
        );
        const element = iframe?.contentDocument?.querySelector(selector);
        if (element === null || element === undefined) return false;
        const style = iframe?.contentWindow?.getComputedStyle(element);
        return style?.visibility !== "hidden" && style?.opacity !== "0";
      },
      '[data-discern-builder-frame-root-child="preview-tooltip"] [role="tooltip"]',
      { timeout: ACTION_TIMEOUT },
    );
    invariant(
      await tooltip.evaluate((element) =>
        getComputedStyle(element).visibility !== "hidden" &&
        getComputedStyle(element).opacity !== "0"
      ),
      "Interact did not expose Tooltip behaviour on focus",
    );
    const frameUrl = await preview.locator("html").evaluate(() =>
      location.href
    );
    const eventLog = page.getByRole("list", { name: "Preview event log" });
    await preview.getByRole("link", { name: "External link" }).click();
    await eventLog.getByText("Blocked link").waitFor({
      timeout: ACTION_TIMEOUT,
    });
    await preview.getByRole("link", { name: "Popup link" }).click();
    await eventLog.getByText("Blocked popup").waitFor({
      timeout: ACTION_TIMEOUT,
    });
    await preview.getByRole("link", { name: "Download link" }).click();
    await eventLog.getByText("Blocked download").waitFor({
      timeout: ACTION_TIMEOUT,
    });
    await preview.getByRole("button", { name: "Switch to the dark theme" })
      .click();
    await eventLog.getByText('onThemeChange("dark")').waitFor({
      timeout: ACTION_TIMEOUT,
    });
    await preview.locator("body").evaluate((body) => {
      const form = document.createElement("form");
      const input = document.createElement("input");
      input.setAttribute("aria-label", "Submit witness field");
      form.append(input);
      body.append(form);
    });
    await preview.getByRole("textbox", { name: "Submit witness field" }).press(
      "Enter",
    );
    await eventLog.getByText("Blocked form submission").waitFor({
      timeout: ACTION_TIMEOUT,
    });
    const eventText = await eventLog.innerText();
    const populatedStatusHeight = await previewStatus.evaluate((element) =>
      element.getBoundingClientRect().height
    );
    await preview.getByRole("textbox", { name: "Submit witness field" })
      .evaluate((input) => input.closest("form")?.remove());
    invariant(
      await preview.locator("html").evaluate(() => location.href) ===
          frameUrl &&
        page.url().includes("/catalogue/builder/"),
      "Interact allowed a link to escape or replace the preview",
    );
    invariant(
      eventText.includes('onValueChange("details")') &&
        eventText.includes('onThemeChange("dark")') &&
        eventText.includes("Blocked link") &&
        eventText.includes("Blocked popup") &&
        eventText.includes("Blocked download") &&
        eventText.includes("Blocked form submission"),
      `Interact did not record callback and containment witnesses: ${eventText}`,
    );
    invariant(
      populatedStatusHeight <= restingStatusHeight + 12 &&
        populatedStatusHeight < 64,
      `Preview events expanded the sticky status from ${restingStatusHeight}px to ${populatedStatusHeight}px and obscured later interactions`,
    );
    await page.getByRole("button", { name: "Reset interactions" }).click();
    await page.waitForFunction(
      (selector) => {
        const iframe = document.querySelector<HTMLIFrameElement>(selector);
        const frameDocument = iframe?.contentDocument;
        const overview = [
          ...frameDocument?.querySelectorAll('[role="tab"]') ??
            [],
        ].find((element) => element.textContent?.trim() === "Overview");
        const disclosure = frameDocument?.querySelector(
          '[data-discern-builder-frame-root-child="preview-raw"] .discern-raw-output',
        );
        const initialThemeToggle = frameDocument?.querySelector(
          'button[aria-label="Switch to the dark theme"]',
        );
        return overview?.getAttribute("aria-selected") === "true" &&
          disclosure?.hasAttribute("open") === false &&
          initialThemeToggle !== null &&
          document.querySelector('[aria-label="Preview event log"]') === null;
      },
      selector,
      { timeout: ACTION_TIMEOUT },
    );
    invariant(
      await tabs.getByRole("tab", { name: "Overview" }).getAttribute(
            "aria-selected",
          ) === "true" &&
        await disclosure.getAttribute("open") === null &&
        await preview.getByRole("button", {
            name: "Switch to the dark theme",
          }).count() === 1 &&
        await page.getByRole("list", { name: "Preview event log" }).count() ===
          0,
      "Reset interactions left stale local state or event witnesses",
    );
    invariant(
      await page.evaluate(
            (key) => localStorage.getItem(key),
            BUILDER_STORAGE_KEYS.document,
          ) === storedBeforeSelection &&
        await page.getByRole("button", { name: /Undo/ }).isDisabled(),
      "Interact changed the accepted document or Builder history",
    );

    await page.getByRole("button", { name: "Edit", exact: true }).click();
    invariant(
      await page.locator(
            '[data-discern-builder-outline-id="preview-hero"] .discern-builder-layers__select[aria-current="true"]',
          ).count() === 1 &&
        await frame.getAttribute("tabindex") === "-1",
      "returning to Edit lost selection or inertness",
    );

    const editorColour = await page.locator(BUILDER_SHELL).evaluate((element) =>
      getComputedStyle(element).getPropertyValue(
        "--discern-builder-editor-selection",
      )
    );
    await useScopedTheme(page, "Workspace", "light");
    await useScopedTheme(page, "Preview", "dark");
    const previewAppearance = page.getByRole("group", {
      name: "Preview appearance",
    });
    const previewAppearanceDetails = previewAppearance.locator(
      ".discern-catalogue-appearance",
    );
    if (await previewAppearanceDetails.getAttribute("open") === null) {
      await previewAppearanceDetails.locator("summary").click();
    }
    await previewAppearance.getByRole("combobox", {
      name: "Preview accent review preset",
    })
      .selectOption("300", { timeout: ACTION_TIMEOUT });
    await page.waitForTimeout(50);
    invariant(
      await page.locator(BUILDER_SHELL).getAttribute("data-discern-theme") ===
          "light" &&
        await preview.locator(".discern-builder-frame-document").getAttribute(
            "data-discern-theme",
          ) === "dark" &&
        await preview.locator(".discern-builder-frame-document").evaluate(
            (element) => element.style.getPropertyValue("--discern-accent-hue"),
          ) === "300" &&
        await page.locator(BUILDER_SHELL).evaluate((element) =>
            getComputedStyle(element).getPropertyValue(
              "--discern-builder-editor-selection",
            )
          ) === editorColour &&
        (await page.locator(".discern-builder-card img").first().getAttribute(
            "src",
          ))?.endsWith("--dark.png") === true,
      "Workspace/Preview Appearance or stable editor chrome crossed boundaries",
    );
    await previewAppearanceDetails.locator("summary").click();

    await page.getByRole("button", { name: "Interact", exact: true }).click();
    await page.getByRole("button", { name: "50% preview" }).click();
    await page.evaluate(
      ({ key, source }) => localStorage.setItem(key, source),
      {
        key: BUILDER_STORAGE_KEYS.document,
        source: JSON.stringify(previewFixture(true)),
      },
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(BUILDER_READY).waitFor({ timeout: ACTION_TIMEOUT });
    const restoredPreview = page.frameLocator(selector);
    await restoredPreview.locator("dialog[open]").waitFor({
      timeout: ACTION_TIMEOUT,
    });
    const storedBeforeDialog = await page.evaluate(
      (key) => localStorage.getItem(key),
      BUILDER_STORAGE_KEYS.document,
    );
    invariant(
      await page.getByLabel("Preview width").inputValue() === "desktop" &&
        await page.getByRole("button", { name: "50% preview" }).getAttribute(
            "aria-pressed",
          ) === "true" &&
        await page.getByRole("button", { name: "Interact", exact: true })
            .getAttribute(
              "aria-pressed",
            ) === "true" &&
        await restoredPreview.locator("html").evaluate(() => innerWidth) ===
          1200,
      "reload confused logical width, zoom, or mode comfort state",
    );
    const outerOverflow = await page.locator("body").evaluate((element) =>
      element.style.overflow
    );
    invariant(
      outerOverflow === "" &&
        await restoredPreview.locator("body").evaluate((element) =>
            element.style.overflow
          ) === "hidden",
      "Dialog effects escaped the frame realm",
    );
    await restoredPreview.getByRole("button", {
      name: "Close contained dialog",
    }).click();
    await page.getByRole("list", { name: "Preview event log" })
      .getByText("onOpenChange(false)").waitFor({
        timeout: ACTION_TIMEOUT,
      });
    await page.waitForFunction(
      (selector) => {
        const dialog = document.querySelector<HTMLIFrameElement>(selector)
          ?.contentDocument?.querySelector("dialog");
        return dialog !== null && dialog !== undefined &&
          !dialog.hasAttribute("open");
      },
      selector,
      { timeout: ACTION_TIMEOUT },
    );
    const storedAfterDialog = await page.evaluate(
      (key) => localStorage.getItem(key),
      BUILDER_STORAGE_KEYS.document,
    );
    invariant(
      (await page.getByRole("list", { name: "Preview event log" }).innerText())
        .includes("onOpenChange(false)"),
      "Dialog close did not record its callback witness",
    );
    invariant(
      storedAfterDialog === storedBeforeDialog &&
        await page.getByRole("button", { name: /Undo/ }).isDisabled(),
      "Dialog callback changed persisted document data or Builder history",
    );
  } finally {
    await page.evaluate(
      ({ key, source, appearance }) => {
        if (source === null) localStorage.removeItem(key);
        else localStorage.setItem(key, source);
        for (
          const [storageKey, value] of [
            ["discern-catalogue-theme", appearance.theme],
            ["discern-catalogue-accent-hue", appearance.accent],
          ] as const
        ) {
          if (value === null) localStorage.removeItem(storageKey);
          else localStorage.setItem(storageKey, value);
        }
      },
      {
        key: BUILDER_STORAGE_KEYS.document,
        source: originalSource,
        appearance: originalAppearanceStorage,
      },
    );
    await page.goto(originalUrl, { waitUntil: "networkidle" });
    await page.locator(BUILDER_READY).waitFor({ timeout: ACTION_TIMEOUT });
  }
}
