/**
 * The design system's own landing page: the site front door served at `/`.
 *
 * The page is composed exclusively from published components and rendered to
 * static HTML at build time — the same consumer contract the copy describes.
 * Its only page-owned behavior applies the controlled Theme toggle's consumer
 * policy; every number it presents arrives through {@linkcode LandingFacts}
 * from the real package manifest and landing build, never hand-maintained
 * prose.
 *
 * @module
 */
import { renderToStaticMarkup } from "react-dom/server";
import { SurveyBackdrop } from "../../src/components/artwork/survey-backdrop/survey-backdrop.tsx";
import { Button } from "../../src/components/core/button/button.tsx";
import { ThemeToggle } from "../../src/components/core/theme-toggle/theme-toggle.tsx";
import { SkipLink } from "../../src/components/docs/skip-link/skip-link.tsx";
import { Terminal } from "../../src/components/display/terminal/terminal.tsx";
import { Window } from "../../src/components/display/window/window.tsx";
import { Chart } from "../../src/components/editorial/chart/chart.tsx";
import { CodeListing } from "../../src/components/editorial/code-listing/code-listing.tsx";
import { DataFigure } from "../../src/components/editorial/data-figure/data-figure.tsx";
import { Diagram } from "../../src/components/editorial/diagram/diagram.tsx";
import { Markdown } from "../../src/components/editorial/markdown/markdown.tsx";
import { TableOfContents } from "../../src/components/editorial/table-of-contents/table-of-contents.tsx";
import { Grid } from "../../src/components/layout/grid/grid.tsx";
import { Stack } from "../../src/components/layout/stack/stack.tsx";
import { ClosingStatement } from "../../src/components/marketing/closing-statement/closing-statement.tsx";
import { FaqBlock } from "../../src/components/marketing/faq-block/faq-block.tsx";
import { FeatureBento } from "../../src/components/marketing/feature-bento/feature-bento.tsx";
import { HeroBlock } from "../../src/components/marketing/hero-block/hero-block.tsx";
import { MarketingIntro } from "../../src/components/marketing/marketing-intro/marketing-intro.tsx";
import { MarketingSection } from "../../src/components/marketing/marketing-section/marketing-section.tsx";
import { MetricsBand } from "../../src/components/marketing/metrics-band/metrics-band.tsx";
import { NarrativeChapter } from "../../src/components/marketing/narrative-chapter/narrative-chapter.tsx";
import { SiteFooter } from "../../src/components/marketing/site-footer/site-footer.tsx";
import { SiteHeader } from "../../src/components/marketing/site-header/site-header.tsx";
import { SplitFeature } from "../../src/components/marketing/split-feature/split-feature.tsx";
import {
  VerificationReport,
  type VerificationReportCheck,
  type VerificationReportMeta,
} from "../../src/components/agents/verification-report/verification-report.tsx";
import renderVerificationReportCli, {
  type VerificationReportCliProps,
} from "../../src/components/agents/verification-report/verification-report.cli.ts";
import renderWorklogCli from "../../src/components/agents/worklog/worklog.cli.ts";
import renderChartCli from "../../src/components/editorial/chart/chart.cli.ts";
import renderDiagramCli from "../../src/components/editorial/diagram/diagram.cli.ts";
import renderMarkdownCli from "../../src/components/editorial/markdown/markdown.cli.ts";
import type { HeatmapChartSpec } from "../../src/chart/kinds/heatmap/heatmap.spec.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import { projectTerminalInlineHtml } from "../../src/cli/projection.ts";
import type { FlowDiagramSpec } from "../../src/diagram/kinds/flow/flow.spec.ts";
import type { RuntimeAssetSelection } from "../../src/runtime-assets.ts";
import { catalogueNavigation, catalogueRoutePaths } from "../routes.ts";
import type { LandingSystemFacts } from "./facts.ts";

