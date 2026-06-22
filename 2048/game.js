/**
 * 2048 游戏逻辑与合成音效
 */

// --- 8-Bit 电子音效合成器 ---
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

  // 划动音效：微小的白色噪音气流声
  playSlide() {
    this.playTone(400, 100, 0.08, 'triangle', 0.1);
  }

  // 合并音效：高昂的音调（按合并的数值层级决定频率）
  playMerge(value) {
    if (this.muted) return;
    this.init();
    try {
      // 算出 value 的 2 的幂次指数，如 4 对应 2，16 对应 4
      const exp = Math.log2(value);
      const baseFreq = 300 + exp * 80;
      
      // 播放双音节和弦
      this.playTone(baseFreq, baseFreq * 1.25, 0.12, 'sine', 0.15);
      setTimeout(() => {
        this.playTone(baseFreq * 1.5, baseFreq * 1.5, 0.15, 'sine', 0.12);
      }, 60);
    } catch (e) {}
  }

  // 胜利通关：大琶音
  playWin() {
    if (this.muted) return;
    this.init();
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5 - E5 - G5 - C6 - E6
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, freq, 0.2, 'square', 0.1);
        }, idx * 80);
      });
    } catch (e) {}
  }

  // 游戏失败：下落的长音
  playGameOver() {
    this.playTone(220, 50, 0.5, 'sawtooth', 0.2);
  }
}

const synth = new AudioSynth();

// --- 游戏核心数据结构 ---
const SIZE = 4;
let grid = []; // 4x4 矩阵，存储 Tile 对象或 null
let score = 0;
let bestScore = 0;
let gameOver = false;
let gameWon = false;
let keepGoing = false; // 达到 2048 后选择继续玩
let tileIdCounter = 0;

// --- DOM 元素 ---
const tileContainer = document.getElementById('tileContainer');
const scoreVal = document.getElementById('scoreVal');
const bestVal = document.getElementById('bestVal');
const muteBtn = document.getElementById('muteBtn');
const gameWinOverlay = document.getElementById('gameWinOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');

const keepGoingBtn = document.getElementById('keepGoingBtn');
const winRestartBtn = document.getElementById('winRestartBtn');
const restartBtn = document.getElementById('restartBtn');

// --- 逻辑初始化 ---
function initGame() {
  // 清理上一局的 Tile DOM
  tileContainer.innerHTML = '';
  grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  
  score = 0;
  gameOver = false;
  gameWon = false;
  keepGoing = false;
  
  updateScore(0);
  loadBestScore();
  
  // 隐藏遮罩
  gameWinOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  
  // 初始生成 2 个方块
  addRandomTile();
  addRandomTile();
}

// 加载历史最高纪录
function loadBestScore() {
  const saved = localStorage.getItem('neon_2048_best');
  bestScore = saved ? parseInt(saved, 10) : 0;
  bestVal.textContent = bestScore;
}

// 更新分数
function updateScore(amount) {
  score += amount;
  scoreVal.textContent = score;
  if (score > bestScore) {
    bestScore = score;
    bestVal.textContent = bestScore;
    localStorage.setItem('neon_2048_best', bestScore);
  }
}

// 寻找空闲格子
function getAvailableCells() {
  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!grid[r][c]) {
        cells.push({ r, c });
      }
    }
  }
  return cells;
}

// 随机添加一个方块 (90%概率为2, 10%概率为4)
function addRandomTile() {
  const cells = getAvailableCells();
  if (cells.length === 0) return;
  
  const { r, c } = cells[Math.floor(Math.random() * cells.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  
  const tile = {
    id: tileIdCounter++,
    row: r,
    col: c,
    value: value,
    mergedInto: null // 本轮合并的目标方块
  };
  
  // 创建 DOM 元素
  const el = document.createElement('div');
  el.classList.add('tile', `tile-${value}`, 'tile-new');
  el.textContent = value;
  
  // 布局计算：2.5% 作为 padding-compensation 加上 25% 单格步长
  el.style.left = `${c * 25 + 1.25}%`;
  el.style.top = `${r * 25 + 1.25}%`;
  
  tileContainer.appendChild(el);
  tile.element = el;
  
  grid[r][c] = tile;
}

// --- 渲染刷新渲染器 ---
function updateDOM() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const tile = grid[r][c];
      if (tile) {
        // 更新位置，利用 CSS transition 滑动过去
        tile.element.style.left = `${c * 25 + 1.25}%`;
        tile.element.style.top = `${r * 25 + 1.25}%`;
        
        // 移除上一轮的新生与合并动画标签
        tile.element.classList.remove('tile-new', 'tile-merged');
      }
    }
  }
}

