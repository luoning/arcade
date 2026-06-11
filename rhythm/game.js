/**
 * Neon Rhythm - 霓虹节奏音轨 游戏核心逻辑
 */

// Web Audio API 合成音色及节奏引擎
class RhythmSynth {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.tempoInterval = null;
    this.bpm = 125;
    this.beatCount = 0;
    
    // 4个轨道对应的合成器唱名基准频率：C4 (D键), E4 (F键), G4 (J键), C5 (K键)
    this.laneFreqs = [261.63, 329.63, 392.00, 523.25];
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 播放轨道敲击成功的音符
  playNote(lane) {
    if (this.muted) return;
    this.init();
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // 轨道对应不同波形以丰富音色
    const types = ['triangle', 'sine', 'triangle', 'sine'];
    osc.type = types[lane];
    
    const freq = this.laneFreqs[lane];
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    // 快速起音 (Attack) + 衰减 (Decay)
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.24);
  }

  // 播放漏掉音符的低沉摩擦音
  playMiss() {
    if (this.muted) return;
    this.init();
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // 循环播放背景节奏电子鼓点 (Bass Beat)
  startBeat(onBeatCallback) {
    this.init();
    this.stopBeat();
    
    const intervalMs = (60 / this.bpm) * 1000 / 2; // 八分音符节拍
    this.tempoInterval = setInterval(() => {
      if (this.muted) {
        onBeatCallback(this.beatCount);
        this.beatCount++;
        return;
      }
      
      const time = this.ctx.currentTime;
      
      // 每4拍一个重音 Bass Drum
      if (this.beatCount % 4 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
        
        gain.gain.setValueAtTime(0.18, time);
        gain.gain.linearRampToValueAtTime(0.001, time + 0.12);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(time + 0.12);
      } 
      // 每2拍一个轻音 Hi-hat
      else if (this.beatCount % 2 === 0) {
        // 白噪音/高频金属摩擦模拟
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(10000, time);
        
        gain.gain.setValueAtTime(0.02, time);
        gain.gain.linearRampToValueAtTime(0.001, time + 0.04);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(time + 0.04);
      }
      
      onBeatCallback(this.beatCount);
      this.beatCount++;
    }, intervalMs);
  }

  stopBeat() {
    if (this.tempoInterval) {
      clearInterval(this.tempoInterval);
      this.tempoInterval = null;
    }
    this.beatCount = 0;
  }
}

const synth = new RhythmSynth();

// 游戏物理参数
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const shieldVal = document.getElementById('shieldVal');
const scoreVal = document.getElementById('scoreVal');
const comboContainer = document.getElementById('comboContainer');
const comboCount = document.getElementById('comboCount');
const judgmentText = document.getElementById('judgmentText');

const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const muteBtn = document.getElementById('muteBtn');

// 物理高度及区间参数
const HIT_ZONE_Y = 420; // 判定线所处的 Y 坐标
const HIT_THRESHOLD_PERFECT = 18; // 判定完美偏差像素
const HIT_THRESHOLD_GOOD = 35;    // 判定良好偏差像素
const NOTE_HEIGHT = 16;           // 音符厚度

let isPlaying = false;
let score = 0;
let shield = 100;
let combo = 0;
let baseSpeed = 5.0; // 基础音符滑落速度
let activeSpeed = 5.0;
let noteSpawnChance = 0.45; // 音符下发几率

let notes = []; // 存活的音符：[{lane, y, hit}]
let particles = []; // 火花炸裂粒子
let keyStates = [false, false, false, false]; // D, F, J, K 的按下状态
let hitFlashes = [0, 0, 0, 0]; // 四条轨道撞击发光度

const COLORS = {
  bg: '#030107',
  trackLine: 'rgba(157, 78, 221, 0.18)',
  laneColors: ['#ff007f', '#9d4edd', '#00f5d4', '#fee440'], // D, F, J, K
  laneFlashes: [
    'rgba(255, 0, 127, 0.15)',
    'rgba(157, 78, 221, 0.15)',
    'rgba(0, 245, 212, 0.15)',
    'rgba(254, 228, 64, 0.15)'
  ]
};

// 初始化游戏
function startNewGame() {
  score = 0;
  shield = 100;
  combo = 0;
  baseSpeed = 5.0;
  activeSpeed = 5.0;
  notes = [];
  particles = [];
  keyStates = [false, false, false, false];
  hitFlashes = [0, 0, 0, 0];

  updateHUD();
  
  startOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  
  isPlaying = true;
  
  // 启动节拍鼓点，根据节拍规律刷新音符
  synth.bpm = 125;
  synth.startBeat((beat) => {
    if (!isPlaying) return;
    
    // 随得分递增，小幅提速和提高曲目节奏 BPM
    if (score > 0 && score % 1500 === 0) {
      activeSpeed = Math.min(9.5, baseSpeed + (score / 3000));
      synth.bpm = Math.min(160, 125 + Math.floor(score / 500));
    }

    // 每一拍都有概率随机下落音符
    if (beat % 2 === 0) { // 限制在强拍/弱拍
      const randLane = Math.floor(Math.random() * 4);
      if (Math.random() < noteSpawnChance) {
        notes.push({ lane: randLane, y: -20, hit: false });
      }
    }
  });

  gameLoop();
}

