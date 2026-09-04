import {
  assertEquals,
  assertNotEquals,
  assertStrictEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import { renderBox } from "../../src/cli/box.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import type {
  CliPresentationOptions,
  CliRenderer,
} from "../../src/cli/contracts.ts";
import { DISCERN_TERMINAL_MOTIF } from "../../src/cli/motif.ts";
import {
  renderNoteLine,
  renderSuccessLine,
  styleSemanticText,
} from "../../src/cli/narration.ts";
import {
  type CliPresenter,
  createCliPresenter,
} from "../../src/cli/presenter.ts";
import type { TerminalThemeVariant } from "../../src/cli/theme.ts";
import {
  renderMotifPattern,
  renderMotifSectionRule,
  renderMotifSpinnerFrame,
  renderMotifWorkflowStepper,
} from "../../src/cli/motifs.ts";
import renderBadgeCli from "../../src/components/display/badge/badge.cli.ts";
import renderToastCli from "../../src/components/feedback/toast/toast.cli.ts";
import renderTimelineCli from "../../src/components/editorial/timeline/timeline.cli.ts";
import { cliComponentRegistry } from "../../src/generated/cli-registry.ts";
import { loadRenderedCliModule } from "../../scripts/cli-inventory.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import { TEST_TERMINAL_MOTIF } from "./motif_fixture.ts";

type PresentableRenderer = CliRenderer<CliPresentationOptions>;

const CUSTOM_MOTIF = TEST_TERMINAL_MOTIF;

// ◐ also carries non-motif presence and artwork semantics, and the plain
// triangles are package-owned design geometry any renderer may emit, so
// only glyphs exclusive to the preset can prove a reset to that preset.
const DISCERN_EXCLUSIVE_MOTIF_GLYPHS = [
  "◮",
  "⧩",
  "◭",
  "⧨",
  "◓",
  "◑",
  "◒",
] as const;

function discernMotifGlyphLeaks(output: string): readonly string[] {
  return DISCERN_EXCLUSIVE_MOTIF_GLYPHS.filter((glyph) =>
    output.includes(glyph)
  );
}

type StringFunctionKeys<Surface> = {
  [Key in keyof Surface]: Surface[Key] extends (
    ...args: infer _Args
  ) => string ? Key
    : never;
}[keyof Surface];

type PresenterCompatibleKeys<Surface> = {
  [Key in StringFunctionKeys<Surface>]: Surface[Key] extends (
    props: infer Props,
    capabilities: TerminalCapabilities,
  ) => string ? "theme" extends keyof Props ? Key
    : never
    : never;
}[StringFunctionKeys<Surface>];

type FoundationSurface =
  & typeof import("../../src/cli/box.ts")
  & typeof import("../../src/cli/motifs.ts");

type PresenterOwnedFoundationRenderer = Exclude<
  StringFunctionKeys<FoundationSurface>,
  PresenterCompatibleKeys<FoundationSurface>
>;

type StringPresenterMethod = StringFunctionKeys<CliPresenter>;

type FoundationBindingContract = {
  [Renderer in PresenterOwnedFoundationRenderer]: Renderer extends
    `render${infer Name}`
    ? Uncapitalize<Name> extends StringPresenterMethod ? Uncapitalize<Name>
    : never
    : never;
};

const presenterFoundationBindingMethods = {
  renderBox: "box",
  renderMotifSectionRule: "motifSectionRule",
  renderMotifSpinnerFrame: "motifSpinnerFrame",
  renderMotifWorkflowStepper: "motifWorkflowStepper",
} as const satisfies FoundationBindingContract;

type AdversarialFoundationSurface = {
  readonly drawPulse: (
    label: string,
    capabilities: TerminalCapabilities,
    options?: { readonly theme?: TerminalThemeVariant },
  ) => string;
};

const adversarialFutureSibling: Exclude<
  StringFunctionKeys<AdversarialFoundationSurface>,
  PresenterCompatibleKeys<AdversarialFoundationSurface>
> = "drawPulse";

Deno.test("every non-presentable box and motif renderer has a presenter binding", () => {
  assertEquals(presenterFoundationBindingMethods, {
    renderBox: "box",
    renderMotifSectionRule: "motifSectionRule",
    renderMotifSpinnerFrame: "motifSpinnerFrame",
    renderMotifWorkflowStepper: "motifWorkflowStepper",
  });
  assertEquals(adversarialFutureSibling, "drawPulse");
});

