import { Tooltip } from "../../../src/components/feedback/tooltip/tooltip.tsx";
import type { TerminalThemeVariant } from "../../../src/cli/theme.ts";
import { CliComponentPreview } from "../../cli-preview.tsx";
import type { RegistryEntry } from "../../generated/registry.ts";
import { CopyableCode, stateFragmentId } from "../shared.tsx";
import type { CatalogueSurface } from "../shared.tsx";

/** Shared complete Component contract used by detail, Compare, and conformance. */
export function ComponentPreview(
  { entry, surface, terminalTheme, headingLevel = 4, onSurfaceChange }: {
    readonly entry: RegistryEntry;
    readonly surface: CatalogueSurface;
    readonly terminalTheme: TerminalThemeVariant;
    readonly headingLevel?: 1 | 3 | 4;
    readonly onSurfaceChange?: (surface: CatalogueSurface) => void;
  },
) {
  const {
    meta,
    webExamples,
    conformance,
    selection,
    propDocumentation,
    variants,
  } = entry;
  const hasGuidance = Boolean(
    meta.useWhen?.length || meta.notWhen?.length || meta.accessibility?.length,
  );
  const cliUnavailableReason = entry.cli.stance === "exempt"
    ? entry.cli.reason
    : undefined;
  const resolvedSurface =
    surface === "cli" && cliUnavailableReason !== undefined ? "web" : surface;
  const sourceType = resolvedSurface === "web"
    ? "React"
    : entry.cli.stance === "rendered"
    ? "CLI"
    : "Metadata";
  const sourceExtension = resolvedSurface === "web"
    ? "tsx"
    : entry.cli.stance === "rendered"
    ? "cli.ts"
    : "meta.ts";
  const ComponentHeading = headingLevel === 1
    ? "h1"
    : headingLevel === 3
    ? "h3"
    : "h4";
  return (
    <article
      className="discern-catalogue-component"
      id={`component-${meta.slug}`}
      data-discern-component={meta.slug}
      data-discern-conformance-scenarios={JSON.stringify(conformance)}
    >
      <header>
        <div className="discern-catalogue-component__identity">
          <ComponentHeading>{meta.name}</ComponentHeading>
          <p>{meta.description}</p>
        </div>
        <div className="discern-catalogue-component__actions">
          {onSurfaceChange === undefined ? null : (
            <div
              className="discern-catalogue-component__surface-picker"
              role="group"
              aria-label={`${meta.name} preview surface`}
            >
              {(["web", "cli"] as const).map((candidate) => {
                if (
                  candidate === "cli" && cliUnavailableReason !== undefined
                ) {
                  return (
                    <Tooltip
                      label={cliUnavailableReason}
                      placement="bottom"
                      className="discern-catalogue-component__surface-unavailable"
                      key={candidate}
                    >
                      <span tabIndex={0} aria-label="CLI preview unavailable">
                        <button type="button" disabled>CLI</button>
                      </span>
                    </Tooltip>
                  );
                }
                return (
                  <button
                    type="button"
                    aria-pressed={resolvedSurface === candidate}
                    onClick={() => onSurfaceChange(candidate)}
                    key={candidate}
                  >
                    {candidate === "web" ? "Web" : "CLI"}
                  </button>
                );
              })}
            </div>
          )}
          <a
            href={`/catalogue/src/components/${meta.group.toLowerCase()}/${meta.slug}/${meta.slug}.${sourceExtension}`}
            target="_blank"
            aria-label={`Open ${sourceType} source for ${meta.name}`}
          >
            Open source ↗
          </a>
        </div>
      </header>
      {resolvedSurface === "cli"
        ? <CliComponentPreview entry={entry} theme={terminalTheme} />
        : (
          <div className="discern-catalogue-component__canvas">
            {webExamples.map(({ id, label, Example }) => {
              const fragmentId = stateFragmentId(meta.slug, id);
              const showStateHeader = onSurfaceChange === undefined ||
                webExamples.length !== 1 || id !== "default";
              return (
                <section
                  className="discern-catalogue-example-state"
                  id={fragmentId}
                  data-discern-example-state={id}
                  key={id}
                >
                  {showStateHeader
                    ? (
                      <header>
                        <h5>{label}</h5>
                        <a
                          href={`#${fragmentId}`}
                          aria-label={`Link to ${meta.name}: ${label}`}
                        >
                          #
                        </a>
                      </header>
                    )
                    : null}
                  <div className="discern-catalogue-example-state__canvas">
                    <Example />
                  </div>
                </section>
              );
            })}
          </div>
        )}
      {hasGuidance
        ? (
          <details className="discern-catalogue-guidance">
            <summary>Best practices</summary>
            <div>
              {meta.useWhen?.length
                ? (
                  <div>
                    <strong>Use when</strong>
                    <ul>
                      {meta.useWhen.map((note) => <li key={note}>{note}</li>)}
                    </ul>
                  </div>
                )
                : null}
              {meta.notWhen?.length
                ? (
                  <div>
                    <strong>Not when</strong>
                    <ul>
                      {meta.notWhen.map((note) => <li key={note}>{note}</li>)}
                    </ul>
                  </div>
                )
                : null}
              {meta.accessibility?.length
                ? (
                  <div>
                    <strong>Author responsibilities</strong>
                    <ul>
                      {meta.accessibility.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )
                : null}
            </div>
          </details>
        )
        : null}
      <details className="discern-catalogue-instrument">
        <summary>Selection and React import</summary>
        <div>
          <CopyableCode
            label="Component selection"
            value={selection.component}
          />
          <CopyableCode label="Group selection" value={selection.group} />
          <CopyableCode label="React import" value={selection.reactImport} />
        </div>
      </details>
      <details className="discern-catalogue-api">
        <summary>Props and variants</summary>
        <div>
          <h5>{propDocumentation.typeName}</h5>
          {propDocumentation.status === "available"
            ? (
              <>
                {propDocumentation.inheritedTypes.length
                  ? (
                    <p>
                      Also accepts{" "}
                      <code>{propDocumentation.inheritedTypes.join(", ")}
                      </code>.
                    </p>
                  )
                  : null}
                {propDocumentation.props.length
                  ? (
                    <div className="discern-catalogue-api__table">
                      <table>
                        <thead>
                          <tr>
                            <th scope="col">Prop</th>
                            <th scope="col">Type</th>
                            <th scope="col">Requirement</th>
                          </tr>
                        </thead>
                        <tbody>
                          {propDocumentation.props.map((prop) => (
                            <tr key={prop.name}>
                              <th scope="row">
                                <code>{prop.name}</code>
                                {prop.description
                                  ? <small>{prop.description}</small>
                                  : null}
                              </th>
                              <td>
                                <code>{prop.type}</code>
                              </td>
                              <td>{prop.required ? "Required" : "Optional"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                  : <p>No component-specific props.</p>}
              </>
            )
            : <p>{propDocumentation.reason}</p>}
          {variants.length
            ? (
              <div className="discern-catalogue-variants">
                {variants.map((variant) => (
                  <div key={variant.typeName}>
                    <strong>{variant.typeName}</strong>
                    <span>
                      {variant.values.map((value) => (
                        <code key={value}>{value}</code>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            )
            : null}
        </div>
      </details>
    </article>
  );
}
