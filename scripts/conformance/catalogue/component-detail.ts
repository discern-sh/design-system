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

/** Render → adjust → copy: the playground shares one model with its code. */
async function verifyDetailPlaygroundJourney(
  page: Page,
  origin: string,
): Promise<void> {
  const playgroundUrl = new URL(catalogueComponentPath("button"), origin);
  playgroundUrl.searchParams.set("view", "playground");
  await loadCataloguePage(page, playgroundUrl.href);
  invariant(
    await page.locator("[data-discern-detail-playground]").count() === 1,
    "Playground did not mount its starter",
  );
  const tsx = page.locator("[data-discern-playground-tsx]");
  invariant(
    ((await tsx.textContent()) ?? "").includes("<Button"),
    "Starter TSX lacks its adapter tag",
  );
  invariant(
    await page.getByRole("button", { name: "Copy starter TSX" }).count() === 1,
    "Starter usage lacks its copy action",
  );
  await page.locator("#detail-slot-button-children").fill(
    "Conformance label",
  );
  await eventually(
    async () =>
      ((await tsx.textContent()) ?? "").includes("Conformance label") &&
      await page.locator(".discern-catalogue-playground__canvas").getByText(
          "Conformance label",
        ).count() === 1,
    "Playground render and code did not share the adjusted model",
  );
  const variantField = page.locator(".discern-builder-control").filter({
    hasText: "variant",
  }).first();
  await variantField.locator("select").selectOption({ label: "Secondary" });
  await eventually(
    async () => ((await tsx.textContent()) ?? "").includes('variant="secondary"'),
    "A select adjustment did not reach the exported code",
  );
  await page.getByRole("button", { name: "Reset starter" }).click();
  await eventually(
    async () => {
      const source = (await tsx.textContent()) ?? "";
      return !source.includes("Conformance label") &&
        !source.includes('variant="secondary"');
    },
    "Reset starter left edited state behind",
  );

  const cliUrl = new URL(catalogueComponentPath("button"), origin);
  cliUrl.searchParams.set("surface", "cli");
  cliUrl.searchParams.set("view", "playground");
  await loadCataloguePage(page, cliUrl.href);
  invariant(
    await page.locator('[data-discern-view-unavailable="playground"]')
        .count() === 1,
    "CLI playground must state its Web-only contract",
  );
}