Deno.test("foundation bindings resolve capabilities and theme byte-for-byte", () => {
  const steps = [
    { label: "Inspect", status: "complete" as const },
    { label: "Apply", status: "active" as const, phase: 2 },
  ];
  for (
    const capabilities of [
      testTerminalCapabilities({ columns: 80 }),
      testTerminalCapabilities({
        columns: 80,
        colorDepth: "truecolor",
      }),
      testTerminalCapabilities({
        columns: 80,
        unicode: false,
        colorDepth: "ansi16",
      }),
    ]
  ) {
    for (const theme of ["light", "dark"] as const) {
      const effective = { ...capabilities, columns: 48 };
      const presenter = createCliPresenter(capabilities, { theme, width: 48 });
      assertEquals(
        presenter.box({ body: "Ready", title: "Status" }),
        renderBox({ body: "Ready", title: "Status" }, effective),
      );
      assertEquals(
        presenter.motifSpinnerFrame(2),
        renderMotifSpinnerFrame(2, effective, {
          theme,
          motif: DISCERN_TERMINAL_MOTIF,
        }),
      );
      assertEquals(
        presenter.motifSectionRule("Status", { width: 80 }),
        renderMotifSectionRule(
          "Status",
          { width: 80, theme, motif: DISCERN_TERMINAL_MOTIF },
          effective,
        ),
      );
      assertEquals(
        presenter.motifWorkflowStepper(steps),
        renderMotifWorkflowStepper(steps, effective, {
          theme,
          motif: DISCERN_TERMINAL_MOTIF,
        }),
      );
    }
  }
});

Deno.test("foundation call overrides win over presenter defaults", () => {
  const capabilities = testTerminalCapabilities({
    columns: 80,
    colorDepth: "truecolor",
  });
  const effective = { ...capabilities, columns: 48 };
  const presenter = createCliPresenter(capabilities, {
    theme: "light",
    width: 48,
  });
  const steps = [{ label: "Apply", status: "active" as const, phase: 2 }];

  assertEquals(
    presenter.motifSpinnerFrame(2, { theme: "dark" }),
    renderMotifSpinnerFrame(2, effective, { theme: "dark" }),
  );
  assertEquals(
    presenter.motifSectionRule("Status", { width: 80, theme: "dark" }),
    renderMotifSectionRule(
      "Status",
      { width: 80, theme: "dark" },
      effective,
    ),
  );
  assertEquals(
    presenter.motifWorkflowStepper(steps, { theme: "dark" }),
    renderMotifWorkflowStepper(steps, effective, { theme: "dark" }),
  );
  assertNotEquals(
    presenter.motifSectionRule("Status", { width: 80 }),
    renderMotifSectionRule("Status", { width: 80 }, effective),
    "a light presenter must not silently render the section rule's dark default",
  );
});

Deno.test("presenter motifs bind globally, override per call, and reach semantic roles", () => {
  const capabilities = testTerminalCapabilities({ columns: 48 });
  const presenter = createCliPresenter(capabilities, {
    motif: CUSTOM_MOTIF,
  });
  assertStrictEquals(presenter.motif, CUSTOM_MOTIF);
  assertEquals(presenter.motifSpinnerFrame(1), "◷");
  assertStringIncludes(
    presenter.present(renderMotifPattern, { length: 4 }),
    "▵▹▿◃",
  );
  assertEquals(presenter.note("Custom marker"), "▸ Custom marker");
  assertStringIncludes(
    presenter.present(renderTimelineCli, {
      title: "Status",
      items: [{
        date: "Now",
        title: "Custom",
        description: "Uses the incomplete role.",
        status: "current",
      }],
    }),
    "▿ Now",
  );
  assertEquals(
    presenter.motifSpinnerFrame(0, {
      motif: DISCERN_TERMINAL_MOTIF,
    }),
    "◐",
  );
  assertEquals(
    presenter.present(renderMotifPattern, {
      length: 4,
      motif: DISCERN_TERMINAL_MOTIF,
    }),
    "▲▷▼◁",
  );
  assertEquals(
    presenter.present(renderMotifPattern, {
      length: 4,
      motif: DISCERN_TERMINAL_MOTIF,
      register: "brand",
    }),
    "◮⧩◭⧨",
  );
});

Deno.test("presenter binds, overrides, and derives the complete motif register", () => {
  const capabilities = testTerminalCapabilities({ columns: 8 });
  const branded = createCliPresenter(capabilities, { register: "brand" });
  assertEquals(branded.register, "brand");
  assertEquals(
    branded.present(renderMotifPattern, { length: 4 }),
    "◮⧩◭⧨",
  );
  assertEquals(
    branded.present(renderMotifPattern, { length: 4, register: "plain" }),
    "▲▷▼◁",
  );

  const plain = branded.with({ register: "plain" });
  assertEquals(plain.register, "plain");
  assertEquals(plain.present(renderMotifPattern, { length: 4 }), "▲▷▼◁");
  assertEquals(
    plain.present(renderMotifPattern, { length: 4, register: "brand" }),
    "◮⧩◭⧨",
  );
});

