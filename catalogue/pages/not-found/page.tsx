import { catalogueRoutePaths } from "../../routes.ts";
import { CataloguePageHeader } from "../shared.tsx";

export function NotFoundPage() {
  return (
    <div className="discern-catalogue-page">
      <CataloguePageHeader
        index="404"
        eyebrow="Not found"
        title="That Catalogue destination does not exist."
        description="Find a Component, browse Glyphs, or return to the Catalogue overview."
      />
      <a className="discern-button" href={catalogueRoutePaths.components}>
        Find a Component
      </a>
      <a className="discern-button" href={catalogueRoutePaths.glyphs}>
        Browse Glyphs
      </a>
    </div>
  );
}
