# Form alignment and validation

How mixed forms line up and how invalid input gets corrected. The authorities are the seven Forms Component folders under [`src/components/forms/`](../../src/components/forms/) and the geometry/journey proofs in [`form_alignment_validation_test.tsx`](../../tests/form_alignment_validation_test.tsx).

## The field-row contract

`.discern-field-row` seats several members on four shared rows — label, control, error, hint — so any mix of labelled, unlabelled, helped, and helperless members keeps every control on one line. Each `.discern-field` child spans the four rows through subgrid; any other direct child (typically a Button, or a bare labelled control such as a Select with only an `aria-label`) lands on the control row. Labels bottom-align against their controls, so a neighbour's two-line label never floats a one-line label upward, and absent labels or messages contribute no reserved space: the row is exactly as tall as its tallest occupied rows.

Columns default to equal `minmax(0, 1fr)` shares. `--discern-field-row-columns` accepts a cycling track list for deliberate mixes — `minmax(0, 2fr) minmax(0, 1fr) max-content` gives a wide field, a narrow field, and a content-hugging action. The row is deliberately one band: it shrinks members at narrow allocations but never wraps or restacks, so choose the stacked default (plain Fields in a block flow) for narrow-first layouts rather than expecting the row to collapse. A Field in a row carries exactly one control element between its label and messages.

Both surfaces of the boundary stay token-driven: control heights come from the shared `--discern-control-size-*` roles (a Button therefore sits flush beside an Input), and the label/control/message intervals use `--discern-rhythm-related` in row and stacked contexts alike.

## The validation relationship

Invalid state is the control's own fact, expressed twice and styled once: consumer-declared errors set `aria-invalid` plus a rendered message, and native constraint failures match `:user-invalid` with no JavaScript and no consumer round-trip. Field renders an error _and_ the hint together — the hint usually carries the guidance needed to correct — with the error first in DOM order and first in `aria-describedby` (`fieldDescriptionId` returns the joined value). The error message carries a visually-hidden "Error:" prefix so the distinction survives without colour.

The package never steals focus, reserves no blank message area, and keeps corrections local: an appearing or clearing message changes only the rows below the control, and the browser (for native failures) or the consumer's re-render (for server-declared errors) is responsible for carrying the entered value back — our components pass `defaultValue` through untouched. Blocked native submits focus the first invalid control; that is native behaviour the package preserves rather than replaces.

## Choice-control alignment

Checkbox and Radio share a two-column grid: the indicator column is `--discern-choice-control` wide, and label text plus description share the second column, so descriptions align with the label text at every density and zoom rather than through a fixed indent. The indicator centres against the _first line_ of the label (`(1lh − size) / 2`), which keeps multiline labels aligned; the Switch track holds to the first line the same way instead of floating beside the whole text block. Labels span the full row as one generous click target, text wraps anywhere long tokens demand it, and forced-colours mode keeps the selected radio dot and the switch thumb visible with system colours because their fills would otherwise be stripped with the background.
