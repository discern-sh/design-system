import { appearanceContrastMargin } from "../../src/tokens/appearance.ts";

// The `field_contrast_margin` standard keeps its trunk-recorded identity while
// the measurement follows the appearance authority through this stable path.
console.log(
  `DISCERN_METRIC field_contrast_margin ${appearanceContrastMargin()}`,
);
