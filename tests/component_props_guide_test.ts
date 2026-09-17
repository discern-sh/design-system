import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  type DocumentedGraph,
  DocumentedSymbolIndex,
  formatDocumentedType,
  renderComponentPropsGuide,
} from "../scripts/component-props-guide.ts";
import {
  componentAuthorGuide,
  componentMetadata,
} from "../src/component-metadata.ts";
import {
  componentReactExportName,
  componentReactPropsName,
} from "../scripts/component-author-guide.ts";
import { loadComponentSources } from "../scripts/generate.ts";

const IMPLEMENTATION = "file:///checkout/src/components/probe/probe.tsx";
const TYPES = "file:///checkout/src/components/probe/probe.types.ts";

function typeRef(
  typeName: string,
  resolution?: { kind: string; specifier?: string; name?: string },
  typeParams?: unknown[],
) {
  return {
    repr: typeName,
    kind: "typeRef",
    value: { typeName, resolution, typeParams },
  };
}

const literal = (string: string) => ({
  repr: string,
  kind: "literal",
  value: { kind: "string", string },
});
const keyword = (value: string) => ({ repr: value, kind: "keyword", value });

const graph: DocumentedGraph = {
  nodes: {
    [IMPLEMENTATION]: {
      symbols: [
        {
          name: "ProbeProps",
          declarations: [{
            kind: "interface",
            declarationKind: "export",
            location: { filename: IMPLEMENTATION },
            jsDoc: { doc: "Props for the {@linkcode Probe} component." },
            def: {
              extends: [
                typeRef("Omit", undefined, [
                  typeRef("HTMLAttributes", {
                    kind: "import",
                    specifier: "react",
                    name: "HTMLAttributes",
                  }, [typeRef("HTMLElement")]),
                  literal("title"),
                ]),
              ],
              properties: [
                {
                  name: "title",
                  readonly: true,
                  tsType: typeRef("ReactNode", {
                    kind: "import",
                    specifier: "react",
                    name: "ReactNode",
                  }),
                  jsDoc: {
                    doc: "Visible heading.\n\nMore detail nobody needs.",
                  },
                },
                {
                  name: "items",
                  readonly: true,
                  tsType: {
                    kind: "typeOperator",
                    value: {
                      operator: "readonly",
                      tsType: {
                        kind: "array",
                        value: typeRef("ProbeItem", { kind: "local" }),
                      },
                    },
                  },
                },
                {
                  name: "tone",
                  readonly: true,
                  optional: true,
                  tsType: typeRef("ProbeTone", {
                    kind: "import",
                    specifier: "./probe.types.ts",
                    name: "ProbeTone",
                  }),
                },
                {
                  name: "onSelect",
                  readonly: true,
                  optional: true,
                  tsType: {
                    kind: "fnOrConstructor",
                    value: {
                      constructor: false,
                      tsType: keyword("void"),
                      params: [{
                        kind: "identifier",
                        name: "item",
                        optional: false,
                        tsType: typeRef("ProbeItem", { kind: "local" }),
                      }],
                    },
                  },
                },
              ],
            },
          }],
        },
        {
          name: "Probe",
          declarations: [{
            kind: "variable",
            declarationKind: "export",
            location: { filename: IMPLEMENTATION },
            def: {
              tsType: typeRef("DiscernComponent", { kind: "import" }, [
                typeRef("HTMLElement"),
                typeRef("ProbeProps", { kind: "local" }),
              ]),
            },
          }],
        },
        {
          name: "ProbeRow",
          declarations: [{
            kind: "variable",
            declarationKind: "export",
            location: { filename: IMPLEMENTATION },
            jsDoc: { doc: "One row inside a Probe." },
            def: {
              tsType: typeRef("DiscernComponent", { kind: "import" }, [
                typeRef("HTMLLIElement"),
                typeRef("ProbeRowProps", { kind: "local" }),
              ]),
            },
          }],
        },
        {
          name: "ProbeRowProps",
          declarations: [{
            kind: "interface",
            declarationKind: "export",
            location: { filename: IMPLEMENTATION },
            jsDoc: { doc: "Props for the {@linkcode ProbeRow} companion." },
            def: {
              properties: [
                {
                  name: "item",
                  readonly: true,
                  tsType: typeRef("ProbeItem", { kind: "local" }),
                  jsDoc: { doc: "The entry this row presents." },
                },
                {
                  name: "tone",
                  readonly: true,
                  optional: true,
                  tsType: typeRef("ProbeTone", {
                    kind: "import",
                    specifier: "./probe.types.ts",
                    name: "ProbeTone",
                  }),
                },
              ],
            },
          }],
        },
        {
          name: "probeHelper",
          declarations: [{
            kind: "variable",
            declarationKind: "export",
            location: { filename: IMPLEMENTATION },
            def: { tsType: keyword("string") },
          }],
        },
        {
          name: "ProbeItem",
          declarations: [{
            kind: "interface",
            declarationKind: "private",
            location: { filename: IMPLEMENTATION },
            jsDoc: { doc: "One probe entry." },
            def: {
              properties: [
                { name: "id", readonly: true, tsType: keyword("string") },
                {
                  name: "detail",
                  readonly: true,
                  optional: true,
                  jsDoc: { doc: "Optional measured detail." },
                  tsType: {
                    kind: "typeLiteral",
                    value: {
                      properties: [{
                        name: "count",
                        tsType: keyword("number"),
                      }],
                    },
                  },
                },
              ],
            },
          }],
        },
      ],
    },
    [TYPES]: {
      symbols: [{
        name: "ProbeTone",
        declarations: [{
          kind: "typeAlias",
          declarationKind: "export",
          location: { filename: TYPES },
          jsDoc: { doc: "Tone shared by web and CLI." },
          def: {
            tsType: {
              kind: "union",
              value: [literal("calm"), literal("alert")],
            },
          },
        }],
      }],
    },
  },
};

