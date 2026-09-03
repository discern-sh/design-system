import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Button } from "../../../src/components/core/button/button.tsx";
import { CopyButton } from "../../../src/components/docs/copy-button/copy-button.tsx";
import { Badge } from "../../../src/components/display/badge/badge.tsx";
import { AvatarGroup } from "../../../src/components/people/avatar-group/avatar-group.tsx";
import { Avatar } from "../../../src/components/people/avatar/avatar.tsx";
import {
  type AppearanceAxisName,
  appearanceColorRoleLaws,
  appearanceProjection,
  evaluateAppearance,
  pigmentTintAxisNames,
  primaryAppearanceAxisNames,
} from "../../../src/tokens/appearance.ts";
import { appearanceAdmission } from "../../../src/tokens/tokens.ts";
import { catalogueAccentHueLabel } from "../../shell/appearance-options.ts";
import { AxisControl } from "../../shell/axis-control.tsx";
import type { CatalogueAxesSelection } from "../../shell/axes-state.ts";
import {
  catalogueAppearanceRootStyle,
  catalogueAxesPolarity,
  defaultCatalogueAxesSelection,
  serializeCatalogueAxes,
} from "../../shell/axes-state.ts";
import { CATALOGUE_ACCENT_NONE } from "../../shell/appearance-state.ts";
import {
  type CatalogueTerminalPresentation,
  resolveCatalogueTerminalPresentation,
} from "../../terminal-theme.ts";
import { CataloguePageHeader } from "../shared.tsx";
import { catalogueAppearanceConsumerSnippet } from "./appearance-export.ts";
import { appearancePoleTerminalProjections } from "./appearance-terminal.ts";
import { TerminalAppearanceScopes } from "./terminal-appearance-scopes.tsx";

export interface AppearancePageProps {
  /** Accent hue, or `undefined` for monochrome. */
  readonly accent?: number | undefined;
  readonly field?: CatalogueAxesSelection | undefined;
  readonly fieldScheme?: "light" | "dark" | undefined;
  readonly terminalPresentation?: CatalogueTerminalPresentation | undefined;
  readonly onFieldChange?:
    | ((field: CatalogueAxesSelection) => void)
    | undefined;
}

/** Explicit scope attribute: an accent hue switches Accent on, `none` restores monochrome. */
function scopeProps(accent: number | undefined): {
  readonly "data-discern-accent": string;
  readonly style?: CSSProperties;
} {
  return accent === undefined ? { "data-discern-accent": "none" } : {
    "data-discern-accent": "",
    style: { "--discern-accent-hue": accent } as CSSProperties,
  };
}

function scopeLabel(accent: number | undefined): string {
  return accent === undefined ? "Monochrome" : catalogueAccentHueLabel(accent);
}

function ScopeCard(
  {
    id,
    title,
    description,
    parentAccent,
    childAccent,
    axes,
    parent,
    child,
  }: {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly parentAccent?: number;
    readonly childAccent?: number;
    readonly axes: CatalogueAxesSelection;
    readonly parent: ReactNode;
    readonly child: ReactNode;
  },
) {
  return (
    <article
      className="discern-catalogue-appearance-scope"
      data-discern-scope-demo={id}
      {...scopeProps(parentAccent)}
    >
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
        <small>
          Inherits Structure {axes.structure} · Density {axes.density}
        </small>
      </header>
      <div className="discern-catalogue-appearance-scope__specimen">
        <div>{parent}</div>
        <div
          className="discern-catalogue-appearance-scope__nested"
          {...scopeProps(childAccent)}
        >
          <strong>Nested {scopeLabel(childAccent)}</strong>
          {child}
        </div>
      </div>
    </article>
  );
}

