/**
 * Framework-neutral manifest schema and the complete package ownership
 * manifest: which components exist, which browser behaviors, classes, and
 * public tokens each owns, and the shape of the `manifest.json` every runtime
 * emission writes.
 * Consumer guards read this instead of scanning package source.
 *
 * @module
 */
import { componentRegistry } from "./generated/component-registry.ts";
import { allTokens } from "./tokens/tokens.ts";
import {
  type ComponentBehavior,
  type ComponentGroup,
  componentGroups,
} from "./types/component-meta.ts";
import type { RuntimeAssetSelection } from "./runtime-assets.ts";

/** Schema version stamped into every emitted `manifest.json`. */
export const RUNTIME_MANIFEST_SCHEMA_VERSION = 2 as const;

/** One component's identity, dependencies, behaviors, and CSS-ownership facts. */
export interface ManifestComponent {
  readonly id: string;
  readonly name: string;
  readonly group: ComponentGroup;
  readonly dependencies: readonly string[];
  readonly behaviors: readonly ComponentBehavior[];
  readonly ownedClasses: readonly string[];
  readonly publicTokenNames: readonly string[];
}

/** One canonical component group and its member component ids. */
export interface ManifestGroup {
  readonly name: ComponentGroup;
  readonly components: readonly string[];
}

/** Size, media type, and SHA-256 integrity facts for one emitted file. */
export interface IntegrityFile {
  readonly path: string;
  readonly bytes: number;
  readonly integrity: `sha256:${string}`;
  readonly mediaType: string;
}

/** Shape of the `manifest.json` written beside every emitted runtime. */
export interface RuntimeManifest {
  readonly schemaVersion: typeof RUNTIME_MANIFEST_SCHEMA_VERSION;
  readonly package: "@discern-sh/design-system";
  readonly selection: {
    readonly all: boolean;
    readonly requestedComponents: readonly string[];
    readonly requestedGroups: readonly ComponentGroup[];
    readonly resolvedComponents: readonly string[];
    readonly assets: readonly RuntimeAssetSelection[];
    readonly theme: "discern" | "none";
  };
  readonly groups: readonly ManifestGroup[];
  readonly components: readonly ManifestComponent[];
  readonly publicTokenNames: readonly string[];
  readonly outputs: {
    readonly css: "discern.css";
    readonly manifest: "manifest.json";
    readonly scripts: readonly string[];
    readonly assets: readonly string[];
  };
  readonly integrity: {
    readonly algorithm: "sha256";
    readonly files: readonly IntegrityFile[];
  };
}

/** Shape of the package-identity manifest exported to consumers. */
export interface PackageManifest {
  readonly schemaVersion: typeof RUNTIME_MANIFEST_SCHEMA_VERSION;
  readonly package: "@discern-sh/design-system";
  readonly groups: readonly ManifestGroup[];
  readonly components: readonly ManifestComponent[];
  readonly publicTokenNames: readonly string[];
}

/** Package identity and ownership facts without catalogue descriptions or React. */
export const packageManifest: PackageManifest = {
  schemaVersion: RUNTIME_MANIFEST_SCHEMA_VERSION,
  package: "@discern-sh/design-system",
  groups: componentGroups.map((name) => ({
    name,
    components: componentRegistry.filter((entry) => entry.meta.group === name)
      .map((entry) => entry.meta.slug),
  })),
  components: componentRegistry.map((entry) => ({
    id: entry.meta.slug,
    name: entry.meta.name,
    group: entry.meta.group,
    dependencies: entry.dependencies,
    behaviors: entry.behaviors,
    ownedClasses: entry.ownedClasses,
    publicTokenNames: entry.publicTokenNames,
  })),
  publicTokenNames: allTokens.map((token) => token.name),
};
