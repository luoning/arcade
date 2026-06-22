/**
 * Cyber Connect - 赛博连连看核心游戏引擎与经典折线连接算法
 */

// --- 8-Bit 合成音效合成器 (Web Audio API) ---
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

  // 选择图块：高频嘀
  playSelect() {
    this.playTone(880, 880, 0.05, 'sine', 0.1);
  }

  // 连接失败：低沉双音警告
  playFail() {
    this.playTone(180, 100, 0.15, 'sawtooth', 0.18);
  }

  // 消除成功：激光滋滋声加清脆上扬和弦
  playMatch() {
    this.playTone(300, 1200, 0.12, 'triangle', 0.15);
    setTimeout(() => {
      this.playTone(800, 1500, 0.18, 'sine', 0.12);
    }, 50);
  }

  // 洗牌声：快速升降琶音
  playShuffle() {
    if (this.muted) return;
    this.init();
    try {
      const arpeggio = [440, 554.37, 659.25, 880, 659.25, 554.37, 440];
      arpeggio.forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, freq * 1.05, 0.08, 'sine', 0.1);
        }, idx * 45);
      });
    } catch (e) {}
  }

  // 通关胜利音乐
  playWin() {
    if (this.muted) return;
    this.init();
    try {
      const melody = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      melody.forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, freq, 0.2, 'sine', 0.12);
        }, idx * 90);
      });
    } catch (e) {}
  }

  // GG 音效
  playGameOver() {
    this.playTone(220, 55, 0.6, 'sawtooth', 0.25);
  }
}

const synth = new AudioSynth();

// --- 游戏配置与变量 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreVal = document.getElementById('scoreVal');
const timeVal = document.getElementById('timeVal');
const hintVal = document.getElementById('hintVal');
const shuffleVal = document.getElementById('shuffleVal');

const startOverlay = document.getElementById('startOverlay');
const stageClearOverlay = document.getElementById('stageClearOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');

const startBtn = document.getElementById('startBtn');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const restartBtn = document.getElementById('restartBtn');
const muteBtn = document.getElementById('muteBtn');
const useHintBtn = document.getElementById('useHintBtn');
const useShuffleBtn = document.getElementById('useShuffleBtn');

// 液晶板缓存
const clearScoreVal = document.getElementById('clearScoreVal');
const failScoreVal = document.getElementById('failScoreVal');

// 游戏状态
let score = 0;
let timeLeft = 90;
let hints = 3;
let shuffles = 3;
let level = 1;
let gameOver = false;
let gameWon = false;
let gameStarted = false;
let timerInterval = null;
let difficulty = 'easy'; // 难度等级: 'easy', 'medium', 'hard'

// 图块网格设计
// 实际盘面尺寸 (随着关卡和难度变大)
let gridRows = 6;
let gridCols = 8;

// 连接绕行虚空网格矩阵 (四周各多一圈 0 用作通道绕路)
let board = [];
let boardRows = 0;
let boardCols = 0;

// 网格绘制尺寸
let cellWidth = 55;
let cellHeight = 55;
let offsetX = 0;
let offsetY = 0;

// 图块类型配置 (发光的电路逻辑元件，最多8种)
const TILE_TYPES = [
  { id: 1, name: 'CPU', color: '#fee440' },      // 金黄色 CPU
  { id: 2, name: 'RESISTOR', color: '#ff007f' }, // 粉色电阻
  { id: 3, name: 'DIODE', color: '#00f5d4' },    // 青色二极管
  { id: 4, name: 'ANTENNA', color: '#9d4edd' },  // 紫色天线
  { id: 5, name: 'GATE', color: '#00bbf9' },     // 蓝色逻辑门
  { id: 6, name: 'INDUCTOR', color: '#39ff14' }, // 亮绿电感线圈
  { id: 7, name: 'CAPACITOR', color: '#ff7b00' },// 橙色电容
  { id: 8, name: 'IC', color: '#f8f9fa' }        // 白色集成块
];

// 选择状态
let selectedTile = null; // {r, c}

// 消除动画路径连线
let activeLaserPath = null; // 二折角经过的连接坐标数组 [{r, c}, ...]
let laserTimer = 0; // 连线维持时间

