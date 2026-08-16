/** Failure-contained browser storage and file workflows for the builder. */
import type { BuilderDocument } from "./model.ts";
import {
  BUILDER_DOCUMENT_LIMITS,
  BuilderDocumentError,
  type BuilderDocumentPolicy,
  parseBuilderDocument,
} from "./policy.ts";
import { serializeDocument } from "./export.ts";

export const BUILDER_STORAGE_KEYS = {
  document: "discern-builder-document",
  recovery: "discern-builder-document-recovery",
  theme: "discern-builder-theme",
} as const;

export type BuilderThemePreference = "system" | "light" | "dark";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type StorageResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly message: string };

function operationMessage(operation: "read" | "write"): string {
  return operation === "read"
    ? "Browser storage is unavailable. This composition remains editable but will not restore after this tab closes."
    : "Browser storage could not save this composition. Editing can continue; use Save file or retry storage.";
}

/**
 * A storage circuit breaker. A denied getter or failed write is attempted once
 * per session until the user explicitly retries, so edits never cause a throw
 * loop.
 */
export class GuardedBuilderStorage {
  #storage: StorageLike | undefined;
  #resolved = false;
  #accessFailure: string | undefined;
  #writeFailure: string | undefined;

  constructor(private readonly provider: () => StorageLike) {}

  get blocked(): boolean {
    return this.#accessFailure !== undefined ||
      this.#writeFailure !== undefined;
  }

  retry(): void {
    this.#storage = undefined;
    this.#resolved = false;
    this.#accessFailure = undefined;
    this.#writeFailure = undefined;
  }

  read(key: string): StorageResult<string | null> {
    const storage = this.#resolve();
    if (!storage.ok) return storage;
    try {
      return { ok: true, value: storage.value.getItem(key) };
    } catch {
      const message = operationMessage("read");
      this.#accessFailure = message;
      return { ok: false, message };
    }
  }

  write(key: string, value: string): StorageResult<void> {
    if (this.#writeFailure !== undefined) {
      return { ok: false, message: this.#writeFailure };
    }
    const storage = this.#resolve();
    if (!storage.ok) return storage;
    try {
      storage.value.setItem(key, value);
      return { ok: true, value: undefined };
    } catch {
      const message = operationMessage("write");
      this.#writeFailure = message;
      return { ok: false, message };
    }
  }

  #resolve(): StorageResult<StorageLike> {
    if (this.#accessFailure !== undefined) {
      return { ok: false, message: this.#accessFailure };
    }
    if (this.#resolved && this.#storage !== undefined) {
      return { ok: true, value: this.#storage };
    }
    try {
      this.#storage = this.provider();
      this.#resolved = true;
      return { ok: true, value: this.#storage };
    } catch {
      const message = operationMessage("read");
      this.#accessFailure = message;
      return { ok: false, message };
    }
  }
}

export interface RestoredBuilderSession {
  readonly document: BuilderDocument;
  readonly theme: BuilderThemePreference;
  readonly recoverySource?: string;
  readonly message?: string;
  readonly error: boolean;
}

function emptySessionDocument(): BuilderDocument {
  return { version: 1, name: "Untitled page", children: [] };
}

/** Restore document and theme without allowing either failure to abort startup. */
export function restoreBuilderSession(
  storage: GuardedBuilderStorage,
  policy: BuilderDocumentPolicy,
): RestoredBuilderSession {
  let document = emptySessionDocument();
  let theme: BuilderThemePreference = "system";
  let recoverySource: string | undefined;
  let message: string | undefined;
  let error = false;

  const saved = storage.read(BUILDER_STORAGE_KEYS.document);
  if (!saved.ok) {
    message = saved.message;
    error = true;
  } else if (saved.value !== null) {
    try {
      document = parseBuilderDocument(saved.value, policy);
    } catch (cause) {
      recoverySource = saved.value;
      const recovery = storage.write(
        BUILDER_STORAGE_KEYS.recovery,
        saved.value,
      );
      const reason = cause instanceof BuilderDocumentError
        ? cause.message
        : "The saved composition is invalid.";
      message = recovery.ok
        ? `The saved composition could not be restored (${reason}) Its original source is preserved below and in browser recovery storage.`
        : `The saved composition could not be restored (${reason}) Its original source is preserved below; browser recovery storage is unavailable.`;
      error = true;
    }
  }

  if (recoverySource === undefined) {
    const recovery = storage.read(BUILDER_STORAGE_KEYS.recovery);
    if (recovery.ok && recovery.value !== null) {
      recoverySource = recovery.value;
      if (message === undefined) {
        message =
          "A previously rejected composition source is available below for recovery.";
      }
    } else if (!recovery.ok && message === undefined) {
      message = recovery.message;
      error = true;
    }
  }

  const savedTheme = storage.read(BUILDER_STORAGE_KEYS.theme);
  if (savedTheme.ok && savedTheme.value !== null) {
    if (
      savedTheme.value === "system" || savedTheme.value === "light" ||
      savedTheme.value === "dark"
    ) {
      theme = savedTheme.value;
    }
  } else if (!savedTheme.ok && message === undefined) {
    message = savedTheme.message;
    error = true;
  }

  return {
    document,
    theme,
    ...(recoverySource === undefined ? {} : { recoverySource }),
    ...(message === undefined ? {} : { message }),
    error,
  };
}

/** Autosave one policy-accepted document through the guarded storage path. */
export function persistBuilderDocument(
  storage: GuardedBuilderStorage,
  document: BuilderDocument,
  policy: BuilderDocumentPolicy,
): StorageResult<void> {
  return storage.write(
    BUILDER_STORAGE_KEYS.document,
    serializeDocument(document, policy),
  );
}

/** Persist the shared theme preference through the same guarded path. */
export function persistBuilderTheme(
  storage: GuardedBuilderStorage,
  theme: BuilderThemePreference,
): StorageResult<void> {
  return storage.write(BUILDER_STORAGE_KEYS.theme, theme);
}

export interface BuilderFileLike {
  readonly size: number;
  text(): Promise<string>;
}

/** Read one selected file only after the browser-reported byte ceiling. */
export async function readBuilderDocumentFile(
  file: BuilderFileLike,
  policy: BuilderDocumentPolicy,
): Promise<BuilderDocument> {
  if (file.size > BUILDER_DOCUMENT_LIMITS.inputBytes) {
    throw new BuilderDocumentError(
      `The selected file is ${file.size} bytes; the builder accepts at most ${BUILDER_DOCUMENT_LIMITS.inputBytes} bytes.`,
    );
  }
  let source: string;
  try {
    source = await file.text();
  } catch {
    throw new BuilderDocumentError("The selected file could not be read.");
  }
  return parseBuilderDocument(source, policy);
}

/** Browser provider kept lazy so denied localStorage access cannot crash import. */
export function browserBuilderStorage(): GuardedBuilderStorage {
  return new GuardedBuilderStorage(() => globalThis.localStorage);
}
