import { useEffect, useRef, useState } from "react";
import type { RestoredBuilderSession } from "../persistence.ts";
import {
  announcementFeedback,
  type BuilderFeedbackModel,
  initialBuilderFeedback,
  shouldToastBuilderAnnouncement,
} from "./feedback.ts";

const TOAST_DURATION_MS = 4800;

export interface BuilderFeedbackController {
  readonly model: BuilderFeedbackModel;
  announce(message: string, tone?: "status" | "error"): void;
  storageFailure(message: string | null): void;
  persistence(state: "saving" | "saved" | "unavailable", message: string): void;
  dismissToast(): void;
  pauseToast(): void;
  resumeToast(): void;
}

/** Own distinct live, transient, durable, and persistence feedback channels. */
export function useBuilderFeedback(
  restored: RestoredBuilderSession,
): BuilderFeedbackController {
  const serial = useRef(0);
  const toastTimer = useRef<
    ReturnType<typeof globalThis.setTimeout> | undefined
  >(undefined);
  const savedTimer = useRef<
    ReturnType<typeof globalThis.setTimeout> | undefined
  >(undefined);
  const toastStartedAt = useRef(0);
  const toastRemaining = useRef(TOAST_DURATION_MS);
  const [model, setModel] = useState<BuilderFeedbackModel>(() => {
    const initial = initialBuilderFeedback();
    if (restored.message === undefined) return initial;
    if (restored.recoverySource !== undefined) {
      return {
        ...initial,
        recovery: {
          kind: "recovery",
          message: restored.message,
        },
      };
    }
    return {
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

  const clearTimer = (): void => {
    if (toastTimer.current !== undefined) {
      globalThis.clearTimeout(toastTimer.current);
      toastTimer.current = undefined;
    }
  };
  const dismissToast = (): void => {
    clearTimer();
    setModel((current) => ({ ...current, toast: null }));
  };
  const startTimer = (duration: number): void => {
    clearTimer();
    toastRemaining.current = duration;
    toastStartedAt.current = Date.now();
    toastTimer.current = globalThis.setTimeout(dismissToast, duration);
  };
  useEffect(() => () => {
    clearTimer();
    if (savedTimer.current !== undefined) {
      globalThis.clearTimeout(savedTimer.current);
    }
  }, []);

  return {
    model,
    announce(message, tone = "status") {
      serial.current += 1;
      const nextSerial = serial.current;
      setModel((current) =>
        announcementFeedback(current, message, tone, nextSerial)
      );
      if (shouldToastBuilderAnnouncement(message, tone)) {
        startTimer(TOAST_DURATION_MS);
      }
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
      if (savedTimer.current !== undefined) {
        globalThis.clearTimeout(savedTimer.current);
        savedTimer.current = undefined;
      }
      if (state === "saved") {
        savedTimer.current = globalThis.setTimeout(() => {
          setModel((current) => ({
            ...current,
            persistence: { kind: "persistence", state, message },
          }));
          savedTimer.current = undefined;
        }, 120);
        return;
      }
      setModel((current) => ({
        ...current,
        persistence: { kind: "persistence", state, message },
      }));
    },
    dismissToast,
    pauseToast() {
      if (toastTimer.current === undefined) return;
      toastRemaining.current = Math.max(
        0,
        toastRemaining.current - (Date.now() - toastStartedAt.current),
      );
      clearTimer();
    },
    resumeToast() {
      if (model.toast === null || toastTimer.current !== undefined) return;
      startTimer(Math.max(800, toastRemaining.current));
    },
  };
}
