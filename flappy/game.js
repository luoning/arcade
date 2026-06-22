// --- Web Audio 8-bit 合成音效类 ---
class FlappySynth {
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

  // 跃升：向上推力音
  playFlap() {
    this.playTone(400, 700, 0.1, 'triangle', 0.08);
  }

  // 得分：金币声
  playScore() {
    this.playTone(987.77, 987.77, 0.08, 'sine', 0.06);
    setTimeout(() => {
      this.playTone(1318.51, 1318.51, 0.15, 'sine', 0.05);
    }, 60);
  }

  // 遭遇高压过载短路音
  playCrash() {
    this.playTone(300, 50, 0.35, 'sawtooth', 0.15);
    setTimeout(() => {
      this.playTone(100, 10, 0.45, 'triangle', 0.15);
    }, 120);
  }
}

const synth = new FlappySynth();

// --- 游戏物理引擎 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreVal = document.getElementById('scoreVal');
const bestVal = document.getElementById('bestVal');
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const muteBtn = document.getElementById('muteBtn');

// 游戏物理常量
const GRAVITY = 0.35;
const FLAP_FORCE = -5.8;
const PIPE_SPEED = 2.2;
const PIPE_SPAWN_RATE = 110; // 多少帧刷一次柱子
const PIPE_GAP = 130;        // 上下电柱的通过空档

let score = 0;
let bestScore = localStorage.getItem('cyber_flappy_best') || 0;
let isPlaying = false;
let globalTick = 0;

// 电磁鸟对象
const bird = {
  x: 80,
  y: 200,
  radius: 12,
  velocity: 0,
  angle: 0,

  reset() {
    this.y = 200;
    this.velocity = 0;
    this.angle = 0;
  },

  flap() {
    this.velocity = FLAP_FORCE;
    synth.playFlap();
    // 喷射粒子
    createJetParticles(this.x, this.y);
  },

  update() {
    this.velocity += GRAVITY;
    this.y += this.velocity;

    // 旋转倾斜计算
    this.angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 7, this.velocity * 0.06));

    // 触顶及触底死亡检测
    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.velocity = 0;
    }
    if (this.y + this.radius > canvas.height) {
      handleGameOver();
    }
  },

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // 霓虹发光
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00bbf9';
    
    // 鸟身 (等离子核心)
    ctx.fillStyle = '#00bbf9';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // 鸟嘴 (发光黄色天线)
    ctx.fillStyle = '#fee440';
    ctx.beginPath();
    ctx.moveTo(8, -4);
    ctx.lineTo(16, 0);
    ctx.lineTo(8, 4);
    ctx.closePath();
    ctx.fill();

    // 翅膀
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.ellipse(-5, 0, 4, 8, Math.PI / 4 - this.velocity * 0.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.shadowBlur = 0; // 重置发光
  }
};

// 障碍物柱子与游走电球
let pipes = [];
let electricalOrbs = [];
let particles = [];

class Pipe {
  constructor(x) {
    this.x = x;
    this.width = 54;
    // 随机分配上下通过空档的高度区间
    const minHeight = 60;
    const maxHeight = canvas.height - PIPE_GAP - minHeight;
    this.topHeight = Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;
    this.bottomHeight = canvas.height - this.topHeight - PIPE_GAP;
    this.passed = false;
  }

  update() {
    this.x -= PIPE_SPEED;
  }

  draw() {
    ctx.save();
    ctx.shadowBlur = 10;

    // 绘制上方霓虹高压电柱 (Cyan)
    ctx.shadowColor = '#00f5d4';
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(0, 245, 212, 0.06)';
    
    ctx.beginPath();
    ctx.rect(this.x, 0, this.width, this.topHeight);
    ctx.fill();
    ctx.stroke();

    // 顶部电极头高亮圈
    ctx.fillStyle = '#00f5d4';
    ctx.fillRect(this.x - 3, this.topHeight - 10, this.width + 6, 10);

    // 绘制下方高压电柱
    ctx.beginPath();
    ctx.rect(this.x, canvas.height - this.bottomHeight, this.width, this.bottomHeight);
    ctx.fill();
    ctx.stroke();

    // 底部电极头高亮圈
    ctx.fillRect(this.x - 3, canvas.height - this.bottomHeight, this.width + 6, 10);

    // 连线间的高压电弧线动画效果
    if (globalTick % 6 < 3) {
      ctx.strokeStyle = 'rgba(254, 228, 64, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // 上下电磁柱之间随机拉扯 3 道闪电电弧
      for (let i = 0; i < 3; i++) {
        let lx = this.x + Math.random() * this.width;
        ctx.moveTo(lx, this.topHeight);
        ctx.lineTo(lx + (Math.random() - 0.5) * 12, canvas.height - this.bottomHeight);
      }
      ctx.stroke();
    }

    ctx.restore();
  }
}

