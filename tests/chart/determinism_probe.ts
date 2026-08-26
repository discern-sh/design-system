import { renderChartCli } from "../../src/cli/mod.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import {
  chartAltText,
  describeChart,
  renderChartSvg,
} from "../../src/chart/mod.ts";
import { prepareChart } from "../../src/generated/chart-dispatch.ts";
import { chartKindRegistry } from "../../src/generated/chart-registry.ts";
import type { ChartSpec } from "../../src/generated/chart-spec.ts";

const profiles = [
  testTerminalCapabilities({
    colorDepth: "truecolor",
    columns: 96,
    unicode: true,
  }),
  testTerminalCapabilities({
    colorDepth: "none",
    columns: 80,
    unicode: false,
  }),
] as const;

const evidence = chartKindRegistry.flatMap(({ meta, releaseCorpus }) =>
  releaseCorpus.cases.map((releaseCase) => {
    const spec = releaseCase.spec as ChartSpec;
    return {
      id: `${meta.slug}/${releaseCase.name}`,
      alt: chartAltText(spec),
      description: describeChart(spec),
      scene: prepareChart(spec).scene,
      svg: renderChartSvg(spec, { theme: "adaptive" }),
      cli: profiles.map((capabilities) =>
        renderChartCli(
          { spec, maxWidth: capabilities.columns, theme: "dark" },
          capabilities,
        )
      ),
    };
  })
);

await Deno.stdout.write(new TextEncoder().encode(JSON.stringify(evidence)));
