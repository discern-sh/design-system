/**
 * Project the package's Token authorities into the artifact's `tokens.json`:
 * every colour role at both poles and under the default Accent projection,
 * the type roles, and the numeric scales, each carrying its source description
 * as its usage note. Values the artifact grammar cannot read (aliases through
 * `var()`, `color-mix()`, `clamp()` font sizes) are resolved to their literal
 * value and the usage note says so.
 */
import {
  allTokens,
  appearanceColorRoleLaws,
  DEFAULT_ACCENT_HUE,
  type DesignToken,
  evaluateAppearance,
  type ThemeToken,
} from "../../src/tokens/tokens.ts";
import { required } from "./support.ts";

/** One artifact token: a literal value or a value per theme id. */
export interface ArtifactToken {
  readonly name: string;
  readonly value: string | Readonly<Record<string, string>>;
  readonly usage: string;
}

/** Provenance the artifact keeps beside the tokens. */
export interface TokenProvenance {
  readonly ref: string;
  readonly synced: string;
  readonly components: Readonly<Record<string, string>>;
}

const THEMES = [
  { id: "light", name: "Light" },
  { id: "dark", name: "Dark" },
  { id: "accent-light", name: `Accent (hue ${DEFAULT_ACCENT_HUE}) light` },
  { id: "accent-dark", name: `Accent (hue ${DEFAULT_ACCENT_HUE}) dark` },
] as const;

const GROUNDS: Readonly<Record<string, string>> = {
  "--discern-color-ink":
    " Primary text on canvas, surface, and surface-sunken in every theme.",
  "--discern-color-ink-muted":
    " Secondary text and metadata on canvas and surface.",
  "--discern-color-ink-faint":
    " Captions, kickers, and legends on canvas and surface; the light value composites to 4.5:1 on white, the floor for small legend text.",
  "--discern-color-on-action": " Text on an action fill only.",
  "--discern-color-inverse-ink":
    " Text on inverse-surface only; stays light-on-dark in both site themes.",
  "--discern-color-canvas": " Page ground beneath the opted-in root.",
  "--discern-color-surface":
    " Cards, windows, inputs, and secondary buttons on canvas.",
};

const strip = (name: string): string => name.replace(/^--/, "");

function isThemeToken(token: DesignToken | ThemeToken): token is ThemeToken {
  return "light" in token;
}

const baseTokens = allTokens.filter((token): token is DesignToken =>
  !isThemeToken(token)
);
const baseByName = new Map(baseTokens.map((token) => [token.name, token]));
const base = (name: `--discern-${string}`): DesignToken =>
  required(baseByName.get(name), `base token ${name}`);

function colourTokens(): ArtifactToken[] {
  const poles = {
    light: evaluateAppearance({ darkness: 0 }),
    dark: evaluateAppearance({ darkness: 1 }),
    "accent-light": evaluateAppearance({
      darkness: 0,
      accent: DEFAULT_ACCENT_HUE,
    }),
    "accent-dark": evaluateAppearance({
      darkness: 1,
      accent: DEFAULT_ACCENT_HUE,
    }),
  } as const;
  const roles = appearanceColorRoleLaws.map((law): ArtifactToken => ({
    name: strip(law.name),
    value: Object.fromEntries(
      THEMES.map(({ id }) => [
        id,
        required(poles[id][law.name], `${id} value of ${law.name}`),
      ]),
    ),
    usage: law.description + (GROUNDS[law.name] ?? ""),
  }));
  const series = allTokens.filter(isThemeToken).filter((token) =>
    token.name.startsWith("--discern-color-series-")
  ).map((token): ArtifactToken => ({
    name: strip(token.name),
    value: { light: token.light, dark: token.dark },
    usage: token.description,
  }));
  return [...roles, ...series];
}

