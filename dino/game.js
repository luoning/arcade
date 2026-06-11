// --- Web Audio 8-bit 合成音效类 ---
class DinoSynth {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freqStart, freqEnd, duration, type = 'sine', gainVal = 0.08) {
    if (this.muted) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = type;
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(freqStart, now);
      if (freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);
      }
      
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {}
  }

  // 跳跃跃升音
  playJump() {
    this.playTone(330, 660, 0.12, 'square', 0.06);
  }

  // 低头俯冲音
  playDuck() {
    this.playTone(220, 150, 0.08, 'triangle', 0.08);
  }

  // 得分里程音
  playMilestone() {
    this.playTone(987.77, 987.77, 0.08, 'sine', 0.08);
    setTimeout(() => {
      this.playTone(1318.51, 1318.51, 0.15, 'sine', 0.06);
    }, 65);
  }

  // 撞击短路 GG 音
  playCrash() {
    this.playTone(400, 40, 0.35, 'sawtooth', 0.15);
    setTimeout(() => {
      this.playTone(150, 10, 0.45, 'triangle', 0.15);
    }, 120);
  }
}

const synth = new DinoSynth();

// --- 游戏物理与主渲染器 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreVal = document.getElementById('scoreVal');
const bestVal = document.getElementById('bestVal');
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const muteBtn = document.getElementById('muteBtn');

// 物理常量
const GRAVITY = 0.55;
const MAX_JUMP_FORCE = -12.5; // 极限长跳推进力
const MIN_JUMP_FORCE = -6.5;  // 极限短跳起跳力
const GROUND_Y = 270;

let isPlaying = false;
let globalTick = 0;
let runSpeed = 5.5;
let score = 0;
let bestScore = localStorage.getItem('cyber_dino_best') || 0;
let dayMode = false;

// 记录空格/跃升键是否处于按住状态，用以计算长跳和短跳
let isJumpingPressed = false;

// 粒子系统
let particles = [];

// 小恐龙对象
const dino = {
  x: 70,
  y: GROUND_Y - 40,
  width: 34,
  height: 40,
  baseHeight: 40,
  duckHeight: 22,
  velocity: 0,
  isGrounded: true,
  isDucking: false,
  legState: 0,

  reset() {
    this.y = GROUND_Y - this.baseHeight;
    this.height = this.baseHeight;
    this.velocity = 0;
    this.isGrounded = true;
    this.isDucking = false;
  },

  jump() {
    if (this.isGrounded && !this.isDucking) {
      // 起跑先给一个最小弹力
      this.velocity = MIN_JUMP_FORCE;
      this.isGrounded = false;
      synth.playJump();
      createRunParticles(this.x + 10, GROUND_Y, 15);
    }
  },

  duck(state) {
    if (this.isGrounded) {
      this.isDucking = state;
      if (state) {
        this.height = this.duckHeight;
        this.y = GROUND_Y - this.duckHeight;
        if (globalTick % 6 === 0) synth.playDuck();
      } else {
        this.height = this.baseHeight;
        this.y = GROUND_Y - this.baseHeight;
      }
    }
  },

  update() {
    if (!this.isGrounded) {
      // 长短跳控制核心机制：
      // 1. 如果玩家按住跳跃键且处于上升阶段，提供向上推力直到达到固定的最大长跳初速度（长跳有固定最高高度）
      // 2. 如果玩家在上升期提前松开跳跃键，立即将上升速度截断至 -2，使其快速转为下落（短跳）
      // 这样玩家就可以通过控制按住按键的时间来精准控制落点，且短跳的水平跨度极小，绝对跨不过断崖
      if (isJumpingPressed && this.velocity < 0) {
        if (this.velocity > MAX_JUMP_FORCE) {
          this.velocity -= 0.6; 
        }
      } else if (!isJumpingPressed && this.velocity < -2) {
        this.velocity = -2; 
      }

      this.velocity += GRAVITY;
      this.y += this.velocity;

      // 落地检查 (只有当不在断崖或河流上时才在地面截断，如果是断崖则会直接坠落GG)
      let onPlatform = true;
      
      // 检测小恐龙是否处于任何断崖或河流正上方
      for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        if (obs.type === 2 || obs.type === 3) { // 断崖或河流
          // 如果恐龙的中心正好悬空在断崖/河流的区间内
          const dinoCenter = this.x + this.width / 2;
          if (dinoCenter > obs.x + 2 && dinoCenter < obs.x + obs.width - 2) {
            onPlatform = false;
            break;
          }
        }
      }

      if (onPlatform && this.y >= GROUND_Y - this.height) {
        this.y = GROUND_Y - this.height;
        this.velocity = 0;
        this.isGrounded = true;
      }
    } else {
      // 如果原本在地面走，突然走到了断崖或河流的范围，直接跌落坠机！
      let onPlatform = true;
      for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        if (obs.type === 2 || obs.type === 3) {
          const dinoCenter = this.x + this.width / 2;
          if (dinoCenter > obs.x + 2 && dinoCenter < obs.x + obs.width - 2) {
            onPlatform = false;
            break;
          }
        }
      }

      if (!onPlatform) {
        this.isGrounded = false;
        this.velocity = 1.5; // 开始自然坠落
      }
    }

    // 掉落深渊死亡检测
    if (this.y > canvas.height + 50) {
      handleGameOver();
    }

    // 两腿奔跑动画频率
    if (globalTick % 6 === 0) {
      this.legState = 1 - this.legState;
      if (this.isGrounded) {
        createRunParticles(this.x + 10, GROUND_Y, 2);
      }
    }
  },

  draw(themeColor) {
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = themeColor;
    ctx.fillStyle = themeColor;

    const x = this.x;
    const y = this.y;
    const w = this.width;
    const h = this.height;

    if (this.isDucking) {
      // 绘制低头俯冲恐龙
      ctx.fillRect(x, y + 4, w, h - 4);
      ctx.fillRect(x + w, y + 2, 14, 10);
      ctx.fillStyle = dayMode ? '#fff' : '#000';
      ctx.fillRect(x + w + 8, y + 4, 3, 3);
    } else {
      // 绘制站立恐龙
      ctx.fillRect(x + 4, y, w - 8, h - 10);
      ctx.fillRect(x + w - 8, y, 12, 14);
      
      ctx.fillStyle = dayMode ? '#fff' : '#000';
      ctx.fillRect(x + w - 2, y + 3, 3, 3);
      ctx.fillStyle = themeColor;

      ctx.fillRect(x, y + 10, 4, h - 22);

      if (this.legState === 0) {
        ctx.fillRect(x + 8, y + h - 10, 4, 10);
      } else {
        ctx.fillRect(x + w - 12, y + h - 10, 4, 10);
      }
    }

    ctx.restore();
  }
};

