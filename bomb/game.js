/**
 * Bomb - 霓虹扫雷核心逻辑与合成音效
 */

// --- 8-Bit 扫雷音效合成器 ---
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

  // 点击安全格子：清脆的木质敲击声
  playClick() {
    this.playTone(1000, 300, 0.05, 'triangle', 0.2);
  }

  // 插旗/拔旗：短促的卡嗒声
  playFlag() {
    this.playTone(600, 800, 0.06, 'sine', 0.1);
  }

  // 胜利：高亢的电子大琶音
  playWin() {
    if (this.muted) return;
    this.init();
    try {
      const scale = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      scale.forEach((freq, index) => {
        setTimeout(() => {
          this.playTone(freq, freq * 1.05, 0.15, 'square', 0.12);
        }, index * 100);
      });
    } catch (e) {}
  }

  // 踩雷爆炸：利用白噪音产生逼真的爆破声
  playExplosion() {
    if (this.muted) return;
    this.init();
    try {
      const bufferSize = this.ctx.sampleRate * 0.8; // 0.8秒
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // 生成白噪音数据
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;
      
      // 建立低通滤波器，过滤掉尖锐高频，让爆炸声低沉厚重
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.8);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);
      
      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      noiseNode.start();
    } catch (e) {
      // 降级使用普通锯齿波合成低频
      this.playTone(200, 20, 0.6, 'sawtooth', 0.3);
    }
  }
}

const synth = new AudioSynth();

// --- 难度配置 ---
const CONFIGS = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 }
};

let currentLevel = 'easy';
let rows = CONFIGS.easy.rows;
let cols = CONFIGS.easy.cols;
let totalMines = CONFIGS.easy.mines;

// --- 游戏状态变量 ---
let board = [];
let firstClick = true;
let isGameOver = false;
let isGameWon = false;
let flagsCount = 0;

let timerInterval = null;
let secondsElapsed = 0;

// --- DOM 元素 ---
const mineBoard = document.getElementById('mineBoard');
const minesCountEl = document.getElementById('minesCount');
const gameTimerEl = document.getElementById('gameTimer');
const statusFace = document.getElementById('statusFace');
const muteBtn = document.getElementById('muteBtn');

// SVG 旗子与地雷图标模板
const FLAG_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>`;
const MINE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="4.22" x2="19.78" y2="5.64"></line></svg>`;

// --- 游戏初始化 ---
function initGame() {
  // 停止计时器
  clearInterval(timerInterval);
  timerInterval = null;
  secondsElapsed = 0;
  gameTimerEl.textContent = '000';
  
  firstClick = true;
  isGameOver = false;
  isGameWon = false;
  flagsCount = 0;
  statusFace.textContent = ':-)';
  updateFlagsUI();
  
  document.body.classList.remove('shake');
  
  // 重置棋盘网格
  rows = CONFIGS[currentLevel].rows;
  cols = CONFIGS[currentLevel].cols;
  totalMines = CONFIGS[currentLevel].mines;
  
  // 设置 Grid 样式
  mineBoard.style.gridTemplateColumns = `repeat(${cols}, 28px)`;
  
  board = [];
  mineBoard.innerHTML = '';
  
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const cell = {
        r,
        c,
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        neighborMines: 0
      };
      
      const cellDiv = document.createElement('div');
      cellDiv.classList.add('mine-cell', 'unrevealed');
      cellDiv.dataset.row = r;
      cellDiv.dataset.col = c;
      cellDiv.setAttribute('role', 'gridcell');
      
      // 绑定鼠标与移动端长按事件
      bindCellEvents(cellDiv, cell);
      
      mineBoard.appendChild(cellDiv);
      cell.element = cellDiv;
      row.push(cell);
    }
    board.push(row);
  }
}

// --- 事件绑定逻辑 ---
function bindCellEvents(el, cell) {
  let touchTimeout = null;
  let hasMoved = false;

  // 阻止默认右键菜单
  el.addEventListener('contextmenu', e => {
    e.preventDefault();
    handleRightClick(cell);
  });

  // 左键点击
  el.addEventListener('click', e => {
    e.preventDefault();
    handleLeftClick(cell);
  });

  // 移动端模拟右键：长按 400ms
  el.addEventListener('touchstart', e => {
    hasMoved = false;
    touchTimeout = setTimeout(() => {
      handleRightClick(cell);
      hasMoved = true; // 标记已触发长按，防止触发随后的 click
    }, 400);
  });

  el.addEventListener('touchmove', () => {
    clearTimeout(touchTimeout);
  });

  el.addEventListener('touchend', e => {
    clearTimeout(touchTimeout);
    if (hasMoved) {
      e.preventDefault(); // 阻止虚拟点击
    }
  });

  // 双击已数字格子快速排雷
  el.addEventListener('dblclick', e => {
    e.preventDefault();
    handleDblClick(cell);
  });
}

// --- 核心布雷逻辑（首次点击安全） ---
function generateMines(firstRow, firstCol) {
  let minesPlaced = 0;
  
  while (minesPlaced < totalMines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    
    // 不能在已布雷位置
    if (board[r][c].isMine) continue;
    
    // 首次点击格子及其周围 8 格禁止有雷
    const isFirstClickZone = Math.abs(r - firstRow) <= 1 && Math.abs(c - firstCol) <= 1;
    if (isFirstClickZone) continue;
    
    board[r][c].isMine = true;
    minesPlaced++;
  }
  
  // 计算周围雷数
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!board[r][c].isMine) {
        board[r][c].neighborMines = getNeighbors(r, c).filter(n => n.isMine).length;
      }
    }
  }
}