// 游走在空档中的脉冲等离子球 (增加闪避乐趣)
class ElectricalOrb {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 8;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = 1.2;
  }

  update() {
    this.x -= PIPE_SPEED; // 随管道往左移动
    // 上下正弦波波动
    this.y += Math.sin(this.angle) * this.speed;
    this.angle += 0.06;
  }

  draw() {
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ff007f';
    ctx.fillStyle = '#ff007f';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + Math.sin(globalTick * 0.2) * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// 喷气粒子
function createJetParticles(x, y) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: x - 10,
      y: y + (Math.random() - 0.5) * 6,
      vx: -(Math.random() * 2 + 1),
      vy: (Math.random() - 0.5) * 1,
      radius: Math.random() * 2 + 1,
      color: '#00bbf9',
      life: 25
    });
  }
}

// 遭遇撞击短路粒子
function createExplosion(x, y) {
  const colors = ['#00bbf9', '#00f5d4', '#ff007f', '#fee440'];
  for (let i = 0; i < 25; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      radius: Math.random() * 3 + 1.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 40
    });
  }
}

// 刷新粒子
function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * (p.life / 40), 0, Math.PI * 2);
    ctx.fill();

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

// 失败短路处理
function handleGameOver() {
  isPlaying = false;
  synth.playCrash();
  createExplosion(bird.x, bird.y);

  document.getElementById('failScoreVal').textContent = score;
  gameOverOverlay.classList.remove('hidden');

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('cyber_flappy_best', bestScore);
    bestVal.textContent = bestScore;
  }
}

// 核心循环
function initGame() {
  score = 0;
  globalTick = 0;
  pipes = [];
  electricalOrbs = [];
  particles = [];
  
  bird.reset();
  scoreVal.textContent = score;
  bestVal.textContent = bestScore;

  startOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');

  isPlaying = true;
  gameLoop();
}

function gameLoop() {
  if (!isPlaying) {
    // 即使GG了也需要继续绘制粒子爆炸完结动画
    if (particles.length > 0) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawParticles();
      requestAnimationFrame(gameLoop);
    }
    return;
  }

  globalTick++;

  // 物理更新
  bird.update();

  // 1. 刷电磁柱
  if (globalTick % PIPE_SPAWN_RATE === 0) {
    const p = new Pipe(canvas.width);
    pipes.push(p);

    // 35% 几率在此电磁柱空档里刷出一个上下浮动的等离子球
    if (Math.random() < 0.35) {
      electricalOrbs.push(new ElectricalOrb(canvas.width + p.width/2, p.topHeight + PIPE_GAP/2));
    }
  }

  // 移动并过滤电极柱
  for (let i = pipes.length - 1; i >= 0; i--) {
    const p = pipes[i];
    p.update();

    // 得分检测
    if (!p.passed && p.x + p.width < bird.x) {
      p.passed = true;
      score++;
      scoreVal.textContent = score;
      synth.playScore();
    }

    // 与电柱碰撞精确判定
    if (
      bird.x + bird.radius > p.x &&
      bird.x - bird.radius < p.x + p.width &&
      (bird.y - bird.radius < p.topHeight || bird.y + bird.radius > canvas.height - p.bottomHeight)
    ) {
      handleGameOver();
      return;
    }

    if (p.x + p.width < 0) {
      pipes.splice(i, 1);
    }
  }

  // 移动并过滤游走电球
  for (let i = electricalOrbs.length - 1; i >= 0; i--) {
    const orb = electricalOrbs[i];
    orb.update();

    // 碰撞检测
    const dx = bird.x - orb.x;
    const dy = bird.y - orb.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < bird.radius + orb.radius) {
      handleGameOver();
      return;
    }

    if (orb.x + orb.radius < 0) {
      electricalOrbs.splice(i, 1);
    }
  }

  // 画面渲染
  ctx.fillStyle = '#020005';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 科幻背景流动线条
  ctx.strokeStyle = 'rgba(0, 187, 249, 0.05)';
  ctx.lineWidth = 1;
  const lineOffset = (globalTick * PIPE_SPEED) % 40;
  for (let x = -lineOffset; x < canvas.width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }

  // 渲染组件
  pipes.forEach(p => p.draw());
  electricalOrbs.forEach(orb => orb.draw());
  bird.draw();
  drawParticles();

  requestAnimationFrame(gameLoop);
}

// --- 控制器触发绑定 ---
function triggerFlap(e) {
  if (e) e.preventDefault();
  if (isPlaying) {
    bird.flap();
  }
}

window.addEventListener('keydown', e => {
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    triggerFlap(e);
  }
});

canvas.addEventListener('touchstart', triggerFlap, { passive: false });
canvas.addEventListener('mousedown', triggerFlap);

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
