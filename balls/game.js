/**
 * Balls - 霓虹粒子打砖块游戏逻辑与音效
 */

// --- 8-Bit 弹球电子音效合成器 ---
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

  // 撞墙：短促尖锐音
  playBounceWall() {
    this.playTone(600, 600, 0.05, 'sine', 0.1);
  }

  // 撞挡板：清脆的木质敲击声
  playBouncePaddle() {
    this.playTone(350, 450, 0.07, 'triangle', 0.2);
  }

  // 击碎砖块：音高根据砖块颜色变化
  playBreakBrick(life) {
    const freq = 400 + life * 100;
    this.playTone(freq, freq * 1.5, 0.08, 'triangle', 0.15);
  }

  // 吃道具：欢快上行双琶音
  playPowerup() {
    if (this.muted) return;
    this.init();
    try {
      this.playTone(523.25, 659.25, 0.12, 'sine', 0.15); // C5 到 E5
      setTimeout(() => {
        this.playTone(783.99, 1046.50, 0.16, 'sine', 0.12); // G5 到 C6
      }, 70);
    } catch (e) {}
  }

  // 掉球扣血：沉闷下行音
  playLoseBall() {
    this.playTone(250, 80, 0.3, 'sawtooth', 0.25);
  }

  // 通关：经典电子得瑟小曲
  playWin() {
    if (this.muted) return;
    this.init();
    try {
      const melody = [523.25, 659.25, 523.25, 783.99, 659.25, 1046.50];
      melody.forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, freq * 1.02, 0.15, 'square', 0.08);
        }, idx * 100);
      });
    } catch (e) {}
  }

  // 游戏GG：下滑的长悲伤音
  playGameOver() {
    this.playTone(200, 50, 0.6, 'sawtooth', 0.3);
  }
}

const synth = new AudioSynth();

// --- 游戏主配置与变量 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreVal = document.getElementById('scoreVal');
const livesVal = document.getElementById('livesVal');
const levelVal = document.getElementById('levelVal');

const startOverlay = document.getElementById('startOverlay');
const gameWinOverlay = document.getElementById('gameWinOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');

const startBtn = document.getElementById('startBtn');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const restartBtn = document.getElementById('restartBtn');
const muteBtn = document.getElementById('muteBtn');

// 游戏常量
const BALL_SPEED_BASE = 5; // 球体基准物理速度
const PADDLE_SPEED = 8;    // 键盘移动速度

// --- 游戏状态变量 ---
let score = 0;
let lives = 3;
let level = 1;
let gameOver = false;
let gameWon = false;
let gameStarted = false;

// 游戏对象
let paddle = {
  x: 0,
  y: 0,
  width: 90,
  height: 12,
  baseWidth: 90,
  targetWidth: 90
};

let balls = [];       // 当前场上的球列表
let bricks = [];      // 砖块列表
let particles = [];   // 粒子系统
let powerups = [];    // 坠落的道具列表

// 道具触发状态
let hasShield = false;       // 底部防漏网
let widePaddleTimer = null;  // 大挡板定时器

// --- 键盘与鼠标/手势交互状态 ---
let keys = {};
let mouseX = null;

// --- 初始化与关卡构建 ---
function initGame() {
  score = 0;
  lives = 3;
  level = 1;
  gameOver = false;
  gameWon = false;
  gameStarted = true;
  
  hasShield = false;
  if (widePaddleTimer) clearTimeout(widePaddleTimer);
  paddle.width = paddle.baseWidth;
  paddle.targetWidth = paddle.baseWidth;
  
  updateUI();
  buildLevel();
  resetBallAndPaddle();
  
  // 隐藏遮罩
  startOverlay.classList.add('hidden');
  gameWinOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  
  synth.init();
}

// 派发球与挡板至初始位置 (吸附在挡板上)
function resetBallAndPaddle() {
  paddle.x = (canvas.width - paddle.width) / 2;
  paddle.y = canvas.height - 40;
  
  balls = [];
  // 初始球，吸附在挡板中心，发弹射初速度
  balls.push({
    x: paddle.x + paddle.width / 2,
    y: paddle.y - 8,
    radius: 7,
    vx: 2,
    vy: -BALL_SPEED_BASE,
    launched: false, // 初始未发射，吸附在挡板上
    trail: [] // 拖尾特效
  });
  
  powerups = [];
  particles = [];
}

