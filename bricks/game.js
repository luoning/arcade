/**
 * Bricks - 霓虹街机俄罗斯方块游戏逻辑
 */

// --- 8-Bit 电子音效合成器 ---
class AudioSynth {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      // 兼容老浏览器并创建音频上下文
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freqStart, freqEnd, duration, type = 'sine') {
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
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn("音频播放失败:", e);
    }
  }

  playRotate() {
    // 短促的上升音调
    this.playTone(300, 600, 0.08, 'triangle');
  }

  playDrop() {
    // 沉闷的落地音
    this.playTone(180, 60, 0.1, 'sawtooth');
  }

  playHold() {
    // 清脆的提示音
    this.playTone(500, 400, 0.12, 'sine');
  }

  playLineClear() {
    // 欢快的双音节和弦
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      
      // 播第一个音
      this.playTone(523.25, 659.25, 0.15, 'square'); // C5 到 E5
      // 延迟一点播第二个音
      setTimeout(() => {
        this.playTone(659.25, 783.99, 0.2, 'square'); // E5 到 G5
      }, 80);
    } catch (e) {}
  }

  playGameOver() {
    // 逐渐滑落的悲伤音调
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      this.playTone(300, 100, 0.6, 'sawtooth');
      setTimeout(() => {
        this.playTone(200, 60, 0.8, 'sawtooth');
      }, 200);
    } catch (e) {}
  }
}

const synth = new AudioSynth();

// --- 游戏配置与常量 ---
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30; // 像素

// 7 种经典的方块形状与它们的专属渐变色设定 (CSS 渐变模拟)
const SHAPES = {
  'I': [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  'J': [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  'L': [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ],
  'O': [
    [1, 1],
    [1, 1]
  ],
  'S': [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ],
  'Z': [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ],
  'T': [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ]
};

// 绚丽的霓虹渐变配色定义 (起止颜色)
const COLORS = {
  'I': { main: '#00f5d4', secondary: '#00bbf9', shadow: 'rgba(0, 245, 212, 0.5)' }, // 青色霓虹
  'J': { main: '#00bbf9', secondary: '#0077b6', shadow: 'rgba(0, 187, 249, 0.5)' }, // 蓝色
  'L': { main: '#ff9f1c', secondary: '#e76f51', shadow: 'rgba(255, 159, 28, 0.5)' }, // 橙色
  'O': { main: '#fee440', secondary: '#f3c60f', shadow: 'rgba(254, 228, 64, 0.5)' }, // 黄色
  'S': { main: '#39ff14', secondary: '#00b7c2', shadow: 'rgba(57, 255, 20, 0.5)' }, // 亮绿
  'Z': { main: '#ff007f', secondary: '#7209b7', shadow: 'rgba(255, 0, 127, 0.5)' }, // 粉红
  'T': { main: '#9d4edd', secondary: '#560bad', shadow: 'rgba(157, 78, 221, 0.5)' }  // 紫色
};

// --- DOM 元素绑定 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('holdCanvas');
const holdCtx = holdCanvas.getContext('2d');

const scoreVal = document.getElementById('scoreVal');
const levelVal = document.getElementById('levelVal');
const linesVal = document.getElementById('linesVal');

const startOverlay = document.getElementById('startOverlay');
const pauseOverlay = document.getElementById('pauseOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');

const startBtn = document.getElementById('startBtn');
const resumeBtn = document.getElementById('resumeBtn');
const restartBtn = document.getElementById('restartBtn');
const muteBtn = document.getElementById('muteBtn');
const pauseBtnHeader = document.getElementById('pauseBtnHeader');

// --- 游戏运行状态变量 ---
let grid = createGrid();
let currentPiece = null;
let nextPieceType = null;
let holdPieceType = null;
let hasHeldThisTurn = false;

let score = 0;
let level = 1;
let lines = 0;
let gameOver = false;
let isPaused = false;
let gameStarted = false;

let dropCounter = 0;
let dropInterval = 1000; // 初始下落时间 ms
let lastTime = 0;

// 消除行特效追踪
let clearingLines = [];
let clearAnimTimer = 0;

// --- 初始化网格与重置 ---
function createGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

// 随机获取下一个方块类型 (简单版背包生成器，确保分配合理)
let bag = [];
function getRandomPieceType() {
  if (bag.length === 0) {
    bag = Object.keys(SHAPES);
    // 洗牌算法
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  return bag.pop();
}

// 构造一个方块对象
function createPiece(type) {
  return {
    type: type,
    matrix: SHAPES[type].map(row => [...row]),
    x: Math.floor((COLS - SHAPES[type][0].length) / 2),
    y: type === 'I' ? -1 : 0, // I 型方块微调初始行
    color: COLORS[type]
  };
}

// --- 碰撞检测与逻辑核心 ---
function collide(grid, piece) {
  const m = piece.matrix;
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[r].length; c++) {
      if (m[r][c] !== 0) {
        const nextX = piece.x + c;
        const nextY = piece.y + r;
        
        // 边界检测与网格碰撞判定
        if (nextX < 0 || nextX >= COLS || nextY >= ROWS) {
          return true;
        }
        if (nextY >= 0 && grid[nextY][nextX] !== 0) {
          return true;
        }
      }
    }
  }
  return false;
}

// 合并方块到底盘网格上
function merge(grid, piece) {
  piece.matrix.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val !== 0) {
        const targetY = piece.y + r;
        if (targetY >= 0) {
          grid[targetY][piece.x + c] = piece.type;
        }
      }
    });
  });
}

