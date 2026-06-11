/**
 * Cyber Miner - 赛博黄金矿工核心逻辑与 8-Bit 合成音效
 */

// --- 8-Bit 电子音效合成器 (Web Audio API) ---
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

  // 发射钩爪：滑动的嗡嗡电音
  playShoot() {
    this.playTone(400, 150, 0.2, 'triangle', 0.12);
  }

  // 收回钩爪：低音脉冲
  playRetract() {
    this.playTone(150, 220, 0.15, 'sawtooth', 0.1);
  }

  // 抓到黄金：清脆上扬和弦
  playGrabGold() {
    this.playTone(523.25, 880, 0.12, 'sine', 0.15);
  }

  // 抓到钻石：高频水晶声
  playGrabDiamond() {
    this.playTone(987.77, 1567.98, 0.15, 'sine', 0.15);
  }

  // 抓到石头：笨重闷声
  playGrabStone() {
    this.playTone(180, 100, 0.22, 'triangle', 0.2);
  }

  // 爆炸 (炸药桶/扔炸弹)：白噪音滤波大爆炸
  playExplosion() {
    if (this.muted) return;
    this.init();
    try {
      // 模拟爆炸：使用方波的低音骤降
      this.playTone(160, 40, 0.45, 'sawtooth', 0.35);
    } catch (e) {}
  }

  // 商店买单：清脆收钱声
  playBuy() {
    this.playTone(587.33, 1174.66, 0.08, 'sine', 0.15);
    setTimeout(() => {
      this.playTone(880, 1318.51, 0.15, 'sine', 0.12);
    }, 60);
  }

  // 胜利通关：小调琶音
  playWin() {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, freq, 0.18, 'sine', 0.12);
      }, idx * 100);
    });
  }

  // GG 音效
  playGameOver() {
    this.playTone(300, 80, 0.7, 'sawtooth', 0.3);
  }
}

const synth = new AudioSynth();

// --- 游戏变量与配置 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreVal = document.getElementById('scoreVal');
const targetVal = document.getElementById('targetVal');
const timeVal = document.getElementById('timeVal');
const bombVal = document.getElementById('bombVal');

const startOverlay = document.getElementById('startOverlay');
const shopOverlay = document.getElementById('shopOverlay');
const stageClearOverlay = document.getElementById('stageClearOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');

const startBtn = document.getElementById('startBtn');
const goToShopBtn = document.getElementById('goToShopBtn');
const closeShopBtn = document.getElementById('closeShopBtn');
const restartBtn = document.getElementById('restartBtn');
const muteBtn = document.getElementById('muteBtn');
const shopItemsContainer = document.getElementById('shopItemsContainer');

// 液晶板元素缓存
const clearLevelVal = document.getElementById('clearLevelVal');
const clearScoreVal = document.getElementById('clearScoreVal');
const failScoreVal = document.getElementById('failScoreVal');

// 物理与状态
let score = 0;
let targetScore = 650;
let timeLeft = 60;
let dynamiteCount = 2; // 初始炸药数量
let level = 1;
let gameOver = false;
let gameWon = false;
let gameStarted = false;
let inShop = false;
let timerInterval = null;

// 道具增益状态（每关结算后购买，在下一关开始时应用，过关后清空）
let hasStrengthDrink = false; // 雷霆饮料：拉回速度提升 35%
let hasHyperOil = false;     // 超频润滑油：发钩速度提升 30%
let hasClover = false;       // 幸运芯片：胶囊保底高分且翻倍
let pendingDiamondBonus = false; // 钻石偏光镜：刷新大量钻石

// 采矿钩子对象
let claw = {
  x: canvas.width / 2,
  y: 65, // 顶端电磁吊臂中心点
  angle: 0,
  angleSpeed: 0.022, // 摆动角速度
  swingDir: 1, // 摆动方向 1 或 -1
  length: 45, // 初始长度
  baseLength: 45,
  maxLength: 540,
  state: 'swinging', // 'swinging' 摆动, 'shooting' 出钩, 'retracting' 收钩
  shootSpeed: 6.0,
  retractSpeed: 5.0,
  attachedItem: null
};

// 地底矿石列表
let mineItems = [];
let particles = []; // 霓虹爆炸火花粒子