/** Canonical package identity shared by every landing surface. */
export const LANDING_PACKAGE = "@discern-sh/design-system";
const JSR_URL = `https://jsr.io/${LANDING_PACKAGE}`;

/**
 * Components the landing page composes directly. The build emits exactly this
 * selection; the landing tests fail the page if it renders a class this
 * selection does not resolve, or requests a component it never renders.
 */
export const landingSelection: readonly string[] = [
  "button",
  "chart",
  "closing-statement",
  "code-listing",
  "data-figure",
  "diagram",
  "faq-block",
  "feature-bento",
  "grid",
  "hero-block",
  "markdown",
  "marketing-intro",
  "marketing-section",
  "metrics-band",
  "narrative-chapter",
  "site-footer",
  "site-header",
  "skip-link",
  "split-feature",
  "stack",
  "survey-backdrop",
  "table-of-contents",
  "terminal",
  "theme-toggle",
  "verification-report",
  "window",
];

/** Assets the landing emission carries; the document links only these. */
export const landingAssets: readonly RuntimeAssetSelection[] = ["fonts"];

/** Canonical Catalogue destinations projected into the public front door. */
export const landingCatalogueDestinations = catalogueNavigation;

/** Page-owned narrative anchors, deliberately separate from Catalogue routes. */
export const landingPageSections = Object.freeze([
  { id: "landing-guarantees", label: "Guarantees" },
  { id: "landing-browser", label: "Browser" },
  { id: "landing-terminal", label: "Terminal" },
  { id: "landing-system-evidence", label: "System evidence" },
  { id: "landing-principles", label: "Design principles" },
  { id: "landing-adoption", label: "Adoption questions" },
]);

/** Build-measured facts the landing page presents instead of authored claims. */
export interface LandingFacts {
  /** Package version from `deno.json`. */
  readonly version: string;
  /** Complete-system inventory counts from the package manifest. */
  readonly system: LandingSystemFacts;
  /** This page's own runtime emission, straight from its `manifest.json`. */
  readonly emission: {
    readonly resolvedComponents: number;
    readonly cssBytes: number;
    readonly cssIntegrity: string;
    readonly scripts: readonly string[];
  };
  /** Catalogue-owned browser behavior copied into the landing build. */
  readonly pageScripts: readonly string[];
}

function landingScripts(facts: LandingFacts): readonly string[] {
  return [...facts.emission.scripts, ...facts.pageScripts];
}

function kilobytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function shortIntegrity(integrity: string): string {
  return `${integrity.slice(0, 19)}…`;
}

interface LandingBuildReport {
  readonly title: string;
  readonly meta: readonly { readonly label: string; readonly value: string }[];
  readonly checks: readonly {
    readonly label: string;
    readonly state: "pass";
    readonly value: string;
  }[];
}

/** One fact set feeds both hero surfaces, so the frames can never disagree. */
function landingBuildReport(facts: LandingFacts): LandingBuildReport {
  return {
    title: "This page's build",
    meta: [
      { label: "Package", value: `${LANDING_PACKAGE}@${facts.version}` },
    ],
    checks: [
      {
        label: "Selected components",
        state: "pass",
        value:
          `${facts.emission.resolvedComponents} of ${facts.system.components}`,
      },
      {
        label: "discern.css",
        state: "pass",
        value: kilobytes(facts.emission.cssBytes),
      },
      {
        label: "Integrity",
        state: "pass",
        value: shortIntegrity(facts.emission.cssIntegrity),
      },
      {
        label: "JavaScript",
        state: "pass",
        value: landingScripts(facts).length === 0
          ? "none"
          : landingScripts(facts).join(", "),
      },
    ],
  };
}

const HERO_TERMINAL_CAPABILITIES: TerminalCapabilities = {
  ansiControl: false,
  colorDepth: "truecolor",
  columns: 54,
  unicode: true,
};

const SPLIT_TERMINAL_CAPABILITIES: TerminalCapabilities = {
  ansiControl: false,
  colorDepth: "truecolor",
  columns: 40,
  unicode: true,
};

