/**
 * 华容道 游戏逻辑与合成音效
 */

// --- 8-Bit 古风木石音效合成器 ---
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

  // 棋子移动时的摩擦声 (短促的低通白噪音)
  playSlide() {
    if (this.muted) return;
    this.init();
    try {
      const bufferSize = this.ctx.sampleRate * 0.08;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, this.ctx.currentTime);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      source.start();
    } catch (e) {
      this.playTone(180, 100, 0.08, 'triangle', 0.1);
    }
  }

  // 棋子落位/撞击声 (沉闷的木头相撞声)
  playBump() {
    // 两个极短的低频三角波叠加
    this.playTone(120, 30, 0.08, 'triangle', 0.25);
    setTimeout(() => {
      this.playTone(90, 20, 0.06, 'triangle', 0.15);
    }, 20);
  }

  // 曹操脱逃成功：大气欢快的电子旋律
  playVictory() {
    if (this.muted) return;
    this.init();
    try {
      // 弹奏一段中国古风五声音阶的喜庆和弦琶音 (宫商角徵羽)
      const melody = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // C5 - D5 - E5 - G5 - A5 - C6
      melody.forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, freq * 1.02, 0.25, 'sine', 0.15);
        }, idx * 100);
      });
      // 伴随一个高音和弦
      setTimeout(() => {
        this.playTone(1046.50, 1046.50, 0.4, 'square', 0.08);
        this.playTone(1318.51, 1318.51, 0.4, 'square', 0.08);
      }, 500);
    } catch (e) {}
  }
}

const synth = new AudioSynth();

// --- 游戏配置 ---
const COLS = 4;
const ROWS = 5;

// --- 游戏运行状态 ---
let currentLayout = 'hengdao';
let characters = []; // 当前棋子列表
let steps = 0;
let isWon = false;

// --- DOM 元素绑定 ---
const boardGrid = document.getElementById('boardGrid');
const stepsVal = document.getElementById('stepsVal');
const layoutSelect = document.getElementById('layoutSelect');
const resetBtn = document.getElementById('resetBtn');
const muteBtn = document.getElementById('muteBtn');
const winOverlay = document.getElementById('winOverlay');
const winResetBtn = document.getElementById('winResetBtn');

// --- 占用状态底盘矩阵 ---
// 快速检查某个格子 (r, c) 是否被其他棋子占用
function getOccupiedMatrix(excludeCharId = -1) {
  const matrix = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  characters.forEach(char => {
    if (char.id === excludeCharId) return;
    for (let r = char.y; r < char.y + char.h; r++) {
      for (let c = char.x; c < char.x + char.w; c++) {
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
          matrix[r][c] = true;
        }
      }
    }
  });
  return matrix;
}

// 检查某个棋子在 (targetX, targetY) 处是否会越界或发生碰撞
function checkCollision(char, targetX, targetY, occupiedMatrix) {
  // 越界检查
  if (targetX < 0 || targetX + char.w > COLS || targetY < 0 || targetY + char.h > ROWS) {
    return true;
  }
  // 碰撞检查
  for (let r = targetY; r < targetY + char.h; r++) {
    for (let c = targetX; c < targetX + char.w; c++) {
      if (occupiedMatrix[r][c]) {
        return true;
      }
    }
  }
  return false;
}

// --- 棋子渲染与生成 ---
function renderBoard() {
  boardGrid.innerHTML = '';
  
  characters.forEach(char => {
    const tile = document.createElement('div');
    
    // 生成拼音类名微调切图
    let characterKey = 'soldier';
    if (char.name === '曹操') characterKey = 'caocao';
    else if (char.name === '关羽') characterKey = 'guanyu';
    else if (char.name === '张飞') characterKey = 'zhangfei';
    else if (char.name === '赵云') characterKey = 'zhaoyun';
    else if (char.name === '马超') characterKey = 'machao';
    else if (char.name === '黄忠') characterKey = 'huangzhong';
    
    tile.classList.add('character-tile', `tile-${char.type}`, `tile-${characterKey}`);
    tile.dataset.id = char.id;
    
    // 设置宽高百分比自适应
    tile.style.width = `${char.w * 25}%`;
    tile.style.height = `${char.h * 20}%`;
    
    // 根据当前 (x, y) 网格坐标设置显示位置
    positionTile(tile, char.x, char.y);
    
    const inner = document.createElement('div');
    inner.classList.add('tile-inner');
    inner.textContent = char.name;
    
    tile.appendChild(inner);
    boardGrid.appendChild(tile);
    char.element = tile;
    
    // 绑定交互事件 (拖拽与点击)
    setupTileInteraction(char);
  });
}

