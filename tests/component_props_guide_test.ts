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
import { componentReactPropsName } from "../scripts/component-author-guide.ts";

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

Deno.test("the props guide states the declaration, each property, and referenced package types", () => {
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
    '- ProbeTone: "calm" | "alert" — Tone shared by web and CLI.',
  ]);
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
