/**
 * 赛博五子棋 (Cyber Gomoku) 核心推演与高能 AI
 */

// --- 8-Bit 声音合成引擎 ---
class GomokuSFX {
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

  playTone(freqStart, freqEnd, duration, type = 'sine', gainVal = 0.12) {
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

  // 落子音效：短促的低频三角波木石声
  playPlace() {
    this.playTone(280, 120, 0.06, 'triangle', 0.2);
  }

  // 危机提示（活三/冲四）：高频刺耳警报
  playAlert() {
    this.playTone(880, 880, 0.08, 'square', 0.08);
    setTimeout(() => {
      this.playTone(1100, 1100, 0.08, 'square', 0.08);
    }, 70);
  }

  // 连五子通关大胜利和弦
  playVictory() {
    const tones = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // C5-D5-E5-G5-A5-C6
    tones.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, freq * 1.01, 0.2, 'sine', 0.12);
      }, idx * 90);
    });
  }
}

const sfx = new GomokuSFX();

// --- 游戏主要状态 ---
const BOARD_SIZE = 15;
let gameState = {
  board: [],             // 15x15 矩阵, 0: 空, 1: 黑子(玩家1/玩家), 2: 白子(玩家2/AI)
  turn: 1,               // 1: 黑, 2: 白
  steps: 0,
  mode: 'vs_ai',         // 'vs_ai' 或 'pvp'
  lastMove: null,        // {r, c}
  isGameOver: false
};

// --- DOM 节点绑定 ---
const boardGridBg = document.getElementById('boardGridBg');
const boardGrid = document.getElementById('boardGrid');
const turnVal = document.getElementById('turnVal');
const stepsVal = document.getElementById('stepsVal');
const modeSelect = document.getElementById('modeSelect');
const resetBtn = document.getElementById('resetBtn');
const muteBtn = document.getElementById('muteBtn');
const gameoverOverlay = document.getElementById('gameoverOverlay');
const winText = document.getElementById('winText');
const winDesc = document.getElementById('winDesc');
const restartBtn = document.getElementById('restartBtn');

// --- 游戏主控逻辑 ---

function initGame() {
  gameState.board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
  gameState.turn = 1;
  gameState.steps = 0;
  gameState.lastMove = null;
  gameState.isGameOver = false;

  turnVal.textContent = 'BLACK';
  turnVal.style.color = 'var(--pink-neon)';
  turnVal.style.textShadow = '0 0 8px rgba(255, 0, 127, 0.4)';
  stepsVal.textContent = '0';

  gameoverOverlay.classList.add('hidden');

  renderBackgroundGrid();
  renderBoard();
}

// 渲染棋盘背景线（避免 CSS 缩放锯齿偏差）
function renderBackgroundGrid() {
  boardGridBg.innerHTML = '';
  const containerW = boardGridBg.clientWidth;
  const step = containerW / BOARD_SIZE;

  // 横线
  for (let i = 0; i < BOARD_SIZE; i++) {
    const line = document.createElement('div');
    line.classList.add('bg-line', 'bg-line-h');
    line.style.top = `${(i + 0.5) * step}px`;
    boardGridBg.appendChild(line);
  }

  // 竖线
  for (let i = 0; i < BOARD_SIZE; i++) {
    const line = document.createElement('div');
    line.classList.add('bg-line', 'bg-line-v');
    line.style.left = `${(i + 0.5) * step}px`;
    boardGridBg.appendChild(line);
  }

  // 星位（天元等 5 点）
  const stars = [
    { r: 3, c: 3 }, { r: 3, c: 11 },
    { r: 7, c: 7 }, // 天元
    { r: 11, c: 3 }, { r: 11, c: 11 }
  ];
  stars.forEach(pt => {
    const star = document.createElement('div');
    star.classList.add('star-point');
    star.style.top = `${(pt.r + 0.5) * step}px`;
    star.style.left = `${(pt.c + 0.5) * step}px`;
    boardGridBg.appendChild(star);
  });
}

function renderBoard() {
  boardGrid.innerHTML = '';
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = document.createElement('div');
      cell.classList.add('board-intersection');
      cell.dataset.r = r;
      cell.dataset.c = c;

      const piece = gameState.board[r][c];

      // 预览子
      const preview = document.createElement('div');
      preview.classList.add('preview-piece');
      if (gameState.turn === 1) {
        preview.classList.add('preview-black');
      } else {
        preview.classList.add('preview-white');
      }
      cell.appendChild(preview);

      if (piece !== 0) {
        const pieceEl = document.createElement('div');
        pieceEl.classList.add('gomoku-piece');
        pieceEl.classList.add(piece === 1 ? 'piece-black' : 'piece-white');
        cell.appendChild(pieceEl);

        // 最后一手高亮指示器
        if (gameState.lastMove && gameState.lastMove.r === r && gameState.lastMove.c === c) {
          const indicator = document.createElement('div');
          indicator.classList.add('last-move-indicator');
          cell.appendChild(indicator);
        }
      }

      cell.onclick = () => handleCellClick(r, c);
      boardGrid.appendChild(cell);
    }
  }
}

