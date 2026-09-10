/**
 * Report every finding for one chart spec in a single pass.
 *
 * Rendering stops at the first refusal, which suits a build but not an
 * author iterating on labels. {@linkcode checkChart} runs the same
 * validation, layout, and conformance the projections use, records every
 * budget refusal instead of stopping at the first, and returns them with
 * the one structural or layout refusal, if any, that did end the run.
 *
 * @module
 */

import { collectKindFindings } from "../internal/findings.ts";
import { prepareChart } from "../generated/chart-dispatch.ts";
import {
  type ChartErrorCode,
  type ChartErrorFact,
  ChartValidationError,
} from "./errors.ts";

/** One refusal an author can act on, with the path and remedy attached. */
export interface ChartFinding {
  readonly code: ChartErrorCode;
  readonly message: string;
  /** Where in the spec the refusal points, when the check knows. */
  readonly path?: string;
  readonly facts: Readonly<Record<string, ChartErrorFact>>;
  readonly remedy: string;
}

/** The complete result of checking one spec. */
export interface ChartCheckResult {
  /** True when the spec validates, lays out, and conforms with no finding. */
  readonly ok: boolean;
  /** Every budget refusal, then the refusal that ended the run, if any. */
  readonly findings: readonly ChartFinding[];
}

function finding(error: ChartValidationError): ChartFinding {
  const base = {
    code: error.code,
    message: error.message,
    facts: error.facts,
    remedy: error.remedy,
  };
  return error.path === undefined ? base : { ...base, path: error.path };
}

/**
 * Check one spec and return every finding. Budget refusals are collected
 * across validation and layout; a structural, layout, or conformance
 * refusal ends the run and is reported last. Anything that is not a chart
 * refusal is rethrown unchanged.
 */
export function checkChart(spec: unknown): ChartCheckResult {
  const collected = collectKindFindings(() => prepareChart(spec));
  const findings = collected.findings.filter((
    error,
  ): error is ChartValidationError => error instanceof ChartValidationError)
    .map(finding);
  if (collected.failure !== undefined) {
    if (!(collected.failure instanceof ChartValidationError)) {
      throw collected.failure;
    }
    findings.push(finding(collected.failure));
  }
  return { ok: findings.length === 0, findings };
}
