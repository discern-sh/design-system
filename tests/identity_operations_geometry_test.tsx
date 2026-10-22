import { assert, assertEquals } from "@std/assert";
import { toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import type { Browser, Page } from "playwright-core";
import { launchBrowser } from "../scripts/browser.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import {
  AgentAvatar,
  AgentMention,
  AgentPersona,
  Avatar,
  AvatarGroup,
  Byline,
  Fleet,
  Mention,
  Persona,
  ProfileCard,
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

const longName = "Alexandrine Featherstonehaugh-Cholmondeley";
const statuses = ["working", "waiting", "blocked", "done", "idle"] as const;
const presences = ["online", "away", "busy", "offline"] as const;
const broken = "data:image/png;base64,AAAA";
const translucent = /\/\s*0?\.\d+\)$|,\s*0?\.\d+\)$|,\s*0\)$/;

async function withRuntime(
  run: (page: Page, root: string, browser: Browser) => Promise<void>,
): Promise<void> {
  const root = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${root}/`),
      groups: ["People", "Agents"],
      assets: ["fonts"],
    });
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    await run(page, root, browser);
  } finally {
    await browser.close();
    await Deno.remove(root, { recursive: true });
  }
}

/** Render cases against the emitted stylesheet and its bundled faces. */
async function render(
  page: Page,
  root: string,
  theme: string,
  sections: readonly { readonly width: number; readonly markup: string }[],
): Promise<void> {
  await Deno.writeTextFile(
    `${root}/case.html`,
    `<!doctype html><html lang="en" data-discern-root data-discern-theme="${theme}"><head><meta charset="utf-8"><link rel="stylesheet" href="./discern.css"><link rel="stylesheet" href="./fonts.css"></head><body style="margin:0;background:var(--discern-color-surface)">${
      sections.map(({ width, markup }, index) =>
        `<section data-case="${index}" style="width:${width}px;padding:8px">${markup}</section>`
      ).join("")
    }</body></html>`,
  );
  await page.goto(toFileUrl(`${root}/case.html`).href);
  await page.evaluate(() => document.fonts.ready);
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Decode a screenshot into a grid of ink flags (darker than mid grey). */
async function inkGrid(
  page: Page,
  png: Uint8Array,
): Promise<{ width: number; height: number; ink: number[] }> {
  return await page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const ink: number[] = [];
    for (let index = 0; index < pixels.length; index += 4) {
      const luminance = 0.2126 * pixels[index]! + 0.7152 * pixels[index + 1]! +
        0.0722 * pixels[index + 2]!;
      ink.push(luminance < 128 ? 1 : 0);
    }
    return { width: canvas.width, height: canvas.height, ink };
  }, base64(png));
}

Deno.test("grouped identities stay opaque and share one cut-out ring", async () => {
  await withRuntime(async (page, root) => {
    const names = ["Morgan Ellis", "June Park", "Ada Osei", "Wren Mbeki"];
    for (const theme of ["light", "dark"]) {
      await render(page, root, theme, [
        ...(["sm", "md", "lg", "xl"] as const).map((size) => ({
          width: 720,
          markup: renderToStaticMarkup(
            <AvatarGroup max={3} label={`Contributors ${size}`} size={size}>
              {names.map((name) => (
                <Avatar key={name} name={name} size={size} />
              ))}
            </AvatarGroup>,
          ),
        })),
        {
          width: 720,
          markup: renderToStaticMarkup(
            <AvatarGroup label="Mixed identities" size="lg">
              <Avatar name="Morgan Ellis" size="lg" presence="online" />
              <Avatar name="June Park" size="lg" src={broken} />
              <AgentAvatar name="forge-2" size="lg" status="working" />
              <Avatar name="Ada Osei" size="lg" presence="busy" />
            </AvatarGroup>,
          ),
        },
        {
          width: 720,
          markup:
            `<div style="--discern-avatar-ring: var(--discern-color-canvas)">${
              renderToStaticMarkup(
                <>
                  <Avatar name="Morgan Ellis" presence="away" />
                  <AgentAvatar name="quill" status="done" />
                </>,
              )
            }</div>`,
        },
      ]);
      await page.waitForFunction(() =>
        [...document.images].every((image) => image.complete)
      );
      const facts = await page.locator(".discern-avatar-group").evaluateAll(
        (groups) =>
          groups.slice(0, 4).flatMap((group) => {
            const items = [...group.children] as HTMLElement[];
            return items.slice(0, -1).map((item, index) => {
              const monogram = item.querySelector(".discern-avatar__monogram")!;
              const range = document.createRange();
              range.selectNodeContents(monogram);
              const ring = Number.parseFloat(
                getComputedStyle(document.documentElement).fontSize,
              ) * 0.125;
              return {
                text: monogram.textContent,
                clearance: items[index + 1]!.getBoundingClientRect().left -
                  ring - range.getBoundingClientRect().right,
              };
            });
          }),
      );
      for (const { text, clearance } of facts) {
        assert(
          clearance >= 1,
          `${theme}: ${text} runs ${clearance.toFixed(2)}px into the next disc`,
        );
      }
      const fills = await page.locator(".discern-avatar-group > *")
        .evaluateAll((children) =>
          children.map((child) => {
            const style = getComputedStyle(child);
            const image = child.querySelector("img");
            const fallback = image === null
              ? null
              : getComputedStyle(image, "::before");
            return {
              name: child.getAttribute("aria-label") ?? child.className,
              layers: [style.backgroundColor, style.backgroundImage],
              fallback: fallback === null ? null : {
                content: fallback.content,
                image: fallback.backgroundImage,
                initials: image!.dataset.discernInitials,
              },
            };
          })
        );
      assertEquals(fills.length, 4 * 4 + 4);
      for (const { name, layers, fallback } of fills) {
        const [colour, image] = layers;
        const stops = image === "none" ? [] : [
          ...image!.matchAll(/(?:rgba?|oklch|oklab|color)\([^()]*\)/g),
        ].map((match) => match[0]);
        assert(
          !translucent.test(colour!) ||
            (stops.length > 0 &&
              stops.every((stop) => !translucent.test(stop))),
          `${theme}: ${name} lets the overlapped disc show through (${layers})`,
        );
        if (fallback !== null) {
          assert(
            /attr\(data-discern-initials\)|"JP"/.test(fallback.content) &&
              fallback.initials === "JP",
            `${theme}: a failed photo keeps its initials over the broken-image glyph`,
          );
          assert(fallback.image !== "none", "failed photo fill is opaque");
        }
      }
      const rings = await page.evaluate(() => {
        const probe = document.createElement("span");
        document.body.append(probe);
        const resolve = (role: string) => {
          probe.style.color = `var(--discern-color-${role})`;
          return getComputedStyle(probe).color;
        };
        const surface = resolve("surface");
        const canvas = resolve("canvas");
        probe.remove();
        const cutouts = [
          ...document.querySelectorAll(
            ".discern-avatar__presence, .discern-agent-avatar__status",
          ),
        ].map((node) => {
          const style = getComputedStyle(node);
          const host = node.parentElement!;
          return {
            grouped: host.parentElement!.classList.contains(
              "discern-avatar-group",
            ),
            face: style.backgroundColor,
            hostRing: getComputedStyle(host).boxShadow,
          };
        });
        return { surface, canvas, cutouts };
      });
      assertEquals(rings.cutouts.length, 5);
      for (const cutout of rings.cutouts) {
        const expected = cutout.grouped ? rings.surface : rings.canvas;
        assertEquals(cutout.face, expected, `${theme}: cut-out ring role`);
        if (cutout.grouped) {
          assert(
            cutout.hostRing.startsWith(expected),
            `${theme}: the disc ring and its badge ring disagree`,
          );
        }
      }
    }
  });
});

Deno.test("agent status badges stay opaque and pulse only their mark", async () => {
  await withRuntime(async (page, root) => {
    for (const theme of ["light", "dark"]) {
      await render(page, root, theme, [{
        width: 720,
        markup: renderToStaticMarkup(
          <>
            {(["sm", "md", "xl"] as const).flatMap((size) =>
              statuses.map((status) => (
                <AgentAvatar
                  key={`${size}-${status}`}
                  name="forge-2"
                  size={size}
                  status={status}
                />
              ))
            )}
          </>,
        ),
      }]);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      const badges = await page.locator(".discern-agent-avatar__status")
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const style = getComputedStyle(node);
            const mark = getComputedStyle(node, "::after");
            const tile = node.parentElement!.getBoundingClientRect();
            return {
              status: (node as HTMLElement).dataset.discernAvatarStatus!,
              underlay: style.backgroundColor,
              text: node.textContent,
              animation: style.animationName,
              pulse: mark.animationName,
              share: node.clientWidth / tile.width,
            };
          })
        );
      assertEquals(badges.length, 15);
      for (const badge of badges) {
        assert(
          !translucent.test(badge.underlay),
          `${theme}: ${badge.status} badge underlay ${badge.underlay} is translucent`,
        );
        assertEquals(badge.text, "", "Badge marks are drawn, not typeset");
        assertEquals(
          badge.animation,
          "none",
          `${theme}: ${badge.status} badge must not fade its own underlay`,
        );
        assert(badge.share <= 0.3, `${badge.status} badge covers the tile`);
      }
      const working = badges.filter(({ status }) => status === "working");
      assert(working.every(({ pulse }) => pulse !== "none"));
    }
  });
});

Deno.test("identity marks keep distinct shapes when forced colours strip every tone", async () => {
  await withRuntime(async (_page, root, browser) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 2,
      forcedColors: "active",
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      const sizes = ["xs", "sm", "md", "xl"] as const;
      await render(page, root, "light", [
        ...sizes.map((size) => ({
          width: 720,
          markup: renderToStaticMarkup(
            <div style={{ display: "grid", gap: "16px" }}>
              <div style={{ display: "flex", gap: "16px" }}>
                {statuses.map((status) => (
                  <AgentAvatar
                    key={status}
                    name="forge-2"
                    size={size}
                    status={status}
                  />
                ))}
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                {presences.map((presence) => (
                  <Avatar
                    key={presence}
                    name="Morgan Ellis"
                    size={size}
                    presence={presence}
                  />
                ))}
              </div>
            </div>,
          ),
        })),
        {
          width: 390,
          markup: renderToStaticMarkup(
            <Worklog entries={denseWorklogEntries} />,
          ),
        },
      ]);
      for (const [index, size] of sizes.entries()) {
        for (
          const [selector, states] of [
            [".discern-agent-avatar__status", statuses],
            [".discern-avatar__presence", presences],
          ] as const
        ) {
          const marks = page.locator(
            `section[data-case="${index}"] ${selector}`,
          );
          assertEquals(await marks.count(), states.length);
          const seen = new Map<string, string>();
          for (const [position, state] of states.entries()) {
            const shot = base64(
              await marks.nth(position).screenshot({ animations: "disabled" }),
            );
            assert(
              !seen.has(shot),
              `forced colours: ${size} ${state} paints the same shape as ${
                seen.get(shot)
              }`,
            );
            seen.set(shot, state);
          }
        }
      }
      const continuations = page.locator(
        '.discern-worklog__entry[data-discern-routine="continuation"] .discern-worklog__marker',
      );
      assert(await continuations.count() > 0);
      for (const marker of await continuations.all()) {
        const { width, height, ink } = await inkGrid(
          page,
          await marker.screenshot(),
        );
        const at = (x: number, y: number) =>
          ink[Math.round(y) * width + Math.round(x)] === 1;
        const middle = width / 2;
        const beside = width / 12;
        assert(
          at(middle - beside, height / 2) && at(middle + beside, height / 2),
          "forced colours: a done continuation step loses its dot",
        );
        assert(
          at(middle, 1) || at(middle - 1, 1),
          "forced colours: the rail stops above a continuation dot",
        );
        assert(
          !at(1, height / 2) && !at(width - 2, height / 2),
          "forced colours: a continuation dot becomes an empty ring",
        );
      }
    } finally {
      await context.close();
    }
  });
});

Deno.test("identity marks sit beside the first line of a wrapped name", async () => {
  await withRuntime(async (page, root) => {
    for (const theme of ["light", "dark"]) {
      await render(page, root, theme, [
        {
          width: 220,
          markup: renderToStaticMarkup(
            <Persona name={longName} detail="Research programme lead" />,
          ),
        },
        {
          width: 220,
          markup: renderToStaticMarkup(
            <AgentPersona
              name="terminal-contract-audit-with-identities"
              status="working"
            />,
          ),
        },
        {
          width: 160,
          markup: renderToStaticMarkup(<Mention name={longName} href="#a" />),
        },
        {
          width: 160,
          markup: renderToStaticMarkup(
            <AgentMention name="terminal-contract-audit" />,
          ),
        },
        {
          width: 720,
          markup: renderToStaticMarkup(<Persona name="Ada Osei" />),
        },
      ]);
      const facts = await page.locator("section[data-case]").evaluateAll((
        sections,
      ) =>
        sections.map((section) => {
          const root = section.firstElementChild!;
          const mark = root.firstElementChild!.getBoundingClientRect();
          const name = root.querySelector(
            '[class$="__name"]',
          )!;
          const range = document.createRange();
          range.selectNodeContents(name);
          const lines = [...range.getClientRects()];
          const first = lines[0]!;
          return {
            lines: new Set(lines.map((line) => Math.round(line.top))).size,
            markTop: mark.top,
            markCentre: mark.top + mark.height / 2,
            textTop: first.top,
            nameCentre: first.top + first.height / 2,
          };
        })
      );
      for (const [index, fact] of facts.slice(0, 4).entries()) {
        assert(fact.lines > 1, `case ${index} must wrap to test alignment`);
        assert(
          fact.markTop <= fact.textTop + 4 &&
            Math.abs(fact.markCentre - fact.nameCentre) <
              Math.max(fact.markCentre - fact.markTop, 12),
          `${theme}: case ${index} mark drifts away from the first line`,
        );
      }
      const single = facts[4]!;
      assert(
        Math.abs(single.markCentre - single.nameCentre) < 1,
        `${theme}: a one-line Persona keeps its text centred on the avatar`,
      );
    }
  });
});

Deno.test("inline identities flow like words: no orphans, quiet static chips, hugging focus", async () => {
  await withRuntime(async (page, root) => {
    for (const theme of ["light", "dark"]) {
      await render(page, root, theme, [
        {
          width: 240,
          markup: renderToStaticMarkup(
            <p style={{ margin: 0 }}>
              The follow-up belongs to <Mention name={longName} src={broken} />.
            </p>,
          ),
        },
        {
          width: 240,
          markup: renderToStaticMarkup(
            <Byline
              lede="By"
              authors={
                <>
                  <Mention name={longName} href="#ada" />
                  <span>and</span>
                  <Mention name="June Park" href="#june" />
                </>
              }
            >
              <time dateTime="2026-08-11">11 August 2026</time>
              <span>8 min read</span>
            </Byline>,
          ),
        },
        {
          width: 720,
          markup: renderToStaticMarkup(
            <p style={{ margin: 0 }}>
              From <Mention name="Morgan Ellis" href="#m" /> and{" "}
              <Mention name="Ada Osei" /> with{" "}
              <AgentMention name="quill" href="#q" /> and{" "}
              <AgentMention name="forge-2" />.
            </p>,
          ),
        },
        {
          width: 240,
          markup: renderToStaticMarkup(
            <ProfileCard
              layout="landscape"
              name={longName}
              detail="Editor at large"
            />,
          ),
        },
        {
          width: 720,
          markup: renderToStaticMarkup(
            <AgentPersona
              name="forge-2"
              status="waiting"
              statusLabel="waiting on review"
            />,
          ),
        },
      ]);
      const flow = await page.evaluate(() => {
        const centre = (rect: DOMRect) => rect.top + rect.height / 2;
        const sentence = document.querySelector('section[data-case="0"] p')!;
        const chip = sentence.querySelector(".discern-mention")!;
        const period = [...sentence.childNodes].at(-1)!;
        const range = document.createRange();
        range.selectNodeContents(period);
        const chipLines = [...chip.getClientRects()];
        const byline = document.querySelector(".discern-byline")!;
        const lede = byline.querySelector(".discern-byline__lede")!;
        const firstAuthor = byline.querySelector(".discern-mention")!;
        const name = document.querySelector(".discern-profile-card__name")!
          .firstChild!;
        const text = name.textContent ?? "";
        const breaks: string[] = [];
        let previous: number | undefined;
        for (let index = 0; index < text.length; index++) {
          const glyph = document.createRange();
          glyph.setStart(name, index);
          glyph.setEnd(name, index + 1);
          const top = Math.round(glyph.getClientRects()[0]?.top ?? 0);
          if (previous !== undefined && top > previous + 2) {
            breaks.push(`${text.slice(0, index)}|${text.slice(index)}`);
          }
          previous = top;
        }
        return {
          chipLines: chipLines.length,
          periodShift: Math.abs(
            centre(range.getBoundingClientRect()) - centre(chipLines.at(-1)!),
          ),
          avatarShift: Math.abs(
            centre(
              chip.querySelector(".discern-avatar")!.getBoundingClientRect(),
            ) -
              centre(chipLines[0]!),
          ),
          ledeShift: Math.abs(
            centre(lede.getBoundingClientRect()) -
              centre(firstAuthor.getClientRects()[0]!),
          ),
          breaks,
          status: (document.querySelector(
            ".discern-agent-persona__status",
          ) as HTMLElement).innerText,
        };
      });
      assert(flow.chipLines > 1, "the narrow mention must wrap to test flow");
      assert(flow.periodShift < 4, `${theme}: the sentence's "." wraps alone`);
      assert(
        flow.avatarShift < 6,
        `${theme}: the chip avatar is stranded apart from the name`,
      );
      assert(flow.ledeShift < 4, `${theme}: "By" sits alone on its own line`);
      assert(flow.breaks.length > 0, "the profile name must wrap");
      for (const line of flow.breaks) {
        assert(
          /[\s-]\|/.test(line),
          `${theme}: the profile name breaks mid-word at "${line}"`,
        );
      }
      assertEquals(
        flow.status,
        "Waiting on review",
        `${theme}: status labels stay in sentence case`,
      );
      const chips = await page.evaluate(() => {
        const probe = document.createElement("span");
        document.body.append(probe);
        const resolve = (
          property: "color" | "backgroundColor",
          role: string,
        ) => {
          probe.style[property] = `var(--discern-color-${role})`;
          return getComputedStyle(probe)[property];
        };
        const ink = resolve("color", "ink");
        const inset = resolve("backgroundColor", "inset");
        probe.remove();
        return {
          ink,
          inset,
          chips: [
            ...document.querySelectorAll(
              'section[data-case="2"] :is(.discern-mention, .discern-agent-mention)',
            ),
          ].map((chip) => {
            const style = getComputedStyle(chip);
            return {
              linked: chip.tagName === "A",
              color: style.color,
              background: style.backgroundColor,
              transition: style.transitionProperty,
            };
          }),
        };
      });
      assertEquals(chips.chips.length, 4);
      for (const chip of chips.chips) {
        if (chip.linked) {
          assert(
            chip.color !== chips.ink && chip.background !== chips.inset,
            `${theme}: a linked chip loses its link tint`,
          );
          assert(
            /background-color/.test(chip.transition) &&
              /(^|, )color/.test(chip.transition),
            `${theme}: linked chips change state without a transition`,
          );
        } else {
          assertEquals(chip.color, chips.ink, `${theme}: static chip text`);
          assertEquals(chip.background, chips.inset, `${theme}: static chip`);
        }
      }
      for (const selector of ["a.discern-mention", "a.discern-agent-mention"]) {
        const link = page.locator(`section[data-case="2"] ${selector}`);
        await link.focus();
        const ring = await link.evaluate((node) => {
          const style = getComputedStyle(node);
          return {
            offset: style.outlineOffset,
            width: Number.parseFloat(style.outlineWidth),
          };
        });
        assert(ring.width > 0, `${selector} keeps the foundation ring`);
        assertEquals(
          ring.offset,
          "0px",
          `${theme}: ${selector} ring runs into neighbouring words`,
        );
      }
    }
  });
});