// 触发波纹扩散动画
function triggerRipple(r, c) {
  const container = document.getElementById('boardContainer');
  const ripple = document.createElement('div');
  ripple.classList.add('piece-ripple');

  const step = container.clientWidth / BOARD_SIZE;
  const left = (c + 0.5) * step;
  const top = (r + 0.5) * step;

  ripple.style.left = `${left}px`;
  ripple.style.top = `${top}px`;
  ripple.style.transform = 'translate(-50%, -50%)';

  container.appendChild(ripple);
  setTimeout(() => ripple.remove(), 400);
}

function handleCellClick(r, c) {
  if (gameState.isGameOver) return;
  if (gameState.mode === 'vs_ai' && gameState.turn === 2) return; // AI推演锁死玩家

  if (gameState.board[r][c] !== 0) return; // 已有棋子阻截

  executeMove(r, c);
}

function executeMove(r, c) {
  sfx.playPlace();
  triggerRipple(r, c);

  gameState.board[r][c] = gameState.turn;
  gameState.lastMove = { r, c };
  gameState.steps++;
  stepsVal.textContent = gameState.steps;

  // 检测连线胜利
  const winPieces = checkWin(r, c, gameState.turn);
  if (winPieces) {
    gameState.isGameOver = true;
    sfx.playVictory();
    
    // 给获胜的连线子加动画
    renderBoard();
    highlightWinningPieces(winPieces);

    const winnerText = gameState.turn === 1 ? '黑子 (BLACK)' : '白子 (WHITE)';
    winText.textContent = `${winnerText} 胜出`;
    winDesc.textContent = `历经 ${gameState.steps} 步精彩绝伦的推演，五子连珠，达成大捷！`;
    
    // 成就判定
    if (gameState.mode === 'vs_ai' && gameState.turn === 1) {
      window.parent.postMessage({ type: 'unlock_achievement', achievement: 'gomoku_win' }, '*');
      if (gameState.steps <= 12) { // 极速战胜 AI
        window.parent.postMessage({ type: 'unlock_achievement', achievement: 'gomoku_perfect' }, '*');
      }
    }
    
    setTimeout(() => {
      gameoverOverlay.classList.remove('hidden');
    }, 600);
    return;
  }

  // 翻转回合
  gameState.turn = gameState.turn === 1 ? 2 : 1;
  if (gameState.turn === 1) {
    turnVal.textContent = 'BLACK';
    turnVal.style.color = 'var(--pink-neon)';
    turnVal.style.textShadow = '0 0 8px rgba(255, 0, 127, 0.4)';
  } else {
    turnVal.textContent = 'WHITE';
    turnVal.style.color = 'var(--cyan-neon)';
    turnVal.style.textShadow = '0 0 8px rgba(0, 245, 212, 0.4)';
  }

  // 检查是否在危险局势（四连/活三）给警报
  if (detectDanger(r, c, gameState.board[r][c])) {
    sfx.playAlert();
  }

  renderBoard();

  // AI 回合推演
  if (gameState.mode === 'vs_ai' && gameState.turn === 2 && !gameState.isGameOver) {
    setTimeout(triggerAIMove, 350);
  }
}

// 获胜五子连线高闪
function highlightWinningPieces(pieces) {
  pieces.forEach(pt => {
    const cell = boardGrid.querySelector(`[data-r="${pt.r}"][data-c="${pt.c}"]`);
    if (cell) {
      const pEl = cell.querySelector('.gomoku-piece');
      if (pEl) pEl.classList.add('piece-winning');
    }
  });
}

// 胜负检测 (8方向)
function checkWin(r, c, color) {
  const dirs = [
    [0, 1],   // 横
    [1, 0],   // 竖
    [1, 1],   // 右下斜
    [1, -1]   // 左下斜
  ];

  for (let i = 0; i < dirs.length; i++) {
    const [dr, dc] = dirs[i];
    const winning = [{ r, c }];

    // 正向扫描
    let step = 1;
    while (true) {
      const nr = r + dr * step;
      const nc = c + dc * step;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && gameState.board[nr][nc] === color) {
        winning.push({ r: nr, c: nc });
        step++;
      } else {
        break;
      }
    }

    // 反向扫描
    step = 1;
    while (true) {
      const nr = r - dr * step;
      const nc = c - dc * step;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && gameState.board[nr][nc] === color) {
        winning.push({ r: nr, c: nc });
        step++;
      } else {
        break;
      }
    }

    if (winning.length >= 5) {
      return winning;
    }
  }
  return null;
}

// 检测是否有即将获胜的连珠，供警报发声
function detectDanger(r, c, color) {
  // 检查以该子为起点的横竖斜方向是否有对方四连或空心活三
  const dirs = [[0,1], [1,0], [1,1], [1,-1]];
  for (let i = 0; i < dirs.length; i++) {
    const [dr, dc] = dirs[i];
    let count = 1;
    // 正向
    let step = 1;
    while (r+dr*step>=0 && r+dr*step<BOARD_SIZE && c+dc*step>=0 && c+dc*step<BOARD_SIZE && gameState.board[r+dr*step][c+dc*step] === color) {
      count++; step++;
    }
    // 反向
    step = 1;
    while (r-dr*step>=0 && r-dr*step<BOARD_SIZE && c-dc*step>=0 && c-dc*step<BOARD_SIZE && gameState.board[r-dr*step][c-dc*step] === color) {
      count++; step++;
    }
    if (count >= 4) return true; // 有冲四或活四风险
  }
  return false;
}

