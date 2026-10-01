/**
 * An application that listens for refused views keeps its session when a
 * layer breaks a view rule: the package leaves the layer out, reports it
 * dismissed as `refused`, and hands the issues to `onViewRejected`. A rule
 * broken outside the layers, or any broken rule without the listener,
 * still fails the session.
 */
import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  type ApplicationLayer,
  type ApplicationSheet,
  createTerminalApplicationModel,
  runTerminalApplication,
  type TerminalApplicationDismissal,
  terminalApplicationState,
  type TerminalApplicationView,
  type TerminalApplicationViewIssue,
  transitionTerminalApplication,
  updateTerminalApplication,
} from "../../src/cli/interactive/mod.ts";
import { FakeTerminalIO } from "../../src/cli/interactive/testing.ts";
import { applicationSession, settle } from "../fixtures/application-session.ts";
import { testView } from "../fixtures/application-views.ts";

/** A sheet whose typed challenge must equal `mustEqual`; empty breaks a rule. */
function sheet(mustEqual: string): ApplicationSheet<string> {
  return {
    kind: "sheet",
    id: "drop",
    scope: "global",
    title: "Drop it?",
    state: "ready",
    body: [{ kind: "text", runs: [{ text: "Removes it" }] }],
    challenge: {
      fieldId: "confirm",
      label: [{ text: "Type its name" }],
      mustEqual,
    },
    buttons: [
      { id: "keep", label: "Keep", role: "safe" },
      {
        id: "drop",
        label: "Drop",
        role: "destructive",
        action: "drop",
        requiresChallenge: true,
      },
    ],
  };
}

function withLayers(
  ...layers: readonly ApplicationLayer<string>[]
): TerminalApplicationView<string> {
  return layers.length === 0 ? testView() : { ...testView(), layers };
}

interface Heard {
  readonly rejected: (readonly TerminalApplicationViewIssue[])[];
  readonly dismissed: string[];
}

function listening(): Heard & {
  readonly options: {
    readonly onViewRejected: (
      issues: readonly TerminalApplicationViewIssue[],
    ) => void;
    readonly onDismiss: (
      target: { readonly layer: string } | { readonly message: string },
      via: TerminalApplicationDismissal,
    ) => void;
  };
} {
  const rejected: (readonly TerminalApplicationViewIssue[])[] = [];
  const dismissed: string[] = [];
  return {
    rejected,
    dismissed,
    options: {
      onViewRejected: (issues) => rejected.push(issues),
      onDismiss: (target, via) => {
        if ("layer" in target) dismissed.push(`${target.layer}:${via}`);
      },
    },
  };
}

Deno.test("a broken layer from the mailbox is refused while the session and its work go on", async () => {
  const heard = listening();
  const outcomes: string[] = [];
  let finishWork: () => void = () => {};
  const work = new Promise<void>((resolve) => {
    finishWork = resolve;
  });
  const session = await applicationSession(testView(), {
    options: {
      ...heard.options,
      keymap: [{ key: "w", action: "work" }],
      // Work running beside the screen, which a failed session would abort.
      onAction: (action) =>
        action === "work"
          ? { kind: "background", id: "work", run: () => work }
          : undefined,
      onCommandSettled: (id, outcome) =>
        outcomes.push(`${id}:${outcome.status}`),
    },
  });
  session.io.enqueue("w");
  await settle();
  session.context().update(withLayers(sheet("")));
  await settle();
  assertEquals(heard.rejected.length, 1);
  assert(
    heard.rejected[0]?.some((issue) =>
      issue.path === "layers[0].challenge.mustEqual"
    ),
    JSON.stringify(heard.rejected),
  );
  assertEquals(heard.dismissed, ["drop:refused"]);
  assertEquals(session.context().state.topLayerId, undefined);
  assert(!session.frame().includes("Drop it?"));
  // A corrected version of the layer opens as new.
  session.context().update(withLayers(sheet("archive")));
  await settle();
  assertEquals(session.context().state.topLayerId, "drop");
  finishWork();
  await settle();
  assertEquals(
    outcomes,
    ["work:completed"],
    "the work beside the screen ran on",
  );
  session.context().update(testView());
  await settle();
  await session.finish();
});

Deno.test("an open layer that breaks a rule on update closes, and focus returns beneath", () => {
  const created = createTerminalApplicationModel(withLayers(sheet("archive")), {
    keymap: [{ key: "q", action: "quit" }],
    refuseBrokenLayers: true,
  });
  assertEquals(
    created.effects.filter((effect) => effect.kind === "rejected").length,
    0,
  );
  const step = updateTerminalApplication(
    created.model,
    withLayers(sheet("")),
    0,
  );
  const kinds = step.effects.map((effect) =>
    effect.kind === "dismiss" ? `dismiss:${effect.via}` : effect.kind
  );
  assertEquals(kinds, ["rejected", "dismiss:refused"]);
  const state = terminalApplicationState(step.model);
  assertEquals(state.topLayerId, undefined);
  assertEquals(state.focusedControlId, "items");
});

Deno.test("a broken layer in the first view is refused before anything shows", async () => {
  const heard = listening();
  const io = new FakeTerminalIO(["q"]);
  await runTerminalApplication({
    view: withLayers(sheet("")),
    keymap: [{ key: "q", action: "quit" }],
    onAction: () => ({ kind: "exit" }),
    ...heard.options,
  }, { io });
  assertEquals(heard.dismissed, ["drop:refused"]);
  assertEquals(heard.rejected.length, 1);
});

