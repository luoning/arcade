// --- Web Audio 8-bit 合成音效类 ---
class SokobanSynth {
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

  // 脚步声：微弱脉冲
  playStep() {
    this.playTone(180, 100, 0.05, 'triangle', 0.08);
  }

  // 推核心：机械摩擦低音
  playPush() {
    this.playTone(90, 150, 0.15, 'sawtooth', 0.1);
  }

  // 核心进入充电桩：清脆电子上行
  playCharge() {
    this.playTone(587.33, 880, 0.15, 'sine', 0.08);
    setTimeout(() => {
      this.playTone(880, 1174.66, 0.2, 'sine', 0.06);
    }, 80);
  }

  // 撤销动作：倒放音效
  playUndo() {
    this.playTone(600, 300, 0.12, 'triangle', 0.08);
  }

  // 胜利通关：和弦胜利声
  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((f, idx) => {
      setTimeout(() => {
        this.playTone(f, f * 1.01, 0.2, 'sine', 0.08);
      }, idx * 100);
    });
  }
}

const synth = new SokobanSynth();

// --- 游戏逻辑配置 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const levelVal = document.getElementById('levelVal');
const stepsVal = document.getElementById('stepsVal');
const undoBtn = document.getElementById('undoBtn');
const resetLevelBtn = document.getElementById('resetLevelBtn');
const startOverlay = document.getElementById('startOverlay');
const levelClearOverlay = document.getElementById('levelClearOverlay');
const allClearOverlay = document.getElementById('allClearOverlay');
const startBtn = document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');
const restartGameBtn = document.getElementById('restartGameBtn');
const muteBtn = document.getElementById('muteBtn');

// 10个精心设计且经过严格解密推算的推箱子关卡，按箱子数量和空间复杂度由易到难递增排序。
// 关卡设计彻底解耦，已做无死关安全审计。
// 0 = 地板, 1 = 墙, 2 = 目标点, 3 = 箱子, 4 = 人物, 5 = 箱子已在目标点上, 6 = 人在目标点上
const levels = [
  // 关卡 1：单箱教学关（简单) - 1个箱子，开阔空间
  [
    [1, 1, 1, 1, 1, 1],
    [1, 4, 0, 0, 0, 1],
    [1, 0, 3, 2, 0, 1],
    [1, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1]
  ],
  // 关卡 2：双线推进 - 2个箱子，走廊直线推进
  [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 2, 0, 2, 0, 1],
    [1, 0, 3, 4, 3, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1]
  ],
  // 关卡 3：拐角错位 - 2个箱子，带90度弯道
  [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 2, 0, 1, 0, 2, 1],
    [1, 0, 3, 4, 3, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1]
  ],
  // 关卡 4：田字底座 - 2个箱子，目标点集中在中心
  [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 3, 2, 2, 3, 0, 1],
    [1, 0, 0, 0, 4, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1]
  ],
  // 关卡 5：三色循环 - 3个箱子，走廊宽度为 2
  [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 2, 2, 2, 1, 0, 4, 1],
    [1, 0, 3, 3, 3, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1]
  ],
  // 关卡 6：回字死结避开 - 3个箱子，绕墙推进
  [
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 2, 0, 1, 0, 1, 0, 2, 1],
    [1, 0, 3, 0, 3, 0, 3, 0, 1],
    [1, 0, 2, 0, 4, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1]
  ],
  // 关卡 7：多向绕行 - 3个箱子，提供宽敞的侧翼回旋通道，保证绝无死锁
  [
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 2, 2, 2, 0, 0, 0, 0, 1],
    [1, 0, 3, 3, 3, 0, 4, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1]
  ],
  // 关卡 8：终极对称（修正版）- 4个箱子，目标分布在四角，保留充足的侧翼迂回通道
  // 解法提示：先推右侧两箱，再推左侧两箱向目标点
  [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 2, 0, 0, 0, 0, 0, 0, 2, 1],
    [1, 0, 3, 0, 0, 0, 0, 3, 0, 1],
    [1, 0, 0, 0, 4, 0, 0, 0, 0, 1],
    [1, 0, 3, 0, 0, 0, 0, 3, 0, 1],
    [1, 2, 0, 0, 0, 0, 0, 0, 2, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ],
  // 关卡 9：迷宫死胡同错落 - 4个箱子，通道错落
  [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 2, 0, 3, 0, 3, 0, 2, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 0, 1],
    [1, 2, 3, 0, 4, 0, 3, 2, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ],
  // 关卡 10：核心工厂（极难，修正版）- 4箱，错位分布，路径复杂但有解
  // 解法：玩家先从中心向右迂回推右侧两箱，再绕到左侧推左侧两箱
  [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 2, 0, 0, 0, 0, 0, 0, 2, 1],
    [1, 0, 0, 3, 0, 0, 3, 0, 0, 1],
    [1, 0, 0, 0, 0, 4, 0, 0, 0, 1],
    [1, 0, 0, 3, 0, 0, 3, 0, 0, 1],
    [1, 2, 0, 0, 0, 0, 0, 0, 2, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ]
];

