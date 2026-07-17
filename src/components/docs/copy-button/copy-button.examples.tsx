import { CopyButton } from "./copy-button.tsx";

export default function CopyButtonExamples() {
  return (
    <div className="discern-example-row">
      <CopyButton value="lorem ipsum dolor sit amet" />
      <CopyButton
        value="lorem --ipsum --dolor"
        label="Copy command"
        copiedLabel="Command copied"
      />
    </div>
  );
}