// 商店商品库
const SHOP_POOL = [
  { id: 'strength', name: '雷霆饮料', desc: '能量充沛，下一关抓矿拉回速度提升35%', price: 200, icon: '🔋' },
  { id: 'oil', name: '超频润滑油', desc: '轴承润滑，下一关等离子绳索出钩速度提升30%', price: 150, icon: '⚡' },
  { id: 'dynamite', name: '电子炸药', desc: '核心炸药储备 +1，可炸碎拉回的无用重物', price: 100, icon: '🧨' },
  { id: 'clover', name: '幸运芯片', desc: '增加神秘胶囊获得高价值矿石的概率与金额', price: 120, icon: '🍀' },
  { id: 'detector', name: '钻石探测仪', desc: '下一关地底矿脉中必定刷出闪亮的钻石', price: 250, icon: '💎' }
];

let currentShopItems = [];

// --- 初始化与关卡构建 ---

function initGame() {
  score = 0;
  level = 1;
  targetScore = 650;
  dynamiteCount = 2;
  
  hasStrengthDrink = false;
  hasHyperOil = false;
  hasClover = false;
  pendingDiamondBonus = false;
  
  gameOver = false;
  gameWon = false;
  gameStarted = true;
  inShop = false;
  
  resetClaw();
  buildTerrain();
  updateUI();
  startTimer();
  
  // 隐藏遮罩
  startOverlay.classList.add('hidden');
  shopOverlay.classList.add('hidden');
  stageClearOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  
  synth.init();
}

function resetClaw() {
  claw.angle = 0;
  claw.length = claw.baseLength;
  claw.state = 'swinging';
  claw.attachedItem = null;
}

// 随机矿物地形生成器
function buildTerrain() {
  mineItems = [];
  particles = [];
  
  // 依据当前关卡动态设定采矿目标分数
  targetScore = 650 + (level - 1) * 700;
  
  // 基础生成规则：按网格和随机分布生成矿物
  const width = canvas.width;
  const height = canvas.height;
  const topBound = 140; // 矿物不能生成在顶部天线附近
  
  // 1. 确定本关钻石生成数量 (是否买了探测仪)
  let diamondCountToSpawn = pendingDiamondBonus ? (3 + Math.floor(Math.random() * 3)) : (Math.random() < 0.3 ? 1 : 0);
  // 2. 炸药桶数量 (随着关卡变难会增多)
  const spikeBarrelCount = 1 + Math.floor(level / 3) + (Math.random() < 0.4 ? 1 : 0);
  
  // 矿产放置辅助函数，避免重叠
  function addMineral(item) {
    // 重叠校验
    let overlap = false;
    for (let other of mineItems) {
      const dist = Math.hypot(item.x - other.x, item.y - other.y);
      if (dist < (item.radius + other.radius + 15)) {
        overlap = true;
        break;
      }
    }
    if (!overlap) {
      mineItems.push(item);
    }
  }

  // 优先生成炸药桶
  for (let i = 0; i < spikeBarrelCount; i++) {
    addMineral({
      x: 60 + Math.random() * (width - 120),
      y: topBound + 40 + Math.random() * (height - topBound - 80),
      radius: 14,
      type: 'tnt',
      scoreValue: 0,
      weight: 1.0,
      color: '#ff007f'
    });
  }

  // 生成钻石
  for (let i = 0; i < diamondCountToSpawn; i++) {
    addMineral({
      x: 40 + Math.random() * (width - 80),
      y: topBound + 80 + Math.random() * (height - topBound - 110), // 钻石在深处
      radius: 8,
      type: 'diamond',
      scoreValue: 600,
      weight: 0.8,
      color: '#00f5d4'
    });
  }

  // 胶囊神秘宝箱
  const capsuleCount = 1 + (Math.random() < 0.5 ? 1 : 0);
  for (let i = 0; i < capsuleCount; i++) {
    addMineral({
      x: 50 + Math.random() * (width - 100),
      y: topBound + 30 + Math.random() * (height - topBound - 60),
      radius: 11,
      type: 'capsule',
      scoreValue: 0, // 随机
      weight: 1.2,
      color: '#9d4edd'
    });
  }

  // 金块分配 (大、中、小)
  const goldSpawns = [
    { type: 'gold_large', radius: 26, value: 500, w: 6.2, count: 2 + Math.floor(Math.random() * 2) },
    { type: 'gold_medium', radius: 18, value: 250, w: 3.5, count: 3 + Math.floor(Math.random() * 2) },
    { type: 'gold_small', radius: 10, value: 100, w: 1.5, count: 4 + Math.floor(Math.random() * 2) }
  ];

  for (let config of goldSpawns) {
    for (let i = 0; i < config.count; i++) {
      addMineral({
        x: 40 + Math.random() * (width - 80),
        y: topBound + 20 + Math.random() * (height - topBound - 50),
        radius: config.radius,
        type: config.type,
        scoreValue: config.value,
        weight: config.w,
        color: '#fee440'
      });
    }
  }

  // 石头 (大、中)
  const stoneSpawns = [
    { type: 'stone_large', radius: 24, value: 20, w: 8.5, count: 2 + Math.floor(Math.random() * 2) },
    { type: 'stone_small', radius: 14, value: 10, w: 4.5, count: 3 + Math.floor(Math.random() * 2) }
  ];

  for (let config of stoneSpawns) {
    for (let i = 0; i < config.count; i++) {
      addMineral({
        x: 40 + Math.random() * (width - 80),
        y: topBound + 20 + Math.random() * (height - topBound - 50),
        radius: config.radius,
        type: config.type,
        scoreValue: config.value,
        weight: config.w,
        color: '#4a4e69'
      });
    }
  }
}