// 障碍物仙人掌、翼龙、断崖、河流
let obstacles = [];

class Obstacle {
  constructor() {
    this.x = canvas.width;
    
    // 随分数提升逐步解锁复杂地形和难度组合
    // 0 = 仙人掌, 1 = 空中机械翼龙, 2 = 霓虹断崖 (地平线空缺), 3 = 赛博河流 (等离子电解液)
    let allowedTypes = [0];
    if (score > 100) allowedTypes.push(1); // 100分起刷翼龙
    if (score > 250) allowedTypes.push(2); // 250分起刷霓虹断崖
    if (score > 450) allowedTypes.push(3); // 450分起刷等离子河流

    this.type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];

    if (this.type === 1) { // 翼龙
      this.width = 30;
      this.height = 18;
      this.y = Math.random() < 0.5 ? GROUND_Y - 52 : GROUND_Y - 26;
      this.wingState = 0;
    } else if (this.type === 2) { // 霓虹断崖 (地平线在这段区间会消失)
      this.width = 65 + Math.random() * 30; // 随机宽度宽度，必须用长跳跃过
      this.height = 40;
      this.y = GROUND_Y;
    } else if (this.type === 3) { // 赛博河流 (亮粉色流动的等离子电解液)
      this.width = 80 + Math.random() * 20;
      this.height = 15;
      this.y = GROUND_Y;
    } else { // 0 = 仙人掌
      this.width = Math.random() < 0.4 ? 32 : 18;
      this.height = this.width === 32 ? 34 : 26;
      this.y = GROUND_Y - this.height;
    }
  }

  update() {
    this.x -= runSpeed;
    if (this.type === 1 && globalTick % 10 === 0) {
      this.wingState = 1 - this.wingState;
    }
  }

  draw(themeColor) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = themeColor;
    ctx.fillStyle = themeColor;

    if (this.type === 1) {
      // 翼龙 (Pink)
      ctx.fillStyle = dayMode ? '#d90429' : '#ff007f';
      ctx.shadowColor = dayMode ? '#d90429' : '#ff007f';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      if (this.wingState === 0) {
        ctx.fillRect(this.x + 8, this.y - 10, 8, 10);
      } else {
        ctx.fillRect(this.x + 8, this.y + this.height, 8, 10);
      }
    } else if (this.type === 2) {
      // 断崖：不绘制地面，画出两端悬崖的霓虹发光警示三角形
      ctx.strokeStyle = dayMode ? '#d90429' : '#ff007f';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = dayMode ? '#d90429' : '#ff007f';
      
      // 悬崖左角
      ctx.beginPath();
      ctx.moveTo(this.x, GROUND_Y);
      ctx.lineTo(this.x - 6, GROUND_Y + 18);
      ctx.stroke();

      // 悬崖右角
      ctx.beginPath();
      ctx.moveTo(this.x + this.width, GROUND_Y);
      ctx.lineTo(this.x + this.width + 6, GROUND_Y + 18);
      ctx.stroke();
    } else if (this.type === 3) {
      // 赛博河流 (等离子岩浆，粉色波浪)
      ctx.fillStyle = dayMode ? '#d90429' : '#ff007f';
      ctx.shadowColor = dayMode ? '#d90429' : '#ff007f';
      
      // 填充河流区域
      ctx.fillRect(this.x, GROUND_Y + 2, this.width, this.height);

      // 电解液流动气泡
      ctx.fillStyle = '#fff';
      const wave = Math.sin(globalTick * 0.15 + this.x) * 3;
      for (let bx = 4; bx < this.width - 4; bx += 16) {
        ctx.fillRect(this.x + bx, GROUND_Y + 6 + wave, 2, 2);
      }
    } else {
      // 仙人掌 (Cyan)
      ctx.fillStyle = dayMode ? '#0077b6' : '#00f5d4';
      ctx.shadowColor = dayMode ? '#0077b6' : '#00f5d4';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      // 刺状分支
      ctx.fillRect(this.x - 4, this.y + 6, 4, 8);
      ctx.fillRect(this.x + this.width, this.y + 10, 4, 8);
    }

    ctx.restore();
  }
}