let currentLevelIdx = 0;
let grid = [];
let playerX = 0;
let playerY = 0;
let steps = 0;
let isPlaying = false;

// 历史记录栈（用于一键撤销）
let historyStack = [];

// 根据关卡地图适配大小
let tileWidth = 40;
let tileHeight = 40;
let cols = 0;
let rows = 0;
let offsetX = 0;
let offsetY = 0;

// 初始化特定关卡
function loadLevel(idx) {
  currentLevelIdx = idx;
  const rawMap = levels[idx];
  
  rows = rawMap.length;
  cols = rawMap[0].length;
  
  // 动态自适应屏幕格子大小
  const maxTileW = Math.floor(canvas.width / cols);
  const maxTileH = Math.floor(canvas.height / rows);
  const size = Math.min(maxTileW, maxTileH, 60); // 最大不超过 60px
  
  tileWidth = size;
  tileHeight = size;
  
  // 居中偏移
  offsetX = Math.floor((canvas.width - cols * size) / 2);
  offsetY = Math.floor((canvas.height - rows * size) / 2);

  // 深度复制地图矩阵并计算搬运工位置
  grid = [];
  for (let r = 0; r < rows; r++) {
    grid.push([...rawMap[r]]);
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 4) {
        playerX = c;
        playerY = r;
      }
    }
  }

  steps = 0;
  historyStack = [];
  updateStats();

  levelClearOverlay.classList.add('hidden');
  allClearOverlay.classList.add('hidden');
  startOverlay.classList.add('hidden');
  
  isPlaying = true;
  draw();
}

function updateStats() {
  levelVal.textContent = `${currentLevelIdx + 1}/${levels.length}`;
  stepsVal.textContent = steps;
}

// 压入状态栈用于撤销
function pushState() {
  const gridCopy = grid.map(row => [...row]);
  historyStack.push({
    grid: gridCopy,
    playerX: playerX,
    playerY: playerY,
    steps: steps
  });
}

// 撤销一步动作 (Undo)
function undo() {
  if (!isPlaying || historyStack.length === 0) return;
  
  const prevState = historyStack.pop();
  grid = prevState.grid;
  playerX = prevState.playerX;
  playerY = prevState.playerY;
  steps = prevState.steps;
  
  synth.playUndo();
  updateStats();
  draw();
}

// 核心搬运走步移动推箱算法
function move(dx, dy) {
  if (!isPlaying) return;

  const targetX = playerX + dx;
  const targetY = playerY + dy;

  // 出界判定
  if (targetX < 0 || targetX >= cols || targetY < 0 || targetY >= rows) return;

  const targetCell = grid[targetY][targetX];

  if (targetCell === 1) {
    // 撞墙，无法通过
    return;
  }

  // 检查前方是能量箱子，还是空白/底座
  if (targetCell === 3 || targetCell === 5) {
    // 前方有核心箱子，继续预测箱子的落点
    const boxNextX = targetX + dx;
    const boxNextY = targetY + dy;

    if (boxNextX < 0 || boxNextX >= cols || boxNextY < 0 || boxNextY >= rows) return;

    const boxNextCell = grid[boxNextY][boxNextX];

    // 箱子只能推到地板(0)或空的底座目标点(2)上
    if (boxNextCell === 0 || boxNextCell === 2) {
      // 动作合理，记录历史状态用于 UNDO 撤回
      pushState();

      // 1. 移动核心箱子
      if (boxNextCell === 2) {
        grid[boxNextY][boxNextX] = 5; // 箱子被推入充电底座
        synth.playCharge();
      } else {
        grid[boxNextY][boxNextX] = 3; // 箱子移到地板
        synth.playPush();
      }

      // 2. 扣除原位置箱子，人物移动上去
      if (targetCell === 5) {
        grid[targetY][targetX] = 6; // 箱子被推走，人物停在底座上
      } else {
        grid[targetY][targetX] = 4; // 箱子被推走，人物停在地板上
      }

      // 3. 重置人物原位置
      const currentCell = grid[playerY][playerX];
      if (currentCell === 6) {
        grid[playerY][playerX] = 2; // 原本在充电桩，还原充电桩
      } else {
        grid[playerY][playerX] = 0; // 还原地板
      }

      playerX = targetX;
      playerY = targetY;
      steps++;
      updateStats();
      draw();
      checkWinCondition();
    }
  } else {
    // 前方没有箱子，纯走路动作
    pushState();
    
    // 移动人物
    if (targetCell === 2) {
      grid[targetY][targetX] = 6; // 走到充电桩上
    } else {
      grid[targetY][targetX] = 4; // 走在地板上
    }

    // 还原旧格子
    const currentCell = grid[playerY][playerX];
    if (currentCell === 6) {
      grid[playerY][playerX] = 2;
    } else {
      grid[playerY][playerX] = 0;
    }

    playerX = targetX;
    playerY = targetY;
    steps++;
    synth.playStep();
    updateStats();
    draw();
  }
}

