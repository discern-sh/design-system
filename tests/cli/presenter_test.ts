import {
  assertEquals,
  assertNotEquals,
  assertStrictEquals,
  assertThrows,
} from "@std/assert";
import { renderBox } from "../../src/cli/box.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import type { CliRenderer } from "../../src/cli/contracts.ts";
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
  renderTrianglePattern,
  renderTriangleSectionRule,
  renderTriangleSpinnerFrame,
  renderTriangleWorkflowStepper,
} from "../../src/cli/triangles.ts";
import renderBadgeCli from "../../src/components/display/badge/badge.cli.ts";
import renderToastCli from "../../src/components/feedback/toast/toast.cli.ts";
import { cliComponentRegistry } from "../../src/generated/cli-registry.ts";
import { loadRenderedCliModule } from "../../scripts/cli-inventory.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";

type PresentableRenderer = CliRenderer<{
  readonly theme?: TerminalThemeVariant;
}>;

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
  & typeof import("../../src/cli/triangles.ts");

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
  renderTriangleSectionRule: "triangleSectionRule",
  renderTriangleSpinnerFrame: "triangleSpinnerFrame",
  renderTriangleWorkflowStepper: "triangleWorkflowStepper",
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
    renderTriangleSectionRule: "triangleSectionRule",
    renderTriangleSpinnerFrame: "triangleSpinnerFrame",
    renderTriangleWorkflowStepper: "triangleWorkflowStepper",
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
        presenter.triangleSpinnerFrame(2),
        renderTriangleSpinnerFrame(2, effective, { theme }),
      );
      assertEquals(
        presenter.triangleSectionRule("Status", { width: 80 }),
        renderTriangleSectionRule("Status", { width: 80, theme }, effective),
      );
      assertEquals(
        presenter.triangleWorkflowStepper(steps),
        renderTriangleWorkflowStepper(steps, effective, { theme }),
      );
    }
  }
});

Deno.test("foundation motif overrides win over the presenter theme", () => {
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
    presenter.triangleSpinnerFrame(2, { theme: "dark" }),
    renderTriangleSpinnerFrame(2, effective, { theme: "dark" }),
  );
  assertEquals(
    presenter.triangleSectionRule("Status", { width: 80, theme: "dark" }),
    renderTriangleSectionRule(
      "Status",
      { width: 80, theme: "dark" },
      effective,
    ),
  );
  assertEquals(
    presenter.triangleWorkflowStepper(steps, { theme: "dark" }),
    renderTriangleWorkflowStepper(steps, effective, { theme: "dark" }),
  );
  assertNotEquals(
    presenter.triangleSectionRule("Status", { width: 80 }),
    renderTriangleSectionRule("Status", { width: 80 }, effective),
    "a light presenter must not silently render the section rule's dark default",
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
      presenter.present(renderTrianglePattern, { length: 8 }),
      renderTrianglePattern({ length: 8 }, capabilities),
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
  assertEquals(source.theme, "dark");
  assertEquals(light.theme, "light");
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
