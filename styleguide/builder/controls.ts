/**
 * Prop-control derivation: turns the catalogue registry's machine-extracted
 * prop documentation and literal-union variants into typed inspector controls
 * and default configurations for newly placed components.
 */
import type {
  CataloguePropDocumentation,
  CatalogueVariant,
} from "../conformance.ts";
import type { BuilderNode, BuilderPropValue } from "./model.ts";
import { newChildId } from "./model.ts";

/** The registry facts control derivation reads for one component. */
export interface ControlSource {
  readonly reactExport: string;
  readonly propDocumentation: CataloguePropDocumentation;
  readonly variants: readonly CatalogueVariant[];
  /** Variants from every catalogue entry, for unions imported across components. */
  readonly sharedVariants?: readonly CatalogueVariant[];
  /** Exported object interface names, for typeRef props that hold structures. */
  readonly objectTypeNames?: ReadonlySet<string>;
}

interface ControlBase {
  readonly name: string;
  readonly label: string;
  readonly required: boolean;
  readonly typeText: string;
  readonly description?: string;
}

/** One editable prop rendered by the inspector. */
export type PropControl =
  | (ControlBase & { readonly control: "text" })
  | (ControlBase & { readonly control: "number" })
  | (ControlBase & { readonly control: "toggle" })
  | (ControlBase & {
    readonly control: "select";
    readonly options: readonly (string | number)[];
  })
  | (ControlBase & {
    readonly control: "slot";
    /** True when the prop demands a component child, never literal text. */
    readonly elementOnly: boolean;
  })
  | (ControlBase & { readonly control: "json" });

function labelFor(name: string): string {
  const spaced = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .toLowerCase();
  return spaced.slice(0, 1).toUpperCase() + spaced.slice(1);
}

function literalUnionOptions(
  typeText: string,
): readonly (string | number)[] | undefined {
  const members = typeText.split(" | ");
  if (members.length < 2) return undefined;
  const options: (string | number)[] = [];
  for (const member of members) {
    if (/^"(?:[^"\\]|\\.)*"$/.test(member)) {
      options.push(JSON.parse(member) as string);
    } else if (/^-?\d+(?:\.\d+)?$/.test(member)) {
      options.push(Number(member));
    } else {
      return undefined;
    }
  }
  return options;
}

function isFunctionType(typeText: string): boolean {
  return typeText.includes("=>");
}

function isEventHandlerName(name: string): boolean {
  return /^on[A-Z]/.test(name);
}

function looksStructural(typeText: string, source: ControlSource): boolean {
  return typeText.includes("[]") || typeText.includes("{") ||
    typeText.includes("<") || typeText.startsWith("readonly ") ||
    typeText === "CSSProperties" ||
    (source.objectTypeNames?.has(typeText) ?? false);
}

function variantNamed(
  typeText: string,
  source: ControlSource,
): CatalogueVariant | undefined {
  return source.variants.find(({ typeName }) => typeName === typeText) ??
    source.sharedVariants?.find(({ typeName }) => typeName === typeText);
}

function controlFor(
  name: string,
  typeText: string,
  required: boolean,
  source: ControlSource,
  description?: string,
): PropControl | undefined {
  if (isEventHandlerName(name) || isFunctionType(typeText)) return undefined;
  const base = {
    name,
    label: labelFor(name),
    required,
    typeText,
    ...(description === undefined ? {} : { description }),
  };
  if (typeText === "ReactNode") {
    return { ...base, control: "slot", elementOnly: false };
  }
  if (/^ReactElement\b/.test(typeText)) {
    return { ...base, control: "slot", elementOnly: true };
  }
  if (typeText === "boolean" || typeText === "true | false") {
    return { ...base, control: "toggle" };
  }
  if (typeText === "string") return { ...base, control: "text" };
  if (typeText === "number") return { ...base, control: "number" };
  const literalOptions = literalUnionOptions(typeText);
  if (literalOptions !== undefined) {
    return { ...base, control: "select", options: literalOptions };
  }
  const variant = variantNamed(typeText, source);
  if (variant !== undefined) {
    return {
      ...base,
      control: "select",
      options: variant.values.map((value) =>
        /^-?\d+(?:\.\d+)?$/.test(value) ? Number(value) : value
      ),
    };
  }
  if (looksStructural(typeText, source)) return { ...base, control: "json" };
  return { ...base, control: "text" };
}

function variantPropName(
  typeName: string,
  reactExport: string,
): string | undefined {
  if (!typeName.startsWith(reactExport)) return undefined;
  const rest = typeName.slice(reactExport.length);
  if (!/^[A-Z][A-Za-z]*$/.test(rest)) return undefined;
  return rest.slice(0, 1).toLowerCase() + rest.slice(1);
}

/**
 * Controls for a component whose props type is a source union: the shared
 * surface is reconstructed from its variant type aliases plus the children
 * slot every such component accepts; anything further enters as extra props.
 */
function fallbackControls(source: ControlSource): readonly PropControl[] {
  const variantControls = source.variants.flatMap((variant) => {
    const name = variantPropName(variant.typeName, source.reactExport);
    if (name === undefined) return [];
    const control = controlFor(name, variant.typeName, false, source);
    return control === undefined ? [] : [control];
  });
  return [
    ...variantControls,
    {
      name: "children",
      label: "Children",
      required: true,
      typeText: "ReactNode",
      control: "slot",
      elementOnly: false,
    },
  ];
}

/** Derive the inspector controls for one component. */
export function deriveControls(source: ControlSource): readonly PropControl[] {
  if (source.propDocumentation.status === "unavailable") {
    return fallbackControls(source);
  }
  return source.propDocumentation.props.flatMap((prop) => {
    const control = controlFor(
      prop.name,
      prop.type,
      prop.required,
      source,
      prop.description,
    );
    return control === undefined ? [] : [control];
  });
}

function defaultScalar(control: PropControl): BuilderPropValue | undefined {
  switch (control.control) {
    case "select": {
      const first = control.options[0];
      if (first === undefined) return undefined;
      return typeof first === "number"
        ? { kind: "number", value: first }
        : { kind: "string", value: first };
    }
    case "text":
      return { kind: "string", value: "Text" };
    case "number":
      return { kind: "number", value: 0 };
    case "toggle":
      return { kind: "boolean", value: false };
    case "json":
      return {
        kind: "json",
        source: control.typeText.includes("[]") ? "[]" : "{}",
      };
    case "slot":
      return control.elementOnly ? { kind: "slot", children: [] } : {
        kind: "slot",
        children: [{ kind: "text", id: newChildId(), text: "Text" }],
      };
  }
}

/** Configured values for every required control; optional props stay unset. */
export function defaultProps(
  controls: readonly PropControl[],
): Record<string, BuilderPropValue> {
  const props: Record<string, BuilderPropValue> = {};
  for (const control of controls) {
    if (!control.required) continue;
    const value = defaultScalar(control);
    if (value !== undefined) props[control.name] = value;
  }
  return props;
}

/** A freshly placed instance of a component with its required defaults. */
export function createNode(slug: string, source: ControlSource): BuilderNode {
  return {
    kind: "component",
    id: newChildId(),
    slug,
    props: defaultProps(deriveControls(source)),
  };
}
