import type { RegistryEntry } from "../generated/registry.ts";
import type { CatalogueRoute } from "../routes.ts";

export interface LocalNavigationProps {
  readonly route: CatalogueRoute;
  readonly url: URL;
  readonly sortedComponents: readonly RegistryEntry[];
  readonly onNavigate: () => void;
}
