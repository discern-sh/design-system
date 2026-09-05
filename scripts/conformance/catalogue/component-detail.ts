import {
  conformanceUrl,
  loadConformancePage,
} from "./component-conformance-page.ts";
import {
  CATALOGUE_400_PERCENT_REFLOW_VIEWPORT,
  createDecisionCopyPageVerifier,
  verifyDecisionCopyEnrollment,
} from "./metadata-copy.ts";
import type { Page } from "playwright-core";
import {
  catalogueComponentPath,
  catalogueRoutePaths,
} from "../../../catalogue/routes.ts";
import { withViewport } from "../../viewport.ts";
import {
  CATALOGUE_NARROW_VIEWPORT as NARROW_VIEWPORT,
  CATALOGUE_WIDE_VIEWPORT as WIDE_VIEWPORT,
  eventually,
  invariant,
  loadCataloguePage,
} from "./support.ts";
import { verifyInlineOverflowCueEdges } from "./overflow-cue.ts";

export async function verifyComponentDetailJourneys(
  page: Page,
  origin: string,
  expectedComponents: readonly string[],
): Promise<void> {
  await withViewport(page, WIDE_VIEWPORT, async () => {
    const detailSlug = expectedComponents.includes("command")
      ? "command"
      : expectedComponents[0];
    invariant(detailSlug, "Component detail journey needs one Component");
    const detailUrl = new URL(catalogueComponentPath(detailSlug), origin);
    detailUrl.searchParams.set("theme", "light");
    detailUrl.searchParams.set("accent", "violet");
    await loadCataloguePage(page, detailUrl.href);
    invariant(
      await page.getByRole("main").getByRole("heading", { level: 1 })
            .count() ===
          1 &&
        await page.locator(
            "[data-discern-example-state], [data-discern-cli-example-state], [data-discern-example-unavailable]",
          ).count() === 1,
      "Component detail must default to one named specimen",
    );
    const evidence = page.locator(
      ".discern-catalogue-component__evidence > details",
    );
    invariant(
      await evidence.count() === 3 &&
        await page.locator(
            ".discern-catalogue-component__evidence > details[open]",
          ).count() === 0,
      "Detail evidence must stay three ordered, closed disclosures",
    );
    invariant(
      JSON.stringify(await evidence.locator("summary").allTextContents()) ===
        JSON.stringify([
          "Usage guidance",
          "Selection and import",
          "Props and variants",
        ]),
      "Detail disclosure order changed",
    );
    for (
      const [label, suffix] of [
        ["Open React source", ".tsx"],
        ["Open metadata", ".meta.ts"],
      ] as const
    ) {
      const source = page.getByRole("link", { name: label });
      invariant(
        (await source.getAttribute("href"))?.endsWith(suffix),
        `${label} does not describe its destination`,
      );
    }
    const exampleSelect = page.getByLabel("Example");
    const selectedId = await exampleSelect.inputValue();
    await page.getByRole("button", { name: "CLI", exact: true }).click();
    invariant(
      await exampleSelect.inputValue() === selectedId &&
        new URL(page.url()).searchParams.get("example") === selectedId &&
        new URL(page.url()).searchParams.get("theme") === "light" &&
        new URL(page.url()).searchParams.get("accent") === "300" &&
        new URL(page.url()).searchParams.get("field") === "0,1,1,1",
      "Web/CLI switching changed canonical example or Appearance identity",
    );
    await page.getByRole("button", { name: "Web", exact: true }).click();
    const viewAll = page.getByRole("button", { name: /View all / });
    await viewAll.click();
    invariant(
      new URL(page.url()).searchParams.get("view") === "all" &&
        await page.locator("[data-discern-example-state]").count() ===
          await exampleSelect.locator("option:not([disabled])").count(),
      "View all examples is not a deliberate ordered gallery",
    );
    invariant(
      await page.locator('nav[aria-label="Component continuation"] a').count() >
        0,
      "Detail lacks canonical previous/next or Compare continuation",
    );

    const allUrl = new URL(catalogueRoutePaths.components, origin);
    allUrl.searchParams.set("all", "1");
    await loadCataloguePage(page, allUrl.href);
    const webOnlyCard = page.locator(".discern-catalogue-component-card")
      .filter({
        hasText: "Web only",
      }).first();
    invariant(
      await webOnlyCard.count() === 1,
      "Registry needs a CLI-exempt Component guard",
    );
    const webOnlyHref = await webOnlyCard.locator(
      ".discern-catalogue-component-card__inspect",
    ).getAttribute("href");
    invariant(webOnlyHref, "CLI-exempt result lacks its detail link");
    const exemptUrl = new URL(webOnlyHref, origin);
    exemptUrl.searchParams.set("surface", "cli");
    await loadCataloguePage(page, exemptUrl.href);
    invariant(
      await page.locator("[data-discern-example-unavailable]").count() === 1 &&
        (await page.getByLabel("Example").locator("option:checked")
          .textContent())
          ?.includes("unavailable on CLI"),
      "CLI exemption or surface-only reason silently changed examples",
    );
  });
  await withViewport(page, NARROW_VIEWPORT, async () => {
    const tableUrl = new URL(catalogueComponentPath("table"), origin);
    tableUrl.searchParams.set("example", "dense-overflow");
    await loadCataloguePage(page, tableUrl.href);
    await verifyInlineOverflowCueEdges(
      page.locator("[data-discern-catalogue-specimen-overflow]"),
      "Web Component specimen",
    );

    const commandUrl = new URL(catalogueComponentPath("command"), origin);
    await loadCataloguePage(page, commandUrl.href);
    await page.getByText("Props and variants", { exact: true }).click();
    await verifyInlineOverflowCueEdges(
      page.locator(".discern-catalogue-api__cue"),
      "Component props table",
    );
  });
}

