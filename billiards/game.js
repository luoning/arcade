// --- 游戏状态与核心配置 ---
let canvas, ctx;
let audioCtx = null;
let spinOffset = { x: 0, y: 0 }; // 击球点偏移量 [-1, 1]

const TABLE_WIDTH = 840;  // 模拟外围物理尺寸
const TABLE_HEIGHT = 478; // 包含 30px 上下 rail 宽度以适应 2:1 的 840x418 台面比例
const BALL_RADIUS = 9;
const FRICTION = 0.985; // 减速摩擦系数
const pocketRadius = 30;

// 斯诺克初始点位 (以 840x478 比例精确对应 WPBSA 3.569m x 1.778m 2:1 比例)
const SPOTS = {
  BAULK_LINE: 210, // D区限制线 X 坐标
  D_RADIUS: 60,    // D区半径
  BROWN: { x: 210, y: 239 },
  YELLOW: { x: 210, y: 239 + 40 },
  GREEN: { x: 210, y: 239 - 40 },
  BLUE: { x: 420, y: 239 },
  PINK: { x: 630, y: 239 },
  BLACK: { x: 740, y: 239 }
};

// 模式
let currentMode = 'snooker_ai'; // snooker_ai, snooker_pvp, minefield, time_attack
let isGameOver = false;

// 斯诺克局势变量
let p1Score = 0;
let p2Score = 0;
let arcadeScore = 0;
let timeAttackTimer = 60;
let timerInterval = null;
let currentTurn = 1; // 1: Player 1, 2: Player 2 / AI
let ballOn = 'red'; // 'red' or 'color' (彩球) or specific color in clearance (yellow, green, etc.)
let selectedColorNomination = null; // 选中的彩色目标球
let firstBallHitThisTurn = null; // 本次击球母球最先撞击的球
let pocketedRedsThisShot = 0;
let pocketedColorsThisShot = [];
let scratchOccurred = false; // 母球摔袋
let foulOccurred = false;
let foulMessage = "";

// 蓄力与球杆
let isAiming = false;
let isCharging = false;
let chargePower = 0;
const MAX_POWER = 18;
let cueAngle = 0; // 弧度
let canPlaceCueBall = true;    // 是否处于手中球（D区自由摆球）阶段
let isDraggingCueBall = false; // 是否正在拖动母球

// 实体数组
let balls = [];
let cueBall = null;
let pockets = [];
let mines = []; // 仅雷区模式
let particles = []; // 粒子特效

// --- 声音合成器 (Web Audio API) ---
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(type) {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'hit_cue') {
      // 击球声
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(10, now + 0.15);
      gainNode.gain.setValueAtTime(0.5, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'collision') {
      // 球体碰撞
      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'pocket') {
      // 落袋声
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);
      gainNode.gain.setValueAtTime(0.6, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'explosion') {
      // 雷区爆炸声 (噪音合成)
      const bufferSize = audioCtx.sampleRate * 0.4;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(50, now + 0.4);

      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.gain.setValueAtTime(0.7, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      noise.start(now);
      noise.stop(now + 0.4);
    } else if (type === 'foul') {
      // 犯规警报
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.setValueAtTime(80, now + 0.15);
      gainNode.gain.setValueAtTime(0.4, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (e) {
    console.error(e);
  }
}

// --- 初始化与页面绑定 ---
window.onload = () => {
  canvas = document.getElementById('billiardsCanvas');
  ctx = canvas.getContext('2d');
  
  // 6个袋口坐标
  pockets = [
    { x: 30, y: 30 },                     // 左上
    { x: TABLE_WIDTH / 2, y: 25 },        // 中上
    { x: TABLE_WIDTH - 30, y: 30 },       // 右上
    { x: 30, y: TABLE_HEIGHT - 30 },      // 左下
    { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT - 25 }, // 中下
    { x: TABLE_WIDTH - 30, y: TABLE_HEIGHT - 30 }  // 右下
  ];

  // 绑定交互事件
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mouseup', handleMouseUp);
  
  // 旋转盘 (Spin Pad) 拖拽事件监听绑定
  const spinPad = document.getElementById('spin-pad');
  const spinCursor = document.getElementById('spin-cursor');
  const spinValsTxt = document.getElementById('spin-vals-txt');
  let isDraggingSpin = false;
  
  function updateSpinOffset(clientX, clientY) {
    const rect = spinPad.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width / 2 - 5;
    
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    
    const dist = Math.hypot(dx, dy);
    if (dist > radius) {
      dx = (dx / dist) * radius;
      dy = (dy / dist) * radius;
    }
    
    spinOffset.x = dx / radius; // 左塞(-) 或 右塞(+)
    spinOffset.y = -dy / radius; // 缩杆(-) 或 推杆(+)
    
    spinCursor.style.left = (50 + (dx / rect.width) * 100) + '%';
    spinCursor.style.top = (50 + (dy / rect.height) * 100) + '%';
    
    let spinTypeY = spinOffset.y > 0.05 ? '推杆' : (spinOffset.y < -0.05 ? '拉杆' : '无推拉');
    let spinTypeX = spinOffset.x > 0.05 ? '右塞' : (spinOffset.x < -0.05 ? '左塞' : '无偏塞');
    spinValsTxt.innerText = `${spinTypeY}: ${Math.abs(spinOffset.y).toFixed(1)} | ${spinTypeX}: ${Math.abs(spinOffset.x).toFixed(1)}`;
  }
  
  spinPad.addEventListener('mousedown', (e) => {
    isDraggingSpin = true;
    updateSpinOffset(e.clientX, e.clientY);
  });
  
  window.addEventListener('mousemove', (e) => {
    if (isDraggingSpin) {
      updateSpinOffset(e.clientX, e.clientY);
    }
  });
  
  window.addEventListener('mouseup', () => {
    isDraggingSpin = false;
  });
  
  spinPad.addEventListener('touchstart', (e) => {
    isDraggingSpin = true;
    if (e.touches.length > 0) {
      updateSpinOffset(e.touches[0].clientX, e.touches[0].clientY);
    }
  });
  
  spinPad.addEventListener('touchmove', (e) => {
    if (isDraggingSpin && e.touches.length > 0) {
      updateSpinOffset(e.touches[0].clientX, e.touches[0].clientY);
    }
  });
  
  window.addEventListener('touchend', () => {
    isDraggingSpin = false;
  });

  // 触摸设备绑定：支持移动端拖球与瞄准
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const mouseX = (touch.clientX - rect.left) * (canvas.width / rect.width);
      const mouseY = (touch.clientY - rect.top) * (canvas.height / rect.height);
      
      if (canPlaceCueBall && Math.hypot(mouseX - cueBall.x, mouseY - cueBall.y) < BALL_RADIUS * 3.5) {
        isDraggingCueBall = true;
        e.preventDefault();
      }
    }
  });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const mouseX = (touch.clientX - rect.left) * (canvas.width / rect.width);
      const mouseY = (touch.clientY - rect.top) * (canvas.height / rect.height);
      
      if (isDraggingCueBall) {
        let dx = mouseX - SPOTS.BROWN.x;
        let dy = mouseY - SPOTS.BROWN.y;
        if (dx > 0) dx = 0;
        if (Math.hypot(dx, dy) > SPOTS.D_RADIUS) {
          let angle = Math.atan2(dy, dx);
          dx = Math.cos(angle) * SPOTS.D_RADIUS;
          dy = Math.sin(angle) * SPOTS.D_RADIUS;
        }
        cueBall.x = SPOTS.BROWN.x + dx;
        cueBall.y = SPOTS.BROWN.y + dy;
      } else {
        updateAimAngle(mouseX, mouseY);
      }
    }
  });

  canvas.addEventListener('touchend', () => {
    if (isDraggingCueBall) {
      isDraggingCueBall = false;
      resolveCueBallOverlapAfterPlacement();
    }
  });

  // 开始循环
  requestAnimationFrame(gameLoop);
};

