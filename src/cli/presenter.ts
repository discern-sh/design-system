/**
 * The bound presenter: the package's default way to render its terminal
 * surface. Construct one with {@linkcode TerminalCapabilities} plus
 * presentation defaults — theme variant and default frame width — and every
 * later render call takes just a renderer and its props; the presenter
 * supplies everything else. A presenter is a pure value: construction reads
 * nothing, holds no mutable state, and performs no I/O, so binding is
 * partial application, not a session.
 *
 * The raw `(props, capabilities)` renderer form remains the escape hatch for
 * callers that thread capabilities themselves; a bound call is byte-equal to
 * the same call made by hand.
 *
 * @module
 */

import type { TerminalCapabilities } from "./capabilities.ts";
import { renderBox, type TerminalBoxOptions } from "./box.ts";
import type { CliPresentationOptions, CliRenderer } from "./contracts.ts";
import {
  type NarrationLineProps,
  renderFailureLine,
  renderLeadLine,
  renderNoteLine,
  renderSuccessLine,
  renderWarningLine,
  type SemanticTextOptions,
  styleSemanticText,
} from "./narration.ts";
import {
  DISCERN_TERMINAL_MOTIF,
  type TerminalMotif,
  terminalMotifRepertoire,
} from "./motif.ts";
import type { TerminalThemeVariant } from "./theme.ts";
import {
  type MotifSectionRuleOptions,
  type MotifThemeOptions,
  type MotifWorkflowOptions,
  type MotifWorkflowStep,
  renderMotifSectionRule,
  renderMotifSpinnerFrame,
  renderMotifWorkflowStepper,
} from "./motifs.ts";

/** Presentation defaults a presenter binds once for every later call. */
export interface CliPresenterOptions extends CliPresentationOptions {
  /** Theme variant supplied to every renderer; defaults to `"dark"`. */
  readonly theme?: TerminalThemeVariant;
  /**
   * Default frame width in character cells. Bound calls receive effective
   * capabilities whose columns are the narrower of this width and the real
   * terminal, so width-defaulting renderers bound themselves to it while a
   * narrower explicit `width`/`maxWidth` prop still wins per call.
   */
  readonly width?: number;
}

/** Per-line overrides accepted by the presenter's narration verbs. */
export type CliPresenterLineOptions = Omit<NarrationLineProps, "text">;

/** A pure render binding over one terminal's capabilities and defaults. */
export interface CliPresenter {
  /** The effective capabilities every bound call receives. */
  readonly capabilities: TerminalCapabilities;
  /** The bound theme variant injected wherever props leave it unset. */
  readonly theme: TerminalThemeVariant;
  /** The bound motif injected wherever props leave it unset. */
  readonly motif: TerminalMotif;
  /**
   * Render one pure renderer with the bound capabilities and theme. Props
   * you pass win over the bound defaults, so per-call overrides stay
   * ordinary props; the result is byte-equal to calling the renderer by
   * hand with the same resolved inputs.
   */
  present<Props extends CliPresentationOptions>(
    renderer: CliRenderer<Props>,
    props: Readonly<Props>,
  ): string;
  /** Render a box through the bound capabilities; see {@linkcode renderBox}. */
  box(options: TerminalBoxOptions): string;
  /**
   * Render one motif spinner frame through the bound defaults and capabilities;
   * see {@linkcode renderMotifSpinnerFrame}.
   */
  motifSpinnerFrame(
    phase: number,
    options?: MotifThemeOptions,
  ): string;
  /**
   * Render a motif section rule through the bound defaults and capabilities;
   * see {@linkcode renderMotifSectionRule}.
   */
  motifSectionRule(
    label: string,
    options: MotifSectionRuleOptions,
  ): string;
  /**
   * Render a motif workflow stepper through the bound defaults and capabilities;
   * see {@linkcode renderMotifWorkflowStepper}.
   */
  motifWorkflowStepper(
    steps: readonly MotifWorkflowStep[],
    options?: MotifWorkflowOptions,
  ): string;
  /** Derive a presenter with some defaults replaced; this one is untouched. */
  with(overrides: CliPresenterOptions): CliPresenter;
  /** Render one bound success line; see {@linkcode renderSuccessLine}. */
  success(text: string, options?: CliPresenterLineOptions): string;
  /** Render one bound informational note; see {@linkcode renderNoteLine}. */
  note(text: string, options?: CliPresenterLineOptions): string;
  /** Render one bound warning line; see {@linkcode renderWarningLine}. */
  warning(text: string, options?: CliPresenterLineOptions): string;
  /** Render one bound failure line; see {@linkcode renderFailureLine}. */
  failure(text: string, options?: CliPresenterLineOptions): string;
  /** Render one bound lead-in line; see {@linkcode renderLeadLine}. */
  lead(text: string, options?: CliPresenterLineOptions): string;
  /** Style inline text by role and tone through the bound theme. */
  style(text: string, options?: SemanticTextOptions): string;
}