/** Live browser instrument for the shared appearance projection. */
export function AppearancePage(
  {
    accent,
    field,
    fieldScheme,
    terminalPresentation,
    onFieldChange,
  }: AppearancePageProps = {},
) {
  const [localSelection, setLocalSelection] = useState(
    defaultCatalogueAxesSelection,
  );
  const selection = field ?? localSelection;
  const [computedRoles, setComputedRoles] = useState<
    Readonly<Record<string, string>>
  >({});
  const pageRef = useRef<HTMLDivElement>(null);
  const evaluated = evaluateAppearance({ ...selection, accent });
  const polarity = catalogueAxesPolarity(selection);
  const proof = appearanceAdmission();
  const consumerSnippet = catalogueAppearanceConsumerSnippet(
    selection,
    accent,
  );
  const resolvedTerminalPresentation = terminalPresentation ??
    resolveCatalogueTerminalPresentation(
      fieldScheme ?? polarity,
      accent,
      selection,
    );
  const terminalPoles = appearancePoleTerminalProjections(
    resolvedTerminalPresentation.appearance,
  );
  const foundationsHref = `/catalogue/foundations/?${
    new URLSearchParams({
      accent: accent === undefined ? CATALOGUE_ACCENT_NONE : String(accent),
      field: serializeCatalogueAxes(selection),
    }).toString()
  }`;

  useEffect(() => {
    const root = pageRef.current;
    if (root === null) return;
    const roles = Object.fromEntries(
      [...root.querySelectorAll<HTMLElement>("[data-discern-appearance-role]")]
        .map((swatch) => [
          swatch.dataset.discernAppearanceRole ?? "",
          getComputedStyle(swatch).backgroundColor,
        ]),
    );
    setComputedRoles(roles);
  }, [accent, fieldScheme, selection]);

  const changeSelection = (next: CatalogueAxesSelection): void => {
    if (onFieldChange === undefined) setLocalSelection(next);
    else onFieldChange(next);
  };
  const changeAxis = (axis: AppearanceAxisName, value: number): void => {
    changeSelection({ ...selection, [axis]: value });
  };
  const standalone = onFieldChange === undefined;

  return (
    <div
      ref={pageRef}
      className="discern-catalogue-page discern-catalogue-appearance-page"
      data-discern-foundations-page="appearance"
      data-discern-accent={standalone && accent !== undefined ? "" : undefined}
      style={standalone
        ? catalogueAppearanceRootStyle(selection, fieldScheme, accent)
        : undefined}
    >
      <a
        className="discern-catalogue-foundations__back"
        href={foundationsHref}
      >
        ← Foundations
      </a>
      <CataloguePageHeader
        index="04"
        eyebrow="Foundations"
        title="Appearance"
        description="Place the live system at one appearance, inspect every derived role, and verify monochrome and Accent scopes in both directions."
      />

      <div className="discern-catalogue-appearance-page__instrument">
        <section
          className="discern-catalogue-appearance-page__controls"
          aria-labelledby="discern-catalogue-appearance-controls-heading"
        >
          <div>
            <h2 id="discern-catalogue-appearance-controls-heading">
              Axes
            </h2>
            <p>
              These are the same controls as the global Appearance panel.
            </p>
          </div>
          {primaryAppearanceAxisNames.map((axis) => (
            <AxisControl
              key={axis}
              axis={axis}
              value={selection[axis]}
              onChange={(value) => changeAxis(axis, value)}
            />
          ))}
        </section>

        <section
          className="discern-catalogue-appearance-page__controls"
          aria-labelledby="discern-catalogue-appearance-tint-heading"
        >
          <div>
            <h2 id="discern-catalogue-appearance-tint-heading">Tint</h2>
            <p>
              Paper and ink each take a hue and a strength. Every setting stays
              inside sRGB, and every derived role follows the pigments.
            </p>
          </div>
          {pigmentTintAxisNames.map((axis) => (
            <AxisControl
              key={axis}
              axis={axis}
              value={selection[axis]}
              onChange={(value) => changeAxis(axis, value)}
            />
          ))}
        </section>

        <section
          className="discern-catalogue-appearance-page__reading"
          aria-labelledby="discern-catalogue-appearance-reading-heading"
        >
          <div>
            <h2 id="discern-catalogue-appearance-reading-heading">
              Current projection
            </h2>
            <p>
              <strong>
                {accent === undefined
                  ? "Monochrome"
                  : `Accent · ${catalogueAccentHueLabel(accent)}`}
              </strong>{" "}
              at a {polarity} token polarity. Native colour scheme is{" "}
              <strong>{fieldScheme ?? polarity}</strong>.
            </p>
          </div>
          <div className="discern-catalogue-appearance-page__pair">
            {(
              [
                ["Canvas", "--discern-color-canvas"],
                ["Ink", "--discern-color-ink"],
              ] as const
            ).map(([label, role]) => (
              <div key={role}>
                <span
                  data-discern-appearance-role={role}
                  style={{ background: `var(${role})` }}
                />
                <strong>{label}</strong>
                <code>{computedRoles[role] ?? evaluated[role]}</code>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section
        className="discern-catalogue-appearance-page__scopes"
        aria-labelledby="discern-catalogue-appearance-scopes-heading"
      >
        <div>
          <h2 id="discern-catalogue-appearance-scopes-heading">
            Symmetric appearance scopes
          </h2>
          <p>
            Each nested region changes colour identity only. Structure and
            Density continue to come from the current parent appearance.
          </p>
        </div>
        <div className="discern-catalogue-appearance-page__scope-grid">
          <ScopeCard
            id="mono-to-accent-255"
            title="Monochrome → Accent 255"
            description="Blue is the hue-255 convenience, not a separate role table."
            childAccent={255}
            axes={selection}
            parent={<Button variant="secondary">Monochrome action</Button>}
            child={
              <div>
                <Button variant="primary">Accent action</Button>
                <Badge tone="success" dot>Ready</Badge>
              </div>
            }
          />
          <ScopeCard
            id="accent-120-to-mono"
            title="Accent 120 → Monochrome"
            description="A monochrome region replaces colour inside a green Accent parent."
            parentAccent={120}
            axes={selection}
            parent={<Button variant="primary">Accent parent</Button>}
            child={
              <div>
                <Button variant="secondary">Monochrome action</Button>
                <Badge tone="warning" dot>Review</Badge>
              </div>
            }
          />
          <ScopeCard
            id="accent-245-to-accent-335"
            title="Accent 245 → Accent 335"
            description="A nested Accent replaces the local hue without resetting the axes."
            parentAccent={245}
            childAccent={335}
            axes={selection}
            parent={
              <AvatarGroup label="Azure reviewers" size="sm">
                <Avatar name="Ari Vale" />
                <Avatar name="Bo Chen" />
                <Avatar name="Cy Reed" />
              </AvatarGroup>
            }
            child={
              <AvatarGroup label="Rose reviewers" size="sm">
                <Avatar name="Dee Shah" />
                <Avatar name="Eli Moss" />
                <Avatar name="Fox Lane" />
              </AvatarGroup>
            }
          />
        </div>
      </section>

      <TerminalAppearanceScopes theme={resolvedTerminalPresentation.theme} />

      <section
        className="discern-catalogue-appearance-page__proof"
        data-discern-appearance-proof={proof.accepted ? "accepted" : "refused"}
        aria-labelledby="discern-catalogue-appearance-proof-heading"
      >
        <div className="discern-catalogue-appearance-page__proof-heading">
          <div>
            <h2 id="discern-catalogue-appearance-proof-heading">
              Package admission
            </h2>
            <p>
              The Catalogue consumes the package proof across the complete hue
              circle and signed appearance postures.
            </p>
          </div>
          <strong>{proof.accepted ? "Admitted" : "Refused"}</strong>
        </div>
        <dl className="discern-catalogue-appearance-page__proof-summary">
          <div>
            <dt>Appearances</dt>
            <dd>{proof.appearances}</dd>
          </div>
          <div>
            <dt>Axis points</dt>
            <dd>{proof.points}</dd>
          </div>
          <div>
            <dt>Checks</dt>
            <dd>{proof.checks}</dd>
          </div>
        </dl>
        {proof.failures.length === 0
          ? <p>No failed package invariants.</p>
          : (
            <ul className="discern-catalogue-appearance-page__refusals">
              {proof.failures.map((failure) => (
                <li
                  key={`${failure.appearance}/${failure.point}/${failure.check}`}
                >
                  {failure.appearance} · {failure.point} · {failure.check}
                </li>
              ))}
            </ul>
          )}
      </section>

      <section
        className="discern-catalogue-appearance-page__terminal"
        aria-labelledby="discern-catalogue-appearance-terminal-heading"
      >
        <div>
          <h2 id="discern-catalogue-appearance-terminal-heading">
            Terminal appearance on both grounds
          </h2>
          <p>
            The selected appearance keeps the same accent while each terminal
            uses an honest light or dark ground.
          </p>
        </div>
        <div className="discern-catalogue-appearance-page__terminal-grid">
          {terminalPoles.map((projection) => (
            <article key={projection.theme}>
              <h3>{projection.theme === "light" ? "Light" : "Dark"}</h3>
              <div
                data-discern-appearance-terminal-pole={projection.theme}
                data-discern-terminal-appearance={appearanceProjection(
                  resolvedTerminalPresentation.appearance,
                )}
                data-discern-terminal-accent-hue={resolvedTerminalPresentation
                  .appearance.accent}
                dangerouslySetInnerHTML={{
                  __html: projection.inspectorHtml,
                }}
              />
            </article>
          ))}
        </div>
      </section>

      <section
        className="discern-catalogue-appearance-page__export"
        aria-labelledby="discern-catalogue-appearance-export-heading"
      >
        <div>
          <h2 id="discern-catalogue-appearance-export-heading">
            Take this appearance
          </h2>
          <p>
            Copy the same public Root and accent scope used by this page.
          </p>
        </div>
        <pre><code>{consumerSnippet}</code></pre>
        <CopyButton
          value={consumerSnippet}
          label="Copy consumer appearance snippet"
          copiedLabel="Consumer appearance snippet copied"
        />
      </section>

      <section
        className="discern-catalogue-appearance-page__roles"
        aria-labelledby="discern-catalogue-appearance-roles-heading"
      >
        <div>
          <h2 id="discern-catalogue-appearance-roles-heading">Derived roles</h2>
          <p>
            Each swatch paints through the public scope; the value beside it is
            read back from the browser.
          </p>
        </div>
        <div className="discern-catalogue-appearance-page__role-grid">
          {appearanceColorRoleLaws.map(({ name }) => (
            <article key={name}>
              <span
                data-discern-appearance-role={name}
                style={{ background: `var(${name})` }}
              />
              <code>{name}</code>
              <small>{computedRoles[name] ?? evaluated[name]}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
