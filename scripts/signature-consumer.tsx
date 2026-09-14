/** Minimal build-time consumer of the public runtime and React adapter; no Catalogue styles or hydration. */
import { renderToStaticMarkup } from "react-dom/server";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import {
  Button,
  Card,
  Grid,
  HeroBlock,
  Icon,
  LightBackdrop,
  MarketingIntro,
  MarketingSection,
  SegmentedControl,
  Stack,
} from "../src/react.ts";
import {
  filledShieldSvg,
  outlinedCompassSvg,
} from "../src/fixtures/imported-icons.ts";

/** Emit a standalone consumer preview into a dedicated directory. */
export async function buildSignatureConsumer(outputRoot: URL): Promise<void> {
  await emitDesignSystemRuntime({
    outputRoot,
    components: [
      "button",
      "card",
      "grid",
      "hero-block",
      "icon",
      "light-backdrop",
      "marketing-intro",
      "marketing-section",
      "segmented-control",
      "stack",
    ],
    assets: ["fonts"],
    appearanceScopes: true,
  });
  for (const theme of ["light", "dark"] as const) {
    const page = renderToStaticMarkup(
      <html lang="en" data-discern-root data-discern-theme={theme}>
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Quiet Instrument · package consumer</title>
          <link rel="stylesheet" href="./discern.css" />
          <link rel="stylesheet" href="./fonts.css" />
          <style>
            {`.consumer-controls { padding:var(--discern-space-5); font-family:var(--discern-font-ui); }
          #ambient:not(:checked) ~ main .discern-light-backdrop__light { animation:none; }
          main { display:block; }
          .consumer-controls a { margin-inline-start:var(--discern-space-5); }`}
          </style>
        </head>
        <body>
          <div className="consumer-controls">
            Public package consumer ·{" "}
            <a href={theme === "light" ? "./dark.html" : "./index.html"}>
              Switch to {theme === "light" ? "dark" : "light"}
            </a>
          </div>
          <input type="checkbox" id="ambient" />
          <label htmlFor="ambient">Allow ambient motion</label>
          <main>
            <HeroBlock
              layout="statement"
              eyebrow="A shared project workspace"
              title="Good work starts with a clear next step."
              description="Keep a short plan, its context, and a clear place to pick up again."
              actions={
                <Button href="#project-view">Explore the project view</Button>
              }
              backdrop={<LightBackdrop motion="ambient" />}
              visual={
                <Grid minimum="14rem" gap={8}>
                  {[[outlinedCompassSvg, "Find your bearings"], [
                    filledShieldSvg,
                    "Move forward with confidence",
                  ]].map(([svg, title]) => (
                    <div key={title}>
                      <Icon
                        size="4rem"
                        fit="contain"
                        relief
                        dangerouslySetInnerHTML={{ __html: svg! }}
                      >
                        {null}
                      </Icon>
                      <p>{title}</p>
                    </div>
                  ))}
                </Grid>
              }
            />
            <MarketingSection
              spacing="compact"
              surface="sunken"
              id="project-view"
            >
              <MarketingIntro
                title="A useful place to pick up."
                description="Choose a view, keep a note, and return when you are ready."
              />
              <Grid minimum="18rem" gap={6}>
                <Card texture="shaded" raised>
                  <Stack gap={5}>
                    <h3>Your next step</h3>
                    <SegmentedControl
                      name="view"
                      label="Project view"
                      defaultValue="plan"
                      items={[{ value: "plan", label: "Plan" }, {
                        value: "details",
                        label: "Details",
                      }]}
                    />
                    <details>
                      <summary>Read the supporting notes</summary>
                      <p>
                        Name the decision and keep its reasons beside the work.
                      </p>
                    </details>
                    <Button variant="secondary" href="#next">
                      Continue to the next step
                    </Button>
                  </Stack>
                </Card>
                <Card id="next">
                  <h3>Keep the context close</h3>
                  <p>
                    The ordinary flat surface uses the same hierarchy and
                    controls. Material treatments are selected locally.
                  </p>
                </Card>
              </Grid>
            </MarketingSection>
          </main>
        </body>
      </html>,
    );
    await Deno.writeTextFile(
      new URL(theme === "light" ? "index.html" : "dark.html", outputRoot),
      `<!doctype html>${page}`,
    );
  }
}

if (import.meta.main) {
  const outputRoot = new URL("../dist/signature-consumer/", import.meta.url);
  await buildSignatureConsumer(outputRoot);
  console.log(outputRoot.href);
}