// 奔跑飞溅尘埃粒子
function createRunParticles(x, y, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x,
      y: y - Math.random() * 4,
      vx: -(Math.random() * 3 + runSpeed * 0.4),
      vy: -(Math.random() * 2),
      radius: Math.random() * 2 + 1,
      life: 20
    });
  }
}

// 遭遇碰撞炸裂粒子
function createExplosion(x, y) {
  const colors = ['#39ff14', '#00f5d4', '#ff007f', '#fee440'];
  for (let i = 0; i < 30; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      radius: Math.random() * 3 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 35
    });
  }
}

// 刷新粒子
function drawParticles(themeColor) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    
    ctx.fillStyle = p.color || themeColor;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * (p.life / 20), 0, Math.PI * 2);
    ctx.fill();

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function handleGameOver() {
  isPlaying = false;
  synth.playCrash();
  createExplosion(dino.x + dino.width/2, dino.y + dino.height/2);

  document.getElementById('failScoreVal').textContent = formatScore(Math.floor(score));
  gameOverOverlay.classList.remove('hidden');

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('cyber_dino_best', bestScore);
    bestVal.textContent = formatScore(Math.floor(bestScore));
  }
}

// 格式化液晶计分 (补0到5位)
function formatScore(val) {
  let s = Math.floor(val).toString();
  while (s.length < 5) s = '0' + s;
  return s;
}

function initGame() {
  score = 0;
  globalTick = 0;
  runSpeed = 5.5;
  obstacles = [];
  particles = [];
  dayMode = false;
  isJumpingPressed = false;
  document.body.classList.remove('day-mode');

  dino.reset();
  scoreVal.textContent = formatScore(score);
  bestVal.textContent = formatScore(bestScore);

  startOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');

  isPlaying = true;
  gameLoop();
}

