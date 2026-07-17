import { Kbd } from "./kbd.tsx";

export default function KbdExamples() {
  return (
    <div className="discern-example-row">
      <span>
        <Kbd>⌘</Kbd> <Kbd>K</Kbd>
      </span>
      <span>
        <Kbd>Esc</Kbd>
      </span>
      <span>
        <Kbd>Enter</Kbd>
      </span>
      <span>
        <Kbd>Ctrl</Kbd> <Kbd>Shift</Kbd> <Kbd>P</Kbd>
      </span>
    </div>
  );
}
