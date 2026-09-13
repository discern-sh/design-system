import { assertEquals } from "@std/assert";
import { missingWitnessesInHtml } from "../scripts/measure-missing-witnesses.ts";

Deno.test("missing witnesses count a planted colour-only state and accept named witnesses", () => {
  const hits = missingWitnessesInHtml(`
    <div>
      <p data-discern-status="warning">
        <span class="discern-marker" aria-hidden="true">!</span>
        <span class="discern-visually-hidden">Warning</span>
      </p>
      <p data-discern-status="success">Success</p>
      <p data-discern-tone="danger">
        <span role="img" aria-label="Danger">!</span>
      </p>
      <p data-discern-tone="active">
        <svg aria-labelledby="active-title"><title id="active-title">Active</title></svg>
      </p>
    </div>
  `);

  assertEquals(hits, [{
    tag: "p",
    attribute: "data-discern-status",
    state: "warning",
    occurrence: 1,
  }]);
});

Deno.test("operational status aliases are exact, source-owned and confined to their Components", () => {
  assertEquals(
    missingWitnessesInHtml(`
    <section class="discern-activity-log" data-discern-status="active">Working</section>
    <li class="discern-fleet__row" data-discern-status="done">Complete</li>
  `),
    [],
  );
  const hits = missingWitnessesInHtml(`
    <section class="discern-future-operation" data-discern-status="active">Working</section>
    <li class="discern-fleet__row" data-discern-status="blocked">Complete</li>
    <section class="discern-activity-log" data-discern-status="active"><span aria-hidden="true">Working</span></section>
  `);
  assertEquals(hits.map(({ state }) => state), ["active", "blocked", "active"]);
});
