import { AgentAvatar } from "./agent-avatar.tsx";
import { Avatar } from "../../people/avatar/avatar.tsx";
import { AvatarGroup } from "../../people/avatar-group/avatar-group.tsx";

export default function AgentAvatarExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <AgentAvatar name="quill" size="xs" />
        <AgentAvatar name="forge-2" size="sm" />
        <AgentAvatar name="atlas-3" size="md" />
        <AgentAvatar name="beacon" size="lg" />
        <AgentAvatar name="lantern-9" size="xl" />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <AgentAvatar name="quill" status="working" />
        <AgentAvatar name="forge-2" status="waiting" />
        <AgentAvatar name="atlas-3" status="blocked" />
        <AgentAvatar name="beacon" status="done" />
        <AgentAvatar name="lantern-9" status="idle" />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <AgentAvatar name="quill" sigil="❯" />
        <AgentAvatar name="review bot" sigil="✓" size="sm" />
      </div>
      <AvatarGroup label="One reviewer and three agents" max={4}>
        <Avatar name="Morgan Ellis" />
        <AgentAvatar name="quill" decorative />
        <AgentAvatar name="forge-2" decorative />
        <AgentAvatar name="atlas-3" decorative />
      </AvatarGroup>
    </div>
  );
}
