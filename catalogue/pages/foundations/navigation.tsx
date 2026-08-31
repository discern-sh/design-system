import { DocsNav } from "../../../src/components/docs/docs-nav/docs-nav.tsx";
import type { DocsNavItem } from "../../../src/components/docs/docs-nav/docs-nav.tsx";
import { allTokens } from "../../../src/tokens/tokens.ts";
import {
  catalogueTerminalFoundationPath,
  foundationsPaths,
  foundationTokenCategories,
  foundationTokenCategoryPath,
  foundationTokenExplorerState,
} from "../../routes/foundations.ts";
import type { CatalogueRoute } from "../../routes/types.ts";
import type { TerminalFoundationSheet } from "../../terminal-foundations.ts";
import { terminalFoundationSheets } from "../../terminal-foundations.ts";
import type {
  CatalogueNavigationSections,
  LocalNavigationProps,
} from "../navigation-types.ts";

interface FoundationsNavigationContentProps {
  readonly route: Extract<CatalogueRoute, { readonly family: "foundations" }>;
  readonly url: URL;
  readonly onNavigate: () => void;
  readonly sheets: readonly TerminalFoundationSheet[];
}

function navigationItem(
  href: string,
  label: string,
  current = false,
): DocsNavItem {
  return { label, href, current: current ? "location" : false };
}

function sourceBackedSections(
  { route, url, sheets }: Omit<FoundationsNavigationContentProps, "onNavigate">,
): CatalogueNavigationSections {
  if (route.page === "index") {
    return [{
      title: "Explore",
      items: [
        navigationItem(foundationsPaths.tokens, "Tokens"),
        navigationItem(
          foundationsPaths.terminal,
          "Terminal foundations",
        ),
      ],
    }];
  }
  if (route.page === "tokens") {
    const state = foundationTokenExplorerState(url, allTokens);
    return [
      {
        items: [navigationItem(foundationsPaths.index, "← Foundations")],
      },
      {
        title: "Token categories",
        items: [
          navigationItem(
            foundationsPaths.tokens,
            "All",
            state.category === undefined,
          ),
          ...foundationTokenCategories(allTokens).map((category) =>
            navigationItem(
              foundationTokenCategoryPath(category),
              category,
              state.category === category,
            )
          ),
        ],
      },
    ];
  }
  return [
    {
      items: [navigationItem(foundationsPaths.index, "← Foundations")],
    },
    {
      title: "Terminal foundations",
      items: [
        navigationItem(
          foundationsPaths.terminal,
          "All sheets",
          route.page === "terminal-index",
        ),
        ...sheets.map((sheet) =>
          navigationItem(
            catalogueTerminalFoundationPath(sheet.id),
            sheet.title,
            route.page === "terminal-detail" && route.sheetId === sheet.id,
          )
        ),
      ],
    },
  ];
}

/** Source-backed Foundations destinations projected into the shared DocsNav. */
export function foundationsNavigationSections(
  { route, url }: LocalNavigationProps,
): CatalogueNavigationSections {
  if (route.family !== "foundations") return [];
  return sourceBackedSections({ route, url, sheets: terminalFoundationSheets });
}

/** Standalone projection retained for source-enrolment tests. */
export function FoundationsNavigationContent(
  props: FoundationsNavigationContentProps,
) {
  return (
    <DocsNav
      sections={sourceBackedSections(props)}
      onClick={props.onNavigate}
    />
  );
}