function updateHUD() {
  scoreVal.textContent = String(score).padStart(5, '0');
  shieldVal.textContent = `${shield}%`;
  if (shield <= 30) {
    shieldVal.style.color = '#ff007f';
  } else {
    shieldVal.style.color = '';
  }
}

// 判定提示文本显示
let judgmentTimer = null;
function showJudgment(type) {
  judgmentText.className = `judgment-text ${type.toLowerCase()}`;
  judgmentText.textContent = type;
  judgmentText.style.opacity = 1;
  judgmentText.style.transform = 'translate(-50%, -50%) scale(1.2)';
  
  if (judgmentTimer) clearTimeout(judgmentTimer);
  judgmentTimer = setTimeout(() => {
    judgmentText.style.opacity = 0;
    judgmentText.style.transform = 'translate(-50%, -50%) scale(1.0)';
  }, 350);
}

// 连击显示
function updateCombo(val) {
  combo = val;
  if (combo >= 50) {
    try {
      if (window.parent && window.parent.ArcadeAPI) {
        window.parent.ArcadeAPI.unlock('rhythm', 'rhythm_combo');
      } else {
        window.parent.postMessage({ type: 'UNLOCK_ACHIEVEMENT', gameId: 'rhythm', achievementId: 'rhythm_combo' }, '*');
      }
    } catch (e) {}
  }
  if (combo >= 3) {
    comboCount.textContent = combo;
    comboContainer.classList.remove('hidden');
    // 闪烁大招缩放
    comboContainer.style.transform = 'translate(-50%, -50%) scale(1.15)';
    setTimeout(() => {
      comboContainer.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 100);
  } else {
    comboContainer.classList.add('hidden');
  }
}

// 打击事件判定
function performHit(lane) {
  synth.init();
  
  // 查找该轨道最接近判定线的音符
  let targetNote = null;
  let minDiff = Infinity;
  let targetIndex = -1;

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    if (note.lane === lane && !note.hit) {
      const diff = Math.abs(note.y - HIT_ZONE_Y);
      if (diff < minDiff && note.y < HIT_ZONE_Y + 50) {
        minDiff = diff;
        targetNote = note;
        targetIndex = i;
      }
    }
  }

  // 激活轨道撞击发光
  hitFlashes[lane] = 1.0;

  if (targetNote) {
    if (minDiff <= HIT_THRESHOLD_PERFECT) {
      // 完美击中
      targetNote.hit = true;
      showJudgment('PERFECT');
      const pts = 100 + Math.floor(combo * 1.5);
      score += pts;
      updateCombo(combo + 1);
      createHitParticles(lane, targetNote.y, COLORS.laneColors[lane], 20);
      synth.playNote(lane);
    } else if (minDiff <= HIT_THRESHOLD_GOOD) {
      // 良好击中
      targetNote.hit = true;
      showJudgment('GOOD');
      const pts = 50 + Math.floor(combo * 0.8);
      score += pts;
      updateCombo(combo + 1);
      createHitParticles(lane, targetNote.y, COLORS.laneColors[lane], 10);
      synth.playNote(lane);
    } else {
      // 偏差太大判定为 MISS
      triggerMiss();
    }
  } else {
    // 空敲不处罚，仅触发音符发声
    synth.playNote(lane);
  }
  updateHUD();
}

function triggerMiss() {
  showJudgment('MISS');
  updateCombo(0);
  shield = Math.max(0, shield - 10);
  synth.playMiss();
  
  if (shield <= 0) {
    handleGameOver();
  }
}

// 击中火花爆炸效果
function createHitParticles(lane, y, color, count) {
  const laneWidth = canvas.width / 4;
  const x = lane * laneWidth + laneWidth / 2;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * (laneWidth - 10),
      y: y + (Math.random() - 0.5) * NOTE_HEIGHT,
      vx: (Math.random() - 0.5) * 5,
      vy: -(Math.random() * 4 + 2),
      radius: Math.random() * 3 + 1,
      color: color,
      life: 25
    });
  }
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * (p.life / 25), 0, Math.PI * 2);
    ctx.fill();

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function handleGameOver() {
  isPlaying = false;
  synth.stopBeat();
  document.getElementById('finalScore').textContent = String(score).padStart(5, '0');
  gameOverOverlay.classList.remove('hidden');
}