Deno.test("a broken layer opened inside a callback is refused, not thrown", async () => {
  const heard = listening();
  const io = new FakeTerminalIO(["o", "q"]);
  await runTerminalApplication({
    view: testView(),
    keymap: [{ key: "o", action: "open" }, { key: "q", action: "quit" }],
    onAction: (action, context) => {
      if (action === "quit") return { kind: "exit" };
      context.update(withLayers(sheet("")));
      return undefined;
    },
    ...heard.options,
  }, { io });
  assertEquals(heard.dismissed, ["drop:refused"]);
});

Deno.test("rules broken outside the layers, or without a listener, still fail the session", async () => {
  // Without onViewRejected the broken layer fails the session as before.
  await assertRejects(
    () =>
      runTerminalApplication({
        view: withLayers(sheet("")),
        keymap: [{ key: "q", action: "quit" }],
        onAction: () => ({ kind: "exit" }),
      }, { io: new FakeTerminalIO(["q"]) }),
    TypeError,
    "mustEqual",
  );
  // A footer hint nothing handles lies outside the layers.
  const unbound: TerminalApplicationView<string> = {
    ...withLayers(sheet("")),
    footer: { left: [{ key: "x", label: "Nothing" }] },
  };
  assertThrows(
    () =>
      createTerminalApplicationModel(unbound, {
        keymap: [{ key: "q", action: "quit" }],
        refuseBrokenLayers: true,
      }),
    TypeError,
  );
});

/** Layers that break one rule each, across the kinds and the rule families. */
const BROKEN: readonly {
  readonly name: string;
  readonly layer: ApplicationLayer<string>;
}[] = [
  { name: "an empty challenge", layer: sheet("") },
  {
    name: "a repeated button id",
    layer: {
      ...sheet("archive"),
      buttons: [
        { id: "keep", label: "Keep", role: "safe" },
        { id: "keep", label: "Keep too", role: "confirm", action: "keep" },
      ],
    },
  },
  {
    name: "a menu item without a label",
    layer: {
      kind: "menu",
      id: "menu",
      scope: "global",
      title: "Actions",
      sections: [{
        title: "Item",
        items: [{ id: "open", label: "", action: "open" }],
      }],
    },
  },
  {
    name: "a palette without a placeholder",
    layer: {
      kind: "palette",
      id: "palette",
      scope: "global",
      placeholder: "",
      sections: [],
    },
  },
  {
    name: "a form choice whose initial value is no option",
    layer: {
      kind: "form",
      id: "form",
      scope: "global",
      title: "New",
      fields: [{
        kind: "choice",
        id: "size",
        label: "Size",
        initial: "huge",
        options: [{ id: "small", label: "Small" }],
      }],
      buttons: [{ id: "keep", label: "Keep", role: "safe" }],
    },
  },
  {
    name: "reader rows reusing the body's list id",
    layer: {
      kind: "reader",
      id: "reader",
      scope: "global",
      title: "Rows",
      blocks: [],
      rows: { id: "items", groups: [] },
    },
  },
  {
    name: "a hint for a key nothing handles",
    layer: { ...sheet("archive"), hints: [{ key: "x", label: "Nothing" }] },
  },
  {
    name: "a disclosure key a layer binding claims",
    layer: {
      ...sheet("archive"),
      disclosures: [{
        id: "plan",
        label: "Plan",
        key: "d",
        fieldKey: "ctrl-t",
        content: [],
      }],
    },
  },
];

Deno.test("every rule a layer can break refuses that layer alone", async (t) => {
  const keymap = [
    { key: "q", action: "quit" },
    { key: "d", action: "detail", scope: { layer: "drop" } },
  ] as const;
  for (const { name, layer } of BROKEN) {
    await t.step(name, () => {
      const view = withLayers(layer);
      assertThrows(
        () =>
          updateTerminalApplication(
            createTerminalApplicationModel(testView(), { keymap }).model,
            view,
            0,
          ),
        TypeError,
        undefined,
        "the layer breaks a rule",
      );
      const step = updateTerminalApplication(
        createTerminalApplicationModel(testView(), {
          keymap,
          refuseBrokenLayers: true,
        }).model,
        view,
        0,
      );
      assert(step.effects.some((effect) => effect.kind === "rejected"), name);
      assert(
        step.effects.some((effect) =>
          effect.kind === "dismiss" && effect.via === "refused" &&
          "layer" in effect.target && effect.target.layer === layer.id
        ),
        name,
      );
    });
  }
  await t.step("a dismissed layer the view still declares", () => {
    const keymap = [{ key: "q", action: "quit" }] as const;
    const open = createTerminalApplicationModel(withLayers(sheet("archive")), {
      keymap,
      refuseBrokenLayers: true,
    }).model;
    const dismissed = transitionTerminalApplication(open, {
      kind: "key",
      key: { kind: "named", name: "escape" },
    }, 0);
    const step = updateTerminalApplication(
      dismissed.model,
      withLayers(sheet("archive")),
      0,
    );
    assert(step.effects.some((effect) => effect.kind === "rejected"));
  });
});
