/**
 * Cyber Snake - 赛博贪吃蛇核心逻辑与 8-Bit 音效
 */

// --- 8-Bit 音效合成器 (Web Audio API) ---
class AudioSynth {
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

  playTone(freqStart, freqEnd, duration, type = 'sine', gainVal = 0.15) {
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

  // 蛇前行一步：极短促的声音
  playStep() {
    this.playTone(150, 150, 0.02, 'triangle', 0.03);
  }

  // 吃普通食物：欢快上扬音
  playEat() {
    this.playTone(523.25, 880, 0.08, 'sine', 0.12);
  }

  // 吃到加速闪电：超频音
  playPowerupSpeed() {
    this.playTone(600, 1200, 0.15, 'sine', 0.15);
  }

  // 吃到减速涡轮：降频音
  playPowerupSlow() {
    this.playTone(400, 200, 0.18, 'triangle', 0.15);
  }

  // 游戏GG音效：沉闷下滑
  playGameOver() {
    this.playTone(300, 60, 0.6, 'sawtooth', 0.25);
  }
}

const synth = new AudioSynth();

// --- 游戏配置与变量 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreVal = document.getElementById('scoreVal');
const bestVal = document.getElementById('bestVal');
const speedVal = document.getElementById('speedVal');

const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');

const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const muteBtn = document.getElementById('muteBtn');

const failScoreVal = document.getElementById('failScoreVal');

// 物理网格常数 (画布大小为 600 * 480，我们设置格子大小为 20 * 20)
// 网格规格为：30 列 * 24 行
const GRID_SIZE = 20;
const COLS = canvas.width / GRID_SIZE;
const ROWS = canvas.height / GRID_SIZE;

// 游戏物理状态
let snake = [];
let dir = 'RIGHT';
let nextDir = 'RIGHT';

let score = 0;
let bestScore = 0;
let gameOver = false;
let gameStarted = false;

// 食物对象
let food = null;       // 普通食物 {x, y, color}
let powerup = null;    // 道具食物 {x, y, type, color, timer}

// 道具计时器与速度控制
let baseSpeedDelay = 110;  // 基础移动周期 110 毫秒
let activeSpeedDelay = 110; // 当前生效移动周期
let powerupTimer = 0;      // 道具剩余生效帧数 (以游戏步为周期)
let activePowerupType = null; // 'speedup' 或 'slowdown'

// 粒子系统与时间循环控制
let particles = [];
let gameTimeout = null;

// 滑动交互状态机
let touchStartX = 0;
let touchStartY = 0;

// --- 初始化与开始游戏 ---

function initGame() {
  score = 0;
  dir = 'RIGHT';
  nextDir = 'RIGHT';
  gameOver = false;
  gameStarted = true;
  
  activeSpeedDelay = baseSpeedDelay;
  powerupTimer = 0;
  activePowerupType = null;
  
  particles = [];
  
  // 初始蛇：在屏幕左侧，长度 3 节
  snake = [
    { x: 5, y: 12 },
    { x: 4, y: 12 },
    { x: 3, y: 12 }
  ];
  
  loadBestRecord();
  updateUI();
  spawnFood();
  
  startOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  
  synth.init();
  
  // 启动物理移动循环
  if (gameTimeout) clearTimeout(gameTimeout);
  gameStepLoop();
}

function loadBestRecord() {
  const saved = localStorage.getItem('cybersnake_best');
  bestScore = saved ? parseInt(saved, 10) : 0;
  bestVal.textContent = bestScore;
}

function updateUI() {
  scoreVal.textContent = score;
  if (score > bestScore) {
    bestScore = score;
    bestVal.textContent = bestScore;
    localStorage.setItem('cybersnake_best', bestScore);
  }
  
  // 速度指示灯
  if (activePowerupType === 'speedup') {
    speedVal.textContent = '1.6X 超频';
    speedVal.style.color = '#39ff14';
  } else if (activePowerupType === 'slowdown') {
    speedVal.textContent = '0.6X 缓速';
    speedVal.style.color = '#9d4edd';
  } else {
    speedVal.textContent = '1.0X 正常';
    speedVal.style.color = '#00f5d4';
  }
}

// 随机食物生成
function spawnFood() {
  let overlap = true;
  let fx, fy;
  
  while (overlap) {
    overlap = false;
    fx = Math.floor(Math.random() * COLS);
    fy = Math.floor(Math.random() * ROWS);
    
    // 检查是否刷在蛇身重叠上
    for (let part of snake) {
      if (part.x === fx && part.y === fy) {
        overlap = true;
        break;
      }
    }
  }
  
  food = {
    x: fx,
    y: fy,
    color: '#fee440',
    pulse: 0
  };
  
  // 12% 概率伴随生成一个辅助道具
  if (Math.random() < 0.12 && !powerup) {
    spawnPowerup();
  }
}

function spawnPowerup() {
  let overlap = true;
  let px, py;
  
  while (overlap) {
    overlap = false;
    px = Math.floor(Math.random() * COLS);
    py = Math.floor(Math.random() * ROWS);
    
    // 避开蛇身与普通食物
    if (food && food.x === px && food.y === py) {
      overlap = true;
    }
    for (let part of snake) {
      if (part.x === px && part.y === py) {
        overlap = true;
        break;
      }
    }
  }
  
  // 随机二选一道具：加速或减速
  const isSpeed = Math.random() < 0.5;
  powerup = {
    x: px,
    y: py,
    type: isSpeed ? 'speedup' : 'slowdown',
    color: isSpeed ? '#39ff14' : '#9d4edd',
    life: 50 // 50 步物理更新后自动消失
  };
}

// --- 贪吃蛇运动计算 (物理步) ---

function gameStepLoop() {
  if (!gameStarted || gameOver) return;
  
  // 1. 物理前行一步
  updatePhysics();
  
  // 2. 调度下一步的时间间隔 (受到加速/减速道具影响)
  gameTimeout = setTimeout(gameStepLoop, activeSpeedDelay);
}

function updatePhysics() {
  // 应用下一步方向，防止连续按键自己咬自己
  dir = nextDir;
  
  // 计算蛇头新坐标
  let headX = snake[0].x;
  let headY = snake[0].y;
  
  if (dir === 'UP') headY--;
  else if (dir === 'DOWN') headY++;
  else if (dir === 'LEFT') headX--;
  else if (dir === 'RIGHT') headX++;
  
  // 碰撞检测 A：撞墙
  if (headX < 0 || headX >= COLS || headY < 0 || headY >= ROWS) {
    handleGameOver();
    return;
  }
  
  // 碰撞检测 B：撞自己身体 (从第 2 节开始，因为如果只吃了一个变向，头不可能立刻撞第 1 节)
  for (let i = 1; i < snake.length; i++) {
    if (snake[i].x === headX && snake[i].y === headY) {
      handleGameOver();
      return;
    }
  }
  
  // 蛇头前进，插入新节
  const newHead = { x: headX, y: headY };
  snake.unshift(newHead);
  
  // 碰撞检测 C：吃到普通食物
  if (food && headX === food.x && headY === food.y) {
    score += 100;
    synth.playEat();
    spawnFood();
    updateUI();
    
    // 在食物位置产生金色爆炸粒子
    spawnExplosion(newHead.x * GRID_SIZE + GRID_SIZE / 2, newHead.y * GRID_SIZE + GRID_SIZE / 2, '#fee440');
  } else {
    // 没吃普通食物，裁掉蛇尾保持长度
    snake.pop();
  }
  
  // 碰撞检测 D：吃到道具食物
  if (powerup && headX === powerup.x && headY === powerup.y) {
    activePowerupType = powerup.type;
    powerupTimer = 55; // 持续 55 步更新 (约 6 秒)
    
    if (powerup.type === 'speedup') {
      activeSpeedDelay = 65; // 游戏变快
      synth.playPowerupSpeed();
      spawnExplosion(powerup.x * GRID_SIZE + GRID_SIZE / 2, powerup.y * GRID_SIZE + GRID_SIZE / 2, '#39ff14', 18);
    } else {
      activeSpeedDelay = 165; // 游戏变慢，更容易控制
      synth.playPowerupSlow();
      spawnExplosion(powerup.x * GRID_SIZE + GRID_SIZE / 2, powerup.y * GRID_SIZE + GRID_SIZE / 2, '#9d4edd', 18);
    }
    
    powerup = null;
    updateUI();
  }
  
  // 3. 道具效果定时倒计时
  if (powerupTimer > 0) {
    powerupTimer--;
    if (powerupTimer <= 0) {
      // 道具过期，速度复原
      activePowerupType = null;
      activeSpeedDelay = baseSpeedDelay;
      updateUI();
    }
  }
  
  // 4. 更新道具的场上生存周期
  if (powerup) {
    powerup.life--;
    if (powerup.life <= 0) {
      powerup = null; // 超时自动消失
    }
  }
  
  // 播放轻微前行节拍
  synth.playStep();
}

function handleGameOver() {
  gameOver = true;
  synth.playGameOver();
  failScoreVal.textContent = score;
  gameOverOverlay.classList.remove('hidden');
}

// 粒子特效
function spawnExplosion(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.0 + Math.random() * 3.0;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.5,
      radius: 1.2 + Math.random() * 1.5,
      color,
      alpha: 1.0,
      decay: 0.03 + Math.random() * 0.02
    });
  }
}

