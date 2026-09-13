/**
 * The detail playground: render one Builder-backed starter, adjust its
 * focused controls, and copy the exact code the specimen consumes.
 */
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CopyButton } from "../../../src/components/docs/copy-button/copy-button.tsx";
import { AutoGrowTextarea } from "../../builder/fields.tsx";
import { InspectorControlField } from "../../builder/inspector/property-fields.tsx";
import type { BuilderNode } from "../../builder/model.ts";
import { renderBuilderChild } from "../../builder/render.tsx";
import { BuilderBoundary } from "../../builder/workspace/error-boundary.tsx";
import type { RegistryEntry } from "../../generated/registry.ts";
import { catalogueDecisionCopyProps } from "../../metadata-copy.ts";
import { CopyableCode } from "../shared.tsx";
import {
  changeDetailProp,
  changeDetailSlotText,
  createDetailStarter,
  detailPlaygroundControls,
  detailSlotText,
  detailStarterUsage,
  detailWitnessedCallbacks,
} from "./detail-playground.ts";

/**
 * Mount keyed by Component slug so starter state never crosses Components.
 * `renderStage` places the live canvas inside the shared inspection stage.
 */
export function ComponentDetailPlayground(
  { entry, renderStage }: {
    readonly entry: RegistryEntry;
    readonly renderStage: (canvas: ReactNode) => ReactNode;
  },
) {
  const starter = useMemo(
    () => createDetailStarter(entry.meta.slug),
    [entry.meta.slug],
  );
  const [edited, setEdited] = useState<BuilderNode | null>(null);
  const [witnessed, setWitnessed] = useState<string | null>(null);

  if (starter.status === "unavailable") {
    return (
      <div
        className="discern-catalogue-component__unavailable"
        data-discern-detail-playground-unavailable=""
        role="status"
      >
        <strong>
          {entry.meta.name} has no source-backed starter.
        </strong>
        <p {...catalogueDecisionCopyProps}>{starter.reason}</p>
        <p>
          <a href="/catalogue/builder/">Open the Builder</a>
        </p>
      </div>
    );
  }

  const node = edited ?? starter.node;
  const controls = detailPlaygroundControls(starter.core, node);
  const callbacks = detailWitnessedCallbacks(starter.core);
  const usage = detailStarterUsage(entry, node);

  const applyField = (name: string) =>
  (
    value: Parameters<typeof changeDetailProp>[2],
  ): string | null => {
    const change = changeDetailProp(node, name, value);
    if ("error" in change) return change.error;
    setEdited(change.node);
    return null;
  };
  const restoreField = (name: string): void => {
    const change = changeDetailProp(node, name, starter.node.props[name]);
    if ("node" in change) setEdited(change.node);
  };

  return (
    <div
      className="discern-catalogue-playground"
      data-discern-detail-playground={entry.meta.slug}
    >
      <div className="discern-catalogue-playground__stage">
        {renderStage(
          <BuilderBoundary
            fallback={(message) => (
              <div
                className="discern-catalogue-playground__crash"
                role="alert"
              >
                <strong>The starter failed to render.</strong>
                <p {...catalogueDecisionCopyProps}>{message}</p>
              </div>
            )}
          >
            <div className="discern-catalogue-playground__canvas">
              {renderBuilderChild(node, {
                callback: (_witnessNode, prop) => () => setWitnessed(prop),
              })}
            </div>
          </BuilderBoundary>,
        )}
        {callbacks.length > 0
          ? (
            <p
              className="discern-catalogue-playground__witness"
              role="status"
              data-discern-playground-witness={witnessed ?? ""}
            >
              {witnessed === null
                ? `Consumer callbacks stay yours: ${
                  callbacks.join(", ")
                }. Preview activity is reported here.`
                : `${witnessed} fired in the preview.`}
            </p>
          )
          : null}
      </div>
      <aside
        className="discern-catalogue-playground__controls"
        aria-label={`${entry.meta.name} starter controls`}
      >
        <header>
          <h2>Starter controls</h2>
          <button
            type="button"
            className="discern-catalogue-playground__reset"
            disabled={edited === null}
            onClick={() => {
              setEdited(null);
              setWitnessed(null);
            }}
          >
            Reset starter
          </button>
        </header>
        {controls.textSlots.map((control) => (
          <div className="discern-builder-control" key={control.name}>
            <div className="discern-builder-control__heading">
              <div>
                <label
                  htmlFor={`detail-slot-${entry.meta.slug}-${control.name}`}
                >
                  {control.label}
                  {control.required
                    ? (
                      <small className="discern-builder-control__required">
                        required
                      </small>
                    )
                    : (
                      <small className="discern-builder-control__optional">
                        optional
                      </small>
                    )}
                </label>
                <small className="discern-builder-control__technical">
                  <code>{control.name}</code> · <code>{control.typeText}</code>
                </small>
              </div>
            </div>
            <AutoGrowTextarea
              id={`detail-slot-${entry.meta.slug}-${control.name}`}
              rows={1}
              value={detailSlotText(node, control)}
              onChange={(event) => {
                const change = changeDetailSlotText(
                  node,
                  control,
                  event.currentTarget.value,
                );
                if ("node" in change) {
                  setEdited(change.node);
                }
              }}
            />
          </div>
        ))}
        {controls.fields.map((control) => (
          <InspectorControlField
            key={control.name}
            node={node}
            control={control}
            defaultValue={starter.node.props[control.name]}
            onChange={applyField(control.name)}
            onReset={() => restoreField(control.name)}
          />
        ))}
        {controls.composedSlots.length > 0
          ? (
            <p
              className="discern-catalogue-playground__note"
              {...catalogueDecisionCopyProps}
            >
              Composed content — {controls.composedSlots
                .map(({ label }) => label)
                .join(", ")}{" "}
              — keeps its seeded structure here; rearrange it in the{" "}
              <a href="/catalogue/builder/">Builder</a>.
            </p>
          )
          : null}
        {controls.advanced.length > 0
          ? (
            <p
              className="discern-catalogue-playground__note"
              {...catalogueDecisionCopyProps}
            >
              {String(controls.advanced.length)}{" "}
              advanced passthrough prop{controls
                  .advanced.length === 1
                ? ""
                : "s"} — {controls.advanced.map(({ name }) => name).join(", ")}
              {" "}
              — stay documented under Props and variants.
            </p>
          )
          : null}
      </aside>
      <section
        className="discern-catalogue-playground__code"
        aria-label={`${entry.meta.name} starter usage`}
      >
        <header>
          <h2>Starter usage</h2>
          <CopyButton
            value={usage.tsx}
            label="Copy starter TSX"
            copiedLabel="Starter TSX copied"
          />
        </header>
        <p {...catalogueDecisionCopyProps}>
          An editable starting point emitted from the exact model this preview
          renders — not the canonical example.
        </p>
        <pre
          className="discern-catalogue-playground__tsx"
          data-discern-playground-tsx=""
          tabIndex={0}
          aria-label={`${entry.meta.name} starter TSX`}
        ><code>{usage.tsx}</code></pre>
        <CopyableCode label="Runtime selection" value={usage.selection} />
      </section>
    </div>
  );
}
