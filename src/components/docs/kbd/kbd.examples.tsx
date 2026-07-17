import { Kbd } from "./kbd.tsx";

export default function KbdExamples() {
  return (
    <div className="discern-example-row">
      <span>
        <Kbd>⌘</Kbd> <Kbd>K</Kbd>
      </span>
      <Kbd>Esc</Kbd>
      <Kbd>Enter</Kbd>
      <span>
        <Kbd>Ctrl</Kbd> <Kbd>Shift</Kbd> <Kbd>P</Kbd>
      </span>
    </div>
  );
}