// 旋转矩阵
function rotateMatrix(matrix, dir) {
  // 转置
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  // 根据方向顺时针/逆时针翻转
  if (dir > 0) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

// 旋转并尝试踢墙 (简单踢墙逻辑)
function playerRotate(dir) {
  if (gameOver || isPaused || !gameStarted) return;
  const originalX = currentPiece.x;
  rotateMatrix(currentPiece.matrix, dir);
  
  // 简易踢墙尝试
  let offset = 1;
  const matrixWidth = currentPiece.matrix[0].length;
  
  while (collide(grid, currentPiece)) {
    currentPiece.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    
    // 如果踢墙平移幅度过大，说明旋转不合法，回滚
    if (Math.abs(offset) > matrixWidth) {
      rotateMatrix(currentPiece.matrix, -dir); // 转回去
      currentPiece.x = originalX;
      return;
    }
  }
  synth.playRotate();
}

// 方块左/右平移
function playerMove(dir) {
  if (gameOver || isPaused || !gameStarted) return;
  currentPiece.x += dir;
  if (collide(grid, currentPiece)) {
    currentPiece.x -= dir;
  }
}

// 方块自然下坠或软降
function playerDrop() {
  if (gameOver || isPaused || !gameStarted) return;
  currentPiece.y++;
  
  if (collide(grid, currentPiece)) {
    currentPiece.y--;
    lockPiece();
  }
  dropCounter = 0;
}

// 瞬间坠落 (硬降)
function playerHardDrop() {
  if (gameOver || isPaused || !gameStarted) return;
  let dist = 0;
  while (!collide(grid, currentPiece)) {
    currentPiece.y++;
    dist++;
  }
  currentPiece.y--;
  
  if (dist > 0) {
    score += dist * 2; // 硬降额外加分
  }
  lockPiece();
  dropCounter = 0;
}

// 暂存方块 Hold
function playerHold() {
  if (gameOver || isPaused || !gameStarted || hasHeldThisTurn) return;
  
  synth.playHold();
  
  const temp = holdPieceType;
  holdPieceType = currentPiece.type;
  
  if (temp === null) {
    // 第一次 Hold，从下一块中抽取
    currentPiece = createPiece(nextPieceType);
    nextPieceType = getRandomPieceType();
  } else {
    // 交换 Hold 与 当前
    currentPiece = createPiece(temp);
  }
  
  hasHeldThisTurn = true;
  drawHoldCanvas();
  drawNextCanvas();
}

// 方块锁定逻辑
function lockPiece() {
  merge(grid, currentPiece);
  synth.playDrop();
  
  // 检查消行
  checkLines();
  
  // 重置回合的 Hold 标记，派发新块
  hasHeldThisTurn = false;
  currentPiece = createPiece(nextPieceType);
  nextPieceType = getRandomPieceType();
  
  // 顶端发生碰撞，说明直接顶死，Game Over
  if (collide(grid, currentPiece)) {
    handleGameOver();
  }
  
  drawNextCanvas();
}

// 检查消行
function checkLines() {
  let linesClearedThisTurn = 0;
  
  for (let r = ROWS - 1; r >= 0; r--) {
    // 某一行如果不含 0，说明满了
    if (grid[r].every(val => val !== 0)) {
      clearingLines.push(r);
      linesClearedThisTurn++;
    }
  }
  
  if (linesClearedThisTurn > 0) {
    // 触发消行动画定时器 (让特效闪烁 150ms 左右再真正削行)
    clearAnimTimer = 10; 
    synth.playLineClear();
    
    // 计算得分
    const scoreMap = [0, 100, 300, 500, 800];
    score += (scoreMap[linesClearedThisTurn] || 1200) * level;
    lines += linesClearedThisTurn;
    
    // 升级逻辑
    level = Math.floor(lines / 10) + 1;
    // 下落速度级联提升
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    
    updateScoreUI();
  }
}

// 真正执行将消除行抽离并补齐顶端的操作
function executeClearLines() {
  // 对索引降序排列，从下往上切除，避免索引发生偏移
  clearingLines.sort((a, b) => b - a);
  
  clearingLines.forEach(r => {
    grid.splice(r, 1);
    grid.unshift(Array(COLS).fill(0));
  });
  
  clearingLines = [];
}

// 更新界面数值
function updateScoreUI() {
  scoreVal.textContent = String(score).padStart(6, '0');
  levelVal.textContent = level;
  linesVal.textContent = lines;
}

// --- 渲染系统 ---

// 绘制主界面阴影投影，辅助玩家对齐
function drawGhostPiece() {
  if (!currentPiece) return;
  
  // 复制一份当前坐标
  const ghost = {
    ...currentPiece,
    matrix: currentPiece.matrix.map(row => [...row])
  };
  
  // 往下模拟下落到最底端
  while (!collide(grid, ghost)) {
    ghost.y++;
  }
  ghost.y--;
  
  // 用浅半透明虚线画出影子
  ctx.save();
  ctx.strokeStyle = currentPiece.color.main;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.25;
  
  ghost.matrix.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val !== 0) {
        const x = (ghost.x + c) * BLOCK_SIZE;
        const y = (ghost.y + r) * BLOCK_SIZE;
        
        ctx.strokeRect(x + 2, y + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
      }
    });
  });
  ctx.restore();
}

