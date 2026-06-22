/**
 * 赛博国际象棋 (Cyber Chess) 核心游戏引擎与 AI
 */

// --- 8-Bit 声音合成引擎 ---
class ChessSFX {
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

  // 走子音效：短促的三角波扫频
  playMove() {
    this.playTone(300, 600, 0.08, 'triangle', 0.1);
  }

  // 吃子音效：带有噪声和向下回落音
  playCapture() {
    this.playTone(400, 100, 0.12, 'sawtooth', 0.15);
    // 叠加一个短白噪点
    try {
      this.init();
      const bufferSize = this.ctx.sampleRate * 0.05;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(500, this.ctx.currentTime);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      source.start();
    } catch(e){}
  }

  // 将军音效：警报双音
  playCheck() {
    this.playTone(660, 660, 0.1, 'square', 0.12);
    setTimeout(() => {
      this.playTone(520, 520, 0.15, 'square', 0.12);
    }, 100);
  }

  // 将死/胜利和弦
  playVictory() {
    const tones = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
    tones.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, freq, 0.25, 'sine', 0.15);
      }, idx * 100);
    });
  }

  // 兵卒升变：清亮升调
  playPromotion() {
    this.playTone(440, 880, 0.2, 'sine', 0.12);
  }
}

const sfx = new ChessSFX();

// --- 国际象棋规则定义与数据映射 ---
// w: 白, b: 黑
// p: 兵, r: 车, n: 马, b: 象, q: 后, k: 王
const PIECE_SYMBOLS = {
  'wp': '♙', 'wr': '♖', 'wn': '♘', 'wb': '♗', 'wq': '♕', 'wk': '♔',
  'bp': '♟', 'br': '♜', 'bn': '♞', 'bb': '♝', 'bq': '♛', 'bk': '♚'
};

const INITIAL_BOARD = [
  ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
  ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
  ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr']
];

// 估值权重矩阵，用于极小极大值 AI 棋力评估
const PIECE_VALUES = { 'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000 };

const PAWN_TABLE = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

const KNIGHT_TABLE = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

const BISHOP_TABLE = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
];

const ROOK_TABLE = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [0,  0,  0,  5,  5,  0,  0,  0]
];

const QUEEN_TABLE = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [-5,  0,  5,  5,  5,  5,  0, -5],
  [0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  5,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
];

const KING_TABLE = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20, 20,  0,  0,  0,  0, 20, 20],
  [20, 30, 10,  0,  0, 10, 30, 20]
];

// --- 游戏主状态 ---
let gameState = {
  board: [],           // 8x8 棋盘数组
  turn: 'w',           // 'w' 或是 'b'
  steps: 0,
  mode: 'vs_ai',       // 'vs_ai' 或是 'pvp'
  selectedCell: null,  // {r, c} 当前选中的格子
  possibleMoves: [],   // 当前选中的棋子所有合法落脚点 [{r, c, type: 'normal'|'capture'|'enpassant'|'castle'}]
  castleRights: {
    w: { kingSide: true, queenSide: true },
    b: { kingSide: true, queenSide: true }
  },
  enPassantTarget: null, // 过路兵吃兵目标，例如 {r, c}
  activePromotion: null, // 存储需要升变的信息 {fromR, fromC, toR, toC}
  isGameOver: false
};

// --- DOM 节点绑定 ---
const boardGrid = document.getElementById('boardGrid');
const turnVal = document.getElementById('turnVal');
const stepsVal = document.getElementById('stepsVal');
const modeSelect = document.getElementById('modeSelect');
const resetBtn = document.getElementById('resetBtn');
const muteBtn = document.getElementById('muteBtn');
const promotionOverlay = document.getElementById('promotionOverlay');
const gameoverOverlay = document.getElementById('gameoverOverlay');
const winText = document.getElementById('winText');
const winDesc = document.getElementById('winDesc');
const restartBtn = document.getElementById('restartBtn');

// --- 游戏主控逻辑 ---

