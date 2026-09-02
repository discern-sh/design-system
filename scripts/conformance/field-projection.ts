import { toFileUrl } from "@std/path";
import type { Page } from "playwright-core";
import {
  decodeSrgbChannel,
  linearRgbToOklab,
  type OklabColor,
  oklabDistance,
} from "../../src/internal/oklch.ts";
import { emitDesignSystemRuntime } from "../../src/runtime.ts";
import {
  defaultFieldPoint,
  evaluateField,
  FIELD_POLARITY_CROSSOVER_DARKNESS,
  fieldColorRoleLaws,
  type FieldPoint,
} from "../../src/tokens/field.ts";
import { FIELD_LIVE_CSS_SUPPORTS } from "../../src/tokens/field-css.ts";
import { baseTokens, themeTokens } from "../../src/tokens/tokens.ts";

const OKLAB_TOLERANCE = 0.006;
const ALPHA_TOLERANCE = 1 / 255 + 0.0005;
const SPACING_TOLERANCE_PX = 0.02;

/** Numeric colour read from a browser computed-style serialization. */
export interface ProjectionColor {
  readonly color: OklabColor;
  readonly alpha: number;
}

interface FieldProjectionSample {
  readonly label: string;
  readonly point: FieldPoint;
  readonly theme: "light" | "dark" | "system" | null;
  readonly media: "light" | "dark";
  readonly scheme: "light" | "dark";
  readonly authoredPoint: boolean;
  readonly poleMode?: "light" | "dark";
}

/** Evidence counts returned by the browser field-projection guard. */
export interface FieldProjectionEvidence {
  readonly points: number;
  readonly roleChecks: number;
  readonly poleChecks: number;
  readonly spacingChecks: number;
  readonly oklabTolerance: number;
}

const defaultPoint = (
  overrides: Partial<FieldPoint> = {},
): FieldPoint => ({ ...defaultFieldPoint, ...overrides });

const samples: readonly FieldProjectionSample[] = [
  {
    label: "explicit light pole",
    point: defaultPoint({ darkness: 0 }),
    theme: "light",
    media: "dark",
    scheme: "light",
    authoredPoint: false,
    poleMode: "light",
  },
  {
    label: "0A darkness 0.25",
    point: defaultPoint({
      darkness: 0.25,
      structure: 0.35,
      emphasis: 0.65,
      density: 0.8,
    }),
    theme: null,
    media: "light",
    scheme: "light",
    authoredPoint: true,
  },
  {
    label: "polarity crossover light neighbour",
    point: defaultPoint({
      darkness: FIELD_POLARITY_CROSSOVER_DARKNESS - 0.0001,
    }),
    theme: null,
    media: "light",
    scheme: "light",
    authoredPoint: true,
  },
  {
    label: "polarity crossover dark neighbour",
    point: defaultPoint({
      darkness: FIELD_POLARITY_CROSSOVER_DARKNESS + 0.0001,
    }),
    theme: null,
    media: "light",
    scheme: "dark",
    authoredPoint: true,
  },
  {
    label: "0A darkness 0.5",
    point: defaultPoint({ darkness: 0.5 }),
    theme: null,
    media: "light",
    scheme: "dark",
    authoredPoint: true,
  },
  {
    label: "0A darkness 0.75",
    point: defaultPoint({
      darkness: 0.75,
      structure: 1.4,
      emphasis: 1.35,
      density: 1.2,
    }),
    theme: null,
    media: "light",
    scheme: "dark",
    authoredPoint: true,
  },
  {
    label: "explicit dark pole",
    point: defaultPoint({ darkness: 1 }),
    theme: "dark",
    media: "light",
    scheme: "dark",
    authoredPoint: false,
    poleMode: "dark",
  },
  {
    label: "system dark pole",
    point: defaultPoint({ darkness: 1 }),
    theme: "system",
    media: "dark",
    scheme: "dark",
    authoredPoint: false,
    poleMode: "dark",
  },
  {
    label: "unattributed system dark pole",
    point: defaultPoint({ darkness: 1 }),
    theme: null,
    media: "dark",
    scheme: "dark",
    authoredPoint: false,
    poleMode: "dark",
  },
];

