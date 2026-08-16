import { assertEquals, assertThrows } from "@std/assert";
import { styleHyperlink, styleText } from "../../src/cli/ansi.ts";
import {
  CLI_BLOCK_MAX_DEPTH,
  type CliBlock,
  createCliBlock,
  renderCliBlock,
  renderCliBlocks,
} from "../../src/cli/block-composition.ts";
import type { CliRenderer } from "../../src/cli/contracts.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";

interface FixtureProps {
  readonly value: string;
  readonly child?: CliBlock;
}

const renderFixture: CliRenderer<FixtureProps> = (props, capabilities) => {
  if (props.child !== undefined) {
    return renderCliBlock(props.child, capabilities);
  }
  return props.value;
};

Deno.test("CLI blocks re-render at the parent measure and own one boundary", () => {
  const capabilities = testTerminalCapabilities({ columns: 40 });
  const widths: number[] = [];
  const measured: CliRenderer<Record<never, never>> = (_props, current) => {
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
