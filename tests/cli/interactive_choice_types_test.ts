import { assertEquals } from "@std/assert";
import type {
  FleetCliProps,
  InteractiveChoiceEntryState,
} from "../../src/cli/mod.ts";
import type {
  InteractionChoice,
  InteractionEntry,
  InteractionGroupHeading,
  SearchRequestOptions,
  SelectionRequestOptions,
} from "../../src/cli/interactive/mod.ts";

type Assert<Condition extends true> = Condition;
type HeadingValueIsNever = Assert<
  [NonNullable<InteractionGroupHeading["value"]>] extends [never] ? true
    : false
>;

const headingValueIsNever: HeadingValueIsNever = true;
const heading = {
  kind: "group-heading",
  id: "recommended",
  label: "Recommended",
} as const satisfies InteractionGroupHeading;
const entries = [
  heading,
  { id: "one", label: "One", value: 1 },
] as const satisfies readonly InteractionEntry<number>[];
const plainChoices = [
  { id: "one", label: "One", value: 1 },
  { id: "two", label: "Two", value: 2 },
] as const satisfies readonly InteractionChoice<number>[];
const groupedOptions = {
  label: "Grouped",
  choices: entries,
} satisfies SelectionRequestOptions<number>;
const plainOptions = {
  label: "Plain",
  choices: plainChoices,
} satisfies SelectionRequestOptions<number>;
const searchableOptions = {
  label: "Search",
  initialId: "one",
  search: () => entries,
} satisfies SearchRequestOptions<number>;
const frameEntries = [
  { kind: "group-heading", id: "recommended", label: "Recommended" },
  { id: "one", label: "One" },
] as const satisfies readonly InteractiveChoiceEntryState[];
const fleetOptions = {
  rows: [{ persona: "Audit", branch: "agent/audit" }],
  identityMode: "lossless",
} as const satisfies FleetCliProps;

Deno.test("choice entry types need no generic sentinel or explicit discriminant", () => {
  assertEquals(headingValueIsNever, true);
  assertEquals(groupedOptions.choices[0], heading);
  assertEquals(plainOptions.choices, plainChoices);
  assertEquals(searchableOptions.initialId, "one");
  assertEquals(frameEntries[0].kind, "group-heading");
  assertEquals(fleetOptions.identityMode, "lossless");
});
