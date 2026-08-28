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
import type {
  BuilderNode,
  BuilderPropValue,
  BuilderSlotChild,
} from "./model.ts";
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

export const INSPECTOR_SECTIONS = [
  "Content",
  "Appearance",
  "Layout",
  "Behaviour",
  "Accessibility",
  "Advanced",
] as const;

/** Human decisions used as the progressive Inspector hierarchy. */
export type InspectorSection = (typeof INSPECTOR_SECTIONS)[number];

interface ControlBase {
  readonly name: string;
  readonly label: string;
  readonly required: boolean;
  readonly typeText: string;
  readonly section?: InspectorSection;
  /** A runtime default the source types cannot carry. */
  readonly defaultValue?: string | number | boolean;
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

interface ExplicitControlPresentation {
  readonly label?: string;
  readonly section?: InspectorSection;
  readonly defaultValue?: string | number | boolean;
  readonly description?: string;
}

/**
 * Facts unavailable from prop names/types alone. Keep this deliberately small:
 * generic controls still enrol through the heuristics below.
 */
const EXPLICIT_CONTROL_PRESENTATION: Readonly<
  Record<string, ExplicitControlPresentation>
> = {
  "Button.variant": { defaultValue: "primary" },
  "Button.size": { defaultValue: "md" },
  "Card.padding": { defaultValue: "md" },
  "HeroBlock.headingLevel": {
    label: "Heading level",
    section: "Accessibility",
    defaultValue: 1,
  },
  "HeroBlock.layout": { defaultValue: "split" },
  "HeroBlock.surface": { defaultValue: "canvas" },
  "IconButton.label": {
    label: "Accessible label",
    section: "Accessibility",
  },
  "Tabs.items": { label: "Tabs" },
  "Tabs.activationMode": {
    label: "Activation",
    section: "Behaviour",
    defaultValue: "automatic",
  },
  "Tabs.label": {
    label: "Accessible label",
    section: "Accessibility",
    defaultValue: "Tabs",
  },
};

function derivedSection(
  name: string,
  typeText: string,
  control: PropControl["control"],
  description?: string,
): InspectorSection {
  if (
    /^(?:aria|alt(?:Text)?$|role$|decorative$|headingLevel$)/i.test(name) ||
    /\b(?:accessible|accessibility|assistive technology|screen reader|aria-)\b/i
      .test(description ?? "")
  ) return "Accessibility";
  if (
    /(?:className|style|dangerously|html|metadata|spec|config|passthrough)/i
      .test(name)
  ) return "Advanced";
  if (
    /(?:layout|align|justify|gap|spacing|padding|width|height|columns?|orientation|position|placement|inset|wrap)/i
      .test(name)
  ) return "Layout";
  if (
    /(?:variant|tone|surface|texture|size|colour|color|theme|icon|raised|plain|emphasis)/i
      .test(name)
  ) return "Appearance";
  if (
    /(?:disabled|loading|open|active|selected|value|mode|dismiss|copyable|href|target|interactive|collapsible)/i
      .test(name)
  ) return "Behaviour";
  if (control === "json" && !typeText.includes("[]")) return "Advanced";
  return "Content";
}

function controlPresentation(
  source: ControlSource,
  name: string,
  typeText: string,
  control: PropControl["control"],
  description?: string,
): Pick<
  ControlBase,
  "label" | "section" | "description" | "defaultValue"
> {
  const explicit = EXPLICIT_CONTROL_PRESENTATION[
    `${source.reactExport}.${name}`
  ];
  const resolvedDescription = explicit?.description ?? description;
  return {
    label: explicit?.label ??
      (name === "children"
        ? "Content"
        : name === "label" && /\baccessible label\b/i.test(
            resolvedDescription ?? "",
          )
        ? "Accessible label"
        : labelFor(name)),
    section: explicit?.section ??
      derivedSection(name, typeText, control, resolvedDescription),
    ...(explicit?.defaultValue === undefined
      ? {}
      : { defaultValue: explicit.defaultValue }),
    ...(resolvedDescription === undefined
      ? {}
      : { description: resolvedDescription }),
  };
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
    typeText === "CSSProperties" || typeText.endsWith("Spec") ||
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
  const baseFor = (control: PropControl["control"]): ControlBase => ({
    name,
    required,
    typeText,
    ...controlPresentation(source, name, typeText, control, description),
  });
  if (typeText === "ReactNode") {
    return { ...baseFor("slot"), control: "slot", elementOnly: false };
  }
  if (/^ReactElement\b/.test(typeText)) {
    return { ...baseFor("slot"), control: "slot", elementOnly: true };
  }
  if (typeText === "boolean" || typeText === "true | false") {
    return { ...baseFor("toggle"), control: "toggle" };
  }
  if (typeText === "string") return { ...baseFor("text"), control: "text" };
  if (typeText === "number") {
    return { ...baseFor("number"), control: "number" };
  }
  const literalOptions = literalUnionOptions(typeText);
  if (literalOptions !== undefined) {
    return {
      ...baseFor("select"),
      control: "select",
      options: literalOptions,
    };
  }
  const variant = variantNamed(typeText, source);
  if (variant !== undefined) {
    return {
      ...baseFor("select"),
      control: "select",
      options: variant.values.map((value) =>
        /^-?\d+(?:\.\d+)?$/.test(value) ? Number(value) : value
      ),
    };
  }
  if (looksStructural(typeText, source)) {
    const shape = jsonShape(typeText, source);
    return {
      ...baseFor("json"),
      control: "json",
      ...(shape === undefined ? {} : { shape }),
    };
  }
  return { ...baseFor("text"), control: "text" };
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
      ...controlPresentation(
        source,
        "children",
        "ReactNode",
        "slot",
      ),
      required: true,
      typeText: "ReactNode",
      control: "slot",
      elementOnly: false,
    },
  ];
}