Deno.test("the props guide states the declaration, each property, referenced package types, and every companion adapter", () => {
  const lines = renderComponentPropsGuide(
    new DocumentedSymbolIndex(graph),
    "Probe",
  );
  assertEquals(lines, [
    'Props: `ProbeProps` extends Omit<HTMLAttributes<HTMLElement>, "title">.',
    "- title: ReactNode — Visible heading.",
    "- items: readonly ProbeItem[]",
    "- tone?: ProbeTone",
    "- onSelect?: (item: ProbeItem) => void",
    "- ProbeItem: { id: string; detail?: { count: number } } — One probe entry.",
    "  - detail?: { count: number } — Optional measured detail.",
    '- ProbeTone: "calm" | "alert" — Tone shared by web and CLI.',
    "Companion `ProbeRow` props: `ProbeRowProps`.",
    "- item: ProbeItem — The entry this row presents.",
    "- tone?: ProbeTone",
  ]);
});

Deno.test("the props guide refuses a companion adapter whose props type is undocumented", () => {
  const orphaned: DocumentedGraph = {
    nodes: {
      ...graph.nodes,
      [IMPLEMENTATION]: {
        symbols: (graph.nodes[IMPLEMENTATION]?.symbols ?? []).filter((
          symbol,
        ) => symbol.name !== "ProbeRowProps"),
      },
    },
  };
  assertThrows(
    () =>
      renderComponentPropsGuide(new DocumentedSymbolIndex(orphaned), "Probe"),
    Error,
    "ProbeRowProps is not documented",
  );
});

Deno.test("the committed guide documents every companion adapter an implementation exports", async () => {
  const sources = await loadComponentSources();
  for (const meta of componentMetadata) {
    const source = sources.find((candidate) =>
      candidate.meta.slug === meta.slug
    );
    if (source === undefined) throw new Error(`${meta.slug} has no source`);
    const implementation = await Deno.readTextFile(source.implementationUrl);
    const adapters = [
      ...implementation.matchAll(/^export const (\w+): DiscernComponent</gmu),
    ].map((match) => match[1]);
    const heading = `\n### ${meta.name} (\`${meta.slug}\`)\n`;
    const start = componentAuthorGuide.indexOf(heading);
    const end = componentAuthorGuide.indexOf("\n### ", start + heading.length);
    const section = componentAuthorGuide.slice(
      start,
      end === -1 ? undefined : end,
    );
    for (const adapter of adapters) {
      if (adapter === componentReactExportName(meta.slug)) continue;
      assertStringIncludes(
        section,
        `\nCompanion \`${adapter}\` props: \`${adapter}Props\``,
        `${meta.slug} exports ${adapter} without a guide block`,
      );
    }
  }
});

Deno.test("the props guide refuses a Component whose adapter exports no props type", () => {
  assertThrows(
    () => renderComponentPropsGuide(new DocumentedSymbolIndex(graph), "Ghost"),
    Error,
    "GhostProps is not documented",
  );
});

Deno.test("documented types render the way an author writes them", () => {
  assertEquals(
    formatDocumentedType({
      kind: "indexedAccess",
      value: {
        objType: {
          kind: "parenthesized",
          value: { kind: "typeQuery", value: "axes" },
        },
        indexType: keyword("number"),
      },
    }),
    "(typeof axes)[number]",
  );
  assertEquals(
    formatDocumentedType({
      kind: "array",
      value: { kind: "union", value: [keyword("string"), keyword("number")] },
    }),
    "(string | number)[]",
  );
  assertEquals(
    formatDocumentedType({
      kind: "tuple",
      value: [keyword("string"), literal("x")],
    }),
    '[string, "x"]',
  );
  assertEquals(formatDocumentedType({ kind: "mapped", repr: "" }), "unknown");
  assertEquals(formatDocumentedType(undefined), "unknown");
});

Deno.test("the committed guide carries a props block for every Component", () => {
  for (const meta of componentMetadata) {
    const heading = `\n### ${meta.name} (\`${meta.slug}\`)\n`;
    const start = componentAuthorGuide.indexOf(heading);
    assert(start >= 0, `${meta.slug} has no section`);
    const end = componentAuthorGuide.indexOf("\n### ", start + heading.length);
    const section = componentAuthorGuide.slice(
      start,
      end === -1 ? undefined : end,
    );
    assertStringIncludes(
      section,
      `\nProps: \`${componentReactPropsName(meta.slug)}\``,
      `${meta.slug} has no props block`,
    );
    assertStringIncludes(
      section,
      `with \`${componentReactPropsName(meta.slug)}\`.`,
    );
  }
});
