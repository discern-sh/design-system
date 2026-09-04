import type { Locator, Page } from "playwright-core";
import { catalogueAppearanceOptions } from "../../../catalogue/shell/appearance-options.ts";
import {
  CATALOGUE_AXES_HYSTERESIS,
  serializeCatalogueAxes,
} from "../../../catalogue/shell/axes-state.ts";
import { terminalAppearanceScopeCases } from "../../../catalogue/pages/foundations/terminal-appearance-scopes.tsx";
import { registry } from "../../../catalogue/generated/registry.ts";
import type { RegistryEntry } from "../../../catalogue/generated/registry.ts";
import {
  catalogueComponentPath,
  catalogueRoutePaths,
  foundationsPaths,
} from "../../../catalogue/routes.ts";
import {
  APPEARANCE_ADMISSION_HUES,
  APPEARANCE_POLARITY_CROSSOVER_DARKNESS,
  appearanceProjection,
  defaultAppearance,
} from "../../../src/tokens/tokens.ts";
import { withViewport } from "../../viewport.ts";
import { parseComputedAppearanceColor } from "../appearance-projection.ts";
import {
  CATALOGUE_WIDE_VIEWPORT,
  eventually,
  invariant,
  loadCataloguePage,
  openCatalogueAppearanceAxes,
  setCatalogueAppearanceInput,
} from "./support.ts";

const semanticIds = ["default", "success", "warning", "danger"] as const;
const semanticNeighbourCentres = [28, 74, 82, 152] as const;
const generatedCliPreviewSelector =
  "[data-discern-component] .discern-catalogue-cli-preview";

/**
 * A whole generated population can need substantially longer than one control
 * interaction to commit on a loaded CI runner.
 */
export const GENERATED_CLI_POPULATION_SETTLE_TIMEOUT_MS = 30_000;

interface CrossSurfaceHueCase {
  readonly id: string;
  readonly input: string;
  readonly hue: number;
  readonly required: boolean;
}

function namedHueCase(hue: number): CrossSurfaceHueCase {
  const option = catalogueAppearanceOptions.find((candidate) =>
    candidate.hue === hue
  );
  if (option === undefined) {
    throw new TypeError("Catalogue has no named hue convenience at " + hue);
  }
  return { id: option.id, input: option.id, hue, required: true };
}

const semanticNeighbourHues = APPEARANCE_ADMISSION_HUES.filter((hue) =>
  semanticNeighbourCentres.some((centre) => Math.abs(hue - centre) === 0.25)
);

/** Named, arbitrary, and admission-owned semantic-neighbour review inputs. */
export const crossSurfaceHueCases: readonly CrossSurfaceHueCase[] = Object
  .freeze([
    { id: "numeric-0", input: "0", hue: 0, required: true },
    namedHueCase(120),
    namedHueCase(255),
    namedHueCase(335),
    {
      id: "fractional-137-5",
      input: "137.5",
      hue: 137.5,
      required: true,
    },
    ...semanticNeighbourHues.map((hue) => ({
      id: "semantic-neighbour-" + String(hue).replace(".", "-"),
      input: String(hue),
      hue,
      required: false,
    })),
  ]);

/** Evidence emitted by the one generated Web/CLI appearance contract. */
export interface CrossSurfaceAppearanceEvidence {
  readonly renderedComponents: number;
  readonly renderedExamples: number;
  readonly populationPostures: number;
  readonly appearanceCases: number;
  readonly semanticWitnessChecks: number;
  readonly identityChecks: number;
  readonly axisChecks: number;
  readonly localScopeChecks: number;
}

function equalValues(
  actual: readonly string[],
  expected: readonly string[],
  label: string,
): void {
  const sortedActual = [...actual].toSorted();
  const sortedExpected = [...expected].toSorted();
  invariant(
    JSON.stringify(sortedActual) === JSON.stringify(sortedExpected),
    label + ": expected " + JSON.stringify(sortedExpected) + ", got " +
      JSON.stringify(sortedActual),
  );
}