// 核心渲染主循环
function gameLoop() {
  if (!isPlaying) return;

  // 1. 清屏
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const laneWidth = canvas.width / 4;

  // 2. 绘制4条轨道的背景发光与隔线
  for (let i = 0; i < 4; i++) {
    const x = i * laneWidth;
    
    // 如果对应的物理按键正处于按下状态，或刚刚发生过碰撞，绘制光幕
    if (keyStates[i] || hitFlashes[i] > 0.01) {
      const alpha = Math.max(0, keyStates[i] ? 0.2 : hitFlashes[i] * 0.15);
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.8, COLORS.laneFlashes[i].replace('0.15', String(alpha)));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = grad;
      ctx.fillRect(x + 1, 0, laneWidth - 2, canvas.height);
    }

    // 绘制轨道左侧边界
    if (i > 0) {
      ctx.strokeStyle = COLORS.trackLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // 逐渐减退轨道光幕亮度
    if (hitFlashes[i] > 0) {
      hitFlashes[i] -= 0.08;
    }
  }

  // 3. 绘制底部的判定线区域 (HIGH NEON LASER ZONE)
  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#ff007f';
  ctx.strokeStyle = '#ff007f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, HIT_ZONE_Y);
  ctx.lineTo(canvas.width, HIT_ZONE_Y);
  ctx.stroke();
  ctx.restore();

  // 绘制各个音轨打击点的虚影外框指示圈
  for (let i = 0; i < 4; i++) {
    const x = i * laneWidth + laneWidth / 2;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(i * laneWidth + 6, HIT_ZONE_Y - NOTE_HEIGHT/2, laneWidth - 12, NOTE_HEIGHT);
    ctx.restore();
  }

  // 4. 移动并绘制音符
  for (let i = notes.length - 1; i >= 0; i--) {
    const note = notes[i];
    if (!note.hit) {
      note.y += activeSpeed;
      
      // 绘制带发光的彩色音符块
      const x = note.lane * laneWidth + 8;
      const w = laneWidth - 16;
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = COLORS.laneColors[note.lane];
      ctx.fillStyle = COLORS.laneColors[note.lane];
      
      // 圆角矩形音符
      ctx.beginPath();
      ctx.roundRect(x, note.y - NOTE_HEIGHT/2, w, NOTE_HEIGHT, 4);
      ctx.fill();
      ctx.restore();

      // 如果音符掉出视口底部判定线以下，判定 MISS
      if (note.y > HIT_ZONE_Y + 40) {
        notes.splice(i, 1);
        triggerMiss();
        updateHUD();
      }
    } else {
      // 已经被敲中的音符直接踢除
      notes.splice(i, 1);
    }
  }

  // 5. 绘制粒子花火
  drawParticles();

  requestAnimationFrame(gameLoop);
}

// 键盘控制映射 D, F, J, K
const KEY_MAP = {
  'd': 0, 'D': 0,
  'f': 1, 'F': 1,
  'j': 2, 'J': 2,
  'k': 3, 'K': 3
};

window.addEventListener('keydown', (e) => {
  if (!isPlaying) return;
  const lane = KEY_MAP[e.key];
  if (lane !== undefined && !keyStates[lane]) {
    keyStates[lane] = true;
    
    // 触发虚拟键 UI 状态
    const keyName = e.key.toLowerCase();
    const pad = document.getElementById(`pad${keyName.toUpperCase()}`);
    if (pad) pad.classList.add('active');

    performHit(lane);
  }
});

window.addEventListener('keyup', (e) => {
  const lane = KEY_MAP[e.key];
  if (lane !== undefined) {
    keyStates[lane] = false;
    
    // 移除虚拟键 UI 状态
    const keyName = e.key.toLowerCase();
    const pad = document.getElementById(`pad${keyName.toUpperCase()}`);
    if (pad) pad.classList.remove('active');
  }
});

// 虚拟按键触控点击
document.querySelectorAll('.pad-btn').forEach(pad => {
  const lane = KEY_MAP[pad.getAttribute('data-key')];
  
  // 鼠标/触控按下
  const onPress = (e) => {
    e.preventDefault();
    if (!isPlaying) return;
    keyStates[lane] = true;
    pad.classList.add('active');
    performHit(lane);
  };

  // 释放
  const onRelease = (e) => {
    e.preventDefault();
    keyStates[lane] = false;
    pad.classList.remove('active');
  };

  pad.addEventListener('mousedown', onPress);
  pad.addEventListener('mouseup', onRelease);
  pad.addEventListener('touchstart', onPress, { passive: false });
  pad.addEventListener('touchend', onRelease, { passive: false });
});

// 各功能按钮事件
startBtn.addEventListener('click', () => {
  synth.init();
  startNewGame();
});

restartBtn.addEventListener('click', () => {
  synth.init();
  startNewGame();
});

muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  synth.init();
  synth.muted = !synth.muted;
  muteBtn.classList.toggle('muted', synth.muted);
});
