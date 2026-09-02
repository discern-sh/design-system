# 4A — Adopt the field on discern.sh and the homepage

**Goal:** Make discern's public surfaces wear the field: the brand record names monochrome as the identity, every site bundle selects the achromatic default, the documentation pages hold at both poles, and the homepage drives darkness from scroll so the page itself demonstrates the system instead of describing it.

**Wave:** 4. Runs in the discern repository at `/Users/jack/Sites/discern`, under that project's own instructions and gate. Starts only after a release of `@discern-sh/design-system` containing waves 1A to 3B is published and the maintainer has said which version to pin.

You own `4A` only. Do not edit the design-system package; a defect found in it is reported with a reproducible URL.

## Orient, verify the prerequisites, then re-root

From `/Users/jack/Sites/discern`, call `discern_status`. Verify that the named release exists on JSR and exports `./theme/blue` and the field authority, and that the design-system planning package's `_done/` folder in `/Users/jack/Sites/discern-design-system/map/_private/planning/monochrome-field/` holds 1A, 1B, 2A, 3A, and 3B. Call `discern_start` with the literal name **`field-4a`** and `path` inside the discern repository, re-root every file and shell operation into its returned absolute `data.path`, and pass that path to every later discern tool.

Only after re-rooting, read:

- that repository's `AGENTS.md` and instruction sources, its design principles, and its brand documents, especially `project/map/_internal/brand/visual-identity.md` and the registry that generates it under `scripts/brand/`, plus `_private/brand/website-brief.md` for the artifact-first rule and the imagery exclusions;
- `site/design_system.ts`, `site/theme.ts`, `site/page-src/landing.tsx` and `clarity-first.tsx` with their CSS and script, the docs and map page renderers, and the SEO and smoke checks;
- `/Users/jack/Sites/discern-design-system/map/_adr/0040-derive-the-theme-from-a-monochrome-field.md` and the token map page of the pinned release, for the mid-field recipe and the browser support floor.

## Background

The design system now derives every colour role from a monochrome field with light and dark as its poles, an action pair for inversion, structure and density axes, and the blue accent as an opt-in preset. The brand record still names blue as the identity colour, the site bundles still select the old default theme name, and the homepage is a static editorial composition that the maintainer has long felt reads as generic. The mark ◮ is filled versus unfilled, inverting with the reader's theme; the field is that mark applied to the whole surface. Scroll-driven darkness is a homepage gesture only a continuous axis makes possible: the page opens as paper, becomes ink as the reader descends, and the polarity flips at the moment the mark appears. It must remain truthful under reduced motion and hold the artifact-first content rule.

## Deliverables

### 1. The brand record

Change the brand registry so the visual identity names monochrome, ink and paper with alpha as hierarchy and inversion as emphasis, as the identity, with blue as a preset the product may use for coordinated surfaces if it chooses. Regenerate the brand documents through that repository's codegen; never hand-edit the generated page. Keep the mark, the Sierpiński rules, and the monospace reservation as they are. Record the change as an ADR in that repository if its instructions call for one.

### 2. Pin and select

Pin the named release in `deno.json`. Select the achromatic default in every bundle of `site/design_system.ts`, keeping the pre-paint theme bootstrap for the poles. Rebuild and run the smoke crawl, SEO checks, and accessibility checks; every docs and map page must hold at both poles with the workflow components' witnesses visible.

### 3. The homepage

Rework the landing composition on the field. Drive `--discern-darkness` from a scroll timeline over the page's length with a still posture for reduced motion that picks one pole and loses nothing; set the colour scheme the polarity implies at the flip; place the flip at the mark's moment. Use low structure for the editorial opening and raise it where real artifacts appear, because those are the evidence. Content stays artifact-first: the proof line, gate results, and the map are the visuals; no simulated dashboard, glowing anything, or decorative field art. Keep the page static HTML and CSS; a scroll timeline is CSS, and any script the bootstrap already ships is the ceiling.

### 4. Records

Update that repository's map and changelog as its instructions require, and note in the site's own documentation how a page selects a field point.

## Constraints

- Follow the discern repository's instructions, gate, and landing rules; this brief adds no exception.
- Do not fork or override component CSS on the site; the field is consumed through the axes and the theme attribute only.
- Reduced motion, forced colours, and the pre-paint theme bootstrap remain correct at both poles.
- Commit in focused steps: brand record, pin and bundles, homepage, records.

## Out of scope

- Any change to `@discern-sh/design-system`; report defects with URLs.
- New marketing pages or campaigns beyond the homepage.
- The terminal identity of the discern CLI beyond what the pinned release yields; if the maintainer wants a terminal accent, that is a separate decision in that repository.

## Definition of done

- The brand record names monochrome as the identity and is regenerated, not hand-edited.
- The site pins the release, selects the achromatic default, and passes its crawl, SEO, and accessibility checks at both poles.
- The homepage drives darkness from scroll with a truthful reduced-motion posture and artifact-first content, and reads as discern's rather than as a generic editorial page.
- That repository's gate is green on the clean committed HEAD, and its landing rule is followed: report the proof line and the `field-4a` branch and worktree and stop for owner review unless a recorded grant lands it.
- In the final commit, move this brief from `/Users/jack/Sites/discern-design-system/map/_private/planning/monochrome-field/4a-site-adoption-and-homepage.md` to that folder's `_done/`; because the brief lives in the design-system repository, land that move as a small separate worktree there, or ask the maintainer to move it.
