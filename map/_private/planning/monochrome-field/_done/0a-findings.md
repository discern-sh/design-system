# Wave 0A monochrome field findings

This note records the hand-set review mock on `agent/field-0a-64d31d` at `c481c2fd`. It is evidence for wave 1, not a field implementation. The package runtime, token model, charts, and CLI are unchanged. The review-only presets deliberately retain two admission-proof refusals.

## Reproduce the mock

The local Catalogue base URL is [http://127.0.0.1:18262/catalogue/reviews/components/](http://127.0.0.1:18262/catalogue/reviews/components/). The server must be run from this worktree on the port returned by `discern identity --port`:

```sh
deno serve --config deno.json --host 127.0.0.1 --allow-read --port 18262 scripts/serve.ts
```

The two admission refusals have direct visual witnesses. Review [series 6 against the 0.25 canvas](http://127.0.0.1:18262/catalogue/reviews/components/?evidence=field-refusals#series-6) and [maximum ink against the 0.5 canvas](http://127.0.0.1:18262/catalogue/reviews/components/?evidence=field-refusals#ink-midpoint). The **Evidence** filter returns to this focused view without making either witness part of the package or component registry.

The review URL grammar is:

```text
?group=<group|all>
&evidence=<field-refusals> # optional focused wave-0A witness view
&component=<slug>
&example=<example-id>
&posture=<posture-id>
&width=<narrow|medium|wide>
&theme=<light|dark>
&appearance=<field-0|field-025|field-05|field-075|field-1>
&motion=ordinary
&mode=contact
&speed=production
&structure=<0.35|1|1.4>
&emphasis=<0.65|1.35>
&density=<0.8|1|1.2>
&backdrop=<canvas|card>
```

The option controls the actual polarity. `field-0` and `field-025` are light; `field-05`, `field-075`, and `field-1` are dark. The `theme` parameter exercises both resolved-theme paths, but a field preset supplies identical values to both. This is intentional: changing the theme switch cannot change a mid-field point's polarity.

The scratch layer is `catalogue/review/monochrome-field-0a-scratch.css`. It is linked only by the local component-review HTML after the runtime and review CSS. Nothing imports it from `src/`, the package build, the runtime registry, or generated output.

### High-risk component matrix

Substitute each row's group and slug into the grammar above. The Cartesian set of five appearances, all three structure levels, and all three density levels gives 45 reproducible states per component (1,080 URLs across the 24 components). Both structure extremes requested for review are therefore included, along with the default level.

| Component         | `group`      | `component`         |
| ----------------- | ------------ | ------------------- |
| Button            | `Core`       | `button`            |
| Tabs              | `Navigation` | `tabs`              |
| Badge             | `Display`    | `badge`             |
| Tag               | `Display`    | `tag`               |
| Banner            | `Feedback`   | `banner`            |
| Toast             | `Feedback`   | `toast`             |
| Dialog            | `Feedback`   | `dialog`            |
| Hover card        | `Feedback`   | `hover-card`        |
| Card              | `Display`    | `card`              |
| Table             | `Display`    | `table`             |
| Input             | `Forms`      | `input`             |
| Select            | `Forms`      | `select`            |
| Switch            | `Forms`      | `switch`            |
| Result summary    | `Workflow`   | `result-summary`    |
| Diagnostic        | `Workflow`   | `diagnostic`        |
| Meter             | `Feedback`   | `meter`             |
| Site header       | `Marketing`  | `site-header`       |
| Hero block        | `Marketing`  | `hero-block`        |
| Marketing section | `Marketing`  | `marketing-section` |
| Terminal          | `Display`    | `terminal`          |
| Code listing      | `Editorial`  | `code-listing`      |
| Data figure       | `Editorial`  | `data-figure`       |
| Chart             | `Editorial`  | `chart`             |
| Sparkline         | `Display`    | `sparkline`         |

Examples and postures remain independently selectable. Useful focused examples include `dialog/default&posture=open-dialog`, `terminal/showcase`, `code-listing/showcase`, `marketing-section/spacious-contrast`, `chart/default`, and `table/dense-overflow`.

### Whole-population contact sheets

Every link rendered 341 specimens with zero review errors. The two theme links at each point prove both resolved-theme branches while retaining the point's fixed polarity.

| Field point | Light resolution                                                                                                                                                                                                             | Dark resolution                                                                                                                                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0           | [all, light](http://127.0.0.1:18262/catalogue/reviews/components/?group=all&width=medium&theme=light&appearance=field-0&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=0.65&density=1&backdrop=canvas)   | [all, dark](http://127.0.0.1:18262/catalogue/reviews/components/?group=all&width=medium&theme=dark&appearance=field-0&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=0.65&density=1&backdrop=canvas)   |
| 0.25        | [all, light](http://127.0.0.1:18262/catalogue/reviews/components/?group=all&width=medium&theme=light&appearance=field-025&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=0.65&density=1&backdrop=canvas) | [all, dark](http://127.0.0.1:18262/catalogue/reviews/components/?group=all&width=medium&theme=dark&appearance=field-025&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=0.65&density=1&backdrop=canvas) |
| 0.5         | [all, light](http://127.0.0.1:18262/catalogue/reviews/components/?group=all&width=medium&theme=light&appearance=field-05&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=0.65&density=1&backdrop=canvas)  | [all, dark](http://127.0.0.1:18262/catalogue/reviews/components/?group=all&width=medium&theme=dark&appearance=field-05&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=0.65&density=1&backdrop=canvas)  |
| 0.75        | [all, light](http://127.0.0.1:18262/catalogue/reviews/components/?group=all&width=medium&theme=light&appearance=field-075&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=0.65&density=1&backdrop=canvas) | [all, dark](http://127.0.0.1:18262/catalogue/reviews/components/?group=all&width=medium&theme=dark&appearance=field-075&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=0.65&density=1&backdrop=canvas) |
| 1           | [all, light](http://127.0.0.1:18262/catalogue/reviews/components/?group=all&width=medium&theme=light&appearance=field-1&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=0.65&density=1&backdrop=canvas)   | [all, dark](http://127.0.0.1:18262/catalogue/reviews/components/?group=all&width=medium&theme=dark&appearance=field-1&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=0.65&density=1&backdrop=canvas)   |

## Hand-set role values

All achromatic values below are active ink over the named canvas unless marked opaque. At darkness 0 and 0.25 active ink is black; from 0.5 onward it is white, following the relative-luminance 0.179 crossover. `light` and `dark` values are identical inside each option.

The two poles reproduce the harvested seed ladder exactly. The 0.25, 0.5, and 0.75 alphas bend upward toward the crossover: contrast lost when either pigment is composited onto a middle-grey canvas has to be bought back with opacity. I stopped when the unchanged proof passed every rule that this monochrome ladder can affect. Raising alphas further cannot repair a hued series colour or make full white exceed its maximum contrast against the 0.5 canvas.

| Role                       | 0                                           | 0.25                                        | 0.5                                       | 0.75                                        | 1                                           |
| -------------------------- | ------------------------------------------- | ------------------------------------------- | ----------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| Canvas, opaque OKLab L     | 100%                                        | 75%                                         | 50%                                       | 25%                                         | 0%                                          |
| Polarity / active ink      | light / black                               | light / black                               | dark / white                              | dark / white                                | dark / white                                |
| Ink / muted / faint        | .87 / .66 / .50                             | .84 / .72 / .56                             | 1 / .82 / .60                             | .96 / .78 / .60                             | .92 / .72 / .55                             |
| Surface, opaque OKLab L    | 100%                                        | 72.7709%                                    | 53.8237%                                  | 31.3307%                                    | 18.1521%                                    |
| Sunken                     | .04                                         | .06                                         | .08                                       | .05                                         | .03                                         |
| Accent 100–800             | .05 / .09 / .17 / .32 / .52 / .82 / .93 / 1 | .07 / .12 / .22 / .39 / .68 / .86 / .96 / 1 | .12 / .18 / .28 / .44 / .80 / .82 / 1 / 1 | .08 / .13 / .22 / .39 / .66 / .86 / .96 / 1 | .06 / .10 / .18 / .34 / .55 / .85 / .94 / 1 |
| Border / strong / stripe   | .14 / .30 / .07                             | .18 / .34 / .10                             | .24 / .40 / .14                           | .19 / .35 / .11                             | .16 / .32 / .09                             |
| Success / soft / deep      | .44 / .04 / .82                             | .42 / .07 / .86                             | .34 / .12 / .90                           | .42 / .08 / .90                             | .48 / .06 / .90                             |
| Warning / soft / deep      | .62 / .07 / .78                             | .60 / .10 / .82                             | .58 / .16 / .86                           | .62 / .11 / .86                             | .66 / .09 / .86                             |
| Danger / soft              | 1 / .10                                     | 1 / .14                                     | 1 / .20                                   | 1 / .15                                     | 1 / .12                                     |
| Card / window / pop shadow | .06 / .06 / .12                             | .08 / .10 / .16                             | .12 / .16 / .22                           | .15 / .20 / .28                             | .16 / .20 / .28                             |
| Black overlay              | .38                                         | .44                                         | .50                                       | .56                                         | .62                                         |
| Inverse surface / ink      | opaque black / white                        | opaque black / white                        | opaque white / black                      | opaque white / black                        | opaque white / black                        |

The opaque surfaces are the browser-composited equivalents of a small raised wash, rather than translucent authored colours: 4% black at 0.25 and 7% white at 0.5, 0.75, and 1. The white pole cannot be raised further, so surface equals canvas there. These values make the same surface byte render identically over canvas and card.

The data series stay deliberately hued. Points 0 and 0.25 use the current light series palette; 0.5, 0.75, and 1 use the current dark series palette:

| Series | Light-palette OKLCH   | Dark-palette OKLCH    |
| ------ | --------------------- | --------------------- |
| 1      | `66.76% 0.0939 249.4` | `76.73% 0.0773 248.9` |
| 2      | `39.22% 0.1285 254.9` | `67.08% 0.1055 247.3` |
| 3      | `85.43% 0.127 91.1`   | `87.88% 0.115 93.9`   |
| 4      | `50.17% 0.1147 9.7`   | `71.49% 0.094 0.4`    |
| 5      | `58.59% 0.1197 88.6`  | `73.81% 0.1175 92.7`  |
| 6      | `77.29% 0.1036 6.7`   | `83.8% 0.0682 7.1`    |

### Admission-proof verdicts and margins

The existing proof was not edited. Because the resolved theme values match, each failure appears once prefixed `light` and once prefixed `dark`.

The margins report the closest contrast rule and closest OKLab separation rule independently; a positive value clears its floor and a negative value refuses it.

| Point | Verdict    | Closest contrast margin                 | Closest distance margin                   |
| ----- | ---------- | --------------------------------------- | ----------------------------------------- |
| 0     | pass       | series 3: 1.560 − 1.25 = **+0.310**     | success/warning: .1571 − .08 = **+.0771** |
| 0.25  | **refuse** | series 6: 1.035 − 1.25 = **−.215**      | success/warning: .1137 − .08 = **+.0337** |
| 0.5   | **refuse** | primary ink: 6.000 − 7 = **−1.000**     | accent/danger: .0844 − .08 = **+.0044**   |
| 0.75  | pass       | focus on danger: 5.401 − 3 = **+2.401** | series 1/2: .1006 − .09 = **+.0106**      |
| 1     | pass       | focus on danger: 5.886 − 3 = **+2.886** | series 1/2: .1006 − .09 = **+.0106**      |

The exact refusal strings are:

```text
light series-6 vanishes on canvas 1.04:1
dark series-6 vanishes on canvas 1.04:1
light --discern-color-ink on canvas 6.00:1
dark --discern-color-ink on canvas 6.00:1
```

They are visually reviewable together on the [focused proof-refusal sheet](http://127.0.0.1:18262/catalogue/reviews/components/?evidence=field-refusals). The sheet renders the actual token values rather than copied swatch colours, and explains that the `light` and `dark` lines are identical resolved-theme paths rather than four different visual failures.

The 0.25 refusal belongs to the fixed hued series palette, not the monochrome rungs. The 0.5 refusal is a physical limit: full white against this canvas is 6.00:1, so no higher alpha exists. Wave 1 should encode the programme's existing “7:1 where the canvas allows” clause explicitly as a maximum-attainable-contrast condition; it must not silently lower the ordinary primary-ink floor.

## Inversion threshold

I compared canvas-polarity active ink and opposite-polarity paper ink on every accent fill. “Pass” here means 4.5:1 for normal text. The loudest rung that can still carry canvas-polarity text moves with the field; therefore no fixed accent rung is a safe action threshold.

| Point | Canvas-polarity contrast on 100…800                      | Loudest canvas-text rung | Paper text necessary from        |
| ----- | -------------------------------------------------------- | ------------------------ | -------------------------------- |
| 0     | 18.80 / 17.15 / 14.12 / 9.40 / 4.92 / 1.54 / 1.12 / 1.00 | 500                      | 600                              |
| 0.25  | 8.18 / 7.36 / 5.89 / 3.88 / 1.78 / 1.19 / 1.04 / 1.00    | 300                      | 400                              |
| 0.5   | 4.56 / 4.00 / 3.24 / 2.39 / 1.32 / 1.28 / 1.00 / 1.00    | 100                      | 200; paper already passes at 100 |
| 0.75  | 12.59 / 10.64 / 7.78 / 4.42 / 2.08 / 1.32 / 1.08 / 1.00  | 300                      | 400                              |
| 1     | 19.13 / 17.49 / 13.60 / 7.26 / 3.35 / 1.41 / 1.14 / 1.00 | 400                      | 500                              |

For comparison, paper-polarity contrast on 100…800 is:

| Point | Paper-polarity contrast on 100…800                        |
| ----- | --------------------------------------------------------- |
| 0     | 1.12 / 1.22 / 1.49 / 2.23 / 4.27 / 13.60 / 18.76 / 21.00  |
| 0.25  | 2.57 / 2.85 / 3.57 / 5.41 / 11.80 / 17.70 / 20.15 / 21.00 |
| 0.5   | 4.61 / 5.26 / 6.47 / 8.80 / 15.88 / 16.35 / 21.00 / 21.00 |
| 0.75  | 1.67 / 1.97 / 2.70 / 4.75 / 10.09 / 15.91 / 19.46 / 21.00 |
| 1     | 1.10 / 1.20 / 1.54 / 2.89 / 6.27 / 14.84 / 18.38 / 21.00  |

The proposed law is the ADR's action pair, not another magic rung: primary action fill is full active ink and its text is the opposite pigment. The [Button comparison](http://127.0.0.1:18262/catalogue/reviews/components/?group=Core&component=button&width=medium&theme=dark&appearance=field-05&motion=ordinary&mode=contact&speed=production&structure=1.4&emphasis=1.35&density=1&backdrop=canvas) shows the inverted primary beside secondary, ghost, danger, and unavailable states at the hardest field point.

## Surface findings

The opaque experiment confirms the backdrop rule but exposes a second missing law.

- Dialog, Toast, Hover card, and any other floating/raised surface must resolve to an opaque colour before painting. Canvas is necessarily opaque. Full action and inverse fills must also be opaque.
- A card or other owned base surface should be opaque when it may itself become a backdrop. Canvas-contract sunken wells may remain translucent. Borders, dividers, stripes, shadows, hover/selected/current ink, and quiet semantic washes can remain translucent only when the component owns a known opaque backdrop under them.
- Opaqueness removes backdrop drift but not same-tier collapse. At 0.5 the Card and Dialog both resolve to `oklch(53.8237% 0 0)`, so the dialog is identical over canvas and card but disappears into the card except for border and shadow. Compare [Dialog over canvas](http://127.0.0.1:18262/catalogue/reviews/components/?group=Feedback&component=dialog&example=default&posture=open-dialog&width=medium&theme=dark&appearance=field-05&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=0.65&density=1&backdrop=canvas) with [Dialog over Card](http://127.0.0.1:18262/catalogue/reviews/components/?group=Feedback&component=dialog&example=default&posture=open-dialog&width=medium&theme=dark&appearance=field-05&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=0.65&density=1&backdrop=card). The same comparison is reproducible for [Toast over canvas](http://127.0.0.1:18262/catalogue/reviews/components/?group=Feedback&component=toast&width=medium&theme=dark&appearance=field-05&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=0.65&density=1&backdrop=canvas), [Toast over Card](http://127.0.0.1:18262/catalogue/reviews/components/?group=Feedback&component=toast&width=medium&theme=dark&appearance=field-05&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=0.65&density=1&backdrop=card), [Hover card over canvas](http://127.0.0.1:18262/catalogue/reviews/components/?group=Feedback&component=hover-card&example=default&posture=focus-disclosure&width=medium&theme=dark&appearance=field-05&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=0.65&density=1&backdrop=canvas), and [Hover card over Card](http://127.0.0.1:18262/catalogue/reviews/components/?group=Feedback&component=hover-card&example=default&posture=focus-disclosure&width=medium&theme=dark&appearance=field-05&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=0.65&density=1&backdrop=card).

**Proposed law:** define opaque elevation tiers, not one universal raised colour. A floating tier must differ from the opaque tier it can cover; its essential edge must also survive low structure. This law should cover Toast and Hover card as well as Dialog.

## What the eye rejected

### Hued series can vanish inside the monochrome field

At 0.25, series 6 is only 1.04:1 against canvas. The [focused six-series witness](http://127.0.0.1:18262/catalogue/reviews/components/?evidence=field-refusals#series-6) places all six unoutlined marks on the actual canvas, so the failure can be judged directly. The [default chart](http://127.0.0.1:18262/catalogue/reviews/components/?group=Editorial&component=chart&example=default&width=wide&theme=light&appearance=field-025&motion=ordinary&mode=contact&speed=production&structure=0.35&emphasis=0.65&density=1&backdrop=canvas) keeps the desired hue-in-mono identity in component context. The [Sparkline set](http://127.0.0.1:18262/catalogue/reviews/components/?group=Display&component=sparkline&width=medium&theme=light&appearance=field-025&motion=ordinary&mode=contact&speed=production&structure=0.35&emphasis=0.65&density=1&backdrop=canvas) shows the compact one-series case and keeps its non-colour trend label.

**Proposed law:** every fixed series colour must clear the canvas floor at every sampled field point, or the renderer must supply an equally deterministic contrast outline/marker witness. Do not recolour the series into monochrome and do not waive the fixed-order marker witnesses.

### Severity opacity is readable only where another witness already exists

[Banner](http://127.0.0.1:18262/catalogue/reviews/components/?group=Feedback&component=banner&width=medium&theme=dark&appearance=field-05&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=1.35&density=1&backdrop=canvas), [Toast](http://127.0.0.1:18262/catalogue/reviews/components/?group=Feedback&component=toast&width=medium&theme=dark&appearance=field-05&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=1.35&density=1&backdrop=canvas), [Badge](http://127.0.0.1:18262/catalogue/reviews/components/?group=Display&component=badge&width=medium&theme=dark&appearance=field-05&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=1.35&density=1&backdrop=canvas), [Result summary](http://127.0.0.1:18262/catalogue/reviews/components/?group=Workflow&component=result-summary&width=medium&theme=dark&appearance=field-05&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=1.35&density=1&backdrop=canvas), and [Diagnostic](http://127.0.0.1:18262/catalogue/reviews/components/?group=Workflow&component=diagnostic&width=medium&theme=dark&appearance=field-05&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=1.35&density=1&backdrop=canvas) remain understandable where words, icons, or glyphs carry the state. Their fill alphas alone are too similar to identify reliably. The [Meter set](http://127.0.0.1:18262/catalogue/reviews/components/?group=Feedback&component=meter&width=medium&theme=dark&appearance=field-05&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=1.35&density=1&backdrop=canvas) is the negative control: the scratch layer gives quarter/complete different severity opacities, but the bars have no named non-colour severity witness.

**Proposed law:** a semantic tone API must enroll a visible word, icon/glyph, or shape witness. Opacity is hierarchy, not meaning. Meter needs a textual or shape witness when it is used semantically; a differently dark fill is insufficient.

### Low structure removes operational boundaries before decorative ones

The [Table at structure 0.35](http://127.0.0.1:18262/catalogue/reviews/components/?group=Display&component=table&width=medium&theme=light&appearance=field-025&motion=ordinary&mode=contact&speed=production&structure=0.35&emphasis=0.65&density=0.8&backdrop=canvas) nearly loses its row dividers and outer boundary; stripe fill survives longer. [Tabs](http://127.0.0.1:18262/catalogue/reviews/components/?group=Navigation&component=tabs&width=medium&theme=light&appearance=field-025&motion=ordinary&mode=contact&speed=production&structure=0.35&emphasis=0.65&density=0.8&backdrop=canvas), [Input](http://127.0.0.1:18262/catalogue/reviews/components/?group=Forms&component=input&width=medium&theme=light&appearance=field-025&motion=ordinary&mode=contact&speed=production&structure=0.35&emphasis=0.65&density=0.8&backdrop=canvas), [Select](http://127.0.0.1:18262/catalogue/reviews/components/?group=Forms&component=select&width=medium&theme=light&appearance=field-025&motion=ordinary&mode=contact&speed=production&structure=0.35&emphasis=0.65&density=0.8&backdrop=canvas), and [Switch](http://127.0.0.1:18262/catalogue/reviews/components/?group=Forms&component=switch&width=medium&theme=light&appearance=field-025&motion=ordinary&mode=contact&speed=production&structure=0.35&emphasis=0.65&density=0.8&backdrop=canvas) show the same risk around selection and affordance boundaries. Native controls at the [0.5 point](http://127.0.0.1:18262/catalogue/reviews/components/?group=Forms&component=input&width=medium&theme=light&appearance=field-05&motion=ordinary&mode=contact&speed=production&structure=1&emphasis=0.65&density=1&backdrop=canvas) correctly follow the point's dark `color-scheme`, even when `theme=light` is in the URL.

**Proposed law:** structure may fade decoration, but must not erase the boundary or state witness of an interactive or operational control. Classify structural roles as optional or essential; essential structure retains a contrast floor or an independent witness. Density may scale spacing, but hit targets retain their minimum size.

### Large inverse regions overpower the field at the crossover

At 0.5 the [Marketing contrast section](http://127.0.0.1:18262/catalogue/reviews/components/?group=Marketing&component=marketing-section&example=spacious-contrast&width=wide&theme=dark&appearance=field-05&motion=ordinary&mode=contact&speed=production&structure=0.35&emphasis=0.65&density=1&backdrop=canvas) becomes a full white slab with black text. The [Hero block](http://127.0.0.1:18262/catalogue/reviews/components/?group=Marketing&component=hero-block&example=showcase&width=wide&theme=dark&appearance=field-05&motion=ordinary&mode=contact&speed=production&structure=0.35&emphasis=0.65&density=1&backdrop=canvas) shows that hierarchy can be expressed without turning an entire section into an action inversion.

**Proposed law:** reserve the action pair for actions and small, explicit inverse scopes. Large editorial/marketing contrast regions should use an opaque field surface tier, not the action inversion. This avoids a visually discontinuous slab when polarity crosses, without putting hysteresis into token evaluation.

### Inverse containers need descendant roles

The [Terminal showcase](http://127.0.0.1:18262/catalogue/reviews/components/?group=Display&component=terminal&example=showcase&width=wide&theme=dark&appearance=field-05&motion=ordinary&mode=contact&speed=production&structure=0.35&emphasis=0.65&density=1&backdrop=canvas) also becomes a white slab at 0.5. Its canvas-oriented semantic window dots are white on that inverse surface and nearly disappear. The [Code listing showcase](http://127.0.0.1:18262/catalogue/reviews/components/?group=Editorial&component=code-listing&example=showcase&width=wide&theme=dark&appearance=field-05&motion=ordinary&mode=contact&speed=production&structure=0.35&emphasis=0.65&density=1&backdrop=canvas) has the same general risk for any state ink nested in an inverse panel.

**Proposed law:** an inverse scope must remap every descendant ink role it admits, including semantic and structural roles. A container cannot change only its background and text colour while leaving canvas-oriented descendants behind.

## CLI pole mock

The CLI proof is deliberately in-process and review-only; `src/cli/theme.ts` is unchanged. It maps faint and annotation bands to ANSI dim, strong/display bands to bold, and derives black/white foreground and background from the two poles. Run:

```sh
deno run --config deno.json catalogue/review/monochrome-field-0a-cli.ts light
deno run --config deno.json catalogue/review/monochrome-field-0a-cli.ts dark
```

Each command renders Result summary, Diagnostic, and Table through the real CLI renderers. The achromatic terminal retains meaning because the existing glyphs, words, rules, dim, and bold do the semantic work; hue is not required at either pole.

## Recommendations for the maintainer-held decisions

1. **Accept an achromatic default terminal identity.** The pole mock remains legible and recognisably discern when faint maps to dim, strong maps to bold, and glyph/word witnesses stay mandatory. Do not add a package-level terminal accent. If discern the product later needs brand differentiation, the consumer repository can decide that independently at wave 4.
2. **Let the blue preset keep achromatic neutrals.** The failures found here are contrast, elevation, inverse scoping, and missing witnesses—not lack of a tinted neutral. Adding neutral hue/chroma axes now would enlarge the law without evidence. Revisit only if a consumer demonstrates a real neutral-tint need.
3. **Use these hand-set numbers as curve targets, not constants.** Keep the exact harvested pole values. The middle samples above are visually credible starting points, but wave 1 must derive continuous alphas from contrast floors and must encode the unattainable 7:1 interval honestly. The two proof refusals are inputs to that derivation, not reasons to waive a guard.

## Verification and scope

- All ten whole-population contact sheets rendered 341 items with zero review errors.
- The focused Catalogue tests passed: 16 passed, 0 failed.
- `deno task build` produced 140 components and 93 tokens.
- Both CLI pole commands type-checked and rendered.
- No file under `src/`, no generated output, no proof, and no standard changed.
- This worktree is throwaway. It must not run `discern_accept` or land on `main`.

## Maintainer sign-off

Signed off on 2 September 2026 with two conditions for wave 1:

1. Wave 1 must fix the indistinguishable chart colour, or charts must provide a contrast outline or marker witness.
2. The 7:1 primary-ink ratio must be maintained wherever attainable; around the polarity crossover, the field must use the maximum contrast the pigment pair can produce.

This approves the visual direction and the derived-law recommendations. It does not admit either proof refusal as shippable behaviour.
