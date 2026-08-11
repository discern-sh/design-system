/**
 * Framework-neutral vocabulary shared by Agent avatar renderers.
 *
 * @module
 */

/** Size step shared by Agent avatar and the components composing it. */
export type AgentAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

/** Activity state shared by web and CLI agent identity renderers. */
export type AgentStatus = "working" | "waiting" | "blocked" | "done" | "idle";
