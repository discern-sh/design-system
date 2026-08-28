import { assert, assertEquals } from "@std/assert";
import { registry } from "../catalogue/generated/registry.ts";
import { componentSearchRecords } from "../catalogue/routes.ts";
import {
  explanatoryMatchReason,
  normalizeSearchText,
  searchRecords,
  supportingMatchReason,
  tokenizeSearchText,
} from "../catalogue/search/mod.ts";
import type { SearchRecord } from "../catalogue/search/mod.ts";
import type { ComponentMeta } from "../src/types/component-meta.ts";

const records = [
  {
    id: "direct",
    href: "/button/",
    title: "Button",
    context: "Component · Core",
    slug: "button",
    group: "Core",
    description: "A direct action control.",
  },
  {
    id: "supporting",
    href: "/card/",
    title: "Card",
    context: "Component · Display",
    description: "May contain a button as a supporting action.",
  },
] as const satisfies readonly SearchRecord[];

Deno.test("universal search normalises punctuation, case, accents, and aliases", () => {
  assertEquals(normalizeSearchText("  CÀLL-to-action!  "), "cta");
  assertEquals(tokenizeSearchText("Command-line interface"), ["cli"]);
  assertEquals(tokenizeSearchText("Colour / TOKENS"), ["color", "tokens"]);
});

Deno.test("direct and prefix names outrank weak supporting prose", () => {
  assertEquals(
    searchRecords(records, "button").map(({ record }) => record.id),
    ["direct", "supporting"],
  );
  assertEquals(searchRecords(records, "but")[0]?.record.id, "direct");
});

Deno.test("call to action finds CTA band through the shared alias vocabulary", () => {
  const results = searchRecords(
    componentSearchRecords(registry),
    "call to action",
  );
  assertEquals(results[0]?.record.title, "CTA band");
  assertEquals(results[0]?.reasons[0]?.field, "title");
  assertEquals(results[0]?.reasons[1], {
    field: "alias",
    label: "Alias",
    value: "call to action",
    token: "cta",
  });
  assertEquals(explanatoryMatchReason(results[0]!)?.label, "Alias");
});

Deno.test("multi-token intent may match across fields and reports the supporting field", () => {
  const multiField: SearchRecord = {
    id: "recovery",
    href: "/recovery/",
    title: "Retry notice",
    context: "Component · Workflow",
    group: "Workflow",
    description: "Recover after a failed operation.",
    purposes: ["Displaying tool output"],
    facts: [{ label: "Use when", value: "Failure recovery needs one action." }],
  };
  const [result] = searchRecords([multiField], "failure recovery");
  assert(result !== undefined);
  assertEquals(result.reasons.map(({ field }) => field), ["fact", "fact"]);
  assertEquals(supportingMatchReason(result)?.label, "Use when");
});

Deno.test("empty and unmatched queries return an honest empty result set", () => {
  assertEquals(searchRecords(records, ""), []);
  assertEquals(searchRecords(records, "---"), []);
  assertEquals(searchRecords(records, "nonexistent destination"), []);
});

Deno.test("stable ties use provider order, then title and id", () => {
  const tied: readonly SearchRecord[] = [
    {
      id: "z",
      href: "/z",
      title: "Zed",
      context: "Test",
      keywords: ["shared"],
    },
    {
      id: "b",
      href: "/b",
      title: "Alpha",
      context: "Test",
      keywords: ["shared"],
      order: 2,
    },
    {
      id: "a",
      href: "/a",
      title: "Alpha",
      context: "Test",
      keywords: ["shared"],
      order: 2,
    },
    {
      id: "first",
      href: "/first",
      title: "Omega",
      context: "Test",
      keywords: ["shared"],
      order: 1,
    },
  ];
  assertEquals(
    searchRecords(tied, "shared").map(({ record }) => record.id),
    ["z", "first", "a", "b"],
  );
});

Deno.test("component providers restrict populations without changing semantics and auto-enrol future members", () => {
  const futureMeta = {
    name: "Signal bridge",
    slug: "signal-bridge",
    group: "Core",
    order: 999,
    description: "Connects a fresh unrelated signal to a destination.",
    purposes: ["procedural-workflow"],
    useWhen: ["A bridge is needed between two states."],
    cli: { stance: "exempt", reason: "Synthetic search fixture." },
  } as const satisfies ComponentMeta;
  const projected = componentSearchRecords([
    ...registry.slice(0, 2),
    { meta: futureMeta },
  ]);
  assertEquals(projected.length, 3);
  assertEquals(
    searchRecords(projected, "unrelated signal")[0]?.record.id,
    "component:signal-bridge",
  );

  const restricted = projected.filter(({ id }) =>
    id === "component:signal-bridge"
  );
  assertEquals(
    searchRecords(restricted, "bridge")[0]?.record.title,
    searchRecords(projected, "bridge")[0]?.record.title,
  );
});