Deno.test("xs presence and its cut-out ring keep clear of the monogram they mark", async () => {
  await withRuntime(async (page, root) => {
    await render(page, root, "light", [{
      width: 720,
      markup: renderToStaticMarkup(
        <>
          {["Morgan Ellis", "Wren Mbeki", "Ada Osei", "Olu Ade"].map((name) =>
            presences.map((presence) => (
              <Avatar
                key={`${name}-${presence}`}
                name={name}
                size="xs"
                presence={presence}
              />
            ))
          )}
        </>,
      ),
    }]);
    const collisions = await page.locator(".discern-avatar--xs").evaluateAll(
      (avatars) =>
        avatars.flatMap((avatar) => {
          const monogram = avatar.querySelector(".discern-avatar__monogram")!;
          const dot = avatar.querySelector(".discern-avatar__presence")!
            .getBoundingClientRect();
          const style = getComputedStyle(monogram);
          const context = document.createElement("canvas").getContext("2d")!;
          context.font =
            `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const metrics = context.measureText(monogram.textContent ?? "");
          const box = monogram.getBoundingClientRect();
          const lineHeight = Number.parseFloat(style.lineHeight);
          const baseline = box.top +
            (lineHeight - metrics.fontBoundingBoxAscent -
                metrics.fontBoundingBoxDescent) / 2 +
            metrics.fontBoundingBoxAscent;
          const ink = {
            left: box.left - metrics.actualBoundingBoxLeft,
            right: box.left + metrics.actualBoundingBoxRight,
            top: baseline - metrics.actualBoundingBoxAscent,
            bottom: baseline + metrics.actualBoundingBoxDescent,
          };
          const radius = dot.width / 2;
          const centre = { x: dot.left + radius, y: dot.top + radius };
          const reach = Math.hypot(
            Math.max(ink.left - centre.x, 0, centre.x - ink.right),
            Math.max(ink.top - centre.y, 0, centre.y - ink.bottom),
          );
          const overlaps = reach < radius;
          return overlaps ? [avatar.getAttribute("aria-label")] : [];
        }),
    );
    assertEquals(collisions, [], "xs presence dots cover their monograms");
  });
});

Deno.test("operational evidence keeps words, stamps, and columns whole at narrow widths", async () => {
  await withRuntime(async (page, root) => {
    for (const theme of ["light", "dark"]) {
      await render(page, root, theme, [
        {
          width: 720,
          markup: renderToStaticMarkup(<Fleet rows={denseFleetRows} />),
        },
        {
          width: 390,
          markup: renderToStaticMarkup(
            <Transcript turns={denseTranscriptTurns} />,
          ),
        },
        {
          width: 720,
          markup: renderToStaticMarkup(
            <Transcript turns={denseTranscriptTurns} />,
          ),
        },
        {
          width: 390,
          markup: renderToStaticMarkup(
            <VerificationReport {...denseVerificationReport} evidenceOpen />,
          ),
        },
        {
          width: 352,
          markup: renderToStaticMarkup(
            <VerificationReport
              title="Checkout refactor"
              stamp="pass"
              checks={[
                { label: "format", state: "pass" },
                { label: "tests", state: "pass", value: "184 passed" },
              ]}
            />,
          ),
        },
        {
          width: 390,
          markup: renderToStaticMarkup(
            <Worklog entries={denseWorklogEntries} />,
          ),
        },
      ]);
      const facts = await page.evaluate(() => {
        const lineCount = (node: Node) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          const middles = [...range.getClientRects()]
            .filter((rect) => rect.width > 0)
            .map((rect) => rect.top + rect.height / 2)
            .toSorted((a, b) => a - b);
          return middles.filter((middle, index) =>
            index === 0 || middle - middles[index - 1]! > 6
          ).length;
        };
        const columns = ["persona", "branch", "state", "drift", "meta"].map(
          (column) => {
            const edges = [
              ...document.querySelectorAll(`.discern-fleet__${column}`),
            ].map((node) => {
              const rect = node.getBoundingClientRect();
              return getComputedStyle(node).justifySelf === "end"
                ? rect.right
                : rect.left;
            });
            return {
              column,
              spread: Math.max(...edges) - Math.min(...edges),
              count: edges.length,
            };
          },
        );
        const figures = [
          ...document.querySelectorAll(
            ".discern-fleet__drift, .discern-fleet__meta",
          ),
        ].map((node) => getComputedStyle(node).fontVariantNumeric);
        const asides = [
          ...document.querySelectorAll(".discern-transcript__aside"),
        ].map((node) => ({ text: node.textContent, lines: lineCount(node) }));
        const textIndents = [
          ...document.querySelectorAll(".discern-transcript__turn"),
        ].flatMap((turn) => {
          const name = turn.querySelector(
            ".discern-transcript__name:not(.discern-visually-hidden)",
          );
          if (name === null) return [];
          return [
            turn.querySelector(".discern-transcript__body")!
              .getBoundingClientRect().left -
            name.getBoundingClientRect().left,
          ];
        });
        const summaries = [
          ...document.querySelectorAll(
            ".discern-verification-report__evidence > summary",
          ),
        ].map((summary) => {
          const label = [...summary.childNodes].find((node) =>
            node.nodeType === Node.TEXT_NODE &&
            (node.textContent ?? "").trim() !== ""
          );
          const extent = summary.querySelector(
            ".discern-verification-report__extent",
          )!;
          const edge = extent.getBoundingClientRect().left;
          return {
            display: getComputedStyle(summary).display,
            lines: label === undefined ? 0 : lineCount(label),
            clauses: [...extent.children].map((clause) => ({
              text: clause.textContent,
              lines: lineCount(clause),
              opensLine: Math.abs(clause.getBoundingClientRect().left - edge) <
                1,
            })),
            clipped: getComputedStyle(extent).overflowX,
          };
        });
        const verdicts = [
          ...document.querySelectorAll(".discern-verification-report__verdict"),
        ].map((node) => {
          const row = node.parentElement!.getBoundingClientRect();
          const rect = node.getBoundingClientRect();
          return {
            text: node.textContent,
            lines: lineCount(node),
            endGap: row.right - rect.right,
          };
        });
        const stacked = [
          ...document.querySelectorAll(
            ".discern-verification-report__checks > div",
          ),
        ].flatMap((row) => {
          const term = row.querySelector("dt")!.getBoundingClientRect();
          const value = row.querySelector(
            ".discern-verification-report__value",
          );
          if (value === null) return [];
          const rect = value.getBoundingClientRect();
          return rect.top >= term.bottom - 1
            ? [Math.abs(rect.left - term.left)]
            : [];
        });
        const rail = [...document.querySelectorAll(".discern-worklog__entry")]
          .flatMap((entry, index, entries) => {
            const next = entries[index + 1];
            if (next === undefined) return [];
            const centre = (marker: Element) => {
              const rect = marker.getBoundingClientRect();
              return rect.top + rect.height / 2;
            };
            const segment = getComputedStyle(entry, "::after");
            const box = entry.getBoundingClientRect();
            return [{
              top: box.top + Number.parseFloat(segment.top) -
                centre(entry.querySelector(".discern-worklog__marker")!),
              bottom: box.bottom - Number.parseFloat(segment.bottom) -
                centre(next.querySelector(".discern-worklog__marker")!),
              stroke: segment.borderInlineStartWidth,
            }];
          });
        return {
          columns,
          figures,
          asides,
          textIndents,
          summaries,
          verdicts,
          stacked,
          rail,
        };
      });
      for (const { column, spread, count } of facts.columns) {
        assert(count > 1, `Fleet renders several ${column} cells`);
        assert(spread < 0.5, `${theme}: Fleet ${column} shifts ${spread}px`);
      }
      for (const figures of facts.figures) {
        assert(
          figures.includes("tabular-nums"),
          `${theme}: Fleet numeric columns use proportional figures`,
        );
      }
      assert(facts.asides.length > 0);
      for (const aside of facts.asides) {
        assertEquals(aside.lines, 1, `${theme}: "${aside.text}" wraps`);
      }
      assert(facts.textIndents.length > 0);
      for (const indent of facts.textIndents) {
        assert(
          Math.abs(indent) < 1,
          `${theme}: a text speaker's body hangs ${indent}px from its name`,
        );
      }
      assertEquals(facts.summaries.length, 2);
      for (const summary of facts.summaries) {
        assert(summary.display !== "list-item", "native marker stays hidden");
        assertEquals(summary.lines, 1, `${theme}: Evidence breaks mid-word`);
        assert(summary.clauses.length === 4, "every count clause renders");
        for (const clause of summary.clauses) {
          assertEquals(clause.lines, 1, `${theme}: "${clause.text}" splits`);
        }
        if (summary.clauses.slice(1).some(({ opensLine }) => opensLine)) {
          assert(
            summary.clipped === "clip" || summary.clipped === "hidden",
            `${theme}: a wrapped count clause opens its line with a separator`,
          );
        }
      }
      assert(facts.verdicts.length > 0);
      for (const verdict of facts.verdicts) {
        assertEquals(
          verdict.lines,
          1,
          `${theme}: "${verdict.text}" splits its glyph from its word`,
        );
        assert(
          Math.abs(verdict.endGap) < 1,
          `${theme}: "${verdict.text}" leaves the outcome column`,
        );
      }
      assert(facts.stacked.length > 0, "narrow evidence rows stack");
      for (const offset of facts.stacked) {
        assert(offset < 1, `${theme}: a stacked value staircases ${offset}px`);
      }
      assert(facts.rail.length > 0);
      for (const segment of facts.rail) {
        assertEquals(segment.stroke, "1px", `${theme}: the rail is a hairline`);
        assert(
          Math.abs(segment.top) < 0.5 && Math.abs(segment.bottom) < 0.5,
          `${theme}: a rail segment leaves a seam between marker centres`,
        );
      }
    }
  });
});

