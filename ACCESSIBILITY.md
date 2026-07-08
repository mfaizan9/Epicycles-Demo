# Accessibility Notes — Epicycles Demonstrator

Target: WCAG 2.1 AA (AAA where reasonable). **Human screen-reader QA is still
required** — the notes below describe what was built and reasoned through, not a
substitute for testing with real NVDA + VoiceOver users.

## Structure & semantics

- One `<h1>` — rendered by `<kl-unl-masthead>` ("Epicycles Demonstrator"). The sim
  adds only `<h2>` panel headings ("Orbits and Traced Paths", "Description &
  Controls"), so the heading order does not skip.
- Landmarks: `<main>` (diagram), `<aside>` (description + controls), plus the
  masthead's `<header>`/`<nav>`. `<html lang="en">`.
- A "Skip to simulation" link (`.sr-only-focusable`) precedes the masthead.

## The canvas has a text alternative

The `<canvas>` is `role="img"` with an `aria-label` that is **rewritten from state**
whenever the reference frame or play/pause changes, e.g.:

> "Orbit diagram. The blue object is held fixed at the center. The other two objects
> revolve around it, and their apparent paths are traced in red as looping epicycle
> curves. Animation is playing."

A companion `#stage-desc` paragraph (`.sr-only`) carries the same description. All
meaningful visual content lives in HTML text, not painted into the canvas.

## Screen-reader narration (units always spoken)

A polite live region (`#live-status`, `aria-live="polite"`) announces state changes
**on commit, not per animation tick**:

- Reference-frame change → "Now keeping the blue object fixed. Traced paths cleared."
- Speed change (on `change`) → "Animation speed 40 percent."
- Pause/Play → "Animation paused." / "Animation playing."
- Reset → "Simulation reset. Yellow object fixed, animation speed 25 percent."

The speed slider always exposes a units-complete accessible value via
**`aria-valuetext`** — e.g. `"Animation speed 40 percent"` — never a bare number.
"Animation speed" is a unitless quantity, so it is spoken as a **percentage** (0 % =
stopped, 100 % = fastest); the underlying value maps exactly onto the original
`0…0.002` range. The `<select>` options are self-labeling ("yellow object", "blue
object", "red object") so the reference frame is unambiguous in audio.

## Keyboard

- Everything is operable by keyboard in a logical tab order (select → slider → Pause;
  masthead Reset/Help/About). Visible focus rings come from `kl-unl.css`
  `:focus-visible` (plus a sim focus style on the custom-skinned slider).
- **Speed slider** is a native `<input type="range">`, so it gets full keyboard
  support for free: ←/↓ decrement, →/↑ increment, PageUp/PageDown larger steps,
  Home/End = min/max. It never traps focus; Tab moves away normally. Verified the
  element is focusable and that `aria-valuetext` updates on every change.
- **No draggable/rotatable canvas objects exist** in this sim (the ActionScript has no
  drag handlers on the balls — they only animate), so the "tab-to-focus / click-to-
  focus + arrow-key move" requirement for draggables does not apply here. The only
  interactive elements are the select and the slider, both fully keyboard-operable.

## Color & contrast

- Palette via KL-UNL CSS custom properties. Body text ≥ 1.125 rem, rem/em-based;
  layout reflows without clipping at 200 % zoom (no fixed-px text heights).
- **Color is never the only signal.** The three objects are distinguished by color
  *and* by name everywhere it matters: the reference-frame `<select>` names them
  ("yellow/blue/red object"), and the live region + canvas description name them in
  words. The object colors are physically meaningful and kept as exported
  (`#ffcc00`, `#3300ff`, `#ff0000`); the black orbit circles and red traced paths are
  the original's own encoding.
- The traced-path lines are drawn at 1.25 px (vs the original 1 px) purely to keep the
  thin red lines comfortably visible; geometry is unchanged.
- Contrast: black orbits and the ≥1.25 px red paths on white meet the ≥3:1 bar for
  graphical objects; all UI text uses the foundation's ≥4.5:1 foreground/background.

## Motion

- The animation is continuous (> 5 s), so a **Pause/Play** button is provided (Reset
  comes from the masthead's `sim-reset` event — not duplicated). Sliding speed to 0
  also stops motion.
- **`prefers-reduced-motion`** is honored: on load, if the user prefers reduced
  motion, the sim starts **paused** and announces how to start it; the user can still
  press Play to opt in. (This code path was implemented but should be confirmed on a
  machine with the OS setting enabled.)
- Nothing flashes; the fading trail updates smoothly at animation rate, far below
  3 flashes/second.

## Responsive / touch

- Desktop → iPad → phone-portrait: two-column shell collapses to one stacked column
  (foundation 56 rem breakpoint; sim-specific 30 rem tweak). No horizontal scroll at
  375 px; canvas scales to fit. Verified `select` and Pause button are ≥ 44 px touch
  targets.
- No hover-only affordances. (Pointer input would map through the canvas scale factor
  if anything were draggable; nothing is.)

## Cross-browser

- Standards-only HTML/CSS/JS: native `<select>`, native `<input type="range">`,
  `<canvas>` 2D, `requestAnimationFrame`, `CustomEvent`. No Chrome-only APIs.
  `-webkit-`/`-moz-` slider-thumb rules are additive on top of standard declarations,
  never the sole styling. Expected to render/operate identically on Chrome, Edge,
  Firefox, and Safari (desktop + iOS); worth a real Safari pass for the slider skin.

## Known items for human QA

- Confirm NVDA (Windows) and VoiceOver (macOS/iOS) both read the slider as
  "Animation speed N percent" and announce the live-region messages without
  duplication or truncation.
- Confirm the reduced-motion start-paused path with the OS setting actually on.
- Confirm the SVG ball art renders crisply on Safari/WebKit `drawImage`.
