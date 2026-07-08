# Conversion Notes — Epicycles Demonstrator

## Behavior model (one paragraph)

Three objects sit in the plane: a **yellow** object at the origin, a **blue**
object on a circular orbit of radius 85, and a **red** object on a circular orbit
of radius 200. Both orbit the yellow object; their periods obey Kepler's third law
(`T = (r/r_blue)^1.5`), so blue completes one revolution per unit of system time and
red takes `(200/85)^1.5 ≈ 3.609` units. A dropdown lets the user pick which object
is held **fixed** ("keep the … fixed"): the whole system is then translated so the
chosen object stays at the center, and the apparent paths of the *other two* objects
are traced in fading **red** lines. With the yellow object fixed the traced paths are
simple circles (the heliocentric view); with blue or red fixed they become looping
**epicycles** (the geocentric view) — demonstrating that, for circular orbits, the
two models are predictively equivalent. An "animation speed" slider scales elapsed
wall-clock time into system time; there is no other interaction (nothing is
draggable).

## Source of truth

Decompiled with JPEXS/FFDec from `pathTracer005.swf`. The `scripts/` folder in the
delivered decompile was empty, so ActionScript was re-exported directly from the SWF
(`ffdec-cli -export script`). Ground-truth AS files:

- `Path Tracing Demo 1.as` — `PathTracingDemo1Class` (all physics + path tracing)
- main-timeline `frame_1/DoAction.as` — the `onEnterFrame` time driver
- `Slider v4 Component` init — speed range/precision
- ComboBox init — the reference-frame options
- `texts/185.txt` — the on-screen description (used verbatim)

Original stage: 875×600, 30 fps.

## Constants & formulas (verbatim from the AS)

| Quantity | Value | Source |
|---|---|---|
| Blue orbital radius (`ball2OrbitalRadius`) | `85` | Path Tracing Demo 1.as |
| Red orbital radius (`ball3OrbitalRadius`) | `200` | Path Tracing Demo 1.as |
| Anomaly at epoch (blue, red) | `0`, `0` | Path Tracing Demo 1.as |
| Red period | `Math.pow(200/85, 1.5)` ≈ `3.609247006340567` | Kepler's 3rd law |
| Ring-buffer length (`lineSegments`) | `120` | Path Tracing Demo 1.as |
| `maxTimeStep` / `minTimeStep` | `0.025` / `0.003` | incrementTime |
| Path/trace color | `16711680` = `#ff0000` | incrementTime `lineStyle` |
| Orbit-circle color | `0` = `#000000`, 1px | drawCircle `lineStyle` |
| Speed slider range / init | `0 … 0.002`, init `0.0005` | Slider v4 init |
| Position formula | `x = r·cos(θ)`, `y = −r·sin(θ)` (screen-Y-down) | setTime/incrementTime |

`incrementTime(arg)` is ported line-for-line, including two faithful quirks:
1. **Sub-threshold drop** — if `|arg| < 0.003`, the call returns without advancing
   `systemTime`; the main loop still advances `timeLast`, so very low speeds freeze
   (the slider bottom = fully stopped).
2. **One-step lag** — the balls are drawn at the last *sub-step* position
   (`t = t0 + (numSteps−1)·stepSize`), one `stepSize` behind the new `systemTime`.
   Preserved rather than "fixed" for exact parity.

The alpha fade (`alphaStep = 100/120`, indexed off `currentSegment`) is reproduced
exactly: the freshest segment is opaque, fading to ~0 for the oldest.

## AS → HTML5 mapping

| ActionScript | HTML5 |
|---|---|
| `onEnterFrame` + `getTimer()` | single `requestAnimationFrame` loop + `performance.now()` |
| `attachMovie("Yellow/Blue/Red Ball", …)` | reused exported vector shapes drawn with `ctx.drawImage` |
| code-drawn orbit circles (`drawCircle` / `curveTo`) | `ctx.arc` (endorsed equivalent) |
| 120 `createEmptyMovieClip` path segments | a 120-slot ring buffer rendered from state |
| `_x/_y/_alpha` on clips | properties applied at draw time / `globalAlpha` |
| ComboBox (`FComboBox`) | native `<select>` |
| `Slider v4 Component` (`FUIComponent`) | native `<input type="range">` (0–100% → 0–0.002) |
| `_root.test.setCenter(combo.getValue())` | `setCenter(select.value)` on `change` |
| Flash chrome / ClassAction masthead | KL-UNL `<kl-unl-masthead>` (Reset/Help/About) |
| `trace(...)` | dropped |