// --- 选择模式并开始游戏 ---
function selectGameMode(mode) {
  initAudio();
  currentMode = mode;
  isAiming = true;
  isGameOver = false;
  p1Score = 0;
  p2Score = 0;
  arcadeScore = 0;
  currentTurn = 1;
  ballOn = 'red';
  selectedColorNomination = null;
  foulAlert("");

  // 关闭模式框，显示对应面板
  document.getElementById('mode-modal').classList.remove('modal-active');
  document.getElementById('game-over-overlay').classList.add('hidden');

  if (mode.startsWith('snooker')) {
    document.getElementById('snooker-scoreboard').classList.remove('hidden');
    document.getElementById('arcade-scoreboard').classList.add('hidden');
    document.getElementById('current-mode-txt').innerText = mode === 'snooker_ai' ? '模式: 斯诺克人机对战' : '模式: 斯诺克双人本地对战';
    document.getElementById('p2-name-label').innerText = mode === 'snooker_ai' ? 'AI (DEEP RED)' : 'PLAYER 2';
    if (timerInterval) clearInterval(timerInterval);
  } else {
    document.getElementById('snooker-scoreboard').classList.add('hidden');
    document.getElementById('arcade-scoreboard').classList.remove('hidden');
    document.getElementById('current-mode-txt').innerText = mode === 'minefield' ? '模式: 激光雷区挑战' : '模式: 限时狂飙';
    
    if (mode === 'time_attack') {
      timeAttackTimer = 60;
      document.getElementById('timer-label').innerText = '剩余时间';
      document.getElementById('arcade-timer').innerText = timeAttackTimer + 's';
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        if (!isGameOver) {
          timeAttackTimer--;
          document.getElementById('arcade-timer').innerText = timeAttackTimer + 's';
          if (timeAttackTimer <= 0) {
            endGame();
          }
        }
      }, 1000);
    } else {
      document.getElementById('timer-label').innerText = '当前障碍';
      document.getElementById('arcade-timer').innerText = '激光水雷 x 4';
      if (timerInterval) clearInterval(timerInterval);
    }
  }

  resetTable();
}

function openModeSelect() {
  document.getElementById('mode-modal').classList.add('modal-active');
  document.getElementById('game-over-overlay').classList.add('hidden');
  if (timerInterval) clearInterval(timerInterval);
}

// --- 重置球台布局 ---
function resetTable() {
  balls = [];
  mines = [];
  particles = [];
  canPlaceCueBall = true;
  isDraggingCueBall = false;

  // 1. 生成白球 (Cue Ball)
  cueBall = {
    x: 160,
    y: 239,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
    color: '#ffffff',
    type: 'cue',
    isPocketed: false,
    topspin: 0,
    sidespin: 0
  };
  balls.push(cueBall);

  // 2. 生成 6 颗彩球 (Colors)
  const colorsData = [
    { type: 'yellow', color: '#fee440', points: 2, spot: SPOTS.YELLOW },
    { type: 'green', color: '#39ff14', points: 3, spot: SPOTS.GREEN },
    { type: 'brown', color: '#cd853f', points: 4, spot: SPOTS.BROWN }, // 调亮棕色（秘鲁棕），方便与红球区分
    { type: 'blue', color: '#00bbf9', points: 5, spot: SPOTS.BLUE },
    { type: 'pink', color: '#ff007f', points: 6, spot: SPOTS.PINK },
    { type: 'black', color: '#111111', border: '#fee440', points: 7, spot: SPOTS.BLACK }
  ];

  colorsData.forEach(c => {
    balls.push({
      x: c.spot.x,
      y: c.spot.y,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      color: c.color,
      borderColor: c.border || null,
      type: c.type,
      points: c.points,
      initialSpot: c.spot,
      isPocketed: false
    });
  });

  // 3. 生成 15 颗红球 (Reds, 三角形排列，顶点在粉球右侧)
  const redStart = { x: SPOTS.PINK.x + BALL_RADIUS * 2 + 2, y: SPOTS.PINK.y };
  let redIdx = 0;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col <= row; col++) {
      const rx = redStart.x + row * BALL_RADIUS * 1.73;
      const ry = redStart.y + (col - row / 2) * BALL_RADIUS * 2.1;
      balls.push({
        x: rx,
        y: ry,
        vx: 0,
        vy: 0,
        radius: BALL_RADIUS,
        color: '#ff0033',
        type: 'red',
        points: 1,
        isPocketed: false
      });
      redIdx++;
    }
  }

  // 4. 雷区模式：生成随机地雷
  if (currentMode === 'minefield') {
    for (let i = 0; i < 4; i++) {
      // 避免生成在发球区和红球三角形的尴尬位置
      let mx = 250 + Math.random() * (TABLE_WIDTH - 350);
      let my = 60 + Math.random() * (TABLE_HEIGHT - 120);
      mines.push({ x: mx, y: my, radius: 24 });
    }
  }

  updateScoreboardUI();
}

