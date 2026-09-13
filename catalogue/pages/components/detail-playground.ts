/**
 * Builder-backed starter model for the Component detail playground.
 *
 * The single authority for editable detail usage: one policy-accepted
 * Builder node per Component, rendered by the shared Builder renderer and
 * exported by the shared TSX/selection emitters, so the specimen and the
 * copyable code can never disagree.
 */
import type { PropControl } from "../../builder/controls.ts";
import type {
  BuilderDocument,
  BuilderNode,
  BuilderPropValue,
} from "../../builder/model.ts";
import { newChildId } from "../../builder/model.ts";
import {
  documentSelectionSnippet,
  documentToTsx,
} from "../../builder/export.ts";
import { assertBuilderDocument } from "../../builder/policy.ts";
import { newBuilderStructuredRow } from "../../builder/defaults.ts";
import type { BuilderRegistryCoreEntry } from "../../builder/registry-core.ts";
import {
  documentPolicy,
  exportNaming,
  instantiateComponent,
  registryCoreBySlug,
} from "../../builder/registry-core.ts";

/** A ready starter: the accepted node plus its registry core facts. */
export interface DetailStarter {
  readonly status: "ready";
  readonly core: BuilderRegistryCoreEntry;
  readonly node: BuilderNode;
}

/** Why a Component cannot render a truthful starter from source data alone. */
export interface DetailStarterUnavailable {
  readonly status: "unavailable";
  readonly core: BuilderRegistryCoreEntry;
  readonly reason: string;
}

function emptyJsonValue(value: BuilderPropValue | undefined): boolean {
  if (value?.kind !== "json") return true;
  try {
    const parsed: unknown = JSON.parse(value.source);
    if (Array.isArray(parsed)) return parsed.length === 0;
    if (typeof parsed === "object" && parsed !== null) {
      return Object.keys(parsed).length === 0;
    }
    return false;
  } catch {
    return true;
  }
}

/**
 * Required values the seeded starter cannot supply truthfully: structural
 * JSON that stayed an empty placeholder, or an element-only slot no curated
 * seed filled. Judged against the actual instantiated node so authored
 * `catalogueBuilderDefaults` and the Builder's curated creation seeds both
 * count.
 */
function blockingControls(
  core: BuilderRegistryCoreEntry,
  node: BuilderNode,
): readonly PropControl[] {
  return core.controls.filter((control) => {
    if (!control.required) return false;
    const value = node.props[control.name];
    if (control.control === "json") return emptyJsonValue(value);
    if (control.control === "slot" && control.elementOnly) {
      return value?.kind !== "slot" || value.children.length === 0;
    }
    return false;
  });
}

/**
 * Fill a required shaped list the creation defaults left empty with two rows
 * from the Builder's own row-seeding authority — the same generic content a
 * person gets from the inspector's add-row action, visible in both the
 * render and the exported code. Shapes whose rows would be empty stay empty
 * and therefore stay honestly blocked.
 */
function seedRequiredShapedLists(
  core: BuilderRegistryCoreEntry,
  node: BuilderNode,
): BuilderNode {
  let props = node.props;
  for (const control of core.controls) {
    if (
      !control.required || control.control !== "json" ||
      control.shape === undefined || !control.shape.list ||
      !emptyJsonValue(props[control.name])
    ) continue;
    const firstText = control.shape.members.find(({ control: member }) =>
      member === "text"
    );
    const rows: Record<string, unknown>[] = [];
    for (let count = 0; count < 2; count += 1) {
      const seeded = newBuilderStructuredRow(control.shape, rows);
      if (Object.keys(seeded.row).length > 0) {
        rows.push({ ...seeded.row });
        continue;
      }
      // A shape without required members still gets one visible text value.
      if (firstText === undefined) break;
      rows.push({
        [firstText.name]: `${firstText.label} ${String(count + 1)}`,
      });
    }
    if (rows.length === 0) continue;
    props = {
      ...props,
      [control.name]: { kind: "json", source: JSON.stringify(rows) },
    };
  }
  return props === node.props ? node : { ...node, props };
}

/** One fresh policy-accepted starter, or the honest reason there is none. */
export function createDetailStarter(
  slug: string,
): DetailStarter | DetailStarterUnavailable {
  const core = registryCoreBySlug.get(slug);
  if (core === undefined) {
    throw new Error(`Unknown component slug "${slug}".`);
  }
  const node = seedRequiredShapedLists(core, instantiateComponent(slug));
  const blocking = blockingControls(core, node);
  if (blocking.length > 0) {
    return {
      status: "unavailable",
      core,
      reason: `${
        blocking.map(({ label }) => label).join(", ")
      } must hold real consumer values that source data cannot synthesize. Compose ${core.registry.meta.name} with those values in the Builder instead.`,
    };
  }
  return { status: "ready", core, node };
}

