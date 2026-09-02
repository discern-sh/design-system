import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { Select } from "../../src/components/forms/select/select.tsx";
import { componentGroups } from "../../src/types/component-meta.ts";
import type { ConformanceStep, ConformanceTarget } from "../conformance.ts";
import { registry } from "../generated/registry.ts";
import {
  reviewInlineSizes,
  reviewStateCategories,
} from "../review-postures.ts";
import type { ResolvedComponentReviewPosture } from "../review-postures.ts";
import {
  catalogueAppearanceOption,
  catalogueAppearanceOptions,
  catalogueAppearanceStyle,
  defaultCatalogueAppearanceOption,
} from "../shell/appearance-options.ts";
import type { CatalogueFieldSelection } from "../shell/field-state.ts";
import {
  catalogueFieldLabel,
  catalogueFieldPolarity,
  catalogueFieldStyle,
  serializeCatalogueFieldSelection,
} from "../shell/field-state.ts";
import { captureRegionForReview, inspectReviewGeometry } from "./geometry.ts";
import { reviewMotionStyle } from "./motion.ts";
import {
  componentReviewInlineSize,
  componentReviewResponsiveAllocation,
} from "./responsive-ownership.ts";
import {
  componentReviewHref,
  parseComponentReviewState,
  reviewMotionModes,
  reviewSurfaceModes,
  reviewTimingModes,
} from "./state.ts";

declare global {
  interface Window {
    __discernComponentReview?: {
      readonly status: "loading" | "ready" | "error";
      readonly itemCount: number;
      readonly checkpointCount: number;
      readonly pageViewport: {
        readonly width: number;
        readonly height: number;
      };
      readonly message?: string;
    };
  }
}

function targetElements(
  root: HTMLElement,
  target: ConformanceTarget,
): HTMLElement[] {
  if ("selector" in target) {
    return [...root.querySelectorAll<HTMLElement>(target.selector)];
  }
  const native = target.role === "button"
    ? "button"
    : target.role === "link"
    ? "a[href]"
    : target.role === "textbox"
    ? "input:not([type]), input[type=text], input[type=search], textarea"
    : target.role === "dialog"
    ? "dialog"
    : "";
  const selector = `[role=${CSS.escape(target.role)}]${
    native === "" ? "" : `, ${native}`
  }`;
  return [...root.querySelectorAll<HTMLElement>(selector)].filter((element) => {
    if (target.name === undefined) return true;
    const labelledBy = element.getAttribute("aria-labelledby")?.split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
    const explicitLabel = element.id === ""
      ? undefined
      : root.querySelector<HTMLLabelElement>(
        `label[for="${CSS.escape(element.id)}"]`,
      )
        ?.textContent;
    const name = element.getAttribute("aria-label") ?? labelledBy ??
      explicitLabel ??
      element.closest("label")?.textContent ?? element.textContent ?? "";
    return name.trim() === target.name;
  });
}

function oneTarget(
  root: HTMLElement,
  target: ConformanceTarget,
  identity: string,
): HTMLElement {
  const matches = targetElements(root, target);
  if (matches.length !== 1) {
    throw new TypeError(
      `${identity} target ${JSON.stringify(target)} matched ${matches.length}`,
    );
  }
  return matches[0]!;
}

