import type { TerminalCapabilities } from "../../../src/cli/capabilities.ts";
import {
  composeCliBlocks,
  createCliPresenter,
  joinVertical,
  renderBadgeCli,
  renderResultSummaryCli,
  type TerminalAppearance,
} from "../../../src/cli/mod.ts";
import { appearanceProjection } from "../../../src/tokens/appearance.ts";
import {
  catalogueCliCapabilities,
  CliOutputPreview,
} from "../../cli-preview.tsx";
import type { CatalogueTerminalPresentation } from "../../terminal-theme.ts";

/** One deliberate local terminal appearance override shown by the Appearance lab. */
export interface TerminalAppearanceScopeCase {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly parentAppearance: TerminalAppearance;
  readonly localAppearance: TerminalAppearance;
}

/** Terminal counterparts to the browser appearance-scope demonstrations. */
export const terminalAppearanceScopeCases:
  readonly TerminalAppearanceScopeCase[] = [
    {
      id: "mono-to-accent-255",
      title: "Monochrome → Accent 255",
      description:
        "A local presenter opts a status composition into the hue the Catalogue names Blue.",
      parentAppearance: {},
      localAppearance: { accent: 255 },
    },
    {
      id: "accent-120-to-mono",
      title: "Accent 120 → Monochrome",
      description:
        "A local presenter restores a monochrome status composition inside green Accent.",
      parentAppearance: { accent: 120 },
      localAppearance: {},
    },
    {
      id: "accent-245-to-accent-335",
      title: "Accent 245 → Accent 335",
      description:
        "A local presenter replaces its inherited Accent hue without changing semantic content.",
      parentAppearance: { accent: 245 },
      localAppearance: { accent: 335 },
    },
  ];

const statusProps = {
  state: "changed",
  fact: "Appearance changed locally; semantic status did not.",
  counts: [
    { label: "Components", value: "5" },
    { label: "Witnesses", value: "5" },
  ],
  nextAction: "Read each label and glyph; colour remains supplementary.",
} as const;

/** Stable semantic witnesses used in every inherited and overridden frame. */
export const terminalAppearanceScopeBadges = [
  { label: "Selected", tone: "accent", dot: true },
  { label: "Ready", tone: "success", dot: true },
  { label: "Review", tone: "warning", dot: true },
  { label: "Blocked", tone: "danger", dot: true },
] as const;

function appearanceLabel(appearance: TerminalAppearance): string {
  return appearance.accent === undefined
    ? "Monochrome"
    : `Accent ${appearance.accent}`;
}

function renderStatusComposition(
  presenter: ReturnType<typeof createCliPresenter>,
): string {
  return composeCliBlocks([
    presenter.present(renderResultSummaryCli, {
      ...statusProps,
      maxWidth: presenter.capabilities.columns,
    }),
    joinVertical(
      terminalAppearanceScopeBadges.map((props) =>
        presenter.present(renderBadgeCli, props)
      ),
      { spacing: 0 },
    ),
  ]);
}

/** The two byte frames and presentations produced by one public local override. */
export interface TerminalAppearanceScopeProjection {
  readonly definition: TerminalAppearanceScopeCase;
  readonly parentPresentation: CatalogueTerminalPresentation;
  readonly localPresentation: CatalogueTerminalPresentation;
  readonly parentOutput: string;
  readonly localOutput: string;
}

/** Render one scope case through a bound presenter and its local derivative. */
export function projectTerminalAppearanceScope(
  definition: TerminalAppearanceScopeCase,
  theme: CatalogueTerminalPresentation["theme"],
  capabilities: TerminalCapabilities = catalogueCliCapabilities,
): TerminalAppearanceScopeProjection {
  const parent = createCliPresenter(capabilities, {
    theme,
    appearance: definition.parentAppearance,
  });
  const local = parent.with({ appearance: definition.localAppearance });
  const parentPresentation = Object.freeze({
    theme: parent.theme,
    appearance: parent.appearance,
  });
  const localPresentation = Object.freeze({
    theme: local.theme,
    appearance: local.appearance,
  });
  return {
    definition,
    parentPresentation,
    localPresentation,
    parentOutput: renderStatusComposition(parent),
    localOutput: renderStatusComposition(local),
  };
}

/** Focused inspection of terminal presenter overrides in both directions. */
export function TerminalAppearanceScopes(
  { theme }: { readonly theme: CatalogueTerminalPresentation["theme"] },
) {
  const projections = terminalAppearanceScopeCases.map((definition) =>
    projectTerminalAppearanceScope(definition, theme)
  );
  return (
    <section
      id="terminal-appearance-scopes"
      className="discern-catalogue-appearance-page__terminal-scopes"
      aria-labelledby="discern-catalogue-appearance-terminal-scopes-heading"
    >
      <div>
        <h2 id="discern-catalogue-appearance-terminal-scopes-heading">
          Local terminal appearance scopes
        </h2>
        <p>
          Global Appearance remains the ordinary path. These fixed diagnostics
          prove the exception: a bound presenter can derive one local region
          without changing its semantic Component props or terminal ground.
        </p>
      </div>
      <div className="discern-catalogue-appearance-page__terminal-scope-grid">
        {projections.map((projection) => (
          <article
            key={projection.definition.id}
            data-discern-terminal-scope-demo={projection.definition.id}
            data-discern-terminal-scope-parent={appearanceProjection(
              projection.parentPresentation.appearance,
            )}
            data-discern-terminal-scope-parent-hue={projection
              .parentPresentation.appearance.accent}
            data-discern-terminal-scope-local={appearanceProjection(
              projection.localPresentation.appearance,
            )}
            data-discern-terminal-scope-local-hue={projection.localPresentation
              .appearance.accent}
          >
            <header>
              <h3>{projection.definition.title}</h3>
              <p>{projection.definition.description}</p>
              <small>Shared {theme} terminal ground</small>
            </header>
            <div className="discern-catalogue-appearance-page__terminal-scope-frames">
              <div>
                <h4>
                  Inherited {appearanceLabel(
                    projection.parentPresentation.appearance,
                  )}
                </h4>
                <CliOutputPreview
                  value={projection.parentOutput}
                  label={`${projection.definition.title}: inherited terminal composition`}
                  presentation={projection.parentPresentation}
                />
              </div>
              <div>
                <h4>
                  Local {appearanceLabel(
                    projection.localPresentation.appearance,
                  )}
                </h4>
                <CliOutputPreview
                  value={projection.localOutput}
                  label={`${projection.definition.title}: locally overridden terminal composition`}
                  presentation={projection.localPresentation}
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
