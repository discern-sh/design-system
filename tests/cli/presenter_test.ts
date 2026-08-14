import { assertEquals, assertStrictEquals, assertThrows } from "@std/assert";
import type { CliRenderer } from "../../src/cli/contracts.ts";
import {
  renderNoteLine,
  renderSuccessLine,
  styleSemanticText,
} from "../../src/cli/narration.ts";
import { createCliPresenter } from "../../src/cli/presenter.ts";
import type { TerminalThemeVariant } from "../../src/cli/theme.ts";
import { renderTrianglePattern } from "../../src/cli/triangles.ts";
import renderBadgeCli from "../../src/components/display/badge/badge.cli.ts";
import renderToastCli from "../../src/components/feedback/toast/toast.cli.ts";
import { cliComponentRegistry } from "../../src/generated/cli-registry.ts";
import { loadRenderedCliModule } from "../../scripts/cli-inventory.ts";
import { testCapabilities } from "./helpers.ts";

type PresentableRenderer = CliRenderer<{
  readonly theme?: TerminalThemeVariant;
}>;

Deno.test("a bound present call is byte-equal to the manual renderer call", () => {
  for (
    const capabilities of [
      testCapabilities(),
      testCapabilities({ colorDepth: "truecolor" }),
      testCapabilities({ unicode: false, colorDepth: "ansi16" }),
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
  const capabilities = testCapabilities({ colorDepth: "truecolor" });
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
  const capabilities = testCapabilities({ colorDepth: "truecolor" });
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
  const capabilities = testCapabilities();
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
  const capabilities = testCapabilities({ colorDepth: "truecolor" });
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
  const capabilities = testCapabilities();
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
  const capabilities = testCapabilities({ colorDepth: "truecolor" });
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
  const capabilities = testCapabilities();
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
    testCapabilities(),
    testCapabilities({ colorDepth: "truecolor" }),
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