function initGame() {
  gameState.board = JSON.parse(JSON.stringify(INITIAL_BOARD));
  gameState.turn = 'w';
  gameState.steps = 0;
  gameState.selectedCell = null;
  gameState.possibleMoves = [];
  gameState.castleRights = {
    w: { kingSide: true, queenSide: true },
    b: { kingSide: true, queenSide: true }
  };
  gameState.enPassantTarget = null;
  gameState.activePromotion = null;
  gameState.isGameOver = false;

  turnVal.textContent = 'WHITE';
  turnVal.style.color = 'var(--cyan-neon)';
  turnVal.style.textShadow = '0 0 8px rgba(0, 245, 212, 0.4)';
  stepsVal.textContent = '0';

  promotionOverlay.classList.add('hidden');
  gameoverOverlay.classList.add('hidden');

  renderBoard();
}

function renderBoard() {
  boardGrid.innerHTML = '';
  const isKingChecked = isCheck(gameState.board, gameState.turn);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = document.createElement('div');
      cell.classList.add('board-cell');
      cell.classList.add((r + c) % 2 === 0 ? 'cell-light' : 'cell-dark');
      cell.dataset.r = r;
      cell.dataset.c = c;

      // 被选中格子高亮
      if (gameState.selectedCell && gameState.selectedCell.r === r && gameState.selectedCell.c === c) {
        cell.classList.add('cell-selected');
      }

      const piece = gameState.board[r][c];

      // 将军状态红色闪烁
      if (piece && piece === gameState.turn + 'k' && isKingChecked) {
        cell.classList.add('cell-check');
      }

      if (piece) {
        const pieceEl = document.createElement('div');
        pieceEl.classList.add('chess-piece');
        pieceEl.classList.add(piece.startsWith('w') ? 'piece-white' : 'piece-black');
        pieceEl.textContent = PIECE_SYMBOLS[piece] || '';
        cell.appendChild(pieceEl);
      }

      // 可移动路线高光提示
      const move = gameState.possibleMoves.find(m => m.r === r && m.c === c);
      if (move) {
        const indicator = document.createElement('div');
        if (move.type === 'capture') {
          indicator.classList.add('move-indicator-capture');
        } else {
          indicator.classList.add('move-indicator');
        }
        cell.appendChild(indicator);
      }

      cell.onclick = () => handleCellClick(r, c);
      boardGrid.appendChild(cell);
    }
  }
}

// 国际象棋走子交互逻辑
function handleCellClick(r, c) {
  if (gameState.isGameOver) return;
  if (gameState.mode === 'vs_ai' && gameState.turn === 'b') return; // AI 回合锁死玩家操作

  const piece = gameState.board[r][c];
  const selected = gameState.selectedCell;

  // 1. 如果点击的是已经选中的可行进目的格子，直接走子
  const targetMove = gameState.possibleMoves.find(m => m.r === r && m.c === c);
  if (selected && targetMove) {
    executePlayerMove(selected.r, selected.c, r, c, targetMove);
    return;
  }

  // 2. 否则，如果选的是己方棋子，更新高亮和可行路线
  if (piece && piece.startsWith(gameState.turn)) {
    gameState.selectedCell = { r, c };
    gameState.possibleMoves = getLegalMoves(gameState.board, r, c);
    renderBoard();
  } else {
    // 3. 点击空白或敌方不可达区域，取消高亮
    gameState.selectedCell = null;
    gameState.possibleMoves = [];
    renderBoard();
  }
}

// 执行玩家行动
function executePlayerMove(fromR, fromC, toR, toC, moveMeta) {
  const piece = gameState.board[fromR][fromC];
  
  // 检测兵卒升变触发 (兵移动到黑方底线0，或白方底线7)
  if (piece.endsWith('p') && (toR === 0 || toR === 7)) {
    gameState.activePromotion = { fromR, fromC, toR, toC, type: moveMeta.type };
    sfx.playPromotion();
    promotionOverlay.classList.remove('hidden');
    return;
  }

  // 常规移动
  makeMove(gameState.board, fromR, fromC, toR, toC, moveMeta.type);
  completeMoveSequence();
}