export async function verifyComponentDetailMetadata(
  page: Page,
  origin: string,
  expectedComponents: readonly string[],
): Promise<{ readonly roles: number; readonly scans: number }> {
  const metadata = createDecisionCopyPageVerifier(page);
  const { verifyPage } = metadata;
  await withViewport(page, WIDE_VIEWPORT, async () => {
    const detailSlug = expectedComponents.includes("command")
      ? "command"
      : expectedComponents[0];
    invariant(detailSlug, "Metadata review needs one Component detail");
    const detail = new URL(catalogueComponentPath(detailSlug), origin);
    detail.searchParams.set("theme", "dark");
    await loadCataloguePage(page, detail.href);
    await verifyDecisionCopyEnrollment(
      page,
      ".discern-catalogue-component--detail > header .discern-catalogue-component__identity > p",
      "Component detail descriptions",
    );
    for (const disclosure of ["Usage guidance", "Props and variants"]) {
      await page.getByText(disclosure, { exact: true }).click();
    }
    await verifyDecisionCopyEnrollment(
      page,
      ".discern-catalogue-guidance li, .discern-catalogue-guidance > div p",
      "Component usage guidance",
    );
    await verifyDecisionCopyEnrollment(
      page,
      ".discern-catalogue-api p, .discern-catalogue-api th small",
      "Component API explanations",
    );
    await verifyPage("Component detail guidance metadata/dark", {
      scan: true,
    });

    const all = new URL(catalogueRoutePaths.components, origin);
    all.searchParams.set("all", "1");
    await loadCataloguePage(page, all.href);
    const webOnly = page.locator(".discern-catalogue-component-card").filter({
      hasText: "Web only",
    }).first();
    const href = await webOnly.locator(
      ".discern-catalogue-component-card__inspect",
    ).getAttribute("href");
    invariant(href, "Metadata review needs one CLI-exempt Component");
    const exemption = new URL(href, origin);
    exemption.searchParams.set("surface", "cli");
    exemption.searchParams.set("theme", "light");
    await loadCataloguePage(page, exemption.href);
    await verifyDecisionCopyEnrollment(
      page,
      ".discern-catalogue-component__unavailable p",
      "Selected-surface unavailability explanations",
    );
    await verifyPage("CLI exemption metadata/light");
  });
  await withViewport(page, CATALOGUE_400_PERCENT_REFLOW_VIEWPORT, async () => {
    const detail = new URL(catalogueComponentPath("command"), origin);
    detail.searchParams.set("theme", "light");
    await loadCataloguePage(page, detail.href);
    for (const disclosure of ["Usage guidance", "Props and variants"]) {
      await page.getByText(disclosure, { exact: true }).click();
    }
    await verifyPage("Detail metadata at representative 400% reflow/light");
  });
  return metadata.evidence;
}

