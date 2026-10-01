/**
 * State reports say what the screen waits on — the top layer, the selected
 * item's detail, the message line, and the header's liveness — so a
 * real-terminal journey keys on them instead of reading prose.
 */
import { assertEquals } from "@std/assert";
import type {
  ApplicationLayer,
  ApplicationMasterDetailBody,
  TerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";
import { captureTerminalFrame } from "../../src/cli/interactive/testing.ts";
import { ApplicationDriver } from "../fixtures/application-driver.ts";
import { applicationSession, settle } from "../fixtures/application-session.ts";
import { testView } from "../fixtures/application-views.ts";

function masterDetail(
  view: TerminalApplicationView<string>,
): ApplicationMasterDetailBody<string> {
  if (view.body.kind !== "master-detail") throw new Error("master-detail");
  return view.body;
}

/** Items a and b; a's detail as given, b's absent so it shows the pending label. */
function withDetail(
  content: ApplicationMasterDetailBody<string>["detail"]["content"],
): TerminalApplicationView<string> {
  const view = testView(["a", "b"]);
  const body = masterDetail(view);
  return {
    ...view,
    body: { ...body, detail: { ...body.detail, content } },
  };
}

function withLayer(
  layer: ApplicationLayer<string>,
): TerminalApplicationView<string> {
  return { ...testView(["a"]), layers: [layer] };
}

Deno.test("the report says whether the selected item's detail waits on its caller", () => {
  const ready = withDetail({
    a: [{ kind: "text", runs: [{ text: "Ready" }] }],
  });
  const driver = new ApplicationDriver(ready);
  assertEquals(driver.last.report.detailPending, false);
  driver.key("down");
  assertEquals(driver.last.report.selectedItemId, "b");
  assertEquals(driver.last.report.detailPending, true, "no content yet");
  driver.update(withDetail({
    a: [],
    b: [{
      kind: "section",
      title: "Evidence",
      blocks: [{ kind: "pending", label: "Reading…" }],
    }],
  }));
  assertEquals(driver.last.report.detailPending, true, "a pending block");
  driver.update(withDetail({ a: [], b: [] }));
  assertEquals(driver.last.report.detailPending, false);
  const list = new ApplicationDriver(testView(["a"], { body: "list" }));
  assertEquals(
    list.last.report.detailPending,
    undefined,
    "no detail to wait on",
  );
});

Deno.test("the report names the top layer's state and whether it waits", () => {
  const sheet = (state: "loading" | "ready") =>
    withLayer({
      kind: "sheet",
      id: "review",
      scope: "global",
      title: "Review",
      state,
      body: [{ kind: "text", runs: [{ text: "Plan" }] }],
      buttons: [{ id: "keep", label: "Keep", role: "safe" }],
    });
  const driver = new ApplicationDriver(sheet("loading"));
  assertEquals(driver.last.report.topLayerId, "review");
  assertEquals(driver.last.report.topLayerState, "loading");
  assertEquals(driver.last.report.topLayerPending, true);
  driver.update(sheet("ready"));
  assertEquals(driver.last.report.topLayerState, "ready");
  assertEquals(driver.last.report.topLayerPending, false);
  const reader = new ApplicationDriver(withLayer({
    kind: "reader",
    id: "notes",
    scope: "global",
    title: "Notes",
    blocks: [{ kind: "pending", label: "Opening…" }],
  }));
  assertEquals(reader.last.report.topLayerState, undefined);
  assertEquals(reader.last.report.topLayerPending, true);
  const bare = new ApplicationDriver(testView(["a"]));
  assertEquals(bare.last.report.topLayerPending, undefined);
});

Deno.test("the report names the message on the message line until it goes", () => {
  const driver = new ApplicationDriver(
    testView(["a"], { message: { id: "saved", runs: [{ text: "Saved" }] } }),
  );
  assertEquals(driver.last.report.messageId, "saved");
  driver.key("escape");
  assertEquals(driver.last.report.messageId, undefined);
});

Deno.test("the report names the liveness the header shows", () => {
  const live = (state: "busy" | "stale"): TerminalApplicationView<string> => ({
    ...testView(["a"]),
    header: {
      leading: [{ text: "Studio" }],
      liveness: {
        state,
        busyAfterMs: 500,
        labels: {
          idle: "Live",
          busy: "Refreshing",
          retrying: "Retrying",
          stale: "Offline",
        },
      },
    },
  });
  const driver = new ApplicationDriver(live("busy"));
  assertEquals(driver.last.report.liveness, "idle", "busy shows only later");
  driver.now = 600;
  driver.render();
  assertEquals(driver.last.report.liveness, "busy");
  driver.update(live("stale"));
  assertEquals(driver.last.report.liveness, "stale");
  assertEquals(
    new ApplicationDriver(testView(["a"])).last.report.liveness,
    undefined,
  );
});

Deno.test("a real paint carries the new fields to the capture", async () => {
  const session = await applicationSession(withDetail({}), {
    applicationStateReports: true,
  });
  assertEquals(
    captureTerminalFrame(session.io.output(), session.io.size()).state
      ?.detailPending,
    true,
  );
  session.context().update(withDetail({ a: [] }));
  await settle();
  assertEquals(
    captureTerminalFrame(session.io.output(), session.io.size()).state
      ?.detailPending,
    false,
  );
  await session.finish();
});
