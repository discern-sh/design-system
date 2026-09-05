import { useState } from "react";
import { createRoot } from "react-dom/client";
import { CopyButton } from "../../src/react.ts";

function Host() {
  const [cancel, setCancel] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [value, setValue] = useState("first value");
  const [decorated, setDecorated] = useState(false);
  const [mounted, setMounted] = useState(true);
  return (
    <>
      <button
        type="button"
        id="toggle-cancel"
        onClick={() => setCancel(!cancel)}
      >
        Toggle cancellation
      </button>
      <button
        type="button"
        id="toggle-disabled"
        onClick={() => setDisabled(!disabled)}
      >
        Toggle disabled
      </button>
      <button
        type="button"
        id="change-value"
        onClick={() => setValue("second value")}
      >
        Change value
      </button>
      <button
        type="button"
        id="toggle-mount"
        onClick={() => setMounted(!mounted)}
      >
        Toggle mount
      </button>
      <button
        type="button"
        id="toggle-icons"
        onClick={() => setDecorated(!decorated)}
      >
        Toggle icons
      </button>
      {mounted && (
        <CopyButton
          id="live-copy"
          value={value}
          icon={decorated ? <b>+</b> : undefined}
          copiedIcon={decorated ? <b>✓</b> : undefined}
          disabled={disabled}
          onClick={(event) => {
            if (cancel) event.preventDefault();
          }}
        />
      )}
    </>
  );
}
createRoot(document.getElementById("live-copy-root")!).render(<Host />);
