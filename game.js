(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('gameOverlay');
  const messageEl = document.getElementById('gameMessage');
  const scoreEl = document.getElementById('scoreDisplay');
  const bestEl = document.getElementById('bestDisplay');

  const W = 800;
  const H = 250;
  const GROUND_Y = H - 40;
  const GRAVITY = 0.6;
  const JUMP_FORCE = -11;
  const BASE_SPEED = 4;

  let state = 'idle'; // idle | playing | dead
  let score = 0;
  let best = parseInt(localStorage.getItem('apt-hunt-best') || '0', 10);
  let frameCount = 0;
  let speed = BASE_SPEED;

  bestEl.textContent = best;

  // Player
  const player = {
    x: 80,
    y: GROUND_Y,
    w: 28,
    h: 40,
    vy: 0,
    jumping: false,
    frame: 0,
  };

  // Obstacles & collectibles
  let obstacles = [];
  let collectibles = [];
  let particles = [];
  let clouds = [];

  const OBSTACLE_TYPES = [
    { emoji: '🪳', label: 'ROACH', w: 28, h: 28 },
    { emoji: '🚫', label: 'NO PETS', w: 32, h: 32 },
    { emoji: '📦', label: 'TINY APT', w: 36, h: 36 },
    { emoji: '💸', label: 'BROKER FEE', w: 30, h: 30 },
    { emoji: '🔨', label: 'RENO', w: 30, h: 30 },
  ];

  const COLLECTIBLE_TYPES = [
    { emoji: '🌿', label: 'PLANT', points: 10 },
    { emoji: '☀️', label: 'SKYLIGHT', points: 15 },
    { emoji: '🔑', label: 'KEYS!', points: 25 },
    { emoji: '🛁', label: 'NICE TUB', points: 15 },
    { emoji: '🪟', label: 'BAY WINDOW', points: 20 },
  ];

  function reset() {
    player.y = GROUND_Y;
    player.vy = 0;
    player.jumping = false;
    player.frame = 0;
    obstacles = [];
    collectibles = [];
    particles = [];
    clouds = [];
    score = 0;
    frameCount = 0;
    speed = BASE_SPEED;
    scoreEl.textContent = '0';

    for (let i = 0; i < 4; i++) {
      clouds.push({
        x: Math.random() * W,
        y: 20 + Math.random() * 60,
        size: 20 + Math.random() * 30,
        speed: 0.3 + Math.random() * 0.5,
      });
    }
  }

  function jump() {
    if (state === 'idle') {
      state = 'playing';
      overlay.classList.add('hidden');
      reset();
      loop();
      return;
    }
    if (state === 'dead') {
      state = 'playing';
      overlay.classList.add('hidden');
      reset();
      return;
    }
    if (!player.jumping) {
      player.vy = JUMP_FORCE;
      player.jumping = true;
    }
  }

  function spawnObstacle() {
    const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
    obstacles.push({
      x: W + 20,
      y: GROUND_Y - type.h + 8,
      ...type,
    });
  }

  function spawnCollectible() {
    const type = COLLECTIBLE_TYPES[Math.floor(Math.random() * COLLECTIBLE_TYPES.length)];
    const floatY = GROUND_Y - 50 - Math.random() * 60;
    collectibles.push({
      x: W + 20,
      y: floatY,
      w: 26,
      h: 26,
      ...type,
    });
  }

  function addParticles(x, y, color, count = 6) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 30,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }

  function collides(a, b) {
    const pad = 6;
    return (
      a.x + pad < b.x + b.w - pad &&
      a.x + a.w - pad > b.x + pad &&
      a.y + pad < b.y + b.h - pad &&
      a.y + a.h - pad > b.y + pad
    );
  }

  function update() {
    frameCount++;
    speed = BASE_SPEED + Math.floor(frameCount / 500) * 0.5;

    // Player physics
    player.vy += GRAVITY;
    player.y += player.vy;
    if (player.y >= GROUND_Y) {
      player.y = GROUND_Y;
      player.vy = 0;
      player.jumping = false;
    }
    player.frame++;

    // Spawn
    const spawnRate = Math.max(60, 120 - Math.floor(frameCount / 300) * 10);
    if (frameCount % spawnRate === 0) spawnObstacle();
    if (frameCount % (spawnRate + 40) === 0) spawnCollectible();

    // Move obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].x -= speed;
      if (obstacles[i].x < -50) {
        obstacles.splice(i, 1);
        score++;
        scoreEl.textContent = score;
        continue;
      }
      if (collides(player, obstacles[i])) {
        die();
        return;
      }
    }

    // Move collectibles
    for (let i = collectibles.length - 1; i >= 0; i--) {
      collectibles[i].x -= speed;
      collectibles[i].y += Math.sin(frameCount * 0.05 + i) * 0.5;
      if (collectibles[i].x < -50) {
        collectibles.splice(i, 1);
        continue;
      }
      if (collides(player, collectibles[i])) {
        score += collectibles[i].points;
        scoreEl.textContent = score;
        addParticles(collectibles[i].x + 13, collectibles[i].y + 13, '#a8d4a6');
        collectibles.splice(i, 1);
      }
    }

    // Clouds
    clouds.forEach((c) => {
      c.x -= c.speed;
      if (c.x < -c.size) c.x = W + c.size;
    });

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function die() {
    state = 'dead';
    addParticles(player.x + 14, player.y + 20, '#d4a574', 12);
    if (score > best) {
      best = score;
      localStorage.setItem('apt-hunt-best', String(best));
      bestEl.textContent = best;
    }
    messageEl.textContent = `Score: ${score}! Tap or Space to retry`;
    overlay.classList.remove('hidden');
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#e8e0d0');
    sky.addColorStop(1, '#f5f0e8');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Clouds
    ctx.fillStyle = 'rgba(200, 195, 180, 0.5)';
    clouds.forEach((c) => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
      ctx.arc(c.x + c.size * 0.6, c.y - c.size * 0.2, c.size * 0.7, 0, Math.PI * 2);
      ctx.arc(c.x - c.size * 0.4, c.y + c.size * 0.1, c.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Ground
    ctx.fillStyle = '#c8bfa8';
    ctx.fillRect(0, GROUND_Y + player.h - 4, W, H - GROUND_Y);

    // Ground line detail
    ctx.strokeStyle = '#b0a890';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + player.h - 3);
    ctx.lineTo(W, GROUND_Y + player.h - 3);
    ctx.stroke();
    ctx.setLineDash([]);

    // Background buildings silhouette
    ctx.fillStyle = 'rgba(180, 170, 155, 0.3)';
    const buildingPositions = [50, 130, 210, 300, 400, 500, 580, 660, 740];
    buildingPositions.forEach((bx) => {
      const bh = 40 + Math.sin(bx * 0.05) * 30;
      const bw = 25 + Math.sin(bx * 0.03) * 15;
      ctx.fillRect(bx, GROUND_Y + player.h - 4 - bh, bw, bh);
    });

    // Player
    drawPlayer();

    // Obstacles
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    obstacles.forEach((o) => {
      ctx.fillText(o.emoji, o.x + o.w / 2, o.y + o.h - 2);
    });

    // Collectibles (with glow)
    collectibles.forEach((c) => {
      ctx.save();
      ctx.shadowColor = 'rgba(168, 212, 166, 0.6)';
      ctx.shadowBlur = 10;
      ctx.font = '22px sans-serif';
      ctx.fillText(c.emoji, c.x + c.w / 2, c.y + c.h - 2);
      ctx.restore();
    });

    // Particles
    particles.forEach((p) => {
      ctx.globalAlpha = p.life / 30;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / 30), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawPlayer() {
    const px = player.x;
    const py = player.y;

    // Body
    ctx.fillStyle = '#3a3a30';
    ctx.fillRect(px + 8, py + 14, 12, 16);

    // Head
    ctx.fillStyle = '#d4a574';
    ctx.beginPath();
    ctx.arc(px + 14, py + 10, 9, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#5a3a20';
    ctx.beginPath();
    ctx.arc(px + 14, py + 7, 9, Math.PI, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#2a2a20';
    ctx.fillRect(px + 11, py + 9, 2, 2);
    ctx.fillRect(px + 16, py + 9, 2, 2);

    // Smile
    ctx.strokeStyle = '#2a2a20';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px + 14, py + 12, 3, 0.1, Math.PI - 0.1);
    ctx.stroke();

    // Legs (animated)
    ctx.fillStyle = '#5a5a4e';
    if (player.jumping) {
      ctx.fillRect(px + 8, py + 30, 5, 8);
      ctx.fillRect(px + 15, py + 28, 5, 8);
    } else {
      const legOffset = Math.sin(player.frame * 0.15) * 3;
      ctx.fillRect(px + 8, py + 30, 5, 10);
      ctx.fillRect(px + 15, py + 30 + legOffset, 5, 10);
    }
  }

  function loop() {
    if (state === 'playing') {
      update();
    }
    draw();
    if (state !== 'idle') {
      requestAnimationFrame(loop);
    } else {
      draw();
    }
  }

  // Initial draw
  reset();
  draw();

  // Input
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      jump();
    }
  });

  canvas.addEventListener('click', jump);
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    jump();
  }, { passive: false });

  overlay.addEventListener('click', jump);
  overlay.addEventListener('touchstart', (e) => {
    e.preventDefault();
    jump();
  }, { passive: false });
})();