Deno.test("the motif leak guard catches an unrelated renderer that resets the default", () => {
  const capabilities = testTerminalCapabilities({ columns: 8 });
  const presenter = createCliPresenter(capabilities, {
    motif: CUSTOM_MOTIF,
  });
  const renderPulse: CliRenderer<CliPresentationOptions> = (
    _props,
    terminal,
  ) => renderMotifSpinnerFrame(1, terminal);

  assertEquals(
    discernMotifGlyphLeaks(presenter.present(renderPulse, {})),
    ["◓"],
  );
});

Deno.test("a bound present call is byte-equal to the manual renderer call", () => {
  for (
    const capabilities of [
      testTerminalCapabilities(),
      testTerminalCapabilities({ colorDepth: "truecolor" }),
      testTerminalCapabilities({ unicode: false, colorDepth: "ansi16" }),
    ]
  ) {
    const presenter = createCliPresenter(capabilities);
    assertEquals(
      presenter.present(renderBadgeCli, { label: "Active", dot: true }),
      renderBadgeCli({ label: "Active", dot: true }, capabilities),
    );
    assertEquals(
      presenter.present(renderToastCli, { message: "Saved.", tone: "success" }),
      renderToastCli({ message: "Saved.", tone: "success" }, capabilities),
    );
    assertEquals(
      presenter.present(renderMotifPattern, { length: 8 }),
      renderMotifPattern({ length: 8 }, capabilities),
    );
  }
});

Deno.test("bound theme and width defaults replace the consumer shims", () => {
  const capabilities = testTerminalCapabilities({ colorDepth: "truecolor" });
  const presenter = createCliPresenter(capabilities, {
    theme: "light",
    width: 48,
  });
  assertEquals(
    presenter.present(renderToastCli, { message: "Saved." }),
    renderToastCli({ message: "Saved.", theme: "light" }, {
      ...capabilities,
      columns: 48,
    }),
  );
  assertEquals(
    presenter.success("Saved the draft"),
    renderSuccessLine({ text: "Saved the draft", theme: "light" }, {
      ...capabilities,
      columns: 48,
    }),
  );
});

Deno.test("presenters bind and locally override the appearance", () => {
  const capabilities = testTerminalCapabilities({
    columns: 80,
    colorDepth: "truecolor",
  });
  const renderTone: CliRenderer<CliPresentationOptions> = (
    props,
    terminal,
  ) => styleSemanticText("Tone", { ...props, tone: "accent" }, terminal);
  const field = createCliPresenter(capabilities);
  const fieldBefore = field.present(renderTone, {});
  const blue = field.present(renderTone, {
    appearance: { accent: 255 },
  });
  const green = field.present(renderTone, {
    appearance: { accent: 120 },
  });
  assertEquals(field.appearance, {});
  assertEquals(
    blue,
    renderTone(
      { theme: "dark", appearance: { accent: 255 } },
      capabilities,
    ),
  );
  assertNotEquals(blue, green);
  assertEquals(field.present(renderTone, {}), fieldBefore);

  const accent = createCliPresenter(capabilities, {
    appearance: { accent: 335 },
  });
  const inherited = accent.present(renderTone, {});
  const neutral = accent.present(renderTone, { appearance: {} });
  const changed = accent.present(renderTone, {
    appearance: { accent: 245 },
  });
  assertEquals(accent.appearance, { accent: 335 });
  assertNotEquals(inherited, neutral);
  assertNotEquals(inherited, changed);
  assertEquals(accent.present(renderTone, {}), inherited);
  assertEquals(
    accent.with({ appearance: {} }).present(renderTone, {}),
    fieldBefore,
  );
});

Deno.test("explicit props override the bound defaults one call at a time", () => {
  const capabilities = testTerminalCapabilities({ colorDepth: "truecolor" });
  const presenter = createCliPresenter(capabilities, {
    theme: "light",
    width: 60,
  });
  assertEquals(
    presenter.present(renderBadgeCli, { label: "Active", theme: "dark" }),
    renderBadgeCli({ label: "Active", theme: "dark" }, {
      ...capabilities,
      columns: 60,
    }),
  );
  assertEquals(
    presenter.present(renderToastCli, { message: "Saved.", width: 24 }),
    renderToastCli({ message: "Saved.", theme: "light", width: 24 }, {
      ...capabilities,
      columns: 60,
    }),
  );
  assertEquals(
    presenter.note("A fact worth a narrower line", { maxWidth: 18 }),
    renderNoteLine(
      { text: "A fact worth a narrower line", theme: "light", maxWidth: 18 },
      { ...capabilities, columns: 60 },
    ),
  );
});

Deno.test("presenter width narrows the terminal but never widens it", () => {
  const capabilities = testTerminalCapabilities();
  assertStrictEquals(
    createCliPresenter(capabilities, { width: 200 }).capabilities,
    capabilities,
  );
  assertEquals(
    createCliPresenter(capabilities, { width: 48 }).capabilities,
    { ...capabilities, columns: 48 },
  );
  assertStrictEquals(
    createCliPresenter(capabilities).capabilities,
    capabilities,
  );
});