The Flash component framework (`FUIComponent`, `FScrollBar`, `FComboBox`, the
`Slider v4` internals) was **not** ported; only its observable behavior is
reproduced with native accessible controls.

## Assets reused (not redrawn)

The three balls are exported vector circles (radius 5). Copied into `assets/` and
drawn with `drawImage`:

- `shapes/1.svg` → `assets/ball-yellow.svg` (`#ffcc00`)
- `shapes/3.svg` → `assets/ball-blue.svg` (`#3300ff`)
- `shapes/5.svg` → `assets/ball-red.svg` (`#ff0000`)

Only the genuinely code-drawn geometry (orbit circles, traced paths) is redrawn on
the canvas, per the asset-reuse preference order.

## contents.json entry

This sim's entry already existed in the shared `foundation/contents.json` under the
key **`pathtracer`** (title *"Epicycles Demonstrator"*, version 2.0, with Help and
About text). No new entry was added; the foundation was copied in unchanged **except**
for the JSON-validity fix below.

### Foundation `contents.json` validity fix (agreed with the user)

As delivered, the shared `contents.json` was **invalid JSON** and the masthead failed
to load for *every* sim (not just this one). The defects were in unrelated sibling
entries; **no** help/about **wording** was changed by the fix — only escaping/whitespace:

- 4 entries had an unescaped literal **newline** inside a `content` string
  (`ce_hc`, `eclipsingbinarysim`, `meltednail`, `positionsdemonstrator`) — **fixed by
  the user**.
- 2 entries had unescaped `"` in an `href` (`renaissancePtolemaic`, `venusphases`):
  `href="../…"` → `href=\"../…\"` — fixed here (escaping only).
- 1 entry had a literal **tab** inside a `content` string (`pulsarPeriodSim001`):
  escaped as `\t` — fixed here (byte-preserving).

Net change to the file: **+5 bytes** (4 backslashes + one tab→`\t`), applied to both
the source `foundation/contents.json` and the `html5/foundation/` copy. The file now
parses cleanly (108 entries) and the `pathtracer` entry is byte-identical to the
original. The `.js`/`.css` foundation files are byte-for-byte unchanged.

## Layout / visual replication (Goal C)

The KL-UNL two-column shell mirrors the original screenshot: **diagram left**
(`.app-layout__left`, wide) and **description + controls right**
(`.app-layout__right`, narrow), collapsing to a single stacked column at the
foundation's 56 rem breakpoint (and again at 30 rem for phone portrait). The column
order (`1fr 24rem`) is set only on this sim's `.app-layout` instance in
`styles/styles.css`; the foundation CSS is untouched.

### Divergences from the original (noted per priority order)

- The Flash **"ClassAction" logo** (bottom-right of the original) is **omitted** — the
  KL-UNL masthead supplies the project's own branding, and no logo bitmap was present
  in the export (`images/` was empty). Decorative only; no behavior lost.
- Original **pixel palette/fonts/coordinates** are intentionally not reproduced; the
  KL-UNL palette and responsive type are used instead (Goal B > Goal C).
- The speed slider shows **no numeric read-out** (the original hid its value field
  too); it is presented as a 0–100 % slider whose value maps exactly onto the AS
  `0…0.002` range (25 % = the original init `0.0005`).

## Canvas coordinate system

The canvas keeps the **original stage geometry** (radii 85/200, the exact AS
position math). Internal size is 620×620 with the system origin at the center; CSS
scales the element to fit while preserving a 1:1 aspect ratio. 620 was chosen because
the maximum drawn extent in any reference frame is `r_blue + r_red = 285` (+ ball
radius), so nothing ever clips — even when blue or red is fixed. Pointer math is not
needed (nothing is draggable), but the scale-preserving setup follows the required
pattern.

## No mathematics is displayed

This simulation shows **no equations, variables, subscripts, Greek letters, or units
with math notation** anywhere in the UI — only prose, color-named object labels, and a
slow/fast speed slider. MathJax typesetting (rules 8/8a) therefore has nothing to
typeset; `foundation/kl-unl.js` is still linked (harmless), but no MathJax library is
loaded (and none was provided in the foundation), keeping the page dependency-free.
