/**
 * The design system's own landing page: the site front door served at `/`.
 *
 * The page is composed exclusively from published components and rendered to
 * static HTML at build time — the same consumer contract the copy describes.
 * It ships no scripts; every number it presents arrives through
 * {@linkcode LandingFacts} from the build's real emission manifest, never
 * hand-maintained prose.
 *
 * @module
 */
import { renderToStaticMarkup } from "react-dom/server";
import { SurveyBackdrop } from "../../src/components/artwork/survey-backdrop/survey-backdrop.tsx";
import { Button } from "../../src/components/core/button/button.tsx";
import { Badge } from "../../src/components/display/badge/badge.tsx";
import { Terminal } from "../../src/components/display/terminal/terminal.tsx";
import { Window } from "../../src/components/display/window/window.tsx";
import { CodeListing } from "../../src/components/editorial/code-listing/code-listing.tsx";
import { Grid } from "../../src/components/layout/grid/grid.tsx";
import { ClosingStatement } from "../../src/components/marketing/closing-statement/closing-statement.tsx";
import { FaqBlock } from "../../src/components/marketing/faq-block/faq-block.tsx";
import { FeatureBento } from "../../src/components/marketing/feature-bento/feature-bento.tsx";
import { HeroBlock } from "../../src/components/marketing/hero-block/hero-block.tsx";
import { MetricsBand } from "../../src/components/marketing/metrics-band/metrics-band.tsx";
import { SiteFooter } from "../../src/components/marketing/site-footer/site-footer.tsx";
import { SiteHeader } from "../../src/components/marketing/site-header/site-header.tsx";
import { SplitFeature } from "../../src/components/marketing/split-feature/split-feature.tsx";
import { VoiceBreak } from "../../src/components/marketing/voice-break/voice-break.tsx";
import {
  Receipt,
  type ReceiptCheck,
  type ReceiptMeta,
} from "../../src/components/agents/receipt/receipt.tsx";
import renderReceiptCli, {
  type ReceiptCliProps,
} from "../../src/components/agents/receipt/receipt.cli.ts";
import renderWorklogCli from "../../src/components/agents/worklog/worklog.cli.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import { projectTerminalInlineHtml } from "../../src/cli/projection.ts";
import type { RuntimeAssetSelection } from "../../src/runtime-assets.ts";
import { catalogueRoutePaths } from "../routes.ts";

/** Canonical package identity shared by every landing surface. */
export const LANDING_PACKAGE = "@discern-sh/design-system";
const JSR_URL = `https://jsr.io/${LANDING_PACKAGE}`;

/**
 * Components the landing page composes directly. The build emits exactly this
 * selection; the landing tests fail the page if it renders a class this
 * selection does not resolve, or requests a component it never renders.
 */
export const landingSelection: readonly string[] = [
  "badge",
  "button",
  "closing-statement",
  "code-listing",
  "faq-block",
  "feature-bento",
  "grid",
  "hero-block",
  "metrics-band",
  "receipt",
  "site-footer",
  "site-header",
  "split-feature",
  "survey-backdrop",
  "terminal",
  "voice-break",
  "window",
];

/** Assets the landing emission carries; the document links only these. */
export const landingAssets: readonly RuntimeAssetSelection[] = ["fonts"];

/** Build-measured facts the landing page presents instead of authored claims. */
export interface LandingFacts {
  /** Package version from `deno.json`. */
  readonly version: string;
  /** Complete-system inventory counts from the package manifest. */
  readonly system: {
    readonly components: number;
    readonly groups: number;
    readonly tokens: number;
  };
  /** This page's own runtime emission, straight from its `manifest.json`. */
  readonly emission: {
    readonly requestedComponents: number;
    readonly resolvedComponents: number;
    readonly cssBytes: number;
    readonly cssIntegrity: string;
  };
}

function kilobytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function shortIntegrity(integrity: string): string {
  return `${integrity.slice(0, 19)}…`;
}

interface LandingReceipt {
  readonly title: string;
  readonly meta: readonly { readonly label: string; readonly value: string }[];
  readonly checks: readonly {
    readonly label: string;
    readonly state: "pass";
    readonly value: string;
  }[];
  readonly summary: string;
}

/** One fact set feeds both hero surfaces, so the frames can never disagree. */
function landingReceipt(facts: LandingFacts): LandingReceipt {
  return {
    title: "Landing page emission",
    meta: [
      { label: "Package", value: `${LANDING_PACKAGE}@${facts.version}` },
      {
        label: "Selection",
        value: `${facts.emission.requestedComponents} components requested`,
      },
    ],
    checks: [
      {
        label: "Components resolved",
        state: "pass",
        value: `${facts.emission.resolvedComponents}`,
      },
      {
        label: "discern.css emitted",
        state: "pass",
        value: kilobytes(facts.emission.cssBytes),
      },
      {
        label: "Integrity recorded",
        state: "pass",
        value: shortIntegrity(facts.emission.cssIntegrity),
      },
      { label: "Client JavaScript", state: "pass", value: "none" },
    ],
    summary: "Byte-for-byte reproducible from the same selection.",
  };
}