let particles = []; // 配对消除霓虹火花粒子
let isShufflingTextTimer = 0; // 自动洗牌文本提示维持帧

// --- 初始化与关卡搭建 ---

function initGame() {
  score = 0;
  level = 1;
  
  // 根据不同难度初始化道具数量与基准倒计时
  if (difficulty === 'easy') {
    hints = 3;
    shuffles = 3;
    timeLeft = 90;
  } else if (difficulty === 'medium') {
    hints = 2;
    shuffles = 2;
    timeLeft = 75;
  } else {
    hints = 1;
    shuffles = 1;
    timeLeft = 60;
  }
  
  gameOver = false;
  gameWon = false;
  gameStarted = true;
  
  selectedTile = null;
  activeLaserPath = null;
  particles = [];
  
  buildStage();
  updateUI();
  startTimer();
  
  startOverlay.classList.add('hidden');
  stageClearOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  
  synth.init();
}

function buildStage() {
  // 无尽关卡：随着 level 的增加，网格规模逐步扩大 (保证总格子数是偶数)
  if (level === 1) {
    gridRows = 6;
    gridCols = 8;
  } else if (level === 2) {
    gridRows = 6;
    gridCols = 10;
  } else {
    // 高级无尽关卡：在 6x10 和 8x10 之间交替，保证布局不会超出 Canvas
    gridRows = (level % 2 === 0) ? 8 : 6;
    gridCols = 10;
  }
  
  // 物理坐标自适应排列计算
  cellWidth = Math.min(60, Math.floor((canvas.width - 40) / gridCols));
  cellHeight = Math.min(60, Math.floor((canvas.height - 40) / gridRows));
  offsetX = (canvas.width - cellWidth * gridCols) / 2;
  offsetY = (canvas.height - cellHeight * gridRows) / 2;
  
  // 初始化绕行网格 board
  boardRows = gridRows + 2;
  boardCols = gridCols + 2;
  board = Array(boardRows).fill(0).map(() => Array(boardCols).fill(0));
  
  // 依据当前难度与关卡，智能计算出现的图块元素图案种数
  let typesCount = 4;
  if (difficulty === 'easy') {
    typesCount = Math.min(5, 3 + Math.floor(level / 3)); // 简单模式上限 5 种
  } else if (difficulty === 'medium') {
    typesCount = Math.min(7, 4 + Math.floor(level / 2)); // 中等模式上限 7 种
  } else {
    typesCount = Math.min(8, 6 + Math.floor(level / 2)); // 熔毁模式上限 8 种
  }
  
  const totalTiles = gridRows * gridCols;
  const tempTiles = [];
  
  // 每种芯片必须成对出现
  const pairs = totalTiles / 2;
  for (let i = 0; i < pairs; i++) {
    const typeId = (i % typesCount) + 1;
    tempTiles.push(typeId);
    tempTiles.push(typeId);
  }
  
  // 洗牌打乱图块图案
  tempTiles.sort(() => Math.random() - 0.5);
  
  // 填充到绕行网格中 (去掉边缘第一圈)
  let idx = 0;
  for (let r = 1; r <= gridRows; r++) {
    for (let c = 1; c <= gridCols; c++) {
      board[r][c] = tempTiles[idx++];
    }
  }
  
  selectedTile = null;
  activeLaserPath = null;
  
  // 检查初始死锁，如有则重新打乱，保证开局可解
  while (checkDeadlock()) {
    shuffleBoard(false);
  }
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timeVal.textContent = timeLeft;
  
  timerInterval = setInterval(() => {
    if (gameOver || gameWon || activeLaserPath) return;
    timeLeft--;
    timeVal.textContent = timeLeft;
    
    // 最后十秒警报音
    if (timeLeft <= 10 && timeLeft > 0) {
      synth.playTone(800, 800, 0.04, 'sine', 0.06);
    }
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      handleGameOver();
    }
  }, 1000);
}

// --- 连连看二折角寻路核心算法 (0折、1折、2折) ---

