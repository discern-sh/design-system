import { OwnershipBadge } from "./ownership-badge.tsx";

export default function OwnershipBadgeExamples() {
  return (
    <div className="discern-example-row">
      <OwnershipBadge ownership="authored" />
      <OwnershipBadge ownership="generated" />
      <OwnershipBadge ownership="project-owned" />
      <OwnershipBadge ownership="tool-owned" />
    </div>
  );
}
