# Textures

`grain.png` is the one texture the package ships: a 200 × 200 px tileable film grain used only by the `discern-grain-wash` utility. That utility paints a soft accent wash behind a hero or showcase region (a radial `discern-color-accent-300` glow over a `discern-color-accent-200` to `discern-color-canvas` fade) and then lays this tile over it at `background-size: 200px 200px`, `mix-blend-mode: overlay`, `opacity: 0.38`, with `pointer-events: none`.

Use it sparingly and only over a wash, never over text directly, never as a page background, and never as a substitute for a real photograph. Dark theme keeps the same tile; the wash beneath it dims through `discern-backdrop-theme-gain` (1 light, 0.78 dark).
