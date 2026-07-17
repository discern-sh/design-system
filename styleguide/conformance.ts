/** A catalogue element found either by CSS selector or accessible role. */
export type ConformanceTarget =
  | {
    readonly selector: string;
    readonly role?: never;
    readonly name?: never;
  }
  | {
    readonly role: string;
    readonly name?: string;
    readonly selector?: never;
  };

/** One serializable browser action or observable assertion. */
export type ConformanceStep =
  | {
    readonly action: "click" | "focus" | "hover";
    readonly target: ConformanceTarget;
  }
  | {
    readonly action: "press";
    readonly key: string;
    readonly target?: ConformanceTarget;
  }
  | {
    readonly expect: "visible" | "hidden" | "focused";
    readonly target: ConformanceTarget;
  }
  | {
    readonly expect: "attribute";
    readonly target: ConformanceTarget;
    readonly attribute: string;
    readonly value: string;
  }
  | {
    readonly expect: "describes";
    readonly target: ConformanceTarget;
    readonly description: ConformanceTarget;
  };

/** A browser path exported beside one component's catalogue example. */
export interface ConformanceScenario {
  readonly name: string;
  readonly steps: readonly ConformanceStep[];
}
