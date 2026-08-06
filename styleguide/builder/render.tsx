/**
 * The one document-to-React renderer: the canvas decorates it for selection
 * and the tests render it statically, so preview and export never disagree.
 */
import { Fragment } from "react";
import type { ReactNode } from "react";
import { BuilderDocumentError } from "./export.ts";
import type { BuilderNode, BuilderSlotChild } from "./model.ts";
import { componentBySlug, controlsBySlug, entryBySlug } from "./registry-index.ts";

/** Hooks the interactive canvas layers onto the shared renderer. */
export interface RenderOptions {
  /** Amend the React props handed to one placed component instance. */
  readonly decorate?: (
    node: BuilderNode,
    props: Record<string, unknown>,
  ) => Record<string, unknown>;
}

function parsedJson(source: string, spot: string): unknown {
  try {
    return JSON.parse(source);
  } catch {
    throw new BuilderDocumentError(`${spot} holds invalid JSON.`);
  }
}

function requiredFunctionProps(slug: string): readonly string[] {
  const entry = entryBySlug.get(slug);
  if (entry === undefined || entry.propDocumentation.status !== "available") {
    return [];
  }
  return entry.propDocumentation.props
    .filter((prop) =>
      prop.required && (prop.type.includes("=>") || /^on[A-Z]/.test(prop.name))
    )
    .map((prop) => prop.name);
}

function slotChildren(
  children: readonly BuilderSlotChild[],
  options: RenderOptions,
): ReactNode {
  if (children.length === 0) return undefined;
  const only = children[0];
  if (children.length === 1 && only !== undefined && only.kind === "text") {
    return only.text;
  }
  return children.map((child) => (
    <Fragment key={child.id}>{renderBuilderChild(child, options)}</Fragment>
  ));
}

/** Render one placed child — component subtree or literal text — to React. */
export function renderBuilderChild(
  child: BuilderSlotChild,
  options: RenderOptions = {},
): ReactNode {
  if (child.kind === "text") return child.text;
  const Component = componentBySlug(child.slug);
  const props: Record<string, unknown> = {};
  for (const name of requiredFunctionProps(child.slug)) {
    props[name] = noop;
  }
  for (const [name, value] of Object.entries(child.props)) {
    if (value.kind === "slot") {
      props[name] = slotChildren(value.children, options);
    } else if (value.kind === "json") {
      props[name] = parsedJson(
        value.source,
        `The "${name}" prop of ${labelFor(child)}`,
      );
    } else {
      props[name] = value.value;
    }
  }
  if (child.extra !== undefined) {
    const extra = parsedJson(
      child.extra,
      `The additional props of ${labelFor(child)}`,
    );
    if (typeof extra === "object" && extra !== null && !Array.isArray(extra)) {
      Object.assign(props, extra);
    }
  }
  const decorated = options.decorate === undefined
    ? props
    : options.decorate(child, props);
  return <Component key={child.id} {...decorated} />;
}

function labelFor(node: BuilderNode): string {
  return entryBySlug.get(node.slug)?.meta.name ?? node.slug;
}

function noop(): void {}

/**
 * True when every required control of the slug's component can be satisfied
 * by synthesized defaults that render without real data. Required structural
 * JSON and element-only slots need the user before the instance can render.
 */
export function rendersFromDefaults(slug: string): boolean {
  return controlsBySlug(slug).every(
    (control) =>
      !control.required ||
      (control.control !== "json" &&
        (control.control !== "slot" || !control.elementOnly)),
  );
}
