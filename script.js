/**
 * AERO-DOCK: TRAJECTORY ESTIMATOR (Floor 2)
 * Cambridge Mathematics: "Measure" — Estimating and Rounding
 * 
 * Physics Trajectory & Orbital Docking mini-game:
 * - Direct DOM access via `root` for Shadow DOM compliance
 * - Zero external URLs: Web Audio API synthesis & HTML5 Canvas physics
 * - Tablet/iPad touch-first + PC mouse dual controls (Tactile Quick-Pads + Thruster Slider)
 * - 3 Advanced measurement domains: Distance (km/m), Mass (kg), Capacity (L)
 * - Dynamic parabolic flight simulation with particle thruster trails and docking collision
 * - Full HUD: Chamber, Timer, Score, Thrust Streak Overdrive, 3 Shields
 * - Required End Screen: Try Again + Submit calling game.end({ score, stars, success })
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. SAFE SHADOW DOM ACCESSORS
  // =========================================================================
  const getDoc = () => (typeof root !== 'undefined' ? root : document);
  const $ = (id) => getDoc().getElementById(id);
  const $$ = (sel) => getDoc().querySelectorAll(sel);

  // =========================================================================
  // 2. SYNTHESIZED WEB AUDIO ENGINE (ZERO EXTERNAL ASSETS)
  // =========================================================================
  let audioCtx = null;
  let isSoundEnabled = true;
  let bgBeatTimer = null;
  let bgBeatStep = 0;

  function initAudio() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type, duration, vol = 0.2, pitchRamp = null) {
    if (!isSoundEnabled || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      if (pitchRamp) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, pitchRamp), audioCtx.currentTime + duration);
      }
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio fallback fail silently
    }
  }

  function sfxClick() {
    playTone(550, 'triangle', 0.05, 0.15, 280);
  }

  function sfxTick() {
    playTone(1100, 'sine', 0.04, 0.1, 750);
  }

  function sfxLaunch() {
    if (!isSoundEnabled || !audioCtx) return;
    // Swept whoosh thruster
    playTone(200, 'sawtooth', 0.45, 0.25, 600);
  }

  function sfxDockSuccess() {
    if (!isSoundEnabled || !audioCtx) return;
    const notes = [440, 554.37, 659.25, 880, 1108.73]; // A major 9
    notes.forEach((freq, idx) => {
      setTimeout(() => playTone(freq, 'triangle', 0.22, 0.25), idx * 50);
    });
  }

  function sfxShieldHit() {
    if (!isSoundEnabled || !audioCtx) return;
    playTone(160, 'sawtooth', 0.3, 0.28, 60);
    setTimeout(() => playTone(95, 'sawtooth', 0.35, 0.22, 40), 70);
  }

  function sfxStreak() {
    if (!isSoundEnabled || !audioCtx) return;
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    chord.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 'sine', 0.25, 0.2), i * 35);
    });
  }

  function sfxChamberClear() {
    if (!isSoundEnabled || !audioCtx) return;
    const fanfare = [349.23, 440, 523.25, 698.46, 880, 1046.5];
    fanfare.forEach((f, i) => {
      setTimeout(() => playTone(f, 'triangle', 0.35, 0.25), i * 70);
    });
  }

  function sfxVictory() {
    if (!isSoundEnabled || !audioCtx) return;
    const chords = [
      [440, 554.37, 659.25],
      [523.25, 659.25, 783.99],
      [587.33, 739.99, 880],
      [880, 1108.73, 1318.5, 1760]
    ];
    chords.forEach((chord, i) => {
      setTimeout(() => {
        chord.forEach(f => playTone(f, 'triangle', 0.45, 0.2));
      }, i * 170);
    });
  }

  // Atmospheric orbital spaceport background rhythm
  function startBgMusic() {
    if (!isSoundEnabled || !audioCtx || bgBeatTimer) return;
    try {
      const spaceNotes = [82.41, 82.41, 110, 82.41, 123.47, 110, 82.41, 98];
      bgBeatStep = 0;

      bgBeatTimer = setInterval(() => {
        if (!isSoundEnabled || !audioCtx) return;
        const b = spaceNotes[bgBeatStep % spaceNotes.length];
        // Deep sub pulse
        playTone(b, 'sine', 0.14, 0.07, 35);

        // Echoing radar ping every 4 steps
        if (bgBeatStep % 4 === 0) {
          playTone(1800, 'sine', 0.08, 0.04, 900);
        }
        bgBeatStep++;
      }, 260);
    } catch (e) {}
  }

  function stopBgMusic() {
    if (bgBeatTimer) {
      clearInterval(bgBeatTimer);
      bgBeatTimer = null;
    }
  }

  function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    const icon = $('sound-icon');
    if (icon) {
      icon.textContent = isSoundEnabled ? '🔊' : '🔇';
    }
    if (isSoundEnabled) {
      initAudio();
      startBgMusic();
      sfxClick();
    } else {
      stopBgMusic();
    }
  }

  // =========================================================================
  // 3. CURRICULUM QUESTIONS & TELEMETRY DATA
  // Cambridge Mathematics Stage 4 / Floor 2: Measure (Estimating & Rounding)
  // =========================================================================

  // Chamber 1: Distance & Length (Meters & Kilometers) -> Rounding to nearest whole km / m
  const LEVEL_1_ITEMS = [
    { domain: 'distance', raw: 4.7, unit: 'km', target: 5, label: 'Orbital Recon Drone', minScale: 1, maxScale: 8, step: 1, hint: '4.7 km has tenths digit 7 (≥ 5) → rounds UP to 5 km' },
    { domain: 'distance', raw: 7.2, unit: 'm', target: 7, label: 'Station Solar Array Tether', minScale: 3, maxScale: 10, step: 1, hint: '7.2 m has tenths digit 2 (< 5) → rounds DOWN to 7 m' },
    { domain: 'distance', raw: 3.5, unit: 'km', target: 4, label: 'Asteroid Beacon Runway', minScale: 1, maxScale: 8, step: 1, hint: '3.5 km is exactly halfway (.5) → rounds UP to 4 km' },
    { domain: 'distance', raw: 8.8, unit: 'm', target: 9, label: 'Plasma Conduit Mast', minScale: 4, maxScale: 12, step: 1, hint: '8.8 m is closer to 9 m than 8 m → rounds UP to 9 m' },
    { domain: 'distance', raw: 1.4, unit: 'km', target: 1, label: 'Communication Relay Gap', minScale: 1, maxScale: 6, step: 1, hint: '1.4 km has tenths digit 4 (< 5) → rounds DOWN to 1 km' },
    { domain: 'distance', raw: 6.5, unit: 'm', target: 7, label: 'Cargo Airlock Bridge', minScale: 3, maxScale: 10, step: 1, hint: '6.5 m is halfway (.5) → rounds UP to 7 m' }
  ];

  // Chamber 2: Mass & Payload (Kilograms) -> Rounding to nearest whole kg
  const LEVEL_2_ITEMS = [
    { domain: 'mass', raw: 3.4, unit: 'kg', target: 3, label: 'Titanium Shield Plate', minScale: 1, maxScale: 7, step: 1, hint: '3.4 kg has tenths digit 4 (< 5) → rounds DOWN to 3 kg' },
    { domain: 'mass', raw: 6.7, unit: 'kg', target: 7, label: 'Quantum Battery Core', minScale: 3, maxScale: 10, step: 1, hint: '6.7 kg has tenths digit 7 (≥ 5) → rounds UP to 7 kg' },
    { domain: 'mass', raw: 2.5, unit: 'kg', target: 3, label: 'Cryo-Stabilizer Pod', minScale: 1, maxScale: 6, step: 1, hint: '2.5 kg is halfway (.5) → rounds UP to 3 kg' },
    { domain: 'mass', raw: 8.2, unit: 'kg', target: 8, label: 'Heavy Ballast Module', minScale: 4, maxScale: 12, step: 1, hint: '8.2 kg has tenths digit 2 (< 5) → rounds DOWN to 8 kg' },
    { domain: 'mass', raw: 4.9, unit: 'kg', target: 5, label: 'Hyper-Drive Rotor', minScale: 2, maxScale: 8, step: 1, hint: '4.9 kg is nearly 5 kg → rounds UP to 5 kg' },
    { domain: 'mass', raw: 1.6, unit: 'kg', target: 2, label: 'Navigation Gyro Unit', minScale: 1, maxScale: 6, step: 1, hint: '1.6 kg has tenths digit 6 (≥ 5) → rounds UP to 2 kg' }
  ];

  // Chamber 3: Plasma Fluid & Capacity (Liters) -> Rounding to nearest whole Liter
  const LEVEL_3_ITEMS = [
    { domain: 'capacity', raw: 2.8, unit: 'L', target: 3, label: 'Reactor Coolant Cell', minScale: 1, maxScale: 6, step: 1, hint: '2.8 L has tenths digit 8 (≥ 5) → rounds UP to 3 L' },
    { domain: 'capacity', raw: 4.3, unit: 'L', target: 4, label: 'Hydro Electrolyte Reservoir', minScale: 1, maxScale: 8, step: 1, hint: '4.3 L has tenths digit 3 (< 5) → rounds DOWN to 4 L' },
    { domain: 'capacity', raw: 1.5, unit: 'L', target: 2, label: 'Pressurized Fusion Gel', minScale: 1, maxScale: 6, step: 1, hint: '1.5 L is halfway (.5) → rounds UP to 2 L' },
    { domain: 'capacity', raw: 7.7, unit: 'L', target: 8, label: 'Liquid Nitrogen Buffer', minScale: 4, maxScale: 11, step: 1, hint: '7.7 L has tenths digit 7 (≥ 5) → rounds UP to 8 L' },
    { domain: 'capacity', raw: 3.2, unit: 'L', target: 3, label: 'Atmosphere Purifier Tank', minScale: 1, maxScale: 7, step: 1, hint: '3.2 L has tenths digit 2 (< 5) → rounds DOWN to 3 L' },
    { domain: 'capacity', raw: 5.6, unit: 'L', target: 6, label: 'Emergency Water Tank', minScale: 2, maxScale: 9, step: 1, hint: '5.6 L has tenths digit 6 (≥ 5) → rounds UP to 6 L' }
  ];

  const LEVELS = [
    { id: 1, name: 'Chamber 1: Distance & Length', mission: 'Estimate & Round Distance to Nearest Whole km or m', items: LEVEL_1_ITEMS, timeLimit: 40 },
    { id: 2, name: 'Chamber 2: Mass & Payload', mission: 'Estimate & Round Payload Mass to Nearest Whole kg', items: LEVEL_2_ITEMS, timeLimit: 40 },
    { id: 3, name: 'Chamber 3: Fluid & Capacity', mission: 'Estimate & Round Fuel Capacity to Nearest Whole Litre', items: LEVEL_3_ITEMS, timeLimit: 40 }
  ];

  // =========================================================================
  // 4. GAME STATE
  // =========================================================================
  const state = {
    screen: 'start',
    currentLevelIndex: 0,
    currentItemIndex: 0,
    score: 0,
    streak: 0,
    maxStreak: 0,
    lives: 3,
    maxLives: 3,
    totalAttempted: 0,
    totalCorrect: 0,
    timeRemaining: 40,
    timerInterval: null,
    sliderValue: 1,
    isDraggingSlider: false,
    particles: [],
    animFrameId: null,
    previewAnimId: null,
    isTransitioning: false,

    // Projectile Flight Physics
    capsuleFlight: null // { active, x, y, vx, vy, targetX, targetY, isCorrect, progress }
  };

  // =========================================================================
  // 5. SCREEN TRANSITIONS
  // =========================================================================
  function setScreen(screenId) {
    state.screen = screenId;
    const screens = $$('.screen');
    screens.forEach(s => s.classList.remove('active'));

    const target = $('screen-' + screenId);
    if (target) {
      target.classList.add('active');
    }

    const navHud = $('nav-hud');
    const navRestart = $('btn-nav-restart');

    if (screenId === 'game') {
      if (navHud) navHud.style.display = 'flex';
      if (navRestart) navRestart.style.display = 'flex';
      resizeFlightCanvas();
      requestAnimationFrame(() => {
        resizeFlightCanvas();
      });
    } else {
      if (navHud) navHud.style.display = 'none';
      if (navRestart) navRestart.style.display = screenId === 'start' ? 'none' : 'flex';
    }
  }

  // =========================================================================
  // 6. HERO PREVIEW CANVAS ANIMATION (START SCREEN)
  // =========================================================================
  function startHeroPreviewAnimation() {
    const canvas = $('canvas-hero-preview');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let t = 0;

    function renderPreview() {
      if (state.screen !== 'start') {
        state.previewAnimId = requestAnimationFrame(renderPreview);
        return;
      }
      t += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep space grid
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 22) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Parabolic flight trajectory
      const startX = 35;
      const startY = 110;
      const endX = 295;
      const endY = 55;
      const ctrlX = 160;
      const ctrlY = 15;

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Moving capsule along curve
      const p = (Math.sin(t) + 1) / 2;
      const capX = (1 - p) * (1 - p) * startX + 2 * (1 - p) * p * ctrlX + p * p * endX;
      const capY = (1 - p) * (1 - p) * startY + 2 * (1 - p) * p * ctrlY + p * p * endY;

      // Thruster glow
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(capX - 6, capY + 4, 4, 0, Math.PI * 2);
      ctx.fill();

      // Capsule
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(capX, capY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Space Station Docking Ring on right
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(endX, endY, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Telemetry readout
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px system-ui';
      ctx.fillText('TARGET: 4.7 km → ROUNDS TO 5 km', 30, 22);

      state.previewAnimId = requestAnimationFrame(renderPreview);
    }

    renderPreview();
  }

  // =========================================================================
  // 7. PARTICLES & FLIGHT STAGE CANVAS
  // =========================================================================
  function spawnSparks(x, y, color = '#10b981', count = 24) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      state.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
        color: color,
        alpha: 1,
        decay: 0.02 + Math.random() * 0.03
      });
    }
  }

  function updateAndDrawParticles(ctx) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        state.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function resizeFlightCanvas() {
    const canvas = $('canvas-flight-stage');
    const wrap = $('flight-wrapper');
    if (!canvas || !wrap) return;

    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);

    if (w > 0 && h > 0) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    }
  }

  // Active Game Stage Render Loop
  function renderFlightStage() {
    const canvas = $('canvas-flight-stage');
    if (!canvas || state.screen !== 'game') {
      state.animFrameId = requestAnimationFrame(renderFlightStage);
      return;
    }

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // 1. Orbital Stars & Flight Coordinates Grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 35) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 35) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const currentItem = getCurrentItem();
    if (currentItem) {
      drawFlightScene(ctx, width, height, currentItem);
    }

    // 2. Projectile Flight Physics Animation
    updateAndDrawFlight(ctx, width, height);

    // 3. Floating Sparks & Explosions
    updateAndDrawParticles(ctx);

    ctx.restore();
    state.animFrameId = requestAnimationFrame(renderFlightStage);
  }

  // -------------------------------------------------------------------------
  // MAIN SCENE RENDERING: LAUNCH PAD, DOCKING BAY, & TRAJECTORY GUIDE
  // -------------------------------------------------------------------------
  function drawFlightScene(ctx, width, height, item) {
    const launchPadX = width * 0.12;
    const launchPadY = height * 0.76;

    const dockStationX = width * 0.85;
    const dockStationY = height * 0.42;

    // Header Telemetry Display
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 15px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`${item.label}`, width / 2, height * 0.13);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 13px system-ui';
    ctx.fillText(`TELEMETRY SENSOR: ${item.raw} ${item.unit}`, width / 2, height * 0.22);

    // 1. Launch Platform Base
    ctx.fillStyle = '#0f1738';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(launchPadX - 35, launchPadY, 70, 45, 6);
    ctx.fill();
    ctx.stroke();

    // Launch Rail Coils
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(launchPadX - 15, launchPadY);
    ctx.lineTo(launchPadX + 15, launchPadY - 20);
    ctx.stroke();

    // Capsule on Launch Rail (Only draw if not currently mid-flight)
    if (!state.capsuleFlight || !state.capsuleFlight.active) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(launchPadX + 10, launchPadY - 16, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 2. Space Station Docking Ring (Target Bay)
    ctx.fillStyle = 'rgba(10, 18, 48, 0.7)';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(dockStationX, dockStationY, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Station crosshairs
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(dockStationX - 32, dockStationY);
    ctx.lineTo(dockStationX + 32, dockStationY);
    ctx.moveTo(dockStationX, dockStationY - 32);
    ctx.lineTo(dockStationX, dockStationY + 32);
    ctx.stroke();

    // Station Target Label
    ctx.fillStyle = '#10b981';
    ctx.font = '900 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`DOCK BAY`, dockStationX, dockStationY + 44);

    // 3. Dynamic Predicted Trajectory Arc (Curves based on state.sliderValue)
    if (!state.capsuleFlight || !state.capsuleFlight.active) {
      const min = item.minScale;
      const max = item.maxScale;
      const ratio = (state.sliderValue - min) / (max - min);

      // Trajectory end point depends on whether selected value is correct, undershot, or overshot
      const correctRatio = (item.target - min) / (max - min);
      const diffRatio = ratio - correctRatio;

      const predEndX = dockStationX + (diffRatio * (width * 0.4));
      const predEndY = dockStationY + (diffRatio * 80);
      const predCtrlX = (launchPadX + predEndX) / 2;
      const predCtrlY = Math.min(launchPadY, predEndY) - 100 - (ratio * 40);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(launchPadX + 10, launchPadY - 16);
      ctx.quadraticCurveTo(predCtrlX, predCtrlY, predEndX, predEndY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Predicted landing marker
      ctx.fillStyle = (state.sliderValue === item.target) ? '#10b981' : '#f43f5e';
      ctx.beginPath();
      ctx.arc(predEndX, predEndY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Readout near landing marker
      ctx.font = 'bold 11px system-ui';
      ctx.fillText(`${state.sliderValue} ${item.unit}`, predEndX, predEndY - 10);
    }
  }

  // -------------------------------------------------------------------------
  // PROJECTILE PHYSICS UPDATE & RENDERING
  // -------------------------------------------------------------------------
  function updateAndDrawFlight(ctx, width, height) {
    if (!state.capsuleFlight || !state.capsuleFlight.active) return;

    const f = state.capsuleFlight;
    f.progress += 0.035;

    // Bezier curve flight calculation
    const p = Math.min(1, f.progress);
    const inv = 1 - p;

    const x = inv * inv * f.startX + 2 * inv * p * f.ctrlX + p * p * f.endX;
    const y = inv * inv * f.startY + 2 * inv * p * f.ctrlY + p * p * f.endY;

    // Thruster smoke particles
    state.particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 1.5,
      vy: Math.random() * 1.5,
      radius: 2 + Math.random() * 3,
      color: '#f59e0b',
      alpha: 0.8,
      decay: 0.05
    });

    // Draw Capsule in motion
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();

    // Thruster flame
    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x - 5, y + 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Check Flight Completion
    if (f.progress >= 1) {
      f.active = false;
      finishFlightImpact(f);
    }
  }

  function finishFlightImpact(flight) {
    if (flight.isCorrect) {
      state.totalCorrect++;
      state.streak++;
      if (state.streak > state.maxStreak) {
        state.maxStreak = state.streak;
      }

      const streakMult = Math.min(3, 1 + (state.streak - 1) * 0.5);
      const points = Math.round(120 * streakMult + state.timeRemaining * 2);
      state.score += points;

      spawnSparks(flight.endX, flight.endY, '#10b981', 35);
      sfxDockSuccess();
      if (state.streak >= 3) sfxStreak();

      showFeedback(`+${points} PTS! PERFECT DOCKING`, true);
    } else {
      state.streak = 0;
      state.lives--;
      spawnSparks(flight.endX, flight.endY, '#f43f5e', 28);
      sfxShieldHit();

      const item = getCurrentItem();
      showFeedback(`MISSED DOCK! ${item.hint}`, false);
    }

    updateHUD();

    if (state.lives <= 0) {
      setTimeout(() => handleGameOver(), 1200);
      return;
    }

    setTimeout(() => {
      state.isTransitioning = false;
      const lvl = getCurrentLevel();
      if (state.currentItemIndex + 1 < lvl.items.length) {
        setupItem(state.currentItemIndex + 1);
      } else {
        handleLevelComplete();
      }
    }, 1100);
  }

  // =========================================================================
  // 8. GAME LOOP & LEVEL PROGRESSION
  // =========================================================================
  function getCurrentLevel() {
    return LEVELS[state.currentLevelIndex] || LEVELS[0];
  }

  function getCurrentItem() {
    const lvl = getCurrentLevel();
    return lvl.items[state.currentItemIndex] || lvl.items[0];
  }

  function startLevel(lvlIndex) {
    state.currentLevelIndex = lvlIndex;
    state.currentItemIndex = 0;
    const lvl = getCurrentLevel();

    state.timeRemaining = lvl.timeLimit;
    updateHUD();

    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      state.timeRemaining--;
      updateHUD();

      if (state.timeRemaining <= 0) {
        clearInterval(state.timerInterval);
        handleTimeOut();
      }
    }, 1000);

    setupItem(0);
    setScreen('game');
  }

  function setupItem(index) {
    state.currentItemIndex = index;
    state.capsuleFlight = null;
    const item = getCurrentItem();
    if (!item) return;

    const missionText = $('mission-text');
    if (missionText) {
      missionText.textContent = getCurrentLevel().mission;
    }

    state.sliderValue = item.minScale;
    updateSliderUI();
    buildQuickPads(item);
  }

  function buildQuickPads(item) {
    const container = $('quick-pads-container');
    if (!container) return;
    container.innerHTML = '';

    const min = item.minScale;
    const max = item.maxScale;
    const step = item.step;

    for (let val = min; val <= max; val += step) {
      const btn = document.createElement('button');
      btn.className = 'quick-pad-btn';
      btn.textContent = `${val} ${item.unit}`;
      btn.dataset.val = val;

      btn.addEventListener('click', () => {
        state.sliderValue = val;
        updateSliderUI();
        sfxTick();
        launchCapsule();
      });

      container.appendChild(btn);
    }
  }

  function updateSliderUI() {
    const item = getCurrentItem();
    if (!item) return;

    const min = item.minScale;
    const max = item.maxScale;
    const ratio = Math.max(0, Math.min(1, (state.sliderValue - min) / (max - min)));

    const thumb = $('thruster-thumb');
    const activeTrack = $('thruster-track-active');
    const liveVal = $('thruster-live-value');

    if (thumb) thumb.style.left = (ratio * 100) + '%';
    if (activeTrack) activeTrack.style.width = (ratio * 100) + '%';
    if (liveVal) liveVal.textContent = `${state.sliderValue} ${item.unit}`;

    // Update active state on buttons
    const pads = $$('.quick-pad-btn');
    pads.forEach(p => {
      if (parseInt(p.dataset.val, 10) === state.sliderValue) {
        p.classList.add('active-target');
      } else {
        p.classList.remove('active-target');
      }
    });
  }

  function initSliderInteraction() {
    const trackWrap = $('thruster-track-wrap');
    if (!trackWrap) return;

    function handleDrag(clientX) {
      const item = getCurrentItem();
      if (!item) return;

      const rect = trackWrap.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const min = item.minScale;
      const max = item.maxScale;
      const rawVal = min + frac * (max - min);

      const snapped = Math.round(rawVal / item.step) * item.step;
      if (snapped !== state.sliderValue) {
        state.sliderValue = snapped;
        sfxTick();
        updateSliderUI();
      }
    }

    trackWrap.addEventListener('pointerdown', (e) => {
      state.isDraggingSlider = true;
      trackWrap.setPointerCapture(e.pointerId);
      handleDrag(e.clientX);
    });

    trackWrap.addEventListener('pointermove', (e) => {
      if (state.isDraggingSlider) {
        handleDrag(e.clientX);
      }
    });

    const endDrag = (e) => {
      if (state.isDraggingSlider) {
        state.isDraggingSlider = false;
        try { trackWrap.releasePointerCapture(e.pointerId); } catch (err) {}
      }
    };

    trackWrap.addEventListener('pointerup', endDrag);
    trackWrap.addEventListener('pointercancel', endDrag);
  }

  // =========================================================================
  // 9. LAUNCH & VERIFICATION LOGIC
  // =========================================================================
  function launchCapsule() {
    if (state.isTransitioning || (state.capsuleFlight && state.capsuleFlight.active)) return;
    const item = getCurrentItem();
    if (!item) return;

    state.isTransitioning = true;
    state.totalAttempted++;

    const isCorrect = (state.sliderValue === item.target);
    const canvas = $('canvas-flight-stage');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas ? canvas.width / dpr : 760;
    const height = canvas ? canvas.height / dpr : 340;

    const startX = width * 0.12 + 10;
    const startY = height * 0.76 - 16;
    const dockX = width * 0.85;
    const dockY = height * 0.42;

    const min = item.minScale;
    const max = item.maxScale;
    const ratio = (state.sliderValue - min) / (max - min);
    const correctRatio = (item.target - min) / (max - min);
    const diffRatio = ratio - correctRatio;

    const endX = dockX + (diffRatio * (width * 0.35));
    const endY = dockY + (diffRatio * 75);
    const ctrlX = (startX + endX) / 2;
    const ctrlY = Math.min(startY, endY) - 100 - (ratio * 40);

    state.capsuleFlight = {
      active: true,
      startX: startX,
      startY: startY,
      ctrlX: ctrlX,
      ctrlY: ctrlY,
      endX: endX,
      endY: endY,
      isCorrect: isCorrect,
      progress: 0
    };

    sfxLaunch();
  }

  function showFeedback(text, isCorrect) {
    const el = $('floating-feedback');
    if (!el) return;
    el.textContent = text;
    el.className = 'floating-feedback ' + (isCorrect ? 'correct' : 'wrong');
    el.style.display = 'block';

    setTimeout(() => {
      el.style.display = 'none';
    }, 1000);
  }

  function handleTimeOut() {
    sfxShieldHit();
    state.lives--;
    updateHUD();
    showFeedback('ORBIT DECAY! -1 SHIELD', false);

    if (state.lives <= 0) {
      setTimeout(() => handleGameOver(), 1000);
    } else {
      setTimeout(() => {
        const lvl = getCurrentLevel();
        if (state.currentItemIndex + 1 < lvl.items.length) {
          setupItem(state.currentItemIndex + 1);
        } else {
          handleLevelComplete();
        }
      }, 1000);
    }
  }

  function handleLevelComplete() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    sfxChamberClear();

    const overlay = $('overlay-level-clear');
    const title = $('level-clear-title');
    const scoreVal = $('level-clear-score');
    const accVal = $('level-clear-accuracy');

    if (title) title.textContent = `CHAMBER ${state.currentLevelIndex + 1} DOCKED!`;
    if (scoreVal) scoreVal.textContent = `+${state.score} PTS`;
    const acc = Math.round((state.totalCorrect / Math.max(1, state.totalAttempted)) * 100);
    if (accVal) accVal.textContent = `${acc}%`;

    if (overlay) overlay.style.display = 'flex';
  }

  function proceedNextLevel() {
    const overlay = $('overlay-level-clear');
    if (overlay) overlay.style.display = 'none';

    if (state.currentLevelIndex + 1 < LEVELS.length) {
      startLevel(state.currentLevelIndex + 1);
    } else {
      handleVictory();
    }
  }

  function handleVictory() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    sfxVictory();
    displayEndScreen(true);
  }

  function handleGameOver() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    sfxShieldHit();
    displayEndScreen(false);
  }

  // =========================================================================
  // 10. HUD & STATS UPDATE
  // =========================================================================
  function updateHUD() {
    const lvlNum = $('hud-level-num');
    const scoreVal = $('hud-score-val');
    const streakVal = $('hud-streak-val');
    const timerVal = $('hud-timer-val');
    const timerFill = $('timer-bar-fill');

    if (lvlNum) lvlNum.textContent = (state.currentLevelIndex + 1);
    if (scoreVal) scoreVal.textContent = state.score.toLocaleString();
    if (streakVal) {
      const mult = Math.min(3, 1 + (state.streak > 0 ? (state.streak - 1) * 0.5 : 0));
      streakVal.textContent = `x${mult}`;
    }

    if (timerVal) timerVal.textContent = `${state.timeRemaining}s`;
    if (timerFill) {
      const totalTime = getCurrentLevel().timeLimit;
      const pct = Math.max(0, Math.min(100, (state.timeRemaining / totalTime) * 100));
      timerFill.style.width = pct + '%';
    }

    const hearts = $$('.life-heart');
    hearts.forEach((h) => {
      const l = parseInt(h.dataset.life, 10);
      if (l <= state.lives) {
        h.classList.remove('lost');
      } else {
        h.classList.add('lost');
      }
    });
  }

  // =========================================================================
  // 11. END SCREEN & GAME.END() PLATFORM INTEGRATION
  // =========================================================================
  function calculateStars() {
    const acc = state.totalAttempted > 0 ? (state.totalCorrect / state.totalAttempted) : 0;
    if (state.lives <= 0 && state.currentLevelIndex === 0) {
      return 0;
    }
    if (state.score >= 1800 || (acc >= 0.8 && state.lives > 0)) {
      return 3;
    }
    if (state.score >= 1100 || acc >= 0.5) {
      return 2;
    }
    return 1;
  }

  function displayEndScreen(success) {
    setScreen('end');

    const endTitle = $('end-title');
    const endSubtitle = $('end-subtitle');
    const statusPill = $('end-status-pill');

    const stars = calculateStars();

    if (endTitle) endTitle.textContent = success ? 'Mission Accomplished!' : 'Orbital Shields Expired!';
    if (endSubtitle) {
      endSubtitle.textContent = success 
        ? 'All telemetry measurements estimated and docked with supreme flight accuracy!' 
        : 'The orbital capsule trajectory drifted off course. Recalibrate your rounding!';
    }
    if (statusPill) {
      statusPill.textContent = success ? 'CHIEF NAVIGATOR CERTIFIED' : 'TRAJECTORY DRIFT';
      statusPill.style.color = success ? '#10b981' : '#f43f5e';
    }

    const starSlots = [$('star-slot-1'), $('star-slot-2'), $('star-slot-3')];
    starSlots.forEach((slot, idx) => {
      if (!slot) return;
      slot.classList.remove('earned');
      if (idx < stars) {
        setTimeout(() => {
          slot.classList.add('earned');
          playTone(523 + idx * 220, 'triangle', 0.25, 0.2);
        }, (idx + 1) * 250);
      }
    });

    const starsLabel = $('stars-label');
    if (starsLabel) {
      const labels = [
        '0 STARS: RE-ALIGNMENT REQUIRED',
        '1 STAR: TRAINEE NAVIGATOR',
        '2 STARS: SKILLED FLIGHT OFFICER',
        '3 STARS: MASTER ORBITAL NAVIGATOR'
      ];
      starsLabel.textContent = labels[stars] || labels[1];
    }

    const metricScore = $('end-metric-score');
    const metricAcc = $('end-metric-accuracy');
    const metricStreak = $('end-metric-streak');
    const metricLives = $('end-metric-lives');

    if (metricScore) metricScore.textContent = state.score.toLocaleString();
    const acc = Math.round((state.totalCorrect / Math.max(1, state.totalAttempted)) * 100);
    if (metricAcc) metricAcc.textContent = `${acc}%`;
    if (metricStreak) metricStreak.textContent = `x${Math.min(3, 1 + state.maxStreak * 0.5)}`;
    if (metricLives) metricLives.textContent = `${Math.max(0, state.lives)}/${state.maxLives}`;
  }

  function resetGame() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.currentLevelIndex = 0;
    state.currentItemIndex = 0;
    state.score = 0;
    state.streak = 0;
    state.maxStreak = 0;
    state.lives = state.maxLives;
    state.totalAttempted = 0;
    state.totalCorrect = 0;
    state.timeRemaining = 40;
    state.isTransitioning = false;
    state.capsuleFlight = null;

    const overlay = $('overlay-level-clear');
    if (overlay) overlay.style.display = 'none';

    updateHUD();
    setScreen('start');
  }

  function submitScore() {
    sfxClick();
    const stars = calculateStars();
    const payload = {
      score: state.score,
      stars: stars,
      success: state.lives > 0,
      maxScore: 3500,
      meta: {
        accuracy: Math.round((state.totalCorrect / Math.max(1, state.totalAttempted)) * 100),
        levelReached: state.currentLevelIndex + 1,
        maxStreak: state.maxStreak
      }
    };

    console.log('[Aero-Dock] Submitting game results to engine:', payload);
    if (typeof game !== 'undefined' && typeof game.end === 'function') {
      game.end(payload);
    } else {
      alert(`Game Submitted!\nScore: ${payload.score}\nStars: ${payload.stars} / 3\nSuccess: ${payload.success}`);
    }
  }

  // =========================================================================
  // 12. FULLSCREEN TOGGLE HELPER
  // =========================================================================
  function toggleFullscreen() {
    sfxClick();
    const wrapper = $('game-wrapper');
    const icon = $('fullscreen-icon');
    if (!document.fullscreenElement) {
      if (wrapper && wrapper.requestFullscreen) {
        wrapper.requestFullscreen().catch(() => {});
      } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      if (icon) icon.textContent = '🗗';
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      if (icon) icon.textContent = '⛶';
    }
  }

  // =========================================================================
  // 13. EVENT LISTENERS INITIALIZATION
  // =========================================================================
  function initEvents() {
    const doc = getDoc();
    const unlockAudio = () => {
      initAudio();
      startBgMusic();
      doc.removeEventListener('click', unlockAudio);
      doc.removeEventListener('touchstart', unlockAudio);
    };
    doc.addEventListener('click', unlockAudio);
    doc.addEventListener('touchstart', unlockAudio, { passive: true });

    const btnSound = $('btn-sound-toggle');
    if (btnSound) btnSound.addEventListener('click', toggleSound);

    const btnFullscreen = $('btn-fullscreen-toggle');
    if (btnFullscreen) btnFullscreen.addEventListener('click', toggleFullscreen);

    const btnNavRestart = $('btn-nav-restart');
    if (btnNavRestart) {
      btnNavRestart.addEventListener('click', () => {
        sfxClick();
        if (confirm('Return to main menu? Current session progress will be lost.')) {
          resetGame();
        }
      });
    }

    const btnPlay = $('btn-play');
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        sfxClick();
        initAudio();
        startBgMusic();
        startLevel(0);
      });
    }

    const btnInstructions = $('btn-instructions');
    if (btnInstructions) {
      btnInstructions.addEventListener('click', () => {
        sfxClick();
        setScreen('instructions');
      });
    }

    const btnInstrPlay = $('btn-instruction-play');
    if (btnInstrPlay) {
      btnInstrPlay.addEventListener('click', () => {
        sfxClick();
        initAudio();
        startBgMusic();
        startLevel(0);
      });
    }

    const btnInstrBack = $('btn-instruction-back');
    if (btnInstrBack) {
      btnInstrBack.addEventListener('click', () => {
        sfxClick();
        setScreen('start');
      });
    }

    const btnLaunch = $('btn-launch-capsule');
    if (btnLaunch) {
      btnLaunch.addEventListener('click', () => {
        launchCapsule();
      });
    }

    const btnNextLvl = $('btn-next-level');
    if (btnNextLvl) {
      btnNextLvl.addEventListener('click', () => {
        sfxClick();
        proceedNextLevel();
      });
    }

    const btnTryAgain = $('btn-try-again');
    if (btnTryAgain) {
      btnTryAgain.addEventListener('click', () => {
        sfxClick();
        resetGame();
      });
    }

    const btnSubmit = $('btn-submit');
    if (btnSubmit) {
      btnSubmit.addEventListener('click', submitScore);
    }

    window.addEventListener('resize', () => {
      resizeFlightCanvas();
    });

    initSliderInteraction();
  }

  // =========================================================================
  // 14. BOOTSTRAP INITIALIZATION
  // =========================================================================
  function init() {
    initEvents();
    startHeroPreviewAnimation();
    renderFlightStage();
    setScreen('start');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