// --- 滑动核心引擎算法 ---
function move(direction) {
  if (gameOver) return;
  synth.init();
  
  // 方向矢量映射
  // 0: 上, 1: 右, 2: 下, 3: 左
  const vectors = [
    { x: 0, y: -1 }, // 上
    { x: 1, y: 0 },  // 右
    { x: 0, y: 1 },  // 下
    { x: -1, y: 0 }  // 左
  ];
  
  const vector = vectors[direction];
  
  // 遍历顺序：为了确保滑动不重叠，我们沿着滑动方向的对侧向滑动方向遍历。
  // 例如向右滑动，先处理最右边的列。
  const buildTraversals = (vector) => {
    const traversals = { x: [], y: [] };
    for (let i = 0; i < SIZE; i++) {
      traversals.x.push(i);
      traversals.y.push(i);
    }
    
    // 如果向右滑动，从右往左遍历
    if (vector.x === 1) traversals.x.reverse();
    // 如果向下滑动，从下往上遍历
    if (vector.y === 1) traversals.y.reverse();
    
    return traversals;
  };
  
  const traversals = buildTraversals(vector);
  let moved = false;
  let scoreGained = 0;
  
  // 用于标记本轮是否播放了合并声，避免单步合并多块时声音重叠刺耳
  let hasPlayedMergeSound = false;
  
  // 遍历网格
  traversals.y.forEach(r => {
    traversals.x.forEach(c => {
      const tile = grid[r][c];
      if (tile) {
        // 寻找能滑行到的最远位置与下一个相撞位置
        const { farthest, next } = findFarthestPosition(r, c, vector);
        
        let merged = false;
        
        if (next) {
          const nextTile = grid[next.r][next.c];
          // 如果下一个格子有方块，且数值相等，且那个格子本轮还没合并过其他方块
          if (nextTile && nextTile.value === tile.value && !nextTile.mergedInto) {
            // 合并！
            merged = true;
            
            const newValue = tile.value * 2;
            
            // 物理移动当前方块到下一个方块上
            tile.row = next.r;
            tile.col = next.c;
            
            // 更新新值并标记目标合并
            nextTile.value = newValue;
            tile.mergedInto = nextTile;
            
            // 从当前位置网格中抹去
            grid[r][c] = null;
            
            // 顺便在 DOM 结构里体现合并
            const tempEl = tile.element;
            tempEl.style.left = `${next.c * 25 + 1.25}%`;
            tempEl.style.top = `${next.r * 25 + 1.25}%`;
            
            // 动画结束后销毁滑行过来的方块
            setTimeout(() => {
              if (tempEl.parentNode) {
                tempEl.parentNode.removeChild(tempEl);
              }
            }, 120);
            
            // 刷新目标方块显示
            const targetEl = nextTile.element;
            setTimeout(() => {
              targetEl.textContent = newValue;
              targetEl.className = `tile tile-${newValue} tile-merged`;
              
              // 适配高阶数字大小
              if (newValue >= 128 && newValue < 1024) targetEl.classList.add('size-128');
              else if (newValue === 1024) targetEl.classList.add('size-1024');
              else if (newValue === 2048) targetEl.classList.add('size-2048');
              else if (newValue > 2048) targetEl.classList.add('size-super');
            }, 110);
            
            scoreGained += newValue;
            moved = true;
            
            if (!hasPlayedMergeSound) {
              synth.playMerge(newValue);
              hasPlayedMergeSound = true;
            }
            
            // 检测是否达成 2048 胜利
            if (newValue === 2048 && !keepGoing && !gameWon) {
              gameWon = true;
              setTimeout(showWinScreen, 300);
            }
          }
        }
        
        if (!merged) {
          // 普通平移
          if (farthest.r !== r || farthest.c !== c) {
            grid[r][c] = null;
            grid[farthest.r][farthest.c] = tile;
            tile.row = farthest.r;
            tile.col = farthest.c;
            moved = true;
          }
        }
      }
    });
  });
  
  if (moved) {
    if (!hasPlayedMergeSound) {
      synth.playSlide();
    }
    updateDOM();
    updateScore(scoreGained);
    
    // 生成一个新随机方块
    setTimeout(addRandomTile, 120);
    
    // 检查是否挂掉
    setTimeout(checkGameOver, 200);
  }
}

