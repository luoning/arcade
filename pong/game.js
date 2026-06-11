// --- Web Audio 8-bit 霓虹合成音效类 ---
class PongSynth {
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

  playPaddleHit() {
    this.playTone(380, 520, 0.09, 'triangle', 0.1);
  }

  playWallHit() {
    this.playTone(220, 220, 0.06, 'triangle', 0.06);
  }

  playCurveSpin() {
    this.playTone(450, 850, 0.12, 'sawtooth', 0.04);
  }

  playPowerupSpawn() {
    this.playTone(400, 800, 0.25, 'sine', 0.06);
  }

  playPowerupCollect() {
    this.playTone(600, 1200, 0.18, 'sawtooth', 0.07);
    setTimeout(() => this.playTone(1200, 1800, 0.2, 'sine', 0.05), 80);
  }

  playScore() {
    this.playTone(587.33, 880, 0.15, 'sine', 0.08);
    setTimeout(() => {
      this.playTone(1174.66, 1174.66, 0.22, 'sine', 0.06);
    }, 70);
  }

  playCharge(duration = 0.5) {
    this.playTone(220, 880, duration, 'sine', 0.08);
  }

  playSuperShot() {
    this.playTone(880, 1500, 0.25, 'sawtooth', 0.12);
    setTimeout(() => this.playTone(1500, 300, 0.3, 'sine', 0.1), 50);
  }

  playVictory() {
    const tones = [587.33, 739.99, 880, 1174.66];
    tones.forEach((f, idx) => {
      setTimeout(() => {
        this.playTone(f, f * 1.01, 0.3, 'sine', 0.08);
      }, idx * 110);
    });
  }
}

const synth = new PongSynth();

// --- 游戏主引擎 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const canvasContainer = document.getElementById('canvasContainer');

const p1ScoreVal = document.getElementById('p1Score');
const p2ScoreVal = document.getElementById('p2Score');
const activeModeText = document.getElementById('activeModeText');
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const winnerText = document.getElementById('winnerText');
const gameOverDesc = document.getElementById('gameOverDesc');
const soloBtn = document.getElementById('soloBtn');
const duoBtn = document.getElementById('duoBtn');
const powerupBtn = document.getElementById('powerupBtn');
const restartBtn = document.getElementById('restartBtn');
const muteBtn = document.getElementById('muteBtn');
const touchChargeBtn = document.getElementById('touchChargeBtn');

// 游戏全局状态
let isPlaying = false;
let gameMode = 'solo'; // solo, duo, powerup
let p1Score = 0;
let p2Score = 0;
let globalTick = 0;

// 物理与挡板参数
const PADDLE_HEIGHT = 12;
const BASE_PADDLE_WIDTH = 100;
const PADDLE_SPEED = 9;
const BALL_SPEED_BASE = 5.2;
const BALL_MAX_SPEED = 14;

// 高清 DPI 适配参数
let dpr = window.devicePixelRatio || 1;
let logicalWidth = 800;
let logicalHeight = 500;

// 特效
let particles = [];
let shockwaves = [];

// 道具系统
let activePowerup = null;
let powerupTimer = 0;
const POWERUP_TYPES = [
  { name: 'WIDE', color: '#00f5d4', icon: '⚡' },      // 极板拓宽
  { name: 'SHIELD', color: '#00bbf9', icon: '🛡️' },    // 防漏激光盾
  { name: 'FREEZE', color: '#fee440', icon: '❄️' },    // 冻结对手移速
  { name: 'MULTIBALL', color: '#ff007f', icon: '💥' }  // 双球分裂
];

// 控制状态
const keys = {};
let mouseX = null;
let isMouseDown = false;
let isTouchDevice = false;
let touchChargeActive = false; // 虚拟按键是否按下