// 获取周围 8 个邻居格子
function getNeighbors(r, c) {
  const neighbors = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        neighbors.push(board[nr][nc]);
      }
    }
  }
  return neighbors;
}

// --- 操作处理 ---

// 启动计时器
function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    secondsElapsed++;
    if (secondsElapsed > 999) secondsElapsed = 999;
    gameTimerEl.textContent = String(secondsElapsed).padStart(3, '0');
  }, 1000);
}

// 旗子数UI更新
function updateFlagsUI() {
  const diff = totalMines - flagsCount;
  minesCountEl.textContent = String(Math.max(0, diff)).padStart(3, '0');
}

// 左键翻开
function handleLeftClick(cell) {
  if (isGameOver || isGameWon || cell.isRevealed || cell.isFlagged) return;
  
  synth.init();
  
  // 首次点击安全布雷
  if (firstClick) {
    firstClick = false;
    generateMines(cell.r, cell.c);
    startTimer();
  }
  
  // 踩雷判断
  if (cell.isMine) {
    triggerExplosion(cell);
    return;
  }
  
  revealCell(cell);
  synth.playClick();
  
  checkWinCondition();
}

// 递归翻开空白格子
function revealCell(cell) {
  if (cell.isRevealed || cell.isFlagged) return;
  
  cell.isRevealed = true;
  const el = cell.element;
  
  el.classList.remove('unrevealed');
  el.classList.add('revealed');
  
  if (cell.neighborMines > 0) {
    el.textContent = cell.neighborMines;
    el.classList.add(`c-${cell.neighborMines}`);
  } else {
    // 递归展开邻居
    getNeighbors(cell.r, cell.c).forEach(n => revealCell(n));
  }
}

// 右键/长按插旗
function handleRightClick(cell) {
  if (isGameOver || isGameWon || cell.isRevealed) return;
  
  synth.init();
  
  if (firstClick) {
    // 首次操作也可以是插旗，但不要产生雷（等真正左键点的时候才布雷）
    startTimer();
  }
  
  cell.isFlagged = !cell.isFlagged;
  const el = cell.element;
  
  if (cell.isFlagged) {
    el.classList.add('flagged');
    el.innerHTML = FLAG_SVG;
    flagsCount++;
  } else {
    el.classList.remove('flagged');
    el.innerHTML = '';
    flagsCount--;
  }
  
  synth.playFlag();
  updateFlagsUI();
}

// 双击数字块辅助开区
function handleDblClick(cell) {
  if (isGameOver || isGameWon || !cell.isRevealed || cell.neighborMines === 0) return;
  
  const neighbors = getNeighbors(cell.r, cell.c);
  const flaggedCount = neighbors.filter(n => n.isFlagged).length;
  
  // 如果周围插旗数跟当前格数字完全一致，则自动翻开剩下没有插旗的邻居
  if (flaggedCount === cell.neighborMines) {
    neighbors.forEach(n => {
      if (!n.isRevealed && !n.isFlagged) {
        if (n.isMine) {
          triggerExplosion(n);
        } else {
          revealCell(n);
          synth.playClick();
        }
      }
    });
    checkWinCondition();
  }
}

// --- 终局处理 ---

// 踩雷 GG
function triggerExplosion(clickedCell) {
  isGameOver = true;
  clearInterval(timerInterval);
  statusFace.textContent = 'x-(';
  
  synth.playExplosion();
  
  // 屏幕抖动反馈
  document.body.classList.add('shake');
  
  // 翻开所有的地雷并展示
  board.forEach(row => {
    row.forEach(cell => {
      if (cell.isMine) {
        cell.element.classList.remove('unrevealed');
        cell.element.classList.add('revealed', 'mine');
        cell.element.innerHTML = MINE_SVG;
      }
    });
  });
}

// 胜利检测
function checkWinCondition() {
  let unrevealedSafeCells = 0;
  
  board.forEach(row => {
    row.forEach(cell => {
      if (!cell.isMine && !cell.isRevealed) {
        unrevealedSafeCells++;
      }
    });
  });
  
  // 已经没有安全的格子未翻开
  if (unrevealedSafeCells === 0) {
    isGameWon = true;
    clearInterval(timerInterval);
    statusFace.textContent = 'B-)';
    
    synth.playWin();
    
    // 将剩余未插旗的地雷自动打上标记并变色
    board.forEach(row => {
      row.forEach(cell => {
        if (cell.isMine) {
          cell.element.classList.remove('unrevealed');
          cell.element.classList.add('won-mine');
          cell.element.innerHTML = MINE_SVG;
        }
      });
    });
  }
}

// --- 选项控制绑定 ---

// 难度切换
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    const level = e.target.dataset.level;
    if (level === currentLevel) return;
    
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    
    currentLevel = level;
    initGame();
  });
});

// 笑脸重启
statusFace.addEventListener('click', initGame);

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
    synth.playTone(600, 600, 0.05); // 哔声反馈
  }
});

// 首次开箱
initGame();