function parseOklch(value: string): ProjectionColor {
  const match = value.match(
    /^oklch\(\s*([+-]?[\d.]+)%\s+([+-]?[\d.]+)\s+([+-]?[\d.]+)(?:\s+\/\s+([+-]?[\d.]+))?\s*\)$/u,
  );
  if (match === null) {
    throw new TypeError(`Field projection expected OKLCH, received ${value}`);
  }
  const lightness = Number(match[1]) / 100;
  const chroma = Number(match[2]);
  const hue = Number(match[3]) * Math.PI / 180;
  return {
    color: {
      lightness,
      a: chroma * Math.cos(hue),
      b: chroma * Math.sin(hue),
    },
    alpha: match[4] === undefined ? 1 : Number(match[4]),
  };
}

function numericChannel(value: string, percentScale = 1): number {
  return value.endsWith("%")
    ? Number(value.slice(0, -1)) / 100 * percentScale
    : Number(value);
}

function alphaChannel(value: string | undefined): number {
  return value === undefined ? 1 : numericChannel(value);
}

/** Parse the CSSOM colour forms emitted by the conformance browser. */
export function parseComputedFieldColor(value: string): ProjectionColor {
  const oklch = value.match(
    /^oklch\(\s*([+-]?[\d.]+%?)\s+([+-]?[\d.]+)\s+([+-]?[\d.]+)(?:deg)?(?:\s+\/\s+([+-]?[\d.]+%?))?\s*\)$/u,
  );
  if (oklch !== null) {
    const lightness = numericChannel(oklch[1] ?? "0");
    const chroma = Number(oklch[2]);
    const hue = Number(oklch[3]) * Math.PI / 180;
    return {
      color: {
        lightness,
        a: chroma * Math.cos(hue),
        b: chroma * Math.sin(hue),
      },
      alpha: alphaChannel(oklch[4]),
    };
  }
  const oklab = value.match(
    /^oklab\(\s*([+-]?[\d.]+%?)\s+([+-]?[\d.]+)\s+([+-]?[\d.]+)(?:\s+\/\s+([+-]?[\d.]+%?))?\s*\)$/u,
  );
  if (oklab !== null) {
    return {
      color: {
        lightness: numericChannel(oklab[1] ?? "0"),
        a: Number(oklab[2]),
        b: Number(oklab[3]),
      },
      alpha: alphaChannel(oklab[4]),
    };
  }
  const srgb = value.match(
    /^color\(srgb\s+([+-]?[\d.]+)\s+([+-]?[\d.]+)\s+([+-]?[\d.]+)(?:\s+\/\s+([+-]?[\d.]+%?))?\s*\)$/u,
  );
  if (srgb !== null) {
    return {
      color: linearRgbToOklab(
        decodeSrgbChannel(Number(srgb[1])),
        decodeSrgbChannel(Number(srgb[2])),
        decodeSrgbChannel(Number(srgb[3])),
      ),
      alpha: alphaChannel(srgb[4]),
    };
  }
  const rgb = value.match(
    /^rgba?\(\s*([+-]?[\d.]+%?)\s*[, ]\s*([+-]?[\d.]+%?)\s*[, ]\s*([+-]?[\d.]+%?)(?:\s*[,/]\s*([+-]?[\d.]+%?))?\s*\)$/u,
  );
  if (rgb !== null) {
    const gamma = (channel: string | undefined): number =>
      channel?.endsWith("%") ? numericChannel(channel) : Number(channel) / 255;
    return {
      color: linearRgbToOklab(
        decodeSrgbChannel(gamma(rgb[1])),
        decodeSrgbChannel(gamma(rgb[2])),
        decodeSrgbChannel(gamma(rgb[3])),
      ),
      alpha: alphaChannel(rgb[4]),
    };
  }
  throw new TypeError(`Unsupported computed colour serialization: ${value}`);
}