// 砖块阵型配置与色彩 (根据高度决定)
const BRICK_COLORS = [
  '#ff007f', // 顶层粉红
  '#9d4edd', // 紫色
  '#00bbf9', // 蓝色
  '#00f5d4', // 青色
  '#39ff14', // 亮绿
  '#fee440'  // 黄色
];

function buildLevel() {
  bricks = [];
  // 动态根据关卡高度改变行数 (首关3行，之后递增，上限6行)
  const rows = Math.min(6, 2 + level);
  const cols = 8;
  const padding = 6;
  const offsetTop = 60;
  const offsetLeft = 10;
  
  // 每一块砖的大小
  const brickW = (canvas.width - offsetLeft * 2 - (cols - 1) * padding) / cols;
  const brickH = 18;
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // 关卡越高，高层砖块需要的生命值(击碎次数)越大
      const life = r === 0 ? Math.min(3, Math.floor(level / 2) + 1) : 1;
      
      bricks.push({
        x: offsetLeft + c * (brickW + padding),
        y: offsetTop + r * (brickH + padding),
        width: brickW,
        height: brickH,
        color: BRICK_COLORS[r % BRICK_COLORS.length],
        life: life,
        maxLife: life,
        points: (rows - r) * 10
      });
    }
  }
}

// 更新顶栏数据
function updateUI() {
  scoreVal.textContent = score;
  livesVal.textContent = lives;
  levelVal.textContent = level;
}

// --- 物理引擎与碰撞逻辑 ---

function updatePhysics() {
  // 1. 挡板的平滑键盘移动与鼠标移动
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
    paddle.x -= PADDLE_SPEED;
  }
  if (keys['ArrowRight'] || keys['d'] || keys['D']) {
    paddle.x += PADDLE_SPEED;
  }
  
  // 鼠标移动跟随
  if (mouseX !== null) {
    paddle.x = mouseX - paddle.width / 2;
  }
  
  // 挡板越界控制
  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.width > canvas.width) {
    paddle.x = canvas.width - paddle.width;
  }
  
  // 挡板大宽度平滑过渡缩放
  if (paddle.width !== paddle.targetWidth) {
    const diff = paddle.targetWidth - paddle.width;
    paddle.width += diff * 0.1; // 缓动插值
  }

  // 2. 弹球物理移动与碰撞检测
  for (let i = balls.length - 1; i >= 0; i--) {
    const ball = balls[i];
    
    // 如果球还没有被发射，让其固定在挡板中央跟随平移
    if (ball.launched === false) {
      ball.x = paddle.x + paddle.width / 2;
      ball.y = paddle.y - ball.radius - 2;
      ball.trail = [];
      
      // 玩家可以通过按空格键来发射球
      if (keys[' ']) {
        ball.launched = true;
        synth.playBouncePaddle();
      }
      continue; // 不执行后续碰撞检测
    }
    
    // 更新拖尾数据
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 6) {
      ball.trail.shift();
    }
    
    ball.x += ball.vx;
    ball.y += ball.vy;
    
    // 与左右墙壁碰撞
    if (ball.x - ball.radius <= 0) {
      ball.x = ball.radius;
      ball.vx = -ball.vx;
      synth.playBounceWall();
    } else if (ball.x + ball.radius >= canvas.width) {
      ball.x = canvas.width - ball.radius;
      ball.vx = -ball.vx;
      synth.playBounceWall();
    }
    
    // 与顶部墙壁碰撞
    if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.vy = -ball.vy;
      synth.playBounceWall();
    }
    
    // 与底部防护网碰撞
    if (hasShield && ball.y + ball.radius >= canvas.height - 8) {
      ball.y = canvas.height - 8 - ball.radius;
      ball.vy = -Math.abs(ball.vy);
      hasShield = false; // 防护网破裂
      synth.playBouncePaddle();
      spawnShieldParticles();
    }
    // 没防护网，掉出屏幕
    else if (ball.y - ball.radius > canvas.height) {
      balls.splice(i, 1);
      continue;
    }
    
    // 与挡板碰撞
    if (ball.vy > 0 &&
        ball.y + ball.radius >= paddle.y &&
        ball.y - ball.radius <= paddle.y + paddle.height &&
        ball.x >= paddle.x &&
        ball.x <= paddle.x + paddle.width) {
          
      // 计算撞击百分比偏向值，进行定向角度反射
      const hitPos = (ball.x - paddle.x) / paddle.width;
      // 限制偏角在左右 65 度以内
      const angle = (hitPos - 0.5) * Math.PI * 0.36;
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      
      ball.vx = speed * Math.sin(angle);
      ball.vy = -speed * Math.cos(angle);
      
      // 防止球被卡在挡板上
      ball.y = paddle.y - ball.radius;
      synth.playBouncePaddle();
    }
    
    // 与砖块碰撞检测
    checkBrickCollisions(ball);
  }
  
  // 如果球扣完了，扣生命并重新放置球
  if (balls.length === 0 && !gameOver && !gameWon) {
    lives--;
    updateUI();
    synth.playLoseBall();
    
    if (lives <= 0) {
      handleGameOver();
    } else {
      resetBallAndPaddle();
    }
  }
  
  // 3. 处理道具下落与捡起
  for (let i = powerups.length - 1; i >= 0; i--) {
    const pu = powerups[i];
    pu.y += pu.vy;
    
    // 捡起道具
    if (pu.y + pu.height >= paddle.y &&
        pu.y <= paddle.y + paddle.height &&
        pu.x + pu.width >= paddle.x &&
        pu.x <= paddle.x + paddle.width) {
          
      triggerPowerup(pu.type);
      powerups.splice(i, 1);
      synth.playPowerup();
      continue;
    }
    
    // 漏接并掉出屏幕
    if (pu.y > canvas.height) {
      powerups.splice(i, 1);
    }
  }
  
  // 4. 更新粒子系统
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08; // 引入小小的下坠重力
    p.alpha -= p.decay;
    
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }
  
  // 检查是否打完了所有砖块 (通关)
  if (bricks.length === 0 && !gameWon && !gameOver) {
    handleWin();
  }
}

