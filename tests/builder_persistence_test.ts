import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  BUILDER_HISTORY_LIMIT,
  commitHistory,
  initialHistory,
  redoHistory,
  undoHistory,
} from "../catalogue/builder/history.ts";
import type { BuilderDocument } from "../catalogue/builder/model.ts";
import {
  BUILDER_DOCUMENT_LIMITS,
  BuilderDocumentError,
} from "../catalogue/builder/policy.ts";
import {
  BUILDER_STORAGE_KEYS,
  GuardedBuilderStorage,
  persistBuilderDocument,
  persistBuilderTheme,
  readBuilderDocumentFile,
  restoreBuilderSession,
} from "../catalogue/builder/persistence.ts";
import { builderCompatibility } from "../catalogue/builder/registry-core.ts";

const policy = {
  knownSlugs: new Set<string>(),
  modeledPropsBySlug: new Map<string, ReadonlySet<string>>(),
  reservedPropsBySlug: new Map<string, ReadonlySet<string>>(),
  compatibility: builderCompatibility,
};

function document(name: string): BuilderDocument {
  return { version: 1, name, children: [] };
}

class MemoryStorage {
  readonly values = new Map<string, string>();
  reads = 0;
  writes = 0;
  failReads = false;
  failWrites = false;

  getItem(key: string): string | null {
    this.reads += 1;
    if (this.failReads) throw new DOMException("Denied", "SecurityError");
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.writes += 1;
    if (this.failWrites) throw new DOMException("Full", "QuotaExceededError");
    this.values.set(key, value);
  }
}

Deno.test("history holds exactly one hundred total snapshots", () => {
  let history = initialHistory(document("0"));
  for (let index = 1; index <= BUILDER_HISTORY_LIMIT + 20; index += 1) {
    history = commitHistory(history, document(String(index)));
  }
  assertEquals(history.past.length + 1 + history.future.length, 100);
  assertEquals(history.past[0]?.name, "21");
  assertEquals(history.present.name, "120");

  for (let index = 0; index < 120; index += 1) history = undoHistory(history);
  assertEquals(history.present.name, "21");
  assertEquals(history.past.length + 1 + history.future.length, 100);
  for (let index = 0; index < 120; index += 1) history = redoHistory(history);
  assertEquals(history.present.name, "120");
  assertEquals(history.past.length + 1 + history.future.length, 100);
});

Deno.test("storage denial trips one circuit until an explicit retry", () => {
  let providerCalls = 0;
  const denied = new GuardedBuilderStorage(() => {
    providerCalls += 1;
    throw new DOMException("Denied", "SecurityError");
  });
  assert(!denied.read(BUILDER_STORAGE_KEYS.document).ok);
  assert(!denied.write(BUILDER_STORAGE_KEYS.document, "source").ok);
  assertEquals(providerCalls, 1);
  denied.retry();
  assert(!denied.read(BUILDER_STORAGE_KEYS.document).ok);
  assertEquals(providerCalls, 2);
});

Deno.test("quota exhaustion contains autosave and theme writes", () => {
  const memory = new MemoryStorage();
  memory.failWrites = true;
  const storage = new GuardedBuilderStorage(() => memory);
  const active = document("Still editable");
  const failed = persistBuilderDocument(storage, active, policy);
  assert(!failed.ok);
  assert(failed.message.includes("download Builder JSON"));
  assert(!persistBuilderTheme(storage, "dark").ok);
  assertEquals(memory.writes, 1);
  assertEquals(active, document("Still editable"));

  memory.failWrites = false;
  storage.retry();
  assert(persistBuilderDocument(storage, active, policy).ok);
  assertEquals(memory.writes, 2);
});

Deno.test("corrupt saved state starts safely and preserves its exact source", () => {
  const memory = new MemoryStorage();
  const corrupt = '{"version":1,"name":"broken","children":[';
  memory.values.set(BUILDER_STORAGE_KEYS.document, corrupt);
  memory.values.set(BUILDER_STORAGE_KEYS.theme, "dark");
  const restored = restoreBuilderSession(
    new GuardedBuilderStorage(() => memory),
    policy,
  );
  assertEquals(restored.document, document("Untitled page"));
  assertEquals(restored.theme, "dark");
  assertEquals(restored.recoverySource, corrupt);
  assertEquals(memory.values.get(BUILDER_STORAGE_KEYS.recovery), corrupt);
  assert(restored.error);
  assert(restored.message?.includes("could not be restored"));
});

Deno.test("structural recovery retains 2B's human refusal", () => {
  const memory = new MemoryStorage();
  const buttonProps = new Map([["button", new Set(["children"])]]);
  const structuralPolicy = {
    knownSlugs: new Set(["button"]),
    modeledPropsBySlug: buttonProps,
    reservedPropsBySlug: buttonProps,
    compatibility: builderCompatibility,
  };
  const invalid: BuilderDocument = {
    version: 1,
    name: "Nested controls",
    children: [{
      kind: "component",
      id: "outer",
      slug: "button",
      props: {
        children: {
          kind: "slot",
          children: [{
            kind: "component",
            id: "inner",
            slug: "button",
            props: {},
          }],
        },
      },
    }],
  };
  const source = JSON.stringify(invalid);
  memory.values.set(BUILDER_STORAGE_KEYS.document, source);
  const restored = restoreBuilderSession(
    new GuardedBuilderStorage(() => memory),
    structuralPolicy,
  );
  assert(restored.error);
  assert(restored.message?.includes("interactive controls cannot contain"));
  assertEquals(restored.recoverySource, source);
  assertEquals(memory.values.get(BUILDER_STORAGE_KEYS.recovery), source);
});

Deno.test("a prior recovery remains visible after a clean reload", () => {
  const memory = new MemoryStorage();
  memory.values.set(
    BUILDER_STORAGE_KEYS.document,
    JSON.stringify(document("Clean")),
  );
  memory.values.set(BUILDER_STORAGE_KEYS.recovery, "original rejected source");
  const restored = restoreBuilderSession(
    new GuardedBuilderStorage(() => memory),
    policy,
  );
  assertEquals(restored.document, document("Clean"));
  assertEquals(restored.recoverySource, "original rejected source");
  assert(restored.message?.includes("available below"));
});

Deno.test("file loading bounds before reading and normalizes read failures", async () => {
  let reads = 0;
  const exact = await readBuilderDocumentFile({
    size: BUILDER_DOCUMENT_LIMITS.inputBytes,
    text: () => {
      reads += 1;
      return Promise.resolve(JSON.stringify(document("Exact")));
    },
  }, policy);
  assertEquals(exact, document("Exact"));
  assertEquals(reads, 1);

  await assertRejects(
    () =>
      readBuilderDocumentFile({
        size: BUILDER_DOCUMENT_LIMITS.inputBytes + 1,
        text: () => {
          reads += 1;
          return Promise.resolve(JSON.stringify(document("Too large")));
        },
      }, policy),
    BuilderDocumentError,
    "accepts at most",
  );
  assertEquals(reads, 1);

  await assertRejects(
    () =>
      readBuilderDocumentFile({
        size: 1,
        text: () => Promise.reject(new DOMException("Gone", "NotFoundError")),
      }, policy),
    BuilderDocumentError,
    "could not be read",
  );
});