export async function verifyStateFragmentRestoration(
  page: Page,
  origin: string,
): Promise<void> {
  await withViewport(page, WIDE_VIEWPORT, async () => {
    await loadConformancePage(page, conformanceUrl(origin, "light"));
    const states = await page.locator(
      '.discern-catalogue-example-state[id^="component-"][id*="--"]',
    ).evaluateAll((nodes) =>
      nodes.map((node) => {
        const component = node.closest<HTMLElement>(
          "[data-discern-component]",
        );
        return {
          fragment: node.id,
          component: component?.dataset.discernComponent,
        };
      })
    );
    invariant(
      states.length > 0,
      "Fragment restoration needs a Catalogue state",
    );
    for (const state of states) {
      invariant(
        state.component !== undefined &&
          state.fragment.startsWith(`component-${state.component}--`) &&
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
            state.fragment.slice(`component-${state.component}--`.length),
          ),
        `Catalogue state ID does not derive from its component: #${state.fragment}`,
      );
    }
    const state = states[Math.floor(states.length / 2)];
    invariant(state, "Fragment restoration needs a middle Catalogue state");
    invariant(
      state.component !== undefined,
      "Fragment restoration needs a Component-owned state",
    );
    const fragment = state.fragment;
    const url = new URL(catalogueRoutePaths.overview, origin);
    url.hash = fragment;
    await loadCataloguePage(page, url.href);
    invariant(
      new URL(page.url()).pathname === catalogueComponentPath(state.component),
      `Legacy state link did not upgrade to ${
        catalogueComponentPath(state.component)
      }`,
    );
    const target = page.locator(`#${fragment}`);
    let placement = {
      top: Number.POSITIVE_INFINITY,
      viewportHeight: 0,
      scrollTop: 0,
      maxScrollTop: 0,
    };
    await eventually(
      async () => {
        placement = await target.evaluate((node) => {
          const document = node.ownerDocument;
          const scrollingElement = document.scrollingElement ??
            document.documentElement;
          return {
            top: node.getBoundingClientRect().top,
            viewportHeight: document.documentElement.clientHeight,
            scrollTop: scrollingElement.scrollTop,
            maxScrollTop: scrollingElement.scrollHeight -
              scrollingElement.clientHeight,
          };
        });
        return placement.top >= 0 &&
          (placement.top <= 160 ||
            (placement.top < placement.viewportHeight &&
              placement.scrollTop >= placement.maxScrollTop - 1));
      },
      `Cold fragment load left #${fragment} outside the viewport`,
    );
    const targetState = await target.evaluate((node) => ({
      matchesTarget: node.matches(":target"),
      highlight: getComputedStyle(
        node.querySelector(":scope > header") ?? node,
      ).boxShadow,
      component: node.closest<HTMLElement>("[data-discern-component]")?.dataset
        .discernComponent,
      activeElement: node.ownerDocument.activeElement ===
          node.ownerDocument.body
        ? "body"
        : node.ownerDocument.activeElement?.id ||
          node.ownerDocument.activeElement?.tagName.toLowerCase(),
    }));
    invariant(
      placement.top >= 0 &&
        (placement.top <= 160 ||
          (placement.top < placement.viewportHeight &&
            placement.scrollTop >= placement.maxScrollTop - 1)),
      `Cold fragment load left #${fragment} at ${
        placement.top.toFixed(2)
      }px with scroll ${placement.scrollTop.toFixed(2)}/${
        placement.maxScrollTop.toFixed(2)
      }`,
    );
    invariant(
      targetState.component === state.component,
      `Cold fragment load targeted a parent instead of #${fragment}`,
    );
    invariant(
      targetState.matchesTarget && targetState.highlight !== "none",
      `Cold fragment load did not highlight #${fragment}`,
    );
    invariant(
      targetState.activeElement === "body",
      `Cold fragment load moved focus to ${
        targetState.activeElement ?? "nothing"
      }`,
    );
  });
}
