import { allTokens } from "../../../src/tokens/tokens.ts";
import { terminalFoundationSheets } from "../../terminal-foundations.ts";
import { slugify } from "../../routes/foundations.ts";
import type { LocalNavigationProps } from "../navigation-types.ts";

export function FoundationsNavigation(
  { route, url, onNavigate }: LocalNavigationProps,
) {
  if (route.family !== "foundations") return null;
  const categories = [...new Set(allTokens.map(({ category }) => category))];
  return (
    <>
      <span className="discern-catalogue-nav__heading">On this page</span>
      {categories.map((category) => {
        const hash = `#tokens-${slugify(category)}`;
        return (
          <a
            className="discern-catalogue-nav__child"
            href={hash}
            aria-current={url.hash === hash ? "location" : undefined}
            onClick={onNavigate}
            key={category}
          >
            {category}
          </a>
        );
      })}
      {terminalFoundationSheets.map((sheet) => {
        const hash = `#terminal-foundation-${sheet.id}`;
        return (
          <a
            className="discern-catalogue-nav__child"
            href={hash}
            aria-current={url.hash === hash ? "location" : undefined}
            onClick={onNavigate}
            key={sheet.id}
          >
            {sheet.title}
          </a>
        );
      })}
    </>
  );
}
