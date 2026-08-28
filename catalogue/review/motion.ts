import { baseTokens } from "../../src/tokens/tokens.ts";

export type ReviewMotionStyle = Readonly<
  Record<`--discern-duration-${string}`, string>
>;

const durationNames = [
  "--discern-duration-fast",
  "--discern-duration-medium",
  "--discern-duration-reveal",
] as const;

function durationValue(name: (typeof durationNames)[number]): number {
  const value = baseTokens.find((token) => token.name === name)?.value;
  const match = value?.match(/^(\d+)ms$/);
  if (match === undefined || match === null) {
    throw new TypeError(`Review motion cannot resolve ${name}`);
  }
  return Number(match[1]);
}

/** Scope diagnostic timing to the local review specimen; production is untouched. */
export function reviewMotionStyle(
  motion: "ordinary" | "reduced",
  speed: "production" | "slow",
): ReviewMotionStyle {
  if (motion === "ordinary" && speed === "production") return {};
  const scale = motion === "reduced" ? 0 : 4;
  return Object.fromEntries(
    durationNames.map((name) => [name, `${durationValue(name) * scale}ms`]),
  ) as ReviewMotionStyle;
}