function shadowTokens(): ArtifactToken[] {
  const light = evaluateAppearance({ darkness: 0 });
  const dark = evaluateAppearance({ darkness: 1 });
  const tint = (alpha: number, theme: "light" | "dark"): string =>
    theme === "light"
      ? `oklch(0% 0 0 / ${alpha})`
      : `oklch(100% 0 0 / ${alpha})`;
  const tier = (
    name: string,
    offset: string,
    lightAlpha: number,
    darkAlpha: number,
    usage: string,
  ): ArtifactToken => ({
    name,
    value: {
      light: `${offset} ${tint(lightAlpha, "light")}`,
      dark: `${offset} ${tint(darkAlpha, "dark")}`,
    },
    usage:
      `${usage} Hard-edged: no blur, ever. In the package: ${offset} color-mix(shadow-color ${
        Math.round(lightAlpha * 100)
      }% light / ${Math.round(darkAlpha * 100)}% dark).`,
  });
  return [
    tier(
      "discern-shadow-card",
      "2px 2px 0",
      0.04,
      0.1,
      "Quietest optional offset for a standalone raised Card.",
    ),
    tier(
      "discern-shadow-window",
      "4px 5px 0",
      0.06,
      0.16,
      "Modest separation for a Window or framed presentation surface.",
    ),
    tier(
      "discern-shadow-pop",
      "6px 6px 0",
      0.12,
      0.28,
      "Strongest separation, reserved for overlays: dialogs, hover cards, tooltips, the search palette.",
    ),
    {
      name: "discern-shadow-button",
      value: {
        light: `0 2px 0 ${
          required(light["--discern-color-action-shadow"], "action shadow")
        }`,
        dark: `0 2px 0 ${
          required(dark["--discern-color-action-shadow"], "action shadow")
        }`,
      },
      usage:
        "The primary Button's hard 2px drop in discern-color-action-shadow (component-scoped in button.css, not a public token). Pressing collapses it to 0 0 0 while the button travels down 2px.",
    },
  ];
}

function literal(name: `--discern-${string}`, suffix = ""): ArtifactToken {
  const token = base(name);
  return {
    name: strip(name),
    value: token.value,
    usage: token.description + suffix,
  };
}

function spacingTokens(): ArtifactToken[] {
  const steps = baseTokens.filter((token) =>
    /^--discern-space-\d+$/.test(token.name)
  ).map((token): ArtifactToken => ({
    name: strip(token.name),
    value: token.value,
    usage: token.description,
  }));
  const rhythm = (["related", "group", "section"] as const).map(
    (role): ArtifactToken => {
      const alias = base(`--discern-rhythm-${role}`);
      const step = required(
        /var\((--discern-space-\d+)\)/.exec(alias.value)?.[1],
        `rhythm alias ${role}`,
      ) as `--discern-${string}`;
      return {
        name: strip(alias.name),
        value: base(step).value,
        usage: `${alias.description} Alias of ${strip(step)} in the package.`,
      };
    },
  );
  return [...steps, ...rhythm];
}

function layoutTokens(): ArtifactToken[] {
  const control = (["sm", "md", "lg"] as const).map((size): ArtifactToken => {
    const token = base(`--discern-control-size-${size}`);
    const floor = required(
      /max\(([^,]+),\s*var\((--discern-space-\d+)\)\)/.exec(token.value) ??
        undefined,
      `control size ${size}`,
    );
    return {
      name: strip(token.name),
      value: required(floor[1], "floor"),
      usage: `${token.description} In the package: max(${floor[1]}, ${
        strip(required(floor[2], "step"))
      } × density).`,
    };
  });
  return [
    literal("--discern-page-max", " Container width."),
    literal("--discern-measure", " Prose, paragraphs, and long-form reading."),
    ...control,
    ...(["xs", "sm", "md", "lg", "xl"] as const).map((size) =>
      literal(`--discern-avatar-size-${size}`)
    ),
    literal(
      "--discern-section-space",
      " Vertical rhythm between page sections; fluid.",
    ),
  ];
}

