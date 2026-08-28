import type { TerminalThemeVariant } from "../../../src/cli/theme.ts";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { OverflowCue } from "../../../src/components/layout/overflow-cue/overflow-cue.tsx";
import { CliComponentPreview, CliExamplePreview } from "../../cli-preview.tsx";
import type { RegistryEntry } from "../../generated/registry.ts";
import { CopyableCode, stateFragmentId } from "../shared.tsx";
import type { CatalogueSurface } from "../shared.tsx";

type ExampleHeadingLevel = 2 | 4 | 5;

function exampleHeading(level: ExampleHeadingLevel) {
  return level === 2 ? "h2" : level === 4 ? "h4" : "h5";
}

function SpecimenHeadingBoundary(
  { afterLevel, label, observeOverflow, children }: {
    readonly afterLevel: ExampleHeadingLevel;
    readonly label: string;
    readonly observeOverflow: boolean;
    readonly children: ReactNode;
  },
) {
  const root = useRef<HTMLDivElement>(null);
  const cueRoot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const normalize = () => {
      for (
        const heading of root.current?.querySelectorAll<HTMLElement>(
          "h1, h2, h3, h4, h5, h6",
        ) ?? []
      ) {
        const authored = Number(heading.tagName.slice(1));
        const level = Math.min(6, afterLevel + authored);
        let proxy = heading.querySelector<HTMLElement>(
          ":scope > [data-discern-preview-heading-proxy]",
        );
        if (proxy === null) {
          proxy = heading.ownerDocument.createElement("span");
          proxy.dataset.discernPreviewHeadingProxy = "";
          heading.dataset.discernPreviewOriginalRole =
            heading.getAttribute("role") ?? "";
          heading.dataset.discernPreviewOriginalAriaLevel =
            heading.getAttribute("aria-level") ?? "";
        }
        for (const child of [...heading.childNodes]) {
          if (child !== proxy) proxy.append(child);
        }
        if (proxy.parentNode !== heading) heading.append(proxy);
        heading.setAttribute("role", "presentation");
        heading.removeAttribute("aria-level");
        proxy.setAttribute("role", "heading");
        proxy.setAttribute("aria-level", String(level));
        proxy.dataset.discernPreviewHeadingLevel = String(level);
      }
    };
    normalize();
    const observer = new MutationObserver(normalize);
    if (root.current) {
      observer.observe(root.current, { childList: true, subtree: true });
    }
    return () => {
      observer.disconnect();
      for (
        const heading of root.current?.querySelectorAll<HTMLElement>(
          "[data-discern-preview-original-role]",
        ) ?? []
      ) {
        const proxy = heading.querySelector<HTMLElement>(
          ":scope > [data-discern-preview-heading-proxy]",
        );
        if (proxy !== null) {
          for (const child of [...proxy.childNodes]) {
            heading.insertBefore(child, proxy);
          }
          proxy.remove();
        }
        const role = heading.dataset.discernPreviewOriginalRole;
        const ariaLevel = heading.dataset.discernPreviewOriginalAriaLevel;
        if (role) heading.setAttribute("role", role);
        else heading.removeAttribute("role");
        if (ariaLevel) heading.setAttribute("aria-level", ariaLevel);
        else heading.removeAttribute("aria-level");
        delete heading.dataset.discernPreviewOriginalRole;
        delete heading.dataset.discernPreviewOriginalAriaLevel;
      }
    };
  }, [afterLevel]);
  useEffect(() => {
    const boundary = root.current;
    const cue = cueRoot.current;
    if (boundary === null || cue === null) return;
    let target: HTMLElement | undefined;
    let addedRole = false;
    let addedLabel = false;
    let addedTabIndex = false;
    const selectMaterialOverflow = (): void => {
      if (target?.isConnected) return;
      const candidates = [
        boundary,
        ...boundary.querySelectorAll<HTMLElement>("*"),
      ].filter((candidate) => {
        if (
          candidate.getClientRects().length === 0 ||
          candidate.closest("[data-discern-overflow-cue]") !== cue
        ) return false;
        const style = getComputedStyle(candidate);
        const inline = ["auto", "scroll"].includes(style.overflowX) &&
          candidate.scrollWidth - candidate.clientWidth > 16;
        const block = ["auto", "scroll"].includes(style.overflowY) &&
          candidate.scrollHeight - candidate.clientHeight > 16;
        return inline || block;
      }).sort((left, right) =>
        (right.scrollWidth - right.clientWidth) +
        (right.scrollHeight - right.clientHeight) -
        (left.scrollWidth - left.clientWidth) -
        (left.scrollHeight - left.clientHeight)
      );
      const selected = candidates[0];
      if (selected === undefined) return;
      target = selected;
      selected.setAttribute("data-discern-overflow-cue-target", "");
      if (!selected.hasAttribute("role")) {
        selected.setAttribute("role", "region");
        addedRole = true;
      }
      if (!selected.hasAttribute("aria-label")) {
        selected.setAttribute("aria-label", label);
        addedLabel = true;
      }
      if (!selected.hasAttribute("tabindex")) {
        selected.tabIndex = 0;
        addedTabIndex = true;
      }
      let background: HTMLElement | null = selected;
      while (
        background !== null &&
        getComputedStyle(background).backgroundColor === "rgba(0, 0, 0, 0)"
      ) {
        background = background.parentElement;
      }
      if (background !== null) {
        cue.style.setProperty(
          "--discern-overflow-cue-color",
          getComputedStyle(background).backgroundColor,
        );
      }
    };
    selectMaterialOverflow();
    const mutations = new MutationObserver(selectMaterialOverflow);
    mutations.observe(boundary, { childList: true, subtree: true });
    const resize = typeof ResizeObserver === "function"
      ? new ResizeObserver(selectMaterialOverflow)
      : undefined;
    resize?.observe(boundary);
    globalThis.addEventListener("resize", selectMaterialOverflow);
    return () => {
      mutations.disconnect();
      resize?.disconnect();
      globalThis.removeEventListener("resize", selectMaterialOverflow);
      if (target !== undefined) {
        target.removeAttribute("data-discern-overflow-cue-target");
        if (addedRole) target.removeAttribute("role");
        if (addedLabel) target.removeAttribute("aria-label");
        if (addedTabIndex) target.removeAttribute("tabindex");
      }
    };
  }, [label]);
  const content = <div ref={root}>{children}</div>;
  return observeOverflow
    ? (
      <OverflowCue
        ref={cueRoot}
        axis="both"
        scrollContainer="descendant"
        className="discern-catalogue-specimen-cue"
        data-discern-catalogue-specimen-overflow=""
      >
        {content}
      </OverflowCue>
    )
    : content;
}

