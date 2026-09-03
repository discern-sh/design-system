import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Button } from "../../../src/components/core/button/button.tsx";
import { CopyButton } from "../../../src/components/docs/copy-button/copy-button.tsx";
import { Badge } from "../../../src/components/display/badge/badge.tsx";
import { AvatarGroup } from "../../../src/components/people/avatar-group/avatar-group.tsx";
import { Avatar } from "../../../src/components/people/avatar/avatar.tsx";
import {
  accentAppearance,
  type AppearanceName,
  evaluateAppearance,
  fieldAppearance,
  type FieldAxisName,
  fieldColorRoleLaws,
} from "../../../src/tokens/field.ts";
import { appearanceAdmission } from "../../../src/tokens/tokens.ts";
import { catalogueAccentHueLabel } from "../../shell/appearance-options.ts";
import { FieldAxisControl } from "../../shell/field-axis-control.tsx";
import type { CatalogueFieldSelection } from "../../shell/field-state.ts";
import {
  catalogueFieldPolarity,
  catalogueFieldStyle,
  defaultCatalogueFieldSelection,
  serializeCatalogueFieldSelection,
} from "../../shell/field-state.ts";
import {
  type CatalogueTerminalPresentation,
  resolveCatalogueTerminalPresentation,
} from "../../terminal-theme.ts";
import { CataloguePageHeader } from "../shared.tsx";
import { catalogueFieldConsumerSnippet } from "./field-export.ts";
import { fieldPoleTerminalProjections } from "./field-terminal.ts";
import { TerminalAppearanceScopes } from "./terminal-appearance-scopes.tsx";

export interface FieldPageProps {
  readonly appearance?: AppearanceName | undefined;
  readonly accentHue?: number | undefined;
  readonly field?: CatalogueFieldSelection | undefined;
  readonly fieldScheme?: "light" | "dark" | undefined;
  readonly terminalPresentation?: CatalogueTerminalPresentation | undefined;
  readonly onFieldChange?:
    | ((field: CatalogueFieldSelection) => void)
    | undefined;
}

function ScopeCard(
  {
    id,
    title,
    description,
    parentAppearance,
    parentHue,
    childAppearance,
    childHue,
    axes,
    parent,
    child,
  }: {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly parentAppearance: AppearanceName;
    readonly parentHue?: number;
    readonly childAppearance: AppearanceName;
    readonly childHue?: number;
    readonly axes: CatalogueFieldSelection;
    readonly parent: ReactNode;
    readonly child: ReactNode;
  },
) {
  const hueStyle = (hue?: number): CSSProperties | undefined =>
    hue === undefined
      ? undefined
      : { "--discern-accent-hue": hue } as CSSProperties;
  return (
    <article
      className="discern-catalogue-field-scope"
      data-discern-scope-demo={id}
      data-discern-appearance={parentAppearance}
      style={hueStyle(parentHue)}
    >
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
        <small>
          Inherits Structure {axes.structure} · Density {axes.density}
        </small>
      </header>
      <div className="discern-catalogue-field-scope__specimen">
        <div>{parent}</div>
        <div
          className="discern-catalogue-field-scope__nested"
          data-discern-appearance={childAppearance}
          style={hueStyle(childHue)}
        >
          <strong>
            Nested {childAppearance === "field"
              ? "Field"
              : catalogueAccentHueLabel(childHue ?? 255)}
          </strong>
          {child}
        </div>
      </div>
    </article>
  );
}

