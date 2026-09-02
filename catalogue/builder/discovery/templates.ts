/** Validated Builder-owned starters and insertable high-level blocks. */
import {
  type SearchRecord,
  searchRecords,
  type SearchResult,
} from "../../search/mod.ts";
import type { ComponentExampleImageTheme } from "../../example-images/contract.ts";
import { cataloguePurposeDetails } from "../../../src/types/component-meta.ts";
import type {
  BuilderDocument,
  BuilderNode,
  BuilderSlotChild,
} from "../model.ts";
import { newChildId, usedSlugs } from "../model.ts";
import {
  documentPolicy,
  entryBySlug,
  instantiateComponent,
} from "../registry-core.ts";
import { assertBuilderDocument } from "../policy.ts";
import type { BuilderIdFactory } from "../defaults.ts";
import {
  builderDiscoveryRecordBySlug,
  discoveryImagePresentation,
} from "./registry.ts";

export type BuilderTemplateKind = "starter" | "block";

interface BuilderTemplateDefinition {
  readonly id: string;
  readonly kind: BuilderTemplateKind;
  readonly title: string;
  readonly description: string;
  readonly create: (id: BuilderIdFactory) => BuilderDocument;
}

/** One Builder-only accepted starting or insertable pattern. */
export interface BuilderTemplate {
  readonly id: string;
  readonly recordId: `builder-${BuilderTemplateKind}:${string}`;
  readonly kind: BuilderTemplateKind;
  readonly title: string;
  readonly description: string;
  readonly components: readonly string[];
  readonly representativeSlug: string | undefined;
  readonly searchRecord: SearchRecord<BuilderTemplate>;
  createDocument(id?: BuilderIdFactory): BuilderDocument;
}

const TEMPLATE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function deterministicIds(prefix: string): BuilderIdFactory {
  let count = 0;
  return () => `${prefix}-${String(++count)}`;
}

/** Define, validate, and project one Builder template from its accepted tree. */
export function defineBuilderTemplate(
  definition: BuilderTemplateDefinition,
): BuilderTemplate {
  if (!TEMPLATE_ID.test(definition.id)) {
    throw new TypeError(
      `Builder template id must be kebab-case: ${definition.id}`,
    );
  }
  if (definition.title.trim() === "" || definition.description.trim() === "") {
    throw new TypeError(`Builder template ${definition.id} needs human copy`);
  }
  const witness = definition.create(deterministicIds(definition.id));
  assertBuilderDocument(witness, documentPolicy);
  const components = Object.freeze([...usedSlugs(witness)]);
  if (definition.kind === "block" && witness.children.length !== 1) {
    throw new TypeError(
      `Builder block ${definition.id} must own one bounded root subtree`,
    );
  }
  const representativeSlug = components[0];
  const recordId = `builder-${definition.kind}:${definition.id}` as const;
  const template = {
    id: definition.id,
    recordId,
    kind: definition.kind,
    title: definition.title,
    description: definition.description,
    components,
    representativeSlug,
    createDocument: (id: BuilderIdFactory = newChildId) => {
      const document = definition.create(id);
      assertBuilderDocument(document, documentPolicy);
      return document;
    },
  } as Omit<BuilderTemplate, "searchRecord">;
  const purposes = new Set(
    components.flatMap((slug) => entryBySlug.get(slug)?.meta.purposes ?? []),
  );
  const searchRecord: SearchRecord<BuilderTemplate> = {
    id: recordId,
    href: `/catalogue/builder/#${recordId}`,
    title: definition.title,
    context: definition.kind === "starter" ? "Starter" : "Block",
    slug: definition.id,
    description: definition.description,
    purposes: [...purposes].map((purpose) =>
      cataloguePurposeDetails[purpose].label
    ),
    keywords: components.flatMap((slug) => {
      const entry = entryBySlug.get(slug);
      return entry === undefined ? [slug] : [slug, entry.meta.name];
    }),
  };
  const result = { ...template, searchRecord } as BuilderTemplate;
  (searchRecord as { payload: BuilderTemplate }).payload = result;
  return Object.freeze(result);
}

function document(
  name: string,
  children: readonly BuilderSlotChild[],
): BuilderDocument {
  return { version: 1, name, children };
}

function withSlot(
  source: BuilderNode,
  prop: string,
  children: readonly BuilderSlotChild[],
): BuilderNode {
  return {
    ...source,
    props: { ...source.props, [prop]: { kind: "slot", children } },
  };
}

function text(id: BuilderIdFactory, value: string): BuilderSlotChild {
  return { kind: "text", id: id(), text: value };
}

function labelled(
  source: BuilderNode,
  prop: string,
  id: BuilderIdFactory,
  value: string,
): BuilderNode {
  return withSlot(source, prop, [text(id, value)]);
}