// 1P 极板 (底部极板)
const p1 = {
  x: 0,
  y: 0,
  width: BASE_PADDLE_WIDTH,
  height: PADDLE_HEIGHT,
  vx: 0,
  color: '#ff007f',
  frozen: false,
  freezeTimer: 0,
  shieldActive: false,
  targetWidth: BASE_PADDLE_WIDTH,
  buffTimer: 0, // 增宽 Buff 持续帧数
  init(w, h) {
    this.width = BASE_PADDLE_WIDTH;
    this.targetWidth = BASE_PADDLE_WIDTH;
    this.x = w / 2 - this.width / 2;
    this.y = h - 40;
    this.shieldActive = false;
    this.frozen = false;
    this.freezeTimer = 0;
    this.buffTimer = 0;
    this.vx = 0;
  },
  update() {
    if (Math.abs(this.width - this.targetWidth) > 1) {
      this.width += (this.targetWidth - this.width) * 0.1;
    }

    const speed = this.frozen ? PADDLE_SPEED * 0.35 : PADDLE_SPEED;
    const oldX = this.x;

    // 1P 蓄力持球时锁定位置，不跟随按键与鼠标
    const isHolding = balls.some(b => b.held && b.holder === p1);
    if (!isHolding) {
      // 键盘移动 1P
      if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        this.x -= speed;
      }
      if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        this.x += speed;
      }

      // 触控/鼠标跟随
      if (mouseX !== null && (gameMode === 'solo' || gameMode === 'powerup' || mouseX < logicalWidth / 2)) {
        this.x = mouseX - this.width / 2;
      }
    }

    this.vx = this.x - oldX;

    if (this.freezeTimer > 0) {
      this.freezeTimer--;
      if (this.freezeTimer <= 0) this.frozen = false;
    }

    if (this.buffTimer > 0) {
      this.buffTimer--;
      if (this.buffTimer <= 0) this.targetWidth = BASE_PADDLE_WIDTH;
    }

    this.x = Math.min(logicalWidth - this.width - 8, Math.max(8, this.x));
  },
  draw() {
    ctx.save();
    ctx.shadowBlur = this.frozen ? 6 : 14;
    ctx.shadowColor = this.frozen ? '#fee440' : this.color;
    
    const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y + this.height);
    grad.addColorStop(0, this.frozen ? '#fee440' : this.color);
    grad.addColorStop(1, '#ffc0eb');
    
    ctx.fillStyle = grad;
    
    const r = 5;
    ctx.beginPath();
    ctx.moveTo(this.x + r, this.y);
    ctx.lineTo(this.x + this.width - r, this.y);
    ctx.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + r);
    ctx.lineTo(this.x + this.width, this.y + this.height - r);
    ctx.quadraticCurveTo(this.x + this.width, this.y + this.height, this.x + this.width - r, this.y + this.height);
    ctx.lineTo(this.x + r, this.y + this.height);
    ctx.quadraticCurveTo(this.x, this.y + this.height, this.x, this.y + this.height - r);
    ctx.lineTo(this.x, this.y + r);
    ctx.quadraticCurveTo(this.x, this.y, this.x + r, this.y);
    ctx.closePath();
    ctx.fill();

    // 绘制内部格栅
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let sx = this.x + 10; sx < this.x + this.width; sx += 14) {
      ctx.fillRect(sx, this.y + 1, 2, this.height - 2);
    }

    // 绘制 Buff 进度指示条 (极板下方)
    if (this.buffTimer > 0) {
      ctx.fillStyle = 'rgba(0, 245, 212, 0.4)';
      ctx.fillRect(this.x, this.y + this.height + 4, this.width * (this.buffTimer / 420), 3);
    }
    if (this.freezeTimer > 0) {
      ctx.fillStyle = 'rgba(254, 228, 64, 0.5)';
      ctx.fillRect(this.x, this.y + this.height + 4, this.width * (this.freezeTimer / 220), 3);
    }

    // 托底保护盾
    if (this.shieldActive) {
      ctx.strokeStyle = '#00bbf9';
      ctx.lineWidth = 4;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00bbf9';
      ctx.beginPath();
      ctx.moveTo(0, logicalHeight - 8);
      ctx.lineTo(logicalWidth, logicalHeight - 8);
      ctx.stroke();
    }
    ctx.restore();
  }
};

