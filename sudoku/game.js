/**
 * Neon Sudoku - 霓虹数独 游戏核心逻辑
 */

// 声音合成模块 (Web Audio API)
class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playTick() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playErase() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(150, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playError() {
    if (this.muted) return;
    this.init();
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(130, this.ctx.currentTime);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(135, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.25);
    osc2.stop(this.ctx.currentTime + 0.25);
  }

  playVictory() {
    if (this.muted) return;
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.1);
      
      gain.gain.setValueAtTime(0.0, this.ctx.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + i * 0.1 + 0.05);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.1 + 0.4);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(this.ctx.currentTime + i * 0.1);
      osc.stop(this.ctx.currentTime + i * 0.1 + 0.4);
    });
  }
}

const sfx = new SoundFX();

// 数独生成与校验核心算法
class SudokuGenerator {
  constructor() {
    this.board = Array(9).fill(null).map(() => Array(9).fill(0));
  }

  // 校验在 (row, col) 填入 val 是否合法
  isValid(board, row, col, val) {
    for (let i = 0; i < 9; i++) {
      if (board[row][i] === val && i !== col) return false;
      if (board[i][col] === val && i !== row) return false;
    }
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = startRow; r < startRow + 3; r++) {
      for (let c = startCol; c < startCol + 3; c++) {
        if (board[r][c] === val && (r !== row || c !== col)) return false;
      }
    }
    return true;
  }

  // 回溯求解/填满数独
  solve(board) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
          for (let val of numbers) {
            if (this.isValid(board, row, col, val)) {
              board[row][col] = val;
              if (this.solve(board)) return true;
              board[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  // 生成完整矩阵并根据难度挖空
  generate(difficulty) {
    this.board = Array(9).fill(null).map(() => Array(9).fill(0));
    this.solve(this.board);
    
    // 复制出解
    const solution = this.board.map(row => [...row]);
    
    // 设定挖空数量
    let cluesToKeep = 40;
    if (difficulty === 'easy') cluesToKeep = 42 + Math.floor(Math.random() * 5);
    else if (difficulty === 'medium') cluesToKeep = 32 + Math.floor(Math.random() * 5);
    else if (difficulty === 'hard') cluesToKeep = 24 + Math.floor(Math.random() * 4);
    
    const puzzle = this.board.map(row => [...row]);
    const cells = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        cells.push([r, c]);
      }
    }
    cells.sort(() => Math.random() - 0.5);
    
    const cellsToRemove = 81 - cluesToKeep;
    for (let i = 0; i < cellsToRemove; i++) {
      const [r, c] = cells[i];
      puzzle[r][c] = 0;
    }
    
    return { puzzle, solution };
  }
}

// 游戏逻辑控制
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let curDifficulty = 'easy';
let initialBoard = null; // 初始谜题 (0 表示空)
let currentBoard = null; // 当前盘面
let solutionBoard = null; // 满盘解法
let selectedCell = null; // {row, col}
let startTime = 0;
let timerInterval = null;
let secondsElapsed = 0;
let isVictory = false;
let conflicts = []; // 冲突的坐标列表 [{row, col}, ...]
let scanlineY = 0; // 通关彩虹扫描线

// 颜色常量 (同步自义 style.css)
const COLORS = {
  bg: '#040108',
  gridThin: 'rgba(157, 78, 221, 0.15)',
  gridThick: 'rgba(157, 78, 221, 0.55)',
  cyan: '#00f5d4',
  pink: '#ff007f',
  yellow: '#fee440',
  purple: '#9d4edd',
  textClue: '#f8f9fa',
  textUser: '#00f5d4',
  textError: '#ff007f',
  highlightBg: 'rgba(157, 78, 221, 0.07)',
  selectedBg: 'rgba(0, 245, 212, 0.15)',
  selectedBorder: '#00f5d4',
  conflictBg: 'rgba(255, 0, 127, 0.15)'
};

// 初始化数独盘面
function startNewGame(difficulty) {
  curDifficulty = difficulty;
  document.getElementById('levelVal').innerText = difficulty.toUpperCase();
  
  const gen = new SudokuGenerator();
  const data = gen.generate(difficulty);
  initialBoard = data.puzzle;
  currentBoard = data.puzzle.map(row => [...row]);
  solutionBoard = data.solution;
  
  selectedCell = null;
  isVictory = false;
  conflicts = [];
  secondsElapsed = 0;
  
  document.getElementById('startOverlay').classList.add('hidden');
  document.getElementById('victoryOverlay').classList.add('hidden');
  
  startTimer();
  checkConflicts();
  draw();
}