const starters = [
  defineBuilderTemplate({
    id: "blank",
    kind: "starter",
    title: "Blank composition",
    description: "Start with an empty page and add only what the task needs.",
    create: () => document("Untitled page", []),
  }),
  defineBuilderTemplate({
    id: "landing-page",
    kind: "starter",
    title: "Landing page",
    description:
      "Open with a clear promise, explain the useful features, and end on one action.",
    create: (id) =>
      document("Landing page", [
        instantiateComponent("hero-block", id),
        instantiateComponent("feature-bento", id),
        instantiateComponent("cta-band", id),
      ]),
  }),
  defineBuilderTemplate({
    id: "article-docs",
    kind: "starter",
    title: "Article or documentation",
    description:
      "Begin with a readable article header and a focused long-form content area.",
    create: (id) =>
      document("Article", [
        instantiateComponent("article-header", id),
        withSlot(instantiateComponent("prose", id), "children", [
          labelled(
            instantiateComponent("heading", id),
            "children",
            id,
            "First section",
          ),
          labelled(
            instantiateComponent("paragraph", id),
            "children",
            id,
            "Write the opening section here.",
          ),
        ]),
      ]),
  }),
  defineBuilderTemplate({
    id: "settings-form",
    kind: "starter",
    title: "Settings or form",
    description:
      "Set up a concise settings surface with context, fields, and one clear save action.",
    create: (id) => {
      const contents = [
        labelled(
          instantiateComponent("heading", id),
          "children",
          id,
          "Settings",
        ),
        labelled(
          instantiateComponent("paragraph", id),
          "children",
          id,
          "Adjust the options below, then save the changes.",
        ),
        labelled(instantiateComponent("input", id), "label", id, "Name"),
        labelled(
          instantiateComponent("switch", id),
          "label",
          id,
          "Enable this option",
        ),
        labelled(
          instantiateComponent("button", id),
          "children",
          id,
          "Save changes",
        ),
      ];
      return document("Settings", [
        withSlot(
          instantiateComponent("section", id),
          "children",
          [withSlot(instantiateComponent("stack", id), "children", contents)],
        ),
      ]);
    },
  }),
  defineBuilderTemplate({
    id: "workflow-result",
    kind: "starter",
    title: "Workflow and result",
    description:
      "Explain a bounded procedure and finish with the result someone should act on.",
    create: (id) =>
      document("Workflow result", [
        instantiateComponent("procedure", id),
        instantiateComponent("result-summary", id),
      ]),
  }),
] as const;

const blocks = [
  defineBuilderTemplate({
    id: "hero-with-actions",
    kind: "block",
    title: "Hero with actions",
    description:
      "Introduce a page with a generic title, supporting sentence, and removable action.",
    create: (id) =>
      document("Hero block", [instantiateComponent("hero-block", id)]),
  }),
  defineBuilderTemplate({
    id: "feature-grid",
    kind: "block",
    title: "Feature grid",
    description: "Explain three useful capabilities in a balanced visual grid.",
    create: (id) =>
      document("Feature grid", [instantiateComponent("feature-bento", id)]),
  }),
  defineBuilderTemplate({
    id: "faq",
    kind: "block",
    title: "Frequently asked questions",
    description:
      "Answer a small set of common questions in one bounded section.",
    create: (id) => document("FAQ", [instantiateComponent("faq-block", id)]),
  }),
  defineBuilderTemplate({
    id: "article-header",
    kind: "block",
    title: "Article header",
    description:
      "Start long-form content with a title and concise introduction.",
    create: (id) =>
      document("Article header", [instantiateComponent("article-header", id)]),
  }),
  defineBuilderTemplate({
    id: "result-summary",
    kind: "block",
    title: "Result summary",
    description:
      "State an outcome, compact counts, and the next useful action.",
    create: (id) =>
      document("Result summary", [
        instantiateComponent("result-summary", id),
      ]),
  }),
] as const;

/** Builder-owned useful starting documents. */
export const builderStarters: readonly BuilderTemplate[] = Object.freeze([
  ...starters,
]);

/** Builder-owned bounded high-level insertions. */
export const builderBlocks: readonly BuilderTemplate[] = Object.freeze([
  ...blocks,
]);

/** Complete template population; UI and tests iterate this authority. */
export const builderTemplates: readonly BuilderTemplate[] = Object.freeze([
  ...builderStarters,
  ...builderBlocks,
]);

/** Template lookup shared by search, Recent, and Favourites. */
export const builderTemplateByRecordId: ReadonlyMap<string, BuilderTemplate> =
  new Map(builderTemplates.map((template) => [template.recordId, template]));

/** Search one Builder template population through the universal matcher. */
export function discoverBuilderTemplates(
  kind: BuilderTemplateKind,
  query: string,
): readonly SearchResult<BuilderTemplate>[] {
  const records = builderTemplates
    .filter((template) => template.kind === kind)
    .map((template) => template.searchRecord);
  return query.trim() === ""
    ? records.map((record) => ({ record, score: 0, reasons: [] }))
    : searchRecords(records, query);
}

/** Representative image remains a generated image of a real constituent. */
export function builderTemplateImagePresentation(
  template: BuilderTemplate,
  theme: ComponentExampleImageTheme,
) {
  const record = template.representativeSlug === undefined
    ? undefined
    : builderDiscoveryRecordBySlug.get(template.representativeSlug);
  return record === undefined
    ? undefined
    : discoveryImagePresentation(record, theme);
}

/** One fresh accepted Block root for the ordinary tree placement authority. */
export function instantiateBuilderBlock(
  template: BuilderTemplate,
  id: BuilderIdFactory = newChildId,
): BuilderNode {
  if (template.kind !== "block") {
    throw new TypeError(`${template.id} is not an insertable Builder block`);
  }
  const root = template.createDocument(id).children[0];
  if (root === undefined || root.kind !== "component") {
    throw new TypeError(`Builder block ${template.id} has no Component root`);
  }
  return root;
}
