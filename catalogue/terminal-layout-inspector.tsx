import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "../src/components/core/button/button.tsx";
import { CopyButton } from "../src/components/docs/copy-button/copy-button.tsx";
import {
  TerminalCapabilityControls,
  TerminalViewControl,
  useTerminalLabState,
} from "./terminal-capability-controls.tsx";
import { Select } from "../src/components/forms/select/select.tsx";
import { SegmentedControl } from "../src/components/forms/segmented-control/segmented-control.tsx";

import { CliOutputPreview } from "./cli-preview.tsx";
import { OverflowCue } from "../src/components/layout/overflow-cue/overflow-cue.tsx";
import type { TerminalCapabilities } from "../src/cli/capabilities.ts";
import { projectTerminalInspectorHtml } from "../src/cli/projection.ts";
import type { CliCompositionRecipe } from "./cli-compositions.ts";
import {
  terminalLabCapabilities,
  type TerminalLabState,
  terminalLabStateUrl,
  terminalViewportPreset,
} from "./terminal-lab-state.ts";
import { appearanceProjection } from "../src/tokens/appearance.ts";
import type { CatalogueTerminalPresentation } from "./terminal-theme.ts";

/** One pure projection from validated lab state into real output and geometry. */
export interface TerminalLayoutProjection {
  readonly capabilities: TerminalCapabilities;
  readonly output: string;
  readonly inspectorHtml: string;
}

/** Feed validated URL state to the recipe renderer and public inspector once. */
export function projectTerminalLayoutRecipe(
  recipe: CliCompositionRecipe,
  state: TerminalLabState,
  presentation: CatalogueTerminalPresentation,
  frame?: string,
): TerminalLayoutProjection {
  const capabilities = terminalLabCapabilities(
    state,
    recipe.capabilityControls,
  );
  const output = frame ?? recipe.render(capabilities, presentation, state.rows);
  const profile = terminalViewportPreset(state.presetId);
  const title = `${recipe.title} · ${state.custom ? "Custom" : profile.label}`;
  return {
    capabilities,
    output,
    inspectorHtml: projectTerminalInspectorHtml(output, {
      columns: state.columns,
      rows: state.rows,
      title,
      showGrid: state.showGrid,
      ...presentation,
    }),
  };
}