function appearanceUrl(
  path: string,
  origin: string,
  options: {
    readonly theme: "light" | "dark" | "system";
    readonly accent: string;
    readonly field: string;
    readonly surface?: "web" | "cli";
    readonly view?: "all";
    readonly example?: string;
  },
): URL {
  const url = new URL(path, origin);
  url.searchParams.set("theme", options.theme);
  url.searchParams.set("accent", options.accent);
  url.searchParams.set("field", options.field);
  if (options.surface === "cli") url.searchParams.set("surface", "cli");
  if (options.view === "all") url.searchParams.set("view", "all");
  if (options.example !== undefined) {
    url.searchParams.set("example", options.example);
  }
  return url;
}

async function loadConformanceSurface(page: Page, url: URL): Promise<void> {
  url.searchParams.set("conformance", "1");
  await page.goto(url.href, { waitUntil: "networkidle" });
  await page.locator('[data-discern-conformance-ready="true"]').waitFor();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

function fieldAt(
  darkness: number,
  overrides: Partial<typeof defaultAppearance> = {},
): string {
  return serializeCatalogueAxes({
    ...defaultAppearance,
    darkness,
    ...overrides,
  });
}

function renderedCliIdentities(): readonly string[] {
  return registry.flatMap((entry) =>
    entry.cli.stance === "rendered"
      ? entry.cli.examples.map((example) => entry.meta.slug + "/" + example.id)
      : []
  );
}

async function cliIdentitySnapshot(page: Page): Promise<
  readonly { readonly id: string; readonly text: string }[]
> {
  return await page.locator(
    "[data-discern-component] [data-discern-cli-example-state]",
  ).evaluateAll((nodes) =>
    nodes.map((node) => {
      const component = node.closest<HTMLElement>(
        "[data-discern-component]",
      )?.dataset.discernComponent ?? "missing";
      const example = node.getAttribute("data-discern-cli-example-state") ??
        "missing";
      return {
        id: component + "/" + example,
        text: node.textContent ?? "",
      };
    })
  );
}

/** Wait in Chromium for every generated CLI preview to commit one ground. */
export async function waitForGeneratedCliGround(
  page: Page,
  expectedExamples: number,
  ground: "light" | "dark",
): Promise<void> {
  const failure = `System ${ground} preference did not ${
    ground === "light" ? "reach" : "re-render"
  } the generated CLI population`;
  try {
    await page.waitForFunction(
      ({ expectedExamples, ground, selector }) => {
        const previews = document.querySelectorAll(selector);
        return previews.length === expectedExamples &&
          [...previews].every((preview) =>
            preview.getAttribute("data-discern-terminal-ground") === ground
          );
      },
      {
        expectedExamples,
        ground,
        selector: generatedCliPreviewSelector,
      },
      {
        polling: "raf",
        timeout: GENERATED_CLI_POPULATION_SETTLE_TIMEOUT_MS,
      },
    );
  } catch (error) {
    const observed = await page.locator(generatedCliPreviewSelector)
      .evaluateAll((nodes) => {
        const grounds: Record<string, number> = {};
        for (const node of nodes) {
          const value = node.getAttribute("data-discern-terminal-ground") ??
            "missing";
          grounds[value] = (grounds[value] ?? 0) + 1;
        }
        return { count: nodes.length, grounds };
      });
    throw new Error(
      `${failure}; expected ${expectedExamples}, observed ${observed.count} ` +
        `(${JSON.stringify(observed.grounds)})`,
      { cause: error },
    );
  }
}

async function verifyCliProjectionStyles(page: Page): Promise<void> {
  const style = await page.locator(".discern-catalogue-cli-output").first()
    .evaluate((node) => {
      const computed = getComputedStyle(node);
      return {
        fontFamily: computed.fontFamily,
        fontFeatureSettings: computed.fontFeatureSettings,
        fontVariantLigatures: computed.fontVariantLigatures,
        padding: computed.padding,
        whiteSpace: computed.whiteSpace,
      };
    });
  invariant(style.padding === "0px", "CLI projection must remain unpadded");
  invariant(
    style.fontFamily.includes("monospace"),
    "CLI projection must use a monospace cell font",
  );
  invariant(
    style.fontFeatureSettings.includes('"liga" 0') &&
      style.fontFeatureSettings.includes('"calt" 0') &&
      style.fontVariantLigatures === "none",
    "CLI projection must disable shaping that moves terminal cells",
  );
  invariant(
    style.whiteSpace === "pre",
    "CLI projection must preserve terminal whitespace",
  );
}

async function verifyGeneratedCliPopulation(
  page: Page,
  origin: string,
): Promise<{
  readonly components: number;
  readonly examples: number;
  readonly postures: number;
}> {
  const rendered = registry.filter(({ cli }) => cli.stance === "rendered");
  const expectedIdentities = renderedCliIdentities();
  invariant(
    rendered.length > 0 && expectedIdentities.length > rendered.length,
    "Generated CLI appearance population is unexpectedly empty",
  );
  const postures = [
    {
      id: "mono-light",
      theme: "light",
      accent: undefined,
      field: fieldAt(0),
    },
    {
      id: "accent-fractional-light",
      theme: "light",
      accent: 137.5,
      field: fieldAt(0),
    },
    {
      id: "accent-fractional-dark",
      theme: "dark",
      accent: 137.5,
      field: fieldAt(1),
    },
  ] as const;
  let baseline: ReadonlyMap<string, string> | undefined;
  for (const posture of postures) {
    const url = appearanceUrl(catalogueRoutePaths.overview, origin, {
      theme: posture.theme,
      accent: posture.accent === undefined ? "none" : String(posture.accent),
      field: posture.field,
      surface: "cli",
    });
    await loadConformanceSurface(page, url);
    const snapshot = await cliIdentitySnapshot(page);
    equalValues(
      snapshot.map(({ id }) => id),
      expectedIdentities,
      posture.id + " generated CLI identities",
    );
    const attributes = await page.locator(generatedCliPreviewSelector)
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          appearance: node.getAttribute("data-discern-terminal-appearance"),
          ground: node.getAttribute("data-discern-terminal-ground"),
          hue: node.getAttribute("data-discern-terminal-accent-hue"),
        }))
      );
    invariant(
      attributes.length === expectedIdentities.length &&
        attributes.every(({ appearance, ground, hue }) =>
          appearance === appearanceProjection(posture) &&
          ground === posture.theme &&
          (posture.accent === undefined
            ? hue === null
            : Number(hue) === posture.accent)
        ),
      posture.id + " did not reach every generated CLI preview",
    );
    const text = new Map(snapshot.map(({ id, text }) => [id, text]));
    if (baseline === undefined) baseline = text;
    else {
      for (const [id, value] of baseline) {
        invariant(
          text.get(id) === value,
          posture.id + " changed semantic example text for " + id,
        );
      }
    }
  }
  await verifyCliProjectionStyles(page);

  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  const systemUrl = appearanceUrl(catalogueRoutePaths.overview, origin, {
    theme: "system",
    accent: "137.5",
    field: fieldAt(0),
    surface: "cli",
  });
  await loadConformanceSurface(page, systemUrl);
  await waitForGeneratedCliGround(page, expectedIdentities.length, "light");
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await waitForGeneratedCliGround(page, expectedIdentities.length, "dark");

  return {
    components: rendered.length,
    examples: expectedIdentities.length,
    postures: postures.length + 1,
  };
}