function gameLoop() {
  if (!isPlaying) {
    if (particles.length > 0) {
      // GG 后渲染最后一波爆炸烟火
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawParticles(dayMode ? '#2b9348' : '#39ff14');
      requestAnimationFrame(gameLoop);
    }
    return;
  }

  globalTick++;
  
  // 里程距离计分累计
  score += 0.15;
  scoreVal.textContent = formatScore(score);

  // 没吃一千分播放清脆提示声并逐步超频加速
  if (Math.floor(score) > 0 && Math.floor(score) % 100 === 0 && Math.floor(score - 0.15) % 100 !== 0) {
    synth.playMilestone();
    runSpeed += 0.55; // 地平线滚动提速
  }

  // 昼夜交替：每 700 帧黑白大反转一次，增加干扰
  if (globalTick % 700 === 0) {
    dayMode = !dayMode;
    if (dayMode) {
      document.body.classList.add('day-mode');
    } else {
      document.body.classList.remove('day-mode');
    }
  }

  dino.update();

  // 随机派发仙人掌障碍或翼龙
  // 随速度加快，派发频率相应加大，维持躲闪紧凑性
  let spawnRate = Math.max(50, 95 - Math.floor(runSpeed * 2.5));
  if (globalTick % spawnRate === 0 && Math.random() < 0.7) {
    // 限制不要连着刷，起码跟最后一个拉开 220 像素的黄金跨越距离
    if (obstacles.length === 0 || (canvas.width - obstacles[obstacles.length - 1].x > 220)) {
      obstacles.push(new Obstacle());
    }
  }

  // 移动障碍物并判定碰撞
  const themeColor = dayMode ? '#2b9348' : '#39ff14';
  
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.update();

    // 碰撞包围盒检测 (扣除3px边界缩进，防止太敏感降低手感)
    const padding = 3;
    if (
      dino.x + padding < obs.x + obs.width - padding &&
      dino.x + dino.width - padding > obs.x + padding &&
      dino.y + padding < obs.y + obs.height - padding &&
      dino.y + dino.height - padding > obs.y + padding
    ) {
      handleGameOver();
      return;
    }

    if (obs.x + obs.width < 0) {
      obstacles.splice(i, 1);
    }
  }

  // 画布清屏
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. 绘制地平线 (Neon Ground)
  ctx.save();
  ctx.shadowBlur = 8;
  ctx.shadowColor = themeColor;
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(canvas.width, GROUND_Y);
  ctx.stroke();

  // 地平线下斜虚线，体现向前滚动的运动错觉
  ctx.strokeStyle = dayMode ? 'rgba(0,0,0,0.1)' : 'rgba(57,255,20,0.2)';
  ctx.lineWidth = 1.5;
  const lineOffset = (globalTick * runSpeed) % 24;
  for (let x = -lineOffset; x < canvas.width; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x - 8, GROUND_Y + 12);
    ctx.stroke();
  }
  ctx.restore();

  // 2. 渲染各个障碍物
  obstacles.forEach(obs => obs.draw(themeColor));

  // 3. 渲染小恐龙与尘埃粒子
  dino.draw(themeColor);
  drawParticles(themeColor);

  requestAnimationFrame(gameLoop);
}

// --- 控制器按键映射 ---
window.addEventListener('keydown', e => {
  if (!isPlaying) return;

  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    isJumpingPressed = true;
    dino.jump();
    e.preventDefault();
  } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    dino.duck(true);
    e.preventDefault();
  }
});

window.addEventListener('keyup', e => {
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    isJumpingPressed = false;
  }
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    dino.duck(false);
  }
});

// --- 手机端/鼠标手势遥控 ---
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', e => {
  const dy = e.changedTouches[0].clientY - touchStartY;
  
  if (dy < -30) {
    // 向上划：跳跃
    dino.jump();
  } else if (dy > 30) {
    // 向下划：临时低头
    dino.duck(true);
    setTimeout(() => {
      dino.duck(false);
    }, 450); // 450ms 后自动站起
  }
  e.preventDefault();
}, { passive: false });

// 鼠标滑移备用
let isMouseDown = false;
canvas.addEventListener('mousedown', e => {
  touchStartX = e.clientX;
  touchStartY = e.clientY;
  isMouseDown = true;
});
canvas.addEventListener('mouseup', e => {
  if (!isMouseDown) return;
  isMouseDown = false;
  const dy = e.clientY - touchStartY;
  if (dy < -25) dino.jump();
  else if (dy > 25) {
    dino.duck(true);
    setTimeout(() => {
      dino.duck(false);
    }, 450);
  }
});

// 各项按钮动作绑定
startBtn.addEventListener('click', initGame);
restartBtn.addEventListener('click', initGame);

muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  synth.muted = !synth.muted;
  if (synth.muted) {
    muteBtn.classList.add('muted');
  } else {
    muteBtn.classList.remove('muted');
    synth.init();
  }
});
