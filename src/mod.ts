/**
 * Framework-neutral core of the Discern design system: token metadata,
 * component and group metadata types, every Component's authored Metadata
 * with the Markdown author guide generated from it, the package ownership
 * manifest, and the {@linkcode semanticClass} helper for hand-authored
 * semantic HTML. Importing this module never resolves React.
 *
 * @module
 */
export * from "./component-metadata.ts";
export * from "./manifest.ts";
export * from "./runtime-assets.ts";
export * from "./semantic-class.ts";
export * from "./tokens/tokens.ts";
export * from "./types/component-meta.ts";