/** Live browser instrument for the shared Field and Accent projection. */
export function FieldPage(
  {
    appearance = "field",
    accentHue = 255,
    field,
    fieldScheme,
    terminalPresentation,
    onFieldChange,
  }: FieldPageProps = {},
) {
  const [localSelection, setLocalSelection] = useState(
    defaultCatalogueFieldSelection,
  );
  const selection = field ?? localSelection;
  const [computedRoles, setComputedRoles] = useState<
    Readonly<Record<string, string>>
  >({});
  const pageRef = useRef<HTMLDivElement>(null);
  const identity = appearance === "field"
    ? fieldAppearance
    : accentAppearance(accentHue);
  const evaluated = evaluateAppearance(identity, selection);
  const polarity = catalogueFieldPolarity(selection);
  const proof = appearanceAdmission();
  const consumerSnippet = catalogueFieldConsumerSnippet(
    selection,
    appearance,
    accentHue,
  );
  const resolvedTerminalPresentation = terminalPresentation ??
    resolveCatalogueTerminalPresentation(
      fieldScheme ?? polarity,
      appearance,
      accentHue,
    );
  const terminalPoles = fieldPoleTerminalProjections(
    resolvedTerminalPresentation.appearance,
  );
  const foundationsHref = `/catalogue/foundations/?${
    new URLSearchParams({
      appearance,
      accent: String(accentHue),
      field: serializeCatalogueFieldSelection(selection),
    }).toString()
  }`;

  useEffect(() => {
    const root = pageRef.current;
    if (root === null) return;
    const roles = Object.fromEntries(
      [...root.querySelectorAll<HTMLElement>("[data-discern-field-role]")]
        .map((swatch) => [
          swatch.dataset.discernFieldRole ?? "",
          getComputedStyle(swatch).backgroundColor,
        ]),
    );
    setComputedRoles(roles);
  }, [accentHue, appearance, fieldScheme, selection]);

  const changeSelection = (next: CatalogueFieldSelection): void => {
    if (onFieldChange === undefined) setLocalSelection(next);
    else onFieldChange(next);
  };
  const changeAxis = (axis: FieldAxisName, value: number): void => {
    changeSelection({ ...selection, [axis]: value });
  };

  return (
    <div
      ref={pageRef}
      className="discern-catalogue-page discern-catalogue-field"
      data-discern-foundations-page="field"
      data-discern-appearance={onFieldChange === undefined
        ? appearance
        : undefined}
      style={onFieldChange === undefined
        ? catalogueFieldStyle(selection, fieldScheme, accentHue)
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
        title="Field"
        description="Place the live system at one point, inspect every derived role, and verify Field and Accent scopes in both directions."
      />

      <div className="discern-catalogue-field__instrument">
        <section
          className="discern-catalogue-field__controls"
          aria-labelledby="discern-catalogue-field-controls-heading"
        >
          <div>
            <h2 id="discern-catalogue-field-controls-heading">Field point</h2>
            <p>
              These are the same controls as the global Appearance panel.
            </p>
          </div>
          {(
            ["darkness", "structure", "emphasis", "density"] as const
          ).map((axis) => (
            <FieldAxisControl
              key={axis}
              axis={axis}
              value={selection[axis]}
              onChange={(value) => changeAxis(axis, value)}
            />
          ))}
        </section>

        <section
          className="discern-catalogue-field__reading"
          aria-labelledby="discern-catalogue-field-reading-heading"
        >
          <div>
            <h2 id="discern-catalogue-field-reading-heading">
              Current projection
            </h2>
            <p>
              <strong>
                {appearance === "field"
                  ? "Field"
                  : `Accent · ${catalogueAccentHueLabel(accentHue)}`}
              </strong>{" "}
              at a {polarity} token polarity. Native colour scheme is{" "}
              <strong>{fieldScheme ?? polarity}</strong>.
            </p>
          </div>
          <div className="discern-catalogue-field__pair">
            {(
              [
                ["Canvas", "--discern-color-canvas"],
                ["Ink", "--discern-color-ink"],
              ] as const
            ).map(([label, role]) => (
              <div key={role}>
                <span
                  data-discern-field-role={role}
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
        className="discern-catalogue-field__scopes"
        aria-labelledby="discern-catalogue-field-scopes-heading"
      >
        <div>
          <h2 id="discern-catalogue-field-scopes-heading">
            Symmetric appearance scopes
          </h2>
          <p>
            Each nested region changes colour identity only. Structure and
            Density continue to come from the current parent field point.
          </p>
        </div>
        <div className="discern-catalogue-field__scope-grid">
          <ScopeCard
            id="field-to-accent-255"
            title="Field → Accent 255"
            description="Blue is the hue-255 convenience, not a separate role table."
            parentAppearance="field"
            childAppearance="accent"
            childHue={255}
            axes={selection}
            parent={<Button variant="secondary">Field action</Button>}
            child={
              <div>
                <Button variant="primary">Accent action</Button>
                <Badge tone="success" dot>Ready</Badge>
              </div>
            }
          />
          <ScopeCard
            id="accent-120-to-field"
            title="Accent 120 → Field"
            description="An achromatic region replaces colour inside a green Accent parent."
            parentAppearance="accent"
            parentHue={120}
            childAppearance="field"
            axes={selection}
            parent={<Button variant="primary">Accent parent</Button>}
            child={
              <div>
                <Button variant="secondary">Field action</Button>
                <Badge tone="warning" dot>Review</Badge>
              </div>
            }
          />
          <ScopeCard
            id="accent-245-to-accent-335"
            title="Accent 245 → Accent 335"
            description="A nested Accent replaces the local hue without resetting the field."
            parentAppearance="accent"
            parentHue={245}
            childAppearance="accent"
            childHue={335}
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
        className="discern-catalogue-field__proof"
        data-discern-field-proof={proof.accepted ? "accepted" : "refused"}
        aria-labelledby="discern-catalogue-field-proof-heading"
      >
        <div className="discern-catalogue-field__proof-heading">
          <div>
            <h2 id="discern-catalogue-field-proof-heading">
              Package admission
            </h2>
            <p>
              The Catalogue consumes the package proof across the complete hue
              circle and signed field postures.
            </p>
          </div>
          <strong>{proof.accepted ? "Admitted" : "Refused"}</strong>
        </div>
        <dl className="discern-catalogue-field__proof-summary">
          <div>
            <dt>Appearances</dt>
            <dd>{proof.appearances}</dd>
          </div>
          <div>
            <dt>Field points</dt>
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
            <ul className="discern-catalogue-field__refusals">
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
        className="discern-catalogue-field__terminal"
        aria-labelledby="discern-catalogue-field-terminal-heading"
      >
        <div>
          <h2 id="discern-catalogue-field-terminal-heading">
            Terminal appearance at the poles
          </h2>
          <p>
            The selected Field or Accent appearance keeps the same hue while
            each terminal uses an honest light or dark ground.
          </p>
        </div>
        <div className="discern-catalogue-field__terminal-grid">
          {terminalPoles.map((projection) => (
            <article key={projection.theme}>
              <h3>{projection.theme === "light" ? "Light" : "Dark"} pole</h3>
              <div
                data-discern-field-terminal-pole={projection.theme}
                data-discern-terminal-appearance={resolvedTerminalPresentation
                  .appearance.name}
                data-discern-terminal-accent-hue={resolvedTerminalPresentation
                    .appearance.name === "accent"
                  ? resolvedTerminalPresentation.appearance.hue
                  : undefined}
                dangerouslySetInnerHTML={{
                  __html: projection.inspectorHtml,
                }}
              />
            </article>
          ))}
        </div>
      </section>

      <section
        className="discern-catalogue-field__export"
        aria-labelledby="discern-catalogue-field-export-heading"
      >
        <div>
          <h2 id="discern-catalogue-field-export-heading">Take this point</h2>
          <p>
            Copy the same public Root and Appearance scope used by this page.
          </p>
        </div>
        <pre><code>{consumerSnippet}</code></pre>
        <CopyButton
          value={consumerSnippet}
          label="Copy consumer field snippet"
          copiedLabel="Consumer field snippet copied"
        />
      </section>

      <section
        className="discern-catalogue-field__roles"
        aria-labelledby="discern-catalogue-field-roles-heading"
      >
        <div>
          <h2 id="discern-catalogue-field-roles-heading">Derived roles</h2>
          <p>
            Each swatch paints through the public scope; the value beside it is
            read back from the browser.
          </p>
        </div>
        <div className="discern-catalogue-field__role-grid">
          {fieldColorRoleLaws.map(({ name }) => (
            <article key={name}>
              <span
                data-discern-field-role={name}
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
