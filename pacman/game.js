// --- Web Audio 8-bit 合成音效类 ---
class PacSynth {
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

  // 吃发光小豆：Waka-Waka 声
  playWaka(step) {
    const freq = step % 2 === 0 ? 350 : 550;
    this.playTone(freq, freq - 100, 0.08, 'triangle', 0.04);
  }

  // 吃到超频大药丸：尖锐颤音
  playPowerup() {
    this.playTone(300, 900, 0.2, 'sawtooth', 0.06);
    setTimeout(() => {
      this.playTone(600, 1200, 0.25, 'sine', 0.06);
    }, 150);
  }

  // 吃到幽灵气化音：飞跃高音
  playEatGhost() {
    this.playTone(800, 1600, 0.15, 'sine', 0.1);
    setTimeout(() => {
      this.playTone(1200, 2400, 0.2, 'sine', 0.08);
    }, 100);
  }

  // GG 音效：低沉下坠
  playDeath() {
    const now = this.ctx ? this.ctx.currentTime : 0;
    this.playTone(600, 100, 0.5, 'sawtooth', 0.1);
    setTimeout(() => {
      this.playTone(300, 50, 0.6, 'triangle', 0.12);
    }, 400);
  }

  // 胜利通关：上行大和弦
  playVictory() {
    const tones = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    tones.forEach((f, idx) => {
      setTimeout(() => {
        this.playTone(f, f * 1.02, 0.25, 'sine', 0.08);
      }, idx * 120);
    });
  }
}

const synth = new PacSynth();

// --- 游戏主配置与核心引擎 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreVal = document.getElementById('scoreVal');
const stageVal = document.getElementById('stageVal');
const livesVal = document.getElementById('livesVal');
const startOverlay = document.getElementById('startOverlay');
const victoryOverlay = document.getElementById('victoryOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const startBtn = document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');
const restartBtn = document.getElementById('restartBtn');
const muteBtn = document.getElementById('muteBtn');