// --- 智能估值权重五子棋 AI 决策 ---

function triggerAIMove() {
  if (gameState.isGameOver) return;

  const best = getBestMove();
  if (best) {
    executeMove(best.r, best.c);
  }
}

// 经典贪心局部评估函数：寻找黑白双方最高估分点
function getBestMove() {
  let maxScore = -1;
  let bestPoint = null;

  // 1. 如果是第一步，白棋直接落在天元（最有利格）
  if (gameState.steps === 1 && gameState.board[7][7] === 0) {
    return { r: 7, c: 7 };
  }

  // 2. 遍历全盘空位置进行双向打分（攻击打分与防守拦截打分）
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (gameState.board[r][c] !== 0) continue;

      // 评估 AI (白, 2) 进攻得分
      const attackScore = evaluatePoint(r, c, 2);
      // 评估 拦截玩家 (黑, 1) 防守得分
      const defendScore = evaluatePoint(r, c, 1);

      // 防守阻碍权重略微大于进攻权重，优先堵防
      const totalScore = attackScore + defendScore * 1.1;

      if (totalScore > maxScore) {
        maxScore = totalScore;
        bestPoint = { r, c };
      }
    }
  }

  // 3. 垫底保护
  if (!bestPoint) {
    const empties = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (gameState.board[r][c] === 0) empties.push({ r, c });
      }
    }
    bestPoint = empties[Math.floor(Math.random() * empties.length)];
  }

  return bestPoint;
}

// 五子棋棋型打分器
function evaluatePoint(r, c, color) {
  const enemyColor = color === 1 ? 2 : 1;
  const dirs = [
    [0, 1],   // 横
    [1, 0],   // 竖
    [1, 1],   // 斜
    [1, -1]
  ];
  let totalScore = 0;

  for (let i = 0; i < dirs.length; i++) {
    const [dr, dc] = dirs[i];
    let count = 0;      // 连子数
    let emptyLeft = 0;  // 左侧（或上）空位数
    let emptyRight = 0; // 右侧（或下）空位数

    // 1. 向正方向扫描
    let step = 1;
    while (true) {
      const nr = r + dr * step;
      const nc = c + dc * step;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
        if (gameState.board[nr][nc] === color) {
          count++;
          step++;
        } else if (gameState.board[nr][nc] === 0) {
          emptyRight = 1; // 探测到活口
          // 看下一格是否还能构成断三/断四
          if (nr + dr < BOARD_SIZE && nc + dc >= 0 && nc + dc < BOARD_SIZE && gameState.board[nr + dr][nc + dc] === color) {
            count += 0.5; // 空心连珠加成
          }
          break;
        } else {
          break; // 敌占封死
        }
      } else {
        break;
      }
    }

    // 2. 向反方向扫描
    step = 1;
    while (true) {
      const nr = r - dr * step;
      const nc = c - dc * step;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
        if (gameState.board[nr][nc] === color) {
          count++;
          step++;
        } else if (gameState.board[nr][nc] === 0) {
          emptyLeft = 1;
          if (nr - dr >= 0 && nc - dc >= 0 && nc - dc < BOARD_SIZE && gameState.board[nr - dr][nc - dc] === color) {
            count += 0.5;
          }
          break;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // 3. 根据棋子结构进行权重累加
    if (count >= 4) { // 五子连珠或冲四/活四
      totalScore += 10000;
    } else if (count === 3) {
      if (emptyLeft && emptyRight) totalScore += 3000; // 活三
      else if (emptyLeft || emptyRight) totalScore += 800; // 眠三
    } else if (count === 2) {
      if (emptyLeft && emptyRight) totalScore += 600; // 活二
      else if (emptyLeft || emptyRight) totalScore += 150; // 眠二
    } else if (count === 1) {
      if (emptyLeft && emptyRight) totalScore += 50;
    }
  }

  return totalScore;
}

// --- 事件绑定与回调 ---

resetBtn.onclick = () => initGame();
restartBtn.onclick = () => initGame();

modeSelect.onchange = (e) => {
  gameState.mode = e.target.value;
  initGame();
};

muteBtn.onclick = () => {
  sfx.muted = !sfx.muted;
  const soundWave = document.getElementById('soundWave');
  if (sfx.muted) {
    muteBtn.classList.add('muted');
    soundWave.style.opacity = '0.2';
  } else {
    muteBtn.classList.remove('muted');
    soundWave.style.opacity = '1';
    sfx.init();
    sfx.playTone(600, 600, 0.05); // 哔声反馈
  }
};

// 监听容器大小自适应重绘网格背景
window.onresize = () => {
  renderBackgroundGrid();
};

// 页面加载默认初始化
initGame();