// 启动关卡倒计时
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timeLeft = 60;
  timeVal.textContent = timeLeft;
  
  timerInterval = setInterval(() => {
    if (gameOver || gameWon || inShop) return;
    timeLeft--;
    timeVal.textContent = timeLeft;
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      checkStageResult();
    }
  }, 1000);
}

// --- 物理运动与抓取判断 ---

function updatePhysics() {
  // 1. 更新霓虹粒子
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }

  // 2. 状态机运算
  if (claw.state === 'swinging') {
    // 扇形往复摆动 (在 -75度 到 75度 间摆动)
    const maxAngle = Math.PI * 0.42;
    claw.angle += claw.angleSpeed * claw.swingDir;
    if (claw.angle >= maxAngle) {
      claw.angle = maxAngle;
      claw.swingDir = -1;
    } else if (claw.angle <= -maxAngle) {
      claw.angle = -maxAngle;
      claw.swingDir = 1;
    }
  } 
  else if (claw.state === 'shooting') {
    // 出钩拉长
    const speedCoeff = hasHyperOil ? 1.3 : 1.0;
    claw.length += claw.shootSpeed * speedCoeff;
    
    // 计算钩爪末梢坐标
    const clawX = claw.x + Math.sin(claw.angle) * claw.length;
    const clawY = claw.y + Math.cos(claw.angle) * claw.length;
    
    // 碰撞检测是否抓到地底的矿石
    let collided = false;
    for (let i = 0; i < mineItems.length; i++) {
      const item = mineItems[i];
      const dist = Math.hypot(clawX - item.x, clawY - item.y);
      
      if (dist < (item.radius + 10)) { // 钩爪半径与物体碰撞
        collided = true;
        // 抓获该物品
        claw.attachedItem = item;
        mineItems.splice(i, 1);
        claw.state = 'retracting';
        
        // 抓取类型音效
        if (item.type === 'tnt') {
          triggerTntExplosion(item.x, item.y);
          claw.attachedItem = null; // 炸毁了直接空钩
        } else if (item.type === 'diamond') {
          synth.playGrabDiamond();
        } else if (item.type.startsWith('gold')) {
          synth.playGrabGold();
        } else {
          synth.playGrabStone();
        }
        break;
      }
    }
    
    // 触碰到屏幕左、右、下边缘收回
    if (!collided && (clawX <= 10 || clawX >= canvas.width - 10 || clawY >= canvas.height - 10 || claw.length >= claw.maxLength)) {
      claw.state = 'retracting';
    }
  } 
  else if (claw.state === 'retracting') {
    // 阻力拉回：物品重量越重速度越慢
    let weight = claw.attachedItem ? claw.attachedItem.weight : 0;
    
    // 雷霆饮料对拉回速度的加成
    const drinkCoeff = hasStrengthDrink ? 1.35 : 1.0;
    const currentRetractSpeed = Math.max(1.1, (claw.retractSpeed / (1.0 + weight)) * drinkCoeff);
    
    claw.length -= currentRetractSpeed;
    
    if (claw.length <= claw.baseLength) {
      claw.length = claw.baseLength;
      claw.state = 'swinging';
      
      // 收钩成功结算矿物得分
      if (claw.attachedItem) {
        settleGrabbedItem(claw.attachedItem);
        claw.attachedItem = null;
      }
    }
  }
}

