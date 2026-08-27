import type { TerminalThemeVariant } from "../../../src/cli/theme.ts";
import { cliCompositionRecipes } from "../../cli-compositions.ts";
import { TerminalLayoutRecipe } from "../../terminal-layout-inspector.tsx";
import { CataloguePageHeader } from "../shared.tsx";

export function TerminalPage(
  { terminalTheme }: { readonly terminalTheme: TerminalThemeVariant },
) {
  return (
    <div className="discern-catalogue-page" id="terminal-layouts">
      <CataloguePageHeader
        index="05"
        eyebrow="Terminal layouts"
        title="See the frame, not just the text."
        description="Test complete CLI layouts at deliberate terminal sizes."
      />
      <h2 className="discern-visually-hidden">Terminal layout recipes</h2>
      <div className="discern-catalogue-terminal-layouts">
        {cliCompositionRecipes.map((recipe) => (
          <TerminalLayoutRecipe
            recipe={recipe}
            theme={terminalTheme}
            key={recipe.id}
          />
        ))}
      </div>
    </div>
  );
}
