import { useRef, useState } from "react";
import type { RestoredBuilderSession } from "../persistence.ts";
import {
  type BuilderFeedbackModel,
  initialBuilderFeedback,
} from "./feedback.ts";

export interface BuilderFeedbackController {
  readonly model: BuilderFeedbackModel;
  announce(message: string, tone?: "status" | "error"): void;
  validation(
    message: string | null,
    field?: string,
    tone?: "status" | "error",
  ): void;
  storageFailure(message: string | null): void;
  persistence(state: "saving" | "saved" | "unavailable", message: string): void;
}

/** Own distinct feedback channels while retaining the current visual projection. */
export function useBuilderFeedback(
  restored: RestoredBuilderSession,
): BuilderFeedbackController {
  const serial = useRef(0);
  const [model, setModel] = useState<BuilderFeedbackModel>(() => {
    const initial = initialBuilderFeedback();
    if (restored.message === undefined) return initial;
    return restored.recoverySource !== undefined
      ? {
        ...initial,
        validation: {
          kind: "validation",
          field: "restored document",
          tone: restored.error ? "error" : "status",
          message: restored.message,
        },
      }
      : {
        ...initial,
        storageFailure: {
          kind: "storage-failure",
          message: restored.message,
        },
        persistence: {
          kind: "persistence",
          state: "unavailable",
          message: restored.message,
        },
      };
  });
  return {
    model,
    announce(message, tone = "status") {
      serial.current += 1;
      setModel((current) => ({
        ...current,
        announcement: {
          kind: "announcement",
          tone,
          message,
          serial: serial.current,
        },
      }));
    },
    validation(message, field = "composition", tone = "error") {
      setModel((current) => ({
        ...current,
        validation: message === null
          ? null
          : { kind: "validation", field, tone, message },
      }));
    },
    storageFailure(message) {
      setModel((current) => ({
        ...current,
        storageFailure: message === null
          ? null
          : { kind: "storage-failure", message },
        persistence: message === null
          ? current.persistence
          : { kind: "persistence", state: "unavailable", message },
      }));
    },
    persistence(state, message) {
      setModel((current) => ({
        ...current,
        persistence: { kind: "persistence", state, message },
      }));
    },
  };
}
