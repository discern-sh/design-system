import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Select } from "../../src/components/forms/select/select.tsx";
import { reviewInlineSizes } from "../review-postures.ts";
import { catalogueAppearanceRootStyle } from "../shell/axes-state.ts";
import { componentReviewHref, parseComponentReviewState } from "./state.ts";
import {
  EverydayControls,
  signaturePageIdentity,
  SignatureSpecimen,
} from "../compositions/signature-specimens.tsx";
import { compositionRecipes } from "../compositions.tsx";
import type {
  SignaturePurpose,
  SignatureTreatments,
} from "../compositions/signature-specimens.tsx";

const initialUrl = new URL(location.href);
const initial = parseComponentReviewState(initialUrl);
const reportRecipe = compositionRecipes.find(({ id }) =>
  id === "handoff-verification-report"
)!;

function SignatureFrame(
  { src, title, width }: {
    readonly src: string;
    readonly title: string;
    readonly width: number | undefined;
  },
) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(0);
  const [height, setHeight] = useState(900);
  useEffect(() => {
    const body = ref.current?.contentDocument?.body;
    if (body === undefined || body === null) return;
    const measure = () =>
      setHeight(Math.ceil(body.getBoundingClientRect().height));
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    measure();
    return () => observer.disconnect();
  }, [loaded]);
  return (
    <iframe
      ref={ref}
      title={title}
      src={src}
      className="discern-signature-frame__viewport"
      onLoad={() => setLoaded((value) => value + 1)}
      style={{ width: width ?? "100%", height }}
    />
  );
}