function positionTile(el, x, y) {
  el.style.left = `${x * 25}%`;
  el.style.top = `${y * 20}%`;
}

// --- 鼠标/触屏拖拽与点击手势交互 ---
function setupTileInteraction(char) {
  const el = char.element;
  
  let startX = 0;
  let startY = 0;
  let startLeftPercent = 0;
  let startTopPercent = 0;
  let isDragging = false;
  
  // 轨道限制范围 (格数)
  let minX = char.x;
  let maxX = char.x;
  let minY = char.y;
  let maxY = char.y;

  // 点击触发智能滑行 (不需要拖拽，直接朝唯一空位滑)
  el.addEventListener('click', e => {
    if (isDragging) return;
    tryMoveSmart(char);
  });

  // 全局事件声明，以便解绑
  const onMouseMove = (e) => {
    onDragMove(e.clientX, e.clientY);
  };

  const onMouseUp = () => {
    onDragEnd();
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  const onTouchMove = (e) => {
    if (e.touches.length !== 1) return;
    e.preventDefault(); // 阻止页面滑动以确保拖拽流畅
    onDragMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const onTouchEnd = () => {
    onDragEnd();
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
  };

  const onDragStart = (clientX, clientY) => {
    if (isWon) return;
    synth.init();
    
    isDragging = false;
    startX = clientX;
    startY = clientY;
    startLeftPercent = char.x * 25;
    startTopPercent = char.y * 20;
    
    // 计算当前可滑动的轨道格点界限
    const occupied = getOccupiedMatrix(char.id);
    
    // 往左找最大空挡
    let tx = char.x - 1;
    while (tx >= 0 && !checkCollision(char, tx, char.y, occupied)) {
      tx--;
    }
    minX = tx + 1;
    
    // 往右找最大空挡
    tx = char.x + 1;
    while (tx + char.w <= COLS && !checkCollision(char, tx, char.y, occupied)) {
      tx++;
    }
    maxX = tx - 1;
    
    // 往上找最大空挡
    let ty = char.y - 1;
    while (ty >= 0 && !checkCollision(char, char.x, ty, occupied)) {
      ty--;
    }
    minY = ty + 1;
    
    // 往下找最大空挡
    ty = char.y + 1;
    while (ty + char.h <= ROWS && !checkCollision(char, char.x, ty, occupied)) {
      ty++;
    }
    maxY = ty - 1;
    
    el.classList.add('dragging');
  };

  const onDragMove = (clientX, clientY) => {
    if (!el.classList.contains('dragging')) return;
    
    const dx = clientX - startX;
    const dy = clientY - startY;
    
    // 设定判定拖动的防抖阈值 (超过 5 像素判定为拖拽)
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      isDragging = true;
    }
    
    const boardW = boardGrid.clientWidth;
    const boardH = boardGrid.clientHeight;
    
    // 换算成相对于起始点的百分比位移
    const percentDx = (dx / boardW) * 100;
    const percentDy = (dy / boardH) * 100;
    
    let targetLeft = startLeftPercent;
    let targetTop = startTopPercent;
    
    const canMoveX = maxX > minX;
    const canMoveY = maxY > minY;
    
    if (canMoveX && !canMoveY) {
      // 只能横向移动
      targetLeft = startLeftPercent + percentDx;
      // 限制在可达到的网格百分比内
      targetLeft = Math.max(minX * 25, Math.min(maxX * 25, targetLeft));
    } else if (!canMoveX && canMoveY) {
      // 只能纵向移动
      targetTop = startTopPercent + percentDy;
      targetTop = Math.max(minY * 20, Math.min(maxY * 20, targetTop));
    } else if (canMoveX && canMoveY) {
      // 如果处于十字路口，两个方向都可移，根据滑动的偏好轴来锁定
      if (Math.abs(dx) > Math.abs(dy)) {
        targetLeft = startLeftPercent + percentDx;
        targetLeft = Math.max(minX * 25, Math.min(maxX * 25, targetLeft));
      } else {
        targetTop = startTopPercent + percentDy;
        targetTop = Math.max(minY * 20, Math.min(maxY * 20, targetTop));
      }
    }
    
    // 实时更新绝对位置，达到跟手滑动的效果
    el.style.left = `${targetLeft}%`;
    el.style.top = `${targetTop}%`;
  };

  const onDragEnd = () => {
    if (!el.classList.contains('dragging')) return;
    el.classList.remove('dragging');
    
    // 获取当前滑到的位置百分比
    const currentLeftPercent = parseFloat(el.style.left);
    const currentTopPercent = parseFloat(el.style.top);
    
    // 舍入到最接近的合法格子坐标
    const finalX = Math.round(currentLeftPercent / 25);
    const finalY = Math.round(currentTopPercent / 20);
    
    const hasMoved = finalX !== char.x || finalY !== char.y;
    
    if (hasMoved) {
      char.x = finalX;
      char.y = finalY;
      steps++;
      stepsVal.textContent = steps;
      
      synth.playSlide();
      synth.playBump();
      
      checkWin();
    }
    
    // 无论移没移动，都将棋子精准弹回当前格子
    positionTile(el, char.x, char.y);
    
    // 延时清除拖动标志，确保不会误触点击事件
    setTimeout(() => {
      isDragging = false;
    }, 50);
  };

  // --- PC 端事件绑定 ---
  el.addEventListener('mousedown', e => {
    e.preventDefault();
    onDragStart(e.clientX, e.clientY);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });

  // --- 移动触屏事件绑定 ---
  el.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    onDragStart(e.touches[0].clientX, e.touches[0].clientY);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
  });
}