// 2P 极板 (顶部极板)
const p2 = {
  x: 0,
  y: 40,
  width: BASE_PADDLE_WIDTH,
  height: PADDLE_HEIGHT,
  vx: 0,
  color: '#00f5d4',
  frozen: false,
  freezeTimer: 0,
  shieldActive: false,
  targetWidth: BASE_PADDLE_WIDTH,
  buffTimer: 0,
  init(w) {
    this.width = BASE_PADDLE_WIDTH;
    this.targetWidth = BASE_PADDLE_WIDTH;
    this.x = w / 2 - this.width / 2;
    this.shieldActive = false;
    this.frozen = false;
    this.freezeTimer = 0;
    this.buffTimer = 0;
    this.vx = 0;
  },
  update() {
    if (Math.abs(this.width - this.targetWidth) > 1) {
      this.width += (this.targetWidth - this.width) * 0.1;
    }

    const speed = this.frozen ? PADDLE_SPEED * 0.35 : PADDLE_SPEED;
    const oldX = this.x;

    const isHolding = balls.some(b => b.held && b.holder === p2);
    if (!isHolding) {
      if (gameMode === 'solo' || gameMode === 'powerup') {
        const activeBall = getTrackedBall();
        if (activeBall) {
          const isApproaching = activeBall.vy < 0;
          const searchThreshold = isApproaching ? logicalHeight * 0.65 : logicalHeight * 0.3;
          
          if (activeBall.y < searchThreshold) {
            const predictX = activeBall.x + (activeBall.vx * (this.y - activeBall.y) / activeBall.vy) * 0.45;
            const targetX = (predictX >= 0 && predictX <= logicalWidth) ? predictX : activeBall.x;
            
            const center = this.x + this.width / 2;
            const diff = targetX - center;
            const aiSpeed = Math.min(speed * (0.8 + p2Score * 0.04), Math.abs(diff));
            
            if (diff > 8) this.x += aiSpeed;
            else if (diff < -8) this.x -= aiSpeed;
          }
        }
      } else {
        if (keys['j'] || keys['J']) {
          this.x -= speed;
        }
        if (keys['l'] || keys['L']) {
          this.x += speed;
        }
        if (mouseX !== null && mouseX >= logicalWidth / 2) {
          this.x = mouseX - this.width / 2;
        }
      }
    }

    this.vx = this.x - oldX;

    if (this.freezeTimer > 0) {
      this.freezeTimer--;
      if (this.freezeTimer <= 0) this.frozen = false;
    }

    if (this.buffTimer > 0) {
      this.buffTimer--;
      if (this.buffTimer <= 0) this.targetWidth = BASE_PADDLE_WIDTH;
    }

    this.x = Math.min(logicalWidth - this.width - 8, Math.max(8, this.x));
  },
  draw() {
    ctx.save();
    ctx.shadowBlur = this.frozen ? 6 : 14;
    ctx.shadowColor = this.frozen ? '#fee440' : this.color;
    
    const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y + this.height);
    grad.addColorStop(0, this.frozen ? '#fee440' : this.color);
    grad.addColorStop(1, '#d5fffa');
    
    ctx.fillStyle = grad;
    
    const r = 5;
    ctx.beginPath();
    ctx.moveTo(this.x + r, this.y);
    ctx.lineTo(this.x + this.width - r, this.y);
    ctx.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + r);
    ctx.lineTo(this.x + this.width, this.y + this.height - r);
    ctx.quadraticCurveTo(this.x + this.width, this.y + this.height, this.x + this.width - r, this.y + this.height);
    ctx.lineTo(this.x + r, this.y + this.height);
    ctx.quadraticCurveTo(this.x, this.y + this.height, this.x, this.y + this.height - r);
    ctx.lineTo(this.x, this.y + r);
    ctx.quadraticCurveTo(this.x, this.y, this.x + r, this.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let sx = this.x + 10; sx < this.x + this.width; sx += 14) {
      ctx.fillRect(sx, this.y + 1, 2, this.height - 2);
    }

    // Buff 指示器 (极板上方)
    if (this.buffTimer > 0) {
      ctx.fillStyle = 'rgba(0, 245, 212, 0.4)';
      ctx.fillRect(this.x, this.y - 7, this.width * (this.buffTimer / 420), 3);
    }
    if (this.freezeTimer > 0) {
      ctx.fillStyle = 'rgba(254, 228, 64, 0.5)';
      ctx.fillRect(this.x, this.y - 7, this.width * (this.freezeTimer / 220), 3);
    }

    if (this.shieldActive) {
      ctx.strokeStyle = '#00bbf9';
      ctx.lineWidth = 4;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00bbf9';
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(logicalWidth, 8);
      ctx.stroke();
    }
    ctx.restore();
  }
};

function getTrackedBall() {
  if (balls.length === 0) return null;
  let target = balls[0];
  let minDist = logicalHeight;
  for (let b of balls) {
    if (b.vy < 0) {
      const dist = b.y - p2.y;
      if (dist < minDist && dist > 0) {
        minDist = dist;
        target = b;
      }
    }
  }
  return target;
}