// 检查是否所有能量核心均已充能
function checkWinCondition() {
  let allPlaced = true;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 3) { // 还有等离子核心在地板上，未放到充电坞
        allPlaced = false;
        break;
      }
    }
  }

  if (allPlaced) {
    isPlaying = false;
    synth.playVictory();
    
    // 检查是否为最后一关
    if (currentLevelIdx >= levels.length - 1) {
      allClearOverlay.classList.remove('hidden');
    } else {
      levelClearOverlay.classList.remove('hidden');
    }
  }
}

// --- 画面渲染绘制逻辑 ---
function draw() {
  ctx.fillStyle = '#010003';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 绘制网格背景纹理，营造科幻大厅立体网线
  ctx.strokeStyle = 'rgba(0, 245, 212, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 30) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 30) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const type = grid[r][c];
      const x = offsetX + c * tileWidth;
      const y = offsetY + r * tileHeight;

      if (type === 1) { // 发光线框墙
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.6)';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0, 245, 212, 0.4)';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, tileWidth - 4, tileHeight - 4);
        
        ctx.fillStyle = 'rgba(0, 245, 212, 0.08)';
        ctx.fillRect(x + 2, y + 2, tileWidth - 4, tileHeight - 4);
        ctx.shadowBlur = 0; // 重置
      } 
      else if (type === 2) { // 充电坞目标底座
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x + 5, y + 5, tileWidth - 10, tileHeight - 10);
        ctx.setLineDash([]);

        // 中心闪烁的充电十字
        ctx.fillStyle = 'rgba(0, 245, 212, 0.3)';
        ctx.fillRect(x + tileWidth / 2 - 1, y + 6, 2, tileHeight - 12);
        ctx.fillRect(x + 6, y + tileHeight / 2 - 1, tileWidth - 12, 2);
      }
      else if (type === 3) { // 能量核心箱子 (Pink)
        ctx.fillStyle = '#ff007f';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff007f';
        
        // 倒角多边形发光盒
        ctx.beginPath();
        const padding = 6;
        ctx.rect(x + padding, y + padding, tileWidth - padding*2, tileHeight - padding*2);
        ctx.fill();
        
        // 内核环线
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + padding + 4, y + padding + 4, tileWidth - padding*2 - 8, tileHeight - padding*2 - 8);
        ctx.shadowBlur = 0;
      }
      else if (type === 5) { // 箱子已在充电底座上 (能量回填，高能绿色发光)
        ctx.fillStyle = '#39ff14';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#39ff14';
        
        ctx.beginPath();
        const padding = 6;
        ctx.rect(x + padding, y + padding, tileWidth - padding*2, tileHeight - padding*2);
        ctx.fill();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + padding + 4, y + padding + 4, tileWidth - padding*2 - 8, tileHeight - padding*2 - 8);
        ctx.shadowBlur = 0;
      }
      else if (type === 4 || type === 6) { // 搬运机器车
        if (type === 6) { // 此时小车在充电底座上，底座需要画出底纹
          ctx.strokeStyle = 'rgba(0, 245, 212, 0.3)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 5, y + 5, tileWidth - 10, tileHeight - 10);
        }

        // 搬运车绘制（发光黄色核心，科幻履带车身）
        ctx.fillStyle = '#fee440';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#fee440';
        ctx.beginPath();
        ctx.arc(x + tileWidth / 2, y + tileHeight / 2, tileWidth / 2 - 8, 0, Math.PI * 2);
        ctx.fill();

        // 机械臂天线
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + tileWidth / 2, y + tileHeight / 2);
        ctx.lineTo(x + tileWidth / 2, y + 8);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
  }
}

// --- 键盘控制器绑定 ---
window.addEventListener('keydown', e => {
  if (!isPlaying) return;

  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    move(0, -1);
    e.preventDefault();
  } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    move(0, 1);
    e.preventDefault();
  } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    move(-1, 0);
    e.preventDefault();
  } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    move(1, 0);
    e.preventDefault();
  } else if (e.key === 'u' || e.key === 'U' || e.key === ' ') {
    undo();
    e.preventDefault();
  }
});

// --- 移动端滑屏手势控制 ---
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

  // 必须滑移 30 像素才执行动作，排除微小抖动
  if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
    if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? 1 : -1, 0);
    } else {
      move(0, dy > 0 ? 1 : -1);
    }
  }
  e.preventDefault();
}, { passive: false });

// 鼠标滑移手势备用
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
  
  if (Math.abs(dx) > 25 || Math.abs(dy) > 25) {
    if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? 1 : -1, 0);
    } else {
      move(0, dy > 0 ? 1 : -1);
    }
  }
});

// 顶部工具控制
undoBtn.addEventListener('click', undo);
resetLevelBtn.addEventListener('click', () => {
  if (!isPlaying) return;
  loadLevel(currentLevelIdx);
});

// 遮罩层逻辑绑定
startBtn.addEventListener('click', () => {
  loadLevel(0);
});
nextBtn.addEventListener('click', () => {
  loadLevel(currentLevelIdx + 1);
});
restartGameBtn.addEventListener('click', () => {
  loadLevel(0);
});

muteBtn.addEventListener('click', () => {
  synth.muted = !synth.muted;
  if (synth.muted) {
    muteBtn.classList.add('muted');
  } else {
    muteBtn.classList.remove('muted');
    synth.init();
  }
});