// 钩爪抓回成功的资金结算
function settleGrabbedItem(item) {
  if (item.type === 'capsule') {
    // 胶囊随机奖励：加分或送炸药
    const rand = Math.random();
    if (rand < 0.25) {
      dynamiteCount++;
      synth.playBuy();
      showCapsuleText('+1 DYNAMITE', item.x, 80, '#ff007f');
      updateUI();
    } else {
      let val = 100 + Math.floor(Math.random() * 400); // 100-500
      if (hasClover) {
        val *= 2; // 幸运芯片翻倍
      }
      score += val;
      synth.playGrabGold();
      showCapsuleText(`+$${val}`, item.x, 80, '#fee440');
      updateUI();
    }
  } else {
    // 其它矿物
    score += item.scoreValue;
    synth.playGrabGold();
    updateUI();
  }
}

// 在屏幕上漂浮文字说明胶囊开出的内容
let capsulePopup = null;
function showCapsuleText(text, x, y, color) {
  capsulePopup = { text, x, y, color, life: 90 }; // 维持 1.5 秒
}

// 抛投炸药包炸毁拉回重物的逻辑 (Space触发)
function throwDynamite() {
  if (claw.state !== 'retracting' || !claw.attachedItem || dynamiteCount <= 0) return;
  
  dynamiteCount--;
  updateUI();
  synth.playExplosion();
  
  // 在拉回的物体上生成一圈强烈的白色火星子
  const clawX = claw.x + Math.sin(claw.angle) * claw.length;
  const clawY = claw.y + Math.cos(claw.angle) * claw.length;
  spawnExplosionParticles(clawX, clawY, '#ffffff', 20);
  
  // 炸碎物体，钩子瞬间变空爪以极速拉回
  claw.attachedItem = null;
}

// 触发炸药桶爆炸
function triggerTntExplosion(x, y) {
  synth.playExplosion();
  
  // 1. 霓虹粒子超级大喷发
  spawnExplosionParticles(x, y, '#ff007f', 40);
  
  // 2. 引爆周围 120 像素半径内的所有物品 (连锁反应)
  const explosionRadius = 120;
  
  // 为了安全，我们需要倒序迭代引爆，以避免连锁删除错位
  for (let i = mineItems.length - 1; i >= 0; i--) {
    const item = mineItems[i];
    const dist = Math.hypot(item.x - x, item.y - y);
    if (dist <= explosionRadius) {
      // 连锁触发炸药桶
      if (item.type === 'tnt') {
        mineItems.splice(i, 1);
        triggerTntExplosion(item.x, item.y);
      } else {
        // 其他物品直接炸毁
        mineItems.splice(i, 1);
        spawnExplosionParticles(item.x, item.y, item.color, 12);
      }
    }
  }
}

// 粒子特效发生器
function spawnExplosionParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.0 + Math.random() * 4.5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 1.5 + Math.random() * 2,
      color,
      alpha: 1.0,
      decay: 0.018 + Math.random() * 0.015
    });
  }
}

// --- 关卡判断与结算 ---

function checkStageResult() {
  if (score >= targetScore) {
    // 胜利过关，去商店
    synth.playWin();
    clearLevelVal.textContent = level;
    clearScoreVal.textContent = score;
    stageClearOverlay.classList.remove('hidden');
  } else {
    // GG
    synth.playGameOver();
    failScoreVal.textContent = score;
    gameOverOverlay.classList.remove('hidden');
    gameOver = true;
  }
}

