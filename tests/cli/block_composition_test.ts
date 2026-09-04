import { assertEquals, assertNotEquals, assertThrows } from "@std/assert";
import { styleHyperlink, styleText } from "../../src/cli/ansi.ts";
import {
  CLI_BLOCK_MAX_DEPTH,
  type CliBlock,
  createCliBlock,
  renderCliBlock,
  renderCliBlocks,
} from "../../src/cli/block-composition.ts";
import {
  type CliPresentationOptions,
  cliPresentationPassthrough,
  type CliRenderer,
} from "../../src/cli/contracts.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import { styleSemanticText } from "../../src/cli/narration.ts";

interface FixtureProps extends CliPresentationOptions {
  readonly value: string;
  readonly child?: CliBlock;
}

const renderFixture: CliRenderer<FixtureProps> = (props, capabilities) => {
  if (props.child !== undefined) {
    return renderCliBlock(
      props.child,
      capabilities,
      cliPresentationPassthrough(props),
    );
  }
  return props.value;
};

Deno.test("CLI blocks re-render at the parent measure and own one boundary", () => {
  const capabilities = testTerminalCapabilities({ columns: 40 });
  const widths: number[] = [];
  const measured: CliRenderer<CliPresentationOptions> = (_props, current) => {
    widths.push(current.columns);
    return "measured";
  };
  const blocks = [
    createCliBlock(measured, {}),
    createCliBlock(renderFixture, { value: "second" }),
  ];
  assertEquals(
    renderCliBlocks(blocks, capabilities, { maxWidth: 12 }),
    "measured\n\nsecond",
  );
  assertEquals(widths, [12]);
});

Deno.test("CLI blocks preserve package styling and hyperlinks", () => {
  const capabilities = testTerminalCapabilities({
    columns: 40,
    colorDepth: "truecolor",
    hyperlinks: true,
  });
  const rendered = createCliBlock(renderFixture, {
    value: styleText("strong", { bold: true }, capabilities) + " " +
      styleHyperlink("reference", "https://example.test", capabilities),
  });
  assertEquals(
    renderCliBlock(rendered, capabilities),
    rendered.render(capabilities),
  );
});

Deno.test("CLI blocks reject raw strings, foreign controls, and bounded overflow", () => {
  const capabilities = testTerminalCapabilities({ columns: 8 });
  assertThrows(
    () => renderCliBlock("plain text" as unknown as CliBlock, capabilities),
    TypeError,
    "createCliBlock",
  );
  const foreign = createCliBlock(renderFixture, { value: "\u001b[2Junsafe" });
  assertThrows(
    () => renderCliBlock(foreign, capabilities),
    TypeError,
    "unsupported or unterminated sequence",
  );
  const overflow = createCliBlock(renderFixture, { value: "nine-cells" });
  assertThrows(
    () => renderCliBlock(overflow, capabilities),
    TypeError,
    "bounded CLI block",
  );
  assertEquals(
    renderCliBlock(
      createCliBlock(
        renderFixture,
        { value: "nine-cells" },
        { widthPolicy: "preserve" },
      ),
      capabilities,
    ),
    "nine-cells",
  );
});

Deno.test("preserved overflow propagates through ancestors but not siblings", () => {
  interface CompositeProps extends CliPresentationOptions {
    readonly children: readonly CliBlock[];
  }
  const renderComposite: CliRenderer<CompositeProps> = (
    props,
    capabilities,
  ) =>
    renderCliBlocks(
      props.children,
      capabilities,
      cliPresentationPassthrough(props),
    );
  const capabilities = testTerminalCapabilities({ columns: 8 });
  const preserved = createCliBlock(
    renderFixture,
    { value: "preserved-value" },
    { widthPolicy: "preserve" },
  );
  const ancestor = createCliBlock(renderComposite, {
    children: [preserved],
  });
  assertEquals(renderCliBlock(ancestor, capabilities), "preserved-value");

  const overflowingSibling = createCliBlock(renderFixture, {
    value: "sibling-overflow",
  });
  const siblings = createCliBlock(renderComposite, {
    children: [preserved, overflowingSibling],
  });
  assertThrows(
    () => renderCliBlock(siblings, capabilities),
    TypeError,
    "bounded CLI block",
  );
});

Deno.test("CLI blocks inherit appearance and allow local overrides in both directions", () => {
  interface ToneProps extends CliPresentationOptions {
    readonly label: string;
  }
  interface CompositeProps extends CliPresentationOptions {
    readonly children: readonly CliBlock[];
  }
  const renderTone: CliRenderer<ToneProps> = (props, capabilities) =>
    styleSemanticText(
      props.label,
      { ...props, tone: "accent" },
      capabilities,
    );
  const renderComposite: CliRenderer<CompositeProps> = (
    props,
    capabilities,
  ) =>
    renderCliBlocks(props.children, capabilities, {
      ...cliPresentationPassthrough(props),
    });
  const capabilities = testTerminalCapabilities({
    columns: 40,
    colorDepth: "truecolor",
  });

  const inherited = createCliBlock(renderTone, { label: "Inherited" });
  const fieldChild = createCliBlock(renderTone, {
    label: "Field",
    appearance: {},
  });
  const blueChild = createCliBlock(renderTone, {
    label: "Blue",
    appearance: { accent: 255 },
  });
  const greenChild = createCliBlock(renderTone, {
    label: "Green",
    appearance: { accent: 120 },
  });
  const violetChild = createCliBlock(renderTone, {
    label: "Violet",
    appearance: { accent: 245 },
  });

  const fieldTree = createCliBlock(renderComposite, {
    children: [inherited, blueChild, greenChild, inherited],
    appearance: {},
  });
  const fieldOutput = renderCliBlock(fieldTree, capabilities).split("\n\n");
  assertEquals(fieldOutput[0], fieldOutput[3]);
  assertNotEquals(fieldOutput[0], fieldOutput[1]);
  assertNotEquals(fieldOutput[1], fieldOutput[2]);

  const accentTree = createCliBlock(renderComposite, {
    children: [inherited, fieldChild, violetChild, inherited],
    appearance: { accent: 335 },
  });
  const accentOutput = renderCliBlock(accentTree, capabilities).split("\n\n");
  assertEquals(accentOutput[0], accentOutput[3]);
  assertNotEquals(accentOutput[0], accentOutput[1]);
  assertNotEquals(accentOutput[0], accentOutput[2]);
});

Deno.test("CLI block nesting has one deterministic depth ceiling", () => {
  const capabilities = testTerminalCapabilities({ columns: 20 });
  let block = createCliBlock(renderFixture, { value: "leaf" });
  for (let depth = 0; depth < CLI_BLOCK_MAX_DEPTH - 1; depth += 1) {
    block = createCliBlock(renderFixture, { value: "", child: block });
  }
  assertEquals(renderCliBlock(block, capabilities), "leaf");
  const tooDeep = createCliBlock(renderFixture, { value: "", child: block });
  assertThrows(
    () => renderCliBlock(tooDeep, capabilities),
    TypeError,
    `exceeds ${CLI_BLOCK_MAX_DEPTH}`,
  );
});
