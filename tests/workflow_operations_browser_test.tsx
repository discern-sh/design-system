import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser } from "../scripts/browser.ts";
import { withViewport } from "../scripts/viewport.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import { browserBehaviorSources } from "../src/generated/behaviors.ts";
import {
  Command,
  Diagnostic,
  Fleet,
  PathReference,
  RawOutput,
  ResultSummary,
  Transcript,
  VerificationReport,
  Worklog,
} from "../src/react.ts";
import {
  denseFleetRows,
  denseTranscriptTurns,
  denseVerificationReport,
  denseWorklogEntries,
} from "../src/components/agents/operational-examples.ts";

Deno.test("operational reading leads from outcome to action to exact keyboard-reachable evidence", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  const paths = [
    "/workspace/compatibility/checkout/alpha/expected-output.json",
    "/workspace/compatibility/checkout/beta/expected-output.json",
    "C:\\workspace\\compatibility\\checkout\\beta\\expected-output.json",
    "artifact-0042-" + "x".repeat(70) + "-beta",
  ];
  const raw = '  alpha: "09:00–17:00"\n\n  beta: null\n';
  const copied = '  {\r\n\t"artifact": "βeta"\r\n}  ';
  const command = 'verify --artifact="checkout β"\n  --exact';
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      groups: ["Workflow", "Agents"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const markup = renderToStaticMarkup(
      <>
        <ResultSummary
          state="failed"
          fact="Two fixture checks failed."
          nextAction="Restore the expected fields, then retry."
          counts={[{ label: "Checks", value: "24" }]}
          machineReadable={copied}
        />
        <Diagnostic
          title="Fixture check failed"
          impact="Publication is blocked."
          correction="Restore the expected fields, then retry."
          path={paths[0]!}
          pathCopyable
          evidence={raw}
          rawDetail={raw}
          reproductionCommand="deno task test:checkout"
          workingDirectory={paths[1]!}
        />
        <Fleet rows={denseFleetRows} />
        <Transcript turns={denseTranscriptTurns} />
        <Worklog entries={denseWorklogEntries} />
        <VerificationReport
          {...denseVerificationReport}
          meta={[...denseVerificationReport.meta, {
            label: "Source",
            value: <a href="#exact-source">Inspect exact source</a>,
          }]}
        />
        <RawOutput label="Fixture output" outcome="2 failures">{raw}</RawOutput>
        {paths.map((path) => <PathReference key={path} path={path} copyable />)}
        <Command
          command={command}
          workingDirectory={paths[2]!}
        />
      </>,
    );
    const page = await browser.newPage();
    for (const width of [390, 1120]) {
      await withViewport(page, { width: 1280, height: 900 }, async () => {
        for (const theme of ["light", "dark"]) {
          await page.setContent(
            `<html data-discern-root data-discern-theme="${theme}"><style>${css}</style><body><main style="width:${width}px">${markup}</main></body></html>`,
          );
          const report = page.locator(".discern-verification-report");
          const summary = report.locator("details > summary");
          assertEquals(
            await report.locator(".discern-verification-report__checks")
              .isVisible(),
            false,
          );
          assertStringIncludes(await summary.innerText(), "24 checks");
          assertStringIncludes(await summary.innerText(), "2 failed");
          assertStringIncludes(
            await report.innerText(),
            "Restore the alpha and beta expected fields",
          );
          await summary.focus();
          await summary.press("Enter");
          await summary.press("Tab");
          assertEquals(
            await report.getByRole("link").evaluate((node) =>
              node === document.activeElement
            ),
            true,
          );
          assertEquals(
            await report.locator(".discern-verification-report__checks > div")
              .count(),
            24,
          );
          assertStringIncludes(
            await report.innerText(),
            "fixtures/checkout/alpha/expected.json",
          );
          assertStringIncludes(
            await report.innerText(),
            "fixtures/checkout/beta/expected.json",
          );
          const evidence = page.locator(".discern-diagnostic__evidence");
          await evidence.locator("summary").focus();
          await evidence.locator("summary").press("Enter");
          await evidence.locator("summary").press("Tab");
          assertEquals(
            await evidence.locator("pre").evaluate((node) =>
              node === document.activeElement
            ),
            true,
          );
          assertEquals(await evidence.locator("code").textContent(), raw);
          const facts = await page.locator("main").evaluate((root) => {
            const before = (first: string, second: string) =>
              Boolean(
                root.querySelector(first)!.compareDocumentPosition(
                  root.querySelector(second)!,
                ) & Node.DOCUMENT_POSITION_FOLLOWING,
              );
            const contained = [
              ...root.querySelectorAll<HTMLElement>(
                ".discern-path-reference__path, .discern-fleet__branch, .discern-command__context code, .discern-verification-report__checks dd",
              ),
            ];
            return {
              nextBeforeReadings: before(
                ".discern-result-summary__next",
                ".discern-result-summary__readings",
              ),
              correctionBeforeEvidence: before(
                ".discern-diagnostic__correction",
                ".discern-diagnostic__evidence",
              ),
              reportActionBeforeEvidence: before(
                ".discern-verification-report__next",
                ".discern-verification-report__evidence",
              ),
              overflow: contained.filter((node) =>
                node.scrollWidth > node.clientWidth + 1
              ).map((node) => node.className || node.textContent),
              pageOverflow: root.scrollWidth > root.clientWidth + 1,
            };
          });
          assert(
            facts.nextBeforeReadings && facts.correctionBeforeEvidence &&
              facts.reportActionBeforeEvidence,
          );
          assertEquals(facts.overflow, [], `${width}/${theme}`);
          assertEquals(facts.pageOverflow, false, `${width}/${theme}`);
          assertEquals(
            await page.locator(".discern-fleet__state strong")
              .allTextContents(),
            ["Working", "Waiting", "Blocked", "Complete"],
          );
          assertEquals(
            await page.locator(".discern-transcript > li").count(),
            denseTranscriptTurns.length,
          );
          assertEquals(
            await page.locator(
              '.discern-transcript > [data-discern-routine="continuation"]',
            ).count(),
            2,
          );
          assertEquals(
            await page.locator(".discern-worklog > li").count(),
            denseWorklogEntries.length,
          );
          assertStringIncludes(
            await page.locator(".discern-transcript").innerText(),
            "Decision · 09:16",
          );
          await page.evaluate(() => {
            const writes: string[] = [];
            Object.defineProperty(navigator, "clipboard", {
              configurable: true,
              value: {
                writeText: (value: string) => {
                  writes.push(value);
                  return Promise.resolve();
                },
              },
            });
            Object.defineProperty(window, "operationalWrites", {
              configurable: true,
              value: writes,
            });
          });
          await page.addScriptTag({
            content: browserBehaviorSources["copy-button"],
          });
          await page.locator(".discern-result-summary .discern-copy-button")
            .click();
          assertEquals(
            await page.evaluate(() =>
              (window as unknown as { operationalWrites: string[] })
                .operationalWrites
            ),
            [copied],
          );
          const copyControls = await page.locator(
            "main > .discern-path-reference .discern-copy-button",
          ).all();
          for (const control of copyControls) await control.click();
          assertEquals(
            await page.evaluate(() =>
              (window as unknown as { operationalWrites: string[] })
                .operationalWrites
            ),
            [copied, ...paths],
          );
          await page.evaluate(() =>
            document.dispatchEvent(new Event("discern:copy-button:teardown"))
          );
          await page.emulateMedia({
            forcedColors: "active",
            reducedMotion: "reduce",
          });
          await summary.focus();
          await summary.press("Space");
          assert(
            await summary.evaluate((node) =>
              getComputedStyle(node).outlineStyle !== "none"
            ),
          );
          await page.emulateMedia({
            forcedColors: "none",
            reducedMotion: "no-preference",
          });
        }
      });
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});