const SHOWCASE_TERMINAL_CAPABILITIES: TerminalCapabilities = {
  ansiControl: false,
  colorDepth: "none",
  columns: 72,
  unicode: true,
};

/** Project package-emitted terminal output into the Terminal specimen frame. */
function TerminalFrame({ output }: { readonly output: string }) {
  return (
    <span
      dangerouslySetInnerHTML={{ __html: projectTerminalInlineHtml(output) }}
    />
  );
}

function HeroVerificationPair({ facts }: { readonly facts: LandingFacts }) {
  const report = landingBuildReport(facts);
  const webMeta: readonly VerificationReportMeta[] = report.meta;
  const webChecks: readonly VerificationReportCheck[] = report.checks;
  const cliProps: VerificationReportCliProps = {
    title: report.title,
    stamp: "pass",
    meta: report.meta,
    checks: report.checks,
    theme: "dark",
  };
  return (
    <Grid gap={5} minimum="22rem">
      <Window variant="showcase" title="Browser output">
        <VerificationReport
          title={report.title}
          stamp="pass"
          meta={webMeta}
          checks={webChecks}
        />
      </Window>
      <Terminal variant="showcase" title="Terminal output">
        <TerminalFrame
          output={renderVerificationReportCli(
            cliProps,
            HERO_TERMINAL_CAPABILITIES,
          )}
        />
      </Terminal>
    </Grid>
  );
}

const RUNTIME_SNIPPET = `import { emitDesignSystemRuntime } from
  "${LANDING_PACKAGE}/runtime";

await emitDesignSystemRuntime({
  outputRoot: new URL("./public/", import.meta.url),
  components: ["site-header", "verification-report"],
  assets: ["fonts"],
});
// -> discern.css, manifest.json, fonts.
//    Nothing you did not select.`;

const WORKLOG_OUTPUT_PROPS = {
  entries: [
    {
      label: "Resolve selection",
      status: "done",
      statusLabel: "3 components",
    },
    { label: "Emit discern.css", status: "done" },
    {
      label: "Record integrity",
      status: "done",
      statusLabel: "sha256",
    },
    {
      label: "Render static HTML",
      status: "active",
      statusLabel: "react-dom/server",
      phase: 2,
    },
    { label: "Ship", status: "queued" },
  ],
  theme: "dark",
} as const;

const DELIVERY_FLOW_SPEC = {
  kind: "flow",
  title: "Select, emit, render",
  summary:
    "A selected Component graph emits auditable browser assets and deterministic terminal output from shared system rules.",
  nodes: [
    { id: "select", label: "Select components", role: "start" },
    { id: "resolve", label: "Resolve dependencies" },
    { id: "emit", label: "Choose a projection", role: "decision" },
    { id: "browser", label: "Emit CSS + HTML", role: "end" },
    { id: "terminal", label: "Render pure text", role: "end" },
  ],
  edges: [
    { id: "selection", from: "select", to: "resolve", label: "Slugs" },
    { id: "graph", from: "resolve", to: "emit", label: "Closed graph" },
    {
      id: "browser-output",
      from: "emit",
      to: "browser",
      label: "Browser",
    },
    {
      id: "terminal-output",
      from: "emit",
      to: "terminal",
      label: "Terminal",
    },
  ],
} as const satisfies FlowDiagramSpec;

function componentCoverageSpec(system: LandingSystemFacts): HeatmapChartSpec {
  return {
    kind: "heatmap",
    title: "Component coverage by group and surface",
    summary:
      "Every group is counted from the package manifest; terminal counts include Components with package-owned pure renderers and exclude documented browser-only stances.",
    value: { label: "Components", unit: "components" },
    rows: system.coverage.map(({ group }) => ({
      id: group.toLowerCase(),
      label: group,
    })),
    columns: [
      { id: "browser", label: "Browser" },
      { id: "terminal", label: "Terminal" },
    ],
    values: system.coverage.map((group) => [
      group.browserComponents,
      group.terminalComponents,
    ]),
    bins: { edges: [5, 10, 20] },
  };
}