// 寻找最远可滑动位置
function findFarthestPosition(r, c, vector) {
  let prev;
  let curr = { r, c };
  
  do {
    prev = curr;
    curr = { r: prev.r + vector.y, c: prev.c + vector.x };
  } while (curr.r >= 0 && curr.r < SIZE && curr.c >= 0 && curr.c < SIZE && !grid[curr.r][curr.c]);
  
  return {
    farthest: prev,
    next: (curr.r >= 0 && curr.r < SIZE && curr.c >= 0 && curr.c < SIZE) ? curr : null
  };
}

// 检测 GG 输掉游戏
function checkGameOver() {
  // 还有空格子
  if (getAvailableCells().length > 0) return;
  
  // 检查是否有相邻且数值相等的格子可以合并
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const tile = grid[r][c];
      if (tile) {
        // 检查右边
        if (c + 1 < SIZE && grid[r][c + 1] && grid[r][c + 1].value === tile.value) return;
        // 检查下边
        if (r + 1 < SIZE && grid[r + 1][c] && grid[r + 1][c].value === tile.value) return;
      }
    }
  }
  
  // 棋盘塞满且无法合并，凉凉
  gameOver = true;
  synth.playGameOver();
  gameOverOverlay.classList.remove('hidden');
}

// 展示胜利画面
function showWinScreen() {
  synth.playWin();
  gameWinOverlay.classList.remove('hidden');
}

// --- 事件监听与用户操作 ---

// 键盘控制
window.addEventListener('keydown', event => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
    event.preventDefault(); // 阻止滚动条滚动
  }
  
  if (gameOver) return;
  
  switch (event.key) {
    case 'w':
    case 'W':
    case 'ArrowUp':
      move(0); // 上
      break;
    case 'd':
    case 'D':
    case 'ArrowRight':
      move(1); // 右
      break;
    case 's':
    case 'S':
    case 'ArrowDown':
      move(2); // 下
      break;
    case 'a':
    case 'A':
    case 'ArrowLeft':
      move(3); // 左
      break;
  }
});

// 绑定按钮事件
restartBtn.addEventListener('click', initGame);
winRestartBtn.addEventListener('click', initGame);
keepGoingBtn.addEventListener('click', () => {
  keepGoing = true;
  gameWinOverlay.classList.add('hidden');
});

// 静音控制
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

// --- 移动端划手势识别 (Swipe) ---
const setupMobileSwipes = () => {
  const gameContainer = document.getElementById('gameContainer');
  let startX = 0;
  let startY = 0;
  
  gameContainer.addEventListener('touchstart', e => {
    // 只有一个手指时触发
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  
  gameContainer.addEventListener('touchend', e => {
    if (e.changedTouches.length !== 1) return;
    
    const diffX = e.changedTouches[0].clientX - startX;
    const diffY = e.changedTouches[0].clientY - startY;
    
    // 设置划动阈值，防止极轻微抖动误触
    const threshold = 45;
    
    if (Math.max(Math.abs(diffX), Math.abs(diffY)) < threshold) return;
    
    // 计算哪个方向上的划动位移大
    if (Math.abs(diffX) > Math.abs(diffY)) {
      // 左右划动
      if (diffX > 0) move(1); // 向右
      else move(3); // 向左
    } else {
      // 上下滑动
      if (diffY > 0) move(2); // 向下
      else move(0); // 向上
    }
  }, { passive: true });
};

setupMobileSwipes();

// 一键开箱
initGame();