/** Bounded authored study inside the existing local review instrument. */
export function SignatureStudy() {
  const [purpose, setPurpose] = useState<SignaturePurpose>(
    initialUrl.searchParams.get("purpose") === "reading"
      ? "reading"
      : initialUrl.searchParams.get("purpose") === "operations"
      ? "operations"
      : "marketing",
  );
  const [theme, setTheme] = useState<"light" | "dark" | "both">(
    initialUrl.searchParams.get("themes") === "both" ? "both" : initial.theme,
  );
  const [width, setWidth] = useState(
    initialUrl.searchParams.get("allocation") ?? "fit",
  );
  const [appearance, setAppearance] = useState(initial);
  const [treatments, setTreatments] = useState<SignatureTreatments>({
    depth: initialUrl.searchParams.get("depth") !== "off",
    ambient: initialUrl.searchParams.get("ambient") !== "off",
    shimmer: initialUrl.searchParams.get("shimmer") !== "off",
    relief: initialUrl.searchParams.get("relief") !== "off",
    tint: initialUrl.searchParams.get("tint") === "on",
    motion: initialUrl.searchParams.get("motion") === "ordinary",
  });
  const [replay, setReplay] = useState(0);
  const [largeText, setLargeText] = useState(
    initialUrl.searchParams.get("text") === "large",
  );
  const themes = theme === "both" ? ["light", "dark"] as const : [theme];
  useEffect(() => {
    if (initialUrl.searchParams.has("embed")) {
      document.documentElement.style.fontSize = largeText ? "24px" : "16px";
      return;
    }
    const url = new URL(
      componentReviewHref({
        ...appearance,
        theme: theme === "both" ? "light" : theme,
        motion: treatments.motion ? "ordinary" : "reduced",
      }),
      location.origin,
    );
    url.searchParams.set("study", "signature");
    url.searchParams.set("purpose", purpose);
    url.searchParams.set("direction", "instrument");
    url.searchParams.set("themes", theme);
    url.searchParams.set("allocation", width);
    url.searchParams.set("text", largeText ? "large" : "normal");
    for (
      const name of ["depth", "ambient", "shimmer", "relief", "tint"] as const
    ) url.searchParams.set(name, treatments[name] ? "on" : "off");
    history.replaceState(null, "", url);
  }, [
    purpose,
    theme,
    width,
    appearance,
    treatments,
    largeText,
  ]);
  if (initialUrl.searchParams.has("embed")) {
    const pole = theme === "both" ? "light" : theme;
    const applied = treatments;
    const id = `signature-instrument-${pole}`;
    return (
      <div
        className="discern-signature-specimen"
        data-discern-root
        data-discern-theme={pole}
        data-discern-accent={appearance.accent === undefined ? "none" : ""}
        data-discern-signature="instrument"
        data-discern-signature-purpose={purpose}
        data-discern-depth={applied.depth}
        data-discern-relief={applied.relief}
        data-discern-tint={applied.tint}
        data-discern-review-motion={applied.motion ? "ordinary" : "reduced"}
        style={catalogueAppearanceRootStyle(
          appearance.field,
          pole,
          appearance.accent,
        ) as CSSProperties}
      >
        <SignatureSpecimen
          purpose={purpose}
          id={id}
          treatments={applied}
          verification={<reportRecipe.Example />}
        />
        <section
          className="discern-signature-ordinary"
          aria-label="Ordinary control witness"
        >
          <h2>Everyday control witness</h2>
          <EverydayControls
            id={`${id}-ordinary`}
            treatments={{ ...applied, ambient: false }}
          />
        </section>
      </div>
    );
  }
  return (
    <main
      className="discern-signature-review"
      data-discern-root
      data-discern-theme="light"
    >
      <header className="discern-signature-review__header">
        <div>
          <p>3A / Selected implementation</p>
          <h1>Distinct voices. Shared craft.</h1>
        </div>
        <p>
          <strong>Selected compositions · Inter marketing headlines.</strong>
          <br />Slightly more breathing room. Public package ingredients.
        </p>
      </header>
      <div
        className="discern-signature-controls"
        aria-label="Visible comparison controls"
      >
        <div className="discern-signature-controls__row">
          <label>
            Purpose<Select
              value={purpose}
              onChange={(event) =>
                setPurpose(event.currentTarget.value as SignaturePurpose)}
            >
              <option value="marketing">Marketing page</option>
              <option value="operations">Operational task</option>
              <option value="reading">Sustained reading</option>
            </Select>
          </label>
          <label>
            Theme<Select
              value={theme}
              onChange={(event) => {
                setTheme(event.currentTarget.value as typeof theme);
                setAppearance({
                  ...appearance,
                  field: {
                    ...appearance.field,
                    darkness: event.currentTarget.value === "dark" ? 1 : 0,
                  },
                });
              }}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="both">Both themes</option>
            </Select>
          </label>
          <label>
            Allocation<Select
              value={width}
              onChange={(event) => setWidth(event.currentTarget.value)}
            >
              <option value="fit">Fit available</option>
              {Object.entries(reviewInlineSizes).map(([name, pixels]) => (
                <option key={name} value={name}>{name} · {pixels}px</option>
              ))}
            </Select>
          </label>
          <label>
            Motion<Select
              value={treatments.motion ? "motion" : "still"}
              onChange={(event) =>
                setTreatments({
                  ...treatments,
                  motion: event.currentTarget.value === "motion",
                })}
            >
              <option value="still">Still</option>
              <option value="motion">Production motion</option>
            </Select>
          </label>
        </div>
        <div className="discern-signature-controls__row discern-signature-controls__treatments">
          {([
            ["depth", "Surface depth"],
            ["ambient", "Ambient light"],
            ["shimmer", "Transition shimmer"],
            ["relief", "Large-icon relief"],
            ["tint", "Selective accent tint"],
          ] as const).map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={treatments[key]}
                onChange={(event) =>
                  setTreatments({
                    ...treatments,
                    [key]: event.currentTarget.checked,
                  })}
              />
              {label}
            </label>
          ))}
          <button type="button" onClick={() => setReplay(replay + 1)}>
            Replay light
          </button>
        </div>
        <p>
          Switch <strong>Plan / Details</strong>{" "}
          within a specimen to see arrival shimmer. Press{" "}
          <strong>Pin view</strong>{" "}
          for tactile feedback. Still removes movement; the complete state
          remains. Tint uses the Accent below; Monochrome keeps the light
          neutral.
        </p>
        <details>
          <summary>Matched Appearance and text controls</summary>
          <div className="discern-signature-controls__row">
            {(["darkness", "structure", "emphasis"] as const).map((axis) => (
              <label key={axis}>
                {axis} · {appearance.field[axis]}
                <input
                  aria-label={axis}
                  type="range"
                  min="0"
                  max={axis === "darkness" ? "1" : "2"}
                  step="0.25"
                  value={appearance.field[axis]}
                  onChange={(event) =>
                    setAppearance({
                      ...appearance,
                      field: {
                        ...appearance.field,
                        [axis]: Number(event.currentTarget.value),
                      },
                    })}
                />
              </label>
            ))}
            <label>
              Accent<Select
                value={appearance.accent === undefined
                  ? "none"
                  : String(appearance.accent)}
                onChange={(event) =>
                  setAppearance({
                    ...appearance,
                    accent: event.currentTarget.value === "none"
                      ? undefined
                      : Number(event.currentTarget.value),
                  })}
              >
                <option value="none">Monochrome</option>
                <option value="255">Blue · 255</option>
                <option value="28">Red · 28</option>
                <option value="152">Green · 152</option>
              </Select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={largeText}
                onChange={(event) => setLargeText(event.currentTarget.checked)}
              />Enlarged text
            </label>
          </div>
        </details>
      </div>
      <div className="discern-signature-comparison">
        <section className="discern-signature-comparison__item">
          <header>
            <h2>Selected compositions</h2>
            <p>The selected voice, with independent material treatments.</p>
          </header>
          {themes.map((pole) => {
            const requestedWidth = width in reviewInlineSizes
              ? reviewInlineSizes[width as keyof typeof reviewInlineSizes]
              : undefined;
            const frameUrl = new URL(
              componentReviewHref({
                ...appearance,
                theme: pole,
                field: {
                  ...appearance.field,
                  darkness: theme === "both"
                    ? (pole === "dark" ? 1 : 0)
                    : appearance.field.darkness,
                },
                motion: treatments.motion ? "ordinary" : "reduced",
              }),
              location.origin,
            );
            for (
              const [key, value] of Object.entries({
                study: "signature",
                embed: "1",
                purpose,
                direction: "instrument",
                themes: pole,
                text: largeText ? "large" : "normal",
                replay: String(replay),
              })
            ) frameUrl.searchParams.set(key, value);
            for (
              const name of [
                "depth",
                "ambient",
                "shimmer",
                "relief",
                "tint",
              ] as const
            ) {
              frameUrl.searchParams.set(
                name,
                treatments[name] ? "on" : "off",
              );
            }
            return (
              <div key={pole} className="discern-signature-frame">
                <div className="discern-signature-frame__caption">
                  {pole} · {requestedWidth === undefined
                    ? "fits available space"
                    : `${requestedWidth}px allocation`} ·{" "}
                  {treatments.motion ? "production speed" : "still"}
                </div>
                <div
                  className="discern-signature-frame__scroller"
                  tabIndex={0}
                  role="region"
                  aria-label={`${
                    signaturePageIdentity[purpose].title
                  }, ${pole}`}
                >
                  <SignatureFrame
                    src={frameUrl.href}
                    title={`${signaturePageIdentity[purpose].title} · ${pole}`}
                    width={requestedWidth}
                  />
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