// 走子后的后处理（翻转回合，判定胜负，触发 AI）
function completeMoveSequence() {
  gameState.steps++;
  stepsVal.textContent = gameState.steps;
  gameState.selectedCell = null;
  gameState.possibleMoves = [];

  // 检测被击倒方是否处于“将军”或“将死”状态
  const nextColor = gameState.turn === 'w' ? 'b' : 'w';
  gameState.turn = nextColor;

  if (nextColor === 'w') {
    turnVal.textContent = 'WHITE';
    turnVal.style.color = 'var(--cyan-neon)';
    turnVal.style.textShadow = '0 0 8px rgba(0, 245, 212, 0.4)';
  } else {
    turnVal.textContent = 'BLACK';
    turnVal.style.color = 'var(--pink-neon)';
    turnVal.style.textShadow = '0 0 8px rgba(255, 0, 127, 0.4)';
  }

  const inCheck = isCheck(gameState.board, gameState.turn);
  const moves = getAllLegalMoves(gameState.board, gameState.turn);

  if (moves.length === 0) {
    gameState.isGameOver = true;
    sfx.playVictory();
    if (inCheck) {
      // 将死
      const winner = gameState.turn === 'w' ? '黑方 (BLACK)' : '白方 (WHITE)';
      winText.textContent = '将死! (Checkmate)';
      winDesc.textContent = `${winner} 棋高一招，将死了对方，一统江山！`;
      
      // postMessage 统一大厅成就判定
      if (gameState.mode === 'vs_ai' && gameState.turn === 'b') {
        window.parent.postMessage({
          type: 'unlock_achievement',
          achievement: 'chess_win'
        }, '*');
      }
    } else {
      // 和棋
      winText.textContent = '无子可动! (Stalemate)';
      winDesc.textContent = '双方难解难分，以和棋收场。';
    }
    gameoverOverlay.classList.remove('hidden');
    renderBoard();
    return;
  }

  if (inCheck) {
    sfx.playCheck();
  }

  renderBoard();

  // 如果是人机模式，由 AI 进行演算
  if (gameState.mode === 'vs_ai' && gameState.turn === 'b' && !gameState.isGameOver) {
    setTimeout(triggerAIMove, 450);
  }
}

// 物理移动走棋核心底层（直接修改指定 Board 数组）
function makeMove(board, fromR, fromC, toR, toC, moveType) {
  const piece = board[fromR][fromC];
  const target = board[toR][toC];

  // 播放音效判断
  if (target || moveType === 'enpassant') {
    sfx.playCapture();
  } else {
    sfx.playMove();
  }

  // 过路兵特殊吃子
  if (moveType === 'enpassant') {
    const epRow = fromR; // 吃掉跟当前行处于同水平的小兵
    board[epRow][toC] = null;
  }

  // 王车易位特殊移子
  if (moveType === 'castle') {
    if (toC === 6) { // 王翼易位
      board[toR][5] = board[toR][7];
      board[toR][7] = null;
    } else if (toC === 2) { // 后翼易位
      board[toR][3] = board[toR][0];
      board[toR][0] = null;
    }
  }

  // 设置过路兵可攻击目标 (仅限兵单格前行两格)
  if (piece.endsWith('p') && Math.abs(toR - fromR) === 2) {
    gameState.enPassantTarget = { r: (fromR + toR) / 2, c: toC };
  } else {
    gameState.enPassantTarget = null;
  }

  // 移去旧子并落位
  board[toR][toC] = piece;
  board[fromR][fromC] = null;

  // 移除易位权
  if (piece === 'wk') {
    gameState.castleRights.w.kingSide = false;
    gameState.castleRights.w.queenSide = false;
  } else if (piece === 'bk') {
    gameState.castleRights.b.kingSide = false;
    gameState.castleRights.b.queenSide = false;
  } else if (piece === 'wr') {
    if (fromR === 7 && fromC === 0) gameState.castleRights.w.queenSide = false;
    if (fromR === 7 && fromC === 7) gameState.castleRights.w.kingSide = false;
  } else if (piece === 'br') {
    if (fromR === 0 && fromC === 0) gameState.castleRights.b.queenSide = false;
    if (fromR === 0 && fromC === 7) gameState.castleRights.b.kingSide = false;
  }
}

// --- 国际象棋规则算法核心 ---