// 砖块碰撞检测与侧向反射判定
function checkBrickCollisions(ball) {
  for (let i = bricks.length - 1; i >= 0; i--) {
    const brick = bricks[i];
    
    // 找出球圆心在砖块矩形上的最接近格点 (Clamping)
    const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.width));
    const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.height));
    
    const distX = ball.x - closestX;
    const distY = ball.y - closestY;
    const distSq = distX * distX + distY * distY;
    
    // 如果发生碰撞
    if (distSq < ball.radius * ball.radius) {
      // 判定撞在矩形的哪个边并反弹
      // 计算碰撞向量的法线
      const overlapX = ball.radius - Math.abs(distX);
      const overlapY = ball.radius - Math.abs(distY);
      
      if (closestX === brick.x || closestX === brick.x + brick.width) {
        // 撞在左右侧
        if (overlapX < overlapY) {
          ball.vx = distX > 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx);
        } else {
          ball.vy = distY > 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);
        }
      } else {
        // 撞在上下侧
        ball.vy = distY > 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);
      }
      
      // 扣除生命
      brick.life--;
      synth.playBreakBrick(brick.life);
      
      if (brick.life <= 0) {
        // 爆炸粒子
        spawnExplosion(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color);
        
        // 增加分数
        score += brick.points;
        updateUI();
        
        // 概率生成道具 (16% 概率)
        if (Math.random() < 0.16) {
          spawnPowerup(brick.x + brick.width / 2, brick.y + brick.height);
        }
        
        bricks.splice(i, 1);
      }
      
      break; // 一次移动中只与一块砖发生碰撞反弹，防止穿透
    }
  }
}

// --- 粒子爆炸系统生成器 ---
function spawnExplosion(x, y, color) {
  // 产生 15 个小粒子
  const count = 15;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3.5;
    
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5, // 向上抛出
      radius: 1.5 + Math.random() * 2,
      color,
      alpha: 1.0,
      decay: 0.02 + Math.random() * 0.02
    });
  }
}

