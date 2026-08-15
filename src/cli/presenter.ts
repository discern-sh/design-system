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
import type { CliRenderer } from "./contracts.ts";
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
import type { TerminalThemeVariant } from "./theme.ts";
import {
  renderTriangleSectionRule,
  renderTriangleSpinnerFrame,
  renderTriangleWorkflowStepper,
  type TriangleSectionRuleOptions,
  type TriangleThemeOptions,
  type TriangleWorkflowOptions,
  type TriangleWorkflowStep,
} from "./triangles.ts";

/** Presentation defaults a presenter binds once for every later call. */
export interface CliPresenterOptions {
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
  /**
   * Render one pure renderer with the bound capabilities and theme. Props
   * you pass win over the bound defaults, so per-call overrides stay
   * ordinary props; the result is byte-equal to calling the renderer by
   * hand with the same resolved inputs.
   */
  present<Props extends { readonly theme?: TerminalThemeVariant }>(
    renderer: CliRenderer<Props>,
    props: Readonly<Props>,
  ): string;
  /** Render a box through the bound capabilities; see {@linkcode renderBox}. */
  box(options: TerminalBoxOptions): string;
  /**
   * Render one triangle spinner frame through the bound theme and capabilities;
   * see {@linkcode renderTriangleSpinnerFrame}.
   */
  triangleSpinnerFrame(
    phase: number,
    options?: TriangleThemeOptions,
  ): string;
  /**
   * Render a triangle section rule through the bound theme and capabilities;
   * see {@linkcode renderTriangleSectionRule}.
   */
  triangleSectionRule(
    label: string,
    options: TriangleSectionRuleOptions,
  ): string;
  /**
   * Render a triangle workflow stepper through the bound theme and capabilities;
   * see {@linkcode renderTriangleWorkflowStepper}.
   */
  triangleWorkflowStepper(
    steps: readonly TriangleWorkflowStep[],
    options?: TriangleWorkflowOptions,
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
  const present = <Props extends { readonly theme?: TerminalThemeVariant }>(
    renderer: CliRenderer<Props>,
    props: Readonly<Props>,
  ): string => renderer({ theme, ...props } as Readonly<Props>, effective);
  const line =
    (renderer: CliRenderer<NarrationLineProps>) =>
    (text: string, overrides: CliPresenterLineOptions = {}): string =>
      present(renderer, { ...overrides, text });
  return {
    capabilities: effective,
    theme,
    present,
    box(options: TerminalBoxOptions): string {
      return renderBox(options, effective);
    },
    triangleSpinnerFrame(
      phase: number,
      overrides: TriangleThemeOptions = {},
    ): string {
      return renderTriangleSpinnerFrame(phase, effective, {
        theme,
        ...overrides,
      });
    },
    triangleSectionRule(
      label: string,
      overrides: TriangleSectionRuleOptions,
    ): string {
      return renderTriangleSectionRule(
        label,
        { theme, ...overrides },
        effective,
      );
    },
    triangleWorkflowStepper(
      steps: readonly TriangleWorkflowStep[],
      overrides: TriangleWorkflowOptions = {},
    ): string {
      return renderTriangleWorkflowStepper(steps, effective, {
        theme,
        ...overrides,
      });
    },
    with(overrides: CliPresenterOptions): CliPresenter {
      return createCliPresenter(capabilities, {
        theme,
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