/** Snapshots stay distinguishable stills; the live example is one link away. */
async function verifyDetailStatesJourney(
  page: Page,
  origin: string,
  slug: string,
): Promise<void> {
  const statesUrl = new URL(catalogueComponentPath(slug), origin);
  statesUrl.searchParams.set("view", "states");
  await loadCataloguePage(page, statesUrl.href);
  const cards = page.locator("[data-discern-detail-state]");
  const count = await cards.count();
  invariant(
    await page.locator("[data-discern-detail-states]").count() === 1 &&
      count > 0,
    "State strip did not present the canonical examples",
  );
  invariant(
    await page.locator(
        `[data-discern-detail-states] img[src*="/catalogue/generated/example-images/${slug}--"]`,
      ).count() === count,
    "State strip must reuse committed generated snapshots",
  );
  invariant(
    await page.getByText("Snapshot — not operable").count() === count,
    "Snapshots must be distinguished from operable controls",
  );
  await cards.first().getByRole("link", { name: "Open live" }).click();
  await page.waitForLoadState();
  await eventually(
    async () => await page.locator("[data-discern-example-state]").count() === 1,
    "Opening a live example from the strip did not restore the single specimen",
  );
}

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
      await evidence.count() === 2 &&
        await page.locator(
            ".discern-catalogue-component__evidence > details[open]",
          ).count() === 0,
      "Detail evidence must stay two ordered, closed disclosures",
    );
    invariant(
      JSON.stringify(await evidence.locator("summary").allTextContents()) ===
        JSON.stringify([
          "Usage guidance",
          "Props and variants",
        ]),
      "Detail disclosure order changed",
    );
    const adopt = page.locator(".discern-catalogue-detail__adopt");
    invariant(
      await adopt.count() === 1,
      "Detail lacks its open adoption section",
    );
    for (
      const label of [
        "React import",
        "Component selection",
        "Group selection",
      ] as const
    ) {
      invariant(
        await adopt.locator(".discern-catalogue-copyable").filter({
          hasText: label,
        }).count() === 1,
        `Adoption section lacks the copyable ${label}`,
      );
    }
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
    const exampleSelect = page.getByLabel("Example", { exact: true });
    const selectedId = await exampleSelect.inputValue();
    await page.getByRole("radio", { name: "CLI", exact: true }).check();
    invariant(
      await exampleSelect.inputValue() === selectedId &&
        new URL(page.url()).searchParams.get("example") === selectedId &&
        new URL(page.url()).searchParams.get("theme") === "light" &&
        new URL(page.url()).searchParams.get("accent") === "300" &&
        new URL(page.url()).searchParams.get("field") === "0,1,1,1",
      "Web/CLI switching changed canonical example or Appearance identity",
    );
    await page.getByRole("radio", { name: "Web", exact: true }).check();
    await page.getByRole("radio", { name: /^All \d+$/ }).check();
    const optionLabels = await exampleSelect.locator("option")
      .allTextContents();
    invariant(
      new URL(page.url()).searchParams.get("view") === "all" &&
        await page.locator("[data-discern-example-state]").count() ===
          optionLabels.filter((label) => !label.includes("unavailable on Web"))
            .length,
      "View all examples is not a deliberate ordered gallery",
    );

    await page.getByRole("radio", { name: "360px", exact: true }).check();
    await eventually(
      async () =>
        new URL(page.url()).searchParams.get("width") === "narrow" &&
        await page.locator('[data-discern-detail-measured="360"]').count() ===
          1,
      "Exact 360px inspection did not measure 360",
    );
    const exactCanvas = await page.locator(
      ".discern-catalogue-detail__stage-canvas",
    ).boundingBox();
    invariant(
      exactCanvas !== null && Math.abs(exactCanvas.width - 360) <= 1,
      `Exact width canvas measured ${String(exactCanvas?.width)}px`,
    );
    await page.getByRole("radio", { name: "Fit", exact: true }).check();
    await eventually(
      async () => {
        const measured = await page.locator("[data-discern-detail-measured]")
          .getAttribute("data-discern-detail-measured");
        return new URL(page.url()).searchParams.get("width") === null &&
          Number(measured) > 400;
      },
      "Fit did not return the specimen to its allocated canvas",
    );
    await page.getByRole("button", { name: "Expand page column" }).click();
    await eventually(
      async () =>
        new URL(page.url()).searchParams.get("expanded") === "1" &&
        await page.locator(".discern-catalogue-detail--expanded").count() === 1,
      "Expanded inspection did not widen the detail column",
    );
    await page.getByRole("button", { name: "Standard page column" }).click();
    await eventually(
      () =>
        Promise.resolve(
          new URL(page.url()).searchParams.get("expanded") === null,
        ),
      "Expanded inspection did not release the detail column",
    );
    invariant(
      await page.locator('nav[aria-label="Component continuation"] a').count() >
        0,
      "Detail lacks canonical previous/next or Compare continuation",
    );

    await verifyDetailPlaygroundJourney(page, origin);
    await verifyDetailStatesJourney(page, origin, detailSlug);

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

    const states = new URL(catalogueComponentPath("command"), origin);
    states.searchParams.set("view", "states");
    states.searchParams.set("theme", "light");
    await loadCataloguePage(page, states.href);
    await verifyDecisionCopyEnrollment(
      page,
      ".discern-catalogue-states__legend",
      "State strip legend",
    );
    const playground = new URL(catalogueComponentPath("button"), origin);
    playground.searchParams.set("view", "playground");
    playground.searchParams.set("theme", "dark");
    await loadCataloguePage(page, playground.href);
    await verifyDecisionCopyEnrollment(
      page,
      ".discern-catalogue-playground__code > p",
      "Starter usage explanation",
    );
    await verifyPage("Detail playground metadata/dark", { scan: true });
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
