/**
 * The compact state strip: canonical Web examples as generated snapshots,
 * with each authored review posture linked to the existing review
 * instrument. Snapshots are captured stills; only the links operate.
 */
import {
  componentExampleImage,
  componentExampleImagePresentation,
} from "../../example-images.ts";
import type { RegistryEntry } from "../../generated/registry.ts";
import { catalogueDecisionCopyProps } from "../../metadata-copy.ts";
import type { ResolvedComponentReviewPosture } from "../../review-postures.ts";
import { catalogueHref } from "../shared.tsx";
import type { ComponentDetailState } from "./detail-state.ts";
import { componentDetailHref } from "./detail-state.ts";

const REVIEW_INSTRUMENT_PATH = "/catalogue/reviews/components/";

/** Authored postures for one example; settled defaults are the strip itself. */
export function detailStatePostures(
  entry: RegistryEntry,
  exampleId: string,
): readonly ResolvedComponentReviewPosture[] {
  return entry.reviewPostures.filter((posture) =>
    posture.example === exampleId && posture.id !== `settled-${exampleId}`
  );
}

/** The review-instrument address for one authored posture. */
export function detailPostureReviewHref(
  entry: RegistryEntry,
  posture: ResolvedComponentReviewPosture,
): string {
  return catalogueHref(REVIEW_INSTRUMENT_PATH, {
    group: entry.meta.group,
    component: entry.meta.slug,
    example: posture.example,
    posture: posture.id,
  });
}

export function ComponentStateStrip(
  { entry, theme, state }: {
    readonly entry: RegistryEntry;
    readonly theme: "light" | "dark";
    readonly state: ComponentDetailState;
  },
) {
  const web = entry.canonicalExamples.filter(({ surfaces }) =>
    surfaces.includes("web")
  );
  return (
    <div
      className="discern-catalogue-states"
      data-discern-detail-states={entry.meta.slug}
    >
      <p
        className="discern-catalogue-states__legend"
        {...catalogueDecisionCopyProps}
      >
        Captured stills from the canonical image authority in the {theme}{" "}
        theme. Open an example to operate it live.
      </p>
      <div className="discern-catalogue-states__grid">
        {web.map((example) => {
          const image = componentExampleImage(
            entry.meta.slug,
            example.id,
            theme,
          );
          const postures = detailStatePostures(entry, example.id);
          return (
            <article
              className="discern-catalogue-states__state"
              data-discern-detail-state={example.id}
              key={example.id}
            >
              <header>
                <h2>{example.label}</h2>
                <a
                  href={componentDetailHref(entry, {
                    ...state,
                    surface: "web",
                    exampleId: example.id,
                    view: "single",
                  }, { anchor: true })}
                >
                  Open live
                </a>
              </header>
              {image === undefined
                ? (
                  <p
                    className="discern-catalogue-states__missing"
                    {...catalogueDecisionCopyProps}
                  >
                    No generated snapshot; open the live example instead.
                  </p>
                )
                : (() => {
                  const still = componentExampleImagePresentation(image);
                  return (
                    <figure className="discern-catalogue-states__snapshot">
                      <img
                        src={still.src}
                        width={still.width}
                        height={still.height}
                        alt={still.alt}
                        loading="lazy"
                      />
                      <figcaption>Snapshot — not operable</figcaption>
                    </figure>
                  );
                })()}
              {postures.length > 0
                ? (
                  <ul className="discern-catalogue-states__postures">
                    {postures.map((posture) => (
                      <li key={posture.id}>
                        {posture.unavailableReason === undefined
                          ? (
                            <a href={detailPostureReviewHref(entry, posture)}>
                              {posture.label}
                            </a>
                          )
                          : <span title={posture.unavailableReason}>
                            {posture.label} — unavailable
                          </span>}
                        <small>{posture.category}</small>
                      </li>
                    ))}
                  </ul>
                )
                : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