const MARKDOWN_SHOWCASE_SOURCE = `## Ship a selected system

Choose only what the product needs. Shared rules keep browser and terminal output aligned.

> [!NOTE]
> Themes change tokens, never Component CSS.

- [x] Select Components
- [x] Emit the runtime
- [ ] Ship your product

| Surface | Contract |
| :-- | :-- |
| Browser | Semantic HTML and CSS |
| Terminal | Deterministic text |`;

function TypedDiagramSection() {
  return (
    <MarketingSection surface="sunken" spacing="spacious" frame="wide">
      <MarketingIntro
        eyebrow="Typed diagrams"
        title="Author the meaning. Let the system draw it."
        description={
          <p>
            The input names entities and relationships — never coordinates or
            renderer options. One validated spec becomes an accessible SVG and a
            capability-aware terminal frame.
          </p>
        }
      />
      <Grid gap={6} minimum="30rem">
        <DataFigure
          eyebrow="Browser projection"
          title="Select, emit, render"
          visual={<Diagram spec={DELIVERY_FLOW_SPEC} />}
          caption="The package owns layout, shapes, connectors, and the complete structural description."
          source="One typed FlowDiagramSpec in this page"
          style={{ margin: 0 }}
        />
        <Terminal
          variant="showcase"
          title="The same FlowDiagramSpec in a terminal"
        >
          <TerminalFrame
            output={renderDiagramCli(
              {
                spec: DELIVERY_FLOW_SPEC,
                theme: "dark",
                maxWidth: 72,
              },
              SHOWCASE_TERMINAL_CAPABILITIES,
            )}
          />
        </Terminal>
      </Grid>
    </MarketingSection>
  );
}

function LandingPageNavigation() {
  return (
    <MarketingSection
      surface="surface"
      frame="wide"
      aria-label="On this page"
    >
      <TableOfContents
        title="On this page"
        label="On this page"
        items={landingPageSections.map(({ id, label }) => ({
          label,
          href: `#${id}`,
        }))}
      />
    </MarketingSection>
  );
}

function ComponentCoverageSection(
  { system }: { readonly system: LandingSystemFacts },
) {
  const spec = componentCoverageSpec(system);
  return (
    <MarketingSection surface="canvas" spacing="spacious" frame="wide">
      <MarketingIntro
        eyebrow="Computed coverage"
        title="A component inventory that counts itself."
        description={
          <p>
            This is not a marketing estimate. Every cell is rebuilt from the
            package manifest and each Component&rsquo;s declared terminal
            stance, so adding a future Component updates the evidence
            automatically.
          </p>
        }
      />
      <Grid gap={6} minimum="30rem">
        <DataFigure
          eyebrow="Live package inventory"
          title="Browser and terminal coverage by group"
          visual={<Chart spec={spec} />}
          caption="Four declared bins keep the colour scale honest; the accessible description preserves every exact count."
          source="Generated component and CLI stance registries"
          style={{ margin: 0 }}
        />
        <Terminal
          variant="showcase"
          title="The same computed heatmap in a terminal"
        >
          <TerminalFrame
            output={renderChartCli(
              { spec, theme: "dark", maxWidth: 58 },
              SHOWCASE_TERMINAL_CAPABILITIES,
            )}
          />
        </Terminal>
      </Grid>
    </MarketingSection>
  );
}

