import { Button } from "../../core/button/button.tsx";
import { EmptyState } from "./empty-state.tsx";

export default function EmptyStateExamples() {
  return (
    <div className="discern-example-stack">
      <EmptyState
        title="Nothing here yet"
        description="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt."
        actions={<Button variant="secondary">Lorem ipsum</Button>}
      />
    </div>
  );
}