// 直线连接判定
function isLinkStraight(r1, c1, r2, c2) {
  if (r1 !== r2 && c1 !== c2) return false;
  
  if (r1 === r2) { // 横向连线
    const minC = Math.min(c1, c2);
    const maxC = Math.max(c1, c2);
    for (let c = minC + 1; c < maxC; c++) {
      if (board[r1][c] !== 0) return false;
    }
  } else { // 纵向连线
    const minR = Math.min(r1, r2);
    const maxR = Math.max(r1, r2);
    for (let r = minR + 1; r < maxR; r++) {
      if (board[r][c1] !== 0) return false;
    }
  }
  return true;
}

// 找寻无折与一折角路径
function findOneCornerPath(r1, c1, r2, c2) {
  // 1. 直线判定
  if (isLinkStraight(r1, c1, r2, c2)) {
    return [{r: r1, c: c1}, {r: r2, c: c2}];
  }
  
  // 2. 拐点 A: (r1, c2)
  if (board[r1][c2] === 0 && isLinkStraight(r1, c1, r1, c2) && isLinkStraight(r1, c2, r2, c2)) {
    return [{r: r1, c: c1}, {r: r1, c: c2}, {r: r2, c: c2}];
  }
  
  // 3. 拐点 B: (r2, c1)
  if (board[r2][c1] === 0 && isLinkStraight(r1, c1, r2, c1) && isLinkStraight(r2, c1, r2, c2)) {
    return [{r: r1, c: c1}, {r: r2, c: c1}, {r: r2, c: c2}];
  }
  
  return null;
}

// 找寻二折角路径 (二折探针算法)
function findTwoCornerPath(r1, c1, r2, c2) {
  // 从起始点 (r1, c1) 往四个方向画射线探查通路
  const dirs = [
    {dr: -1, dc: 0}, // 上
    {dr: 1, dc: 0},  // 下
    {dr: 0, dc: -1}, // 左
    {dr: 0, dc: 1}   // 右
  ];
  
  for (let dir of dirs) {
    let tr = r1 + dir.dr;
    let tc = c1 + dir.dc;
    
    // 沿着这个方向发射射线，只要是空白（通路），就把这个格子当作首个转折点，尝试跟目标点进行“一折”或“直线”连接
    while (tr >= 0 && tr < boardRows && tc >= 0 && tc < boardCols && board[tr][tc] === 0) {
      const subPath = findOneCornerPath(tr, tc, r2, c2);
      if (subPath) {
        // 合并路径：[ (r1,c1) -> (tr,tc) ] + [ (tr,tc) 到 (r2,c2) 的直线/一折路径 ]
        return [{r: r1, c: c1}, ...subPath];
      }
      tr += dir.dr;
      tc += dir.dc;
    }
  }
  return null;
}

// 总入口：判定两图块能否连接并返回路径
function checkLink(r1, c1, r2, c2) {
  // 规则前置校验：图案相同、不是同一个方块、不为空
  if (board[r1][c1] === 0 || board[r2][c2] === 0) return null;
  if (r1 === r2 && c1 === c2) return null;
  if (board[r1][c1] !== board[r2][c2]) return null;
  
  // 查找连接路径 (依次查找 0-1折 和 2折)
  let path = findOneCornerPath(r1, c1, r2, c2);
  if (path) return path;
  
  path = findTwoCornerPath(r1, c1, r2, c2);
  return path;
}

// --- 死锁自动检测与打乱洗牌 ---

// 校验场上是否有至少一个可连线对
function checkDeadlock() {
  // 遍历所有有图案的图块
  const list = [];
  for (let r = 1; r <= gridRows; r++) {
    for (let c = 1; c <= gridCols; c++) {
      if (board[r][c] !== 0) {
        list.push({r, c});
      }
    }
  }
  
  if (list.length === 0) return false; // 已经空了，不存在死锁，通关
  
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const p1 = list[i];
      const p2 = list[j];
      if (checkLink(p1.r, p1.c, p2.r, p2.c)) {
        return false; // 找到至少一对，未死锁
      }
    }
  }
  return true; // 所有图块都无法连接配对，死锁！
}