function MarkdownProjectionSection() {
  return (
    <MarketingSection surface="sunken" spacing="spacious" frame="wide">
      <MarketingIntro
        eyebrow="One Markdown source"
        title="Two native renderings. No injected HTML."
        description={
          <p>
            A fixed CommonMark and GFM dialect enters one neutral parser model,
            then composes the design system&rsquo;s real semantic Components for
            the browser and their pure renderers for the terminal.
          </p>
        }
      />
      <Stack gap={6}>
        <CodeListing
          filename="README.md"
          language="md"
          code={MARKDOWN_SHOWCASE_SOURCE}
          style={{ marginBlock: 0 }}
        />
        <Grid gap={6} minimum="30rem">
          <Window
            title="Browser rendering"
            bodyStyle={{ padding: "var(--discern-space-6)" }}
          >
            <Markdown source={MARKDOWN_SHOWCASE_SOURCE} measure="narrow" />
          </Window>
          <Terminal variant="showcase" title="Terminal rendering">
            <TerminalFrame
              output={renderMarkdownCli(
                {
                  source: MARKDOWN_SHOWCASE_SOURCE,
                  theme: "dark",
                  maxWidth: 52,
                },
                SHOWCASE_TERMINAL_CAPABILITIES,
              )}
            />
          </Terminal>
        </Grid>
      </Stack>
    </MarketingSection>
  );
}