async function performReviewAction(
  root: HTMLElement,
  step: ConformanceStep,
  identity: string,
): Promise<"automatic" | "manual"> {
  if (!("action" in step)) {
    if (step.expect === "clipboard") return "automatic";
    const target = oneTarget(root, step.target, identity);
    if (
      step.expect === "focused" && target.ownerDocument.activeElement !== target
    ) {
      throw new TypeError(
        `${identity} expected ${JSON.stringify(step.target)} to be focused`,
      );
    }
    if (
      step.expect === "attribute" &&
      target.getAttribute(step.attribute) !== step.value
    ) {
      throw new TypeError(
        `${identity} expected ${step.attribute}=${JSON.stringify(step.value)}`,
      );
    }
    if (step.expect === "visible" && target.getClientRects().length === 0) {
      throw new TypeError(
        `${identity} expected ${JSON.stringify(step.target)} to be visible`,
      );
    }
    if (step.expect === "hidden" && target.getClientRects().length !== 0) {
      throw new TypeError(
        `${identity} expected ${JSON.stringify(step.target)} to be hidden`,
      );
    }
    return "automatic";
  }
  if (step.action === "press") {
    if (step.key === "Escape") {
      const dialog = root.querySelector<HTMLDialogElement>("dialog:modal");
      if (dialog !== null) {
        dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve())
        );
        return "automatic";
      }
    }
    const target = step.target === undefined
      ? document.activeElement
      : oneTarget(root, step.target, identity);
    if (!(target instanceof HTMLElement)) {
      throw new TypeError(`${identity} has no key target`);
    }
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key: step.key, bubbles: true }),
    );
    target.dispatchEvent(
      new KeyboardEvent("keyup", { key: step.key, bubbles: true }),
    );
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );
    return "automatic";
  }
  const target = oneTarget(root, step.target, identity);
  if (step.action === "click") {
    target.focus();
    target.click();
  } else if (step.action === "focus") target.focus();
  else if (step.action === "fill" && target instanceof HTMLInputElement) {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(target, step.value);
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
  } else return "manual"; // CSS :hover/:active must be judged with a real pointer.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  return "automatic";
}

function ReviewSpecimen({
  entry,
  posture,
  checkpoint,
  width,
  responsiveAllocation,
  theme,
  appearance,
  field,
  motion,
  speed,
  replay,
  onReady,
}: {
  readonly entry: (typeof registry)[number];
  readonly posture: ResolvedComponentReviewPosture;
  readonly checkpoint: string;
  readonly width: number;
  readonly responsiveAllocation: "local" | "page";
  readonly theme: "light" | "dark";
  readonly appearance: string;
  readonly field?: CatalogueFieldSelection | undefined;
  readonly motion: "ordinary" | "reduced";
  readonly speed: "production" | "slow";
  readonly replay: number;
  readonly onReady: () => void;
}) {
  const [status, setStatus] = useState("Preparing");
  const example = entry.webExamples.find(({ id }) => id === posture.example);
  const option = catalogueAppearanceOption(appearance) ??
    defaultCatalogueAppearanceOption;
  const appliedTheme = field === undefined
    ? theme
    : catalogueFieldPolarity(field);
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(
      `[data-discern-review-identity="${
        CSS.escape(`${entry.meta.slug}/${posture.id}/${checkpoint}`)
      }"]`,
    );
    if (root === null) return;
    let cancelled = false;
    const run = async (): Promise<void> => {
      try {
        await document.fonts.ready;
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        );
        let manual = false;
        for (const sequenceEntry of posture.sequence) {
          if ("checkpoint" in sequenceEntry) {
            if (sequenceEntry.checkpoint.id === checkpoint) break;
            continue;
          }
          manual = (await performReviewAction(
                root,
                sequenceEntry,
                `${entry.meta.slug}/${posture.id}`,
              )) === "manual" || manual;
        }
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        );
        if (cancelled) return;
        const bounds = root.getBoundingClientRect();
        inspectReviewGeometry({
          pageViewport: { width: innerWidth, height: innerHeight },
          requestedInlineSize: width,
          specimenBounds: bounds,
        });
        const directive = posture.capture;
        if (directive !== undefined) {
          const rootBounds = root.getBoundingClientRect();
          const regions = directive.selectors.flatMap((selector) =>
            [...root.querySelectorAll<HTMLElement>(selector)].map((element) =>
              element.getBoundingClientRect()
            )
          );
          captureRegionForReview(
            regions,
            [
              {
                x: rootBounds.x - root.scrollLeft,
                y: rootBounds.y - root.scrollTop,
                width: root.scrollWidth,
                height: root.scrollHeight,
              },
              {
                x: -scrollX,
                y: -scrollY,
                width: document.documentElement.scrollWidth,
                height: document.documentElement.scrollHeight,
              },
            ],
            `${entry.meta.slug}/${posture.id}`,
          );
        }
        root.dataset.discernReviewReady = "true";
        setStatus(manual ? "Ready · use a real pointer for contact" : "Ready");
        onReady();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        root.dataset.discernReviewError = message;
        setStatus(message);
        globalThis.window.__discernComponentReview = {
          status: "error",
          itemCount: 0,
          checkpointCount: 0,
          pageViewport: { width: innerWidth, height: innerHeight },
          message,
        };
        document.documentElement.dataset.discernReviewStatus = "error";
        document.documentElement.dataset.discernReviewError = message;
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [checkpoint, entry.meta.slug, onReady, posture, replay, width]);
  if (example === undefined) {
    return <p>Missing canonical example {posture.example}</p>;
  }
  const Example = example.Example;
  const identity = `${entry.meta.slug}/${posture.id}/${checkpoint}`;
  return (
    <article
      className="discern-review-card"
      data-discern-review-item={identity}
    >
      <header>
        <div>
          <h2>{entry.meta.name} · {posture.label}</h2>
          <p>{example.label} / {checkpoint}</p>
        </div>
        <code>{posture.category}</code>
      </header>
      <div className="discern-review-scroller">
        <div
          key={replay}
          className="discern-review-specimen"
          data-discern-root
          data-discern-theme={appliedTheme}
          data-discern-review-motion={motion}
          data-discern-review-speed={speed}
          data-discern-review-responsive-allocation={responsiveAllocation}
          data-discern-review-identity={identity}
          style={{
            inlineSize: `${width}px`,
            ...(field === undefined
              ? catalogueAppearanceStyle(option, theme)
              : catalogueFieldStyle(field)),
            ...reviewMotionStyle(motion, speed),
          } as CSSProperties}
        >
          <Example />
        </div>
      </div>
      <footer className="discern-review-evidence">
        <span>{width}px {responsiveAllocation}</span>
        <span>{appliedTheme}</span>
        <span>
          {field === undefined ? option.label : catalogueFieldLabel(field)}
        </span>
        <span>{motion}</span>
        <span>{speed}</span>
        <span>{status}</span>
      </footer>
    </article>
  );
}