// 打乱剩余图块 (洗牌)
function shuffleBoard(manual = true) {
  const currentTiles = [];
  
  // 1. 收集场上所有现存图块的图案 ID
  for (let r = 1; r <= gridRows; r++) {
    for (let c = 1; c <= gridCols; c++) {
      if (board[r][c] !== 0) {
        currentTiles.push(board[r][c]);
      }
    }
  }
  
  if (currentTiles.length === 0) return;
  
  // 2. 打乱图案列表
  currentTiles.sort(() => Math.random() - 0.5);
  
  // 3. 重新塞入原有的位置中
  let idx = 0;
  for (let r = 1; r <= gridRows; r++) {
    for (let c = 1; c <= gridCols; c++) {
      if (board[r][c] !== 0) {
        board[r][c] = currentTiles[idx++];
      }
    }
  }
  
  selectedTile = null;
  synth.playShuffle();
  
  if (manual) {
    shuffles--;
    updateUI();
  } else {
    // 自动洗牌，显示动画文案
    isShufflingTextTimer = 90; // 自动洗牌提示显示 1.5 秒
  }
  
  // 洗牌后再次自检死锁，直到有解为止
  if (checkDeadlock()) {
    shuffleBoard(false);
  }
}

// 道具提示 (Hint)：自动帮玩家连线显示一对
function getHint() {
  if (hints <= 0 || activeLaserPath) return;
  
  const list = [];
  for (let r = 1; r <= gridRows; r++) {
    for (let c = 1; c <= gridCols; c++) {
      if (board[r][c] !== 0) {
        list.push({r, c});
      }
    }
  }
  
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const p1 = list[i];
      const p2 = list[j];
      const path = checkLink(p1.r, p1.c, p2.r, p2.c);
      if (path) {
        // 标记提示高亮这一对
        selectedTile = p1; // 选定第一个
        hints--;
        updateUI();
        synth.playSelect();
        return; // 结束
      }
    }
  }
}

// 检查是否关卡全清
function isStageCleared() {
  for (let r = 1; r <= gridRows; r++) {
    for (let c = 1; c <= gridCols; c++) {
      if (board[r][c] !== 0) return false;
    }
  }
  return true;
}

// 结算得分与加时奖励 (时间图块机制)
function handleMatchSuccess(path) {
  const p1 = path[0];
  const p2 = path[path.length - 1];
  
  // 计算消除中心坐标，生成粒子
  const cX1 = offsetX + (p1.c - 1) * cellWidth + cellWidth / 2;
  const cY1 = offsetY + (p1.r - 1) * cellHeight + cellHeight / 2;
  const cX2 = offsetX + (p2.c - 1) * cellWidth + cellWidth / 2;
  const cY2 = offsetY + (p2.r - 1) * cellHeight + cellHeight / 2;
  
  const type1 = TILE_TYPES[board[p1.r][p1.c] - 1];
  
  // 1. 发射粒子
  spawnMatchExplosion(cX1, cY1, type1.color);
  spawnMatchExplosion(cX2, cY2, type1.color);
  
  // 2. 扣除面板图块
  board[p1.r][p1.c] = 0;
  board[p2.r][p2.c] = 0;
  
  score += 100;
  // 获得 2 秒奖励时间
  timeLeft = Math.min(120, timeLeft + 2);
  
  updateUI();
  synth.playMatch();
  
  // 3. 激光动画延迟 18 帧 (约0.3秒)，在此期间不扣倒计时
  activeLaserPath = path;
  laserTimer = 18;
}

// --- 粒子系统 ---

function spawnMatchExplosion(x, y, color) {
  const count = 15;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.0 + Math.random() * 3.5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.5,
      radius: 1.5 + Math.random() * 1.5,
      color,
      alpha: 1.0,
      decay: 0.02 + Math.random() * 0.02
    });
  }
}

