import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  renderAudienceGridCli,
  renderCaseStudyCli,
  renderComparisonTableCli,
  renderCtaBandCli,
  renderFaqBlockCli,
  renderHeroBlockCli,
  renderLogoCloudCli,
  renderMetricsBandCli,
  renderProcessStepsCli,
  renderTestimonialCli,
} from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

interface WidthProps {
  readonly width?: number;
}

type Renderer<Props> = (
  props: Readonly<Props>,
  capabilities: TerminalCapabilities,
) => string;

function withWidth<Props extends WidthProps>(
  props: Readonly<Props>,
  width: number,
): Props {
  return { ...props, width } as Props;
}

function assertMarketingMatrix<Props extends WidthProps>(
  render: Renderer<Props>,
  props: Readonly<Props>,
  frames: readonly [string, string, string],
  ascii: string,
): void {
  for (const [index, columns] of [16, 36, 64].entries()) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      render(withWidth(props, columns), capabilities),
      frames[index] ?? "",
      capabilities,
    );
  }
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testTerminalCapabilities({ colorDepth, columns: 36 });
    assertStyledFrame(
      render(withWidth(props, 36), capabilities),
      frames[1],
      capabilities,
    );
  }
  const capabilities = testTerminalCapabilities({
    columns: 36,
    unicode: false,
  });
  assertExactFrame(
    render(withWidth(props, 36), capabilities),
    ascii,
    capabilities,
  );
}

Deno.test("Audience grid renders exact adaptive card layouts", () => {
  assertMarketingMatrix(
    renderAudienceGridCli,
    {
      title: "For teams",
      items: [
        { title: "Builders", description: "Ship clearly." },
        { title: "Reviewers", description: "See proof.", featured: true },
      ],
    },
    [
      "For teams\n\n01. Builders\nShip clearly.\n\n02. Reviewers ★\nSee proof.",
      "For teams\n\n01. Builders\nShip clearly.\n\n02. Reviewers ★\nSee proof.",
      "For teams\n\n01. Builders                     02. Reviewers ★\nShip clearly.                    See proof.",
    ],
    "For teams\n\n01. Builders\nShip clearly.\n\n02. Reviewers *\nSee proof.",
  );
});

Deno.test("Case study renders exact story and metric frames", () => {
  assertMarketingMatrix(
    renderCaseStudyCli,
    {
      title: "Release story",
      summary: "A repeatable path.",
      stats: [
        { value: "42%", label: "less rework" },
        { value: "2 wk", label: "to adoption" },
      ],
    },
    [
      "Release story\n┌ Evidence ────┐\n│ A repeatable │\n│ path.        │\n│              │\n│ 42%          │\n│ less rework  │\n│ 2 wk         │\n│ to adoption  │\n└──────────────┘",
      "Release story\n┌ Evidence ────────────────────────┐\n│ A repeatable path.               │\n│                                  │\n│ 42%                              │\n│ less rework                      │\n│ 2 wk                             │\n│ to adoption                      │\n└──────────────────────────────────┘",
      "Release story\n┌ Evidence ────────────────────────────────────────────────────┐\n│ A repeatable path.                                           │\n│                                                              │\n│ 42%                             2 wk                         │\n│ less rework                     to adoption                  │\n└──────────────────────────────────────────────────────────────┘",
    ],
    "Release story\n+ Evidence ------------------------+\n| A repeatable path.               |\n|                                  |\n| 42%                              |\n| less rework                      |\n| 2 wk                             |\n| to adoption                      |\n+----------------------------------+",
  );
});

Deno.test("Comparison table renders exact stacked and tabular treatments", () => {
  assertMarketingMatrix(
    renderComparisonTableCli,
    {
      title: "Compare",
      firstLabel: "Manual",
      secondLabel: "Discern",
      rows: [{ feature: "Evidence", first: "Ad hoc", second: "Attached" }],
    },
    [
      "Compare\n\nEvidence\nManual: Ad hoc\nDiscern*:\nAttached",
      "Compare\n\nEvidence\nManual: Ad hoc\nDiscern*: Attached",
      "Compare\n\nCapability            Manual                Discern *\n─────────────────────────────────────────────────────\nEvidence              Ad hoc                Attached",
    ],
    "Compare\n\nEvidence\nManual: Ad hoc\nDiscern*: Attached",
  );
});

