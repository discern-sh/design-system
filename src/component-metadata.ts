/**
 * Public Component Metadata and the Markdown author guide generated from it.
 * Both derive from each Component's `*.meta.ts` authority — the same facts
 * that generate the Runtime Registry, React adapter, terminal renderers, and
 * Catalogue — and neither carries registry CSS or React.
 *
 * @module
 */
import {
  componentAuthorGuide as generatedComponentAuthorGuide,
  componentMetadata as generatedComponentMetadata,
} from "./generated/component-metadata.ts";
import type { ComponentMeta } from "./types/component-meta.ts";

/** Authored Metadata for every built-in Component, in Catalogue order. */
export const componentMetadata: readonly ComponentMeta[] = Object.freeze(
  [...generatedComponentMetadata],
);

/** Markdown author guidance generated from the same Component Metadata. */
export const componentAuthorGuide: string = generatedComponentAuthorGuide;
