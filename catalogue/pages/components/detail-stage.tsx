/**
 * The specimen inspection stage: fitted or exact-width allocation with a
 * live measured readout, plus the expanded page-column toggle. The stage
 * owns its own horizontal scrolling so a fixed preview canvas is never
 * mistaken for page overflow; the component's own scrolling stays inside
 * the specimen with its existing overflow cues.
 */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { SegmentedControl } from "../../../src/components/forms/segmented-control/segmented-control.tsx";
import {
  componentDetailFitWidth,
  type ComponentDetailWidth,
  componentDetailWidth,
  componentDetailWidthPresets,
} from "./detail-state.ts";

export function DetailStage(
  {
    slug,
    label,
    width,
    expanded,
    widthApplies,
    onWidthChange,
    onExpandedChange,
    children,
  }: {
    readonly slug: string;
    readonly label: string;
    readonly width: ComponentDetailWidth;
    readonly expanded: boolean;
    /** Exact widths shape Web canvases; CLI frames keep their column count. */
    readonly widthApplies: boolean;
    readonly onWidthChange: (width: ComponentDetailWidth) => void;
    readonly onExpandedChange: (expanded: boolean) => void;
    readonly children: ReactNode;
  },
) {
  const canvas = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<number | null>(null);
  useEffect(() => {
    const element = canvas.current;
    if (element === null || typeof ResizeObserver !== "function") {
      return;
    }
    const measure = () =>
      setMeasured(Math.round(element.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [width, widthApplies]);

  const preset = widthApplies
    ? componentDetailWidthPresets.find(({ id }) => id === width)
    : undefined;
  return (
    <section
      className="discern-catalogue-detail__stage"
      aria-label={`${label} inspection stage`}
    >
      <div className="discern-catalogue-detail__stage-bar">
        {widthApplies
          ? (
            <>
              <SegmentedControl
                className="discern-catalogue-detail__stage-widths"
                label="Preview width"
                name={`detail-width-${slug}`}
                value={width}
                onValueChange={(value) =>
                  onWidthChange(componentDetailWidth(value))}
                items={[
                  { value: componentDetailFitWidth, label: "Fit" },
                  ...componentDetailWidthPresets.map((candidate) => ({
                    value: candidate.id,
                    label: `${String(candidate.pixels)}px`,
                  })),
                ]}
              />
              <p
                className="discern-catalogue-detail__stage-measured"
                data-discern-detail-measured={measured ?? ""}
              >
                Measured{" "}
                <strong>
                  {measured === null ? "—" : `${String(measured)}px`}
                </strong>
              </p>
            </>
          )
          : null}
        <button
          type="button"
          className="discern-catalogue-detail__stage-expand"
          aria-pressed={expanded}
          onClick={() => onExpandedChange(!expanded)}
        >
          {expanded ? "Standard page column" : "Expand page column"}
        </button>
      </div>
      <div
        className="discern-catalogue-detail__stage-scroll"
        data-discern-detail-width={widthApplies ? width : undefined}
        {...(preset === undefined ? {} : {
          role: "region",
          "aria-label": `${label} at ${String(preset.pixels)}px`,
          tabIndex: 0,
        })}
      >
        <div
          ref={canvas}
          className="discern-catalogue-detail__stage-canvas"
          style={preset === undefined
            ? undefined
            : { inlineSize: `${String(preset.pixels)}px` }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
