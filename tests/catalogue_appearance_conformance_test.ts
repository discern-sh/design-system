import { assertEquals } from "@std/assert";
import type { Page } from "playwright-core";
import {
  GENERATED_CLI_POPULATION_SETTLE_TIMEOUT_MS,
  waitForGeneratedCliGround,
} from "../scripts/conformance/catalogue/appearance.ts";

type PopulationPredicate = (input: {
  readonly expectedExamples: number;
  readonly ground: "light" | "dark";
  readonly selector: string;
}) => boolean;

Deno.test("generated CLI ground settling stays browser-resident and CI-scaled", async () => {
  let predicate: PopulationPredicate | undefined;
  let input: Parameters<PopulationPredicate>[0] | undefined;
  let options:
    | { readonly polling: string; readonly timeout: number }
    | undefined;
  const page = {
    waitForFunction: (
      operation: PopulationPredicate,
      argument: Parameters<PopulationPredicate>[0],
      waitOptions: { readonly polling: string; readonly timeout: number },
    ): Promise<void> => {
      predicate = operation;
      input = argument;
      options = waitOptions;
      return Promise.resolve();
    },
  } as unknown as Page;

  await waitForGeneratedCliGround(page, 286, "dark");

  assertEquals(GENERATED_CLI_POPULATION_SETTLE_TIMEOUT_MS, 30_000);
  assertEquals(input, {
    expectedExamples: 286,
    ground: "dark",
    selector: "[data-discern-component] .discern-catalogue-cli-preview",
  });
  assertEquals(options, {
    polling: "raf",
    timeout: GENERATED_CLI_POPULATION_SETTLE_TIMEOUT_MS,
  });

  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  const grounds = ["dark", "dark"];
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      querySelectorAll: () =>
        grounds.map((ground) => ({
          getAttribute: () => ground,
        })),
    },
  });
  try {
    assertEquals(predicate?.({ ...input!, expectedExamples: 2 }), true);
    grounds[1] = "light";
    assertEquals(predicate?.({ ...input!, expectedExamples: 2 }), false);
    grounds[1] = "dark";
    assertEquals(predicate?.({ ...input!, expectedExamples: 3 }), false);
  } finally {
    if (original === undefined) {
      delete (globalThis as { document?: Document }).document;
    } else {
      Object.defineProperty(globalThis, "document", original);
    }
  }
});
