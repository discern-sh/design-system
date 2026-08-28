import { useRef, useState } from "react";
import {
  type BuilderHistoryState,
  commitHistory,
  initialHistory,
  redoHistory,
  undoHistory,
} from "../history.ts";
import type { BuilderDocument } from "../model.ts";
import {
  assertBuilderDocument,
  BuilderDocumentError,
  type BuilderDocumentPolicy,
} from "../policy.ts";

/** A feature-owned document command. Only this accepted store may commit it. */
export type BuilderDocumentCommand = (
  current: BuilderDocument,
) => BuilderDocument;

/** The observable result of attempting one accepted-document command. */
export interface BuilderCommandResult {
  readonly changed: boolean;
  readonly error: string | null;
}

/** Pure transition used by the live store and its contract tests. */
export function commitAcceptedDocument(
  history: BuilderHistoryState,
  command: BuilderDocumentCommand,
  policy: BuilderDocumentPolicy,
): Readonly<{
  history: BuilderHistoryState;
  result: BuilderCommandResult;
}> {
  try {
    const document = command(history.present);
    if (document === history.present) {
      return { history, result: { changed: false, error: null } };
    }
    assertBuilderDocument(document, policy);
    return {
      history: commitHistory(history, document),
      result: { changed: true, error: null },
    };
  } catch (error) {
    const message = error instanceof BuilderDocumentError
      ? error.message
      : error instanceof Error
      ? error.message
      : "The composition could not be changed.";
    return { history, result: { changed: false, error: message } };
  }
}

/** One accepted document/history authority shared by every Builder feature. */
export interface AcceptedDocumentStore {
  readonly history: BuilderHistoryState;
  readonly document: BuilderDocument;
  apply(command: BuilderDocumentCommand): BuilderCommandResult;
  undo(): BuilderHistoryState;
  redo(): BuilderHistoryState;
}

/**
 * Own the only live Builder history. Feature modules contribute commands, but
 * cannot put an unaccepted document into preview, persistence, or export.
 */
export function useAcceptedDocumentStore(
  initialDocument: BuilderDocument,
  policy: BuilderDocumentPolicy,
  onError: (message: string) => void,
): AcceptedDocumentStore {
  const [history, setHistory] = useState<BuilderHistoryState>(() =>
    initialHistory(initialDocument)
  );
  const historyRef = useRef(history);
  historyRef.current = history;

  const apply = (command: BuilderDocumentCommand): BuilderCommandResult => {
    const transition = commitAcceptedDocument(
      historyRef.current,
      command,
      policy,
    );
    if (transition.history !== historyRef.current) {
      historyRef.current = transition.history;
      setHistory(transition.history);
    }
    if (transition.result.error !== null) onError(transition.result.error);
    return transition.result;
  };

  const travel = (direction: "undo" | "redo"): BuilderHistoryState => {
    const current = historyRef.current;
    const next = direction === "undo"
      ? undoHistory(current)
      : redoHistory(current);
    if (next !== current) {
      historyRef.current = next;
      setHistory(next);
    }
    return next;
  };

  return {
    history,
    document: history.present,
    apply,
    undo: () => travel("undo"),
    redo: () => travel("redo"),
  };
}