// --- 物理更新引擎 ---
function updatePhysics() {
  let allStopped = true;

  // 粒子更新
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.05;
    return p.life > 0;
  });

  // 物理撞击与摩擦
  for (let i = 0; i < balls.length; i++) {
    let b = balls[i];
    if (b.isPocketed) continue;

    b.x += b.vx;
    b.y += b.vy;

    // 摩擦力
    b.vx *= FRICTION;
    b.vy *= FRICTION;

    if (Math.abs(b.vx) < 0.08) b.vx = 0;
    if (Math.abs(b.vy) < 0.08) b.vy = 0;

    if (b.vx !== 0 || b.vy !== 0) {
      allStopped = false;
    }

    // 边界碰撞反弹 (库边反弹，球台边界留有 padding)
    const margin = 38;
    
    // 判断是否在任意袋口附近 (距离袋口中心较近)
    let nearPocket = pockets.some(p => Math.hypot(b.x - p.x, b.y - p.y) < pocketRadius + 12);
    
    if (nearPocket && (b.vx !== 0 || b.vy !== 0)) {
      // 强力吸入效果：仅对运动中的球施加朝最近袋口中心的微轻引力，防止静止的球自动滚入袋中
      let closestPocket = pockets[0];
      let minDist = 9999;
      pockets.forEach(p => {
        let d = Math.hypot(b.x - p.x, b.y - p.y);
        if (d < minDist) {
          minDist = d;
          closestPocket = p;
        }
      });
      let angleToPocket = Math.atan2(closestPocket.y - b.y, closestPocket.x - b.x);
      b.vx += Math.cos(angleToPocket) * 0.25;
      b.vy += Math.sin(angleToPocket) * 0.25;
    } else {
      if (b.x < margin + b.radius) {
        b.x = margin + b.radius;
        b.vx *= -1;
        // 偏塞旋转在侧壁上的动量偏移效果
        if (b.type === 'cue' && b.sidespin !== 0) {
          b.vy += b.sidespin * Math.abs(b.vx) * 0.55;
          b.sidespin *= 0.5; // 旋转衰减
        }
      } else if (b.x > TABLE_WIDTH - margin - b.radius) {
        b.x = TABLE_WIDTH - margin - b.radius;
        b.vx *= -1;
        if (b.type === 'cue' && b.sidespin !== 0) {
          b.vy -= b.sidespin * Math.abs(b.vx) * 0.55;
          b.sidespin *= 0.5;
        }
      }

      if (b.y < margin + b.radius) {
        b.y = margin + b.radius;
        b.vy *= -1;
        if (b.type === 'cue' && b.sidespin !== 0) {
          b.vx -= b.sidespin * Math.abs(b.vy) * 0.55;
          b.sidespin *= 0.5;
        }
      } else if (b.y > TABLE_HEIGHT - margin - b.radius) {
        b.y = TABLE_HEIGHT - margin - b.radius;
        b.vy *= -1;
        if (b.type === 'cue' && b.sidespin !== 0) {
          b.vx += b.sidespin * Math.abs(b.vy) * 0.55;
          b.sidespin *= 0.5;
        }
      }
    }

    // 袋口吸入判定
    pockets.forEach(p => {
      let dist = Math.hypot(b.x - p.x, b.y - p.y);
      if (dist < pocketRadius + 2) {
        // 吸入袋中
        b.vx *= 0.3;
        b.vy *= 0.3;
        if (dist < pocketRadius - 2) {
          pocketBall(b);
        }
      }
    });

    // 激光地雷碰撞判定 (仅雷区模式)
    if (currentMode === 'minefield') {
      mines.forEach(m => {
        let dist = Math.hypot(b.x - m.x, b.y - m.y);
        if (dist < b.radius + m.radius) {
          triggerMineExplosion(b, m);
        }
      });
    }
  }

  // 球与球碰撞 (动量守恒弹性碰撞)
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      let b1 = balls[i];
      let b2 = balls[j];

      if (b1.isPocketed || b2.isPocketed) continue;

      let dx = b2.x - b1.x;
      let dy = b2.y - b1.y;
      let dist = Math.hypot(dx, dy);

      if (dist < b1.radius + b2.radius) {
        let overlap = b1.radius + b2.radius - dist;
        let nx = dist > 0 ? dx / dist : 1;
        let ny = dist > 0 ? dy / dist : 0;

        b1.x -= nx * overlap * 0.5;
        b1.y -= ny * overlap * 0.5;
        b2.x += nx * overlap * 0.5;
        b2.y += ny * overlap * 0.5;

        // 计算法向和切向速度
        let kx = b1.vx - b2.vx;
        let ky = b1.vy - b2.vy;
        let vn = nx * kx + ny * ky;

        // 仅当两球在法向方向上相向运动时，才计算并应用碰撞冲量，防止擦边/重叠球反方向粘连或反弹
        if (vn > 0) {
          let p = vn; // 质量相等，简化后的碰撞冲量系数
          b1.vx -= p * nx;
          b1.vy -= p * ny;
          b2.vx += p * nx;
          b2.vy += p * ny;

          // 斯诺克旋转（推杆、拉杆）物理回馈：回传力应当与碰撞时的母球即时速度成正比，防止轻击时产生爆发性高速
          if (b1.type === 'cue' && b1.topspin !== 0) {
            let cueSpeed = Math.hypot(b1.vx, b1.vy);
            let spinImpulse = b1.topspin * cueSpeed * 0.85; // 旋转强度系数设为即时速度的 85%
            b1.vx += nx * spinImpulse;
            b1.vy += ny * spinImpulse;
            b1.topspin = 0; // 撞击一次后旋转耗尽
          } else if (b2.type === 'cue' && b2.topspin !== 0) {
            let cueSpeed = Math.hypot(b2.vx, b2.vy);
            let spinImpulse = b2.topspin * cueSpeed * 0.85;
            b2.vx -= nx * spinImpulse;
            b2.vy -= ny * spinImpulse;
            b2.topspin = 0;
          }

          playSound('collision');
          createExplosionParticles(b1.x + nx * b1.radius, b1.y + ny * b1.radius, '#ffffff', 4);

          // 斯诺克判定：记录母球撞击的第一颗球
          if (b1.type === 'cue' && !firstBallHitThisTurn) {
            firstBallHitThisTurn = b2;
          } else if (b2.type === 'cue' && !firstBallHitThisTurn) {
            firstBallHitThisTurn = b1;
          }
        }
      }
    }
  }

  // 如果所有球都静止下来，且我们已经发射过了球，执行一局结算
  if (allStopped && !isAiming && !isCharging) {
    resolveTurn();
  }
}

// --- 落袋逻辑与规则处理 ---
function pocketBall(ball) {
  if (ball.isPocketed) return;
  ball.isPocketed = true;
  ball.vx = 0;
  ball.vy = 0;
  playSound('pocket');
  createExplosionParticles(ball.x, ball.y, ball.color, 12);

  if (ball.type === 'cue') {
    scratchOccurred = true;
    foulOccurred = true;
    foulMessage = "母球摔袋 (Scratch)";
  } else if (ball.type === 'red') {
    pocketedRedsThisShot++;
  } else {
    pocketedColorsThisShot.push(ball);
  }
}

// --- 爆炸粒子效果 ---
function createExplosionParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    let angle = Math.random() * Math.PI * 2;
    let speed = 1 + Math.random() * 3;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: color,
      life: 1.0
    });
  }
}