const typeGroups = [
  {
    name: "Display",
    family: "display",
    styles: [
      {
        name: "display-xl",
        fontSize: "4.125rem",
        lineHeight: 1.08,
        fontWeight: 700,
        letterSpacing: "-0.014em",
        sample: "Ship what you can prove",
        usage:
          "Hero display heading. Fluid in the package: clamp(2.75rem, 5.4vw, 4.125rem).",
      },
      {
        name: "display-lg",
        fontSize: "2.75rem",
        lineHeight: 1.08,
        fontWeight: 700,
        letterSpacing: "-0.014em",
        sample: "Large display heading",
        usage: "h1 in the foundation; page titles and article headers.",
      },
      {
        name: "display-md",
        fontSize: "2rem",
        lineHeight: 1.08,
        fontWeight: 700,
        letterSpacing: "-0.014em",
        sample: "Medium display heading",
        usage: "h2; section titles.",
      },
      {
        name: "display-sm",
        fontSize: "1.5rem",
        lineHeight: 1.08,
        fontWeight: 700,
        letterSpacing: "-0.014em",
        sample: "Small display heading",
        usage: "h3; subsection titles.",
      },
    ],
  },
  {
    name: "Reading",
    family: "body",
    styles: [
      {
        name: "lead",
        fontSize: "1.125rem",
        lineHeight: 1.58,
        fontWeight: 400,
        sample: "Lead copy opens a page with one calm sentence.",
        usage: "Lead paragraphs and standfirsts (discern-font-size-lg).",
      },
      {
        name: "body",
        fontSize: "1.05rem",
        lineHeight: 1.58,
        fontWeight: 400,
        sample:
          "Body copy sits at the root: readable, unhurried, inside a 62ch measure.",
        usage:
          "The root text style of every opted-in root (discern-font-size-md, discern-leading-body).",
      },
      {
        name: "body-strong",
        fontSize: "1.05rem",
        lineHeight: 1.58,
        fontWeight: 650,
        sample: "Strong body emphasis",
        usage: "Strong emphasis inside prose (discern-font-weight-strong).",
      },
    ],
  },
  {
    name: "Interface",
    family: "ui",
    styles: [
      {
        name: "card-title",
        fontSize: "1.125rem",
        lineHeight: 1.3,
        fontWeight: 650,
        sample: "Component title",
        usage:
          "Component and card titles; h4–h6 in the foundation (discern-font-size-card-title, discern-leading-snug).",
      },
      {
        name: "label",
        fontSize: "0.95rem",
        lineHeight: 1.3,
        fontWeight: 650,
        sample: "Field label",
        usage: "Field labels: primary ink at the strong UI weight.",
      },
      {
        name: "control",
        fontSize: "0.95rem",
        lineHeight: 1.3,
        fontWeight: 600,
        sample: "Save changes",
        usage:
          "Button, tab, and control text (discern-font-size-sm at weight 600).",
      },
      {
        name: "ui",
        fontSize: "0.95rem",
        lineHeight: 1.3,
        fontWeight: 400,
        sample: "Secondary interface copy",
        usage:
          "Secondary interface copy: hints, table cells, navigation (discern-font-size-sm).",
      },
      {
        name: "ui-xs",
        fontSize: "0.85rem",
        lineHeight: 1.3,
        fontWeight: 400,
        sample: "Updated 2 min ago · 14 files",
        usage:
          "The authored interface-text floor for metadata, dates, and fine print (discern-font-size-xs); density never scales it and nothing sits below it.",
      },
      {
        name: "kicker",
        fontSize: "0.85rem",
        lineHeight: 1.3,
        fontWeight: 600,
        letterSpacing: "0.11em",
        sample: "SECTION 01",
        usage:
          "Uppercase annotation label above a heading (Kicker): tracked 0.11em, weight 600, ink-faint.",
      },
    ],
  },
  {
    name: "Marketing",
    family: "marketing",
    styles: [
      {
        name: "marketing-headline",
        fontSize: "2.75rem",
        lineHeight: 1.08,
        fontWeight: 600,
        letterSpacing: "-0.014em",
        sample: "Relevance before mechanism",
        usage:
          "Hero and campaign headlines in the marketing face at discern-font-weight-marketing (600), separate from editorial display. Fluid in the package between display-md and display-lg.",
      },
    ],
  },
  {
    name: "Code",
    family: "mono",
    styles: [
      {
        name: "code",
        fontSize: "0.95rem",
        lineHeight: 1.58,
        fontWeight: 400,
        sample: "deno add jsr:@discern-sh/design-system",
        usage:
          "Code blocks, commands, paths, and terminal output. Monospace is reserved for code and the explicitly monospaced brand name; never used for a technical mood.",
      },
    ],
  },
] as const;

