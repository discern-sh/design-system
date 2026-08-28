/**
 * The one document-to-React renderer: the canvas decorates it for selection
 * and the tests render it statically, so preview and export never disagree.
 */
import { Fragment } from "react";
import type { ReactNode } from "react";
import type { BuilderNode, BuilderSlotChild } from "./model.ts";
import {
  assertBuilderDocument,
  parseAdditionalProps,
  parseBuilderJson,
} from "./policy.ts";
import {
  componentBySlug,
  documentPolicy,
  entryBySlug,
  registryCoreBySlug,
  requiredFunctionPropsBySlug,
} from "./registry-core.ts";

/** Hooks the interactive canvas layers onto the shared renderer. */
export interface RenderOptions {
  /** Amend the React props handed to one placed component instance. */
  readonly decorate?: (
    node: BuilderNode,
    props: Record<string, unknown>,
  ) => Record<string, unknown>;
}

/** Literal text as React children: newlines become explicit line breaks. */
function textNode(id: string, text: string): ReactNode {
  if (!text.includes("\n")) return text;
  return text.split("\n").map((line, index) => (
    <Fragment key={`${id}:${String(index)}`}>
      {index > 0 ? <br /> : null}
      {line}
    </Fragment>
  ));
}

function slotChildren(
  children: readonly BuilderSlotChild[],
  options: RenderOptions,
): ReactNode {
  if (children.length === 0) return undefined;
  const only = children[0];
  if (children.length === 1 && only !== undefined) {
    // A lone child passes through unwrapped so ReactElement-typed props
    // (cloneElement consumers) receive the element itself, never an array.
    return only.kind === "text"
      ? textNode(only.id, only.text)
      : renderAcceptedChild(only, options);
  }
  return children.map((child) => (
    <Fragment key={child.id}>{renderAcceptedChild(child, options)}</Fragment>
  ));
}

function renderAcceptedChild(
  child: BuilderSlotChild,
  options: RenderOptions,
): ReactNode {
  if (child.kind === "text") return textNode(child.id, child.text);
  const Component = componentBySlug(child.slug);
  const props: Record<string, unknown> = {};
  for (const required of requiredFunctionPropsBySlug.get(child.slug) ?? []) {
    props[required.name] = noop;
  }
  for (const [name, value] of Object.entries(child.props)) {
    if (value.kind === "slot") {
      props[name] = slotChildren(value.children, options);
    } else if (value.kind === "json") {
      props[name] = parseBuilderJson(
        value.source,
        `The "${name}" prop of ${labelFor(child)}`,
      );
    } else {
      props[name] = value.value;
    }
  }
  if (child.extra !== undefined) {
    const extra = parseAdditionalProps(
      child.extra,
      documentPolicy.reservedPropsBySlug.get(child.slug) ?? new Set(),
      `The additional props of ${labelFor(child)}`,
    );
    Object.assign(props, extra);
  }
  const decorated = options.decorate === undefined
    ? props
    : options.decorate(child, props);
  return <Component key={child.id} {...decorated} />;
}

/** Render one policy-accepted subtree — component or literal text — to React. */
export function renderBuilderChild(
  child: BuilderSlotChild,
  options: RenderOptions = {},
): ReactNode {
  assertBuilderDocument(
    { version: 1, name: "Preview", children: [child] },
    documentPolicy,
  );
  return renderAcceptedChild(child, options);
}

function labelFor(node: BuilderNode): string {
  return entryBySlug.get(node.slug)?.meta.name ?? node.slug;
}

function noop(): void {}

/**
 * True when every required control of the slug's component can be satisfied
 * by synthesized or source-backed defaults. Required structural JSON and
 * element-only slots without such a default need the user before rendering.
 */
export function rendersFromDefaults(slug: string): boolean {
  const core = registryCoreBySlug.get(slug);
  if (core === undefined) return false;
  const defaults = core.registry.builderDefaults;
  return core.controls.every(
    (control) =>
      !control.required ||
      ((control.control !== "json" ||
        Object.hasOwn(defaults, control.name)) &&
        (control.control !== "slot" || !control.elementOnly)),
  );
}