// 经典吃豆人迷宫设计 (28列 x 31行)
// 1 = 墙, 0 = 普通豆, 2 = 超频药丸, 3 = 空白区域, 4 = 幽灵之家巢穴, 5 = 幽灵门(只能横着穿过)
const mazeLayout = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,2,1],
  [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
  [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
  [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,0,1,1,1,1,1,3,1,1,3,1,1,1,1,1,0,1,1,1,1,1,1],
  [3,3,3,3,3,1,0,1,1,1,1,1,3,1,1,3,1,1,1,1,1,0,1,3,3,3,3,3],
  [3,3,3,3,3,1,0,1,1,3,3,3,3,3,3,3,3,3,3,1,1,0,1,3,3,3,3,3],
  [3,3,3,3,3,1,0,1,1,3,1,1,1,5,5,1,1,1,3,1,1,0,1,3,3,3,3,3],
  [1,1,1,1,1,1,0,1,1,3,1,4,4,4,4,4,4,1,3,1,1,0,1,1,1,1,1,1],
  [3,3,3,3,3,3,0,3,3,3,1,4,4,4,4,4,4,1,3,3,3,0,3,3,3,3,3,3],
  [1,1,1,1,1,1,0,1,1,3,1,4,4,4,4,4,4,1,3,1,1,0,1,1,1,1,1,1],
  [3,3,3,3,3,1,0,1,1,3,1,1,1,1,1,1,1,1,3,1,1,0,1,3,3,3,3,3],
  [3,3,3,3,3,1,0,1,1,3,3,3,3,3,3,3,3,3,3,1,1,0,1,3,3,3,3,3],
  [3,3,3,3,3,1,0,1,1,3,1,1,1,1,1,1,1,1,3,1,1,0,1,3,3,3,3,3],
  [1,1,1,1,1,1,0,1,1,3,1,1,1,1,1,1,1,1,3,1,1,0,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
  [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
  [1,2,0,0,1,1,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,1,1,0,0,2,1],
  [1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1],
  [1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1],
  [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
  [1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const TILE_SIZE = 20;
const MAP_COLS = 28;
const MAP_ROWS = 30;

let gameGrid = [];
let score = 0;
let bestScore = localStorage.getItem('cyber_pacman_best') || 0;
let stage = 1;
let lives = 3;
let gameOver = false;
let gameWon = false;
let isPlaying = false;

// 游戏状态计数器
let globalTick = 0;
let frightenedTimer = 0; // 超频时间

// 粒子系统
let particles = [];

// 吃豆声交替步数
let wakaStep = 0;

// 吃豆人角色
const pacman = {
  x: 1 * TILE_SIZE,
  y: 4 * TILE_SIZE, // 对应地图第5行 [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1] 的第二列，是 0 (普通豆子)
  radius: 8,
  speed: 2,
  dirX: 1, // 默认往右走，防止一开始静止不动被当成卡死
  dirY: 0,
  nextDirX: 1,
  nextDirY: 0,
  mouthAngle: 0.2,
  mouthSpeed: 0.02,
  mouthDir: 1,

  reset() {
    this.x = 1 * TILE_SIZE;
    this.y = 4 * TILE_SIZE;
    this.dirX = 1;
    this.dirY = 0;
    this.nextDirX = 1;
    this.nextDirY = 0;
  },

  update() {
    // 只有当吃豆人完全对齐到网格中心点时，才允许选择新方向或继续前进
    if (this.x % TILE_SIZE === 0 && this.y % TILE_SIZE === 0) {
      const currentCellX = this.x / TILE_SIZE;
      const currentCellY = this.y / TILE_SIZE;

      // 1. 如果有预设的下一个方向，尝试拐弯
      if (this.nextDirX !== 0 || this.nextDirY !== 0) {
        if (isTileWalkable(currentCellX + this.nextDirX, currentCellY + this.nextDirY)) {
          this.dirX = this.nextDirX;
          this.dirY = this.nextDirY;
        }
      }

      // 2. 检查当前方向前方的格子是否为墙
      if (!isTileWalkable(currentCellX + this.dirX, currentCellY + this.dirY)) {
        // 如果前方是墙，立刻停在格子中心
        this.dirX = 0;
        this.dirY = 0;
      }
    }

    // 移动（由于 speed 为 2，且 TILE_SIZE 为 20，每帧移动 2 像素必然能整除 20，对齐完美）
    this.x += this.dirX * this.speed;
    this.y += this.dirY * this.speed;

    // 播放嘴巴开合动画
    if (this.dirX !== 0 || this.dirY !== 0) {
      this.mouthAngle += this.mouthSpeed * this.mouthDir;
      if (this.mouthAngle > 0.4 || this.mouthAngle < 0.05) {
        this.mouthDir *= -1;
      }
    }

    // 地图横向隧道穿梭
    if (this.x < -TILE_SIZE / 2) {
      this.x = MAP_COLS * TILE_SIZE - TILE_SIZE / 2;
    } else if (this.x > MAP_COLS * TILE_SIZE - TILE_SIZE / 2) {
      this.x = -TILE_SIZE / 2;
    }

    // 吃豆判定
    const cellX = Math.round(this.x / TILE_SIZE);
    const cellY = Math.round(this.y / TILE_SIZE);

    if (cellX >= 0 && cellX < MAP_COLS && cellY >= 0 && cellY < MAP_ROWS) {
      const type = gameGrid[cellY][cellX];
      if (type === 0) { // 吃小豆
        gameGrid[cellY][cellX] = 3;
        score += 10;
        updateScore();
        wakaStep++;
        synth.playWaka(wakaStep);
        checkWinCondition();
      } else if (type === 2) { // 吃大超频药丸
        gameGrid[cellY][cellX] = 3;
        score += 50;
        updateScore();
        triggerFrightenedMode();
        synth.playPowerup();
        checkWinCondition();
      }
    }
  },

  draw() {
    ctx.save();
    ctx.translate(this.x + TILE_SIZE / 2, this.y + TILE_SIZE / 2);

    // 根据移动方向旋转吃豆人
    let rotation = 0;
    if (this.dirX === 1) rotation = 0;
    else if (this.dirX === -1) rotation = Math.PI;
    else if (this.dirY === 1) rotation = Math.PI / 2;
    else if (this.dirY === -1) rotation = -Math.PI / 2;
    ctx.rotate(rotation);

    // 发光效果
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#fee440';

    ctx.fillStyle = '#fee440';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, this.mouthAngle * Math.PI, (2 - this.mouthAngle) * Math.PI);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
};

// 幽灵类
class Ghost {
  constructor(color, scatterX, scatterY, baseSpeed = 1.6) {
    this.color = color;
    this.scatterX = scatterX;
    this.scatterY = scatterY;
    this.baseSpeed = baseSpeed;
    this.reset();
  }

  reset() {
    this.x = 13 * TILE_SIZE;
    this.y = 13 * TILE_SIZE;
    this.dirX = 0;
    this.dirY = -1;
    this.speed = this.baseSpeed;
    this.isEaten = false;
  }

  update() {
    // 如果被吃，快速飘回基地
    if (this.isEaten) {
      this.speed = 4;
      const homeX = 13 * TILE_SIZE;
      const homeY = 13 * TILE_SIZE;
      const dx = homeX - this.x;
      const dy = homeY - this.y;
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
        this.isEaten = false;
        this.speed = this.baseSpeed;
      } else {
        // 简单追踪回基地
        this.dirX = dx > 0 ? 1 : (dx < 0 ? -1 : 0);
        this.dirY = dy > 0 ? 1 : (dy < 0 ? -1 : 0);
        this.x += this.dirX * this.speed;
        this.y += this.dirY * this.speed;
      }
      return;
    }

    // 确定速度
    this.speed = frightenedTimer > 0 ? 1 : 2;

    // 当走到整格中心时做寻路决策
    if (this.x % TILE_SIZE === 0 && this.y % TILE_SIZE === 0) {
      const cellX = this.x / TILE_SIZE;
      const cellY = this.y / TILE_SIZE;

      // 获取当前可行的方向列表 (禁止回头)
      const possibleDirs = [];
      const dirs = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 }
      ];

      dirs.forEach(d => {
        // 禁止掉头 (除非没路走)
        if (d.dx === -this.dirX && d.dy === -this.dirY) return;
        if (isTileWalkable(cellX + d.dx, cellY + d.dy)) {
          possibleDirs.push(d);
        }
      });

      // 如果只能回头，就把回头路也加上
      if (possibleDirs.length === 0) {
        if (isTileWalkable(cellX - this.dirX, cellY - this.dirY)) {
          possibleDirs.push({ dx: -this.dirX, dy: -this.dirY });
        }
      }

      if (possibleDirs.length > 0) {
        let bestDir = possibleDirs[0];

        if (frightenedTimer > 0) {
          // 逃跑/随机模式
          bestDir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
        } else {
          // 目标追踪模式：寻找离目标最短曼哈顿距离的方向
          let targetX = pacman.x;
          let targetY = pacman.y;

          // 不同的幽灵有不同的巡逻/围堵目标
          if (this.color === '#ff0055') { // 红：直接冲向 Pacman
            targetX = pacman.x;
            targetY = pacman.y;
          } else if (this.color === '#ff007f') { // 粉：拦截包堵，预测 Pacman 前方 4 格
            targetX = pacman.x + pacman.dirX * TILE_SIZE * 4;
            targetY = pacman.y + pacman.dirY * TILE_SIZE * 4;
          } else if (this.color === '#00bbf9') { // 蓝：协同狙击，夹角计算
            targetX = pacman.x - pacman.dirX * TILE_SIZE * 2;
            targetY = pacman.y - pacman.dirY * TILE_SIZE * 2;
          } else { // 绿：随机游走或在散开点徘徊
            if (globalTick % 500 < 150) {
              targetX = this.scatterX;
              targetY = this.scatterY;
            } else {
              targetX = pacman.x;
              targetY = pacman.y;
            }
          }

          let minDist = Infinity;
          possibleDirs.forEach(d => {
            const nextCellX = cellX + d.dx;
            const nextCellY = cellY + d.dy;
            const dist = Math.abs(nextCellX * TILE_SIZE - targetX) + Math.abs(nextCellY * TILE_SIZE - targetY);
            if (dist < minDist) {
              minDist = dist;
              bestDir = d;
            }
          });
        }

        this.dirX = bestDir.dx;
        this.dirY = bestDir.dy;
      } else {
        // 如果实在没地方走，停下
        this.dirX = 0;
        this.dirY = 0;
      }
    }

    this.x += this.dirX * this.speed;
    this.y += this.dirY * this.speed;

    // 地图边界横向隧道穿梭
    if (this.x < -TILE_SIZE / 2) {
      this.x = MAP_COLS * TILE_SIZE - TILE_SIZE / 2;
    } else if (this.x > MAP_COLS * TILE_SIZE - TILE_SIZE / 2) {
      this.x = -TILE_SIZE / 2;
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x + TILE_SIZE / 2, this.y + TILE_SIZE / 2);

    let displayColor = this.color;
    let isFrightened = frightenedTimer > 0 && !this.isEaten;
    
    if (isFrightened) {
      // 警报闪烁状态
      displayColor = frightenedTimer < 120 && Math.floor(globalTick / 10) % 2 === 0 ? '#fff' : '#00bbf9';
    }

    ctx.shadowBlur = 12;
    ctx.shadowColor = displayColor;

    if (this.isEaten) {
      // 只剩下发光眼睛
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-4, -2, 3, 0, Math.PI * 2);
      ctx.arc(4, -2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#00f';
      ctx.beginPath();
      ctx.arc(-4 + this.dirX * 2, -2 + this.dirY * 2, 1.5, 0, Math.PI * 2);
      ctx.arc(4 + this.dirX * 2, -2 + this.dirY * 2, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 经典幽灵机身结构
      ctx.fillStyle = displayColor;
      ctx.beginPath();
      ctx.arc(0, -2, 8, Math.PI, 0, false); // 头部
      ctx.lineTo(8, 8); // 右侧
      
      // 底部裙边波浪
      const wave = Math.sin(globalTick * 0.15) * 2;
      ctx.lineTo(5, 6 + wave);
      ctx.lineTo(2, 8);
      ctx.lineTo(-2, 6 + wave);
      ctx.lineTo(-5, 8);
      
      ctx.lineTo(-8, 8); // 左侧
      ctx.closePath();
      ctx.fill();

      // 眼睛
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-3, -2, 2.5, 0, Math.PI * 2);
      ctx.arc(3, -2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 瞳孔
      ctx.fillStyle = isFrightened ? '#fee440' : '#000';
      ctx.beginPath();
      ctx.arc(-3 + this.dirX, -2 + this.dirY, 1.2, 0, Math.PI * 2);
      ctx.arc(3 + this.dirX, -2 + this.dirY, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// 实例化四个幽灵
const ghosts = [
  new Ghost('#ff0055', 0, 0, 1.6), // 红色：直接搜捕
  new Ghost('#ff007f', MAP_COLS * TILE_SIZE, 0, 1.5), // 粉色：拦截包堵
  new Ghost('#00bbf9', 0, MAP_ROWS * TILE_SIZE, 1.5), // 蓝色：包围圈
  new Ghost('#39ff14', MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE, 1.4) // 绿色：随机闲逛
];

// --- 碰撞边界检测辅助函数 ---
function isTileWalkable(cellX, cellY) {
  // 左右隧道可以横向穿梭
  if (cellY === 13 && (cellX < 0 || cellX >= MAP_COLS)) {
    return true;
  }
  if (cellX < 0 || cellX >= MAP_COLS || cellY < 0 || cellY >= MAP_ROWS) {
    return false;
  }
  const type = gameGrid[cellY][cellX];
  return type !== 1; // 只要不是墙(1)，其余(豆子、空白、幽灵巢穴、幽灵门)对于吃豆人和幽灵来说均可连通
}

function canMoveTo(x, y, dx, dy) {
  // 这是一个只基于整格的碰撞校验
  const cellX = Math.round(x / TILE_SIZE);
  const cellY = Math.round(y / TILE_SIZE);
  const nextCellX = cellX + dx;
  const nextCellY = cellY + dy;
  return isTileWalkable(nextCellX, nextCellY);
}

// 激发超频药丸状态
function triggerFrightenedMode() {
  frightenedTimer = 420; // 约 7 秒的超频逆袭时间
}

// 粒子飞溅
function createExplosion(x, y, color) {
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: x + TILE_SIZE / 2,
      y: y + TILE_SIZE / 2,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      radius: Math.random() * 2 + 1,
      color: color,
      life: 30
    });
  }
}

// 校验是否通关
function checkWinCondition() {
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if (gameGrid[r][c] === 0 || gameGrid[r][c] === 2) {
        return; // 还有没吃完的豆子
      }
    }
  }
  // 通关
  gameWon = true;
  isPlaying = false;
  synth.playVictory();
  victoryOverlay.classList.remove('hidden');
}

// 幽灵与吃豆人接触判定
function checkGhostCollisions() {
  ghosts.forEach(ghost => {
    const dx = (pacman.x + TILE_SIZE / 2) - (ghost.x + TILE_SIZE / 2);
    const dy = (pacman.y + TILE_SIZE / 2) - (ghost.y + TILE_SIZE / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 14) {
      if (frightenedTimer > 0 && !ghost.isEaten) {
        // 反吃幽灵
        ghost.isEaten = true;
        score += 200;
        updateScore();
        createExplosion(ghost.x, ghost.y, ghost.color);
        synth.playEatGhost();
      } else if (!ghost.isEaten) {
        // Pacman 挂了
        handlePacmanDeath();
      }
    }
  });
}

function handlePacmanDeath() {
  lives--;
  updateLivesDisplay();
  createExplosion(pacman.x, pacman.y, '#fee440');
  synth.playDeath();
  isPlaying = false;

  if (lives <= 0) {
    gameOver = true;
    document.getElementById('failScoreVal').textContent = score;
    gameOverOverlay.classList.remove('hidden');
    
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('cyber_pacman_best', bestScore);
    }
  } else {
    // 扣命重置
    setTimeout(() => {
      pacman.reset();
      ghosts.forEach(g => g.reset());
      isPlaying = true;
      gameLoop();
    }, 1200);
  }
}

// 更新显示数据
function updateScore() {
  scoreVal.textContent = score;
}

function updateLivesDisplay() {
  let hearts = '';
  for (let i = 0; i < lives; i++) hearts += '❤';
  livesVal.textContent = hearts || 'OFFLINE';
}

// 绘制迷宫网格与点豆
function drawMaze() {
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const type = gameGrid[r][c];
      const x = c * TILE_SIZE;
      const y = r * TILE_SIZE;

      if (type === 1) { // 发光线框墙
        ctx.strokeStyle = 'rgba(157, 78, 221, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      } else if (type === 0) { // 普通发光豆
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#00f5d4';
        ctx.fillStyle = '#00f5d4';
        ctx.beginPath();
        ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // 重置
      } else if (type === 2) { // 大超频药丸
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff007f';
        ctx.fillStyle = '#ff007f';
        ctx.beginPath();
        // 缩放跳动动画
        const scale = 4.5 + Math.sin(globalTick * 0.15) * 1.5;
        ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // 重置
      } else if (type === 5) { // 幽灵封锁虚线门
        ctx.strokeStyle = '#00bbf9';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x, y + TILE_SIZE / 2);
        ctx.lineTo(x + TILE_SIZE * 2, y + TILE_SIZE / 2);
        ctx.stroke();
        ctx.setLineDash([]); // 重置
      }
    }
  }
}