function semanticComponent(): RegistryEntry {
  const entry = registry.find((candidate) => {
    const cli = candidate.cli;
    if (cli.stance !== "rendered") return false;
    return semanticIds.every((id) =>
      candidate.canonicalExamples.some((example) =>
        example.id === id && example.surfaces.includes("web") &&
        example.surfaces.includes("cli")
      ) && cli.examples.some((example) => example.id === id)
    );
  });
  if (entry === undefined) {
    throw new TypeError(
      "Generated registry has no cross-surface accent/success/warning/danger Component",
    );
  }
  return entry;
}

function expectedSurfaceIds(
  entry: RegistryEntry,
  surface: "web" | "cli",
): readonly string[] {
  return entry.canonicalExamples.filter(({ surfaces }) =>
    surfaces.includes(surface)
  ).map(({ id }) => id);
}

async function actualSurfaceIds(
  page: Page,
  surface: "web" | "cli",
): Promise<readonly string[]> {
  const attribute = surface === "web"
    ? "data-discern-example-state"
    : "data-discern-cli-example-state";
  return await page.locator("[" + attribute + "]").evaluateAll(
    (nodes, name) => nodes.map((node) => node.getAttribute(name) ?? "missing"),
    attribute,
  );
}

async function semanticColours(
  page: Page,
  entry: RegistryEntry,
  surface: "web" | "cli",
): Promise<ReadonlyMap<string, string>> {
  const values = new Map<string, string>();
  for (const id of semanticIds) {
    const state = page.locator(
      surface === "web"
        ? '[data-discern-example-state="' + id + '"]'
        : '[data-discern-cli-example-state="' + id + '"]',
    );
    const target = surface === "web"
      ? state.locator(".discern-" + entry.meta.slug).first()
      : state.locator('code span[style*="color"]').first();
    invariant(
      await target.count() === 1 && (await target.textContent())?.trim() !== "",
      [entry.meta.slug, id, surface].join("/") +
        " lost its visible semantic witness",
    );
    values.set(
      id,
      await target.evaluate((node) => getComputedStyle(node).color),
    );
  }
  return values;
}