function updateUI() {
  scoreVal.textContent = score;
  targetVal.textContent = targetScore;
  bombVal.textContent = dynamiteCount;
}

// --- 商店逻辑 ---

function openBlackMarket() {
  inShop = true;
  stageClearOverlay.classList.add('hidden');
  shopOverlay.classList.remove('hidden');
  
  // 随机挑选 3 个商品，不能重复
  currentShopItems = [];
  const shuffled = [...SHOP_POOL].sort(() => Math.random() - 0.5);
  currentShopItems = shuffled.slice(0, 3);
  
  // 渲染商店卡片
  shopItemsContainer.innerHTML = '';
  currentShopItems.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'shop-card';
    card.id = `shop-card-${index}`;
    
    // 如果钱不够买，置灰或者设置按钮状态
    const canAfford = score >= item.price;
    
    card.innerHTML = `
      <div class="item-icon">${item.icon}</div>
      <div class="item-name">${item.name}</div>
      <div class="item-desc">${item.desc}</div>
      <button class="buy-btn" ${!canAfford ? 'style="border-color:#4a4e69;color:#adb5bd;cursor:not-allowed;" disabled' : ''}>
        $${item.price} 购买
      </button>
    `;
    
    // 购买按钮监听
    const btn = card.querySelector('.buy-btn');
    if (canAfford) {
      btn.addEventListener('click', () => {
        buyItem(item, card);
      });
    }
    
    shopItemsContainer.appendChild(card);
  });
}

function buyItem(item, cardElement) {
  if (score < item.price) return;
  
  score -= item.price;
  updateUI();
  synth.playBuy();
  
  // 应用道具效果
  if (item.id === 'strength') {
    hasStrengthDrink = true;
  } else if (item.id === 'oil') {
    hasHyperOil = true;
  } else if (item.id === 'dynamite') {
    dynamiteCount++;
    updateUI();
  } else if (item.id === 'clover') {
    hasClover = true;
  } else if (item.id === 'detector') {
    pendingDiamondBonus = true;
  }
  
  // 购买完成后将卡片置灰标记“已购”
  cardElement.classList.add('purchased');
  const btn = cardElement.querySelector('.buy-btn');
  btn.textContent = '已超频';
  btn.disabled = true;
  btn.style.borderColor = 'var(--accent-gray)';
  btn.style.color = 'var(--text-secondary)';
}

// 开始下一关
function nextStage() {
  level++;
  inShop = false;
  shopOverlay.classList.add('hidden');
  
  // 重新搭建地形 (应用购买的加成)
  buildTerrain();
  
  // 重置出钩
  resetClaw();
  
  // 重置加成，只有探测仪和饮料等是单关卡一次性的
  // 我们在 buildTerrain 完了以后把加成重置
  pendingDiamondBonus = false; 
  // 饮料、机油和芯片在出钩时起效，下一关开始时它们将被重置
  hasStrengthDrink = false;
  hasHyperOil = false;
  hasClover = false;
  
  updateUI();
  startTimer();
}