/** The font files the artifact carries, as the package ships them. */
export const fontFiles = [
  {
    family: "Crimson Pro",
    source: "crimson-pro-roman.woff2",
    weight: "200 900",
    style: "normal",
  },
  {
    family: "Crimson Pro",
    source: "crimson-pro-italic.woff2",
    weight: "200 900",
    style: "italic",
  },
  {
    family: "Inter",
    source: "inter.woff2",
    weight: "400 700",
    style: "normal",
  },
  {
    family: "JetBrains Mono",
    source: "jetbrains-mono.woff2",
    weight: "400 600",
    style: "normal",
  },
] as const;

/** Family stacks with the font pack selected; the same names `bundle.css` binds. */
export const fontFamilies = {
  display:
    '"Iowan Old Style", "Crimson Pro", "Palatino Linotype", Georgia, ui-serif, serif',
  body: '"Inter", "Helvetica Neue", Arial, system-ui, sans-serif',
  ui: '"Inter", "Helvetica Neue", Arial, system-ui, sans-serif',
  marketing: '"Inter", "Helvetica Neue", Arial, system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
} as const;

/** Build the complete `tokens.json` object. */
export function buildTokens(provenance: TokenProvenance): unknown {
  const colour = colourTokens();
  return {
    name: "discern",
    version: 1,
    meta: {
      source: "github",
      repo: "discern-sh/design-system",
      ref: provenance.ref,
      package: ".",
      paths: {
        tokens: [
          "src/tokens/tokens.ts",
          "src/tokens/appearance.ts",
          "src/styles/foundation.css",
        ],
        fonts: ["assets/fonts.css", "assets/fonts/"],
        assets: ["assets/textures/grain.png", "assets/licenses/"],
        docs: [
          "README.md",
          "map/00-orientation/design-principles.md",
          "map/10-tokens-themes/README.md",
          "map/20-components/",
        ],
      },
      components: provenance.components,
      synced: provenance.synced,
    },
    color: {
      note:
        `Monochrome by default: every role is paper or ink at an alpha, evaluated by the package's appearance model at the light pole (darkness 0) and the dark pole (darkness 1). The accent themes are the same model with the Accent projection switched on at the default hue ${DEFAULT_ACCENT_HUE}; in the real runtime that is a data-discern-accent scope, not a theme.`,
      themes: THEMES,
      tokens: colour,
    },
    type: {
      fonts: fontFiles.map(({ family, source, weight, style }) => ({
        family,
        file: `fonts/${source}`,
        weight,
        style,
      })),
      families: fontFamilies,
      groups: typeGroups,
    },
    spacing: {
      note:
        "One 4px unit. Density multiplies these authored steps in the browser and never touches font size or the touch-target floors.",
      tokens: spacingTokens(),
    },
    radius: {
      tokens: baseTokens.filter((token) =>
        token.name.startsWith("--discern-radius-")
      ).map((token) => literal(token.name)),
    },
    shadow: {
      note:
        "Three elevation tiers and one control drop, all hard-edged offsets with no blur. Cards standalone carry the quietest, windows modest, overlays the strongest. Nested cards suppress repeated borders and shadows.",
      tokens: shadowTokens(),
    },
    layout: { tokens: layoutTokens() },
    duration: {
      note:
        "A shared vocabulary, not a universal transition: a component owns motion only when it explains cause, continuity, progress, or space, and reduced motion resolves to the same complete state.",
      tokens: (["fast", "medium", "reveal"] as const).map((name) =>
        literal(`--discern-duration-${name}`)
      ),
    },
    easing: {
      tokens: (["out", "in-out"] as const).map((name) =>
        literal(`--discern-ease-${name}`)
      ),
    },
    appearance: {
      note:
        "The numeric author controls of the appearance model. Set them on an opted-in root as CSS custom properties (--discern-darkness and so on); the live CSS derives every colour role from paper and ink.",
      tokens: [
        ...([
          "darkness",
          "structure",
          "emphasis",
          "density",
          "paper-tint",
          "paper-tint-hue",
          "ink-tint",
          "ink-tint-hue",
        ] as const).map((axis) => literal(`--discern-${axis}`)),
        {
          name: "discern-accent-hue",
          value: String(DEFAULT_ACCENT_HUE),
          usage:
            "Accent hue for the Accent projection; any finite hue from 0 through 360, where 360 aliases 0. It changes nothing until an element opts into Accent with data-discern-accent.",
        },
      ],
    },
  };
}

/** How many colour roles the artifact carries; reported by the generator. */
export function colourRoleCount(): number {
  return colourTokens().length;
}