function LandingMain({ facts }: { readonly facts: LandingFacts }) {
  return (
    <main id="main-content" tabIndex={-1}>
      <HeroBlock
        layout="showcase"
        surface="atmospheric"
        backdrop={<SurveyBackdrop />}
        eyebrow={`${LANDING_PACKAGE} · v${facts.version}`}
        title={
          <>
            Browser components. <em>Terminal renderers.</em>
          </>
        }
        description={
          <p>
            One package keeps browser interfaces and terminal output aligned
            through shared tokens, accessibility rules, and deterministic
            rendering. Use the React adapter at build time or stay
            framework-free, and emit only what your product selects.
          </p>
        }
        actions={
          <>
            <Button
              href={catalogueRoutePaths.components}
              data-discern-primary-catalogue-action=""
            >
              Find a Component
            </Button>
            <Button href={JSR_URL} variant="secondary">
              Install from JSR
            </Button>
          </>
        }
        meta={
          <>
            <code>deno add jsr:{LANDING_PACKAGE}</code>
            <span>
              Below: this page&rsquo;s own build record, rendered for the
              browser and the terminal from one fact set.
            </span>
          </>
        }
        visual={<HeroVerificationPair facts={facts} />}
      />
      <MetricsBand
        tone="contrast"
        items={[
          {
            value: `${facts.system.components}`,
            label: "components",
            detail: `across ${facts.system.groups} groups`,
          },
          {
            value: `${facts.system.tokens}`,
            label: "design tokens",
            detail: "one set of values for both surfaces",
          },
          {
            value: "2",
            label: "surfaces",
            detail: "real pages in the browser, real text in the terminal",
          },
          {
            value: `${landingScripts(facts).length}`,
            label: landingScripts(facts).length === 1
              ? "behavior script"
              : "behavior scripts",
            detail: "page-owned theme preference; no React or hydration",
          },
        ]}
      />
      <LandingPageNavigation />
      <FeatureBento
        id="landing-guarantees"
        tabIndex={-1}
        eyebrow="Guarantees"
        title="Promises a test suite keeps."
        description={
          <p>
            A regression in any of these cannot ship.
          </p>
        }
        items={[
          {
            title: "Same input, same bytes",
            description:
              "Build the same selection twice and the output is byte-for-byte identical, with a SHA-256 manifest you can diff and pin.",
            size: "wide",
            tone: "accent",
          },
          {
            title: "Only what you use",
            description:
              "Pick the components a page needs and its stylesheet contains exactly those — dependencies included, nothing else.",
          },
          {
            title: "Safe to drop in",
            description:
              "Every style is discern-prefixed and applies only inside an element you opt in, so your existing CSS is never touched.",
          },
        ]}
      />
      <SplitFeature
        id="landing-browser"
        tabIndex={-1}
        eyebrow="Browser"
        title="Ship static HTML. Keep the framework optional."
        description={
          <p>
            You can use it without React — the core is TypeScript that writes
            CSS. With React, the adapter runs once at build time, and what you
            deploy is the HTML and CSS it produced: no bundle, no hydration, no
            runtime dependency.
          </p>
        }
        points={[
          {
            title: "React-free core",
            description:
              "No part of the core resolves React, and release tests keep it that way.",
          },
          {
            title: "Build-time adapter",
            description:
              "React 18.3+ enters only through the ./react entrypoint, beside react-dom/server.",
          },
          {
            title: "A runtime you can audit",
            description:
              "The emitted manifest records the selection, dependencies, and integrity of every file.",
          },
        ]}
        actions={
          <Button href={catalogueRoutePaths.foundations} variant="secondary">
            Explore Tokens
          </Button>
        }
        media={
          <CodeListing
            variant="showcase"
            filename="build.ts"
            language="ts"
            code={RUNTIME_SNIPPET}
          />
        }
        surface="sunken"
      />
      <SplitFeature
        id="landing-terminal"
        tabIndex={-1}
        eyebrow="Terminal"
        title="The same system, rendered as text."
        description={
          <p>
            Every component ships a terminal renderer, or records why it stays
            browser-only. A renderer is a pure function: props and terminal
            capabilities in — width, colour depth, Unicode or ASCII — one exact
            frame of text out.
          </p>
        }
        points={[
          {
            title: "Pure renderers",
            description:
              "No I/O, environment, or clock reads — the same inputs always draw the same frame.",
          },
          {
            title: "One palette",
            description:
              "Terminal colours derive from the same tokens as the web theme, down to the ANSI fallbacks.",
          },
          {
            title: "Interactive when asked",
            description:
              "Prompts and pickers live behind an optional interactive adapter that paints the same frames.",
          },
        ]}
        actions={
          <Button href={catalogueRoutePaths.terminal} variant="secondary">
            Inspect terminal layouts
          </Button>
        }
        media={
          <Terminal variant="showcase" title="deno run build.ts">
            <TerminalFrame
              output={renderWorklogCli(
                WORKLOG_OUTPUT_PROPS,
                SPLIT_TERMINAL_CAPABILITIES,
              )}
            />
          </Terminal>
        }
        reverse
      />
      <div id="landing-system-evidence" tabIndex={-1}>
        <TypedDiagramSection />
        <ComponentCoverageSection system={facts.system} />
        <MarkdownProjectionSection />
      </div>
      <NarrativeChapter
        id="landing-principles"
        tabIndex={-1}
        eyebrow="Design principles"
        title="Strict inside the package. Flexible in your product."
        lead={
          <p>
            The design system carries the maintenance discipline so its
            consumers do not have to re-solve it in every interface.
          </p>
        }
        aside={
          <>
            <strong>Seven tested rules</strong>
            <p>
              They constrain how the package is built, not what your product is
              allowed to look like.
            </p>
          </>
        }
        asideLabel="How the design principles apply"
      >
        <p>
          Namespacing, deterministic emission, token-only themes, accessibility,
          and release compatibility are enforced beneath the public API. That
          work stays in the package instead of leaking into each consumer.
        </p>
        <h3>Adopt only the slice you need</h3>
        <p>
          Start with one component, one group, or the complete system. The same
          rules protect every selection, while tokens and ordinary props leave
          the product-level decisions with you.
        </p>
      </NarrativeChapter>
      <FaqBlock
        id="landing-adoption"
        tabIndex={-1}
        eyebrow="Before you adopt it"
        title="The questions worth asking a design system."
        items={[
          {
            question: "Do I need React?",
            answer: (
              <p>
                No. The core emits CSS and the CLI surface emits strings with no
                React in their module graphs — release tests fail a stray
                import. React 18.3+ is an optional peer used at build time by
                the ./react adapter.
              </p>
            ),
          },
          {
            question: "Will it fight my existing CSS?",
            answer: (
              <p>
                Foundations apply only beneath an element carrying
                data-discern-root, at zero specificity, and every public name is
                discern-prefixed. Outside that root the package styles nothing.
              </p>
            ),
          },
          {
            question: "How do I rebrand it?",
            answer: (
              <p>
                Override public custom properties. The bundled preset is itself
                just a token layer, and semantic roles stay distinct — an accent
                can never swallow success, warning, or danger.
              </p>
            ),
          },
          {
            question: "What happens in a dumb terminal?",
            answer: (
              <p>
                Renderers receive explicit capabilities and degrade
                deliberately: truecolour to ANSI fallbacks to plain text,
                Unicode to ASCII, wide to narrow — with exact-frame tests at
                every level.
              </p>
            ),
          },
        ]}
        openFirst
      />
      <ClosingStatement
        eyebrow="One next step"
        title="Select. Emit. Ship."
        description={
          <p>
            Find the Component you need, then inspect its bounded browser and
            terminal examples.
          </p>
        }
        actions={
          <>
            <Button href={catalogueRoutePaths.components}>
              Find a Component
            </Button>
            <Button href={JSR_URL} variant="secondary">
              {LANDING_PACKAGE}
            </Button>
          </>
        }
        reassurance={
          <p>
            Apache-2.0. Built for Deno, with no runtime dependencies. Versions
            are immutable on JSR.
          </p>
        }
      />
    </main>
  );
}