// 底部防护网破裂粒子
function spawnShieldParticles() {
  const count = 30;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: canvas.height - 4,
      vx: Math.random() * 4 - 2,
      vy: -Math.random() * 3,
      radius: 1.5 + Math.random() * 1.5,
      color: '#00f5d4',
      alpha: 0.9,
      decay: 0.03 + Math.random() * 0.03
    });
  }
}

// --- 道具系统逻辑 ---

const POWERUP_TYPES = ['3X', 'WIDE', 'SHIELD'];

function spawnPowerup(x, y) {
  const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  powerups.push({
    x: x - 15,
    y: y,
    width: 38,
    height: 20,
    type,
    vy: 1.8 // 下坠速度
  });
}

function triggerPowerup(type) {
  if (type === '3X') {
    // 弹球三倍化分身
    if (balls.length > 0 && balls.length < 9) {
      const baseBall = balls[0];
      // 生成另外两个球，发射角略偏斜 30 度
      balls.push({
        x: baseBall.x,
        y: baseBall.y,
        radius: baseBall.radius,
        vx: baseBall.vx * 0.8 + 2.5,
        vy: baseBall.vy * 0.9,
        trail: []
      });
      balls.push({
        x: baseBall.x,
        y: baseBall.y,
        radius: baseBall.radius,
        vx: baseBall.vx * 0.8 - 2.5,
        vy: baseBall.vy * 0.9,
        trail: []
      });
    }
  } else if (type === 'WIDE') {
    // 挡板变宽，持续 8 秒
    paddle.targetWidth = 145;
    
    if (widePaddleTimer) clearTimeout(widePaddleTimer);
    widePaddleTimer = setTimeout(() => {
      paddle.targetWidth = paddle.baseWidth;
    }, 8000);
  } else if (type === 'SHIELD') {
    // 激活托底网
    hasShield = true;
  }
}