// 绘制一个渐变发光方块
function drawBlock(context, x, y, type, targetCanvasContext = ctx) {
  const color = COLORS[type];
  if (!color) return;

  targetCanvasContext.save();
  
  // 设置霓虹模糊发光效果
  targetCanvasContext.shadowColor = color.shadow;
  targetCanvasContext.shadowBlur = 10;
  
  // 线性渐变，从左上到右下
  const grad = targetCanvasContext.createLinearGradient(
    x * BLOCK_SIZE, y * BLOCK_SIZE,
    (x + 1) * BLOCK_SIZE, (y + 1) * BLOCK_SIZE
  );
  grad.addColorStop(0, color.main);
  grad.addColorStop(1, color.secondary);
  
  targetCanvasContext.fillStyle = grad;
  
  // 绘制带圆角矩形，质感更圆润
  const r = 5; // 圆角半径
  const bx = x * BLOCK_SIZE + 1;
  const by = y * BLOCK_SIZE + 1;
  const w = BLOCK_SIZE - 2;
  const h = BLOCK_SIZE - 2;
  
  targetCanvasContext.beginPath();
  targetCanvasContext.moveTo(bx + r, by);
  targetCanvasContext.lineTo(bx + w - r, by);
  targetCanvasContext.quadraticCurveTo(bx + w, by, bx + w, by + r);
  targetCanvasContext.lineTo(bx + w, by + h - r);
  targetCanvasContext.quadraticCurveTo(bx + w, by + h, bx + w - r, by + h);
  targetCanvasContext.lineTo(bx + r, by + h);
  targetCanvasContext.quadraticCurveTo(bx, by + h, bx, by + h - r);
  targetCanvasContext.lineTo(bx, by + r);
  targetCanvasContext.quadraticCurveTo(bx, by, bx + r, by);
  targetCanvasContext.closePath();
  
  targetCanvasContext.fill();
  
  // 绘制内层描边，增强晶莹剔透的感觉
  targetCanvasContext.shadowBlur = 0; // 关闭阴影避免线条过粗
  targetCanvasContext.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  targetCanvasContext.lineWidth = 1;
  targetCanvasContext.stroke();
  
  targetCanvasContext.restore();
}

