import { packageManifest } from "../../src/manifest.ts";
import {
  emitDesignSystemRuntime,
  type RuntimeOptions,
} from "../../src/runtime.ts";
import type { RuntimeManifest } from "../../src/manifest.ts";

const textEncoder = new TextEncoder();

const metricNames = [
  "minimal_docs_css_bytes",
  "workflow_css_bytes",
  "marketing_css_bytes",
  "behavior_script_bytes",
  "font_transfer_bytes",
  "grain_transfer_bytes",
] as const;

type MetricName = (typeof metricNames)[number];

interface MetricProfile {
  readonly selection: Omit<RuntimeOptions, "outputRoot">;
  readonly files: (path: string) => boolean;
}

const cssFile = (path: string): boolean => path === "discern.css";

const behaviorComponents = packageManifest.components
  .filter(({ behaviors }) => behaviors.length > 0)
  .map(({ id }) => id);

const profiles = {
  minimal_docs_css_bytes: {
    selection: {
      components: [
        "docs-header",
        "docs-nav",
        "anchor-heading",
        "prose",
        "code-listing",
        "pager",
      ],
    },
    files: cssFile,
  },
  workflow_css_bytes: {
    selection: { groups: ["Workflow"] },
    files: cssFile,
  },
  marketing_css_bytes: {
    selection: { groups: ["Marketing"] },
    files: cssFile,
  },
  behavior_script_bytes: {
    selection: { components: behaviorComponents },
    files: (path) => path === "discern.js",
  },
  font_transfer_bytes: {
    selection: { components: ["button"], assets: ["fonts"] },
    files: (path) => path === "fonts.css" || path.endsWith(".woff2"),
  },
  grain_transfer_bytes: {
    selection: { components: ["button"], assets: ["grain"] },
    files: (path) => path === "grain.css" || path.startsWith("textures/"),
  },
} as const satisfies Readonly<Record<MetricName, MetricProfile>>;

function isMetricName(value: string): value is MetricName {
  return metricNames.some((candidate) => candidate === value);
}

function measuredBytes(
  manifest: RuntimeManifest,
  include: (path: string) => boolean,
): number {
  return manifest.integrity.files
    .filter(({ path }) => include(path))
    .reduce((total, { bytes }) => total + bytes, 0);
}

async function measure(name: MetricName): Promise<number> {
  const outputRoot = await Deno.makeTempDir();
  try {
    const profile = profiles[name];
    const summary = await emitDesignSystemRuntime({
      outputRoot: new URL("runtime/", new URL(`file://${outputRoot}/`)),
      ...profile.selection,
    });
    const value = measuredBytes(summary.manifest, profile.files);
    if (value === 0) {
      throw new Error(`${name} selected no measured output files`);
    }
    return value;
  } finally {
    await Deno.remove(outputRoot, { recursive: true });
  }
}

if (import.meta.main) {
  const requested = Deno.args[0] ?? "";
  if (!isMetricName(requested) || Deno.args.length !== 1) {
    throw new TypeError(
      `Choose one runtime metric: ${metricNames.join(", ")}`,
    );
  }
  const value = await measure(requested);
  const line = `DISCERN_METRIC ${requested} ${value}\n`;
  await Deno.stdout.write(textEncoder.encode(line));
}