/** Human display for a primitive control value. */
export function humanControlScalar(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "On" : "Off";
  const size = {
    xs: "Extra small",
    sm: "Small",
    md: "Medium",
    lg: "Large",
    xl: "Extra large",
  }[String(value)];
  if (size !== undefined) return size;
  const source = String(value).replace(/[-_]+/g, " ");
  return source.slice(0, 1).toUpperCase() + source.slice(1);
}

function sameDefaultChild(
  left: BuilderSlotChild,
  right: BuilderSlotChild,
): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "text" && right.kind === "text") {
    return left.text === right.text;
  }
  if (left.kind !== "component" || right.kind !== "component") return false;
  if (left.slug !== right.slug || left.extra !== right.extra) return false;
  const leftNames = Object.keys(left.props).sort();
  const rightNames = Object.keys(right.props).sort();
  return leftNames.length === rightNames.length &&
    leftNames.every((name, index) =>
      name === rightNames[index] &&
      sameDefaultValue(left.props[name], right.props[name])
    );
}

function sameDefaultValue(
  left: BuilderPropValue | undefined,
  right: BuilderPropValue | undefined,
): boolean {
  if (left === undefined || right === undefined) return left === right;
  if (left.kind !== right.kind) return false;
  if (left.kind === "slot" && right.kind === "slot") {
    return left.children.length === right.children.length &&
      left.children.every((child, index) => {
        const other = right.children[index];
        return other !== undefined && sameDefaultChild(child, other);
      });
  }
  if (left.kind === "json" && right.kind === "json") {
    return left.source === right.source;
  }
  if (left.kind === "string" && right.kind === "string") {
    return left.value === right.value;
  }
  if (left.kind === "number" && right.kind === "number") {
    return left.value === right.value;
  }
  return left.kind === "boolean" && right.kind === "boolean" &&
    left.value === right.value;
}

function displayedControlValue(value: BuilderPropValue): string {
  return value.kind === "slot"
    ? `${String(value.children.length)} content item${
      value.children.length === 1 ? "" : "s"
    }`
    : value.kind === "json"
    ? "Structured value"
    : humanControlScalar(value.value);
}

/** Human value plus provenance for one control without inventing a default. */
export function effectiveControlValue(
  control: PropControl,
  value: BuilderPropValue | undefined,
  seededDefault?: BuilderPropValue,
): {
  readonly value: string;
  readonly provenance: "default" | "overridden" | "Component default";
  readonly resettable: boolean;
} {
  if (value === undefined) {
    return control.defaultValue === undefined
      ? {
        value: "Not set",
        provenance: "Component default",
        resettable: false,
      }
      : {
        value: humanControlScalar(control.defaultValue),
        provenance: "default",
        resettable: false,
      };
  }
  const displayed = displayedControlValue(value);
  if (
    seededDefault !== undefined && sameDefaultValue(value, seededDefault)
  ) {
    return { value: displayed, provenance: "default", resettable: false };
  }
  return { value: displayed, provenance: "overridden", resettable: true };
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
  authoredDefaults: Readonly<Record<string, unknown>> = {},
): Record<string, BuilderPropValue> {
  const props: Record<string, BuilderPropValue> = {};
  const controlsByName = new Map(
    controls.map((control) => [control.name, control]),
  );
  for (const name of Object.keys(authoredDefaults)) {
    const control = controlsByName.get(name);
    if (control?.control !== "json") {
      throw new TypeError(
        `Builder default ${JSON.stringify(name)} must target a JSON control`,
      );
    }
  }
  for (const control of controls) {
    if (Object.hasOwn(authoredDefaults, control.name)) {
      const source = JSON.stringify(authoredDefaults[control.name]);
      if (source === undefined) {
        throw new TypeError(
          `Builder default ${JSON.stringify(control.name)} is not JSON data`,
        );
      }
      props[control.name] = { kind: "json", source };
      continue;
    }
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