Deno.test("the evidence disclosure ring stays rounded and clear of its divider", async () => {
  await withRuntime(async (page, root) => {
    await render(page, root, "light", [{
      width: 390,
      markup: renderToStaticMarkup(
        <VerificationReport {...denseVerificationReport} />,
      ),
    }]);
    const summary = page.locator(
      ".discern-verification-report__evidence > summary",
    );
    await summary.focus();
    const ring = await summary.evaluate((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const evidence = node.parentElement!;
      const divider = evidence.getBoundingClientRect().top +
        Number.parseFloat(getComputedStyle(evidence).borderTopWidth);
      const reach = Number.parseFloat(style.outlineOffset) +
        Number.parseFloat(style.outlineWidth);
      return {
        style: style.outlineStyle,
        radius: Number.parseFloat(style.borderTopLeftRadius),
        top: rect.top - reach - divider,
        chevron: getComputedStyle(node, "::before").transitionProperty,
      };
    });
    assert(ring.style !== "none", "the summary keeps the foundation ring");
    assert(ring.radius > 0, "the summary ring is a hard square");
    assert(
      ring.top >= 0,
      `the summary ring overlaps the divider by ${-ring.top}px`,
    );
    assert(
      /border-color/.test(ring.chevron),
      "the chevron recolours without a transition",
    );
  });
});
