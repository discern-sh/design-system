# Field appearance programme

Briefs for the corrective programme between the completed [monochrome field](../monochrome-field/README.md) package work and its deferred site adoption. The field remains the authority and the default identity. This programme makes a chromatic appearance a projection of the same laws, makes Field and chromatic appearances symmetrically scopeable on browser and terminal subtrees, restores opt-in terminal colour without changing monochrome defaults, and fixes the two visual defects exposed by the first full component sweep.

This is a dedicated programme rather than a renumbering of monochrome-field 4A. That brief is a cross-repository adoption step whose stable name is already useful; these changes all belong to the package and must land before 4A can be dispatched. The programme slug is `appearance`, and every brief carries its literal `discern_start` name.

## Why this programme exists

The monochrome-field work proved the right foundation but exposed four consequences that are internally consistent and externally awkward:

- the optional accent layer is implemented as a Blue-specific static light/dark role table, so Darkness and Emphasis stop reaching the roles it overrides and other hues are only partially admitted;
- the runtime selects the named Blue preset for an entire emitted root and publishes no supported nested scope, even though inherited custom properties make local scoping the natural model;
- the terminal authority evaluates only the achromatic field poles, so the existing renderer population lost semantic hue even though its witnesses and colour-depth machinery remain;
- the primary action shadow can converge with its fill, and the field Avatar stops are translucent enough for overlapping initials to show through.

The terminal regression is concentrated rather than a lost implementation. Compared with tag `v0.29.0`, 109 current Component CLI renderers are still in place and only the newly added Meter renderer differs in the Component population. Ninety-six unchanged CLI test files remain. Commit `574b75d5` replaced the shared colour resolver in `src/cli/theme.ts` with pole-only field evaluation; it did not rewrite the renderer fleet. Wave 2A therefore recovers a proven capability through the new authority instead of reverting the field.

## Fixed programme contracts

| Fact           | Contract                                                                                                                                                                                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| One law        | Field role relationships, axes, chromatic projection, TypeScript evaluation, and CSS projection derive from one authored graph. A generated pole pair may remain for compatibility; a second hand-written light/dark role table may not.                                                                                                                           |
| Axes           | Palette and axes are orthogonal. Darkness, Structure, Emphasis, and Density keep the same meaning in Field and chromatic appearances. Choosing an appearance never discards a field point.                                                                                                                                                                         |
| Identity       | Field is the achromatic default. Accent is the chromatic appearance and accepts any finite hue in the full circular `0–360` domain (`360` aliases `0`). Blue is the named hue-255 compatibility preset/export, not a separate appearance law or the only admitted chromatic choice. Series colours remain outside the field.                                       |
| Inversion      | Primary action fill/content remains the action pair in every appearance. A chromatic action is still an inversion, not the former quiet wash with deep text. Its hard shadow stays visibly distinct from both fill and backdrop.                                                                                                                                   |
| Surfaces       | Avatar identity fills and every other owned or floating surface are opaque at the point of use. Decorative paint may remain translucent only over an owned opaque base.                                                                                                                                                                                            |
| Browser scope  | A public namespaced appearance scope applies Field or Accent to one root or subtree; an Accent scope carries or inherits its hue. Accent inside Field, Field inside Accent, and one Accent hue inside another are supported, nest safely, and inherit surrounding axes unless explicitly overridden. No Component gains an appearance-specific stylesheet or prop. |
| Terminal scope | Terminal ground (`light`/`dark`) and appearance (`field` or `accent` plus hue) are independent caller inputs. The presenter may bind a default; one renderer or composed subtree may override appearance or hue in either direction. State is explicit and pure, never ambient or global.                                                                          |
| Compatibility  | Existing calls and emitted output that do not opt into colour remain byte-for-byte monochrome. Existing terminal witnesses, no-colour output, public role names, and framework-neutral graphs remain intact. Any migration of the runtime `theme` option is additive where possible and recorded where not.                                                        |
| Proof          | The signed field points, both poles, the complete integer hue circle plus fractional/boundary cases, both scope directions, truecolour, ANSI 256, ANSI 16, no-colour, Unicode, ASCII, and representative nested compositions are guarded. A future role or renderer enrols automatically.                                                                          |

These contracts deliberately supersede two conclusions in [ADR 0040](../../../_adr/0040-derive-the-theme-from-a-monochrome-field.md): chroma no longer stays an authored Blue-only static pair, and the terminal may receive an explicit hue-parameterised Accent appearance. Wave 1A records the replacement decision before implementing it. The field default, action inversion, opaque surfaces, non-colour witnesses, and the one-law/two-projection rule remain binding.

## Waves and dispatch order