// 渲染粒子
function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    
    ctx.shadowBlur = 8;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * (p.life / 30), 0, Math.PI * 2);
    ctx.fill();

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
  ctx.shadowBlur = 0;
}

// 启动游戏
function initGame() {
  score = 0;
  stage = 1;
  lives = 3;
  gameOver = false;
  gameWon = false;
  frightenedTimer = 0;
  particles = [];
  
  updateScore();
  updateLivesDisplay();
  stageVal.textContent = stage;

  // 深度复制迷宫格
  gameGrid = mazeLayout.map(row => [...row]);

  pacman.reset();
  ghosts.forEach(g => g.reset());

  startOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  victoryOverlay.classList.add('hidden');

  isPlaying = true;
  gameLoop();
}

function nextStage() {
  stage++;
  stageVal.textContent = stage;
  gameWon = false;
  frightenedTimer = 0;
  particles = [];

  // 重置关卡吃豆地图
  gameGrid = mazeLayout.map(row => [...row]);
  
  // 幽灵移速增加
  ghosts.forEach(g => {
    g.reset();
    g.baseSpeed = 1.6 + stage * 0.15;
  });
  
  pacman.reset();
  victoryOverlay.classList.add('hidden');
  
  isPlaying = true;
  gameLoop();
}

// --- 键盘控制 ---
window.addEventListener('keydown', e => {
  if (!isPlaying) return;
  
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    pacman.nextDirX = 0; pacman.nextDirY = -1;
    e.preventDefault();
  } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    pacman.nextDirX = 0; pacman.nextDirY = 1;
    e.preventDefault();
  } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    pacman.nextDirX = -1; pacman.nextDirY = 0;
    e.preventDefault();
  } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    pacman.nextDirX = 1; pacman.nextDirY = 0;
    e.preventDefault();
  }
});

