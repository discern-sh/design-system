/**
 * The chart forms this library refuses, each with its practical remedy.
 *
 * The kind library is a closed canonical set: a misleading form does not
 * become a kind, it becomes guidance. This table is the single source the
 * generated author guide renders, so the refusals reach authors through
 * codegen rather than hand-edited prose.
 *
 * @module
 */

/** One refused chart form and the practical author action replacing it. */
export interface ChartRefusedForm {
  /** The requested form, named the way authors ask for it. */
  readonly form: string;
  /** The honest author action: an alternative, or the refusal's reason. */
  readonly remedy: string;
}

/** Every refused form the generated author guide names, in guide order. */
export const CHART_REFUSED_FORMS: readonly ChartRefusedForm[] = Object.freeze([
  Object.freeze({
    form: "Pie and donut charts",
    remedy: "Author the bar kind's proportion variant instead.",
  }),
  Object.freeze({
    form: "Radar charts",
    remedy: "Refused: axes at arbitrary angles cannot be read honestly.",
  }),
  Object.freeze({
    form: "Gauges",
    remedy: "Use the Meter Component, which owns the capacity posture.",
  }),
  Object.freeze({
    form: "Bubble charts",
    remedy: "Refused: area encoding misstates magnitude.",
  }),
  Object.freeze({
    form: "Dual value axes",
    remedy: "Author two figures, or index both series to a common base.",
  }),
  Object.freeze({
    form: "Stacked areas",
    remedy: "Author small multiples, or present the table.",
  }),
  Object.freeze({
    form: "3D charts",
    remedy: "Refused: projected depth distorts every comparison.",
  }),
  Object.freeze({
    form: "Streaming or animated charts",
    remedy: "Refused: the chart library is static by decision.",
  }),
]);