// 获取单个棋子可移动的伪合法位置
function getPseudoMoves(board, r, c, ignoreCastling = false) {
  const piece = board[r][c];
  if (!piece) return [];

  const color = piece[0]; // 'w' 或 'b'
  const type = piece[1];  // 'p', 'r', 'n', 'b', 'q', 'k'
  const moves = [];

  const addMove = (tr, tc, tType = 'normal') => {
    if (tr < 0 || tr >= 8 || tc < 0 || tc >= 8) return false;
    const dest = board[tr][tc];
    if (!dest) {
      moves.push({ r: tr, c: tc, type: tType });
      return true; // 空位继续
    }
    if (dest[0] !== color) {
      moves.push({ r: tr, c: tc, type: 'capture' });
    }
    return false; // 遇阻断
  };

  switch (type) {
    case 'p': { // 兵
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;

      // 1. 直行一步
      if (r + dir >= 0 && r + dir < 8 && !board[r + dir][c]) {
        moves.push({ r: r + dir, c: c, type: 'normal' });
        // 直行两步
        if (r === startRow && !board[r + dir * 2][c]) {
          moves.push({ r: r + dir * 2, c: c, type: 'normal' });
        }
      }

      // 2. 斜吃子
      const captureCols = [c - 1, c + 1];
      captureCols.forEach(col => {
        if (col >= 0 && col < 8) {
          const dest = board[r + dir][col];
          if (dest && dest[0] !== color) {
            moves.push({ r: r + dir, c: col, type: 'capture' });
          }
          // 吃过路兵
          if (gameState.enPassantTarget && gameState.enPassantTarget.r === r + dir && gameState.enPassantTarget.c === col) {
            moves.push({ r: r + dir, c: col, type: 'enpassant' });
          }
        }
      });
      break;
    }

    case 'n': { // 马 (L字移动)
      const offsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      offsets.forEach(([dr, dc]) => addMove(r + dr, c + dc));
      break;
    }

    case 'b': { // 象 (斜向滑动)
      const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      dirs.forEach(([dr, dc]) => {
        let step = 1;
        while (addMove(r + dr * step, c + dc * step)) step++;
      });
      break;
    }

    case 'r': { // 车 (十字滑动)
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      dirs.forEach(([dr, dc]) => {
        let step = 1;
        while (addMove(r + dr * step, c + dc * step)) step++;
      });
      break;
    }

    case 'q': { // 后 (十字+斜向滑动)
      const dirs = [
        [-1, -1], [-1, 1], [1, -1], [1, 1],
        [-1, 0], [1, 0], [0, -1], [0, 1]
      ];
      dirs.forEach(([dr, dc]) => {
        let step = 1;
        while (addMove(r + dr * step, c + dc * step)) step++;
      });
      break;
    }

    case 'k': { // 王
      const offsets = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];
      offsets.forEach(([dr, dc]) => addMove(r + dr, c + dc));

      if (ignoreCastling) {
        break;
      }

      // 王车易位条件审查 (在非将军状态下，且路径上无子且未受攻击)
      const rights = gameState.castleRights[color];
      const isKingChecked = isCheck(board, color);

      if (rights && !isKingChecked) {
        // 王翼易位
        if (rights.kingSide && !board[r][5] && !board[r][6]) {
          // 确保易位途经格子不受攻击
          if (!isSquareAttacked(board, r, 5, color) && !isSquareAttacked(board, r, 6, color)) {
            moves.push({ r: r, c: 6, type: 'castle' });
          }
        }
        // 后翼易位
        if (rights.queenSide && !board[r][1] && !board[r][2] && !board[r][3]) {
          if (!isSquareAttacked(board, r, 2, color) && !isSquareAttacked(board, r, 3, color)) {
            moves.push({ r: r, c: 2, type: 'castle' });
          }
        }
      }
      break;
    }
  }

  return moves;
}

