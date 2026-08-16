/**
 * Prop-control derivation: turns the catalogue registry's machine-extracted
 * prop documentation and literal-union variants into typed inspector controls
 * and default configurations for newly placed components.
 */
import type {
  CatalogueObjectType,
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
  /** Exported object interfaces by name, for typeRef props that hold structures. */
  readonly objectTypes?: ReadonlyMap<string, CatalogueObjectType>;
}

interface ControlBase {
  readonly name: string;
  readonly label: string;
  readonly required: boolean;
  readonly typeText: string;
  readonly description?: string;
}

/** The known object structure behind a json control, for form editing. */
export interface JsonShape {
  /** True when the prop holds an array of the object, not a single one. */
  readonly list: boolean;
  readonly typeName: string;
  /** One editable control per member of the object type. */
  readonly members: readonly PropControl[];
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
  | (ControlBase & { readonly control: "json"; readonly shape?: JsonShape });

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
    (source.objectTypes?.has(typeText) ?? false);
}

/**
 * The form structure of a json control whose type resolves to a known
 * object interface, directly or as an array of it. Member controls derive
 * without object-type knowledge so recursive shapes stay raw JSON.
 */
function jsonShape(
  typeText: string,
  source: ControlSource,
): JsonShape | undefined {
  if (source.objectTypes === undefined) return undefined;
  const listMatch = /^(?:readonly\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\[\]$/.exec(
    typeText,
  );
  const typeName = listMatch?.[1] ?? typeText;
  const objectType = source.objectTypes.get(typeName);
  if (objectType === undefined) return undefined;
  const memberSource: ControlSource = {
    reactExport: source.reactExport,
    propDocumentation: source.propDocumentation,
    variants: source.variants,
    ...(source.sharedVariants === undefined
      ? {}
      : { sharedVariants: source.sharedVariants }),
  };
  const members = objectType.props.flatMap((prop) => {
    // JSON holds no React nodes; node-typed members edit as plain text.
    const memberType =
      prop.type === "ReactNode" || /^ReactElement\b/.test(prop.type)
        ? "string"
        : prop.type;
    const control = controlFor(
      prop.name,
      memberType,
      prop.required,
      memberSource,
      prop.description,
    );
    return control === undefined ? [] : [control];
  });
  if (members.length === 0) return undefined;
  return { list: listMatch !== null, typeName, members };
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
  if (looksStructural(typeText, source)) {
    const shape = jsonShape(typeText, source);
    return {
      ...base,
      control: "json",
      ...(shape === undefined ? {} : { shape }),
    };
  }
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