// 计时器控制
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  startTime = Date.now();
  timerInterval = setInterval(() => {
    if (isVictory) return;
    secondsElapsed = Math.floor((Date.now() - startTime) / 1000);
    const m = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
    const s = String(secondsElapsed % 60).padStart(2, '0');
    document.getElementById('timerVal').innerText = `${m}:${s}`;
  }, 500);
}

// 检测盘面上的全部冲突
function checkConflicts() {
  conflicts = [];
  const rows = Array(9).fill(null).map(() => []);
  const cols = Array(9).fill(null).map(() => []);
  const boxes = Array(9).fill(null).map(() => []);
  
  // 收集非空坐标
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = currentBoard[r][c];
      if (val !== 0) {
        rows[r].push({val, r, c});
        cols[c].push({val, r, c});
        const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
        boxes[b].push({val, r, c});
      }
    }
  }
  
  const addConflicts = (list) => {
    const counts = {};
    list.forEach(item => {
      counts[item.val] = (counts[item.val] || 0) + 1;
    });
    list.forEach(item => {
      if (counts[item.val] > 1) {
        if (!conflicts.some(cell => cell.row === item.r && cell.col === item.c)) {
          conflicts.push({row: item.r, col: item.c});
        }
      }
    });
  };
  
  for (let i = 0; i < 9; i++) {
    addConflicts(rows[i]);
    addConflicts(cols[i]);
    addConflicts(boxes[i]);
  }
}

// 录入数字
function inputNumber(num) {
  if (isVictory || !selectedCell) return;
  const { row, col } = selectedCell;
  
  // 初始数字不允许修改
  if (initialBoard[row][col] !== 0) return;
  
  if (num === 0) {
    // 擦除
    currentBoard[row][col] = 0;
    sfx.playErase();
  } else {
    currentBoard[row][col] = num;
    sfx.playTick();
  }
  
  checkConflicts();
  
  // 若有冲突音效警告
  if (num !== 0 && conflicts.some(c => c.row === row && c.col === col)) {
    sfx.playError();
  }
  
  checkVictoryCondition();
  draw();
}

// 胜利判定
function checkVictoryCondition() {
  // 是否填满
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (currentBoard[r][c] === 0) return;
    }
  }
  // 是否有冲突
  if (conflicts.length > 0) return;
  
  // 全部无误
  isVictory = true;
  clearInterval(timerInterval);
  sfx.playVictory();
  
  // 弹出通关遮罩
  setTimeout(() => {
    const m = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
    const s = String(secondsElapsed % 60).padStart(2, '0');
    document.getElementById('successTimeVal').innerText = `${m}:${s}`;
    document.getElementById('victoryOverlay').classList.remove('hidden');
  }, 1200);
}