/** The canonical recorded reason one named example cannot render on a surface. */
export function componentExampleUnavailableReason(
  entry: RegistryEntry,
  exampleId: string,
  surface: CatalogueSurface,
): string | undefined {
  const definition = entry.canonicalExamples.find(({ id }) => id === exampleId);
  return definition !== undefined && !definition.surfaces.includes(surface)
    ? definition.reason
    : undefined;
}

/** Explicit source destinations; labels never change meaning with preview state. */
export function ComponentSourceActions(
  { entry }: { readonly entry: RegistryEntry },
) {
  const root =
    `/catalogue/src/components/${entry.meta.group.toLowerCase()}/${entry.meta.slug}/${entry.meta.slug}`;
  return (
    <nav
      className="discern-catalogue-component__sources"
      aria-label="Component sources"
    >
      <a href={`${root}.tsx`} target="_blank">Open React source</a>
      {entry.cli.stance === "rendered"
        ? <a href={`${root}.cli.ts`} target="_blank">Open CLI renderer</a>
        : null}
      <a href={`${root}.meta.ts`} target="_blank">Open metadata</a>
    </nav>
  );
}

export function ComponentSurfaceControl(
  { entry, surface, onChange }: {
    readonly entry: RegistryEntry;
    readonly surface: CatalogueSurface;
    readonly onChange: (surface: CatalogueSurface) => void;
  },
) {
  const cliReason = entry.cli.stance === "exempt"
    ? entry.cli.reason
    : undefined;
  return (
    <fieldset className="discern-catalogue-component__control-group">
      <legend>Surface</legend>
      <div className="discern-catalogue-component__surface-picker">
        {(["web", "cli"] as const).map((candidate) => (
          <button
            type="button"
            aria-pressed={surface === candidate}
            aria-label={candidate === "cli" && cliReason !== undefined
              ? `CLI unavailable: ${cliReason}`
              : candidate === "web"
              ? "Web"
              : "CLI"}
            onClick={() => onChange(candidate)}
            key={candidate}
          >
            {candidate === "web" ? "Web" : "CLI"}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function ComponentExampleControl(
  { entry, surface, exampleId, onChange }: {
    readonly entry: RegistryEntry;
    readonly surface: CatalogueSurface;
    readonly exampleId: string;
    readonly onChange: (exampleId: string) => void;
  },
) {
  return (
    <label className="discern-catalogue-component__example-picker">
      <span>Example</span>
      <select
        value={exampleId}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        {entry.canonicalExamples.map((example) => {
          const unavailable = !example.surfaces.includes(surface);
          return (
            <option value={example.id} key={example.id}>
              {example.label}
              {unavailable
                ? ` — unavailable on ${surface === "web" ? "Web" : "CLI"}`
                : ""}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function WebExample(
  { entry, exampleId, headingLevel }: {
    readonly entry: RegistryEntry;
    readonly exampleId: string;
    readonly headingLevel: ExampleHeadingLevel;
  },
) {
  const example = entry.webExamples.find(({ id }) => id === exampleId);
  if (example === undefined) return null;
  const fragmentId = stateFragmentId(entry.meta.slug, example.id);
  const Heading = exampleHeading(headingLevel);
  return (
    <section
      className="discern-catalogue-example-state"
      id={fragmentId}
      data-discern-example-state={example.id}
    >
      <header>
        <Heading>{example.label}</Heading>
        <a
          href={`#${fragmentId}`}
          aria-label={`Link to ${entry.meta.name}: ${example.label}`}
        >
          #
        </a>
      </header>
      <div className="discern-catalogue-example-state__canvas">
        <SpecimenHeadingBoundary
          afterLevel={headingLevel}
          label={`${entry.meta.name}: ${example.label} scrollable example`}
          observeOverflow={entry.meta.slug !== "overflow-cue"}
        >
          <example.Example />
        </SpecimenHeadingBoundary>
      </div>
    </section>
  );
}

/** One named specimen by default; the ordered complete gallery only on request. */
export function ComponentSpecimen(
  { entry, surface, exampleId, view, terminalTheme, headingLevel = 5 }: {
    readonly entry: RegistryEntry;
    readonly surface: CatalogueSurface;
    readonly exampleId: string;
    readonly view: "single" | "all";
    readonly terminalTheme: TerminalThemeVariant;
    readonly headingLevel?: ExampleHeadingLevel;
  },
) {
  const definition = entry.canonicalExamples.find(({ id }) => id === exampleId);
  const reason = componentExampleUnavailableReason(entry, exampleId, surface);
  const applicable = entry.canonicalExamples.filter(({ surfaces }) =>
    surfaces.includes(surface)
  );
  if (view === "single" && (definition === undefined || reason !== undefined)) {
    return (
      <div
        className="discern-catalogue-component__unavailable"
        data-discern-example-unavailable={exampleId}
        role="status"
      >
        <strong>
          {definition?.label ?? exampleId} is unavailable on{" "}
          {surface === "web" ? "Web" : "CLI"}.
        </strong>
        <p>
          {reason ??
            "This example is not part of the selected surface contract."}
        </p>
      </div>
    );
  }
  const examples = view === "all"
    ? applicable
    : definition === undefined
    ? []
    : [definition];
  return (
    <div
      className="discern-catalogue-component__canvas"
      data-discern-specimen-view={view}
    >
      {examples.map(({ id }) =>
        surface === "web"
          ? (
            <WebExample
              entry={entry}
              exampleId={id}
              headingLevel={headingLevel}
              key={id}
            />
          )
          : (
            <CliExamplePreview
              entry={entry}
              exampleId={id}
              theme={terminalTheme}
              headingLevel={headingLevel === 4 ? 4 : 5}
              key={id}
            />
          )
      )}
    </div>
  );
}

/** Closed supporting evidence, ordered from usage to implementation detail. */
export function ComponentEvidence(
  { entry }: { readonly entry: RegistryEntry },
) {
  const { meta, selection, propDocumentation, variants } = entry;
  return (
    <div className="discern-catalogue-component__evidence">
      <details className="discern-catalogue-guidance">
        <summary>Usage guidance</summary>
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
                  {meta.accessibility.map((note) => <li key={note}>{note}</li>)}
                </ul>
              </div>
            )
            : null}
          {!meta.useWhen?.length && !meta.notWhen?.length &&
              !meta.accessibility?.length
            ? <p>No additional usage guidance is recorded.</p>
            : null}
        </div>
      </details>
      <details className="discern-catalogue-instrument">
        <summary>Selection and import</summary>
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
                    <OverflowCue
                      axis="inline"
                      scrollContainer="descendant"
                      className="discern-catalogue-api__cue"
                    >
                      <div
                        className="discern-catalogue-api__table"
                        role="region"
                        aria-label={`${meta.name} props`}
                        tabIndex={0}
                        data-discern-overflow-cue-target=""
                      >
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
                                <td>
                                  {prop.required ? "Required" : "Optional"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </OverflowCue>
                  )
                  : <p>No Component-specific props.</p>}
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
    </div>
  );
}

/** Exhaustive conformance panel retained separately from ordinary human pages. */
export function ComponentPreview(
  { entry, surface, terminalTheme, headingLevel = 4, onSurfaceChange }: {
    readonly entry: RegistryEntry;
    readonly surface: CatalogueSurface;
    readonly terminalTheme: TerminalThemeVariant;
    readonly headingLevel?: 1 | 3 | 4;
    readonly onSurfaceChange?: (surface: CatalogueSurface) => void;
  },
) {
  const resolvedSurface = surface === "cli" && entry.cli.stance === "exempt"
    ? "web"
    : surface;
  const Heading = headingLevel === 1 ? "h1" : headingLevel === 3 ? "h3" : "h4";
  return (
    <article
      className="discern-catalogue-component"
      id={`component-${entry.meta.slug}`}
      data-discern-component={entry.meta.slug}
      data-discern-conformance-scenarios={JSON.stringify(entry.conformance)}
    >
      <header>
        <div className="discern-catalogue-component__identity">
          <Heading>{entry.meta.name}</Heading>
          <p>{entry.meta.description}</p>
        </div>
        <div className="discern-catalogue-component__actions">
          {onSurfaceChange === undefined ? null : (
            <ComponentSurfaceControl
              entry={entry}
              surface={resolvedSurface}
              onChange={onSurfaceChange}
            />
          )}
          <ComponentSourceActions entry={entry} />
        </div>
      </header>
      {resolvedSurface === "cli"
        ? <CliComponentPreview entry={entry} theme={terminalTheme} />
        : (
          <ComponentSpecimen
            entry={entry}
            surface="web"
            exampleId={entry.canonicalExamples[0]?.id ?? "default"}
            view="all"
            terminalTheme={terminalTheme}
          />
        )}
      <ComponentEvidence entry={entry} />
    </article>
  );
}