// 过滤掉会导致己方国王处于将军状态的伪合法走子，得到绝对合法的走子
function getLegalMoves(board, r, c) {
  const piece = board[r][c];
  if (!piece) return [];

  const pseudo = getPseudoMoves(board, r, c);
  const color = piece[0];

  return pseudo.filter(move => {
    // 拷贝棋盘并试着走一步
    const tempBoard = JSON.parse(JSON.stringify(board));
    
    // 过路兵的测试走子底层处理
    if (move.type === 'enpassant') {
      tempBoard[r][move.c] = null;
    }
    
    tempBoard[move.r][move.c] = tempBoard[r][c];
    tempBoard[r][c] = null;

    // 检查走子后，己方国王是否仍然被“将军”
    return !isCheck(tempBoard, color);
  });
}

// 检查该色国王当前是否被将军
function isCheck(board, color) {
  // 1. 搜寻国王所在坐标
  let kr = -1, kc = -1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece === color + 'k') {
        kr = r;
        kc = c;
        break;
      }
    }
    if (kr !== -1) break;
  }

  if (kr === -1) return false; // 没有国王 (理论上不应发生)

  // 2. 检测该格点是否正在被对方攻击
  return isSquareAttacked(board, kr, kc, color);
}

// 检测目标格点是否被敌军火力攻击
function isSquareAttacked(board, targetR, targetC, defendedColor) {
  const enemyColor = defendedColor === 'w' ? 'b' : 'w';

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.startsWith(enemyColor)) {
        const pMoves = getPseudoMoves(board, r, c, true); // 阻止易位检查导致的无限递归死循环
        const match = pMoves.find(m => m.r === targetR && m.c === targetC);
        if (match) return true;
      }
    }
  }
  return false;
}

// 获取某一色当前所有绝对合法的走法
function getAllLegalMoves(board, color) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.startsWith(color)) {
        const legals = getLegalMoves(board, r, c);
        legals.forEach(m => {
          moves.push({ fromR: r, fromC: c, toR: m.r, toC: m.c, type: m.type });
        });
      }
    }
  }
  return moves;
}

// --- 极小极大值 AI 推演引擎 ---

function evaluateBoard(board) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const color = piece[0];
      const type = piece[1];
      let val = PIECE_VALUES[type] || 0;

      // 叠加位置热度图，激励棋子占据开阔优势地位
      if (type === 'p') val += color === 'w' ? PAWN_TABLE[r][c] : PAWN_TABLE[7 - r][c];
      else if (type === 'n') val += color === 'w' ? KNIGHT_TABLE[r][c] : KNIGHT_TABLE[7 - r][c];
      else if (type === 'b') val += color === 'w' ? BISHOP_TABLE[r][c] : BISHOP_TABLE[7 - r][c];
      else if (type === 'r') val += color === 'w' ? ROOK_TABLE[r][c] : ROOK_TABLE[7 - r][c];
      else if (type === 'q') val += color === 'w' ? QUEEN_TABLE[r][c] : QUEEN_TABLE[7 - r][c];
      else if (type === 'k') val += color === 'w' ? KING_TABLE[r][c] : KING_TABLE[7 - r][c];

      score += color === 'w' ? val : -val;
    }
  }
  return score;
}