// Canvas 绘制渲染
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const cellSize = canvas.width / 9;
  
  // 1. 绘制格背景与高亮
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const x = c * cellSize;
      const y = r * cellSize;
      
      let isSelected = selectedCell && selectedCell.row === r && selectedCell.col === c;
      let isSameGroup = selectedCell && (selectedCell.row === r || selectedCell.col === c || (Math.floor(selectedCell.row / 3) === Math.floor(r / 3) && Math.floor(selectedCell.col / 3) === Math.floor(c / 3)));
      let isConflict = conflicts.some(cell => cell.row === r && cell.col === c);
      
      if (isSelected) {
        ctx.fillStyle = COLORS.selectedBg;
        ctx.fillRect(x, y, cellSize, cellSize);
      } else if (isConflict) {
        ctx.fillStyle = COLORS.conflictBg;
        ctx.fillRect(x, y, cellSize, cellSize);
      } else if (isSameGroup) {
        ctx.fillStyle = COLORS.highlightBg;
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }
  }
  
  // 2. 绘制格线
  for (let i = 0; i <= 9; i++) {
    const pos = i * cellSize;
    
    // 横线
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(canvas.width, pos);
    ctx.strokeStyle = (i % 3 === 0) ? COLORS.gridThick : COLORS.gridThin;
    ctx.lineWidth = (i % 3 === 0) ? 3 : 1;
    ctx.stroke();
    
    // 竖线
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, canvas.height);
    ctx.strokeStyle = (i % 3 === 0) ? COLORS.gridThick : COLORS.gridThin;
    ctx.lineWidth = (i % 3 === 0) ? 3 : 1;
    ctx.stroke();
  }
  
  // 3. 绘制选中格霓虹外框
  if (selectedCell) {
    const x = selectedCell.col * cellSize;
    const y = selectedCell.row * cellSize;
    ctx.save();
    ctx.strokeStyle = COLORS.selectedBorder;
    ctx.lineWidth = 3;
    ctx.shadowColor = COLORS.selectedBorder;
    ctx.shadowBlur = 10;
    ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
    ctx.restore();
  }
  
  // 4. 绘制数字
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = currentBoard[r][c];
      if (val === 0) continue;
      
      const x = c * cellSize + cellSize / 2;
      const y = r * cellSize + cellSize / 2;
      
      const isClue = initialBoard[r][c] !== 0;
      const isConflict = conflicts.some(cell => cell.row === r && cell.col === c);
      
      ctx.save();
      
      if (isClue) {
        ctx.font = '700 22px "Orbitron", sans-serif';
        ctx.fillStyle = COLORS.textClue;
        ctx.shadowColor = COLORS.purple;
        ctx.shadowBlur = 4;
      } else {
        ctx.font = '700 22px "Orbitron", sans-serif';
        if (isConflict) {
          ctx.fillStyle = COLORS.textError;
          ctx.shadowColor = COLORS.pink;
          ctx.shadowBlur = 8;
        } else {
          ctx.fillStyle = COLORS.textUser;
          ctx.shadowColor = COLORS.cyan;
          ctx.shadowBlur = 8;
        }
      }
      
      ctx.fillText(val, x, y);
      ctx.restore();
    }
  }
  
  // 5. 若胜利，画霓虹扫频动画
  if (isVictory) {
    scanlineY = (scanlineY + 4) % canvas.height;
    
    // 绘制彩虹扫描线
    const gradient = ctx.createLinearGradient(0, scanlineY - 20, 0, scanlineY + 20);
    gradient.addColorStop(0, 'rgba(0, 245, 212, 0)');
    gradient.addColorStop(0.3, 'rgba(0, 245, 212, 0.4)');
    gradient.addColorStop(0.5, 'rgba(255, 0, 127, 0.7)');
    gradient.addColorStop(0.7, 'rgba(254, 228, 64, 0.4)');
    gradient.addColorStop(1, 'rgba(254, 228, 64, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, scanlineY - 20, canvas.width, 40);
    
    requestAnimationFrame(draw);
  }
}

// 事件监听
canvas.addEventListener('click', (e) => {
  if (isVictory) return;
  sfx.init(); // 激活音频上下文
  
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;
  
  const cellSize = canvas.width / 9;
  const col = Math.floor(clickX / cellSize);
  const row = Math.floor(clickY / cellSize);
  
  if (col >= 0 && col < 9 && row >= 0 && row < 9) {
    selectedCell = { row, col };
    sfx.playTick();
    draw();
  }
});

// 键盘监听
document.addEventListener('keydown', (e) => {
  if (isVictory || !selectedCell) return;
  
  if (e.key >= '1' && e.key <= '9') {
    inputNumber(parseInt(e.key));
  } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
    inputNumber(0);
  }
});

// 虚拟数字键
document.querySelectorAll('.num-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    sfx.init();
    const val = parseInt(btn.getAttribute('data-val'));
    inputNumber(val);
  });
});

// 功能按钮
document.getElementById('clearCellBtn').addEventListener('click', () => {
  sfx.init();
  inputNumber(0);
});

document.getElementById('resetLevelBtn').addEventListener('click', () => {
  if (!initialBoard) return;
  sfx.init();
  currentBoard = initialBoard.map(row => [...row]);
  conflicts = [];
  checkConflicts();
  draw();
  sfx.playErase();
});

// 静音开关
const muteBtn = document.getElementById('muteBtn');
muteBtn.addEventListener('click', () => {
  sfx.init();
  sfx.muted = !sfx.muted;
  muteBtn.classList.toggle('muted', sfx.muted);
});

// 难度选择
document.getElementById('easyBtn').addEventListener('click', () => startNewGame('easy'));
document.getElementById('mediumBtn').addEventListener('click', () => startNewGame('medium'));
document.getElementById('hardBtn').addEventListener('click', () => startNewGame('hard'));

// 再挑战一局
document.getElementById('restartBtn').addEventListener('click', () => {
  document.getElementById('victoryOverlay').classList.add('hidden');
  document.getElementById('startOverlay').classList.remove('hidden');
});

// 初始化背景渲染
draw();