// 弹球类
class Ball {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 8;
    this.speed = Math.hypot(vx, vy);
    this.curveForce = 0; 
    this.lastHitter = null; 
    this.trail = [];

    // 蓄力参数
    this.held = false;
    this.holder = null;
    this.charge = 0;
    this.aimAngle = 0;
    this.offsetX = 0;
  }

  update() {
    if (this.held) {
      const h = this.holder;
      this.x = h.x + this.offsetX;
      this.y = h === p1 ? h.y - this.radius : h.y + h.height + this.radius;

      // 充能
      this.charge = Math.min(1.0, this.charge + 0.025);

      // 调整方向
      if (h === p1) {
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
          this.aimAngle -= 0.032;
        } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
          this.aimAngle += 0.032;
        } else if (mouseX !== null) {
          // 鼠标/手指：相对于挡板中央的偏移量来调整发射角
          const dx = mouseX - (h.x + h.width / 2);
          this.aimAngle = -Math.PI / 2 + Math.max(-0.5, Math.min(0.5, dx / (h.width / 2))) * Math.PI * 0.38;
        }
        this.aimAngle = Math.max(-Math.PI * 0.85, Math.min(-Math.PI * 0.15, this.aimAngle));
      } else {
        if (gameMode === 'solo' || gameMode === 'powerup') {
          const p1Center = p1.x + p1.width / 2;
          const targetX = p1Center < logicalWidth / 2 ? logicalWidth * 0.75 : logicalWidth * 0.25;
          const angleToTarget = Math.atan2(p1.y - this.y, targetX - this.x);
          this.aimAngle += (angleToTarget - this.aimAngle) * 0.12;
        } else {
          if (keys['j'] || keys['J']) {
            this.aimAngle += 0.032;
          } else if (keys['l'] || keys['L']) {
            this.aimAngle -= 0.032;
          } else if (mouseX !== null && mouseX >= logicalWidth / 2) {
            const dx = mouseX - (h.x + h.width / 2);
            this.aimAngle = Math.PI / 2 - Math.max(-0.5, Math.min(0.5, dx / (h.width / 2))) * Math.PI * 0.38;
          }
          this.aimAngle = Math.max(Math.PI * 0.15, Math.min(Math.PI * 0.85, this.aimAngle));
        }
      }

      // 发射释放判定
      let shouldRelease = false;
      if (h === p1) {
        if (!keys[' '] && !isMouseDown && !touchChargeActive) shouldRelease = true;
        if (this.charge >= 1.0) shouldRelease = true;
      } else {
        if (gameMode === 'solo' || gameMode === 'powerup') {
          if (this.charge >= 0.7) shouldRelease = true; // AI 瞄准后快速发射
        } else {
          if (!keys[' '] && !isMouseDown && !touchChargeActive) shouldRelease = true;
          if (this.charge >= 1.0) shouldRelease = true;
        }
      }

      if (shouldRelease) {
        this.held = false;
        const launchSpeed = BALL_SPEED_BASE * (1.0 + this.charge * 0.7);
        this.vx = Math.cos(this.aimAngle) * launchSpeed;
        this.vy = Math.sin(this.aimAngle) * launchSpeed;
        this.speed = launchSpeed;

        if (this.charge >= 0.75) {
          synth.playSuperShot();
          createParticles(this.x, this.y, '#fee440', 18);
          createShockwave(this.x, this.y, '#fee440');
          triggerScreenShake();
        } else {
          synth.playPaddleHit();
        }
      }
      return;
    }

    // 正常碰撞和反弹物理
    this.vx += this.curveForce;
    this.curveForce *= 0.95; 

    this.x += this.vx;
    this.y += this.vy;

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 8) this.trail.shift();

    // 左右反弹 (防越界穿透钳制)
    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.vx = -this.vx;
      synth.playWallHit();
      createParticles(this.x, this.y, '#fff', 4);
    }
    if (this.x + this.radius > logicalWidth) {
      this.x = logicalWidth - this.radius;
      this.vx = -this.vx;
      synth.playWallHit();
      createParticles(this.x, this.y, '#fff', 4);
    }

    // 1P 极板碰撞 (底部极板)
    if (this.vy > 0 &&
        this.y + this.radius >= p1.y &&
        this.y - this.radius <= p1.y + p1.height &&
        this.x >= p1.x &&
        this.x <= p1.x + p1.width) {
      
      // 物理钳制，防穿透
      this.y = p1.y - this.radius;
      this.lastHitter = 'p1';

      // 检查蓄力
      const wantCharge = keys[' '] || isMouseDown || touchChargeActive;
      if (wantCharge) {
        this.held = true;
        this.holder = p1;
        this.charge = 0;
        this.offsetX = this.x - p1.x;
        const hitPercent = (this.x - p1.x) / p1.width;
        this.aimAngle = -Math.PI / 2 + (hitPercent - 0.5) * Math.PI * 0.4;
        synth.playCharge(0.5);
        return;
      }

      this.vy = -this.vy;
      const hitPercent = (this.x - p1.x) / p1.width;
      const angle = (hitPercent - 0.5) * Math.PI * 0.38;
      
      // 速度摩擦转移
      this.vx = this.vx * 0.75 + p1.vx * 0.35;
      this.vy = -Math.abs(Math.cos(angle) * this.speed);
      
      if (Math.abs(p1.vx) > 1.5) {
        this.curveForce = p1.vx * 0.14;
        synth.playCurveSpin();
        createParticles(this.x, this.y, '#fee440', 8);
      } else {
        synth.playPaddleHit();
        createParticles(this.x, this.y, p1.color, 6);
      }

      this.speed = Math.min(BALL_MAX_SPEED, this.speed * 1.04);
      triggerScreenShake();
    }

    // 2P 极板碰撞 (顶部极板)
    if (this.vy < 0 &&
        this.y - this.radius <= p2.y + p2.height &&
        this.y + this.radius >= p2.y &&
        this.x >= p2.x &&
        this.x <= p2.x + p2.width) {
      
      this.y = p2.y + p2.height + this.radius;
      this.lastHitter = 'p2';

      let wantCharge = false;
      if (gameMode === 'solo' || gameMode === 'powerup') {
        wantCharge = Math.random() < 0.35;
      } else {
        wantCharge = keys[' '] || isMouseDown || touchChargeActive;
      }

      if (wantCharge) {
        this.held = true;
        this.holder = p2;
        this.charge = 0;
        this.offsetX = this.x - p2.x;
        const hitPercent = (this.x - p2.x) / p2.width;
        this.aimAngle = Math.PI / 2 + (0.5 - hitPercent) * Math.PI * 0.4;
        synth.playCharge(0.5);
        return;
      }

      this.vy = -this.vy;
      const hitPercent = (this.x - p2.x) / p2.width;
      const angle = (hitPercent - 0.5) * Math.PI * 0.38;
      
      this.vx = this.vx * 0.75 + p2.vx * 0.35;
      this.vy = Math.abs(Math.cos(angle) * this.speed);

      if (Math.abs(p2.vx) > 1.5) {
        this.curveForce = p2.vx * 0.14;
        synth.playCurveSpin();
        createParticles(this.x, this.y, '#fee440', 8);
      } else {
        synth.playPaddleHit();
        createParticles(this.x, this.y, p2.color, 6);
      }

      this.speed = Math.min(BALL_MAX_SPEED, this.speed * 1.04);
      triggerScreenShake();
    }

    // 护盾碰撞
    if (p1.shieldActive && this.vy > 0 && this.y + this.radius >= logicalHeight - 10) {
      this.y = logicalHeight - 12 - this.radius;
      this.vy = -this.vy;
      p1.shieldActive = false;
      synth.playWallHit();
      createParticles(this.x, logicalHeight - 8, '#00bbf9', 14);
      createShockwave(this.x, logicalHeight - 8, '#00bbf9');
      triggerScreenShake();
    }
    if (p2.shieldActive && this.vy < 0 && this.y - this.radius <= 10) {
      this.y = 12 + this.radius;
      this.vy = -this.vy;
      p2.shieldActive = false;
      synth.playWallHit();
      createParticles(this.x, 8, '#00bbf9', 14);
      createShockwave(this.x, 8, '#00bbf9');
      triggerScreenShake();
    }
  }

  // 绘制瞄准指南线及射线在墙壁的反光折射
  drawAimLine() {
    if (!this.held) return;
    
    ctx.save();
    ctx.strokeStyle = this.charge > 0.78 ? '#fee440' : 'rgba(255, 0, 127, 0.5)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 5]);
    ctx.shadowBlur = 8;
    ctx.shadowColor = ctx.strokeStyle;

    let startX = this.x;
    let startY = this.y;
    let currentAngle = this.aimAngle;
    let remainingLength = 320; // 射线总长度

    ctx.beginPath();
    ctx.moveTo(startX, startY);

    // 计算折反射线段
    for (let bounce = 0; bounce < 3; bounce++) {
      let dx = Math.cos(currentAngle);
      let dy = Math.sin(currentAngle);
      if (Math.abs(dx) < 0.001) {
        // 垂直射线
        let endY = dy > 0 ? logicalHeight : 0;
        ctx.lineTo(startX, endY);
        break;
      }

      // 计算与左/右边界的交点
      let targetX = dx > 0 ? logicalWidth : 0;
      let t = (targetX - startX) / dx;

      if (t > 0 && t < remainingLength) {
        // 撞在左右墙壁上
        let intersectY = startY + dy * t;
        ctx.lineTo(targetX, intersectY);
        
        remainingLength -= t;
        startX = targetX;
        startY = intersectY;
        currentAngle = Math.PI - currentAngle; // 镜面反弹角度
      } else {
        // 到达最大长度，画完剩余段
        ctx.lineTo(startX + dx * remainingLength, startY + dy * remainingLength);
        break;
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 绘制蓄力进度绕圈
    ctx.strokeStyle = '#fee440';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.charge);
    ctx.stroke();
    ctx.restore();
  }

  draw() {
    this.drawAimLine();

    // 绘制拖尾
    ctx.save();
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const alpha = (i + 1) / this.trail.length * 0.25;
      ctx.fillStyle = this.speed > 8 ? `rgba(254, 228, 64, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.radius * (i + 1) / this.trail.length, 0, Math.PI * 2);
      ctx.fill();
    }

    // 绘制弹球
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#fff';
    ctx.fillStyle = '#fff';

    if (this.speed > 8) {
      ctx.fillStyle = '#fee440';
      ctx.shadowColor = '#fee440';
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

let balls = [];

function triggerScreenShake() {
  canvasContainer.classList.remove('screen-shake');
  void canvasContainer.offsetWidth;
  canvasContainer.classList.add('screen-shake');
  setTimeout(() => canvasContainer.classList.remove('screen-shake'), 150);
}

// 粒子
function createParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      radius: Math.random() * 2 + 1,
      color: color,
      life: 25
    });
  }
}

// 冲击波
function createShockwave(x, y, color) {
  shockwaves.push({
    x: x,
    y: y,
    radius: 4,
    maxRadius: 28,
    color: color,
    opacity: 0.85
  });
}

function updateAndDrawEffects() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;

    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * (p.life / 25), 0, Math.PI * 2);
    ctx.fill();

    if (p.life <= 0) particles.splice(i, 1);
  }

  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const s = shockwaves[i];
    s.radius += (s.maxRadius - s.radius) * 0.12;
    s.opacity *= 0.88;

    ctx.strokeStyle = s.color;
    ctx.globalAlpha = s.opacity;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.stroke();

    if (s.opacity <= 0.05) shockwaves.splice(i, 1);
  }
  ctx.globalAlpha = 1.0;
}

// 触发道具
function triggerPowerup(hitter, powerup) {
  if (!hitter) return;
  synth.playPowerupCollect();

  const user = hitter === 'p1' ? p1 : p2;
  const opp = hitter === 'p1' ? p2 : p1;

  if (powerup.type.name === 'WIDE') {
    user.targetWidth = BASE_PADDLE_WIDTH * 1.5;
    user.buffTimer = 420; // 7 秒
    createParticles(user.x + user.width/2, user.y + user.height/2, powerup.type.color, 12);

  } else if (powerup.type.name === 'SHIELD') {
    user.shieldActive = true;
    createParticles(user.x + user.width/2, user.y + user.height/2, powerup.type.color, 12);

  } else if (powerup.type.name === 'FREEZE') {
    opp.frozen = true;
    opp.freezeTimer = 220; 
    createParticles(opp.x + opp.width/2, opp.y + opp.height/2, powerup.type.color, 15);

  } else if (powerup.type.name === 'MULTIBALL') {
    const baseBall = balls[0];
    if (baseBall) {
      const b1 = new Ball(baseBall.x, baseBall.y, baseBall.vx + 1.5, baseBall.vy);
      const b2 = new Ball(baseBall.x, baseBall.y, baseBall.vx - 1.5, baseBall.vy);
      b1.lastHitter = hitter;
      b2.lastHitter = hitter;
      b1.launched = true;
      b2.launched = true;
      balls.push(b1, b2);
    }
  }
}

// 道具管理
function updatePowerups() {
  if (gameMode !== 'powerup') return;

  if (!activePowerup) {
    powerupTimer--;
    if (powerupTimer <= 0) {
      const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
      activePowerup = {
        x: 80 + Math.random() * (logicalWidth - 160),
        y: logicalHeight / 2 + Math.sin(globalTick * 0.05) * 20, // 缓慢上下起伏漂浮
        type: type,
        pulse: 0
      };
      synth.playPowerupSpawn();
    }
  } else {
    // 道具缓缓浮动
    activePowerup.y = logicalHeight / 2 + Math.sin(globalTick * 0.05) * 15;
    activePowerup.pulse += 0.06;
    const pulseRad = 15 + Math.sin(activePowerup.pulse) * 3;

    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = activePowerup.type.color;
    
    ctx.strokeStyle = activePowerup.type.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(activePowerup.x, activePowerup.y, pulseRad, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(14, 5, 26, 0.7)';
    ctx.beginPath();
    ctx.arc(activePowerup.x, activePowerup.y, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = '12px Orbitron';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(activePowerup.type.icon, activePowerup.x, activePowerup.y);
    ctx.restore();
  }
}

function resetRound() {
  balls = [];
  const angle = (Math.random() * 0.25 - 0.125) * Math.PI;
  const speed = BALL_SPEED_BASE;
  const dir = Math.random() < 0.5 ? 1 : -1;
  const vx = Math.sin(angle) * speed;
  const vy = Math.cos(angle) * speed * dir;
  
  balls.push(new Ball(logicalWidth / 2, logicalHeight / 2, vx, vy));

  activePowerup = null;
  powerupTimer = 150 + Math.random() * 150;
}

function updateScoreboard() {
  p1ScoreVal.textContent = p1Score;
  p2ScoreVal.textContent = p2Score;
}

function handleGameOver(winner) {
  isPlaying = false;
  synth.playVictory();
  winnerText.textContent = `${winner} SECURED`;
  gameOverOverlay.classList.remove('hidden');

  if ((p1Score === 7 && p2Score === 0) || (p2Score === 7 && p1Score === 0)) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'UNLOCK_ACHIEVEMENT',
        gameId: 'pong',
        achievementId: 'pong_shutout'
      }, '*');
    }
  }
}

// 高清视口缩放解算
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  logicalWidth = 800;
  logicalHeight = 500;
  
  dpr = window.devicePixelRatio || 1;
  canvas.width = logicalWidth * dpr;
  canvas.height = logicalHeight * dpr;
  
  ctx.scale(dpr, dpr);
}

function initGame(mode) {
  p1Score = 0;
  p2Score = 0;
  globalTick = 0;
  gameMode = mode;
  particles = [];
  shockwaves = [];

  resizeCanvas();
  p1.init(logicalWidth, logicalHeight);
  p2.init(logicalWidth);

  if (mode === 'solo') activeModeText.textContent = 'CLASSIC VS AI';
  else if (mode === 'duo') activeModeText.textContent = 'LOCAL 2P';
  else if (mode === 'powerup') activeModeText.textContent = 'CYBER POWER-UPS';

  updateScoreboard();
  resetRound();

  startOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');

  isPlaying = true;
  gameLoop();
}

function gameLoop() {
  if (!isPlaying) return;

  globalTick++;

  p1.update();
  p2.update();

  // 更新所有弹球
  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i];
    b.update();

    if (b.y < 0) {
      balls.splice(i, 1);
      if (balls.length === 0) {
        p1Score++; // 底部 1P 得分
        updateScoreboard();
        synth.playScore();
        createParticles(b.x, 15, p1.color, 18);
        triggerScreenShake();

        if (p1Score >= 7) {
          handleGameOver('1P USER');
        } else {
          resetRound();
        }
      }
    } else if (b.y > logicalHeight) {
      balls.splice(i, 1);
      if (balls.length === 0) {
        p2Score++; // 顶部 2P 得分
        updateScoreboard();
        synth.playScore();
        createParticles(b.x, logicalHeight - 15, p2.color, 18);
        triggerScreenShake();

        if (p2Score >= 7) {
          handleGameOver(gameMode === 'duo' ? '2P USER' : 'AI MATRIX');
        } else {
          resetRound();
        }
      }
    }
  }

  // 渲染清屏
  ctx.fillStyle = '#020005';
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  // 网格
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < logicalWidth; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, logicalHeight);
    ctx.stroke();
  }
  for (let y = 0; y < logicalHeight; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(logicalWidth, y);
    ctx.stroke();
  }

  // 中线
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 12]);
  ctx.beginPath();
  ctx.moveTo(0, logicalHeight / 2);
  ctx.lineTo(logicalWidth, logicalHeight / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 实物绘制
  updatePowerups();
  p1.draw();
  p2.draw();
  for (let b of balls) b.draw();
  updateAndDrawEffects();

  requestAnimationFrame(gameLoop);
}

// 键盘事件
window.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D', 'ArrowUp', 'ArrowDown', 'w', 's', ' '].includes(e.key)) {
    e.preventDefault();
  }
  keys[e.key] = true;
});

window.addEventListener('keyup', e => {
  keys[e.key] = false;
});

// 鼠标/触屏坐标解算
function getMouseCoords(e) {
  const rect = canvas.getBoundingClientRect();
  let clientX = e.clientX;
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
  }
  return ((clientX - rect.left) / rect.width) * logicalWidth;
}

// 触摸事件 (引入虚拟按键防冲突)
canvas.addEventListener('touchstart', (e) => {
  isTouchDevice = true;
  touchChargeBtn.style.display = 'flex'; // 首次触屏时激活虚拟按键显示
  
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const touchX = ((touch.clientX - rect.left) / rect.width) * logicalWidth;
  
  // 检查是否点在 2P Duo 上半屏
  if (isPlaying) {
    synth.init();
    if (gameMode === 'duo') {
      const touchY = ((touch.clientY - rect.top) / rect.height) * logicalHeight;
      if (touchY < logicalHeight / 2) {
        p2.x = touchX - p2.width / 2;
      } else {
        p1.x = touchX - p1.width / 2;
      }
    } else {
      p1.x = touchX - p1.width / 2;
    }
  }
}, { passive: true });

canvas.addEventListener('touchmove', e => {
  if (!isPlaying) return;
  const rect = canvas.getBoundingClientRect();
  
  for (let i = 0; i < e.touches.length; i++) {
    const t = e.touches[i];
    const touchX = ((t.clientX - rect.left) / rect.width) * logicalWidth;

    if (gameMode === 'duo') {
      const touchY = ((t.clientY - rect.top) / rect.height) * logicalHeight;
      if (touchY < logicalHeight / 2) {
        p2.x = touchX - p2.width / 2;
      } else {
        p1.x = touchX - p1.width / 2;
      }
    } else {
      p1.x = touchX - p1.width / 2;
    }
  }
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', () => {
  mouseX = null;
});

// 虚拟蓄力按键绑定
touchChargeBtn.addEventListener('touchstart', (e) => {
  touchChargeActive = true;
  touchChargeBtn.classList.add('active');
  e.preventDefault();
}, { passive: false });

touchChargeBtn.addEventListener('touchend', (e) => {
  touchChargeActive = false;
  touchChargeBtn.classList.remove('active');
  e.preventDefault();
}, { passive: false });

// 鼠标事件
canvas.addEventListener('mousedown', (e) => {
  isMouseDown = true;
  synth.init();
});

window.addEventListener('mouseup', () => {
  isMouseDown = false;
});

canvas.addEventListener('mousemove', e => {
  if (!isPlaying) return;
  mouseX = getMouseCoords(e);
});

canvas.addEventListener('mouseleave', () => {
  mouseX = null;
  isMouseDown = false;
});

// 模式选择
soloBtn.addEventListener('click', () => initGame('solo'));
duoBtn.addEventListener('click', () => initGame('duo'));
powerupBtn.addEventListener('click', () => initGame('powerup'));

restartBtn.addEventListener('click', () => {
  gameOverOverlay.classList.add('hidden');
  startOverlay.classList.remove('hidden');
});

muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  synth.muted = !synth.muted;
  if (synth.muted) {
    muteBtn.classList.add('muted');
  } else {
    muteBtn.classList.remove('muted');
    synth.init();
    synth.playTone(800, 800, 0.05);
  }
});

window.addEventListener('resize', () => {
  if (isPlaying) resizeCanvas();
});