| Key | Brief                                                                                   | Shape                                                                      | Starts when                                                    | Landing order                                                |
| --- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| 1A  | [Project chroma and make appearances scopeable](_done/1a-chromatic-field-and-scopes.md) | One architectural agent                                                    | This planning package and monochrome-field 3A/3B are on `main` | Sole wave-1 stream                                           |
| 2A  | [Restore opt-in terminal colour and local appearance](2a-terminal-appearance.md)        | One coordinator; up to four disjoint Component bundles inside its worktree | 1A has landed                                                  | Second in wave 2; brings 2B beneath it with `discern_update` |
| 2B  | [Put the field in the global Catalogue Appearance control](2b-catalogue-appearance.md)  | One Catalogue agent                                                        | 1A has landed; runs beside 2A on disjoint files                | First in wave 2                                              |
| 3A  | [Integrate, prove, and capture both surfaces](3a-cross-surface-integration.md)          | One integration agent                                                      | 2A and 2B have landed                                          | Sole wave-3 stream                                           |

This is an independently landed sequence. Dispatch 1A alone. After it lands, dispatch 2A and 2B together; 2B lands first, and 2A uses the `discern-await-the-fleet` procedure if necessary, then runs `discern_update` before its final gate. Dispatch 3A only after both wave-2 briefs are in `_done/` on `main`. The original monochrome-field 4A remains blocked until a package release containing this programme is published and selected by the owner.

Expected topology: four owner-dispatched sessions and four worktrees, with peak cross-worktree concurrency of two. Wave 2A may use up to four sub-agents inside its own worktree after its coordinator establishes the shared terminal API; those sub-agents edit only their assigned Component folders.

## Ownership seams

| Stream | Owns                                                                                                                                                                                                    | Explicitly leaves alone                                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1A     | `src/tokens/**`, `src/theme/**`, `src/runtime.ts`, `src/manifest.ts`, token/theme/runtime and shared field-intent conformance tests, the replacement ADR, `map/10-tokens-themes/`, its changelog record | Component CSS and TSX, `src/cli/**`, Component CLI renderers, Catalogue UI, generated imagery           |
| 2A     | `src/cli/**`, Component `*.cli.ts` and CLI-only shared helpers, CLI chart/diagram projections, CLI tests, `map/70-cli/`, its changelog record                                                           | Token/theme/runtime laws, browser Component files, all `catalogue/**` files, imagery                    |
| 2B     | Catalogue appearance state and controls, the Field page, Builder appearance adapters, Catalogue styles and browser checks, `map/60-catalogue/`                                                          | `src/**`, terminal projection/preview files, Component files, imagery, changelog                        |
| 3A     | Catalogue terminal integration, cross-surface conformance, generated output, canonical imagery, the authored add-component skill, final maps/changelog reconciliation                                   | Redesigning the landed field or terminal authorities, the sibling discern repository, a package release |

Generated outputs belong to the stream whose authored inputs require them, but are always regenerated. No stream hand-edits generated files or images.

## Acceptance matrix

| Dimension        | Evidence required                                                                                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chromatic field  | Browser CSS and TypeScript evaluation agree at the poles, 0A midpoints, and crossover neighbours for Field and arbitrary Accent hues; Structure and Emphasis visibly reach both.               |
| Actions          | Primary actions remain inverted and their edge and hard shadow remain perceptually distinct from fill and canvas in every sampled appearance.                                                  |
| Avatars          | Monogram interiors compute opaque and remain visually stable over canvas, raised surfaces, and overlaps in Field and representative Accent hues.                                               |
| Browser scopes   | Field → Accent(hue A) → Field and Accent(hue A) → Field/Accent(hue B) nesting resolve the intended roles while inherited axes remain unchanged.                                                |
| Terminal scopes  | A monochrome presenter can colour one call, a chromatic presenter can neutralise one call, composed children inherit intentionally, and defaults remain byte-identical.                        |
| Capability depth | Accent and semantic roles are projected from arbitrary hues through truecolour, ANSI 256, and ANSI 16; no-colour removes styling while every visible witness survives.                         |
| Catalogue        | Every route exposes the compact Field controls, palette and axes persist independently, component pages update live, and web and CLI previews reflect the same chosen appearance.              |
| Delivery         | Canonical imagery is regenerated once after integration; the maps, authored skill, ADR, and Unreleased changelog describe the final contract; every Gate is green without a loosened standard. |

## Landing authority

`[acceptance].pre_authorized` is empty when these briefs are written. Every landing stream finishes on a clean committed HEAD, runs `discern_done`, then calls `discern_accept`. A recorded grant may land it; without one, acceptance must refuse without mutation and the agent reports the proof line, branch, and worktree for owner review. Prose in this programme is not landing consent.

Each stream moves its own brief into `_done/` in its final commit. This planning package must land before 1A is dispatched.

## Adversarial review loop

When a stream reports green, review its diff and gate evidence rather than its summary. In particular, look for a static Blue table surviving behind a new helper, a hidden safe-hue allow-list instead of the full circle, semantic families collapsing into a nearby Accent hue, appearance state duplicated between browser and terminal, axes or hue dropped at nested scopes, terminal defaults silently becoming coloured, a local Button or Avatar patch, an ANSI-depth test that only proves “some escape code,” or a Catalogue control whose URL/storage state no longer round-trips. Re-read the next unstarted brief after every landing and amend stale anchors before dispatch.