// --- 雷区爆炸逻辑 ---
function triggerMineExplosion(ball, mine) {
  playSound('explosion');
  createExplosionParticles(ball.x, ball.y, '#ff0033', 25);
  
  // 撞击球获得一个冲击速度飞开
  let angle = Math.atan2(ball.y - mine.y, ball.x - mine.x);
  ball.vx = Math.cos(angle) * 12;
  ball.vy = Math.sin(angle) * 12;

  foulOccurred = true;
  foulMessage = `触发水雷爆炸！`;
  foulAlert(foulMessage);

  if (currentMode === 'snooker_ai' || currentMode === 'snooker_pvp') {
    // 扣分罚分
    const penalty = 4;
    if (currentTurn === 1) {
      p1Score = Math.max(0, p1Score - penalty);
      p2Score += penalty;
    } else {
      p2Score = Math.max(0, p2Score - penalty);
      p1Score += penalty;
    }
  } else if (currentMode === 'time_attack') {
    arcadeScore = Math.max(0, arcadeScore - 10);
    timeAttackTimer = Math.max(0, timeAttackTimer - 5);
  }
}

// --- 回合总结结算 (正式斯诺克比赛规则中枢) ---
function resolveTurn() {
  isAiming = true;

  if (currentMode === 'minefield') {
    // 单人雷区模式简单结算
    foulOccurred = false;
    scratchOccurred = false;
    let redsLeft = balls.filter(b => b.type === 'red' && !b.isPocketed).length;
    if (redsLeft === 0 && balls.filter(b => b.type !== 'cue' && !b.isPocketed).length === 0) {
      endGame(true);
    }
    resetCueBallIfNeeded();
    updateScoreboardUI();
    return;
  }

  if (currentMode === 'time_attack') {
    // 限时狂飙结算
    foulOccurred = false;
    if (pocketedRedsThisShot > 0) {
      arcadeScore += pocketedRedsThisShot * 10;
      timeAttackTimer += pocketedRedsThisShot * 5;
    }
    pocketedColorsThisShot.forEach(c => {
      arcadeScore += c.points * 10;
      timeAttackTimer += c.points * 4;
      c.isPocketed = false; // 复位彩色
      respawnColorBall(c);
    });
    
    // 如果没有红球了，重新刷一堆
    let redsLeft = balls.filter(b => b.type === 'red' && !b.isPocketed).length;
    if (redsLeft === 0) {
      spawnMoreReds();
    }
    
    resetCueBallIfNeeded();
    pocketedRedsThisShot = 0;
    pocketedColorsThisShot = [];
    scratchOccurred = false;
    updateScoreboardUI();
    return;
  }

  // --- 正式斯诺克规则核心判定 ---
  let penaltyPoints = 4; // 基础犯规分最低4分

  // 1. 判断是否空杆
  if (!firstBallHitThisTurn && !scratchOccurred) {
    foulOccurred = true;
    foulMessage = "空杆未击中球 (Miss)";
  }

  // 2. 击打非目标球 (例如打红球先碰到彩球，或者打彩球先碰到红球)
  if (firstBallHitThisTurn) {
    if (ballOn === 'red' && firstBallHitThisTurn.type !== 'red') {
      foulOccurred = true;
      foulMessage = `先碰到了彩球 (${firstBallHitThisTurn.type})`;
    } else if (ballOn === 'color' && firstBallHitThisTurn.type === 'red') {
      foulOccurred = true;
      foulMessage = "彩球局先碰到了红球";
    } else if (ballOn !== 'red' && ballOn !== 'color' && firstBallHitThisTurn.type !== ballOn) {
      foulOccurred = true;
      foulMessage = `击球顺序错误，应击打: ${ballOn}`;
    }
  }

  // 3. 错进球判定
  if (!foulOccurred) {
    if (ballOn === 'red') {
      if (pocketedColorsThisShot.length > 0) {
        foulOccurred = true;
        foulMessage = "红球局进袋了彩球";
      }
    } else if (ballOn === 'color') {
      if (pocketedRedsThisShot > 0) {
        foulOccurred = true;
        foulMessage = "彩球局进袋了红球";
      } else if (pocketedColorsThisShot.length > 1) {
        foulOccurred = true;
        foulMessage = "彩球局进袋了多颗彩球";
      } else if (pocketedColorsThisShot.length === 1) {
        // 如果有彩球提名，必须是提名的那颗
        let p = pocketedColorsThisShot[0];
        if (selectedColorNomination && p.type !== selectedColorNomination) {
          foulOccurred = true;
          foulMessage = `应打进提名球: ${selectedColorNomination}`;
        }
      }
    } else {
      // 顺序彩色收尾阶段
      if (pocketedRedsThisShot > 0) {
        foulOccurred = true;
        foulMessage = "红球早已清空，不应再进红球";
      } else {
        let wrongColors = pocketedColorsThisShot.filter(c => c.type !== ballOn);
        if (wrongColors.length > 0) {
          foulOccurred = true;
          foulMessage = `顺序击球阶段应进打: ${ballOn}`;
        }
      }
    }
  }

  // 4. 执行积分与回合轮转
  let nextTurn = currentTurn;
  let turnSwapped = false;

  if (foulOccurred) {
    // 依据 WPBSA 规则进行“就高不就低”的罚分折算：最小罚 4 分，所有涉案球（活球、先撞球、落袋球）取最高分值，且不予累加
    let involvedPoints = [4];
    if (ballOn !== 'red' && ballOn !== 'color') {
      involvedPoints.push(getBallOnPoints(ballOn));
    }
    if (selectedColorNomination) {
      involvedPoints.push(getBallOnPoints(selectedColorNomination));
    }
    if (firstBallHitThisTurn) {
      involvedPoints.push(firstBallHitThisTurn.points || 1);
    }
    pocketedColorsThisShot.forEach(c => involvedPoints.push(c.points || 4));
    if (pocketedRedsThisShot > 0) {
      involvedPoints.push(1); // 即使有多个红球进袋，最高分判定也仅为 1 分，总罚分依然受 involvedPoints 其他大球或低保 4 分控制
    }
    
    penaltyPoints = Math.max(...involvedPoints);

    playSound('foul');
    foulAlert(`犯规! ${foulMessage} (+${penaltyPoints}分给对方)`);
    
    // 给对方加分
    if (currentTurn === 1) {
      p2Score += penaltyPoints;
      nextTurn = 2;
    } else {
      p1Score += penaltyPoints;
      nextTurn = 1;
    }
    turnSwapped = true;

    // 彩球被犯规打入袋的，必须重摆回桌面（无论是否还有红球）
    pocketedColorsThisShot.forEach(c => {
      c.isPocketed = false;
      respawnColorBall(c);
    });
    
    // 犯规红球落袋了，斯诺克规则不重摆红球，计入已清
  } else {
    // 未犯规，正常计分
    let totalScored = 0;
    if (ballOn === 'red') {
      if (pocketedRedsThisShot > 0) {
        totalScored = pocketedRedsThisShot * 1;
        ballOn = 'color'; // 下一杆打彩球
      } else {
        // 没打进，换人
        nextTurn = currentTurn === 1 ? 2 : 1;
        turnSwapped = true;
      }
    } else if (ballOn === 'color') {
      if (pocketedColorsThisShot.length === 1) {
        totalScored = pocketedColorsThisShot[0].points;
        
        // 如果桌面上还有红球，进袋彩球复位
        let redsLeft = balls.filter(b => b.type === 'red' && !b.isPocketed).length;
        if (redsLeft > 0) {
          let c = pocketedColorsThisShot[0];
          c.isPocketed = false;
          respawnColorBall(c);
          ballOn = 'red'; // 下一杆回到红球
        } else {
          // 没有红球了，进入收尾阶段，黄球是第一个
          ballOn = 'yellow';
          let c = pocketedColorsThisShot[0];
          c.isPocketed = false;
          respawnColorBall(c);
        }
      } else {
        nextTurn = currentTurn === 1 ? 2 : 1;
        turnSwapped = true;
      }
    } else {
      // 顺序收尾阶段
      if (pocketedColorsThisShot.length === 1 && pocketedColorsThisShot[0].type === ballOn) {
        totalScored = pocketedColorsThisShot[0].points;
        // 成功收下当前颜色，进入下一颗
        ballOn = getNextColorOrder(ballOn);
      } else {
        nextTurn = currentTurn === 1 ? 2 : 1;
        turnSwapped = true;
      }
    }

    if (currentTurn === 1) p1Score += totalScored;
    else p2Score += totalScored;

    if (totalScored > 0) {
      foulAlert(`击球成功! 得分 +${totalScored}`);
    } else {
      foulAlert("");
    }
  }

  // 回合交替换手时，如果桌面上还有红球，下一个活球必须重置为红球 (Red)
  if (turnSwapped) {
    let redsLeft = balls.filter(b => b.type === 'red' && !b.isPocketed).length;
    if (redsLeft > 0) {
      ballOn = 'red';
    } else if (ballOn === 'color' || ballOn === 'red') {
      ballOn = 'yellow'; // 如果红球清空且恰好处在击打红球或彩球阶段失误，下一位选手直接进入顺序打黄球阶段
    }
  }

  // 摔袋白球重置
  resetCueBallIfNeeded();

  // 终局胜负判定
  let activeTargetBalls = balls.filter(b => b.type !== 'cue' && !b.isPocketed);
  if (activeTargetBalls.length === 0) {
    endGame();
    return;
  }

  // 重置单次击打状态
  pocketedRedsThisShot = 0;
  pocketedColorsThisShot = [];
  scratchOccurred = false;
  foulOccurred = false;
  firstBallHitThisTurn = null;
  selectedColorNomination = null;

  // AI 自动出击
  currentTurn = nextTurn;
  updateScoreboardUI();

  if (currentTurn === 2 && currentMode === 'snooker_ai') {
    setTimeout(executeAIMove, 1600);
  }
}