function App() {
  const current = useMemo(() => new URL(location.href), []);
  const parsed = useMemo(() => parseComponentReviewState(current), [current]);
  const groups = componentGroups.filter((group) =>
    registry.some(({ meta }) => meta.group === group)
  );
  const group = parsed.group ?? groups[0]!;
  const selectedEntries = useMemo(() => {
    if (parsed.component !== undefined) {
      return registry.filter(({ meta }) => meta.slug === parsed.component);
    }
    return registry.filter(({ meta }) => meta.group === group);
  }, [group, parsed.component]);
  const selectedEntry = parsed.component === undefined
    ? undefined
    : selectedEntries[0];
  const cards = selectedEntries.flatMap((entry) =>
    entry.reviewPostures
      .filter((posture) =>
        parsed.example === undefined || posture.example === parsed.example
      )
      .filter((posture) =>
        parsed.posture === undefined || posture.id === parsed.posture
      )
      .filter((posture) =>
        parsed.category === undefined
          ? parsed.component !== undefined || posture.category === "default"
          : posture.category === parsed.category
      )
      .filter((posture) => posture.unavailableReason === undefined)
      .flatMap((posture) =>
        posture.checkpoints.map((checkpoint) => ({
          entry,
          posture,
          checkpoint: checkpoint.id,
        }))
      )
  );
  const visibleCards = parsed.mode === "reel" ? cards.slice(0, 1) : cards;
  const [viewport, setViewport] = useState({
    width: innerWidth,
    height: innerHeight,
  });
  const [replay, setReplay] = useState(0);
  const [ready, setReady] = useState(0);
  useEffect(() => {
    const update = () =>
      setViewport({ width: innerWidth, height: innerHeight });
    addEventListener("resize", update);
    return () => removeEventListener("resize", update);
  }, []);
  useEffect(() => {
    globalThis.window.__discernComponentReview = {
      status: visibleCards.length === 0 || ready >= visibleCards.length
        ? "ready"
        : "loading",
      itemCount: visibleCards.length,
      checkpointCount: visibleCards.length,
      pageViewport: viewport,
    };
    document.documentElement.dataset.discernReviewStatus =
      globalThis.window.__discernComponentReview.status;
  }, [ready, viewport, visibleCards.length]);
  const onReady = useMemo(() => () => setReady((value) => value + 1), []);
  const width = reviewInlineSizes[parsed.width];
  const option = catalogueAppearanceOption(parsed.appearance) ??
    defaultCatalogueAppearanceOption;
  const appliedTheme = parsed.field === undefined
    ? parsed.theme
    : catalogueFieldPolarity(parsed.field);
  const canonical = componentReviewHref({ ...parsed, group });

  return (
    <main
      className="discern-review-shell"
      data-discern-root
      data-discern-theme={appliedTheme}
      style={(parsed.field === undefined
        ? catalogueAppearanceStyle(option, parsed.theme)
        : catalogueFieldStyle(parsed.field)) as CSSProperties}
    >
      <header className="discern-review-header">
        <div>
          <h1>Component posture review</h1>
          <p>
            Local-only perceptual evidence. Assertions guard state and geometry
            separately; screenshots are not approvals.
          </p>
        </div>
        <div
          className="discern-review-viewport"
          data-discern-review-page-viewport
        >
          page viewport {viewport.width}×{viewport.height}px<br />
          embedded request {width}px
        </div>
      </header>
      <form
        className="discern-review-filters"
        method="get"
        action="/catalogue/reviews/components/"
      >
        <label>
          Group<Select name="group" defaultValue={group}>
            {groups.map((value) => <option key={value}>{value}</option>)}
          </Select>
        </label>
        <label>
          Component<Select
            name="component"
            defaultValue={parsed.component ?? ""}
          >
            <option value="">Group baseline</option>
            {registry.filter(({ meta }) => meta.group === group).map((
              { meta },
            ) => <option key={meta.slug} value={meta.slug}>{meta.name}
            </option>)}
          </Select>
        </label>
        <label>
          Example<Select
            name="example"
            defaultValue={parsed.example ?? ""}
            disabled={selectedEntry === undefined}
          >
            <option value="">All canonical</option>
            {(selectedEntry?.webExamples ?? []).map(({ id, label }) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </Select>
        </label>
        <label>
          Posture<Select
            name="posture"
            defaultValue={parsed.posture ?? ""}
            disabled={selectedEntry === undefined}
          >
            <option value="">All meaningful</option>
            {(selectedEntry?.reviewPostures ?? []).map(({ id, label }) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </Select>
        </label>
        <label>
          Category<Select name="category" defaultValue={parsed.category ?? ""}>
            <option value="">Relevant</option>
            {reviewStateCategories.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
        </label>
        <label>
          Local width<Select name="width" defaultValue={parsed.width}>
            {Object.entries(reviewInlineSizes).map(([name, pixels]) => (
              <option key={name} value={name}>{name} · {pixels}px</option>
            ))}
          </Select>
        </label>
        <label>
          Theme<Select name="theme" defaultValue={parsed.theme}>
            <option>light</option>
            <option>dark</option>
          </Select>
        </label>
        <label>
          Appearance<Select
            name="appearance"
            defaultValue={parsed.field === undefined
              ? parsed.appearance
              : "__field-point__"}
            onChange={(event) => {
              const fieldInput = event.currentTarget.form?.elements.namedItem(
                "field",
              );
              if (fieldInput instanceof HTMLInputElement) {
                fieldInput.disabled =
                  event.currentTarget.value !== "__field-point__";
              }
            }}
          >
            {parsed.field === undefined
              ? null
              : (
                <option value="__field-point__">
                  {catalogueFieldLabel(parsed.field)}
                </option>
              )}
            {catalogueAppearanceOptions.map(({ id, label }) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </Select>
        </label>
        {parsed.field === undefined ? null : (
          <input
            type="hidden"
            name="field"
            value={serializeCatalogueFieldSelection(parsed.field)}
          />
        )}
        <label>
          Motion<Select name="motion" defaultValue={parsed.motion}>
            {reviewMotionModes.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
        </label>
        <label>
          View<Select name="mode" defaultValue={parsed.mode}>
            {reviewSurfaceModes.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
        </label>
        <label>
          Timing<Select name="speed" defaultValue={parsed.speed}>
            {reviewTimingModes.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
        </label>
        <button type="submit">Apply review</button>
      </form>
      <div className="discern-review-summary">
        <span>
          {visibleCards.length} review items / {visibleCards.length} checkpoints
        </span>
        <a href={canonical}>Canonical URL</a>
        <a
          href={componentReviewHref({
            ...parsed,
            group,
            field: {
              ...(parsed.field ?? {
                darkness: 0,
                structure: 1,
                emphasis: 1,
                density: 1,
                preset: "mono",
              }),
              darkness: 0,
            },
          })}
        >
          Light pole
        </a>
        <a
          href={componentReviewHref({
            ...parsed,
            group,
            field: {
              ...(parsed.field ?? {
                darkness: 1,
                structure: 1,
                emphasis: 1,
                density: 1,
                preset: "mono",
              }),
              darkness: 1,
            },
          })}
        >
          Dark pole
        </a>
        {parsed.mode === "reel" && (
          <button
            className="discern-review-replay"
            type="button"
            onClick={() => {
              setReady(0);
              setReplay((value) => value + 1);
            }}
          >
            Replay transition
          </button>
        )}
      </div>
      {visibleCards.length === 0
        ? (
          <p className="discern-review-empty">
            No review posture matches these inputs.
          </p>
        )
        : (
          <section
            className="discern-review-contact-sheet"
            data-discern-review-mode={parsed.mode}
            aria-label={parsed.mode === "reel"
              ? "Motion reel"
              : "Settled contact sheet"}
          >
            {visibleCards.map(({ entry, posture, checkpoint }) => {
              const requirements = posture.requirements;
              const requestedWidth =
                typeof requirements?.inlineSize === "number"
                  ? requirements.inlineSize
                  : reviewInlineSizes[requirements?.inlineSize ?? parsed.width];
              const responsiveAllocation = componentReviewResponsiveAllocation(
                entry.meta.slug,
              );
              const effectiveWidth = componentReviewInlineSize({
                slug: entry.meta.slug,
                requestedInlineSize: requestedWidth,
                pageViewportWidth: viewport.width,
              });
              return (
                <ReviewSpecimen
                  key={`${entry.meta.slug}/${posture.id}/${checkpoint}/${replay}`}
                  entry={entry}
                  posture={posture}
                  checkpoint={checkpoint}
                  width={effectiveWidth}
                  responsiveAllocation={responsiveAllocation}
                  theme={requirements?.theme ?? parsed.theme}
                  appearance={requirements?.appearance ?? parsed.appearance}
                  field={requirements?.appearance === undefined
                    ? parsed.field
                    : undefined}
                  motion={requirements?.reducedMotion
                    ? "reduced"
                    : parsed.motion}
                  speed={parsed.speed}
                  replay={replay}
                  onReady={onReady}
                />
              );
            })}
          </section>
        )}
    </main>
  );
}

const root = document.getElementById("root");
if (root === null) throw new Error("Component review root is missing");
createRoot(root).render(<App />);