// 极小极大值带 Alpha-Beta 剪枝思考，保障推演流畅，深度设为 2 层（对黑方做极小评估）
function minimax(board, depth, alpha, beta, isMaximizing) {
  if (depth === 0) {
    return evaluateBoard(board);
  }

  const color = isMaximizing ? 'w' : 'b';
  const moves = getAllLegalMoves(board, color);

  if (moves.length === 0) {
    // 走到穷途末路，检查是否被将死
    if (isCheck(board, color)) {
      return isMaximizing ? -Infinity : Infinity; // 被将死判定
    }
    return 0; // 和局判定
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      const tempBoard = JSON.parse(JSON.stringify(board));
      
      // 过路兵特殊处理走子
      if (m.type === 'enpassant') {
        tempBoard[m.fromR][m.toC] = null;
      }
      // 易位特殊处理
      if (m.type === 'castle') {
        if (m.toC === 6) { tempBoard[m.toR][5] = tempBoard[m.toR][7]; tempBoard[m.toR][7] = null; }
        else if (m.toC === 2) { tempBoard[m.toR][3] = tempBoard[m.toR][0]; tempBoard[m.toR][0] = null; }
      }

      tempBoard[m.toR][m.toC] = tempBoard[m.fromR][m.fromC];
      tempBoard[m.fromR][m.fromC] = null;

      const evaluation = minimax(tempBoard, depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break; // 剪枝
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      const tempBoard = JSON.parse(JSON.stringify(board));

      if (m.type === 'enpassant') {
        tempBoard[m.fromR][m.toC] = null;
      }
      if (m.type === 'castle') {
        if (m.toC === 6) { tempBoard[m.toR][5] = tempBoard[m.toR][7]; tempBoard[m.toR][7] = null; }
        else if (m.toC === 2) { tempBoard[m.toR][3] = tempBoard[m.toR][0]; tempBoard[m.toR][0] = null; }
      }

      tempBoard[m.toR][m.toC] = tempBoard[m.fromR][m.fromC];
      tempBoard[m.fromR][m.fromC] = null;

      const evaluation = minimax(tempBoard, depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// 触发 AI 的行动选择
function triggerAIMove() {
  if (gameState.isGameOver) return;

  const moves = getAllLegalMoves(gameState.board, 'b');
  if (moves.length === 0) return;

  let bestMove = null;
  let minEval = Infinity;

  // 1. 深度极小极大值估算
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    const tempBoard = JSON.parse(JSON.stringify(gameState.board));

    if (m.type === 'enpassant') {
      tempBoard[m.fromR][m.toC] = null;
    }
    if (m.type === 'castle') {
      if (m.toC === 6) { tempBoard[m.toR][5] = tempBoard[m.toR][7]; tempBoard[m.toR][7] = null; }
      else if (m.toC === 2) { tempBoard[m.toR][3] = tempBoard[m.toR][0]; tempBoard[m.toR][0] = null; }
    }

    tempBoard[m.toR][m.toC] = tempBoard[m.fromR][m.fromC];
    tempBoard[m.fromR][m.fromC] = null;

    const evaluation = minimax(tempBoard, 2, -Infinity, Infinity, true);
    if (evaluation < minEval) {
      minEval = evaluation;
      bestMove = m;
    }
  }

  // 2. 如果没有估出最佳（通常不可能发生），随机垫底
  if (!bestMove) {
    bestMove = moves[Math.floor(Math.random() * moves.length)];
  }

  // 3. 执行走子
  // AI 升变自动判定升变为最强力兵种 “后”
  const piece = gameState.board[bestMove.fromR][bestMove.fromC];
  if (piece.endsWith('p') && bestMove.toR === 7) {
    gameState.board[bestMove.fromR][bestMove.fromC] = 'bq'; // 自动升变成皇后
  }

  makeMove(gameState.board, bestMove.fromR, bestMove.fromC, bestMove.toR, bestMove.toC, bestMove.type);
  completeMoveSequence();
}

// --- 事件绑定与回调 ---

// 升变弹框按钮绑定
document.querySelectorAll('.promo-btn').forEach(btn => {
  btn.onclick = () => {
    if (!gameState.activePromotion) return;
    const { fromR, fromC, toR, toC, type } = gameState.activePromotion;
    const upgradePiece = gameState.turn + btn.dataset.piece; // 'wq', 'wr', 'wb', 'wn' 等

    // 改变该兵卒为目标兵种
    gameState.board[fromR][fromC] = upgradePiece;
    makeMove(gameState.board, fromR, fromC, toR, toC, type);
    
    // 隐藏遮罩并完成结算
    promotionOverlay.classList.add('hidden');
    gameState.activePromotion = null;

    // 触发大厅的升变特殊成就
    if (gameState.turn === 'w') {
      window.parent.postMessage({
        type: 'unlock_achievement',
        achievement: 'chess_promotion'
      }, '*');
    }

    completeMoveSequence();
  };
});

// 重置与再玩
resetBtn.onclick = () => initGame();
restartBtn.onclick = () => initGame();

// 游戏模式变更
modeSelect.onchange = (e) => {
  gameState.mode = e.target.value;
  initGame();
};

// 静音控制
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
    sfx.playTone(600, 600, 0.05); // 哔声回执
  }
};

// 页面加载默认初始化
initGame();