function assertColourPosture(
  colours: ReadonlyMap<string, string>,
  posture: "mono" | "accent",
  label: string,
): void {
  for (const id of semanticIds) {
    const value = colours.get(id);
    invariant(value !== undefined, label + "/" + id + " has no colour");
    const parsed = parseComputedAppearanceColor(value);
    const chroma = Math.hypot(parsed.color.a, parsed.color.b);
    invariant(
      posture === "mono" ? chroma < 0.004 : chroma > 0.015,
      label + "/" + id + " has unexpected " + posture + " chroma " +
        chroma.toFixed(4) + " from " + value,
    );
  }
}

async function assertTerminalAttributes(
  page: Page,
  accent: number | undefined,
  ground: "light" | "dark",
): Promise<void> {
  const attributes = await page.locator(
    ".discern-catalogue-cli-preview",
  ).evaluateAll((nodes) =>
    nodes.map((node) => ({
      appearance: node.getAttribute("data-discern-terminal-appearance"),
      ground: node.getAttribute("data-discern-terminal-ground"),
      hue: node.getAttribute("data-discern-terminal-accent-hue"),
    }))
  );
  invariant(
    attributes.length > 0 &&
      attributes.every((value) =>
        value.appearance === appearanceProjection({ accent }) &&
        value.ground === ground &&
        (accent === undefined
          ? value.hue === null
          : Number(value.hue) === accent)
      ),
    [ground, accent ?? "mono"].join(" ") +
      " did not reach every active CLI preview",
  );
}

async function switchSurface(
  page: Page,
  surface: "Web" | "CLI",
): Promise<void> {
  await page.getByRole("button", { name: surface, exact: true }).click();
  const attribute = surface === "Web"
    ? "data-discern-example-state"
    : "data-discern-cli-example-state";
  await page.locator("[" + attribute + "]").first().waitFor();
}

