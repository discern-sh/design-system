/**
 * Framework-neutral vocabulary shared by Avatar renderers.
 *
 * @module
 */

/** Size step shared by Avatar and the components composing it. */
export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

/** Presence state an Avatar can carry. */
export type AvatarPresence = "online" | "away" | "busy" | "offline";

/** Avatar silhouette shared by web and CLI renderers. */
export type AvatarShape = "circle" | "square";
