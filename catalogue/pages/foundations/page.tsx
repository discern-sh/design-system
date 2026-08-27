import type { TerminalThemeVariant } from "../../../src/cli/theme.ts";
import { allTokens } from "../../../src/tokens/tokens.ts";
import { TerminalFoundationPreview } from "../../terminal-foundation-preview.tsx";
import { terminalFoundationSheets } from "../../terminal-foundations.ts";
import { slugify } from "../../routes/foundations.ts";
import { CataloguePageHeader } from "../shared.tsx";

function TokenPreview(
  { name, category }: { readonly name: string; readonly category: string },
) {
  if (category === "Color") {
    return (
      <span
        className="discern-catalogue-token__swatch"
        style={{ background: `var(${name})` }}
      />
    );
  }
  if (category === "Typography") {
    return (
      <span
        className="discern-catalogue-token__type"
        style={/^--discern-font-(?:display|body|mono|ui)$/.test(name)
          ? { fontFamily: `var(${name})` }
          : undefined}
      >
        {name === "--discern-font-mono" ? "discern" : "Aa"}
      </span>
    );
  }
  if (category === "Spacing" || category === "Layout") {
    return (
      <span
        className="discern-catalogue-token__space"
        style={{ width: `min(var(${name}), 100%)` }}
      />
    );
  }
  if (category === "Shape") {
    return (
      <span
        className="discern-catalogue-token__shape"
        style={name.includes("radius")
          ? { borderRadius: `var(${name})` }
          : { boxShadow: `var(${name})` }}
      />
    );
  }
  const isDuration = name.includes("duration");
  return (
    <span className="discern-catalogue-token__motion">
      <span
        style={isDuration
          ? { animationDuration: `var(${name})` }
          : { animationTimingFunction: `var(${name})` }}
      />
    </span>
  );
}

export function FoundationsPage(
  { terminalTheme }: { readonly terminalTheme: TerminalThemeVariant },
) {
  const tokenCategories = [
    ...new Set(allTokens.map(({ category }) => category)),
  ];
  return (
    <div className="discern-catalogue-page" id="foundations">
      <CataloguePageHeader
        index="03"
        eyebrow="Foundations"
        title="One value, every surface."
        description="Explore public Tokens and the terminal foundations they support."
      />
      {tokenCategories.map((category) => {
        const categoryTokens = allTokens.filter((token) =>
          token.category === category
        );
        return (
          <section
            className="discern-catalogue-subsection"
            id={`tokens-${slugify(category)}`}
            key={category}
          >
            <div className="discern-catalogue-subsection__heading">
              <h2>{category}</h2>
              <span>{categoryTokens.length}</span>
            </div>
            <div className="discern-catalogue-token-grid">
              {categoryTokens.map((token) => (
                <article className="discern-catalogue-token" key={token.name}>
                  <TokenPreview name={token.name} category={token.category} />
                  <div>
                    <code>{token.name}</code>
                    <p>{token.description}</p>
                    <code className="discern-catalogue-token__value">
                      {"light" in token
                        ? `${token.light} / ${token.dark}`
                        : token.value}
                    </code>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
      {terminalFoundationSheets.map((sheet) => (
        <TerminalFoundationPreview
          sheet={sheet}
          theme={terminalTheme}
          key={sheet.id}
        />
      ))}
    </div>
  );
}