function colorMismatch(
  expected: ProjectionColor,
  actual: ProjectionColor,
): { readonly distance: number; readonly alphaDelta: number } | undefined {
  const alphaDelta = Math.abs(expected.alpha - actual.alpha);
  const distance = expected.alpha <= ALPHA_TOLERANCE &&
      actual.alpha <= ALPHA_TOLERANCE
    ? 0
    : oklabDistance(expected.color, actual.color);
  return distance > OKLAB_TOLERANCE || alphaDelta > ALPHA_TOLERANCE
    ? { distance, alphaDelta }
    : undefined;
}

function requiredPoleValue(
  name: string,
  mode: "light" | "dark",
): string {
  const token = themeTokens.find((candidate) => candidate.name === name);
  if (token === undefined) throw new TypeError(`Missing pole Token ${name}`);
  return token[mode];
}

/**
 * Compare every browser-derived colour role with the TypeScript evaluator at
 * the signed-off samples and crossover neighbours. Browser RGBA quantization
 * sets the stated 0.006 OKLab and one-channel alpha tolerances.
 */
export async function verifyFieldProjection(
  page: Page,
): Promise<FieldProjectionEvidence> {
  const output = await Deno.makeTempDir();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["kicker"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    await page.setContent(
      '<main id="discern-field-probe" data-discern-root></main>',
    );
    await page.addStyleTag({ content: css });

    const registrationEvidence = await page.evaluate((supportsCondition) => ({
      supportsLiveProjection: CSS.supports(supportsCondition),
      registrations: [...document.styleSheets].flatMap((sheet) =>
        [...sheet.cssRules].flatMap((rule) => {
          const match = rule.cssText.match(/^@property\s+(--discern-[a-z-]+)/u);
          return match?.[1] === undefined ? [] : [match[1]];
        })
      ),
    }), FIELD_LIVE_CSS_SUPPORTS);
    if (!registrationEvidence.supportsLiveProjection) {
      throw new Error(
        `Conformance browser does not support the live field query ${FIELD_LIVE_CSS_SUPPORTS}`,
      );
    }
    const expectedRegistrations = [
      "--discern-darkness",
      "--discern-structure",
      "--discern-emphasis",
      "--discern-density",
    ];
    if (
      registrationEvidence.registrations.join("\n") !==
        expectedRegistrations.join("\n")
    ) {
      throw new Error(
        `Field axis registrations differ: expected ${
          expectedRegistrations.join(", ")
        }; received ${registrationEvidence.registrations.join(", ")}`,
      );
    }

    const roleNames = fieldColorRoleLaws.map(({ name }) => name);
    const spacingTokens = baseTokens.filter(({ name }) =>
      name.startsWith("--discern-space-")
    );
    const failures: string[] = [];
    let roleChecks = 0;
    let poleChecks = 0;
    let spacingChecks = 0;

    for (const sample of samples) {
      await page.emulateMedia({ colorScheme: sample.media });
      const observed = await page.evaluate(
        ({ roleNames, sample, spacingNames }) => {
          const root = document.getElementById("discern-field-probe");
          if (!(root instanceof HTMLElement)) {
            throw new Error("Missing field probe root");
          }
          root.removeAttribute("data-discern-theme");
          root.removeAttribute("style");
          if (sample.theme !== null) {
            root.setAttribute("data-discern-theme", sample.theme);
          }
          if (sample.authoredPoint) {
            for (const [axis, value] of Object.entries(sample.point)) {
              root.style.setProperty(`--discern-${axis}`, String(value));
            }
            root.style.colorScheme = sample.scheme;
          }

          const probe = document.createElement("span");
          root.append(probe);
          const roles = roleNames.map((name) => {
            probe.style.color = `var(${name})`;
            const computed = getComputedStyle(probe).color;
            return {
              name,
              computed,
            };
          });
          probe.remove();

          const spacingProbe = document.createElement("span");
          spacingProbe.style.cssText =
            "position:absolute;display:block;box-sizing:border-box";
          root.append(spacingProbe);
          const spacing = spacingNames.map((name) => {
            spacingProbe.style.width = `var(${name})`;
            return { name, pixels: spacingProbe.getBoundingClientRect().width };
          });
          spacingProbe.remove();

          const rootStyle = getComputedStyle(root);
          return {
            axes: Object.fromEntries(
              ["darkness", "structure", "emphasis", "density"].map((axis) => [
                axis,
                Number(rootStyle.getPropertyValue(`--discern-${axis}`)),
              ]),
            ),
            colorScheme: rootStyle.colorScheme,
            roles,
            spacing,
          };
        },
        {
          roleNames,
          sample,
          spacingNames: spacingTokens.map(({ name }) => name),
        },
      );

      for (const [axis, expected] of Object.entries(sample.point)) {
        const actual = observed.axes[axis];
        if (actual === undefined || Math.abs(actual - expected) > 0.0000001) {
          failures.push(
            `${sample.label}: --discern-${axis} expected ${expected}, received ${actual}`,
          );
        }
      }
      if (observed.colorScheme !== sample.scheme) {
        failures.push(
          `${sample.label}: color-scheme expected ${sample.scheme}, received ${observed.colorScheme}`,
        );
      }

      const expectedRoles = evaluateField(sample.point);
      for (const value of observed.roles) {
        const expectedValue = expectedRoles[value.name];
        if (expectedValue === undefined) {
          failures.push(`${sample.label}: evaluator omitted ${value.name}`);
          continue;
        }
        const mismatch = colorMismatch(
          parseOklch(expectedValue),
          parseComputedFieldColor(value.computed),
        );
        roleChecks += 1;
        if (mismatch !== undefined) {
          failures.push(
            `${sample.label}: ${value.name} expected ${expectedValue}, computed ${value.computed}; OKLab delta ${
              mismatch.distance.toFixed(6)
            }, alpha delta ${mismatch.alphaDelta.toFixed(6)}`,
          );
        }
        if (sample.poleMode !== undefined) {
          const poleMismatch = colorMismatch(
            parseOklch(requiredPoleValue(value.name, sample.poleMode)),
            parseComputedFieldColor(value.computed),
          );
          poleChecks += 1;
          if (poleMismatch !== undefined) {
            failures.push(
              `${sample.label}: ${value.name} differs from ${sample.poleMode} pair emission; OKLab delta ${
                poleMismatch.distance.toFixed(6)
              }, alpha delta ${poleMismatch.alphaDelta.toFixed(6)}`,
            );
          }
        }
      }

      for (const value of observed.spacing) {
        const token = spacingTokens.find(({ name }) => name === value.name);
        if (token === undefined) {
          failures.push(`${sample.label}: unknown spacing Token ${value.name}`);
          continue;
        }
        const expected = Number.parseFloat(token.value) * sample.point.density;
        spacingChecks += 1;
        if (Math.abs(value.pixels - expected) > SPACING_TOLERANCE_PX) {
          failures.push(
            `${sample.label}: ${value.name} expected ${expected}px, measured ${value.pixels}px`,
          );
        }
      }
    }

    if (failures.length > 0) {
      const shown = failures.slice(0, 24);
      const remainder = failures.length - shown.length;
      throw new Error(
        `Field CSS projection mismatch:\n- ${shown.join("\n- ")}${
          remainder > 0 ? `\n- … ${remainder} more` : ""
        }`,
      );
    }
    return {
      points: samples.length,
      roleChecks,
      poleChecks,
      spacingChecks,
      oklabTolerance: OKLAB_TOLERANCE,
    };
  } finally {
    await Deno.remove(output, { recursive: true });
  }
}
