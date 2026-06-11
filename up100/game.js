/**
 * Up100 - 是男人就上100层核心攀爬逻辑与合成音效
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

  // 普通踩板起跳音
  playJump() {
    this.playTone(400, 800, 0.08, 'sine', 0.15);
  }

  // 弹簧强力超跳音
  playSpring() {
    this.playTone(300, 1300, 0.25, 'triangle', 0.18);
  }

  // 易碎踏板断裂沙沙声
  playBreak() {
    if (this.muted) return;
    this.init();
    try {
      // 用方波加快速衰变模拟破裂声
      this.playTone(180, 50, 0.12, 'square', 0.2);
    } catch (e) {}
  }

  // 踩尖刺扣血警告声
  playHurt() {
    if (this.muted) return;
    this.init();
    try {
      this.playTone(800, 200, 0.15, 'sawtooth', 0.25);
    } catch (e) {}
  }

  // 突破 100 层胜利赞歌
  playWin() {
    if (this.muted) return;
    this.init();
    try {
      const scale = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      scale.forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, freq * 1.02, 0.22, 'sine', 0.15);
        }, idx * 90);
      });
    } catch (e) {}
  }

  // 坠落 GG 音
  playGameOver() {
    this.playTone(220, 40, 0.6, 'sawtooth', 0.3);
  }
}

const synth = new AudioSynth();

// --- 游戏主配置与变量 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const floorVal = document.getElementById('floorVal');
const bestVal = document.getElementById('bestVal');
const livesVal = document.getElementById('livesVal');

const startOverlay = document.getElementById('startOverlay');
const gameWinOverlay = document.getElementById('gameWinOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');

const startBtn = document.getElementById('startBtn');
const keepGoingBtn = document.getElementById('keepGoingBtn');
const winRestartBtn = document.getElementById('winRestartBtn');
const restartBtn = document.getElementById('restartBtn');
const muteBtn = document.getElementById('muteBtn');

// 物理常量
const GRAVITY = 0.28;
const PLAYER_SPEED_NORMAL = 0.8;
const PLAYER_SPEED_ICY = 0.2; // 冰面阻尼低，需要小一点的控制力
const FRICTION_NORMAL = 0.82;
const FRICTION_ICY = 0.98;   // 溜冰摩擦力极小

// --- 游戏运行状态变量 ---
let scoreFloor = 1; // 当前层数
let bestFloor = 1;  // 最高纪录
let lives = 3;      // 生命值 HP
let gameOver = false;
let gameWon = false;
let gameStarted = false;
let keepGoing = false; // 突破 100 层后继续

let worldY = 0; // 玩家攀爬的世界总高度 (像素)
let nextPlatformY = 0; // 下一个生成平台的 y 坐标
let backgroundYOffset = 0; // 星空背景随镜头移动偏差

// 实体对象
let player = {
  x: 0,
  y: 0,
  width: 24,
  height: 24,
  vx: 0,
  vy: 0,
  isIcy: false // 当前是否处于冰面滑行惯性状态
};

let platforms = [];
let particles = []; // 踏板碎裂或弹起火花粒子

// 键盘与鼠标/手势交互状态
let keys = {};
let mouseX = null;

// 蓄力跳跃状态变量
let isCharging = false;
let chargeValue = 0;
let playerEnergy = 1.0; // 能量上限 1.0 (100%)
let onPlatform = null; // 记录当前踩着的板子
let spacePressed = false; // 空格蓄力按键状态
let mousePressed = false; // 鼠标长按状态

// --- 初始化与世界构建 ---
function initGame() {
  scoreFloor = 1;
  lives = 3;
  gameOver = false;
  gameWon = false;
  gameStarted = true;
  keepGoing = false;
  
  isCharging = false;
  chargeValue = 0;
  playerEnergy = 1.0; // 初始化能量
  onPlatform = null;
  spacePressed = false;
  mousePressed = false;
  
  worldY = 0;
  nextPlatformY = canvas.height - 20;
  backgroundYOffset = 0;
  
  loadBestRecord();
  updateUI();
  
  platforms = [];
  particles = [];
  
  // 1. 初始化底座地面（保证开局必定能踩上）
  buildInitialPlatforms();
  
  // 2. 放置玩家在底座中央
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - 80;
  player.vx = 0;
  player.vy = 0;
  player.isIcy = false;
  
  // 隐藏遮罩
  startOverlay.classList.add('hidden');
  gameWinOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  
  synth.init();
}

function loadBestRecord() {
  const saved = localStorage.getItem('up100_best');
  bestFloor = saved ? parseInt(saved, 10) : 1;
  bestVal.textContent = `${bestFloor}F`;
}

function updateUI() {
  floorVal.textContent = `${scoreFloor}F`;
  livesVal.textContent = lives;
  if (scoreFloor > bestFloor) {
    bestFloor = scoreFloor;
    bestVal.textContent = `${bestFloor}F`;
    localStorage.setItem('up100_best', bestFloor);
  }
}

// 初始地面铺设
function buildInitialPlatforms() {
  // 1. 生成一块铺满底部的巨型安全底盘地面
  platforms.push({
    x: 0,
    y: canvas.height - 15,
    width: canvas.width,
    height: 15,
    type: 'normal',
    vx: 0,
    state: 'ready',
    pulse: 0
  });
  
  // 2. 往上均布 5 层普通踏板，方便玩家向上攀登
  const count = 5;
  const step = (canvas.height - 80) / count;
  for (let i = 0; i < count; i++) {
    const py = canvas.height - 80 - i * step;
    const px = Math.random() * (canvas.width - 70);
    platforms.push({
      x: px,
      y: py,
      width: 70,
      height: 10,
      type: 'normal',
      vx: 0,
      state: 'ready',
      pulse: 0
    });
  }
  nextPlatformY = canvas.height - 80 - count * step;
}

// --- 动态平台分布生成器 (难度增高核心) ---
// 根据当前高度层数，随机出不同的恶心板子，并逐渐拉大平台纵向间距
function generateNewPlatform() {
  const currentFloor = scoreFloor;
  let pType = 'normal';
  let pWidth = 65;
  let pVx = 0;
  
  // 1. 难度阶梯划分
  const rand = Math.random();
  
  if (currentFloor < 20) {
    // 简单区：大部分普通板，少许易碎和弹簧
    if (rand < 0.7) pType = 'normal';
    else if (rand < 0.85) pType = 'spring';
    else pType = 'fragile';
  } 
  else if (currentFloor < 50) {
    // 普通区：加入移动板、冰滑板
    pWidth = 60;
    if (rand < 0.45) pType = 'normal';
    else if (rand < 0.6) pType = 'spring';
    else if (rand < 0.75) pType = 'fragile';
    else if (rand < 0.9) {
      pType = 'moving';
      pVx = (Math.random() < 0.5 ? -1.2 : 1.2) * (1 + level * 0.1);
    } else {
      pType = 'ice';
    }
  } 
  else if (currentFloor < 80) {
    // 困难区：开始出现尖刺，易碎变多，板子变窄
    pWidth = 55;
    if (rand < 0.25) pType = 'normal';
    else if (rand < 0.4) pType = 'spring';
    else if (rand < 0.65) pType = 'fragile';
    else if (rand < 0.8) {
      pType = 'moving';
      pVx = (Math.random() < 0.5 ? -1.8 : 1.8);
    } 
    else if (rand < 0.9) pType = 'ice';
    else pType = 'spike';
  } 
  else {
    // 噩梦区 (>80F)：普通踏板极罕见，尖刺与易碎为主流，板子最窄
    pWidth = 50;
    if (rand < 0.08) pType = 'normal';
    else if (rand < 0.22) pType = 'spring';
    else if (rand < 0.55) pType = 'fragile';
    else if (rand < 0.75) {
      pType = 'moving';
      pVx = (Math.random() < 0.5 ? -2.4 : 2.4);
    } 
    else if (rand < 0.85) pType = 'ice';
    else pType = 'spike';
  }
  
  // 2. 纵向步长间隙设计 (随难度加大，最小和最大跳跃步长同步变宽)
  const minGap = Math.min(30 + currentFloor * 0.8, 80);
  const maxGap = Math.min(70 + currentFloor * 1.2, 135); // 理论角色单次普通起跳能冲 160 像素
  const gap = minGap + Math.random() * (maxGap - minGap);
  
  nextPlatformY -= gap;
  
  // 随机横坐标
  const px = Math.random() * (canvas.width - pWidth);
  
  platforms.push({
    x: px,
    y: nextPlatformY,
    width: pWidth,
    height: 10,
    type: pType,
    vx: pVx,
    state: 'ready',
    pulse: 0
  });
}

// --- 物理引擎与碰撞 ---

function updatePhysics() {
  // 蓄力条件：按下了蓄力键，并且当前能量充足（大于5%方可启动蓄力）
  const isInputCharging = (spacePressed || mousePressed) && playerEnergy > 0.05;
  
  if (onPlatform) {
    // 1. 粘在踏板表面，垂直速度清零
    player.vy = 0;
    player.y = onPlatform.y - player.height;
    
    // 如果踏板是左右移动板，跟着它漂移
    if (onPlatform.type === 'moving') {
      player.x += onPlatform.vx;
    }
    
    if (isInputCharging) {
      isCharging = true;
      // 蓄力值增加，能量同步快速消耗（大约0.6秒耗尽能量）
      chargeValue = Math.min(1.0, chargeValue + 0.025);
      playerEnergy = Math.max(0, playerEnergy - 0.025);
      
      // 产生能量汇聚粒子
      if (Math.random() < 0.25) {
        spawnChargeParticle();
      }
      player.vx = 0; // 蓄力时锁定横向速度
      
      // 如果能量消耗殆尽，强制释放蓄力跳
      if (playerEnergy <= 0) {
        releaseChargeJump();
      }
    } else {
      if (isCharging) {
        // 松开按键释放蓄力超跳！
        releaseChargeJump();
      } else {
        // 自动起跳
        executePlatformLand(onPlatform);
        onPlatform = null;
      }
      // 不蓄力时，能量自动缓慢恢复
      playerEnergy = Math.min(1.0, playerEnergy + 0.005);
    }
  } else {
    isCharging = false;
    chargeValue = 0;
    // 空中跳跃期间也自动缓慢恢复能量
    playerEnergy = Math.min(1.0, playerEnergy + 0.003);
  }

  // 2. 角色左右移动 (只有当不进行蓄力时才受控制)
  if (!isCharging) {
    const currentFriction = player.isIcy ? FRICTION_ICY : FRICTION_NORMAL;
    const currentAccel = player.isIcy ? PLAYER_SPEED_ICY : PLAYER_SPEED_NORMAL;
    
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
      player.vx -= currentAccel;
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
      player.vx += currentAccel;
    }
    
    // 鼠标/触屏平滑跟随，降低灵敏度，增加单帧最大位移加速度限制
    if (mouseX !== null) {
      const diff = mouseX - (player.x + player.width / 2);
      let targetVx = diff * (player.isIcy ? 0.006 : 0.02); // 灵敏度非冰面降低至 0.02，冰面降低至 0.006
      const maxMoveAccel = 0.45; // 限制单帧最大加速度增量
      targetVx = Math.max(-maxMoveAccel, Math.min(maxMoveAccel, targetVx));
      player.vx += targetVx;
    }
    
    player.vx *= currentFriction;
    player.x += player.vx;
  } else {
    player.vx = 0;
  }
  
  // 左右边缘穿越 (Wrap around)
  if (player.x + player.width < 0) {
    player.x = canvas.width;
  } else if (player.x > canvas.width) {
    player.x = -player.width;
  }
  
  // 3. 重力与垂直运动 (当处于踏板粘滞期时不施加重力)
  if (!onPlatform) {
    player.vy += GRAVITY;
    player.y += player.vy;
  }
  
  // 3. 镜头平滑随动：如果玩家跳过了屏幕中线，就将世界镜头整体上滑
  if (player.y < canvas.height / 2) {
    const diff = canvas.height / 2 - player.y;
    player.y = canvas.height / 2;
    
    // 更新世界总高度与层数结算 (每 110 像素定义为 1 层)
    worldY += diff;
    scoreFloor = Math.floor(worldY / 110) + 1;
    updateUI();
    
    // 背景星空偏移
    backgroundYOffset = (backgroundYOffset + diff * 0.4) % canvas.height;
    
    // 所有的平台同步下沉
    platforms.forEach(p => p.y += diff);
    nextPlatformY += diff;
    
    // 碎片粒子同步下沉
    particles.forEach(p => p.y += diff);
    
    // 触发通关 100 层结算
    if (scoreFloor >= 100 && !gameWon && !keepGoing) {
      handleWin();
    }
  }

  // 4. 100层以上的“板块崩塌塌陷”效果
  if (scoreFloor >= 100) {
    // 平台随时间流逝自动向下下沉，下沉速度随高度递增
    const collapseSpeed = Math.min(2.5, 0.4 + (scoreFloor - 100) * 0.05);
    platforms.forEach(p => p.y += collapseSpeed);
    nextPlatformY += collapseSpeed;
    player.y += collapseSpeed; // 角色也受下沉惯性拖累
  }
  
  // 5. 动态补给新平台，回收底部过期平台
  while (nextPlatformY > -100) {
    generateNewPlatform();
  }
  
  // 回收底部出界的平台
  for (let i = platforms.length - 1; i >= 0; i--) {
    if (platforms[i].y > canvas.height + 50) {
      platforms.splice(i, 1);
    }
  }

  // 6. 踏板碰撞判定 (必须是向下坠落状态方可踩踏反弹)
  if (player.vy > 0) {
    checkPlatformCollisions();
  }

  // 7. 坠地 GG 检测
  if (player.y - player.height > canvas.height) {
    handleDropOut();
  }

  // 8. 移动平台的平滑移动
  platforms.forEach(p => {
    if (p.type === 'moving') {
      p.x += p.vx;
      if (p.x <= 0) {
        p.x = 0;
        p.vx = -p.vx;
      } else if (pxMax = canvas.width - p.width, p.x >= pxMax) {
        p.x = pxMax;
        p.vx = -p.vx;
      }
    }
  });

  // 9. 更新粒子
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.alpha -= p.decay;
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }
}

// 踩踏碰撞判定
function checkPlatformCollisions() {
  for (let i = platforms.length - 1; i >= 0; i--) {
    const p = platforms[i];
    if (p.state === 'broken') continue; // 忽视已经碎裂的板子
    
    // 碰撞边界框交叉检测
    if (player.x + player.width - 4 >= p.x &&
        player.x + 4 <= p.x + p.width &&
        player.y + player.height >= p.y &&
        player.y + player.height - player.vy <= p.y + p.height + 4) {
          
      // 触底落脚判定成功！不再直接起跳，而是粘在板子上等待下一帧物理更新决定是蓄力跳还是自动跳
      onPlatform = p;
      break;
    }
  }
}

function executePlatformLand(p, index) {
  switch (p.type) {
    case 'normal':
      player.vy = -7.6;
      player.isIcy = false;
      synth.playJump();
      spawnJumpParticles(player.x + player.width / 2, player.y + player.height, '#39ff14');
      break;
      
    case 'spring':
      player.vy = -14.8; // 超强弹跳
      player.isIcy = false;
      synth.playSpring();
      p.pulse = 12; // 触动黄板压缩动画
      spawnJumpParticles(player.x + player.width / 2, player.y + player.height, '#fee440', 25);
      break;
      
    case 'fragile':
      // 易碎红色板，踩中后触发碎裂定时
      player.vy = -7.6;
      player.isIcy = false;
      p.state = 'broken';
      
      synth.playBreak();
      spawnBreakParticles(p);
      
      // 0.15 秒后彻底移除
      setTimeout(() => {
        const idx = platforms.indexOf(p);
        if (idx !== -1) {
          platforms.splice(idx, 1);
        }
      }, 150);
      break;
      
    case 'moving':
      player.vy = -7.6;
      player.isIcy = false;
      synth.playJump();
      spawnJumpParticles(player.x + player.width / 2, player.y + player.height, '#00bbf9');
      break;
      
    case 'ice':
      player.vy = -7.6;
      player.isIcy = true; // 开启低阻力打滑模式
      synth.playJump();
      spawnJumpParticles(player.x + player.width / 2, player.y + player.height, '#00f5d4');
      break;
      
    case 'spike':
      // 踩尖刺扣血
      player.vy = -6.2; // 略微回弹以避免持续扎刺
      player.isIcy = false;
      lives--;
      updateUI();
      synth.playHurt();
      spawnJumpParticles(player.x + player.width / 2, player.y + player.height, '#ff007f', 12);
      
      if (lives <= 0) {
        handleGameOver();
      }
      break;
  }
}

// 坠入深渊处理 (掉到底端外)
function handleDropOut() {
  lives = 0;
  updateUI();
  synth.playGameOver();
  handleGameOver();
}

// --- 蓄力与跳跃释放核心逻辑 ---

// 汇聚到玩家中心的蓄力粒子
function spawnChargeParticle() {
  const px = player.x + player.width / 2;
  const py = player.y + player.height / 2;
  // 随机在角色外围一个圆圈上生成，然后往中心收缩
  const angle = Math.random() * Math.PI * 2;
  const dist = 20 + Math.random() * 20;
  const startX = px + Math.cos(angle) * dist;
  const startY = py + Math.sin(angle) * dist;
  
  particles.push({
    x: startX,
    y: startY,
    // 速度指向中心
    vx: (px - startX) * 0.08,
    vy: (py - startY) * 0.08,
    gravity: 0,
    radius: 1 + Math.random() * 2,
    color: '#00f5d4',
    alpha: 0.9,
    decay: 0.04
  });
}

// 释放蓄力跳跃
function releaseChargeJump() {
  if (!onPlatform) {
    isCharging = false;
    chargeValue = 0;
    return;
  }
  
  // 基础弹跳是 -7.6，满蓄力可以让弹跳达到 -13.5
  let jumpForce = -7.6 - (chargeValue * 5.9);
  let p = onPlatform;
  
  // 如果踩在不同类型的平台，释放蓄力会有不同的效果
  switch (p.type) {
    case 'spring':
      // 弹簧板上蓄力：超级大跳 (最大 -20)
      jumpForce = -14.8 - (chargeValue * 5.2);
      p.pulse = 15;
      synth.playSpring();
      spawnJumpParticles(player.x + player.width / 2, player.y + player.height, '#fee440', 30);
      break;
      
    case 'fragile':
      // 踩在易碎板上蓄力：还没释放就可能直接把板子踩碎了，或者释放的瞬间必定踩碎
      p.state = 'broken';
      synth.playBreak();
      spawnBreakParticles(p);
      setTimeout(() => {
        const idx = platforms.indexOf(p);
        if (idx !== -1) platforms.splice(idx, 1);
      }, 150);
      synth.playJump();
      spawnJumpParticles(player.x + player.width / 2, player.y + player.height, '#ff007f', 15);
      break;
      
    case 'spike':
      // 尖刺蓄力跳：自残行为，扣血并回弹
      lives--;
      updateUI();
      synth.playHurt();
      jumpForce = -6.2 - (chargeValue * 3.0);
      spawnJumpParticles(player.x + player.width / 2, player.y + player.height, '#ff007f', 20);
      if (lives <= 0) {
        handleGameOver();
      }
      break;
      
    case 'ice':
      synth.playJump();
      player.isIcy = true;
      spawnJumpParticles(player.x + player.width / 2, player.y + player.height, '#00f5d4', 20);
      break;
      
    default:
      synth.playJump();
      spawnJumpParticles(player.x + player.width / 2, player.y + player.height, '#39ff14', 20);
      break;
  }
  
  // 蓄力声音高频变化
  if (chargeValue > 0.2) {
    synth.playTone(300 + chargeValue * 500, 900 + chargeValue * 300, 0.15 + chargeValue * 0.1, 'sine', 0.2);
  }
  
  player.vy = jumpForce;
  onPlatform = null;
  isCharging = false;
  chargeValue = 0;
}

// --- 粒子系统生成器 ---

function spawnJumpParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: Math.random() * 4 - 2,
      vy: Math.random() * 2,
      gravity: 0.05,
      radius: 1 + Math.random() * 1.5,
      color,
      alpha: 0.8,
      decay: 0.03 + Math.random() * 0.02
    });
  }
}

function spawnBreakParticles(p) {
  const count = 12;
  const cx = p.x + p.width / 2;
  const cy = p.y + p.height / 2;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: p.x + Math.random() * p.width,
      y: p.y + Math.random() * p.height,
      vx: Math.random() * 4 - 2,
      vy: Math.random() * 3 - 3, // 向上喷开
      gravity: 0.1, // 重力明显下落
      radius: 1.5 + Math.random() * 2,
      color: '#ff007f', // 红色木板碎屑
      alpha: 1.0,
      decay: 0.04 + Math.random() * 0.03
    });
  }
}


// --- 渲染渲染系统 ---

// 各色地面色值样式定义
const PLATFORM_STYLES = {
  normal: { main: '#39ff14', shadow: 'rgba(57, 255, 20, 0.4)' },
  spring: { main: '#fee440', shadow: 'rgba(254, 228, 64, 0.4)' },
  fragile: { main: '#ff007f', shadow: 'rgba(255, 0, 127, 0.4)' },
  moving: { main: '#00bbf9', shadow: 'rgba(0, 187, 249, 0.4)' },
  ice: { main: '#00f5d4', shadow: 'rgba(0, 245, 212, 0.4)' },
  spike: { main: '#ff007f', shadow: 'rgba(255, 0, 127, 0.4)' }
};

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 1. 渲染背景格线及随世界高度平移的太空虚线
  drawSpaceBackground();

  // 2. 渲染平台
  platforms.forEach(p => {
    ctx.save();
    const style = PLATFORM_STYLES[p.type];
    
    // 如果是易碎面板发生破碎，画半透明闪烁
    if (p.state === 'broken') {
      ctx.globalAlpha = 0.3;
    }
    
    ctx.shadowColor = style.shadow;
    ctx.shadowBlur = 8;
    ctx.fillStyle = style.main;
    
    // 绘制圆角小板子
    const r = 3;
    ctx.beginPath();
    ctx.moveTo(p.x + r, p.y);
    ctx.lineTo(p.x + p.width - r, p.y);
    ctx.quadraticCurveTo(p.x + p.width, p.y, p.x + p.width, p.y + r);
    ctx.lineTo(p.x + p.width, p.y + p.height - r);
    ctx.quadraticCurveTo(p.x + p.width, p.y + p.height, p.x + p.width - r, p.y + p.height);
    ctx.lineTo(p.x + r, p.y + p.height);
    ctx.quadraticCurveTo(p.x, p.y + p.height, p.x, p.y + p.height - r);
    ctx.lineTo(p.x, p.y + r);
    ctx.quadraticCurveTo(p.x, p.y, p.x + r, p.y);
    ctx.closePath();
    ctx.fill();
    
    // 额外绘制平台特色组件 (例如弹簧、尖刺)
    if (p.type === 'spring') {
      drawSpringIcon(p);
    } else if (p.type === 'spike') {
      drawSpikeIcon(p);
    }
    
    ctx.restore();
  });

  // 3. 绘制粒子
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 4. 绘制玩家角色 (闪闪发光的赛博小方块，蓄力时会有压扁果冻效果)
  ctx.save();
  
  // 计算蓄力下的拉伸和压缩比例
  // 满蓄力(chargeValue=1.0)时，高度压缩到原来的 0.65 倍，宽度拉伸到原来的 1.3 倍
  const scaleX = 1 + chargeValue * 0.3;
  const scaleY = 1 - chargeValue * 0.35;
  
  const cx = player.x + player.width / 2;
  const cy = player.y + player.height; // 以脚底为缩放中心
  
  // 应用矩阵变换
  ctx.translate(cx, cy);
  ctx.scale(scaleX, scaleY);
  ctx.translate(-cx, -cy);
  
  ctx.shadowColor = '#00f5d4';
  ctx.shadowBlur = 10 + chargeValue * 15; // 蓄力越大光晕越猛
  
  // 渐变质感
  const playerGrad = ctx.createLinearGradient(player.x, player.y, player.x + player.width, player.y + player.height);
  playerGrad.addColorStop(0, '#fff');
  playerGrad.addColorStop(0.5, '#00f5d4');
  playerGrad.addColorStop(1, '#9d4edd');
  
  ctx.fillStyle = playerGrad;
  
  // 绘制圆角小玩家
  const pr = 6;
  ctx.beginPath();
  ctx.moveTo(player.x + pr, player.y);
  ctx.lineTo(player.x + player.width - pr, player.y);
  ctx.quadraticCurveTo(player.x + player.width, player.y, player.x + player.width, player.y + pr);
  ctx.lineTo(player.x + player.width, player.y + player.height - pr);
  ctx.quadraticCurveTo(player.x + player.width, player.y + player.height, player.x + player.width - pr, player.y + player.height);
  ctx.lineTo(player.x + pr, player.y + player.height);
  ctx.quadraticCurveTo(player.x, player.y + player.height, player.x, player.y + player.height - pr);
  ctx.lineTo(player.x, player.y + pr);
  ctx.quadraticCurveTo(player.x, player.y, player.x + pr, player.y);
  ctx.closePath();
  ctx.fill();
  
  // 勾勒发光轮廓
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  ctx.restore();

  // 5. 如果正在蓄力，在角色头顶上方绘制一条亮眼的霓虹蓄力条
  if (isCharging && chargeValue > 0) {
    ctx.save();
    const barW = 32;
    const barH = 5;
    const bx = player.x + player.width / 2 - barW / 2;
    const by = player.y - 12;
    
    // 背景暗槽
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(bx, by, barW, barH);
    
    // 发光进度
    const progressW = barW * chargeValue;
    const grad = ctx.createLinearGradient(bx, by, bx + barW, by);
    grad.addColorStop(0, '#00f5d4');
    grad.addColorStop(0.7, '#fee440');
    grad.addColorStop(1, '#ff007f');
    
    ctx.shadowColor = '#00f5d4';
    ctx.shadowBlur = 6;
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, progressW, barH);
    ctx.restore();
  }

  // 6. 绘制玩家能量条 (在玩家正上方，比蓄力进度条更靠上一点)
  // 如果没有在蓄力，或者能量不足 100%，我们画一个发光的蓝色能量条，代表当前的储能
  if (!isCharging || playerEnergy < 1.0) {
    ctx.save();
    const barW = 32;
    const barH = 3;
    const bx = player.x + player.width / 2 - barW / 2;
    const by = player.y - 18; // 位于蓄力进度条的上方
    
    // 背景暗槽
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(bx, by, barW, barH);
    
    // 能量值进度 (亮蓝色)
    const energyW = barW * playerEnergy;
    ctx.shadowColor = '#00bbf9';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#00bbf9';
    ctx.fillRect(bx, by, energyW, barH);
    ctx.restore();
  }
}

function drawSpaceBackground() {
  // 绘制纵向卷轴网格，营造攀爬感
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.018)';
  ctx.lineWidth = 0.5;
  const gap = 40;
  for (let x = gap; x < canvas.width; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  
  // 滚动星空背景
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  
  // 静态生成几个星光点，位置跟 backgroundYOffset 做平移
  const stars = [
    { x: 50, y: 100 }, { x: 180, y: 50 }, { x: 320, y: 150 },
    { x: 90, y: 280 }, { x: 270, y: 220 }, { x: 140, y: 400 },
    { x: 350, y: 350 }, { x: 210, y: 460 }
  ];
  
  stars.forEach(s => {
    const py = (s.y + backgroundYOffset) % canvas.height;
    ctx.beginPath();
    ctx.arc(s.x, py, 1.2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

// 绘制弹簧微图标
function drawSpringIcon(p) {
  ctx.save();
  ctx.strokeStyle = '#fee440';
  ctx.lineWidth = 1.5;
  
  // 弹簧动态压缩高度计算
  let springH = 7;
  if (p.pulse > 0) {
    springH = 3;
    p.pulse--; // 逐渐复原
  }
  
  const cx = p.x + p.width / 2;
  const topY = p.y - springH;
  
  ctx.beginPath();
  ctx.moveTo(cx - 6, p.y);
  ctx.lineTo(cx + 6, p.y);
  // 画几折折线模拟弹簧
  ctx.lineTo(cx - 4, p.y - springH * 0.4);
  ctx.lineTo(cx + 4, p.y - springH * 0.7);
  ctx.lineTo(cx - 5, topY);
  ctx.lineTo(cx + 5, topY);
  ctx.stroke();
  
  ctx.restore();
}

// 绘制板上尖刺
function drawSpikeIcon(p) {
  ctx.save();
  ctx.fillStyle = '#ff007f';
  
  // 在板面上均匀画 5 个红色的三角形小刺
  const spikeCount = 5;
  const step = p.width / spikeCount;
  for (let i = 0; i < spikeCount; i++) {
    const sx = p.x + i * step + step / 2;
    ctx.beginPath();
    ctx.moveTo(sx - 3, p.y);
    ctx.lineTo(sx + 3, p.y);
    ctx.lineTo(sx, p.y - 6); // 尖刺顶峰向上 6 像素
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// --- 游戏环 (Loop) ---
function updateLoop() {
  if (gameStarted && !gameOver && !gameWon) {
    updatePhysics();
    draw();
  }
  requestAnimationFrame(updateLoop);
}

// --- 终局控制逻辑 ---

function handleGameOver() {
  gameOver = true;
  synth.playGameOver();
  gameOverOverlay.classList.remove('hidden');
}

function handleWin() {
  gameWon = true;
  synth.playWin();
  gameWinOverlay.classList.remove('hidden');
}

// 切换到无尽挑战
function startEndless() {
  keepGoing = true;
  gameWon = false;
  gameWinOverlay.classList.add('hidden');
}

// --- 事件监听与用户控制 ---

// 键盘事件
window.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D', ' '].includes(e.key)) {
    e.preventDefault(); // 阻止滚动
  }
  keys[e.key] = true;
  
  if (e.key === ' ' || e.key === 'Spacebar') {
    spacePressed = true;
  }
});

window.addEventListener('keyup', e => {
  keys[e.key] = false;
  
  if (e.key === ' ' || e.key === 'Spacebar') {
    spacePressed = false;
  }
});

// 鼠标绝对物理单坐标计算与蓄力按下释放
canvas.addEventListener('mousedown', e => {
  mousePressed = true;
  synth.init();
});

window.addEventListener('mouseup', () => {
  mousePressed = false;
});

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouseX = (e.clientX - rect.left) / rect.width * canvas.width;
});

canvas.addEventListener('mouseleave', () => {
  mouseX = null;
  mousePressed = false;
});

// 手机端划动平移跟随与触屏蓄力
canvas.addEventListener('touchstart', e => {
  mousePressed = true;
  synth.init();
  if (e.touches.length === 1) {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.touches[0].clientX - rect.left) / rect.width * canvas.width;
  }
});

canvas.addEventListener('touchmove', e => {
  if (e.touches.length !== 1) return;
  e.preventDefault(); // 阻止滚动下拉刷新
  const rect = canvas.getBoundingClientRect();
  mouseX = (e.touches[0].clientX - rect.left) / rect.width * canvas.width;
}, { passive: false });

canvas.addEventListener('touchend', () => {
  mouseX = null;
  mousePressed = false;
});

// 遮罩层按钮绑定
startBtn.addEventListener('click', () => {
  initGame();
});

keepGoingBtn.addEventListener('click', () => {
  startEndless();
});

winRestartBtn.addEventListener('click', () => {
  initGame();
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
// 初始化绘制出底盘
draw();
