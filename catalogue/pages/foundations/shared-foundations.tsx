import { useState } from "react";
import { Button } from "../../../src/components/core/button/button.tsx";
import { IconButton } from "../../../src/components/core/icon-button/icon-button.tsx";
import { Card } from "../../../src/components/display/card/card.tsx";
import { Input } from "../../../src/components/forms/input/input.tsx";
import { Select } from "../../../src/components/forms/select/select.tsx";
import { Stack } from "../../../src/components/layout/stack/stack.tsx";

/** A composed specimen for judging the shared visual relationships. */
export function SharedFoundationsPreview() {
  const [applied, setApplied] = useState(false);
  return (
    <section
      className="discern-catalogue-foundation-study"
      id="shared-foundations"
      aria-labelledby="shared-foundations-title"
    >
      <Stack gap={2}>
        <h2 id="shared-foundations-title">Foundations in use</h2>
        <p>
          Compare the hierarchy, spacing, and aligned controls. Use Appearance
          to explore the same composition across darkness and density.
        </p>
      </Stack>
      <div
        className="discern-catalogue-foundation-study__tones"
        aria-label="Surface tones"
      >
        {(["canvas", "surface", "surface-sunken"] as const).map((role) => (
          <span
            key={role}
            style={{ background: `var(--discern-color-${role})` }}
          >
            {role === "canvas"
              ? "Canvas"
              : role === "surface"
              ? "Surface"
              : "Sunken"}
          </span>
        ))}
      </div>
      <Card raised>
        <Stack>
          <Stack gap={2}>
            <h3>Notification preferences</h3>
            <p>Choose where updates arrive and how often you receive them.</p>
          </Stack>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setApplied(true);
            }}
            onReset={() => setApplied(false)}
          >
            <div className="discern-catalogue-foundation-study__controls">
              <Input
                label="Email address"
                type="email"
                defaultValue="reader@example.com"
                required
              />
              <Select
                label="Frequency"
                defaultValue="weekly"
                options={[
                  { value: "weekly", label: "Weekly digest" },
                  { value: "daily", label: "Daily summary" },
                ]}
              />
              <div className="discern-catalogue-foundation-study__actions">
                <Button type="submit">Apply</Button>
                <IconButton
                  type="reset"
                  variant="outline"
                  icon="↺"
                  label="Reset preferences"
                />
              </div>
            </div>
            <p
              className="discern-catalogue-foundation-study__meta"
              role="status"
            >
              {applied
                ? "Preferences applied for this preview."
                : "You can change these preferences at any time."}
            </p>
          </form>
          <Card raised padding="sm">
            <Stack gap={2}>
              <h4>Included in your digest</h4>
              <p>
                New publications, saved reading, and updates to followed topics.
              </p>
            </Stack>
          </Card>
        </Stack>
      </Card>
      <div
        className="discern-catalogue-foundation-study__sizes"
        aria-label="Action sizes"
      >
        {(["sm", "md", "lg"] as const).map((size) => (
          <div key={size} data-discern-control-study-size={size}>
            <Button size={size} variant="secondary">
              {size === "sm" ? "Compact" : size === "md" ? "Default" : "Large"}
            </Button>
            <IconButton
              size={size}
              variant="outline"
              icon="+"
              label={`Add item (${size})`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