// --- 查找斯诺克进球顺序分值 ---
function getBallOnPoints(type) {
  const map = { 'red': 1, 'yellow': 2, 'green': 3, 'brown': 4, 'blue': 5, 'pink': 6, 'black': 7 };
  return map[type] || 4;
}

// --- 彩球摆回置球点规则 ---
function respawnColorBall(ball) {
  let spot = ball.initialSpot;
  // 检查点位上是否有球重叠
  let isOccupied = checkCollisionAt(spot.x, spot.y);
  if (!isOccupied) {
    ball.x = spot.x;
    ball.y = spot.y;
  } else {
    // 找黑球点位、粉球点位...等降序找空点摆放
    const prioritySpots = [SPOTS.BLACK, SPOTS.PINK, SPOTS.BLUE, SPOTS.BROWN, SPOTS.GREEN, SPOTS.YELLOW];
    let found = false;
    for (let s of prioritySpots) {
      if (!checkCollisionAt(s.x, s.y)) {
        ball.x = s.x;
        ball.y = s.y;
        found = true;
        break;
      }
    }
    if (!found) {
      // 沿桌子中线往左找空位
      for (let nx = spot.x - 20; nx > 40; nx -= 20) {
        if (!checkCollisionAt(nx, spot.y)) {
          ball.x = nx;
          ball.y = spot.y;
          break;
        }
      }
    }
  }
}

function checkCollisionAt(x, y) {
  return balls.some(b => !b.isPocketed && Math.hypot(b.x - x, b.y - y) < BALL_RADIUS * 2);
}

// --- 顺序击落彩球顺序表 ---
function getNextColorOrder(curr) {
  const order = ['yellow', 'green', 'brown', 'blue', 'pink', 'black'];
  let idx = order.indexOf(curr);
  if (idx !== -1 && idx < order.length - 1) {
    return order[idx + 1];
  }
  return 'done'; // 全部清空
}

// --- 白球摔袋摆回 D 区 ---
function resetCueBallIfNeeded() {
  if (cueBall.isPocketed) {
    cueBall.isPocketed = false;
    cueBall.vx = 0;
    cueBall.vy = 0;
    cueBall.topspin = 0;
    cueBall.sidespin = 0;
    // 摆回 D 区开球安全点位 (160, 239) 以防与棕色球点位 (210, 239) 完全重合导致 division by zero (NaN)
    cueBall.x = 160;
    cueBall.y = 239;
    canPlaceCueBall = true; // 再次获得手中球状态
    createExplosionParticles(160, 239, '#ffffff', 8);
  }
}

// --- AI 回合决策引擎 ---
function executeAIMove() {
  if (isGameOver || currentTurn !== 2) return;

  // 1. 寻找目标球
  let targetType = ballOn;
  if (targetType === 'color') {
    // 挑选分值最高且最容易打的彩球，我们随机挑选一颗还在桌上的彩球作为 nomination
    let activeColors = balls.filter(b => b.type !== 'cue' && b.type !== 'red' && !b.isPocketed);
    if (activeColors.length > 0) {
      // 优先选高分
      activeColors.sort((a,b) => b.points - a.points);
      selectedColorNomination = activeColors[0].type;
      targetType = selectedColorNomination;
    } else {
      targetType = 'black';
    }
  }

  let targets = balls.filter(b => b.type === targetType && !b.isPocketed);
  if (targets.length === 0) {
    // 找不到目标说明快打完了，随便选一个还在桌上的非母球
    targets = balls.filter(b => b.type !== 'cue' && !b.isPocketed);
  }

  if (targets.length === 0) return;

  // 2. 选择最近的目标球并瞄准
  let bestTarget = targets[0];
  let minDist = 9999;
  targets.forEach(t => {
    let d = Math.hypot(t.x - cueBall.x, t.y - cueBall.y);
    if (d < minDist) {
      minDist = d;
      bestTarget = t;
    }
  });

  // 3. 计算击球角度与蓄力 (稍微带点噪声以符合人机特点)
  let angle = Math.atan2(bestTarget.y - cueBall.y, bestTarget.x - cueBall.x);
  let noise = (Math.random() - 0.5) * 0.08; // 随机偏差
  cueAngle = angle + noise;

  let power = 5 + Math.random() * 8; // 适中力度

  // 4. 模拟杆子动作并击打
  setTimeout(() => {
    playSound('hit_cue');
    cueBall.vx = Math.cos(cueAngle) * power;
    cueBall.vy = Math.sin(cueAngle) * power;
    isAiming = false;
  }, 500);
}