async function verifySemanticMatrix(
  page: Page,
  origin: string,
): Promise<{
  readonly cases: number;
  readonly witnessChecks: number;
  readonly identityChecks: number;
}> {
  const entry = semanticComponent();
  const path = catalogueComponentPath(entry.meta.slug);
  let cases = 0;
  let witnessChecks = 0;
  let identityChecks = 0;

  for (const theme of ["light", "dark"] as const) {
    const fieldUrl = appearanceUrl(path, origin, {
      theme,
      accent: "none",
      field: fieldAt(theme === "light" ? 0 : 1),
      surface: "cli",
      view: "all",
    });
    await loadCataloguePage(page, fieldUrl.href);
    equalValues(
      await actualSurfaceIds(page, "cli"),
      expectedSurfaceIds(entry, "cli"),
      theme + " monochrome CLI semantic identities",
    );
    await assertTerminalAttributes(page, undefined, theme);
    assertColourPosture(
      await semanticColours(page, entry, "cli"),
      "mono",
      theme + "/CLI",
    );
    await switchSurface(page, "Web");
    equalValues(
      await actualSurfaceIds(page, "web"),
      expectedSurfaceIds(entry, "web"),
      theme + " monochrome Web semantic identities",
    );
    assertColourPosture(
      await semanticColours(page, entry, "web"),
      "mono",
      theme + "/Web",
    );
    cases += 1;
    witnessChecks += semanticIds.length * 2;
    identityChecks += 2;
  }

  for (const theme of ["light", "dark"] as const) {
    const webRequiredSignatures = new Set<string>();
    const cliRequiredSignatures = new Set<string>();
    for (const hueCase of crossSurfaceHueCases) {
      const url = appearanceUrl(path, origin, {
        theme,
        accent: hueCase.input,
        field: fieldAt(theme === "light" ? 0 : 1),
        surface: "cli",
        view: "all",
      });
      await loadCataloguePage(page, url.href);
      await eventually(
        () =>
          Promise.resolve(
            new URL(page.url()).searchParams.get("accent") ===
              String(hueCase.hue),
          ),
        hueCase.id + " did not canonicalise to numeric hue " + hueCase.hue,
      );
      equalValues(
        await actualSurfaceIds(page, "cli"),
        expectedSurfaceIds(entry, "cli"),
        [theme, hueCase.id, "CLI semantic identities"].join("/"),
      );
      await assertTerminalAttributes(page, hueCase.hue, theme);
      const cliColours = await semanticColours(page, entry, "cli");
      assertColourPosture(
        cliColours,
        "accent",
        [theme, hueCase.id, "CLI"].join("/"),
      );
      await switchSurface(page, "Web");
      equalValues(
        await actualSurfaceIds(page, "web"),
        expectedSurfaceIds(entry, "web"),
        [theme, hueCase.id, "Web semantic identities"].join("/"),
      );
      const rootHue = await page.locator(".discern-catalogue-shell").evaluate(
        (node) =>
          getComputedStyle(node).getPropertyValue("--discern-accent-hue")
            .trim(),
      );
      invariant(
        Number(rootHue) === hueCase.hue,
        [theme, hueCase.id, "Web received hue " + rootHue].join("/"),
      );
      const webColours = await semanticColours(page, entry, "web");
      assertColourPosture(
        webColours,
        "accent",
        [theme, hueCase.id, "Web"].join("/"),
      );
      if (hueCase.required) {
        webRequiredSignatures.add(webColours.get("default") ?? "missing");
        cliRequiredSignatures.add(cliColours.get("default") ?? "missing");
      }
      cases += 1;
      witnessChecks += semanticIds.length * 2;
      identityChecks += 2;
    }
    const requiredCount = crossSurfaceHueCases.filter(({ required }) =>
      required
    ).length;
    invariant(
      webRequiredSignatures.size === requiredCount &&
        cliRequiredSignatures.size === requiredCount,
      theme + " Web or CLI collapsed a required numeric hue: " +
        JSON.stringify({
          web: [...webRequiredSignatures],
          cli: [...cliRequiredSignatures],
        }),
    );
  }

  return { cases, witnessChecks, identityChecks };
}

async function cliState(page: Page): Promise<{
  readonly appearance: string | null;
  readonly ground: string | null;
  readonly hue: string | null;
  readonly html: string;
  readonly text: string;
}> {
  const preview = page.locator(".discern-catalogue-cli-preview").first();
  return await preview.evaluate((node) => ({
    appearance: node.getAttribute("data-discern-terminal-appearance"),
    ground: node.getAttribute("data-discern-terminal-ground"),
    hue: node.getAttribute("data-discern-terminal-accent-hue"),
    html: node.querySelector("code")?.innerHTML ?? "",
    text: node.querySelector("code")?.textContent ?? "",
  }));
}

function fieldAxis(page: Page, axis: string): Locator {
  return page.locator(
    '.discern-catalogue-appearance [data-discern-axis="' + axis +
      '"] input',
  );
}