/** The starter's single-node document, shared by render and export. */
export function detailStarterDocument(
  entry: DetailStarter["core"]["registry"],
  node: BuilderNode,
): BuilderDocument {
  return {
    version: 1,
    name: `${entry.meta.name} starter`,
    children: [node],
  };
}

/** Consumer-ready code derived from the exact node the specimen renders. */
export function detailStarterUsage(
  entry: DetailStarter["core"]["registry"],
  node: BuilderNode,
): Readonly<{ tsx: string; selection: string }> {
  const document = detailStarterDocument(entry, node);
  return {
    tsx: documentToTsx(document, exportNaming),
    selection: documentSelectionSnippet(document, documentPolicy),
  };
}

/** The focused control split the detail playground presents. */
export interface DetailPlaygroundControls {
  /** Scalar and structured controls rendered as ordinary inspector fields. */
  readonly fields: readonly PropControl[];
  /** Slot controls whose current content is one editable text run. */
  readonly textSlots: readonly PropControl[];
  /** Slot controls whose content is composed and stays with the Builder. */
  readonly composedSlots: readonly PropControl[];
  /** Advanced passthrough controls deliberately left to Props and variants. */
  readonly advanced: readonly PropControl[];
}

function slotEditableAsText(
  control: Extract<PropControl, { control: "slot" }>,
  value: BuilderPropValue | undefined,
): boolean {
  if (control.elementOnly) return false;
  if (value === undefined) return true;
  if (value.kind !== "slot") return false;
  return value.children.length === 0 ||
    (value.children.length === 1 && value.children[0]?.kind === "text");
}

/** Split one core's controls into the focused detail presentation. */
export function detailPlaygroundControls(
  core: BuilderRegistryCoreEntry,
  node: BuilderNode,
): DetailPlaygroundControls {
  const fields: PropControl[] = [];
  const textSlots: PropControl[] = [];
  const composedSlots: PropControl[] = [];
  const advanced: PropControl[] = [];
  for (const control of core.controls) {
    if (control.control === "slot") {
      if (slotEditableAsText(control, node.props[control.name])) {
        textSlots.push(control);
      } else composedSlots.push(control);
      continue;
    }
    if (control.section === "Advanced") advanced.push(control);
    else fields.push(control);
  }
  return { fields, textSlots, composedSlots, advanced };
}

/** The current single-text content of a slot control, if any. */
export function detailSlotText(
  node: BuilderNode,
  control: PropControl,
): string {
  const value = node.props[control.name];
  if (value?.kind !== "slot") return "";
  const only = value.children.length === 1 ? value.children[0] : undefined;
  return only?.kind === "text" ? only.text : "";
}

function withPropValue(
  node: BuilderNode,
  name: string,
  value: BuilderPropValue | undefined,
): BuilderNode {
  const props = { ...node.props };
  if (value === undefined) delete props[name];
  else props[name] = value;
  return { ...node, props };
}

/** A prop change accepted by the document policy, or its refusal. */
export type DetailPlaygroundChange =
  | { readonly node: BuilderNode }
  | { readonly error: string };

function acceptedNode(candidate: BuilderNode): DetailPlaygroundChange {
  try {
    assertBuilderDocument(
      { version: 1, name: "Starter preview", children: [candidate] },
      documentPolicy,
    );
    return { node: candidate };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/** Apply one field value; the accepted document policy is the gatekeeper. */
export function changeDetailProp(
  node: BuilderNode,
  name: string,
  value: BuilderPropValue | undefined,
): DetailPlaygroundChange {
  return acceptedNode(withPropValue(node, name, value));
}

/**
 * Replace a slot's single text run, preserving the child identity so the
 * editing field never remounts mid-keystroke. Empty text clears an optional
 * slot and stays as authored emptiness on a required one.
 */
export function changeDetailSlotText(
  node: BuilderNode,
  control: PropControl,
  text: string,
): DetailPlaygroundChange {
  if (text === "" && !control.required) {
    return acceptedNode(withPropValue(node, control.name, undefined));
  }
  const current = node.props[control.name];
  const existing = current?.kind === "slot" && current.children.length === 1
    ? current.children[0]
    : undefined;
  const id = existing?.kind === "text" ? existing.id : newChildId();
  return acceptedNode(
    withPropValue(node, control.name, {
      kind: "slot",
      children: [{ kind: "text", id, text }],
    }),
  );
}

/** Callback props the playground witnesses instead of fabricating behaviour. */
export function detailWitnessedCallbacks(
  core: BuilderRegistryCoreEntry,
): readonly string[] {
  return [
    ...new Set([
      ...core.requiredFunctionProps.map(({ name }) => name),
      ...core.previewCallbackProps.map(({ name }) => name),
    ]),
  ];
}