// --- 渲染引擎 ---

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 1. 渲染背景装饰网格
  drawGrid();

  // 2. 渲染未消除的图块芯片
  for (let r = 1; r <= gridRows; r++) {
    for (let c = 1; c <= gridCols; c++) {
      const typeId = board[r][c];
      if (typeId === 0) continue;
      
      const type = TILE_TYPES[typeId - 1];
      const bx = offsetX + (c - 1) * cellWidth + 3;
      const by = offsetY + (r - 1) * cellHeight + 3;
      const bw = cellWidth - 6;
      const bh = cellHeight - 6;
      
      // 判定是否是当前选中图块，高亮样式
      const isSelected = selectedTile && selectedTile.r === r && selectedTile.c === c;
      
      ctx.save();
      // 芯片霓虹发光框
      ctx.shadowColor = type.color;
      ctx.shadowBlur = isSelected ? 12 : 5;
      
      // 绘制圆角小芯片背壳
      ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.015)';
      ctx.strokeStyle = isSelected ? '#ffffff' : type.color;
      ctx.lineWidth = isSelected ? 2.5 : 1.2;
      
      const cr = 6;
      ctx.beginPath();
      ctx.moveTo(bx + cr, by);
      ctx.lineTo(bx + bw - cr, by);
      ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + cr);
      ctx.lineTo(bx + bw, by + bh - cr);
      ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - cr, by + bh);
      ctx.lineTo(bx + cr, by + bh);
      ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - cr);
      ctx.lineTo(bx, by + cr);
      ctx.quadraticCurveTo(bx, by, bx + cr, by);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // 绘制芯片特色电路图案
      drawCircuitIcon(bx + bw / 2, by + bh / 2, bw * 0.42, type.id, type.color);
      
      ctx.restore();
    }
  }

  // 3. 渲染粒子
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 4. 渲染发光激光连线
  if (activeLaserPath && laserTimer > 0) {
    ctx.save();
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#00f5d4';
    ctx.shadowBlur = 12;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    activeLaserPath.forEach((pt, idx) => {
      // 算出该格子在画布中的物理中心坐标
      // 这里的 pt 包含绕行网格坐标，要转化为网格渲染坐标
      const px = offsetX + (pt.c - 1) * cellWidth + cellWidth / 2;
      const py = offsetY + (pt.r - 1) * cellHeight + cellHeight / 2;
      
      if (idx === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    });
    ctx.stroke();
    ctx.restore();
    
    laserTimer--;
    if (laserTimer <= 0) {
      activeLaserPath = null;
      selectedTile = null;
      
      // 消除结束后检查是否通关或发生死锁
      if (isStageCleared()) {
        handleWin();
      } else if (checkDeadlock()) {
        shuffleBoard(false);
      }
    }
  }

  // 5. 渲染“自动洗牌提示”
  if (isShufflingTextTimer > 0) {
    ctx.save();
    ctx.font = 'bold 22px Orbitron';
    ctx.fillStyle = '#ff007f';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 12;
    ctx.fillText('AUTO SHUFFLING...', canvas.width / 2, canvas.height / 2);
    ctx.restore();
    isShufflingTextTimer--;
  }
}