// 绘制主底盘
function drawGrid() {
  grid.forEach((row, y) => {
    row.forEach((val, x) => {
      // 检查这一行是否在消行动画闪烁中
      if (val !== 0) {
        if (clearingLines.includes(y)) {
          // 正在消除，画高亮白色闪烁方块
          ctx.save();
          ctx.fillStyle = clearAnimTimer % 2 === 0 ? 'rgba(255, 255, 255, 0.8)' : COLORS[val].main;
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 15;
          ctx.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
          ctx.restore();
        } else {
          drawBlock(ctx, x, y, val);
        }
      } else {
        // 空白背景网格辅助线 (只画极浅虚线，低调奢华)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    });
  });
}

// 绘制当前正在控制的方块
function drawCurrentPiece() {
  if (!currentPiece) return;
  currentPiece.matrix.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val !== 0) {
        drawBlock(ctx, currentPiece.x + c, currentPiece.y + r, currentPiece.type);
      }
    });
  });
}

// 绘制预览与暂存画布的辅助函数
function drawPreview(targetCtx, type, targetCanvas) {
  targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  if (!type) return;
  
  const matrix = SHAPES[type];
  const color = COLORS[type];
  
  // 居中偏移计算
  const gridW = matrix[0].length;
  const gridH = matrix.length;
  const padX = (targetCanvas.width - gridW * BLOCK_SIZE) / 2;
  const padY = (targetCanvas.height - gridH * BLOCK_SIZE) / 2;
  
  targetCtx.save();
  targetCtx.translate(padX, padY);
  
  matrix.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val !== 0) {
        // 在该子画布上绘制方块
        targetCtx.save();
        targetCtx.shadowColor = color.shadow;
        targetCtx.shadowBlur = 8;
        
        const grad = targetCtx.createLinearGradient(
          c * BLOCK_SIZE, r * BLOCK_SIZE,
          (c + 1) * BLOCK_SIZE, (r + 1) * BLOCK_SIZE
        );
        grad.addColorStop(0, color.main);
        grad.addColorStop(1, color.secondary);
        
        targetCtx.fillStyle = grad;
        
        // 绘制圆角
        const radius = 4;
        const bx = c * BLOCK_SIZE + 1;
        const by = r * BLOCK_SIZE + 1;
        const w = BLOCK_SIZE - 2;
        const h = BLOCK_SIZE - 2;
        
        targetCtx.beginPath();
        targetCtx.moveTo(bx + radius, by);
        targetCtx.lineTo(bx + w - radius, by);
        targetCtx.quadraticCurveTo(bx + w, by, bx + w, by + radius);
        targetCtx.lineTo(bx + w, by + h - radius);
        targetCtx.quadraticCurveTo(bx + w, by + h, bx + w - radius, by + h);
        targetCtx.lineTo(bx + radius, by + h);
        targetCtx.quadraticCurveTo(bx, by + h, bx, by + h - radius);
        targetCtx.lineTo(bx, by + radius);
        targetCtx.quadraticCurveTo(bx, by, bx + radius, by);
        targetCtx.closePath();
        targetCtx.fill();
        
        targetCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        targetCtx.stroke();
        targetCtx.restore();
      }
    });
  });
  targetCtx.restore();
}

function drawNextCanvas() {
  drawPreview(nextCtx, nextPieceType, nextCanvas);
}

function drawHoldCanvas() {
  drawPreview(holdCtx, holdPieceType, holdCanvas);
}

// 主渲染流程
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 绘制底盘网格
  drawGrid();
  
  // 绘制下落投影
  if (currentPiece && !gameOver) {
    drawGhostPiece();
  }
  
  // 绘制落下的方块
  if (currentPiece) {
    drawCurrentPiece();
  }
}

// --- 游戏环 (Loop) ---
function update(time = 0) {
  if (gameOver || isPaused || !gameStarted) {
    requestAnimationFrame(update);
    return;
  }
  
  const deltaTime = time - lastTime;
  lastTime = time;
  
  // 处理消行动画延迟
  if (clearAnimTimer > 0) {
    clearAnimTimer--;
    if (clearAnimTimer === 0) {
      executeClearLines();
    }
  } else {
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
      playerDrop();
    }
  }
  
  draw();
  requestAnimationFrame(update);
}