// --- 限时模式持续刷红球 ---
function spawnMoreReds() {
  // 生成 5 颗新红球在右半区
  for (let i = 0; i < 5; i++) {
    let rx = 500 + Math.random() * 200;
    let ry = 80 + Math.random() * 260;
    if (!checkCollisionAt(rx, ry)) {
      balls.push({
        x: rx,
        y: ry,
        vx: 0,
        vy: 0,
        radius: BALL_RADIUS,
        color: '#ff0033',
        type: 'red',
        points: 1,
        isPocketed: false
      });
    }
  }
}

// --- 游戏结束判定 ---
function endGame(success = false) {
  isGameOver = true;
  if (timerInterval) clearInterval(timerInterval);

  let title = "🏆 斯诺克对决完成";
  let desc = "";

  if (currentMode.startsWith('snooker')) {
    if (p1Score > p2Score) {
      title = "🏆 恭喜您赢得比赛！";
      desc = `最终比分：PLAYER 1 [ ${p1Score} ] 对阵 [ ${p2Score} ]。您技高一筹！`;
      if (p1Score >= 80) {
        unlockAchievement('billiards_clear');
      }
    } else if (p1Score < p2Score) {
      title = "🥈 对方获得了胜利";
      desc = `最终比分：PLAYER 1 [ ${p1Score} ] 对阵 [ ${p2Score} ]。继续磨练球技吧！`;
    } else {
      title = "⚖️ 双方平局";
      desc = `最终比分均为 ${p1Score} 分，难分胜负。`;
    }
  } else if (currentMode === 'minefield') {
    title = success ? "🏆 雷区清台成功！" : "💥 发生连环水雷爆炸";
    desc = `恭喜清空所有台面球。避开了水雷的轰炸！`;
    // 如果一次水雷也没碰，解锁成就
    if (!foulOccurred) {
      unlockAchievement('billiards_mines');
    }
  } else if (currentMode === 'time_attack') {
    title = "⏱️ 限时挑战结束";
    desc = `倒计时结束！您的赛博总得分为: ${arcadeScore} 分。`;
    if (arcadeScore >= 200) {
      unlockAchievement('billiards_time_god');
    }
  }

  document.getElementById('over-title').innerText = title;
  document.getElementById('over-desc').innerText = desc;
  document.getElementById('game-over-overlay').classList.remove('hidden');
}

// --- 成就系统推送 ---
function unlockAchievement(id) {
  if (window.parent && window.parent.postMessage) {
    window.parent.postMessage({ type: 'unlock_achievement', achievement: id }, '*');
  }
}

// --- 输入手势处理器 ---
function handleMouseMove(e) {
  if (!isAiming || isGameOver || (currentTurn === 2 && currentMode === 'snooker_ai')) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  
  if (isDraggingCueBall) {
    let dx = mouseX - SPOTS.BROWN.x;
    let dy = mouseY - SPOTS.BROWN.y;
    if (dx > 0) dx = 0;
    if (Math.hypot(dx, dy) > SPOTS.D_RADIUS) {
      let angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * SPOTS.D_RADIUS;
      dy = Math.sin(angle) * SPOTS.D_RADIUS;
    }
    cueBall.x = SPOTS.BROWN.x + dx;
    cueBall.y = SPOTS.BROWN.y + dy;
  } else {
    updateAimAngle(mouseX, mouseY);
  }
}

function updateAimAngle(mx, my) {
  cueAngle = Math.atan2(my - cueBall.y, mx - cueBall.x);
}

function handleMouseDown(e) {
  if (!isAiming || isGameOver || (currentTurn === 2 && currentMode === 'snooker_ai')) return;
  
  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (e.button === 0) {
    if (canPlaceCueBall && Math.hypot(mouseX - cueBall.x, mouseY - cueBall.y) < BALL_RADIUS * 2.5) {
      isDraggingCueBall = true;
    } else {
      isCharging = true;
      chargePower = 0;
    }
  }
}

function handleMouseUp(e) {
  if (isDraggingCueBall) {
    isDraggingCueBall = false;
    resolveCueBallOverlapAfterPlacement();
  } else if (isCharging) {
    isCharging = false;
    // 击打
    if (chargePower > 1) {
      playSound('hit_cue');
      cueBall.vx = Math.cos(cueAngle) * chargePower;
      cueBall.vy = Math.sin(cueAngle) * chargePower;
      // 记录击球时的旋转偏置
      cueBall.topspin = spinOffset.y;
      cueBall.sidespin = spinOffset.x;
      isAiming = false;
      canPlaceCueBall = false; // 击球后结束摆球状态
      
      // 击球后将选择盘的小红点重置回中心
      spinOffset.x = 0;
      spinOffset.y = 0;
      const spinCursor = document.getElementById('spin-cursor');
      const spinValsTxt = document.getElementById('spin-vals-txt');
      if (spinCursor) {
        spinCursor.style.left = '50%';
        spinCursor.style.top = '50%';
      }
      if (spinValsTxt) {
        spinValsTxt.innerText = '拉杆: 0.0 | 偏塞: 0.0';
      }
    }
    chargePower = 0;
    document.getElementById('power-bar').style.width = '0%';
  }
}

function resolveCueBallOverlapAfterPlacement() {
  let maxAttempts = 50;
  while (maxAttempts > 0 && balls.some(b => b !== cueBall && !b.isPocketed && Math.hypot(b.x - cueBall.x, b.y - cueBall.y) < BALL_RADIUS * 2)) {
    cueBall.x -= 2;
    maxAttempts--;
  }
}

// --- 更新 UI ---
function updateScoreboardUI() {
  document.getElementById('p1-score').innerText = p1Score;
  document.getElementById('p2-score').innerText = p2Score;
  document.getElementById('arcade-score').innerText = arcadeScore;
  
  let redsLeft = balls.filter(b => b.type === 'red' && !b.isPocketed).length;
  document.getElementById('arcade-balls-left').innerText = redsLeft;

  if (currentMode.startsWith('snooker')) {
    let turnName = currentTurn === 1 ? 'PLAYER 1' : (currentMode === 'snooker_ai' ? 'AI 选手' : 'PLAYER 2');
    document.getElementById('turn-indicator').innerText = `当前回合: ${turnName}`;
    
    let targetName = "红球 (Red)";
    if (ballOn === 'color') {
      targetName = selectedColorNomination ? `提名球: ${selectedColorNomination}` : "任意彩球 (Nominate Color)";
    } else if (ballOn !== 'red') {
      targetName = `顺序彩球: ${ballOn.toUpperCase()}`;
    }
    if (canPlaceCueBall && currentTurn === 1) {
      targetName += " (手中球: 可在 D 区内拖动母球调整开球位)";
    }
    document.getElementById('target-ball-txt').innerText = `目标球: ${targetName}`;
  }
}