/** The complete landing page composition. */
export function LandingPage({ facts }: { readonly facts: LandingFacts }) {
  return (
    <>
      <SkipLink href="#main-content" />
      <SiteHeader
        variant="campaign"
        brand="discern / design system"
        brandMark="◮"
        brandTypeface="display"
        homeHref="/"
        collapseNavOnNarrow
        navLabel="Catalogue"
        navItems={landingCatalogueDestinations.map(({ label, path }) => ({
          label,
          href: path,
        }))}
        data-discern-catalogue-navigation="landing-header"
        actions={
          <>
            <ThemeToggle
              theme="light"
              onThemeChange={() => undefined}
              variant="quiet"
              data-discern-theme-control=""
            />
            <Button href={catalogueRoutePaths.components} size="sm">
              Find a Component
            </Button>
          </>
        }
      />
      <LandingMain facts={facts} />
      <SiteFooter
        brand="discern / design system"
        brandMark="◮"
        brandTypeface="display"
        description={
          <p>
            A design system for products that live in the browser and the
            terminal.
          </p>
        }
        groups={[
          {
            title: "Catalogue",
            links: landingCatalogueDestinations.map(({ label, path }) => ({
              label,
              href: path,
            })),
          },
          {
            title: "Package",
            links: [
              { label: "JSR package", href: JSR_URL },
              { label: "discern.sh", href: "https://discern.sh" },
            ],
          },
        ]}
        legal={`Apache-2.0 · ${LANDING_PACKAGE} v${facts.version}`}
        meta="Static HTML and CSS with one page-owned theme preference; no hydration."
        data-discern-catalogue-navigation="landing-footer"
      />
    </>
  );
}

/** Render the complete landing document served at the site root. */
export function renderLandingHtml(facts: LandingFacts): string {
  const markup = renderToStaticMarkup(<LandingPage facts={facts} />);
  const scripts = landingScripts(facts).map((script) =>
    `    <script src="/dist/landing/${script}"></script>`
  ).join("\n");
  return `<!doctype html>
<html lang="en" data-discern-root data-discern-theme-storage-key="discern-design-system-theme">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="description" content="Browser components and terminal renderers aligned through shared tokens, accessibility rules, and deterministic output.">
    <title>discern design system</title>
${scripts}
    <link rel="stylesheet" href="/dist/landing/fonts.css">
    <link rel="stylesheet" href="/dist/landing/discern.css">
  </head>
  <body>${markup}</body>
</html>
`;
}
