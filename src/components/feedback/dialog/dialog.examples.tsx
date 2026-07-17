import { useState } from "react";
import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { Button } from "../../core/button/button.tsx";
import { Input } from "../../forms/input/input.tsx";
import { Dialog } from "./dialog.tsx";

export const conformance = [{
  name: "opening and escaping the modal restores focus to its trigger",
  steps: [
    { action: "click", target: { role: "button", name: "Open dialog" } },
    {
      expect: "visible",
      target: { role: "dialog", name: "Lorem ipsum dolor" },
    },
    {
      expect: "focused",
      target: { role: "button", name: "Close dialog" },
    },
    { action: "press", key: "Escape" },
    {
      expect: "hidden",
      target: { role: "dialog", name: "Lorem ipsum dolor" },
    },
    {
      expect: "focused",
      target: { role: "button", name: "Open dialog" },
    },
  ],
}] satisfies readonly ConformanceScenario[];

export default function DialogExamples() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        kicker="Example"
        title="Lorem ipsum dolor"
        actions={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>Continue</Button>
          </>
        }
      >
        <Input label="Lorem ipsum" placeholder="Dolor sit amet" />
      </Dialog>
    </>
  );
}