// --- 游戏状态变更逻辑 ---
function handleGameOver() {
  gameOver = true;
  synth.playGameOver();
  gameOverOverlay.classList.remove('hidden');
}

function togglePause() {
  if (!gameStarted || gameOver) return;
  isPaused = !isPaused;
  
  if (isPaused) {
    pauseOverlay.classList.remove('hidden');
  } else {
    pauseOverlay.classList.add('hidden');
    lastTime = performance.now(); // 恢复时间戳，防突降
  }
}

function startGame() {
  // 重置状态
  grid = createGrid();
  score = 0;
  level = 1;
  lines = 0;
  gameOver = false;
  isPaused = false;
  gameStarted = true;
  dropInterval = 1000;
  
  holdPieceType = null;
  hasHeldThisTurn = false;
  
  bag = [];
  nextPieceType = getRandomPieceType();
  currentPiece = createPiece(getRandomPieceType());
  
  updateScoreUI();
  drawNextCanvas();
  drawHoldCanvas();
  
  // 掩盖遮罩层
  startOverlay.classList.add('hidden');
  pauseOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  
  lastTime = performance.now();
  synth.init();
}

// --- 事件监听与用户控制 ---

// 键盘控制
window.addEventListener('keydown', event => {
  // 阻止游戏状态下的方向键与空格的默认页面滚动
  if (gameStarted && !gameOver && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
    event.preventDefault();
  }
  
  if (event.key === 'p' || event.key === 'P') {
    togglePause();
    return;
  }
  
  if (isPaused || gameOver || !gameStarted) return;
  
  switch (event.key) {
    case 'a':
    case 'A':
    case 'ArrowLeft':
      playerMove(-1);
      break;
    case 'd':
    case 'D':
    case 'ArrowRight':
      playerMove(1);
      break;
    case 's':
    case 'S':
    case 'ArrowDown':
      playerDrop();
      break;
    case 'w':
    case 'W':
    case 'ArrowUp':
      playerRotate(1); // 顺时针旋转
      break;
    case ' ':
      playerHardDrop();
      break;
    case 'c':
    case 'C':
    case 'Shift':
      playerHold();
      break;
  }
});

// 绑定遮罩层里的按钮
startBtn.addEventListener('click', () => {
  synth.init();
  startGame();
});
resumeBtn.addEventListener('click', () => {
  synth.init();
  togglePause();
});
restartBtn.addEventListener('click', () => {
  synth.init();
  startGame();
});

// 静音按钮
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
    synth.playTone(440, 440, 0.05); // 嘟一声反馈
  }
});

// 顶部栏快捷暂停
pauseBtnHeader.addEventListener('click', () => {
  togglePause();
});

// 移动端虚拟手柄监听
const setupMobileControls = () => {
  const mLeft = document.getElementById('mLeft');
  const mRight = document.getElementById('mRight');
  const mDown = document.getElementById('mDown');
  const mRotate = document.getElementById('mRotate');
  const mDrop = document.getElementById('mDrop');
  const mHold = document.getElementById('mHold');
  
  mLeft.addEventListener('touchstart', e => { e.preventDefault(); playerMove(-1); });
  mRight.addEventListener('touchstart', e => { e.preventDefault(); playerMove(1); });
  mDown.addEventListener('touchstart', e => { e.preventDefault(); playerDrop(); });
  mRotate.addEventListener('touchstart', e => { e.preventDefault(); playerRotate(1); });
  mDrop.addEventListener('touchstart', e => { e.preventDefault(); playerHardDrop(); });
  mHold.addEventListener('touchstart', e => { e.preventDefault(); playerHold(); });

  // 同时也支持鼠标点击以便在电脑端测试排版
  mLeft.addEventListener('mousedown', () => playerMove(-1));
  mRight.addEventListener('mousedown', () => playerMove(1));
  mDown.addEventListener('mousedown', () => playerDrop());
  mRotate.addEventListener('mousedown', () => playerRotate(1));
  mDrop.addEventListener('mousedown', () => playerHardDrop());
  mHold.addEventListener('mousedown', () => playerHold());
};

setupMobileControls();

// 首次初始化绘制，显示底盘网格
draw();

// 启动渲染回路
requestAnimationFrame(update);
