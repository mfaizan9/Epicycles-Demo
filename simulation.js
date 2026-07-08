/* ==========================================================================
 * Epicycles Demonstrator  --  faithful HTML5 port of pathTracer005.swf
 * --------------------------------------------------------------------------
 * Ground truth for behavior is the decompiled ActionScript:
 *   - scripts/Path Tracing Demo 1.as   (PathTracingDemo1Class)
 *   - main frame_1/DoAction.as         (onEnterFrame time driver)
 *   - Slider v4 Component init          (speed range 0 .. 0.002, init 0.0005)
 *   - ComboBox init                     (yellow / blue / red)
 *
 * All physics constants, formulas and the ring-buffer path/fade logic are
 * copied verbatim from the AS. Presentation (colors, controls, layout) follows
 * the KL-UNL foundation + WCAG. The <canvas> keeps the ORIGINAL Flash stage
 * coordinate system; CSS scales the element.
 * ========================================================================== */

(function () {
  "use strict";

  // -------- Original AS constants (verbatim) ------------------------------
  const BALL2_ORBITAL_RADIUS = 85;    // blue  (inner)
  const BALL3_ORBITAL_RADIUS = 200;   // red   (outer)
  const BALL2_ANOMALY_AT_EPOCH = 0;
  const BALL3_ANOMALY_AT_EPOCH = 0;
  // Kepler's third law: T = (r3/r2)^1.5  (blue period is 1 time unit)
  const BALL3_PERIOD = Math.pow(BALL3_ORBITAL_RADIUS / BALL2_ORBITAL_RADIUS, 1.5);
  const LINE_SEGMENTS = 120;          // ring buffer length
  const TWO_PI = 2 * 3.141592653589793;

  // incrementTime() sub-stepping constants (verbatim)
  const MAX_TIME_STEP = 0.025;
  const MIN_TIME_STEP = 0.003;

  // Slider value range (Slider v4 Component init) -- speed multiplies elapsed ms.
  // The DOM slider runs 0..100 (%) and maps linearly onto this range so that
  // keyboard stepping is clean; the parity-critical quantity `speed` is exact.
  const SPEED_MIN = 0;
  const SPEED_MAX = 0.002;
  const SPEED_INIT = 0.0005;          // initValue -> 25% of range

  // Ball art colors (from exported shapes; balls are radius-5 circles).
  const BALL_R = 5;

  // Canvas: origin placed at center. Half-size (310) exceeds the maximum
  // possible drawn extent (r2 + r3 = 285, + ball radius) so nothing clips in
  // any reference frame.
  const CANVAS_SIZE = 620;
  const ORIGIN = CANVAS_SIZE / 2;     // 310

  const CENTER_NAME = { yellow: 1, blue: 2, red: 3 };
  const CENTER_LABEL = { 1: "yellow", 2: "blue", 3: "red" };

  // -------- DOM --------------------------------------------------------------
  const canvas = document.getElementById("stage");
  const ctx = canvas.getContext("2d");
  const centerSelect = document.getElementById("centerSelect");
  const speedSlider = document.getElementById("speedSlider");
  const pauseBtn = document.getElementById("pauseBtn");
  const liveStatus = document.getElementById("live-status");
  const stageDesc = document.getElementById("stage-desc");

  const prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // -------- Ball art (reuse exported vector shapes, do not redraw) ----------
  const ballImgs = { 1: new Image(), 2: new Image(), 3: new Image() };
  let ballsReady = 0;
  ballImgs[1].src = "assets/ball-yellow.svg";
  ballImgs[2].src = "assets/ball-blue.svg";
  ballImgs[3].src = "assets/ball-red.svg";
  [1, 2, 3].forEach(function (k) {
    ballImgs[k].addEventListener("load", function () {
      ballsReady++;
      draw();
    });
  });

  // ==========================================================================
  // Simulation model  (mirrors PathTracingDemo1Class)
  // ==========================================================================
  const sim = {
    centerBall: 1,          // 1 yellow, 2 blue, 3 red
    systemTime: 0,
    currentSegment: 0,
    // last endpoint of each traced path (in the "centered" screen frame)
    lastBx: 0, lastBy: 0, lastCx: 0, lastCy: 0,
    // ball positions in yellow-centric coords (systemMC-local), for drawing
    ball2: { x: 0, y: 0 },
    ball3: { x: 0, y: 0 },
    // system translation (dx,dy) = -centeredBall position
    dx: 0, dy: 0,
    // ring buffer of traced segments; each slot holds two line segments
    // (path B and path C), each {x0,y0,x1,y1}, or null when cleared.
    segB: new Array(LINE_SEGMENTS).fill(null),
    segC: new Array(LINE_SEGMENTS).fill(null),
    alpha: new Array(LINE_SEGMENTS).fill(0)   // 0..100
  };

  function clearAllSegments() {
    for (let i = 0; i < LINE_SEGMENTS; i++) {
      sim.segB[i] = null;
      sim.segC[i] = null;
      sim.alpha[i] = 0;
    }
  }

  // setCenter(arg) -- AS p.setCenter
  function setCenter(arg) {
    sim.centerBall = CENTER_NAME[arg] || 1;
    setTime(sim.systemTime);        // recompute positions + clear paths
  }

  // setTime(arg) -- AS p.setTime : places balls, sets system offset, seeds the
  // last-path endpoints for the chosen center, and clears the traced paths.
  function setTime(arg) {
    sim.systemTime = arg;

    const ball2Anomaly = BALL2_ANOMALY_AT_EPOCH + arg * TWO_PI;
    const x2 = BALL2_ORBITAL_RADIUS * Math.cos(ball2Anomaly);
    const y2 = -BALL2_ORBITAL_RADIUS * Math.sin(ball2Anomaly);
    sim.ball2.x = x2;
    sim.ball2.y = y2;

    const ball3Anomaly = BALL3_ANOMALY_AT_EPOCH + arg * TWO_PI / BALL3_PERIOD;
    const x3 = BALL3_ORBITAL_RADIUS * Math.cos(ball3Anomaly);
    const y3 = -BALL3_ORBITAL_RADIUS * Math.sin(ball3Anomaly);
    sim.ball3.x = x3;
    sim.ball3.y = y3;

    const cx = sim.centerBall === 1 ? 0 : (sim.centerBall === 2 ? x2 : x3);
    const cy = sim.centerBall === 1 ? 0 : (sim.centerBall === 2 ? y2 : y3);
    const dx = -cx;
    const dy = -cy;
    sim.dx = dx;
    sim.dy = dy;

    if (sim.centerBall === 1) {
      sim.lastBx = x2;  sim.lastBy = y2;
      sim.lastCx = x3;  sim.lastCy = y3;
    } else if (sim.centerBall === 2) {
      sim.lastBx = dx;        sim.lastBy = dy;
      sim.lastCx = x3 + dx;   sim.lastCy = y3 + dy;
    } else { // centerBall === 3
      sim.lastBx = x2 + dx;   sim.lastBy = y2 + dy;
      sim.lastCx = dx;        sim.lastCy = dy;
    }

    clearAllSegments();
  }

  // incrementTime(arg) -- AS p.incrementTime : advances the system by `arg`
  // time units, laying down traced-path segments in a fading ring buffer.
  function incrementTime(arg) {
    const cos = Math.cos, sin = Math.sin;

    if (Math.abs(arg) < MIN_TIME_STEP) {
      return; // sub-threshold increments are dropped (matches AS)
    }

    const numSteps = Math.ceil(Math.abs(arg / MAX_TIME_STEP));
    const stepSize = arg / numSteps;
    const t0 = sim.systemTime;
    let cs = sim.currentSegment;
    const ls = LINE_SEGMENTS;
    let lxB = sim.lastBx, lyB = sim.lastBy;
    let lxC = sim.lastCx, lyC = sim.lastCy;
    const r2 = BALL2_ORBITAL_RADIUS;
    const r3 = BALL3_ORBITAL_RADIUS;
    const center = sim.centerBall;

    let x2, y2, x3, y3, dx, dy;
    for (let i = 0; i < numSteps; i++) {
      const t = t0 + i * stepSize;
      const ball2Anomaly = BALL2_ANOMALY_AT_EPOCH + t * TWO_PI;
      x2 = r2 * cos(ball2Anomaly);
      y2 = -r2 * sin(ball2Anomaly);
      const ball3Anomaly = BALL3_ANOMALY_AT_EPOCH + t * TWO_PI / BALL3_PERIOD;
      x3 = r3 * cos(ball3Anomaly);
      y3 = -r3 * sin(ball3Anomaly);

      let nxB, nyB, nxC, nyC;
      if (center === 1) {
        dx = 0; dy = 0;
        nxB = x2; nyB = y2; nxC = x3; nyC = y3;
      } else if (center === 2) {
        dx = -x2; dy = -y2;
        nxB = dx; nyB = dy; nxC = x3 + dx; nyC = y3 + dy;
      } else {
        dx = -x3; dy = -y3;
        nxB = x2 + dx; nyB = y2 + dy; nxC = dx; nyC = dy;
      }

      cs = (cs + 1) % ls;
      // one segment == two red line strokes (path B and path C)
      sim.segB[cs] = { x0: lxB, y0: lyB, x1: nxB, y1: nyB };
      sim.segC[cs] = { x0: lxC, y0: lyC, x1: nxC, y1: nyC };

      lxB = nxB; lyB = nyB; lxC = nxC; lyC = nyC;
    }

    // final ball positions use the LAST sub-step (t = t0 + (numSteps-1)*stepSize);
    // this one-step lag behind systemTime is faithful to the AS.
    sim.ball2.x = x2; sim.ball2.y = y2;
    sim.ball3.x = x3; sim.ball3.y = y3;
    sim.dx = dx; sim.dy = dy;
    sim.lastBx = lxB; sim.lastBy = lyB;
    sim.lastCx = lxC; sim.lastCy = lyC;
    sim.currentSegment = cs;

    // age-based fade of the ring buffer (AS: alphaStep = 100/ls)
    const alphaStep = 100 / ls;
    for (let i = 0; i < ls; i++) {
      if (sim.segB[i] === null) { sim.alpha[i] = 0; continue; }
      if (i > cs) {
        sim.alpha[i] = 100 - alphaStep * (cs - i + ls);
      } else {
        sim.alpha[i] = 100 - alphaStep * (cs - i);
      }
    }

    sim.systemTime += arg;
  }

  // ==========================================================================
  // Rendering
  // ==========================================================================
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Traced paths (pathsMC): drawn in the centered frame -> canvas center.
    ctx.save();
    ctx.translate(ORIGIN, ORIGIN);
    ctx.lineWidth = 1.25;              // 1px stage line, nudged for legibility
    ctx.lineCap = "round";
    for (let i = 0; i < LINE_SEGMENTS; i++) {
      const a = sim.alpha[i];
      if (!sim.segB[i] || a <= 0) continue;
      ctx.globalAlpha = Math.max(0, Math.min(1, a / 100));
      ctx.strokeStyle = "#ff0000";    // AS color 16711680
      const b = sim.segB[i], c = sim.segC[i];
      ctx.beginPath();
      ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1);
      ctx.moveTo(c.x0, c.y0); ctx.lineTo(c.x1, c.y1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Static orbit circles (yellowCentricMC): centered on yellow, i.e. at the
    // system offset from canvas center. Black 1px (AS lineStyle(1,0,100)).
    ctx.save();
    ctx.translate(ORIGIN + sim.dx, ORIGIN + sim.dy);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    circle(BALL3_ORBITAL_RADIUS);
    circle(BALL2_ORBITAL_RADIUS);
    ctx.restore();

    // Balls (children of systemMC): yellow at origin, blue/red at their coords,
    // all shifted by the system offset (dx,dy).
    ctx.save();
    ctx.translate(ORIGIN + sim.dx, ORIGIN + sim.dy);
    drawBall(1, 0, 0);
    drawBall(2, sim.ball2.x, sim.ball2.y);
    drawBall(3, sim.ball3.x, sim.ball3.y);
    ctx.restore();
  }

  function circle(r) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TWO_PI);
    ctx.stroke();
  }

  function drawBall(id, x, y) {
    const img = ballImgs[id];
    if (img && img.complete && img.naturalWidth) {
      ctx.drawImage(img, x - BALL_R, y - BALL_R, 2 * BALL_R, 2 * BALL_R);
    } else {
      // fallback until the SVG loads
      ctx.fillStyle = id === 1 ? "#ffcc00" : (id === 2 ? "#3300ff" : "#ff0000");
      ctx.beginPath();
      ctx.arc(x, y, BALL_R, 0, TWO_PI);
      ctx.fill();
    }
  }

  // ==========================================================================
  // Time driver  (main frame onEnterFrame)
  // ==========================================================================
  let running = !prefersReducedMotion;
  let timeLast = 0;

  function speedValue() {
    // DOM slider 0..100 -> AS speed 0..0.002
    const pct = Number(speedSlider.value);
    return SPEED_MIN + (pct / 100) * (SPEED_MAX - SPEED_MIN);
  }

  function frame(now) {
    if (running) {
      const dtMs = now - timeLast;
      incrementTime(speedValue() * dtMs);   // AS: speedSlider.value * (now - last)
      timeLast = now;
      draw();
    }
    requestAnimationFrame(frame);
  }

  // ==========================================================================
  // Accessibility narration
  // ==========================================================================
  function announce(msg) { liveStatus.textContent = msg; }

  function updateStageDescription() {
    const who = CENTER_LABEL[sim.centerBall];
    let base;
    if (sim.centerBall === 1) {
      base = "The yellow object is held fixed at the center. The blue object " +
        "orbits on the inner black circle and the red object on the outer black " +
        "circle. With the yellow object fixed both traced paths are simple circles.";
    } else {
      base = "The " + who + " object is held fixed at the center. The other two " +
        "objects revolve around it, and their apparent paths are traced in red as " +
        "looping epicycle curves.";
    }
    stageDesc.textContent = "Diagram: " + base;
    canvas.setAttribute("aria-label",
      "Orbit diagram. " + base + " Animation is " +
      (running ? "playing" : "paused") + ".");
  }

  function speedText() {
    return "Animation speed " + Math.round(Number(speedSlider.value)) + " percent";
  }

  // ==========================================================================
  // Controls
  // ==========================================================================
  centerSelect.addEventListener("change", function () {
    setCenter(centerSelect.value);          // AS changeCenter -> test.setCenter
    draw();
    updateStageDescription();
    announce("Now keeping the " + centerSelect.value +
      " object fixed. Traced paths cleared.");
  });

  speedSlider.addEventListener("input", function () {
    speedSlider.setAttribute("aria-valuetext", speedText());
  });
  speedSlider.addEventListener("change", function () {
    announce(speedText() + ".");
  });

  pauseBtn.addEventListener("click", function () {
    running = !running;
    pauseBtn.textContent = running ? "Pause" : "Play";
    pauseBtn.setAttribute("aria-pressed", String(!running));
    if (running) { timeLast = performance.now(); }   // avoid a time jump
    updateStageDescription();
    announce(running ? "Animation playing." : "Animation paused.");
  });

  // Reset comes from the masthead (sim-reset). Restore the exact initial state.
  document.addEventListener("sim-reset", function () {
    centerSelect.value = "yellow";
    speedSlider.value = String(Math.round((SPEED_INIT - SPEED_MIN) /
      (SPEED_MAX - SPEED_MIN) * 100));                // 25
    speedSlider.setAttribute("aria-valuetext", speedText());
    sim.systemTime = 0;
    sim.currentSegment = 0;
    setCenter("yellow");                              // seeds positions + clears
    running = !prefersReducedMotion;
    pauseBtn.textContent = running ? "Pause" : "Play";
    pauseBtn.setAttribute("aria-pressed", String(!running));
    timeLast = performance.now();
    draw();
    updateStageDescription();
    announce("Simulation reset. Yellow object fixed, " +
      speedText().toLowerCase() + ".");
  });

  // ==========================================================================
  // Init
  // ==========================================================================
  function init() {
    setCenter("yellow");            // constructor: systemTime=0, center yellow
    speedSlider.setAttribute("aria-valuetext", speedText());
    pauseBtn.textContent = running ? "Pause" : "Play";
    pauseBtn.setAttribute("aria-pressed", String(!running));
    updateStageDescription();
    if (!running) {
      announce("Reduced motion is on, so the animation starts paused. " +
        "Press Play to run it.");
    }
    draw();
    timeLast = performance.now();
    requestAnimationFrame(frame);
  }

  init();
})();