async function verifyInteractiveAxesAndIdentity(
  page: Page,
  origin: string,
): Promise<{ readonly axisChecks: number; readonly identityChecks: number }> {
  const entry = semanticComponent();
  const example = semanticIds[0];
  const url = appearanceUrl(catalogueComponentPath(entry.meta.slug), origin, {
    theme: "light",
    accent: "137.5",
    field: fieldAt(0.25, {
      structure: 0.35,
      emphasis: 0.65,
      density: 0.8,
    }),
    example,
  });
  await loadCataloguePage(page, url.href);
  const webState = page.locator(
    '[data-discern-example-state="' + example + '"] .discern-' +
      entry.meta.slug,
  );
  const quietWeb = await webState.evaluate((node) =>
    getComputedStyle(node).color
  );
  await openCatalogueAppearanceAxes(page);
  await setCatalogueAppearanceInput(fieldAxis(page, "emphasis"), 1.35);
  const vividWeb = await webState.evaluate((node) =>
    getComputedStyle(node).color
  );
  invariant(
    quietWeb !== vividWeb,
    "Accent Web role did not move continuously with Emphasis",
  );

  await switchSurface(page, "CLI");
  const vividCli = await cliState(page);
  invariant(
    vividCli.appearance === "accent" && vividCli.hue === "137.5" &&
      vividCli.ground === "light" && vividCli.text.trim() !== "",
    "Signed light posture did not reach CLI: " + JSON.stringify(vividCli),
  );
  await setCatalogueAppearanceInput(fieldAxis(page, "emphasis"), 0.65);
  const quietCli = await cliState(page);
  invariant(
    quietCli.html === vividCli.html,
    "CLI incorrectly pretended to render continuous Emphasis",
  );

  const withinHysteresis = Number(
    APPEARANCE_POLARITY_CROSSOVER_DARKNESS.toFixed(2),
  );
  const beyondDarkHysteresis = Math.ceil(
    (APPEARANCE_POLARITY_CROSSOVER_DARKNESS + CATALOGUE_AXES_HYSTERESIS +
      0.001) *
      100,
  ) / 100;
  await setCatalogueAppearanceInput(
    fieldAxis(page, "darkness"),
    withinHysteresis,
  );
  invariant(
    (await cliState(page)).ground === "light",
    "Light-side terminal ground did not hold inside the hysteresis band",
  );
  await setCatalogueAppearanceInput(
    fieldAxis(page, "darkness"),
    beyondDarkHysteresis,
  );
  const darkCli = await cliState(page);
  invariant(
    darkCli.ground === "dark" && darkCli.hue === "137.5" &&
      darkCli.html !== quietCli.html,
    "Crossing field polarity did not select dark CLI at the same hue",
  );
  await setCatalogueAppearanceInput(
    fieldAxis(page, "darkness"),
    withinHysteresis,
  );
  invariant(
    (await cliState(page)).ground === "dark",
    "Dark-side terminal ground did not hold inside the hysteresis band",
  );

  const palette = page.getByRole("combobox", { name: "Accent" });
  const originalText = (await cliState(page)).text;
  await palette.selectOption("none");
  await eventually(
    async () => (await cliState(page)).appearance === "mono",
    "Accent to monochrome did not reach the CLI Component",
  );
  invariant(
    (await cliState(page)).text === originalText,
    "Monochrome changed CLI example identity",
  );
  await palette.selectOption("custom");
  await eventually(
    async () => (await cliState(page)).appearance === "accent",
    "Monochrome to Accent did not reach the CLI Component",
  );
  await palette.selectOption("none");
  await palette.selectOption("custom");
  await palette.selectOption("none");
  invariant(
    (await cliState(page)).appearance === "mono" &&
      (await cliState(page)).text === originalText,
    "Monochrome to Accent to monochrome changed semantic CLI identity",
  );
  await palette.selectOption("custom");
  const hue = page.getByRole("spinbutton", { name: "Hue" });
  await setCatalogueAppearanceInput(hue, 245);
  const accent245 = await cliState(page);
  await setCatalogueAppearanceInput(hue, 335);
  const accent335 = await cliState(page);
  invariant(
    accent245.hue === "245" && accent335.hue === "335" &&
      accent245.html !== accent335.html && accent245.text === accent335.text,
    "Accent hue A to Accent hue B lost hue or example identity",
  );

  await setCatalogueAppearanceInput(fieldAxis(page, "darkness"), 0.75);
  await setCatalogueAppearanceInput(fieldAxis(page, "structure"), 1.4);
  await setCatalogueAppearanceInput(fieldAxis(page, "emphasis"), 1.35);
  await setCatalogueAppearanceInput(fieldAxis(page, "density"), 1.2);
  const signedDark = await cliState(page);
  invariant(
    signedDark.ground === "dark" && signedDark.hue === "335" &&
      new URL(page.url()).searchParams.get("field") ===
        fieldAt(0.75, {
          structure: 1.4,
          emphasis: 1.35,
          density: 1.2,
        }),
    "Signed dark 0A posture lost its terminal pole, hue, or axes",
  );

  return { axisChecks: 7, identityChecks: 5 };
}