// 辅助绘图：精美手绘芯片特色电路图案 (代替 Emojis)
function drawCircuitIcon(cx, cy, size, typeId, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  
  if (typeId === 1) {
    // CPU：发光方框中心带小方块，以及外围 4 组引脚针脚
    ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
    ctx.fillRect(cx - size * 0.22, cy - size * 0.22, size * 0.44, size * 0.44);
    // 引脚
    ctx.lineWidth = 1.2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      // 顶针
      ctx.moveTo(cx + i * 5, cy - size / 2); ctx.lineTo(cx + i * 5, cy - size / 2 - 4);
      // 底针
      ctx.moveTo(cx + i * 5, cy + size / 2); ctx.lineTo(cx + i * 5, cy + size / 2 + 4);
      // 左针
      ctx.moveTo(cx - size / 2, cy + i * 5); ctx.lineTo(cx - size / 2 - 4, cy + i * 5);
      // 右针
      ctx.moveTo(cx + size / 2, cy + i * 5); ctx.lineTo(cx + size / 2 + 4, cy + i * 5);
      ctx.stroke();
    }
  } 
  else if (typeId === 2) {
    // 电阻：横跨线，中间带 3 折波浪锯齿折线
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.7, cy);
    ctx.lineTo(cx - size * 0.3, cy);
    ctx.lineTo(cx - size * 0.15, cy - size * 0.35);
    ctx.lineTo(cx, cy + size * 0.35);
    ctx.lineTo(cx + size * 0.15, cy - size * 0.35);
    ctx.lineTo(cx + size * 0.3, cy);
    ctx.lineTo(cx + size * 0.7, cy);
    ctx.stroke();
  } 
  else if (typeId === 3) {
    // 二极管：经典的三角形指向右边，带竖条挡板
    const half = size / 2;
    ctx.beginPath();
    ctx.moveTo(cx - half, cy - half);
    ctx.lineTo(cx - half, cy + half);
    ctx.lineTo(cx + half * 0.3, cy);
    ctx.closePath();
    ctx.stroke();
    // 挡板
    ctx.beginPath();
    ctx.moveTo(cx + half * 0.3, cy - half);
    ctx.lineTo(cx + half * 0.3, cy + half);
    ctx.stroke();
    // 引线
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.8, cy); ctx.lineTo(cx - half, cy);
    ctx.moveTo(cx + half * 0.3, cy); ctx.lineTo(cx + size * 0.8, cy);
    ctx.stroke();
  } 
  else if (typeId === 4) {
    // 天线：一根竖线，往上发散出 3 个横向 V 形折边
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.6);
    ctx.lineTo(cx, cy - size * 0.3);
    // 天线顶端伞
    ctx.moveTo(cx, cy - size * 0.3); ctx.lineTo(cx - size * 0.4, cy - size * 0.7);
    ctx.moveTo(cx, cy - size * 0.3); ctx.lineTo(cx + size * 0.4, cy - size * 0.7);
    // 伞中折
    ctx.moveTo(cx, cy - size * 0.1); ctx.lineTo(cx - size * 0.3, cy - size * 0.4);
    ctx.moveTo(cx, cy - size * 0.1); ctx.lineTo(cx + size * 0.3, cy - size * 0.4);
    ctx.stroke();
  } 
  else if (typeId === 5) {
    // 逻辑门：与非门，左平右半圆弧
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.4, cy - size * 0.45);
    ctx.lineTo(cx - size * 0.4, cy + size * 0.45);
    ctx.lineTo(cx, cy + size * 0.45);
    ctx.arc(cx, cy, size * 0.45, -Math.PI / 2, Math.PI / 2);
    ctx.closePath();
    ctx.stroke();
    // 输出端小泡泡二极极
    ctx.beginPath();
    ctx.arc(cx + size * 0.45 + 3, cy, 2.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  else if (typeId === 6) {
    // 电感电磁线圈：三个环环相扣的横向螺线圈
    ctx.beginPath();
    ctx.arc(cx - size * 0.3, cy, size * 0.25, Math.PI, 0, false);
    ctx.arc(cx, cy, size * 0.25, Math.PI, 0, false);
    ctx.arc(cx + size * 0.3, cy, size * 0.25, Math.PI, 0, false);
    ctx.stroke();
    // 连线引脚
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.55, cy); ctx.lineTo(cx - size * 0.8, cy);
    ctx.moveTo(cx + size * 0.55, cy); ctx.lineTo(cx + size * 0.8, cy);
    ctx.stroke();
  }
  else if (typeId === 7) {
    // 电容：两个平行极板，不相碰
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy - size * 0.5); ctx.lineTo(cx - 3, cy + size * 0.5);
    ctx.moveTo(cx + 3, cy - size * 0.5); ctx.lineTo(cx + 3, cy + size * 0.5);
    // 引线
    ctx.moveTo(cx - 3, cy); ctx.lineTo(cx - size * 0.7, cy);
    ctx.moveTo(cx + 3, cy); ctx.lineTo(cx + size * 0.7, cy);
    ctx.stroke();
  }
  else {
    // 芯片 IC：横置矩形芯片，四角带发光金属斜切面
    ctx.strokeRect(cx - size * 0.6, cy - size * 0.3, size * 1.2, size * 0.6);
    ctx.fillRect(cx - size * 0.4, cy - size * 0.18, size * 0.8, size * 0.36);
  }
  
  ctx.restore();
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.012)';
  ctx.lineWidth = 0.5;
  const gap = 30;
  for (let x = gap; x < canvas.width; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = gap; y < canvas.height; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

// --- 终局控制与结算 ---

function handleGameOver() {
  gameOver = true;
  synth.playGameOver();
  failScoreVal.textContent = score;
  gameOverOverlay.classList.remove('hidden');
}

function handleWin() {
  gameWon = true;
  synth.playWin();
  clearLevelVal.textContent = level; // 设置通关的 Level 数显示
  clearScoreVal.textContent = score;
  stageClearOverlay.classList.remove('hidden');
}

function nextLevel() {
  level++;
  gameWon = false;
  stageClearOverlay.classList.add('hidden');
  
  // 无尽关卡时间加成增量
  let timeBonus = 30; // 简单默认加 30s
  if (difficulty === 'medium') timeBonus = 20;
  else if (difficulty === 'hard') timeBonus = 10;
  
  timeLeft = Math.min(120, timeLeft + timeBonus); // 累加时间，上限 120 秒
  
  buildStage();
  updateUI();
  startTimer();
}

function updateUI() {
  scoreVal.textContent = score;
  levelVal.textContent = level; // 刷新顶栏 Level 数字
  hintVal.textContent = hints;
  shuffleVal.textContent = shuffles;
  
  useHintBtn.disabled = hints <= 0 || activeLaserPath;
  useShuffleBtn.disabled = shuffles <= 0 || activeLaserPath;
}

// --- 游戏环 ---
function updateLoop() {
  if (gameStarted && !gameOver && !gameWon) {
    // 更新粒子
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }
    
    draw();
  }
  requestAnimationFrame(updateLoop);
}

