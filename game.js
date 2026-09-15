(() => {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const levelTagEl = document.getElementById('level-tag');
  const nextLevelEl = document.getElementById('next-level');
  const pauseBtn = document.getElementById('pause-btn');

  const startOverlay = document.getElementById('start-overlay');
  const pauseOverlay = document.getElementById('pause-overlay');
  const overOverlay = document.getElementById('over-overlay');
  const finalScoreEl = document.getElementById('final-score');
  const newBestTag = document.getElementById('newbest-tag');

  const STORAGE_KEY = 'spinbounce-best-score-v1';
  const TUTORIAL_KEY = 'spinbounce-tutorial-seen-v1';

  const RING_GAP = 118;
  const TOWER_RX = 92;
  const TOWER_RY = 26;
  const BALL_R = 13;
  const GRAVITY = 0.62;
  const APEX_BUFFER = 72;
  const LANDING_BAND = 20;
  const FRONT_ANGLE = 90;
  const PERFECT_TOL = 14;

  const LEVELS = [
    { min: 0, name: 'LEVEL 1', bg: ['#0c1030', '#141b46'], plat: ['#5ec8ff', '#7ea8ff'] },
    { min: 10, name: 'LEVEL 2', bg: ['#170b34', '#2b1054'], plat: ['#c07bff', '#8f6bff'] },
    { min: 25, name: 'LEVEL 3', bg: ['#2a0b12', '#4a1020'], plat: ['#ff5f7a', '#ff8a5c'] },
    { min: 50, name: 'LEVEL 4', bg: ['#031418', '#08262c'], plat: ['#3dffd0', '#4dd6ff'] },
    { min: 75, name: 'LEVEL 5', bg: ['#050510', '#0a0a22'], plat: ['#e9e9ff', '#9aa8ff'] },
  ];

  let W = 0;
  let H = 0;
  let DPR = 1;

  let state = 'start';
  let score = 0;
  let combo = 0;
  let best = 0;
  let rotationAngle = 0;
  let rotationDir = 1;
  let rotationSpeed = 1.6;
  let cameraY = 0;
  let shake = 0;
  let particles = [];
  let popups = [];
  let rings = {};

  let ball = {
    y: -620,
    vy: 0,
    platformIndex: 0,
    mode: 'intro',
    idleT: 0,
  };

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function levelFor(index) {
    let current = LEVELS[0];
    for (const level of LEVELS) {
      if (index >= level.min) current = level;
    }
    return current;
  }

  function tierFor(index) {
    if (index < 10) return 0;
    if (index < 25) return 1;
    if (index < 50) return 2;
    if (index < 75) return 3;
    return 4;
  }

  function loadBestScore() {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    best = Number.isFinite(stored) && stored > 0 ? stored : 0;
  }

  function saveBestScore() {
    localStorage.setItem(STORAGE_KEY, String(best));
  }

  function hasSeenTutorial() {
    return localStorage.getItem(TUTORIAL_KEY) === '1';
  }

  function markTutorialSeen() {
    localStorage.setItem(TUTORIAL_KEY, '1');
  }

  function showTutorialHint() {
    const tutorial = document.getElementById('tutorial-panel');
    if (!tutorial) return;

    tutorial.style.display = hasSeenTutorial() ? 'none' : 'block';
  }

  function updateHud() {
    scoreEl.textContent = String(score);
    bestEl.textContent = 'BEST ' + best;
    levelTagEl.textContent = levelFor(score).name;

    const nextLevel = LEVELS.find((level) => level.min > score);
    nextLevelEl.textContent = nextLevel ? (nextLevel.min - score) + ' to next level' : 'final level';
  }

  function ringData(index) {
    if (index <= 2) {
      return { baseAngle: FRONT_ANGLE, arcWidth: 9999, speedMult: 1 };
    }

    if (!rings[index]) {
      const tier = tierFor(index);
      const arcWidths = [130, 108, 82, 58, 40];
      const speedBoost = tier === 4 ? 0.18 + Math.random() * 0.4 : 0.12 + Math.random() * 0.18;

      rings[index] = {
        baseAngle: Math.random() * 360,
        arcWidth: arcWidths[tier],
        speedMult: 1 + speedBoost,
      };
    }

    return rings[index];
  }

  function ringAngleNow(index) {
    const ring = ringData(index);
    return (ring.baseAngle + rotationAngle * rotationDir * ring.speedMult) % 360;
  }

  function angleDiff(a, b) {
    return ((a - b + 540) % 360) - 180;
  }

  function baseSpeedForIndex(index) {
    const tier = tierFor(index);
    const speeds = [1.7, 2.5, 3.2, 4.2, 5.4];
    return speeds[tier];
  }

  function difficultyBonus() {
    return Math.min(3.8, score * 0.04 + Math.max(0, combo - 1) * 0.18);
  }

  function resetGame() {
    score = 0;
    combo = 0;
    rotationAngle = 0;
    rotationDir = 1;
    rotationSpeed = 1.6;
    cameraY = 0;
    shake = 0;
    particles = [];
    popups = [];
    rings = {};
    ball = { y: -620, vy: 0, platformIndex: 0, mode: 'intro', idleT: 0 };
    updateHud();
  }

  function triggerHaptics(pattern) {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  function playAudioCue(name) {
    // Audio is intentionally left as a TODO because you mentioned you want to handle this personally.
    // Hook your own audio engine in here later, for example:
    // if (name === 'jump') jumpSound?.play();
    // if (name === 'land') landSound?.play();
    // if (name === 'perfect') perfectSound?.play();
    // if (name === 'gameover') gameOverSound?.play();
  }

  function spawnParticles(x, y, color, count, spread) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.6 + Math.random() * 2.4) * spread;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.6 - 1.2,
        life: 1,
        decay: 0.018 + Math.random() * 0.02,
        color,
        r: 2 + Math.random() * 2.5,
      });
    }
  }

  function popupText(text, color) {
    popups.push({ text, color, t: 1, x: 0 });
  }

  function ballScreenY() {
    return H * 0.62 + (ball.y - cameraY);
  }

  function launchBall() {
    const targetIndex = ball.platformIndex + 1;
    const targetY = -targetIndex * RING_GAP;
    const distance = Math.abs(ball.y - targetY) + APEX_BUFFER;
    ball.vy = -Math.sqrt(Math.max(2 * GRAVITY * distance, 1));
    ball.mode = 'flying';
    playAudioCue('jump');
    triggerHaptics(12);
    spawnParticles(0, ballScreenY(), '#dfe8ff', 12, 2.4);
  }

  function landOn(index, diff) {
    const perfect = Math.abs(diff) <= PERFECT_TOL;
    ball.platformIndex = index;
    ball.y = -index * RING_GAP;
    ball.vy = 0;
    ball.mode = 'idle';
    ball.idleT = 8;

    combo += 1;
    if (perfect) {
      score += 3;
      popupText('PERFECT +3', '#ffd98f');
      playAudioCue('perfect');
      triggerHaptics(20);
      spawnParticles(0, ballScreenY(), '#ffd98f', 22, 3.2);
    } else {
      score += 1;
      popupText('CLEAR +1', '#a2d4ff');
      playAudioCue('land');
      triggerHaptics(10);
      spawnParticles(0, ballScreenY(), '#99d5ff', 14, 2.4);
    }

    if (combo > 1 && combo % 5 === 0) {
      const bonus = 2 + Math.floor(combo / 5);
      score += bonus;
      popupText('COMBO BONUS +' + bonus, '#97ffd7');
    }

    if (score > best) {
      best = score;
      saveBestScore();
    }

    updateHud();
  }

  function missFall() {
    ball.mode = 'dead';
    combo = 0;
    shake = 14;
    playAudioCue('gameover');
    triggerHaptics([30, 50, 30]);
    spawnParticles(0, ballScreenY(), '#ff6b7a', 26, 3.6);
    setTimeout(triggerGameOver, 480);
  }

  function startGame() {
    resetGame();
    state = 'playing';
    startOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    pauseBtn.style.display = 'block';
    markTutorialSeen();
    showTutorialHint();
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      pauseOverlay.classList.remove('hidden');
      pauseBtn.textContent = 'Resume';
      return;
    }

    if (state === 'paused') {
      state = 'playing';
      pauseOverlay.classList.add('hidden');
      pauseBtn.textContent = 'Pause';
    }
  }

  function restartGame() {
    resetGame();
    overOverlay.classList.add('hidden');
    state = 'playing';
    pauseBtn.textContent = 'Pause';
    pauseBtn.style.display = 'block';
    markTutorialSeen();
    showTutorialHint();
  }

  function triggerGameOver() {
    state = 'gameover';
    finalScoreEl.textContent = score;
    newBestTag.style.visibility = score > 0 && score === best ? 'visible' : 'hidden';
    overOverlay.classList.remove('hidden');
    pauseBtn.style.display = 'none';
  }

  function handleJump() {
    if (state === 'start') {
      startGame();
      return;
    }

    if (state === 'paused') {
      return;
    }

    if (state === 'gameover') {
      return;
    }

    if (ball.mode === 'idle' && ball.idleT <= 0) {
      launchBall();
    }
  }

  function update() {
    if (state !== 'playing') return;

    const targetRotationSpeed = baseSpeedForIndex(ball.platformIndex) + difficultyBonus();
    rotationSpeed = targetRotationSpeed;
    rotationAngle += rotationSpeed * rotationDir;

    const targetCam = -ball.platformIndex * RING_GAP;
    cameraY += (targetCam - cameraY) * 0.28;

    if (ball.mode === 'intro') {
      ball.vy += GRAVITY;
      ball.y += ball.vy;
      if (ball.y >= 0) {
        ball.y = 0;
        ball.vy = 0;
        ball.mode = 'idle';
        ball.idleT = 12;
        shake = 5;
        spawnParticles(0, ballScreenY(), '#ffffff', 14, 2.4);
      }
    } else if (ball.mode === 'idle') {
      if (ball.idleT > 0) {
        ball.idleT -= 1;
      }
    } else if (ball.mode === 'flying') {
      ball.vy += GRAVITY;
      ball.y += ball.vy;

      const targetIndex = ball.platformIndex + 1;
      const targetY = -targetIndex * RING_GAP;
      if (ball.vy > 0) {
        const dist = ball.y - targetY;
        if (dist >= -LANDING_BAND && dist <= LANDING_BAND) {
          const ringAng = ringAngleNow(targetIndex);
          const diff = angleDiff(ringAng, FRONT_ANGLE);
          const arcWidth = ringData(targetIndex).arcWidth;
          if (Math.abs(diff) <= arcWidth / 2) {
            landOn(targetIndex, diff);
          }
        } else if (dist > LANDING_BAND) {
          missFall();
        }
      }
    } else if (ball.mode === 'dead') {
      ball.vy += GRAVITY * 0.7;
      ball.y += ball.vy;
    }

    if (shake > 0) {
      shake *= 0.88;
    }

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.life -= p.decay;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    for (let i = popups.length - 1; i >= 0; i -= 1) {
      popups[i].t -= 0.02;
      if (popups[i].t <= 0) {
        popups.splice(i, 1);
      }
    }
  }

  function drawRing(index, colorPair) {
    const y = H * 0.62 + (-index * RING_GAP - cameraY);
    if (y < -60 || y > H + 60) return;
    const cx = W / 2;

    ctx.save();
    ctx.translate(cx, y);
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, TOWER_RX, TOWER_RY, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (index <= ball.platformIndex) {
      const t = performance.now() * 0.001;
      const pulse = 0.7 + Math.sin(t * 1.8 + index * 0.9) * 0.3;

      ctx.save();
      ctx.translate(cx, y);
      ctx.fillStyle = colorPair[0];
      ctx.shadowColor = colorPair[1];
      ctx.shadowBlur = 16 + pulse * 16;
      ctx.beginPath();
      ctx.ellipse(0, 0, TOWER_RX, TOWER_RY, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 + pulse * 0.25;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, TOWER_RX * 0.72, TOWER_RY * 0.72, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(cx, y);
      ctx.globalCompositeOperation = 'lighter';
      const sparkleCount = 3;
      for (let s = 0; s < sparkleCount; s++) {
        const a = t * 1.1 + index * 2.1 + (s / sparkleCount) * Math.PI * 2;
        const sx = Math.cos(a) * TOWER_RX * 0.86;
        const sy = Math.sin(a) * TOWER_RY * 0.86;
        ctx.globalAlpha = 0.55 + Math.sin(t * 3 + s + index) * 0.35;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    const ring = ringData(index);
    const ang = ringAngleNow(index);
    const half = ring.arcWidth / 2;
    const startA = (ang - half) * Math.PI / 180;
    const endA = (ang + half) * Math.PI / 180;

    ctx.save();
    ctx.translate(cx, y);
    ctx.scale(1, TOWER_RY / TOWER_RX);
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.strokeStyle = colorPair[0];
    ctx.shadowColor = colorPair[1];
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(0, 0, TOWER_RX, startA, endA);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    const level = levelFor(Math.max(score, ball.platformIndex));

    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, level.bg[1]);
    gradient.addColorStop(1, level.bg[0]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    if (level === LEVELS[4]) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let s = 0; s < 40; s++) {
        const sx = (s * 97) % W;
        const sy = (s * 53 + performance.now() * 0.01) % H;
        ctx.globalAlpha = 0.15 + ((s * 37) % 50) / 100;
        ctx.fillRect(sx, sy, 1.6, 1.6);
      }
      ctx.globalAlpha = 1;
    }

    ctx.save();
    const offsetX = shake ? (Math.random() - 0.5) * shake : 0;
    const offsetY = shake ? (Math.random() - 0.5) * shake : 0;
    ctx.translate(offsetX, offsetY);

    const cx = W / 2;

    ctx.save();
    const columnGradient = ctx.createLinearGradient(cx - 18, 0, cx + 18, 0);
    columnGradient.addColorStop(0, 'rgba(255,255,255,0.02)');
    columnGradient.addColorStop(0.5, 'rgba(255,255,255,0.09)');
    columnGradient.addColorStop(1, 'rgba(255,255,255,0.02)');
    ctx.fillStyle = columnGradient;
    ctx.fillRect(cx - 18, 0, 36, H);
    ctx.restore();

    const baseIndex = Math.max(0, ball.platformIndex - 1);
    for (let i = baseIndex; i <= ball.platformIndex + 7; i += 1) {
      drawRing(i, levelFor(i).plat);
    }

    const by = ballScreenY();
    if (state !== 'start') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(cx, by, 0, cx, by, BALL_R * 3.4);
      glow.addColorStop(0, 'rgba(255,255,255,0.95)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, by, BALL_R * 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#bcd4ff';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(cx, by, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const particle of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(particle.life, 0);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(cx + particle.x, particle.y, particle.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.textAlign = 'center';
    for (const popup of popups) {
      ctx.save();
      ctx.globalAlpha = Math.min(popup.t * 1.4, 1);
      ctx.fillStyle = popup.color;
      ctx.font = '700 20px Segoe UI, system-ui, sans-serif';
      ctx.shadowColor = popup.color;
      ctx.shadowBlur = 10;
      ctx.fillText(popup.text, cx, by - 70 - (1 - popup.t) * 40);
      ctx.restore();
    }

    ctx.restore();
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  function bindEvents() {
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', handleJump);
    pauseBtn.addEventListener('click', () => {
      if (state === 'paused' || state === 'playing') {
        togglePause();
      }
    });

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('resume-btn').addEventListener('click', togglePause);
    document.getElementById('pause-restart-btn').addEventListener('click', restartGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);

    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        handleJump();
      }

      if (event.key === 'Escape' && (state === 'playing' || state === 'paused')) {
        togglePause();
      }
    });
  }

  function init() {
    loadBestScore();
    resize();
    bindEvents();
    updateHud();
    showTutorialHint();
    pauseBtn.style.display = state === 'playing' ? 'block' : 'block';
    pauseBtn.textContent = 'Pause';
    resetGame();
    loop();
  }

  init();
})();
