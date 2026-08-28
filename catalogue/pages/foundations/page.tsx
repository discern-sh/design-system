import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { TerminalThemeVariant } from "../../../src/cli/theme.ts";
import { CopyButton } from "../../../src/components/docs/copy-button/copy-button.tsx";
import {
  allTokens,
  baseTokens,
  discernThemeTokens,
} from "../../../src/tokens/tokens.ts";
import type { TokenCategory } from "../../../src/tokens/tokens.ts";
import {
  catalogueCliCapabilities,
  CliOutputPreview,
} from "../../cli-preview.tsx";
import { TerminalFoundationPreview } from "../../terminal-foundation-preview.tsx";
import {
  type TerminalFoundationSheet,
  terminalFoundationSheets,
} from "../../terminal-foundations.ts";
import {
  catalogueTerminalFoundationPath,
  foundationsPaths,
  foundationsRouteFamily,
  type FoundationToken,
  foundationTokenCategories,
  foundationTokenExplorerState,
  foundationTokenExplorerUrl,
  foundationTokenFragment,
  matchingFoundationTokens,
} from "../../routes/foundations.ts";
import { CataloguePageHeader } from "../shared.tsx";

function isThemed(token: FoundationToken): token is FoundationToken & {
  readonly light: string;
  readonly dark: string;
} {
  return "light" in token;
}

function tokenSource(token: FoundationToken): string {
  if (baseTokens.some((candidate) => candidate === token)) return "Base Token";
  if (discernThemeTokens.some((candidate) => candidate === token)) {
    return "Discern theme Token";
  }
  return "Semantic theme Token";
}

function previewVariable(name: string, value: string): CSSProperties {
  return { [name]: value } as CSSProperties;
}