/** Focused capability lab for one complete CLI recipe. */
export function TerminalLayoutLab(
  { recipe, presentation, initialUrl }: {
    readonly recipe: CliCompositionRecipe;
    readonly presentation: CatalogueTerminalPresentation;
    readonly initialUrl: URL;
  },
) {
  const { state, notices, update } = useTerminalLabState(
    recipe.capabilityControls,
    initialUrl,
  );
  const replayName = useId();
  const [outcome, setOutcome] = useState<"completion" | "cancellation">(
    initialUrl.searchParams.get("replay") === "cancellation"
      ? "cancellation"
      : "completion",
  );
  const [requestedFrame, setRequestedFrame] = useState(
    Number(initialUrl.searchParams.get("step") ?? 0),
  );
  useEffect(() => {
    const restore = (url: URL) => {
      setOutcome(
        url.searchParams.get("replay") === "cancellation"
          ? "cancellation"
          : "completion",
      );
      setRequestedFrame(Number(url.searchParams.get("step") ?? 0));
    };
    restore(initialUrl);
    const onPopState = () => restore(new URL(globalThis.location.href));
    globalThis.addEventListener?.("popstate", onPopState);
    return () => globalThis.removeEventListener?.("popstate", onPopState);
  }, [initialUrl.href]);
  const replay = useMemo(() => {
    try {
      return {
        result: recipe.replay?.(
          terminalLabCapabilities(state, recipe.capabilityControls),
          presentation,
          state.rows,
          outcome,
        ),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Replay could not run.",
      };
    }
  }, [
    recipe,
    presentation,
    state.columns,
    state.rows,
    state.unicode,
    state.colorDepth,
    state.hyperlinks,
    outcome,
  ]);
  const frames = replay.result?.frames ?? [];
  const frameIndex =
    Number.isSafeInteger(requestedFrame) && requestedFrame >= 0 &&
      requestedFrame < frames.length
      ? requestedFrame
      : 0;
  const selectReplay = (nextOutcome: typeof outcome, nextFrame: number) => {
    setOutcome(nextOutcome);
    setRequestedFrame(nextFrame);
    if (globalThis.location !== undefined) {
      const url = new URL(globalThis.location.href);
      url.searchParams.set("replay", nextOutcome);
      url.searchParams.set("step", String(nextFrame));
      globalThis.history?.replaceState(null, "", url);
    }
  };
  const projection = useMemo(
    () =>
      projectTerminalLayoutRecipe(
        recipe,
        state,
        presentation,
        frames[frameIndex]?.output ?? (recipe.replay ? "" : undefined),
      ),
    [presentation, recipe, state, frames, frameIndex],
  );
  const shareUrl = useMemo(
    () => {
      const url = terminalLabStateUrl(
        initialUrl,
        state,
        recipe.capabilityControls,
      );
      if (recipe.replay) {
        url.searchParams.set("replay", outcome);
        url.searchParams.set("step", String(frameIndex));
      }
      return url;
    },
    [initialUrl, recipe, state, outcome, frameIndex],
  );

  return (
    <article
      className="discern-catalogue-terminal-lab"
      data-discern-cli-composition={recipe.id}
      data-discern-terminal-ground={presentation.theme}
      data-discern-terminal-appearance={appearanceProjection(
        presentation.appearance,
      )}
      data-discern-terminal-accent-hue={presentation.appearance.accent}
    >
      <TerminalViewControl state={state} update={update} />
      {recipe.replay && (
        <p data-discern-replay-step>
          Simulated replay · {frames[frameIndex]?.label}
        </p>
      )}
      {state.view === "clean"
        ? (
          <CliOutputPreview
            value={projection.output}
            label={`${recipe.title} terminal frame`}
            presentation={presentation}
            viewport={state}
          />
        )
        : (
          <OverflowCue
            axis="both"
            scrollContainer="descendant"
            className="discern-catalogue-terminal-lab__frame"
          >
            <div
              dangerouslySetInnerHTML={{ __html: projection.inspectorHtml }}
            />
          </OverflowCue>
        )}

      {recipe.replay && (
        <section
          className="discern-catalogue-terminal-replay"
          aria-label="Scripted guided flow replay"
        >
          <p>
            <strong>Simulated walkthrough.</strong>{" "}
            No setup is applied. Run the same journey live in your terminal.
          </p>
          <SegmentedControl
            name={`replay-${replayName}`}
            label="Replay outcome"
            value={outcome}
            items={[{ value: "completion", label: "Completion" }, {
              value: "cancellation",
              label: "Cancellation",
            }]}
            onValueChange={(value) =>
              selectReplay(
                value === "cancellation" ? "cancellation" : "completion",
                0,
              )}
          />
          {replay.error
            ? <p role="alert">{replay.error}</p>
            : frames.length === 0
            ? <p role="status">Preparing scripted frames...</p>
            : (
              <>
                <label>
                  <span>Replay frame</span>
                  <Select
                    value={String(frameIndex)}
                    onChange={(event) =>
                      selectReplay(outcome, Number(event.currentTarget.value))}
                  >
                    {frames.map((frame, index) => (
                      <option value={index} key={index}>
                        {index + 1}. {frame.label}
                      </option>
                    ))}
                  </Select>
                </label>
                <div className="discern-catalogue-terminal-replay__navigation">
                  <Button
                    type="button"
                    disabled={frameIndex === 0}
                    onClick={() => selectReplay(outcome, frameIndex - 1)}
                  >
                    Previous frame
                  </Button>
                  <span aria-live="polite">
                    Frame {frameIndex + 1} of {frames.length}
                  </span>
                  <Button
                    type="button"
                    disabled={frameIndex === frames.length - 1}
                    onClick={() => selectReplay(outcome, frameIndex + 1)}
                  >
                    Next frame
                  </Button>
                </div>
              </>
            )}
          <p>
            Live:{" "}
            <code>deno task playground:cli form</code>. Enter an empty name to
            see validation, enter Maple, choose Email, enter team@example.test,
            then Ctrl+U and Enter to revisit the retained address. Enter
            completes; Escape cancels.
          </p>
          <p>
            Back navigation keeps submitted answers. It discards edits in the
            field you leave. Local file delivery skips the email step and
            removes its answer.
          </p>
        </section>
      )}
      {state.view === "inspect" && (
        <p>
          Allocation: {state.columns} columns × {state.rows}{" "}
          rows. The browser uses a fixed font size; scroll to inspect cells
          beyond the displayed area.
        </p>
      )}
      <TerminalCapabilityControls
        state={state}
        notices={notices}
        controls={recipe.capabilityControls}
        update={update}
      />

      <div className="discern-catalogue-terminal-lab__actions">
        <CopyButton
          value={projection.output}
          label="Copy raw terminal output"
          copiedLabel="Raw terminal output copied"
        />
        <CopyButton
          value={shareUrl.href}
          label="Copy reproducible lab URL"
          copiedLabel="Lab URL copied"
        />
      </div>

      <details className="discern-catalogue-terminal-lab__source">
        <summary>Adaptable composition source</summary>
        <div>
          <p>
            Use this as an adaptable example; it is not exported as a Component.
          </p>
          <OverflowCue
            axis="both"
            scrollContainer="descendant"
            className="discern-catalogue-terminal-lab__source-cue"
          >
            <pre
              role="region"
              aria-label="Adaptable terminal layout source"
              tabIndex={0}
              data-discern-overflow-cue-target=""
            ><code>{recipe.source}</code></pre>
          </OverflowCue>
          <CopyButton
            value={recipe.source}
            label="Copy adaptable composition source"
            copiedLabel="Adaptable source copied"
          />
        </div>
      </details>
    </article>
  );
}