function foulAlert(msg) {
  document.getElementById('foul-alert').innerText = msg;
}

// --- 主循环绘制 ---
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function update() {
  if (!cueBall) return;
  if (!isGameOver) {
    updatePhysics();

    // 只要母球开始运动（无论是玩家击打还是 AI 出杆），立刻取消自由摆球（手中球）状态
    if (canPlaceCueBall && (cueBall.vx !== 0 || cueBall.vy !== 0)) {
      canPlaceCueBall = false;
    }

    if (isCharging) {
      chargePower = Math.min(MAX_POWER, chargePower + 0.35);
      document.getElementById('power-bar').style.width = (chargePower / MAX_POWER) * 100 + '%';
    }
  }
}

function draw() {
  if (!cueBall) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. 绘制最外层深邃背景
  ctx.fillStyle = '#030008';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. 绘制球台木质轨道外框 (Outer Rail Frame)
  const railGrad = ctx.createLinearGradient(0, 0, 0, TABLE_HEIGHT);
  railGrad.addColorStop(0, '#1d1233');
  railGrad.addColorStop(0.5, '#0d061a');
  railGrad.addColorStop(1, '#05010a');
  
  ctx.fillStyle = railGrad;
  drawRoundedRect(ctx, 8, 8, TABLE_WIDTH - 16, TABLE_HEIGHT - 16, 24);
  ctx.fill();
  
  // 外框描内金边
  ctx.strokeStyle = '#fee440';
  ctx.lineWidth = 1;
  ctx.shadowColor = '#fee440';
  ctx.shadowBlur = 4;
  drawRoundedRect(ctx, 10, 10, TABLE_WIDTH - 20, TABLE_HEIGHT - 20, 22);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 3. 瞄准星点 (Diamond Sights)
  ctx.fillStyle = 'rgba(0, 245, 212, 0.8)';
  ctx.shadowColor = '#00f5d4';
  ctx.shadowBlur = 6;
  
  // 短边星点 (3个)
  const shortSightsY = [TABLE_HEIGHT * 0.25, TABLE_HEIGHT * 0.5, TABLE_HEIGHT * 0.75];
  shortSightsY.forEach(sy => {
    drawSightDiamond(ctx, 20, sy, 5);
    drawSightDiamond(ctx, TABLE_WIDTH - 20, sy, 5);
  });
  
  // 长边星点 (7个，避开中间袋口)
  const longSightsX = [];
  for (let i = 1; i <= 7; i++) {
    if (i === 4) continue;
    longSightsX.push(TABLE_WIDTH * (i / 8));
  }
  longSightsX.forEach(sx => {
    drawSightDiamond(ctx, sx, 20, 5);
    drawSightDiamond(ctx, sx, TABLE_HEIGHT - 20, 5);
  });
  ctx.shadowBlur = 0;

  // 4. 绘制球台内边台面 (Table Cloth) 聚光灯效
  const clothGrad = ctx.createRadialGradient(
    TABLE_WIDTH / 2, TABLE_HEIGHT / 2, 80,
    TABLE_WIDTH / 2, TABLE_HEIGHT / 2, TABLE_WIDTH * 0.6
  );
  clothGrad.addColorStop(0, '#1c0f3a');
  clothGrad.addColorStop(0.5, '#0c051a');
  clothGrad.addColorStop(1, '#05010d');
  
  ctx.fillStyle = clothGrad;
  ctx.fillRect(38, 38, TABLE_WIDTH - 76, TABLE_HEIGHT - 76);

  // 5. 绘制赛博低对比网格线 (Cyber Grid)
  ctx.strokeStyle = 'rgba(0, 245, 212, 0.02)';
  ctx.lineWidth = 1;
  const gridSize = 20;
  ctx.beginPath();
  for (let x = 38; x <= TABLE_WIDTH - 38; x += gridSize) {
    ctx.moveTo(x, 38);
    ctx.lineTo(x, TABLE_HEIGHT - 38);
  }
  for (let y = 38; y <= TABLE_HEIGHT - 38; y += gridSize) {
    ctx.moveTo(38, y);
    ctx.lineTo(TABLE_WIDTH - 38, y);
  }
  ctx.stroke();

  // 6. 绘制 D 区与开球限制线
  ctx.beginPath();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0, 245, 212, 0.35)';
  ctx.shadowColor = 'rgba(0, 245, 212, 0.5)';
  ctx.shadowBlur = 4;
  
  ctx.moveTo(SPOTS.BROWN.x, 38);
  ctx.lineTo(SPOTS.BROWN.x, TABLE_HEIGHT - 38);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.arc(SPOTS.BROWN.x, SPOTS.BROWN.y, SPOTS.D_RADIUS, Math.PI * 0.5, Math.PI * 1.5);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 7. 绘制各个彩球置位点标记 (Spot Crosshairs)
  const spotPositions = [
    { pos: SPOTS.BROWN },
    { pos: SPOTS.YELLOW },
    { pos: SPOTS.GREEN },
    { pos: SPOTS.BLUE },
    { pos: SPOTS.PINK },
    { pos: SPOTS.BLACK }
  ];
  spotPositions.forEach(sp => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sp.pos.x - 4, sp.pos.y); ctx.lineTo(sp.pos.x + 4, sp.pos.y);
    ctx.moveTo(sp.pos.x, sp.pos.y - 4); ctx.lineTo(sp.pos.x, sp.pos.y + 4);
    ctx.stroke();
  });

  // 8. 绘制 3D 库边 (Beveled Cushions)
  drawCushions(ctx);

  // 9. 绘制 6 个深邃的金属防撞袋口 (Pockets)
  pockets.forEach(p => {
    // 金属圈外座
    ctx.beginPath();
    ctx.arc(p.x, p.y, pocketRadius + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#1d1233';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#fee440';
    ctx.stroke();

    // 内部渐变阴影
    const pocketGrad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, pocketRadius);
    pocketGrad.addColorStop(0, '#000000');
    pocketGrad.addColorStop(0.7, '#070210');
    pocketGrad.addColorStop(1, '#150a25');
    
    ctx.beginPath();
    ctx.arc(p.x, p.y, pocketRadius, 0, Math.PI * 2);
    ctx.fillStyle = pocketGrad;
    ctx.fill();

    // 霓虹发光环
    ctx.beginPath();
    ctx.arc(p.x, p.y, pocketRadius - 2, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = varColor('--border-neon-pink');
    ctx.shadowColor = varColor('--border-neon-pink');
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  // 10. 绘制激光地雷 (仅雷区模式)
  if (currentMode === 'minefield') {
    mines.forEach(m => {
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 0, 85, 0.15)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = varColor('--border-neon-pink');
      ctx.shadowColor = varColor('--border-neon-pink');
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ff0055';
      ctx.fill();
    });
  }

  // 11. 绘制所有球体
  balls.forEach(b => {
    if (b.isPocketed) return;
    
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = b.borderColor || '#ffffff';
    ctx.stroke();

    // 绘制高光微缩圆
    ctx.beginPath();
    ctx.arc(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();

    // 如果是母球且处于可摆放状态，画一个发光的霓虹青色指示光圈提示玩家可以拖动它
    if (b.type === 'cue' && canPlaceCueBall) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 2, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#00f5d4';
      ctx.shadowColor = '#00f5d4';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  });

  // 12. 绘制粒子
  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.fill();
  });
  ctx.globalAlpha = 1.0;

  // 13. 绘制瞄准虚线与球杆
  if (isAiming && !isGameOver && !(currentTurn === 2 && currentMode === 'snooker_ai')) {
    ctx.beginPath();
    ctx.setLineDash([5, 8]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.6)';
    ctx.shadowColor = varColor('--border-neon-cyan');
    ctx.shadowBlur = 6;
    ctx.moveTo(cueBall.x, cueBall.y);
    ctx.lineTo(cueBall.x + Math.cos(cueAngle) * 300, cueBall.y + Math.sin(cueAngle) * 300);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    const stickDist = 20 + chargePower * 1.5;
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fee440';
    ctx.shadowColor = '#fee440';
    ctx.shadowBlur = 8;
    ctx.moveTo(cueBall.x - Math.cos(cueAngle) * stickDist, cueBall.y - Math.sin(cueAngle) * stickDist);
    ctx.lineTo(cueBall.x - Math.cos(cueAngle) * (stickDist + 150), cueBall.y - Math.sin(cueAngle) * (stickDist + 150));
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

// --- 3D 渲染辅助函数 ---
function drawRoundedRect(c, x, y, width, height, radius) {
  c.beginPath();
  c.moveTo(x + radius, y);
  c.lineTo(x + width - radius, y);
  c.arcTo(x + width, y, x + width, y + radius, radius);
  c.lineTo(x + width, y + height - radius);
  c.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  c.lineTo(x + radius, y + height);
  c.arcTo(x, y + height, x, y + height - radius, radius);
  c.lineTo(x, y + radius);
  c.arcTo(x, y, x + radius, y, radius);
  c.closePath();
}

function drawSightDiamond(c, x, y, size) {
  c.beginPath();
  c.moveTo(x, y - size);
  c.lineTo(x + size, y);
  c.lineTo(x, y + size);
  c.lineTo(x - size, y);
  c.closePath();
  c.fill();
}

function drawCushions(c) {
  const cushionColorStart = '#2b1b4d';
  const cushionColorEnd = '#160a2c';
  const neonLineColor = 'rgba(0, 245, 212, 0.65)';
  
  // 1. 上左库边
  drawTrapezoidCushion(c, 
    54, 30,  TABLE_WIDTH/2 - 24, 30,
    TABLE_WIDTH/2 - 34, 38,  64, 38,
    cushionColorStart, cushionColorEnd,
    64, 38,  TABLE_WIDTH/2 - 34, 38,
    neonLineColor
  );

  // 2. 上右库边
  drawTrapezoidCushion(c,
    TABLE_WIDTH/2 + 24, 30,  TABLE_WIDTH - 54, 30,
    TABLE_WIDTH - 64, 38,  TABLE_WIDTH/2 + 34, 38,
    cushionColorStart, cushionColorEnd,
    TABLE_WIDTH/2 + 34, 38,  TABLE_WIDTH - 64, 38,
    neonLineColor
  );

  // 3. 下左库边
  drawTrapezoidCushion(c,
    64, TABLE_HEIGHT - 38,  TABLE_WIDTH/2 - 34, TABLE_HEIGHT - 38,
    TABLE_WIDTH/2 - 24, TABLE_HEIGHT - 30,  54, TABLE_HEIGHT - 30,
    cushionColorEnd, cushionColorStart,
    64, TABLE_HEIGHT - 38,  TABLE_WIDTH/2 - 34, TABLE_HEIGHT - 38,
    neonLineColor
  );

  // 4. 下右库边
  drawTrapezoidCushion(c,
    TABLE_WIDTH/2 + 34, TABLE_HEIGHT - 38,  TABLE_WIDTH - 64, TABLE_HEIGHT - 38,
    TABLE_WIDTH - 54, TABLE_HEIGHT - 30,  TABLE_WIDTH/2 + 24, TABLE_HEIGHT - 30,
    cushionColorEnd, cushionColorStart,
    TABLE_WIDTH/2 + 34, TABLE_HEIGHT - 38,  TABLE_WIDTH - 64, TABLE_HEIGHT - 38,
    neonLineColor
  );

  // 5. 左库边
  drawTrapezoidCushion(c,
    30, 54,  38, 64,
    38, TABLE_HEIGHT - 64,  30, TABLE_HEIGHT - 54,
    cushionColorStart, cushionColorEnd,
    38, 64,  38, TABLE_HEIGHT - 64,
    neonLineColor
  );

  // 6. 右库边
  drawTrapezoidCushion(c,
    TABLE_WIDTH - 38, 64,  TABLE_WIDTH - 30, 54,
    TABLE_WIDTH - 30, TABLE_HEIGHT - 54,  TABLE_WIDTH - 38, TABLE_HEIGHT - 64,
    cushionColorEnd, cushionColorStart,
    TABLE_WIDTH - 38, 64,  TABLE_WIDTH - 38, TABLE_HEIGHT - 64,
    neonLineColor
  );
}

function drawTrapezoidCushion(c, x1, y1, x2, y2, x3, y3, x4, y4, fillStart, fillEnd, lineX1, lineY1, lineX2, lineY2, lineCol) {
  const cushionGrad = c.createLinearGradient(
    (x1+x4)/2, (y1+y4)/2,
    (x2+x3)/2, (y2+y3)/2
  );
  cushionGrad.addColorStop(0, fillStart);
  cushionGrad.addColorStop(1, fillEnd);
  
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.lineTo(x3, y3);
  c.lineTo(x4, y4);
  c.closePath();
  c.fillStyle = cushionGrad;
  c.fill();
  
  c.beginPath();
  c.moveTo(lineX1, lineY1);
  c.lineTo(lineX2, lineY2);
  c.lineWidth = 1.5;
  c.strokeStyle = lineCol;
  c.shadowColor = varColor('--border-neon-cyan');
  c.shadowBlur = 4;
  c.stroke();
  c.shadowBlur = 0;
}

// 辅助方法获取 CSS 变量值
function varColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function restartGame() {
  selectGameMode(currentMode);
}