// --- 渲染渲染引擎 ---

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 1. 绘制虚线背景格线 (霓虹氛围)
  drawBackgroundGrid();

  // 2. 绘制托底防护网
  if (hasShield) {
    ctx.save();
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#00f5d4';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 4);
    ctx.lineTo(canvas.width, canvas.height - 4);
    ctx.stroke();
    ctx.restore();
  }

  // 3. 绘制砖块
  bricks.forEach(brick => {
    ctx.save();
    
    // 如果是需要多次打击的砖块，给一个边框深度标识
    const opacity = brick.life / brick.maxLife;
    ctx.shadowColor = brick.color;
    ctx.shadowBlur = 8;
    
    const grad = ctx.createLinearGradient(brick.x, brick.y, brick.x + brick.width, brick.y + brick.height);
    grad.addColorStop(0, brick.color);
    grad.addColorStop(1, '#000');
    
    ctx.fillStyle = grad;
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + opacity * 0.5})`;
    ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
    
    ctx.restore();
  });

  // 4. 绘制挡板 (使用毛玻璃渐变和青色呼吸边)
  ctx.save();
  ctx.shadowColor = '#00f5d4';
  ctx.shadowBlur = 10;
  
  const paddleGrad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.width, paddle.y + paddle.height);
  paddleGrad.addColorStop(0, '#00f5d4');
  paddleGrad.addColorStop(1, '#9d4edd');
  
  ctx.fillStyle = paddleGrad;
  
  // 圆角矩形
  const r = 6;
  ctx.beginPath();
  ctx.moveTo(paddle.x + r, paddle.y);
  ctx.lineTo(paddle.x + paddle.width - r, paddle.y);
  ctx.quadraticCurveTo(paddle.x + paddle.width, paddle.y, paddle.x + paddle.width, paddle.y + r);
  ctx.lineTo(paddle.x + paddle.width, paddle.y + paddle.height - r);
  ctx.quadraticCurveTo(paddle.x + paddle.width, paddle.y + paddle.height, paddle.x + paddle.width - r, paddle.y + paddle.height);
  ctx.lineTo(paddle.x + r, paddle.y + paddle.height);
  ctx.quadraticCurveTo(paddle.x, paddle.y + paddle.height, paddle.x, paddle.y + paddle.height - r);
  ctx.lineTo(paddle.x, paddle.y + r);
  ctx.quadraticCurveTo(paddle.x, paddle.y, paddle.x + r, paddle.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 5. 绘制坠落的道具卡片
  powerups.forEach(pu => {
    ctx.save();
    
    let color = '#fee440'; // 黄色
    if (pu.type === '3X') color = '#ff007f'; // 粉红
    if (pu.type === 'SHIELD') color = '#00f5d4'; // 青色
    
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    
    ctx.fillStyle = 'rgba(10, 5, 20, 0.8)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    
    // 画道具盒
    ctx.fillRect(pu.x, pu.y, pu.width, pu.height);
    ctx.strokeRect(pu.x, pu.y, pu.width, pu.height);
    
    // 画道具标识字
    ctx.font = 'bold 9px Orbitron';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pu.type, pu.x + pu.width / 2, pu.y + pu.height / 2);
    
    ctx.restore();
  });

  // 6. 绘制弹球与流光尾迹
  balls.forEach(ball => {
    ctx.save();
    
    // 绘制拖尾
    ball.trail.forEach((pos, idx) => {
      ctx.save();
      const alpha = (idx + 1) / ball.trail.length * 0.15;
      ctx.fillStyle = `rgba(255, 0, 127, ${alpha})`;
      ctx.beginPath();
      // 拖尾渐变缩小
      const trailR = ball.radius * (idx + 1) / ball.trail.length;
      ctx.arc(pos.x, pos.y, trailR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 绘制主球体
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 12;
    
    const ballGrad = ctx.createRadialGradient(
      ball.x - 2, ball.y - 2, 1,
      ball.x, ball.y, ball.radius
    );
    ballGrad.addColorStop(0, '#fff');
    ballGrad.addColorStop(0.3, '#ff007f');
    ballGrad.addColorStop(1, '#7209b7');
    
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

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
}

function drawBackgroundGrid() {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
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

// --- 游戏环 loop ---
function update() {
  if (gameStarted && !gameOver && !gameWon) {
    updatePhysics();
    draw();
  }
  requestAnimationFrame(update);
}

// --- 终局处理 ---

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

function startNextLevel() {
  level++;
  gameWon = false;
  gameWinOverlay.classList.add('hidden');
  buildLevel();
  resetBallAndPaddle();
  updateUI();
}

// --- 事件监听与用户控制 ---

// 键盘事件
window.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D', ' '].includes(e.key)) {
    e.preventDefault(); // 阻止浏览器滚动
  }
  keys[e.key] = true;
});

window.addEventListener('keyup', e => {
  keys[e.key] = false;
});

// 鼠标跟随与点击发射
canvas.addEventListener('mousemove', e => {
  // 计算 Canvas 相对视口的比例以高精度还原鼠标位置
  const rect = canvas.getBoundingClientRect();
  mouseX = (e.clientX - rect.left) / rect.width * canvas.width;
});

canvas.addEventListener('mousedown', () => {
  balls.forEach(b => {
    if (b.launched === false) {
      b.launched = true;
      synth.playBouncePaddle();
    }
  });
});

canvas.addEventListener('mouseleave', () => {
  mouseX = null;
});

// 手机端划动平滑跟随与点击发射
canvas.addEventListener('touchstart', e => {
  synth.init();
  if (e.touches.length === 1) {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.touches[0].clientX - rect.left) / rect.width * canvas.width;
  }
  
  balls.forEach(b => {
    if (b.launched === false) {
      b.launched = true;
      synth.playBouncePaddle();
    }
  });
});

canvas.addEventListener('touchmove', e => {
  if (e.touches.length !== 1) return;
  e.preventDefault(); // 阻断手机端页面划屏下拉刷新
  const rect = canvas.getBoundingClientRect();
  mouseX = (e.touches[0].clientX - rect.left) / rect.width * canvas.width;
}, { passive: false });

canvas.addEventListener('touchend', () => {
  mouseX = null;
});

// 遮罩层按钮绑定
startBtn.addEventListener('click', () => {
  initGame();
});

nextLevelBtn.addEventListener('click', () => {
  startNextLevel();
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

// 首次打开自动运行回路
requestAnimationFrame(update);
// 首次绘制出底盘和格网
draw();
