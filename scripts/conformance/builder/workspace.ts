import type { Browser, Page } from "playwright-core";
import { withViewport } from "../../viewport.ts";
import { placeNamedComponent } from "./discovery.ts";
import { verifyKeyboardTraversal } from "./preview.ts";
import {
  activatePane,
  ADAPTIVE_CASES,
  type AdaptiveSummary,
  assertNoPageOverflow,
  attempt,
  invariant,
  loadBuilderPage,
  NARROW_VIEWPORT,
  paneLocator,
  PANES,
  scanBuilderAccessibility,
  THEMES,
  useTheme,
  withAuxiliaryPage,
} from "./support.ts";

export async function verifyAdaptiveMatrix(
  page: Page,
  origin: string,
  failures: string[],
): Promise<AdaptiveSummary> {
  let cases = 0;
  let paneTransitions = 0;
  let axeScans = 0;
  for (const adaptive of ADAPTIVE_CASES) {
    for (const theme of THEMES) {
      await withViewport(page, adaptive.viewport, async () => {
        const label = `${theme}/${adaptive.label}`;
        const completed = await attempt(
          failures,
          `adaptive ${label}`,
          false,
          async () => {
            await loadBuilderPage(page, origin);
            await useTheme(page, theme);
            await assertNoPageOverflow(page, label);
            const tabs = page.getByRole("tablist", { name: "Workspace panes" });
            if (!adaptive.constrained) {
              invariant(
                !await tabs.isVisible(),
                `${label} exposes redundant pane tabs`,
              );
              for (const pane of PANES) {
                invariant(
                  await paneLocator(page, pane).isVisible(),
                  `${label} hides the ${pane} pane at wide desktop`,
                );
              }
              await scanBuilderAccessibility(page, label, failures);
              axeScans += 1;
            } else {
              invariant(
                await tabs.isVisible(),
                `${label} has no pane navigation`,
              );
              for (const pane of PANES) {
                const transitioned = await attempt(
                  failures,
                  `adaptive ${label}/${pane}`,
                  false,
                  async () => {
                    await activatePane(page, pane);
                    const visible = await Promise.all(
                      PANES.map((candidate) =>
                        paneLocator(page, candidate).isVisible()
                      ),
                    );
                    invariant(
                      visible.filter(Boolean).length === 1 &&
                        visible[PANES.indexOf(pane)] === true,
                      `${label}/${pane} does not expose exactly one truthful pane`,
                    );
                    await assertNoPageOverflow(page, `${label}/${pane}`);
                    await scanBuilderAccessibility(
                      page,
                      `${label}/${pane}`,
                      failures,
                    );
                    axeScans += 1;
                    return true;
                  },
                );
                paneTransitions += Number(transitioned);
              }
            }
            return true;
          },
        );
        cases += Number(completed);
      });
    }
  }
  return { cases, paneTransitions, axeScans };
}

export async function verifyForcedColours(
  browser: Browser,
  origin: string,
  failures: string[],
): Promise<number> {
  return await withAuxiliaryPage(
    browser,
    failures,
    {
      viewport: NARROW_VIEWPORT,
      reducedMotion: "reduce",
      forcedColors: "active",
    },
    undefined,
    async (page) => {
      await loadBuilderPage(page, origin);
      await placeNamedComponent(page, "Button");
      await activatePane(page, "palette");
      const result = await verifyKeyboardTraversal(page, "forced colours");
      return result.focusIndicators;
    },
  );
}