const HERO_TERMINAL_CAPABILITIES: TerminalCapabilities = {
  ansiControl: false,
  colorDepth: "truecolor",
  columns: 62,
  unicode: true,
};

const SPLIT_TERMINAL_CAPABILITIES: TerminalCapabilities = {
  ansiControl: false,
  colorDepth: "truecolor",
  columns: 40,
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

function HeroReceiptPair({ facts }: { readonly facts: LandingFacts }) {
  const receipt = landingReceipt(facts);
  const webMeta: readonly ReceiptMeta[] = receipt.meta;
  const webChecks: readonly ReceiptCheck[] = receipt.checks;
  const cliProps: ReceiptCliProps = {
    title: receipt.title,
    stamp: "pass",
    meta: receipt.meta,
    checks: receipt.checks,
    summary: receipt.summary,
    theme: "dark",
  };
  return (
    <Grid gap={5} minimum="22rem">
      <Window
        variant="showcase"
        title="Receipt — browser surface"
        actions={<Badge tone="accent">static HTML</Badge>}
      >
        <Receipt
          title={receipt.title}
          stamp="pass"
          meta={webMeta}
          checks={webChecks}
          summary={receipt.summary}
        />
      </Window>
      <Terminal
        variant="showcase"
        title="the same Receipt — terminal surface"
        actions={<Badge tone="accent">deterministic frame</Badge>}
      >
        <TerminalFrame
          output={renderReceiptCli(cliProps, HERO_TERMINAL_CAPABILITIES)}
        />
      </Terminal>
    </Grid>
  );
}

const RUNTIME_SNIPPET = `import { emitDesignSystemRuntime } from
  "${LANDING_PACKAGE}/runtime";

await emitDesignSystemRuntime({
  outputRoot: new URL("./public/", import.meta.url),
  components: ["site-header", "receipt"],
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
    {
      label: "Emit discern.css",
      status: "done",
      statusLabel: "deterministic",
    },
    {
      label: "Record manifest integrity",
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

function LandingMain({ facts }: { readonly facts: LandingFacts }) {
  return (
    <main>
      <HeroBlock
        layout="showcase"
        surface="atmospheric"
        backdrop={<SurveyBackdrop />}
        eyebrow={`${LANDING_PACKAGE} · v${facts.version}`}
        title={
          <>
            One system, <em>both surfaces</em>.
          </>
        }
        description={
          <p>
            The discern design system renders product interfaces in the browser
            and the terminal from the same tokens and component contracts —
            deterministic CSS emission, a React-free core, static HTML output,
            and typed CLI renderers, published for Deno on JSR.
          </p>
        }
        actions={
          <>
            <Button href={catalogueRoutePaths.overview}>
              Browse the catalogue
            </Button>
            <Button href={JSR_URL} variant="secondary">
              Get it on JSR
            </Button>
          </>
        }
        meta={
          <>
            Below: this page&rsquo;s actual emission manifest, presented by the
            same Receipt component on both of its surfaces.
          </>
        }
        visual={<HeroReceiptPair facts={facts} />}
      />
      <MetricsBand
        eyebrow="The inventory"
        tone="contrast"
        items={[
          {
            value: `${facts.system.components}`,
            label: "components",
            detail: `across ${facts.system.groups} groups`,
          },
          {
            value: `${facts.system.tokens}`,
            label: "public design tokens",
            detail: "one authority for web and terminal",
          },
          {
            value: "2",
            label: "render surfaces",
            detail: "browser CSS runtime and terminal strings",
          },
          {
            value: "0",
            label: "scripts on this page",
            detail: "static HTML and emitted CSS alone",
          },
        ]}
      />
      <FeatureBento
        eyebrow="Guarantees"
        title="Built on contracts, not conventions."
        description={
          <p>
            Every promise below is enforced by package tests, so a regression
            cannot reach a release.
          </p>
        }
        items={[
          {
            title: "Deterministic emission",
            description:
              "Identical selections emit byte-for-byte identical output, and every file lands in a SHA-256 integrity manifest you can diff and pin.",
            size: "wide",
            tone: "accent",
          },
          {
            title: "Selection-scoped runtime",
            description:
              "Emit only the components a route uses. Dependencies resolve from generated metadata; unrelated groups never reach the page.",
          },
          {
            title: "Namespaced and rootable",
            description:
              "Every class, token, and keyframe wears the discern prefix and applies only beneath an opted-in root, so existing pages keep their own styles.",
          },
          {
            title: "Accessibility is gated",
            description:
              "Contrast, reduced motion, forced colours, and the interface-text floor are package tests, not review notes.",
            size: "wide",
          },
          {
            title: "Tokens move themes",
            description:
              "Light, dark, and consumer branding override public custom properties. Component CSS stays byte-identical in every theme.",
          },
          {
            title: "A guarded public contract",
            description:
              "Strict TypeScript throughout, every public symbol documented, and immutable SemVer releases on JSR.",
          },
        ]}
      />
      <SplitFeature
        eyebrow="Browser"
        title="Ship static HTML. Keep the framework optional."
        description={
          <p>
            The core never imports React. The optional adapter renders every
            component to static markup at build time, so consumers serve HTML
            and CSS — no bundle, no hydration, no runtime dependency.
          </p>
        }
        points={[
          {
            title: "React-free core",
            description:
              "The root, CLI, runtime, tokens, and theme graphs resolve no React at all.",
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
            Review the tokens
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
        eyebrow="Terminal"
        title="The same system, rendered as text."
        description={
          <p>
            Every component declares its terminal stance at birth: a typed, pure
            renderer that derives deterministic frames from props and explicit
            terminal capabilities — colour depths, widths, Unicode or ASCII — or
            a recorded reason it stays browser-only.
          </p>
        }
        points={[
          {
            title: "Pure renderers",
            description:
              "No I/O, environment, or clock reads — props and capabilities in, one exact frame out.",
          },
          {
            title: "Token-derived palette",
            description:
              "Terminal light, dark, and ANSI fallbacks derive from the same public tokens as the web theme.",
          },
          {
            title: "Interactive when asked",
            description:
              "Effects live behind ./cli/interactive and paint the same component frame states.",
          },
        ]}
        actions={
          <Button href={catalogueRoutePaths.terminal} variant="secondary">
            Inspect terminal layouts
          </Button>
        }
        media={
          <Terminal
            variant="showcase"
            title="deno run build.ts"
            footer={
              <>
                <span>{SPLIT_TERMINAL_CAPABILITIES.columns} columns</span>
                <span>truecolour</span>
                <span>same tokens</span>
              </>
            }
          >
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
      <VoiceBreak
        eyebrow="The character of the system"
        quote="Every principle trades a little authoring convenience for a lot of consumer trust."
        attribution="Design principles"
        context="The seven binding rules this system is built against"
      />
      <FaqBlock
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
            Open the catalogue to inspect every component contract, token, and
            terminal frame this page is built from.
          </p>
        }
        actions={
          <>
            <Button href={catalogueRoutePaths.overview}>
              Browse the catalogue
            </Button>
            <Button href={JSR_URL} variant="secondary">
              {LANDING_PACKAGE}
            </Button>
          </>
        }
        reassurance={
          <p>
            Apache-2.0. No runtime dependencies. Versions are immutable on JSR.
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
      <SiteHeader
        variant="campaign"
        brand="discern"
        brandMark="◮"
        brandTypeface="display"
        homeHref="/"
        navItems={[
          { label: "Components", href: catalogueRoutePaths.components },
          { label: "Foundations", href: catalogueRoutePaths.foundations },
          { label: "Compositions", href: catalogueRoutePaths.compositions },
          { label: "Terminal", href: catalogueRoutePaths.terminal },
        ]}
        actions={
          <Button href={catalogueRoutePaths.overview} size="sm">
            Browse the catalogue
          </Button>
        }
      />
      <LandingMain facts={facts} />
      <SiteFooter
        brand="discern"
        brandMark="◮"
        brandTypeface="display"
        description={
          <p>
            A framework-neutral design system for products that live in the
            browser and the terminal.
          </p>
        }
        groups={[
          {
            title: "Catalogue",
            links: [
              { label: "Overview", href: catalogueRoutePaths.overview },
              { label: "Components", href: catalogueRoutePaths.components },
              { label: "Foundations", href: catalogueRoutePaths.foundations },
              {
                label: "Compositions",
                href: catalogueRoutePaths.compositions,
              },
              { label: "Terminal layouts", href: catalogueRoutePaths.terminal },
              { label: "Review mode", href: catalogueRoutePaths.review },
            ],
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
        meta="This page is static HTML and selection-scoped emitted CSS. It ships no scripts."
      />
    </>
  );
}

/** Render the complete landing document served at the site root. */
export function renderLandingHtml(facts: LandingFacts): string {
  const markup = renderToStaticMarkup(<LandingPage facts={facts} />);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="description" content="A framework-neutral design system for browser and terminal surfaces: deterministic CSS emission, a React-free core, and typed CLI renderers.">
    <title>discern design system</title>
    <link rel="stylesheet" href="/dist/landing/fonts.css">
    <link rel="stylesheet" href="/dist/landing/discern.css">
  </head>
  <body data-discern-root>${markup}</body>
</html>
`;
}