// --- 滑屏/拖动动作手势遥控 ---
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
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  
  if (Math.abs(dx) > 25 || Math.abs(dy) > 25) {
    if (Math.abs(dx) > Math.abs(dy)) {
      pacman.nextDirX = dx > 0 ? 1 : -1;
      pacman.nextDirY = 0;
    } else {
      pacman.nextDirX = 0;
      pacman.nextDirY = dy > 0 ? 1 : -1;
    }
  }
  e.preventDefault();
}, { passive: false });

// 鼠标划屏备用
let isMouseDown = false;
canvas.addEventListener('mousedown', e => {
  touchStartX = e.clientX;
  touchStartY = e.clientY;
  isMouseDown = true;
});
canvas.addEventListener('mouseup', e => {
  if (!isMouseDown) return;
  isMouseDown = false;
  const dx = e.clientX - touchStartX;
  const dy = e.clientY - touchStartY;
  
  if (Math.abs(dx) > 20 || Math.abs(dy) > 20) {
    if (Math.abs(dx) > Math.abs(dy)) {
      pacman.nextDirX = dx > 0 ? 1 : -1;
      pacman.nextDirY = 0;
    } else {
      pacman.nextDirX = 0;
      pacman.nextDirY = dy > 0 ? 1 : -1;
    }
  }
});

// 静音控制
muteBtn.addEventListener('click', () => {
  synth.muted = !synth.muted;
  if (synth.muted) {
    muteBtn.classList.add('muted');
  } else {
    muteBtn.classList.remove('muted');
    synth.init();
  }
});

// 遮罩按钮动作
startBtn.addEventListener('click', initGame);
nextBtn.addEventListener('click', nextStage);
restartBtn.addEventListener('click', initGame);

// --- 游戏主循环 ---
function gameLoop() {
  if (!isPlaying) return;

  globalTick++;
  
  if (frightenedTimer > 0) {
    frightenedTimer--;
  }

  // 物理更新
  pacman.update();
  ghosts.forEach(g => g.update());
  checkGhostCollisions();

  // 画面渲染
  ctx.fillStyle = '#020005';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawMaze();
  pacman.draw();
  ghosts.forEach(g => g.draw());
  drawParticles();

  requestAnimationFrame(gameLoop);
}