async function verifyLocalScopes(
  page: Page,
  origin: string,
): Promise<number> {
  const url = appearanceUrl(foundationsPaths.appearance, origin, {
    theme: "dark",
    accent: "335",
    field: fieldAt(0.75, {
      structure: 1.4,
      emphasis: 1.35,
      density: 1.2,
    }),
  });
  url.hash = "terminal-appearance-scopes";
  await loadCataloguePage(page, url.href);
  const webIds = await page.locator("[data-discern-scope-demo]").evaluateAll(
    (nodes) =>
      nodes.map((node) => node.getAttribute("data-discern-scope-demo") ?? ""),
  );
  const terminalIds = await page.locator(
    "[data-discern-terminal-scope-demo]",
  ).evaluateAll((nodes) =>
    nodes.map((node) =>
      node.getAttribute("data-discern-terminal-scope-demo") ?? ""
    )
  );
  const expected = terminalAppearanceScopeCases.map(({ id }) => id);
  equalValues(webIds, expected, "browser appearance scopes");
  equalValues(terminalIds, expected, "terminal appearance scopes");

  for (const definition of terminalAppearanceScopeCases) {
    const card = page.locator(
      '[data-discern-terminal-scope-demo="' + definition.id + '"]',
    );
    const state = await card.evaluate((node) => {
      const previews = [...node.querySelectorAll<HTMLElement>(
        ".discern-catalogue-cli-preview",
      )];
      return {
        local: node.getAttribute("data-discern-terminal-scope-local"),
        localHue: node.getAttribute("data-discern-terminal-scope-local-hue"),
        parent: node.getAttribute("data-discern-terminal-scope-parent"),
        parentHue: node.getAttribute("data-discern-terminal-scope-parent-hue"),
        presentations: previews.map((preview) => {
          const coloured = preview.querySelector<HTMLElement>(
            'code span[style*="color"]',
          );
          return {
            appearance: preview.getAttribute(
              "data-discern-terminal-appearance",
            ),
            ground: preview.getAttribute("data-discern-terminal-ground"),
            hue: preview.getAttribute("data-discern-terminal-accent-hue"),
            text: preview.querySelector("code")?.textContent ?? "",
            colour: coloured === null ? "" : getComputedStyle(coloured).color,
          };
        }),
      };
    });
    const parentAccent = definition.parentAppearance.accent;
    const localAccent = definition.localAppearance.accent;
    const parentHue = parentAccent === undefined ? null : String(parentAccent);
    const localHue = localAccent === undefined ? null : String(localAccent);
    invariant(
      state.parent === appearanceProjection(definition.parentAppearance) &&
        state.parentHue === parentHue &&
        state.local === appearanceProjection(definition.localAppearance) &&
        state.localHue === localHue && state.presentations.length === 2 &&
        state.presentations.every(({ ground }) => ground === "dark") &&
        state.presentations[0]?.text === state.presentations[1]?.text &&
        state.presentations[0]?.colour !== state.presentations[1]?.colour,
      definition.id + " terminal local scope diverged: " +
        JSON.stringify(state),
    );
  }
  return terminalAppearanceScopeCases.length;
}

/** Prove one generated appearance identity reaches Web and CLI use sites. */
export async function verifyCrossSurfaceAppearanceCatalogue(
  page: Page,
  origin: string,
): Promise<CrossSurfaceAppearanceEvidence> {
  return await withViewport(page, CATALOGUE_WIDE_VIEWPORT, async () => {
    const population = await verifyGeneratedCliPopulation(page, origin);
    const semantics = await verifySemanticMatrix(page, origin);
    const interactive = await verifyInteractiveAxesAndIdentity(page, origin);
    const localScopeChecks = await verifyLocalScopes(page, origin);
    return {
      renderedComponents: population.components,
      renderedExamples: population.examples,
      populationPostures: population.postures,
      appearanceCases: semantics.cases,
      semanticWitnessChecks: semantics.witnessChecks,
      identityChecks: semantics.identityChecks + interactive.identityChecks,
      axisChecks: interactive.axisChecks,
      localScopeChecks,
    };
  });
}