// --- 渲染系统 (以 60 帧平滑运行) ---

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 1. 绘制网格背景 (发光网格)
  drawGrid();

  // 2. 绘制普通食物 (金色闪烁发光圆核心)
  if (food) {
    ctx.save();
    food.pulse = (food.pulse + 0.15) % (Math.PI * 2);
    const r = GRID_SIZE / 2 - 2 + Math.sin(food.pulse) * 1.5;
    
    ctx.shadowColor = food.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = food.color;
    ctx.beginPath();
    ctx.arc(food.x * GRID_SIZE + GRID_SIZE / 2, food.y * GRID_SIZE + GRID_SIZE / 2, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 3. 绘制道具食物
  if (powerup) {
    ctx.save();
    ctx.shadowColor = powerup.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = powerup.color;
    
    const cx = powerup.x * GRID_SIZE + GRID_SIZE / 2;
    const cy = powerup.y * GRID_SIZE + GRID_SIZE / 2;
    
    if (powerup.type === 'speedup') {
      // 加速闪电：画一个发光的闪电符号
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy - 7);
      ctx.lineTo(cx + 4, cy - 2);
      ctx.lineTo(cx + 1, cy - 1);
      ctx.lineTo(cx + 4, cy + 7);
      ctx.lineTo(cx - 3, cy + 2);
      ctx.lineTo(cx - 1, cy + 1);
      ctx.closePath();
      ctx.fill();
    } else {
      // 减速涡轮：画个发光的环环
      ctx.strokeStyle = powerup.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 4. 绘制蛇身 (渐变霓虹拖尾)
  snake.forEach((part, idx) => {
    ctx.save();
    
    // 计算渐变透明度和发光度
    // 头部最亮，尾巴变暗
    const ratio = (snake.length - idx) / snake.length;
    const opacity = 0.35 + ratio * 0.65;
    
    let tileColor = `rgba(0, 245, 212, ${opacity})`; // 青色发光
    if (activePowerupType === 'speedup') {
      tileColor = `rgba(57, 255, 20, ${opacity})`; // 超频状态变为绿色
    } else if (activePowerupType === 'slowdown') {
      tileColor = `rgba(157, 78, 221, ${opacity})`; // 减速状态变为紫色
    }
    
    ctx.shadowColor = activePowerupType === 'speedup' ? '#39ff14' : (activePowerupType === 'slowdown' ? '#9d4edd' : '#00f5d4');
    ctx.shadowBlur = idx === 0 ? 15 : 6;
    ctx.fillStyle = tileColor;
    
    // 绘制带小缝隙的圆角蛇身
    const r = 4;
    const px = part.x * GRID_SIZE + 2;
    const py = part.y * GRID_SIZE + 2;
    const pw = GRID_SIZE - 4;
    const ph = GRID_SIZE - 4;
    
    ctx.beginPath();
    ctx.moveTo(px + r, py);
    ctx.lineTo(px + pw - r, py);
    ctx.quadraticCurveTo(px + pw, py, px + pw, py + r);
    ctx.lineTo(px + pw, py + ph - r);
    ctx.quadraticCurveTo(px + pw, py + ph, px + pw - r, py + ph);
    ctx.lineTo(px + r, py + ph);
    ctx.quadraticCurveTo(px, py + ph, px, py + ph - r);
    ctx.lineTo(px, py + r);
    ctx.quadraticCurveTo(px, py, px + r, py);
    ctx.closePath();
    ctx.fill();
    
    // 如果是蛇头，画出眼睛表示方向
    if (idx === 0) {
      ctx.fillStyle = '#05020c';
      const eyeR = 2;
      const hx = part.x * GRID_SIZE;
      const hy = part.y * GRID_SIZE;
      
      if (dir === 'RIGHT') {
        ctx.beginPath();
        ctx.arc(hx + 14, hy + 6, eyeR, 0, Math.PI * 2);
        ctx.arc(hx + 14, hy + 14, eyeR, 0, Math.PI * 2);
        ctx.fill();
      } else if (dir === 'LEFT') {
        ctx.beginPath();
        ctx.arc(hx + 6, hy + 6, eyeR, 0, Math.PI * 2);
        ctx.arc(hx + 6, hy + 14, eyeR, 0, Math.PI * 2);
        ctx.fill();
      } else if (dir === 'UP') {
        ctx.beginPath();
        ctx.arc(hx + 6, hy + 6, eyeR, 0, Math.PI * 2);
        ctx.arc(hx + 14, hy + 6, eyeR, 0, Math.PI * 2);
        ctx.fill();
      } else if (dir === 'DOWN') {
        ctx.beginPath();
        ctx.arc(hx + 6, hy + 14, eyeR, 0, Math.PI * 2);
        ctx.arc(hx + 14, hy + 14, eyeR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  });

  // 5. 绘制粒子
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
  ctx.lineWidth = 0.5;
  for (let x = GRID_SIZE; x < canvas.width; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = GRID_SIZE; y < canvas.height; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

// 粒子和渲染动画回路
function animationFrameLoop() {
  if (gameStarted) {
    // 平滑物理粒子物理更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02; // 小小的微重力
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }
    draw();
  }
  requestAnimationFrame(animationFrameLoop);
}

// --- 键盘与划动手势事件 ---

window.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
    e.preventDefault(); // 阻止滚动
  }
  
  if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && dir !== 'DOWN') {
    nextDir = 'UP';
  } else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && dir !== 'UP') {
    nextDir = 'DOWN';
  } else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && dir !== 'RIGHT') {
    nextDir = 'LEFT';
  } else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && dir !== 'LEFT') {
    nextDir = 'RIGHT';
  }
});

