/// <reference lib="deno.unstable" />
import { assertEquals } from "@std/assert";
import {
  trackedTypeScriptSources,
  type TypeScriptSource,
} from "./support/tracked-typescript.ts";

// Canonical examples describe settled states. Imperative focus belongs to the
// review/conformance action vocabulary, where the caller owns the interaction.
const exampleFocusPlugin = {
  name: "component-examples",
  rules: {
    "explicit-focus-posture": {
      create(context) {
        const report = (node: Deno.lint.Node) =>
          context.report({
            node,
            message: "Move imperative focus to a review or conformance posture",
          });
        const isFocus = (node: Deno.lint.Node, computed: boolean) =>
          computed
            ? node.type === "Literal" && node.value === "focus"
            : node.type === "Identifier" && node.name === "focus";
        return {
          MemberExpression(node) {
            if (isFocus(node.property, node.computed)) report(node);
          },
          Property(node) {
            if (
              node.parent.type === "ObjectPattern" &&
              isFocus(node.key, node.computed)
            ) report(node);
          },
        };
      },
    },
  },
} satisfies Deno.lint.Plugin;

function imperativeExampleFocus(
  sources: readonly TypeScriptSource[],
): string[] {
  return sources.filter(({ path }) => path.endsWith(".examples.tsx")).flatMap(
    ({ path, source }) =>
      Deno.lint.runPlugin(exampleFocusPlugin, path, source).map(({ range }) =>
        `${path}:${source.slice(0, range[0]).split("\n").length}`
      ),
  );
}

Deno.test("canonical example modules leave imperative focus to explicit postures", async () => {
  assertEquals(imperativeExampleFocus(await trackedTypeScriptSources()), []);
});

Deno.test("independently named examples and focus aliases auto-enrol in the guard", () => {
  const path =
    "src/components/future/remote-sampler/remote-sampler.examples.tsx";
  for (
    const source of [
      "function Remote() { useEffect(() => signal.current?.focus(), []); }",
      'const later = () => alternate["focus"]();',
      "const activate = signal.focus.bind(signal); activate();",
      "const { focus: activate } = signal; activate();",
    ]
  ) assertEquals(imperativeExampleFocus([{ path, source }]), [`${path}:1`]);
  assertEquals(
    imperativeExampleFocus([{
      path,
      source: `
        // signal.focus() is explanatory prose, not an effect.
        const text = "signal.focus()";
        const posture = { action: "focus", target: { role: "tab" } };
        const Example = () => <input autoFocus />;
      `,
    }]),
    [],
  );
});