Deno.test("CTA band renders exact boxed calls to action", () => {
  assertMarketingMatrix(
    renderCtaBandCli,
    { title: "Start now", description: "Ship with proof.", actions: ["Begin"] },
    [
      "┌ Call to a… ──┐\n│ Start now    │\n│              │\n│ Ship with    │\n│ proof.       │\n│              │\n│ [Begin]      │\n└──────────────┘",
      "┌ Call to action ──────────────────┐\n│ Start now                        │\n│                                  │\n│ Ship with proof.                 │\n│                                  │\n│ [Begin]                          │\n└──────────────────────────────────┘",
      "┌ Call to action ──────────────────────────────────────────────┐\n│ Start now                                                    │\n│                                                              │\n│ Ship with proof.                                             │\n│                                                              │\n│ [Begin]                                                      │\n└──────────────────────────────────────────────────────────────┘",
    ],
    "+ Call to action ------------------+\n| Start now                        |\n|                                  |\n| Ship with proof.                 |\n|                                  |\n| [Begin]                          |\n+----------------------------------+",
  );
});

Deno.test("FAQ block renders exact open and closed disclosure frames", () => {
  assertMarketingMatrix(
    renderFaqBlockCli,
    {
      title: "Questions",
      items: [
        { question: "Start small?", answer: "Yes, with one workflow." },
        { question: "Expand later?", answer: "Yes." },
      ],
      openIndices: [0],
    },
    [
      "Questions\n\n▾ Start small?\nYes, with one\nworkflow.\n\n▸ Expand later?",
      "Questions\n\n▾ Start small?\nYes, with one workflow.\n\n▸ Expand later?",
      "Questions\n\n▾ Start small?\nYes, with one workflow.\n\n▸ Expand later?",
    ],
    "Questions\n\nv Start small?\nYes, with one workflow.\n\n> Expand later?",
  );
});

Deno.test("Hero block renders exact motif title banners", () => {
  assertMarketingMatrix(
    renderHeroBlockCli,
    {
      eyebrow: "New",
      title: "Build clearly",
      description: "Keep the proof.",
      actions: ["Begin"],
    },
    [
      "◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨\n┌ Hero ────────┐\n│ New          │\n│              │\n│ Build        │\n│ clearly      │\n│              │\n│ Keep the     │\n│ proof.       │\n│              │\n│ [Begin]      │\n└──────────────┘",
      "◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨\n┌ Hero ────────────────────────────┐\n│ New                              │\n│                                  │\n│ Build clearly                    │\n│                                  │\n│ Keep the proof.                  │\n│                                  │\n│ [Begin]                          │\n└──────────────────────────────────┘",
      "◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨\n┌ Hero ────────────────────────────────────────────────────────┐\n│ New                                                          │\n│                                                              │\n│ Build clearly                                                │\n│                                                              │\n│ Keep the proof.                                              │\n│                                                              │\n│ [Begin]                                                      │\n└──────────────────────────────────────────────────────────────┘",
    ],
    ">v^<>v^<>v^<>v^<>v^<>v^<>v^<>v^<>v^<\n+ Hero ----------------------------+\n| New                              |\n|                                  |\n| Build clearly                    |\n|                                  |\n| Keep the proof.                  |\n|                                  |\n| [Begin]                          |\n+----------------------------------+",
  );
});

Deno.test("Logo cloud renders exact wrapping name rolls", () => {
  assertMarketingMatrix(
    renderLogoCloudCli,
    { label: "Trusted by", items: ["Arc", "North", "Field"] },
    [
      "Trusted by\n◆ Arc  ◆ North\n◆ Field",
      "Trusted by\n◆ Arc  ◆ North  ◆ Field",
      "Trusted by\n◆ Arc  ◆ North  ◆ Field",
    ],
    "Trusted by\n* Arc  * North  * Field",
  );
});