function ColorPreview({ token }: { readonly token: FoundationToken }) {
  const values = isThemed(token)
    ? [{ label: "Light", value: token.light }, {
      label: "Dark",
      value: token.dark,
    }]
    : [{ label: "Value", value: token.value }];
  return (
    <div
      className="discern-catalogue-token-preview discern-catalogue-token-preview--color"
      data-discern-token-preview-values={isThemed(token) ? "themed" : "single"}
    >
      {values.map(({ label, value }) => (
        <div key={label}>
          <span className="discern-catalogue-token-preview__checker">
            <span
              style={{
                background: token.name.endsWith("-hue")
                  ? `oklch(65% 0.18 ${value})`
                  : value,
              }}
            />
          </span>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function TypographyPreview({ token }: { readonly token: FoundationToken }) {
  const value = `var(${token.name})`;
  const style: CSSProperties = token.name.startsWith("--discern-font-size-")
    ? { fontSize: `clamp(0.85rem, ${value}, 2rem)` }
    : token.name.startsWith("--discern-font-weight-")
    ? { fontWeight: value }
    : token.name.startsWith("--discern-leading-")
    ? { lineHeight: value }
    : token.name === "--discern-font-features-ui"
    ? { fontFeatureSettings: value }
    : { fontFamily: value };
  return (
    <div className="discern-catalogue-token-preview discern-catalogue-token-preview--type">
      <span style={style}>Sphinx of black quartz, judge my vow.</span>
    </div>
  );
}

function ScalePreview({ token }: { readonly token: FoundationToken }) {
  return (
    <div className="discern-catalogue-token-preview discern-catalogue-token-preview--scale">
      <span className="discern-catalogue-token-preview__scale-track">
        <span
          style={previewVariable(
            "--discern-catalogue-token-scale",
            `var(${token.name})`,
          )}
        />
      </span>
      <span>Shared scale</span>
    </div>
  );
}

function ShapePreview({ token }: { readonly token: FoundationToken }) {
  const values = isThemed(token)
    ? [{ label: "Light", value: token.light }, {
      label: "Dark",
      value: token.dark,
    }]
    : [{ label: "Value", value: `var(${token.name})` }];
  return (
    <div
      className="discern-catalogue-token-preview discern-catalogue-token-preview--shape"
      data-discern-token-preview-values={isThemed(token) ? "themed" : "single"}
    >
      {values.map(({ label, value }) => (
        <div key={label}>
          <span
            style={token.name.includes("radius")
              ? { borderRadius: value }
              : { boxShadow: value }}
          />
          <small>{label}</small>
        </div>
      ))}
    </div>
  );
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof globalThis.matchMedia === "function" &&
    globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    if (typeof globalThis.matchMedia !== "function") return;
    const query = globalThis.matchMedia("(prefers-reduced-motion: reduce)");
    const change = (event: MediaQueryListEvent): void =>
      setReduced(event.matches);
    setReduced(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  return reduced;
}

function MotionPreview({ token }: { readonly token: FoundationToken }) {
  const reduced = useReducedMotion();
  const [replaying, setReplaying] = useState(false);
  if (isThemed(token)) {
    return (
      <div
        className="discern-catalogue-token-preview discern-catalogue-token-preview--motion-themed"
        data-discern-token-preview-values="themed"
      >
        <span style={{ opacity: Number(token.light) }}>Light</span>
        <span style={{ opacity: Number(token.dark) }}>Dark</span>
      </div>
    );
  }
  const motionStyle = token.name.includes("duration")
    ? previewVariable(
      "--discern-catalogue-motion-duration",
      `var(${token.name})`,
    )
    : token.name.includes("ease")
    ? previewVariable(
      "--discern-catalogue-motion-easing",
      `var(${token.name})`,
    )
    : undefined;
  return (
    <div className="discern-catalogue-token-preview discern-catalogue-token-preview--motion">
      <span className="discern-catalogue-token-preview__motion-track">
        <span
          data-replaying={replaying ? "" : undefined}
          style={motionStyle}
          onAnimationEnd={() => setReplaying(false)}
        />
      </span>
      <button
        type="button"
        disabled={reduced}
        onClick={() => setReplaying(true)}
      >
        {reduced ? "Reduced motion is on" : "Replay motion"}
      </button>
    </div>
  );
}

export function TokenPreview({ token }: { readonly token: FoundationToken }) {
  switch (token.category) {
    case "Color":
      return <ColorPreview token={token} />;
    case "Typography":
      return <TypographyPreview token={token} />;
    case "Spacing":
    case "Layout":
      return <ScalePreview token={token} />;
    case "Shape":
      return <ShapePreview token={token} />;
    case "Motion":
      return <MotionPreview token={token} />;
  }
}

function TokenFacts({ token }: { readonly token: FoundationToken }) {
  const values = isThemed(token)
    ? [{ label: "Light value", value: token.light }, {
      label: "Dark value",
      value: token.dark,
    }]
    : [{ label: "Authored value", value: token.value }];
  return (
    <details className="discern-catalogue-token__facts">
      <summary>Values and copy actions</summary>
      <div>
        <p>{tokenSource(token)}</p>
        <div>
          <span>Custom property</span>
          <code>{token.name}</code>
          <CopyButton
            value={token.name}
            label="Copy custom property name"
            copiedLabel="Custom property name copied"
          />
        </div>
        {values.map(({ label, value }) => (
          <div key={label}>
            <span>{label}</span>
            <code className="discern-catalogue-token__value">{value}</code>
            <CopyButton
              value={value}
              label={`Copy ${label.toLowerCase()}`}
              copiedLabel={`${label} copied`}
            />
          </div>
        ))}
      </div>
    </details>
  );
}

function TokenCard({ token }: { readonly token: FoundationToken }) {
  return (
    <article
      className="discern-catalogue-token"
      id={foundationTokenFragment(token.name)}
      data-discern-token={token.name}
      data-discern-token-category={token.category}
    >
      <TokenPreview token={token} />
      <div className="discern-catalogue-token__body">
        <span>{token.category}</span>
        <code>{token.name}</code>
        <p>{token.description}</p>
        <TokenFacts token={token} />
      </div>
    </article>
  );
}

function useExplorerState(
  initialUrl: URL,
  tokens: readonly FoundationToken[],
) {
  const [state, setState] = useState(() =>
    foundationTokenExplorerState(initialUrl, tokens)
  );
  useEffect(() => {
    const restore = (): void => {
      setState(foundationTokenExplorerState(
        new URL(globalThis.location.href),
        tokens,
      ));
    };
    globalThis.addEventListener("popstate", restore);
    return () => globalThis.removeEventListener("popstate", restore);
  }, [tokens]);
  const update = (next: typeof state): void => {
    setState(next);
    const current = typeof document === "undefined"
      ? initialUrl
      : new URL(globalThis.location.href);
    const url = foundationTokenExplorerUrl(current, next);
    globalThis.history?.replaceState(null, "", `${url.pathname}${url.search}`);
  };
  return [state, update] as const;
}

function CategoryControls(
  { categories, selected, onSelect }: {
    readonly categories: readonly TokenCategory[];
    readonly selected: TokenCategory | undefined;
    readonly onSelect: (category: TokenCategory | undefined) => void;
  },
) {
  return (
    <div
      className="discern-catalogue-token-categories"
      role="group"
      aria-label="Filter Tokens by category"
    >
      <button
        type="button"
        aria-pressed={selected === undefined}
        onClick={() => onSelect(undefined)}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          type="button"
          aria-pressed={selected === category}
          onClick={() => onSelect(category)}
          key={category}
        >
          {category}
        </button>
      ))}
    </div>
  );
}

function TokenExplorer(
  { url, tokens }: {
    readonly url: URL;
    readonly tokens: readonly FoundationToken[];
  },
) {
  const categories = foundationTokenCategories(tokens);
  const [state, update] = useExplorerState(url, tokens);
  const matching = matchingFoundationTokens(tokens, state);
  const clear = (): void => update({ query: "" });
  return (
    <div
      className="discern-catalogue-page"
      data-discern-foundations-page="tokens"
    >
      <a
        className="discern-catalogue-foundations__back"
        href={foundationsPaths.index}
      >
        ← Foundations
      </a>
      <CataloguePageHeader
        index="03"
        eyebrow="Foundations"
        title="Tokens"
        description="Find a value by name or recognise it from its preview."
      />
      <form
        className="discern-catalogue-token-controls"
        role="search"
        onSubmit={(event: FormEvent) => event.preventDefault()}
      >
        <label htmlFor="discern-catalogue-token-search">
          Search Tokens
          <input
            id="discern-catalogue-token-search"
            type="search"
            value={state.query}
            placeholder="Name, category, description, or value"
            autoComplete="off"
            onChange={(event) =>
              update({ ...state, query: event.target.value })}
          />
        </label>
        <CategoryControls
          categories={categories}
          selected={state.category}
          onSelect={(category) =>
            update(
              category === undefined
                ? { query: state.query }
                : { ...state, category },
            )}
        />
        <button
          className="discern-catalogue-token-controls__clear"
          type="button"
          disabled={state.query === "" && state.category === undefined}
          onClick={clear}
        >
          Clear search and filters
        </button>
      </form>
      <div className="discern-catalogue-results-header">
        <h2>Token results</h2>
        <p aria-label="Token result count" aria-live="polite">
          {matching.length} {matching.length === 1 ? "Token" : "Tokens"}
        </p>
      </div>
      {matching.length === 0
        ? (
          <div className="discern-catalogue-token-empty" role="status">
            <h3>No Tokens found</h3>
            <p>Try another word or show every category.</p>
            <button type="button" onClick={clear}>Show all Tokens</button>
          </div>
        )
        : (
          <div className="discern-catalogue-token-grid" id="token-results">
            {matching.map((token) => (
              <TokenCard token={token} key={token.name} />
            ))}
          </div>
        )}
    </div>
  );
}

function FoundationsIndex(
  { terminalTheme, tokens, sheets }: {
    readonly terminalTheme: TerminalThemeVariant;
    readonly tokens: readonly FoundationToken[];
    readonly sheets: readonly TerminalFoundationSheet[];
  },
) {
  const firstSheet = sheets[0];
  const firstSpecimen = firstSheet?.specimens(catalogueCliCapabilities, {
    theme: terminalTheme,
  })[0];
  return (
    <div
      className="discern-catalogue-page"
      data-discern-foundations-page="index"
    >
      <CataloguePageHeader
        index="03"
        eyebrow="Foundations"
        title="Foundations"
        description="Choose the visual language or its terminal primitives."
      />
      <div className="discern-catalogue-foundations-index">
        <a href={foundationsPaths.tokens}>
          <div
            className="discern-catalogue-foundations-index__tokens"
            aria-hidden="true"
          >
            <span />
            <strong>Aa</strong>
            <i />
          </div>
          <h2>Tokens</h2>
          <p>Colour, type, scale, shape, and motion.</p>
          <small>{tokens.length} Tokens</small>
        </a>
        <a href={foundationsPaths.terminal}>
          <div className="discern-catalogue-foundations-index__terminal">
            {firstSheet === undefined || firstSpecimen === undefined
              ? null
              : (
                <CliOutputPreview
                  value={firstSpecimen.output}
                  label={`${firstSheet.title} preview`}
                  theme={terminalTheme}
                />
              )}
          </div>
          <h2>Terminal foundations</h2>
          <p>Motifs and narration primitives.</p>
          <small>{sheets.length} sheets</small>
        </a>
      </div>
    </div>
  );
}

function TerminalFoundationsIndex(
  { terminalTheme, sheets }: {
    readonly terminalTheme: TerminalThemeVariant;
    readonly sheets: readonly TerminalFoundationSheet[];
  },
) {
  return (
    <div
      className="discern-catalogue-page"
      data-discern-foundations-page="terminal-index"
    >
      <a
        className="discern-catalogue-foundations__back"
        href={foundationsPaths.index}
      >
        ← Foundations
      </a>
      <CataloguePageHeader
        index="03"
        eyebrow="Foundations"
        title="Terminal foundations"
        description="Motifs and narration primitives; Terminal layouts are composed full frames."
      />
      <div className="discern-catalogue-terminal-foundation-gallery">
        {sheets.map((sheet) => {
          const specimens = sheet.specimens(catalogueCliCapabilities, {
            theme: terminalTheme,
          });
          const representative = specimens[0];
          return (
            <a
              href={catalogueTerminalFoundationPath(sheet.id)}
              data-discern-terminal-foundation-card={sheet.id}
              key={sheet.id}
            >
              {representative === undefined ? null : (
                <CliOutputPreview
                  value={representative.output}
                  label={`${sheet.title} preview`}
                  theme={terminalTheme}
                />
              )}
              <div>
                <h2>{sheet.title}</h2>
                <p>{sheet.description}</p>
                <small>{specimens.length} specimens</small>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function TerminalFoundationDetail(
  { sheet, sheets, terminalTheme }: {
    readonly sheet: TerminalFoundationSheet;
    readonly sheets: readonly TerminalFoundationSheet[];
    readonly terminalTheme: TerminalThemeVariant;
  },
) {
  const index = sheets.indexOf(sheet);
  const previous = index > 0 ? sheets[index - 1] : undefined;
  const next = index >= 0 && index < sheets.length - 1
    ? sheets[index + 1]
    : undefined;
  return (
    <div
      className="discern-catalogue-page"
      data-discern-foundations-page="terminal-detail"
    >
      <a
        className="discern-catalogue-foundations__back"
        href={foundationsPaths.index}
      >
        ← Foundations
      </a>
      <CataloguePageHeader
        index="03"
        eyebrow="Terminal foundations"
        title={sheet.title}
        description={sheet.description}
      />
      <TerminalFoundationPreview sheet={sheet} theme={terminalTheme} />
      <nav
        className="discern-catalogue-terminal-foundation__pager"
        aria-label="Terminal foundation sheets"
      >
        {previous === undefined
          ? <span />
          : (
            <a href={catalogueTerminalFoundationPath(previous.id)}>
              ← {previous.title}
            </a>
          )}
        <a href={foundationsPaths.terminal}>All terminal foundations</a>
        {next === undefined
          ? <span />
          : (
            <a href={catalogueTerminalFoundationPath(next.id)}>
              {next.title} →
            </a>
          )}
      </nav>
    </div>
  );
}

export interface FoundationsPageProps {
  readonly terminalTheme: TerminalThemeVariant;
  readonly url?: URL;
  readonly tokens?: readonly FoundationToken[];
  readonly sheets?: readonly TerminalFoundationSheet[];
}

export function FoundationsPage(
  {
    terminalTheme,
    url = new URL(globalThis.location.href),
    tokens = allTokens,
    sheets = terminalFoundationSheets,
  }: FoundationsPageProps,
) {
  const pathname = url.pathname.endsWith("/")
    ? url.pathname
    : `${url.pathname}/`;
  const route = foundationsRouteFamily.match(pathname);
  if (route?.family !== "foundations" || route.page === "index") {
    return (
      <FoundationsIndex
        terminalTheme={terminalTheme}
        tokens={tokens}
        sheets={sheets}
      />
    );
  }
  if (route.page === "tokens") {
    return <TokenExplorer url={url} tokens={tokens} />;
  }
  if (route.page === "terminal-index") {
    return (
      <TerminalFoundationsIndex terminalTheme={terminalTheme} sheets={sheets} />
    );
  }
  const sheet = sheets.find(({ id }) => id === route.sheetId);
  return sheet === undefined
    ? (
      <div
        className="discern-catalogue-page"
        data-discern-foundations-page="missing"
      >
        <CataloguePageHeader
          index="03"
          eyebrow="Foundations"
          title="Foundation not found"
          description="Return to the registered terminal foundations."
        />
        <a href={foundationsPaths.terminal}>View terminal foundations</a>
      </div>
    )
    : (
      <TerminalFoundationDetail
        sheet={sheet}
        sheets={sheets}
        terminalTheme={terminalTheme}
      />
    );
}
