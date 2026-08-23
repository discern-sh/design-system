/** Canonical exact bytes for the compact standalone light SVG. */
export const compactFlowLightSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" class="discern-diagram discern-diagram--standalone" viewBox="0 0 562.58 112" width="562.58" height="112" role="img" aria-label="Publish reference material: Authoring, checking, and publication progress from left to right.">
  <title>Publish reference material</title>
  <desc>Title: Publish reference material&#10;Summary: Authoring, checking, and publication progress from left to right.&#10;Direction: left to right&#10;Nodes:&#10;1. start author: Author source&#10;2. step check: Run checks&#10;3. end publish: Publish reference&#10;Relationships:&#10;1. primary progression ready: author to check&#10;2. primary progression green: check to publish</desc>
  <style>
  .discern-diagram { display: block; background: transparent; shape-rendering: geometricPrecision; text-rendering: optimizeLegibility; }
  .discern-diagram__text { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .discern-diagram__text--quiet-annotation { font-family: ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace; }
  .discern-diagram__node, .discern-diagram__node-cue { stroke-width: 2; vector-effect: non-scaling-stroke; }
  .discern-diagram__connector { fill: none; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
  .discern-diagram__canvas { fill: oklch(98.97% 0.0028 80.72); }
  .discern-diagram__node--ordinary { fill: #fff; stroke: oklch(81% 0.016 80.72); }
  .discern-diagram__node--decision { fill: #fff; stroke: oklch(61% 0.185 255); }
  .discern-diagram__node--start { fill: #fff; stroke: oklch(44% 0.185 255); }
  .discern-diagram__node--end { fill: #fff; stroke: oklch(64% 0.165 152); }
  .discern-diagram__node--focus { fill: #fff; stroke: oklch(61% 0.185 255); }
  .discern-diagram__node--success { fill: #fff; stroke: oklch(64% 0.165 152); }
  .discern-diagram__node--warning { fill: #fff; stroke: oklch(61% 0.14 74); }
  .discern-diagram__node-cue { fill: none; }
  .discern-diagram__text--node-text { fill: oklch(24% 0.03 285); }
  .discern-diagram__text--quiet-annotation, .discern-diagram__text--connector-label { fill: oklch(40% 0.026 285); }
  .discern-diagram__connector--primary { stroke: oklch(40% 0.026 285); }
  .discern-diagram__arrowhead--primary { fill: oklch(40% 0.026 285); }
  .discern-diagram__connector--secondary { stroke: oklch(53% 0.02 285); stroke-dasharray: 8 6; }
  .discern-diagram__arrowhead--secondary { fill: oklch(53% 0.02 285); }
  .discern-diagram__connector--return { stroke: oklch(44% 0.185 255); stroke-dasharray: 2 6; }
  .discern-diagram__arrowhead--return { fill: oklch(44% 0.185 255); }
  </style>
  <rect class="discern-diagram__canvas" x="0" y="0" width="562.58" height="112" />
  <g class="discern-diagram__group" data-discern-diagram-group="edge-ready-group">
    <g class="discern-diagram__relationship" data-discern-diagram-relationship="ready">
      <polyline class="discern-diagram__connector discern-diagram__connector--primary" points="193.77,56 211.77,56 219.77,56" stroke-width="2" />
      <polygon class="discern-diagram__arrowhead discern-diagram__arrowhead--primary" points="229.77,56 219.77,61 219.77,51" />
    </g>
  </g>
  <g class="discern-diagram__group" data-discern-diagram-group="edge-green-group">
    <g class="discern-diagram__relationship" data-discern-diagram-relationship="green">
      <polyline class="discern-diagram__connector discern-diagram__connector--primary" points="375.54,56 393.54,56 401.54,56" stroke-width="2" />
      <polygon class="discern-diagram__arrowhead discern-diagram__arrowhead--primary" points="411.54,56 401.54,61 401.54,51" />
    </g>
  </g>
  <g class="discern-diagram__group" data-discern-diagram-group="node-author-group">
    <rect class="discern-diagram__node discern-diagram__node--start" x="24" y="28" width="169.77" height="56" rx="28" />
    <text class="discern-diagram__text discern-diagram__text--node-text" data-discern-diagram-owner="author" font-size="16" text-anchor="middle"><tspan x="108.89" y="62">Author source</tspan></text>
  </g>
  <g class="discern-diagram__group" data-discern-diagram-group="node-check-group">
    <rect class="discern-diagram__node discern-diagram__node--ordinary" x="229.77" y="28" width="145.77" height="56" rx="8" />
    <text class="discern-diagram__text discern-diagram__text--node-text" data-discern-diagram-owner="check" font-size="16" text-anchor="middle"><tspan x="302.66" y="62">Run checks</tspan></text>
  </g>
  <g class="discern-diagram__group" data-discern-diagram-group="node-publish-group">
    <rect class="discern-diagram__node discern-diagram__node--end" x="411.54" y="24" width="127.04" height="64" rx="32" />
    <rect class="discern-diagram__node-cue discern-diagram__node--end" x="415.54" y="28" width="119.04" height="56" rx="28" />
    <text class="discern-diagram__text discern-diagram__text--node-text" data-discern-diagram-owner="publish" font-size="16" text-anchor="middle"><tspan x="475.07" y="52">Publish</tspan><tspan x="475.06" y="72">reference</tspan></text>
  </g>
</svg>
`;