// --- 渲染系统 ---

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 1. 绘制发光背景网格
  drawGrid();

  // 2. 绘制地底矿藏
  mineItems.forEach(item => {
    ctx.save();
    
    // 赛博荧光阴影
    ctx.shadowColor = item.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = item.color;
    
    if (item.type === 'tnt') {
      // 炸药桶：红发光圆桶，画一圈黑线条
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      ctx.fill();
      // 警告线条
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(item.x - 8, item.y - 4);
      ctx.lineTo(item.x + 8, item.y + 4);
      ctx.moveTo(item.x - 8, item.y + 4);
      ctx.lineTo(item.x + 8, item.y - 4);
      ctx.stroke();
    } 
    else if (item.type === 'diamond') {
      // 钻石：多边形棱形，炫彩
      ctx.beginPath();
      ctx.moveTo(item.x, item.y - item.radius);
      ctx.lineTo(item.x + item.radius, item.y);
      ctx.lineTo(item.x, item.y + item.radius);
      ctx.lineTo(item.x - item.radius, item.y);
      ctx.closePath();
      ctx.fill();
      // 高亮中心
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(item.x - 2, item.y - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } 
    else if (item.type === 'capsule') {
      // 胶囊宝箱：一半粉红一半青色
      ctx.save();
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      ctx.clip();
      
      ctx.fillStyle = '#ff007f';
      ctx.fillRect(item.x - item.radius, item.y - item.radius, item.radius * 2, item.radius);
      ctx.fillStyle = '#00f5d4';
      ctx.fillRect(item.x - item.radius, item.y, item.radius * 2, item.radius);
      ctx.restore();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    else if (item.type.startsWith('gold')) {
      // 发光金块：粗糙多边形
      drawGoldBody(item.x, item.y, item.radius, item.color);
    } 
    else {
      // 灰铁矿：画成深灰角多边形
      drawStoneBody(item.x, item.y, item.radius, item.color);
    }
    
    ctx.restore();
  });

  // 3. 绘制挂在钩爪上的物品
  if (claw.attachedItem) {
    ctx.save();
    const clawX = claw.x + Math.sin(claw.angle) * claw.length;
    const clawY = claw.y + Math.cos(claw.angle) * claw.length;
    
    // 让抓取的物品中心贴附在钩爪尖端
    const item = claw.attachedItem;
    ctx.shadowColor = item.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = item.color;
    
    if (item.type === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(clawX, clawY - item.radius + 6);
      ctx.lineTo(clawX + item.radius, clawY + 6);
      ctx.lineTo(clawX, clawY + item.radius + 6);
      ctx.lineTo(clawX - item.radius, clawY + 6);
      ctx.closePath();
      ctx.fill();
    } else if (item.type === 'capsule') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(clawX, clawY + 6, item.radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#ff007f';
      ctx.fillRect(clawX - item.radius, clawY + 6 - item.radius, item.radius * 2, item.radius);
      ctx.fillStyle = '#00f5d4';
      ctx.fillRect(clawX - item.radius, clawY + 6, item.radius * 2, item.radius);
      ctx.restore();
    } else if (item.type.startsWith('gold')) {
      drawGoldBody(clawX, clawY + item.radius - 2, item.radius, item.color);
    } else {
      drawStoneBody(clawX, clawY + item.radius - 2, item.radius, item.color);
    }
    ctx.restore();
  }

  // 4. 绘制等离子绳索 (发光的极光线条)
  ctx.save();
  ctx.strokeStyle = '#00f5d4';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#00f5d4';
  ctx.shadowBlur = 8;
  
  const endX = claw.x + Math.sin(claw.angle) * claw.length;
  const endY = claw.y + Math.cos(claw.angle) * claw.length;
  
  ctx.beginPath();
  ctx.moveTo(claw.x, claw.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.restore();

  // 5. 绘制发光钩爪 (夹子抓手)
  ctx.save();
  ctx.translate(endX, endY);
  ctx.rotate(-claw.angle);
  
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#00f5d4';
  ctx.shadowBlur = 6;
  
  // 左右抓夹的张开弧度
  // 摆动时闭合，出钩时闭合，抓到东西或回缩时视物体尺寸微张
  let angleOffset = 0.2;
  if (claw.state === 'shooting') {
    angleOffset = 0.1;
  } else if (claw.state === 'retracting' && claw.attachedItem) {
    angleOffset = 0.4 + (claw.attachedItem.radius * 0.012); // 物体越大钩爪张开越大
  }
  
  // 绘制左爪
  ctx.beginPath();
  ctx.arc(-8, 0, 12, Math.PI * 0.5 - angleOffset, Math.PI * 1.5 - angleOffset, true);
  ctx.stroke();
  
  // 绘制右爪
  ctx.beginPath();
  ctx.arc(8, 0, 12, Math.PI * 0.5 + angleOffset, -Math.PI * 0.5 + angleOffset);
  ctx.stroke();
  
  ctx.restore();

  // 6. 绘制采矿发光核心 (天线吊座)
  ctx.save();
  ctx.shadowColor = '#9d4edd';
  ctx.shadowBlur = 12;
  
  // 吊臂座渐变
  const baseGrad = ctx.createRadialGradient(claw.x, claw.y - 15, 5, claw.x, claw.y - 15, 30);
  baseGrad.addColorStop(0, '#fff');
  baseGrad.addColorStop(0.4, '#9d4edd');
  baseGrad.addColorStop(1, '#050212');
  
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.arc(claw.x, claw.y - 15, 25, 0, Math.PI * 2);
  ctx.fill();
  
  // 青色外发光发电机轮廓
  ctx.strokeStyle = '#00f5d4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(claw.x, claw.y - 15, 25, 0, Math.PI, true);
  ctx.stroke();
  
  ctx.restore();

  // 7. 绘制粒子
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 8. 绘制胶囊文字弹窗
  if (capsulePopup && capsulePopup.life > 0) {
    ctx.save();
    ctx.font = 'bold 16px Orbitron';
    ctx.fillStyle = capsulePopup.color;
    ctx.textAlign = 'center';
    ctx.shadowColor = capsulePopup.color;
    ctx.shadowBlur = 10;
    
    // 向上慢慢漂移
    capsulePopup.y -= 0.6;
    ctx.fillText(capsulePopup.text, capsulePopup.x, capsulePopup.y);
    capsulePopup.life--;
    ctx.restore();
  }
}

// 辅助绘图：绘制粗糙感的多边形金块
function drawGoldBody(cx, cy, r, color) {
  ctx.beginPath();
  const numPoints = 8;
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    // 增加随机偏移量让金块边缘凹凸不平
    const offset = (i % 2 === 0 ? 0.95 : 0.82) * r;
    const x = cx + Math.cos(angle) * offset;
    const y = cy + Math.sin(angle) * offset;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
  
  // 加一道反光
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx - r*0.3, cy - r*0.3, r*0.22, 0, Math.PI*2);
  ctx.fill();
}

// 辅助绘图：绘制深灰色粗糙石块
function drawStoneBody(cx, cy, r, color) {
  ctx.beginPath();
  const numPoints = 6;
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    // 石块多边形棱角更加尖锐
    const offset = (i % 3 === 0 ? 1.05 : 0.85) * r;
    const x = cx + Math.cos(angle) * offset;
    const y = cy + Math.sin(angle) * offset;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
  
  // 画一些石头的裂缝暗线条
  ctx.strokeStyle = '#1d1e2c';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(cx - r*0.4, cy - r*0.2);
  ctx.lineTo(cx + r*0.2, cy + r*0.3);
  ctx.stroke();
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
  ctx.lineWidth = 0.5;
  const gap = 40;
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
  
  // 画出地面分隔线 (顶层控制机和地下深空矿区)
  ctx.strokeStyle = 'rgba(157, 78, 221, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 100);
  ctx.lineTo(canvas.width, 100);
  ctx.stroke();
}

// --- 游戏环 ---

function updateLoop() {
  if (gameStarted && !gameOver && !gameWon && !inShop) {
    updatePhysics();
    draw();
  }
  requestAnimationFrame(updateLoop);
}

// --- 用户交互与按键事件 ---

window.addEventListener('keydown', e => {
  if (['ArrowDown', 's', 'S', ' '].includes(e.key)) {
    e.preventDefault();
  }
  
  // 下键发射
  if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && claw.state === 'swinging') {
    claw.state = 'shooting';
    synth.playShoot();
  }
  
  // 空格键扔炸药
  if (e.key === ' ') {
    throwDynamite();
  }
});

// 支持鼠标/屏幕点击发射
canvas.addEventListener('mousedown', () => {
  if (claw.state === 'swinging' && !inShop && gameStarted && !gameOver) {
    claw.state = 'shooting';
    synth.playShoot();
  }
});

canvas.addEventListener('touchstart', e => {
  synth.init();
  if (claw.state === 'swinging' && !inShop && gameStarted && !gameOver) {
    claw.state = 'shooting';
    synth.playShoot();
  }
});

// 遮罩按钮事件绑定
startBtn.addEventListener('click', () => {
  initGame();
});

goToShopBtn.addEventListener('click', () => {
  openBlackMarket();
});

closeShopBtn.addEventListener('click', () => {
  nextStage();
});

restartBtn.addEventListener('click', () => {
  initGame();
});

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

// 首次挂载回路
requestAnimationFrame(updateLoop);
draw();
