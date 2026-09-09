import { assert, assertEquals } from "@std/assert";
import { toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser } from "../scripts/browser.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import { catalogueExamples as cardExamples } from "../src/components/display/card/card.examples.tsx";
import { Card } from "../src/components/display/card/card.tsx";
import { Badge } from "../src/components/display/badge/badge.tsx";
import { Tag } from "../src/components/display/tag/tag.tsx";
import { Tabs } from "../src/components/navigation/tabs/tabs.tsx";
import { Breadcrumbs } from "../src/components/navigation/breadcrumbs/breadcrumbs.tsx";
import { Avatar } from "../src/components/people/avatar/avatar.tsx";
import { AvatarGroup } from "../src/components/people/avatar-group/avatar-group.tsx";
import { Persona } from "../src/components/people/persona/persona.tsx";
import { Mention } from "../src/components/people/mention/mention.tsx";
import { Byline } from "../src/components/people/byline/byline.tsx";
import { ProfileCard } from "../src/components/people/profile-card/profile-card.tsx";

const name = "Alexandrine Featherstonehaugh-Cholmondeley";
const broken = "data:image/png;base64,broken";
const labels = [
  "Overview and responsibilities",
  "Research across several regions",
  "Publication history and correspondence",
] as const;

Deno.test("content structures preserve full labels and current state within local width", async () => {
  const browser = await launchBrowser();
  const output = await Deno.makeTempDir();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: [
        "card",
        "button",
        "stack",
        "badge",
        "tag",
        "tabs",
        "breadcrumbs",
        "avatar-group",
        "persona",
        "mention",
        "byline",
        "profile-card",
      ],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const page = await browser.newPage();
    const structures = [
      ...cardExamples.map(({ id, Example }) => <Example key={id} />),
      <Card key="Card">
        <h3>{name}</h3>
        <p>Essential content before metadata and action.</p>
        <Badge tone="neutral">ResearchProgrammeCoordination</Badge>
        <Tag>InternationalCorrespondence</Tag>
        <p>
          <a href="#open">Open correspondence</a>
        </p>
        <Card raised>
          <h4>Related notes</h4>
          <a href="#notes">Read notes</a>
        </Card>
      </Card>,
      <Tabs
        key="Tabs"
        defaultValue="2"
        items={labels.map((label, index) => ({
          value: String(index),
          label,
          content: <p>{label}</p>,
        }))}
      />,
      <Breadcrumbs
        key="Breadcrumbs"
        items={labels.map((label, index) => ({ label, href: `#${index}` }))}
        current={name}
      />,
      <Persona
        key="Persona"
        name={name}
        detail="ResearchProgrammeCoordinationAcrossRegions"
        src={broken}
      />,
      <Mention key="Mention" name={name} href="#person" src={broken} />,
      <Byline
        key="Byline"
        authors={
          <>
            <Mention name={name} href="#author" />
            <Mention name="June Park" />
          </>
        }
      >
        PublicationCorrespondenceArchive
      </Byline>,
      <ProfileCard
        key="ProfileCard"
        layout="landscape"
        name={name}
        detail="ResearchProgrammeCoordination"
        bio="Works with international teams."
        links={<a href="#archive">InternationalCorrespondenceArchive</a>}
        src={broken}
      />,
      ...(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
        <AvatarGroup max={10} label={`Contributors ${size}`} size={size}>
          {Array.from(
            { length: 115 },
            (_, i) => <Avatar key={i} name={`Contributor ${i}`} size={size} />,
          )}
        </AvatarGroup>
      )),
    ];
    for (const rootSize of [16, 32]) {
      for (const width of [240, 390, 720]) {
        const html = structures.map((structure, index) =>
          `<section data-case="${index}" style="width:${width}px">${
            renderToStaticMarkup(structure)
          }</section>`
        ).join("");
        await page.setContent(
          `<html data-discern-root style="font-size:${rootSize}px"><style>${css}</style><body>${html}</body></html>`,
        );
        const failures = await page.locator("section[data-case]").evaluateAll((
          sections,
        ) =>
          sections.flatMap((section) => {
            const bounds = section.getBoundingClientRect();
            return Array.from(section.querySelectorAll<HTMLElement>("*"))
              .filter((node) => {
                if (node.closest('[aria-hidden="true"]')) return false;
                const rect = node.getBoundingClientRect();
                const style = getComputedStyle(node);
                return rect.width > 0 &&
                  (rect.right > bounds.right + 1 ||
                    rect.left < bounds.left - 1 ||
                    (node.scrollWidth > node.clientWidth + 1 &&
                      ["hidden", "auto"].includes(style.overflowX)));
              }).map((node) =>
                `${section.getAttribute("data-case")}: ${
                  node.className || node.tagName
                }`
              );
          })
        );
        assertEquals(failures, [], `${width}px local / ${rootSize}px root`);
        assertEquals(
          await page.getByRole("tab", { name: labels[2], exact: true })
            .getAttribute("aria-selected"),
          "true",
        );
        assertEquals(
          await page.locator('[aria-current="page"]').textContent(),
          name,
        );
        assertEquals(
          await page.getByRole("img", { name: "105 more", exact: true })
            .count(),
          5,
        );
        await page.getByRole("link", {
          name: "Open correspondence",
          exact: true,
        }).focus();
        assert(
          await page.getByRole("link", {
            name: "Open correspondence",
            exact: true,
          }).evaluate((node) => node === document.activeElement),
        );
        assertEquals(await page.locator("a a, button a, a button").count(), 0);
        const primary = await page.getByRole("link", {
          name: "Read correspondence",
          exact: true,
        }).boundingBox();
        const tags = await page.locator(".discern-example-row").boundingBox();
        const title = await page.getByRole("heading", {
          name: "Regional research correspondence",
          exact: true,
        }).boundingBox();
        const nested = await page.getByRole("link", {
          name: "Read field notes",
          exact: true,
        }).boundingBox();
        const nestedTitle = await page.getByRole("heading", {
          name: "Related field notes",
          exact: true,
        }).boundingBox();
        assert(primary && tags && title && nested && nestedTitle);
        assert(
          primary.y - (tags.y + tags.height) >= 8,
          "Card actions stay separated from metadata",
        );
        assert(
          Math.abs(primary.x - title.x) < 1,
          "Primary Card action follows the title alignment",
        );
        assert(
          Math.abs(nested.x - nestedTitle.x) < 1,
          "Nested Card action follows its heading alignment",
        );
        for (const label of ["Read correspondence", "Read field notes"]) {
          const target = await page.getByRole("link", {
            name: label,
            exact: true,
          })
            .boundingBox();
          assert(
            target && target.width >= 24 && target.height >= 24,
            `${label} retains a standalone action target at ${width}px / ${rootSize}px root`,
          );
        }
      }
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("photo identities retain an inert monogram when the image fails", async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(renderToStaticMarkup(
      <>
        <Avatar name={name} src={broken} />
        <Persona name="Unrelated Contributor" src={broken} />
        <Mention name="Another Contributor" src={broken} />
        <ProfileCard name="Visiting Contributor" src={broken} />
      </>,
    ));
    const avatars = page.locator(".discern-avatar");
    assertEquals(await avatars.count(), 4);
    for (const avatar of await avatars.all()) {
      assert(
        await avatar.locator("img").evaluate((image) =>
          image instanceof HTMLImageElement && image.complete &&
          image.naturalWidth === 0
        ),
      );
      assertEquals(
        await avatar.locator(".discern-avatar__monogram").count(),
        1,
      );
      assertEquals(
        await avatar.locator(".discern-avatar__monogram").getAttribute(
          "aria-hidden",
        ),
        "true",
      );
      assertEquals(await avatar.locator("img").getAttribute("alt"), "");
    }
    assertEquals(await page.getByRole("img", { name, exact: true }).count(), 1);
  } finally {
    await browser.close();
  }
});
