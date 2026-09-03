import type { CatalogueRoute } from "../../routes.ts";
import {
  type GlyphCatalogueData,
  glyphCatalogueEntries,
  glyphCatalogueEntryFromSlug,
} from "../../routes.ts";
import { NotFoundPage } from "../not-found/page.tsx";
import { GlyphDetailPage } from "./detail-page.tsx";
import { GlyphIndexPage } from "./index-page.tsx";

export function GlyphsPage(
  {
    route,
    data,
    currentUrl,
  }: {
    readonly route: Extract<CatalogueRoute, { readonly family: "glyphs" }>;
    readonly data: GlyphCatalogueData;
    readonly currentUrl: URL;
  },
) {
  if (route.page === "index") {
    return <GlyphIndexPage data={data} currentUrl={currentUrl} />;
  }
  const entry = glyphCatalogueEntryFromSlug(data, route.slug);
  return entry === undefined ? <NotFoundPage /> : (
    <GlyphDetailPage
      entry={entry}
      entries={glyphCatalogueEntries(data)}
      currentUrl={currentUrl}
    />
  );
}
