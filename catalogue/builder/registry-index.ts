/**
 * Compatibility entrypoint for existing Builder imports. New feature code
 * imports the stable core or its discovery/inspector projection directly.
 */
export {
  builderObjectTypes,
  builderSharedVariants,
  componentBySlug,
  componentEntries,
  documentPolicy,
  entryBySlug,
  exportNaming,
  instantiateComponent,
  knownSlugs,
  modeledPropsBySlug,
  registryCoreBySlug,
  registryCoreEntries,
  requiredFunctionPropsBySlug,
  reservedPropsBySlug,
} from "./registry-core.ts";
export {
  controlsBySlug,
  inspectorControlBySlug,
  inspectorControlRecords,
} from "./inspector/registry.ts";