// 手势滑动检测 (支持鼠标拖拽及手机触屏)
function handleGesture(startX, startY, endX, endY) {
  const dx = endX - startX;
  const dy = endY - startY;
  
  if (Math.abs(dx) < 25 && Math.abs(dy) < 25) return; // 忽略微小抖动
  
  if (Math.abs(dx) > Math.abs(dy)) {
    // 左右滑
    if (dx > 0 && dir !== 'LEFT') {
      nextDir = 'RIGHT';
    } else if (dx < 0 && dir !== 'RIGHT') {
      nextDir = 'LEFT';
    }
  } else {
    // 上下滑
    if (dy > 0 && dir !== 'UP') {
      nextDir = 'DOWN';
    } else if (dy < 0 && dir !== 'DOWN') {
      nextDir = 'UP';
    }
  }
}

// 触屏滑动绑定
canvas.addEventListener('touchstart', e => {
  synth.init();
  if (e.touches.length !== 1) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});

canvas.addEventListener('touchend', e => {
  if (e.changedTouches.length !== 1) return;
  const endX = e.changedTouches[0].clientX;
  const endY = e.changedTouches[0].clientY;
  handleGesture(touchStartX, touchStartY, endX, endY);
});

// 鼠标拖动绑定 (支持桌面端用鼠标方向划屏控制)
let isMouseDown = false;
canvas.addEventListener('mousedown', e => {
  isMouseDown = true;
  touchStartX = e.clientX;
  touchStartY = e.clientY;
});

canvas.addEventListener('mouseup', e => {
  if (!isMouseDown) return;
  isMouseDown = false;
  handleGesture(touchStartX, touchStartY, e.clientX, e.clientY);
});

// 遮罩按钮绑定
startBtn.addEventListener('click', () => {
  initGame();
});

restartBtn.addEventListener('click', () => {
  initGame();
});

muteBtn.addEventListener('click', () => {
  synth.muted = !synth.muted;
  const soundWave = document.getElementById('soundWave');
  if (synth.muted) {
    muteBtn.classList.add('muted');
    soundWave.style.opacity = '0.2';
  } else {
    muteBtn.classList.remove('muted');
    soundWave.style.opacity = '1';
    synth.init();
    synth.playTone(600, 600, 0.05); // 反馈
  }
});

// 启动渲染动画与粒子回路
requestAnimationFrame(animationFrameLoop);
draw();