// --- 辅助点击智能滑动逻辑 ---
// 当玩家双击或点击棋子时，若其相邻方向有唯一的合法空位容纳它，则自动飘过去
function tryMoveSmart(char) {
  if (isWon) return;
  
  const occupied = getOccupiedMatrix(char.id);
  const directions = [
    { x: 0, y: -1 }, // 上
    { x: 1, y: 0 },  // 右
    { x: 0, y: 1 },  // 下
    { x: -1, y: 0 }  // 左
  ];
  
  const validMoves = [];
  directions.forEach(dir => {
    const targetX = char.x + dir.x;
    const targetY = char.y + dir.y;
    if (!checkCollision(char, targetX, targetY, occupied)) {
      validMoves.push({ x: targetX, y: targetY });
    }
  });
  
  // 如果有且仅有一个空挡可以直接飘移
  if (validMoves.length === 1) {
    const dest = validMoves[0];
    char.x = dest.x;
    char.y = dest.y;
    steps++;
    stepsVal.textContent = steps;
    
    // 开通 transition 平滑滑行
    char.element.style.transition = 'left 0.15s ease-out, top 0.15s ease-out';
    positionTile(char.element, char.x, char.y);
    
    synth.playSlide();
    
    setTimeout(() => {
      // 播放撞击音，并重置 transition 以免影响拖拽灵敏度
      synth.playBump();
      char.element.style.transition = 'transform 0.1s ease-out';
      checkWin();
    }, 150);
  }
}

// --- 初始化布局配置 ---
function initGame() {
  steps = 0;
  stepsVal.textContent = '0';
  isWon = false;
  winOverlay.classList.add('hidden');
  
  // 浅拷贝克隆阵型数据，并赋予递增唯一 ID
  characters = window.GAME_LAYOUTS[currentLayout].map((item, idx) => ({
    ...item,
    id: idx
  }));
  
  renderBoard();
  synth.init();
}

// --- 胜利通关检测 ---
// 曹操 (w=2, h=2) 的目标是到达 (x=1, y=3) 并且其底下可以再向下滑一格（在传统中也就是其占满了最底下两格 1,3 和 2,4，且处于底部出口）
function checkWin() {
  const caocao = characters.find(c => c.type === 'caocao');
  if (caocao && caocao.x === 1 && caocao.y === 3) {
    isWon = true;
    synth.playVictory();
    winOverlay.classList.remove('hidden');
  }
}

// --- 选项与控制按钮监听 ---

// 切换阵型
layoutSelect.addEventListener('change', e => {
  currentLayout = e.target.value;
  initGame();
});

// 重置与再战
resetBtn.addEventListener('click', initGame);
winResetBtn.addEventListener('click', initGame);

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

// 一键开箱
initGame();