Deno.test("Metrics band renders exact vertical and row treatments", () => {
  assertMarketingMatrix(
    renderMetricsBandCli,
    {
      title: "Outcomes",
      items: [
        { value: "42%", label: "less rework" },
        { value: "3×", label: "faster review" },
      ],
    },
    [
      "Outcomes\n\n42%\nless rework\n\n3×\nfaster review",
      "Outcomes\n\n42%\nless rework\n\n3×\nfaster review",
      "Outcomes\n\n42%                              3×\nless rework                      faster review",
    ],
    "Outcomes\n\n42%\nless rework\n\n3×\nfaster review",
  );
});

Deno.test("Process steps renders exact canonical stepper and beacon frames", () => {
  assertMarketingMatrix(
    renderProcessStepsCli,
    {
      kind: "sequential-form",
      label: "Release path",
      lifecycle: { status: "active" },
      sections: [
        { id: "build", label: "Build", status: "complete" },
        { id: "prove", label: "Prove", status: "active" },
        { id: "share", label: "Share", status: "pending" },
      ],
      activePhase: 1,
      beaconPhase: 2,
    },
    [
      "Release path\n\n ◭  Build\n │\n[◂] Prove\n │\n ·  Share\n\n..◭⧨◮⧩..........",
      "Release path\n\n ◭  Build\n │\n[◂] Prove\n │\n ·  Share\n\n..◭⧨◮⧩..............................",
      "Release path\n\n ◭  Build\n │\n[◂] Prove\n │\n ·  Share\n\n..◭⧨◮⧩..........................................................",
    ],
    "Release path\n\n ^  Build\n |\n[<] Prove\n |\n .  Share\n\n..^<>v..............................",
  );
});

Deno.test("Process steps covers complete, error, cancelled, and pending states", () => {
  const props = {
    kind: "sequential-form" as const,
    label: "Step states",
    lifecycle: { status: "validation-error" as const, message: "Proof failed" },
    sections: [
      { id: "done", label: "Done", status: "complete" as const },
      { id: "fail", label: "Failed", status: "error" as const },
      { id: "stop", label: "Stopped", status: "cancelled" as const },
      { id: "wait", label: "Waiting", status: "pending" as const },
    ],
    activePhase: 0,
    width: 36,
  };
  const unicode = testTerminalCapabilities({ columns: 36 });
  assertExactFrame(
    renderProcessStepsCli(props, unicode),
    "Step states\n\n ◭  Done\n │\n !  Failed\n │\n ×  Stopped\n │\n ·  Waiting\n\n! Proof failed",
    unicode,
  );
  const ascii = testTerminalCapabilities({ columns: 36, unicode: false });
  assertExactFrame(
    renderProcessStepsCli(props, ascii),
    "Step states\n\n ^  Done\n |\n !  Failed\n |\n x  Stopped\n |\n .  Waiting\n\n! Proof failed",
    ascii,
  );
});

Deno.test("Testimonial renders exact attributed quote frames", () => {
  assertMarketingMatrix(
    renderTestimonialCli,
    {
      quote: "Reviews feel calm.",
      author: "A. Reviewer",
      metric: "42%",
      metricLabel: "less rework",
    },
    [
      "┌ Testimoni… ──┐\n│ “Reviews     │\n│ feel calm.”  │\n│              │\n│ — A.         │\n│ Reviewer     │\n│              │\n│ 42%          │\n│ less rework  │\n└──────────────┘",
      "┌ Testimonial ─────────────────────┐\n│ “Reviews feel calm.”             │\n│                                  │\n│ — A. Reviewer                    │\n│                                  │\n│ 42%                              │\n│ less rework                      │\n└──────────────────────────────────┘",
      "┌ Testimonial ─────────────────────────────────────────────────┐\n│ “Reviews feel calm.”                                         │\n│                                                              │\n│ — A. Reviewer                                                │\n│                                                              │\n│ 42%                                                          │\n│ less rework                                                  │\n└──────────────────────────────────────────────────────────────┘",
    ],
    '+ Testimonial ---------------------+\n| "Reviews feel calm."             |\n|                                  |\n| -- A. Reviewer                   |\n|                                  |\n| 42%                              |\n| less rework                      |\n+----------------------------------+',
  );
});
