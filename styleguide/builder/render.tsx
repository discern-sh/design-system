/**
 * The one document-to-React renderer: the canvas decorates it for selection
 * and the tests render it statically, so preview and export never disagree.
 */
import { Fragment } from "react";
import type { ReactNode } from "react";
import { BuilderDocumentError } from "./export.ts";
import type { BuilderNode, BuilderSlotChild } from "./model.ts";
import {
  componentBySlug,
  controlsBySlug,
  entryBySlug,
} from "./registry-index.ts";

/** Hooks the interactive canvas layers onto the shared renderer. */
export interface RenderOptions {
  /** Amend the React props handed to one placed component instance. */
  readonly decorate?: (
    node: BuilderNode,
    props: Record<string, unknown>,
  ) => Record<string, unknown>;
  /**
   * Tolerate mid-edit invalid JSON by omitting the value instead of
   * throwing, so the canvas keeps rendering while the user types. Export
   * stays strict, so nothing lenient ever leaves the builder.
   */
  readonly lenient?: boolean;
}

const OMITTED = Symbol("invalid-json");

function parsedJson(
  source: string,
  spot: string,
  options: RenderOptions,
): unknown {
  try {
    return JSON.parse(source);
  } catch {
    if (options.lenient) return OMITTED;
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
  if (children.length === 1 && only !== undefined) {
    // A lone child passes through unwrapped so ReactElement-typed props
    // (cloneElement consumers) receive the element itself, never an array.
    return only.kind === "text" ? only.text : renderBuilderChild(only, options);
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
      const parsed = parsedJson(
        value.source,
        `The "${name}" prop of ${labelFor(child)}`,
        options,
      );
      if (parsed !== OMITTED) props[name] = parsed;
    } else {
      props[name] = value.value;
    }
  }
  if (child.extra !== undefined) {
    const extra = parsedJson(
      child.extra,
      `The additional props of ${labelFor(child)}`,
      options,
    );
    if (
      extra !== OMITTED && typeof extra === "object" && extra !== null &&
      !Array.isArray(extra)
    ) {
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