Deno.test("with derives a new presenter and leaves the source untouched", () => {
  const capabilities = testTerminalCapabilities({ colorDepth: "truecolor" });
  const source = createCliPresenter(capabilities, { width: 40 });
  const before = source.success("Saved the draft");
  const light = source.with({ theme: "light" });
  const custom = source.with({ motif: CUSTOM_MOTIF });
  assertEquals(source.theme, "dark");
  assertEquals(light.theme, "light");
  assertStrictEquals(source.motif, DISCERN_TERMINAL_MOTIF);
  assertStrictEquals(custom.motif, CUSTOM_MOTIF);
  assertEquals(stripAnsi(custom.motifSpinnerFrame(0)), "◴");
  assertEquals(light.capabilities.columns, 40);
  assertEquals(source.success("Saved the draft"), before);
  assertEquals(
    light.success("Saved the draft"),
    renderSuccessLine({ text: "Saved the draft", theme: "light" }, {
      ...capabilities,
      columns: 40,
    }),
  );
  assertStrictEquals(
    source.with({ width: 200 }).capabilities,
    capabilities,
    "with must re-clamp width against the base terminal, not the narrowed one",
  );
});

Deno.test("presenter construction validates its defaults", () => {
  const capabilities = testTerminalCapabilities();
  for (const width of [0, -4, 1.5, Number.NaN]) {
    assertThrows(
      () => createCliPresenter(capabilities, { width }),
      TypeError,
      "presenter width must be a positive safe integer",
    );
  }
  assertThrows(
    () =>
      createCliPresenter(
        capabilities,
        { theme: "sepia" as TerminalThemeVariant },
      ),
    TypeError,
    "unknown terminal theme variant sepia",
  );
});

Deno.test("presenter style is the bound semantic text styler", () => {
  const capabilities = testTerminalCapabilities({ colorDepth: "truecolor" });
  const presenter = createCliPresenter(capabilities, { theme: "light" });
  assertEquals(
    presenter.style("quiet", { role: "muted" }),
    styleSemanticText("quiet", { role: "muted", theme: "light" }, capabilities),
  );
  assertEquals(
    presenter.style("Done", { tone: "success", theme: "dark" }),
    styleSemanticText("Done", { tone: "success", theme: "dark" }, capabilities),
  );
  assertEquals(presenter.style("bare"), "bare");
});

Deno.test("present accepts frozen props and mutates nothing", () => {
  const capabilities = testTerminalCapabilities();
  const presenter = createCliPresenter(capabilities, { theme: "light" });
  const props = Object.freeze({ label: "Active" });
  assertEquals(
    presenter.present(renderBadgeCli, props),
    renderBadgeCli({ label: "Active", theme: "light" }, capabilities),
  );
  assertEquals(props, { label: "Active" });
});

Deno.test("every rendered component presents byte-equal to its manual call", async () => {
  const points = [
    testTerminalCapabilities(),
    testTerminalCapabilities({ colorDepth: "truecolor" }),
  ];
  for (const [slug, entry] of Object.entries(cliComponentRegistry)) {
    if (entry.stance !== "rendered") continue;
    const module = await loadRenderedCliModule(slug, entry);
    const render = module.render as PresentableRenderer;
    for (const capabilities of points) {
      const presenter = createCliPresenter(capabilities);
      for (const example of module.examples) {
        const props = example.props as Parameters<PresentableRenderer>[0];
        assertEquals(
          presenter.present(render, props),
          render(props, capabilities),
          `${slug} example ${example.name} diverged under the presenter`,
        );
      }
    }
  }
});

Deno.test("every rendered component inherits the bound motif without discern glyph leakage", async () => {
  const capabilities = testTerminalCapabilities({ columns: 80 });
  const presenter = createCliPresenter(capabilities, {
    motif: CUSTOM_MOTIF,
  });
  const frames: string[] = [];
  for (const [slug, entry] of Object.entries(cliComponentRegistry)) {
    if (entry.stance !== "rendered") continue;
    const module = await loadRenderedCliModule(slug, entry);
    const render = module.render as PresentableRenderer;
    for (const example of module.examples) {
      const frame = presenter.present(
        render,
        example.props as Parameters<PresentableRenderer>[0],
      );
      assertEquals(
        discernMotifGlyphLeaks(frame),
        [],
        `${slug} example ${example.name} leaked the default motif`,
      );
      frames.push(frame);
    }
  }
  const output = frames.join("\n");
  for (const customGlyph of ["▵", "▿", "◉", "◶"]) {
    assertEquals(
      output.includes(customGlyph),
      true,
      `component inventory never exercised custom glyph ${customGlyph}`,
    );
  }
});
