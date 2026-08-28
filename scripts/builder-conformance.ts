import { withViewport } from "./viewport.ts";
import { placeNamedComponent } from "./conformance/builder/discovery.ts";
import { verifyContainedFailures } from "./conformance/builder/inspector.ts";
import {
  captureBuilderScreenshots,
  verifyAuthoringJourney,
  verifyTouchWorkflow,
} from "./conformance/builder/journeys.ts";
import { verifyKeyboardTraversal } from "./conformance/builder/preview.ts";
import { verifyShortcutIsolation } from "./conformance/builder/tree.ts";
import {
  attempt,
  type BuilderConformanceOptions,
  type BuilderConformanceSummary,
  loadBuilderPage,
  NARROW_VIEWPORT,
  resetBuilderStorage,
  WIDE_VIEWPORT,
} from "./conformance/builder/support.ts";
import {
  verifyAdaptiveMatrix,
  verifyForcedColours,
} from "./conformance/builder/workspace.ts";

export type {
  BuilderConformanceOptions,
  BuilderConformanceSummary,
} from "./conformance/builder/support.ts";

/** Exercise the interface builder through the existing browser-gate lifecycle. */
export async function runBuilderConformance(
  options: BuilderConformanceOptions,
): Promise<BuilderConformanceSummary> {
  await attempt(options.failures, "storage reset", undefined, async () => {
    await resetBuilderStorage(options.page, options.origin);
  });
  const adaptive = await verifyAdaptiveMatrix(
    options.page,
    options.origin,
    options.failures,
  );
  const authoringChecks = await attempt(
    options.failures,
    "390px authoring journey",
    0,
    () => verifyAuthoringJourney(options.page, options.origin),
  );
  await attempt(
    options.failures,
    "interactive canvas witness",
    undefined,
    async () => {
      await withViewport(options.page, NARROW_VIEWPORT, async () => {
        await placeNamedComponent(options.page, "Button");
      });
    },
  );
  const shortcutIsolationChecks = await attempt(
    options.failures,
    "interactive shortcut isolation",
    0,
    () => verifyShortcutIsolation(options.page),
  );
  const keyboard = await attempt(
    options.failures,
    "keyboard traversal",
    { stops: 0, focusIndicators: 0 },
    async () =>
      await withViewport(options.page, WIDE_VIEWPORT, async () => {
        await loadBuilderPage(options.page, options.origin);
        return await verifyKeyboardTraversal(options.page, "wide builder");
      }),
  );
  const containedFailures = await verifyContainedFailures(
    options.browser,
    options.origin,
    options.failures,
  );
  const touchChecks = await attempt(
    options.failures,
    "touch workflow",
    0,
    () =>
      verifyTouchWorkflow(options.browser, options.origin, options.failures),
  );
  const forcedColourFocusChecks = await attempt(
    options.failures,
    "forced-colour focus",
    0,
    () =>
      verifyForcedColours(options.browser, options.origin, options.failures),
  );
  const screenshots = await attempt(
    options.failures,
    "review screenshots",
    [] as readonly string[],
    () =>
      captureBuilderScreenshots(
        options.page,
        options.origin,
        options.outputRoot,
      ),
  );

  return {
    adaptiveCases: adaptive.cases,
    paneTransitions: adaptive.paneTransitions,
    axeScans: adaptive.axeScans,
    keyboardStops: keyboard.stops,
    authoringChecks,
    shortcutIsolationChecks,
    touchChecks,
    containedFailures,
    forcedColourFocusChecks,
    screenshots,
  };
}