/**
 * Bind terminal capabilities and presentation defaults into a
 * {@linkcode CliPresenter}. Construction only validates and derives — it
 * performs no environment reads and no I/O — and the returned value renders
 * identically for its whole life.
 */
export function createCliPresenter(
  capabilities: TerminalCapabilities,
  options: CliPresenterOptions = {},
): CliPresenter {
  const theme = options.theme ?? "dark";
  if (theme !== "light" && theme !== "dark") {
    throw new TypeError(`unknown terminal theme variant ${theme}`);
  }
  const width = options.width;
  if (width !== undefined && (!Number.isSafeInteger(width) || width < 1)) {
    throw new TypeError(
      `presenter width must be a positive safe integer; received ${width}`,
    );
  }
  const effective = width === undefined || width >= capabilities.columns
    ? capabilities
    : { ...capabilities, columns: width };
  const motif = options.motif ?? DISCERN_TERMINAL_MOTIF;
  terminalMotifRepertoire(motif, true);
  const present = <Props extends CliPresentationOptions>(
    renderer: CliRenderer<Props>,
    props: Readonly<Props>,
  ): string =>
    renderer({ theme, motif, ...props } as Readonly<Props>, effective);
  const line =
    (renderer: CliRenderer<NarrationLineProps>) =>
    (text: string, overrides: CliPresenterLineOptions = {}): string =>
      present(renderer, { ...overrides, text });
  return {
    capabilities: effective,
    theme,
    motif,
    present,
    box(options: TerminalBoxOptions): string {
      return renderBox(options, effective);
    },
    motifSpinnerFrame(
      phase: number,
      overrides: MotifThemeOptions = {},
    ): string {
      return renderMotifSpinnerFrame(phase, effective, {
        theme,
        motif,
        ...overrides,
      });
    },
    motifSectionRule(
      label: string,
      overrides: MotifSectionRuleOptions,
    ): string {
      return renderMotifSectionRule(
        label,
        { theme, motif, ...overrides },
        effective,
      );
    },
    motifWorkflowStepper(
      steps: readonly MotifWorkflowStep[],
      overrides: MotifWorkflowOptions = {},
    ): string {
      return renderMotifWorkflowStepper(steps, effective, {
        theme,
        motif,
        ...overrides,
      });
    },
    with(overrides: CliPresenterOptions): CliPresenter {
      return createCliPresenter(capabilities, {
        theme,
        motif,
        ...(width === undefined ? {} : { width }),
        ...overrides,
      });
    },
    success: line(renderSuccessLine),
    note: line(renderNoteLine),
    warning: line(renderWarningLine),
    failure: line(renderFailureLine),
    lead: line(renderLeadLine),
    style(text: string, overrides: SemanticTextOptions = {}): string {
      return styleSemanticText(text, { theme, ...overrides }, effective);
    },
  };
}