// --- 事件监听与用户操作 ---

// 鼠标/触屏点击图块检测
canvas.addEventListener('mousedown', e => {
  if (!gameStarted || gameOver || gameWon || activeLaserPath) return;
  
  const rect = canvas.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) / rect.width * canvas.width;
  const clickY = (e.clientY - rect.top) / rect.height * canvas.height;
  
  // 计算点击对应的图块坐标 (注意：玩家看到的是实际网格，而数据层是加了一圈空围墙)
  const c = Math.floor((clickX - offsetX) / cellWidth) + 1;
  const r = Math.floor((clickY - offsetY) / cellHeight) + 1;
  
  // 范围界定
  if (r >= 1 && r <= gridRows && c >= 1 && c <= gridCols) {
    // 必须是有效的图块
    if (board[r][c] !== 0) {
      synth.playSelect();
      
      if (!selectedTile) {
        selectedTile = { r, c };
      } else {
        // 如果点的是同一个图块，取消选中
        if (selectedTile.r === r && selectedTile.c === c) {
          selectedTile = null;
        } else {
          // 尝试配对连线
          const path = checkLink(selectedTile.r, selectedTile.c, r, c);
          if (path) {
            // 配对成功！
            handleMatchSuccess(path);
          } else {
            // 连接失败
            synth.playFail();
            // 直接更换选中为当前点击的这只
            selectedTile = { r, c };
          }
        }
      }
    }
  }
});

canvas.addEventListener('touchstart', e => {
  synth.init();
});

// 道具按键绑定
useHintBtn.addEventListener('click', () => {
  getHint();
});

useShuffleBtn.addEventListener('click', () => {
  if (shuffles > 0) {
    shuffleBoard(true);
  }
});

// 难度选择与启动核心绑定
const startEasyBtn = document.getElementById('startEasyBtn');
const startMediumBtn = document.getElementById('startMediumBtn');
const startHardBtn = document.getElementById('startHardBtn');

startEasyBtn.addEventListener('click', () => {
  difficulty = 'easy';
  initGame();
});

startMediumBtn.addEventListener('click', () => {
  difficulty = 'medium';
  initGame();
});

startHardBtn.addEventListener('click', () => {
  difficulty = 'hard';
  initGame();
});

nextLevelBtn.addEventListener('click', () => {
  nextLevel();
});

restartBtn.addEventListener('click', () => {
  initGame();
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

// 启动渲染回路
requestAnimationFrame(updateLoop);
draw();
