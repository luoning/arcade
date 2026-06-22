// --- 大航海：无尽航路 (Uncharted Waters Roguelike) 核心逻辑 ---

// --- 游戏状态与核心资产数据 ---
const gameState = {
  days: 1,
  gold: 350,
  supplies: 100,
  maxSupplies: 100,
  hull: 100,
  maxHull: 100,
  
  // 货舱容量与货物
  cargoCapacity: 60,
  cargoUsed: 0,
  cargo: {
    spices: 0,  // 香料
    tea: 0,     // 茶叶
    wood: 0,    // 木材
    wine: 0,    // 红酒
    iron: 0     // 铁矿
  },

  // 船只升级属性
  upgrades: {
    cargo: 0,   // 货舱扩建层数
    armor: 0,   // 护甲强化层数
    sail: 0,    // 船帆改装层数
    cannon: 0   // 火炮加装层数
  },

  // 物理与风向
  shipX: 1000,
  shipY: 1000,
  targetX: 1000,
  targetY: 1000,
  shipAngle: 0,
  shipSpeed: 2.2,
  
  windAngle: Math.PI / 4, // 东北风
  windSpeed: 4,          // 4 节
  
  currentPort: null,     // 当前停靠的港口
  ports: [],             // 大地图港口
  isNavigating: false,   // 是否正在航行
  visitedMap: [],         // 迷雾揭开数据 (2D Grid)
  shipTrails: [],         // 航行尾迹粒子数组
  navigationPath: [],     // A* 导航路线节点数组
  npcShips: [],            // NPC 智能体船舶数组
  isDragging: false,      // 是否正在按住拖拽控制船只
  dragX: 0,               // 拖拽控制的目标世界X
  dragY: 0,                // 拖拽控制的目标世界Y
  seaWaves: [],           // 古典海浪纹路数组
  blockedGrid: []         // A* 静态网格碰撞缓存 [col][row]
};

// 货物基础属性与各港口物价乘数
const GOODS_DATA = {
  spices: { name: "南洋香料 🌶️", basePrice: 40 },
  tea: { name: "东方茶叶 🍃", basePrice: 30 },
  wood: { name: "寒带原木 🌲", basePrice: 12 },
  wine: { name: "西洋红酒 🍷", basePrice: 25 },
  iron: { name: "粗制铁矿 🔩", basePrice: 15 }
};

// 6 个港口数据定义 (具有动态物价偏好)
const PORTS_PRESETS = [
  { name: "里斯本皇家港", x: 950, y: 920, desc: "地处交通要道，红酒与原木贸易频繁。", multiplier: { spices: 1.1, tea: 1.0, wood: 0.7, wine: 0.6, iron: 1.1 } },
  { name: "塞维尔集市", x: 1300, y: 780, desc: "南洋香料的集中倾销地，对香料需求量大且便宜。", multiplier: { spices: 0.5, tea: 1.2, wood: 1.1, wine: 1.0, iron: 0.9 } },
  { name: "普利茅斯煤港", x: 1050, y: 1350, desc: "高寒重工业矿港。原木和铁矿极其低廉，急需红酒和香料。", multiplier: { spices: 1.5, tea: 0.8, wood: 0.5, wine: 1.6, iron: 0.5 } },
  { name: "热那亚商埠", x: 620, y: 1100, desc: "地中海金融核心，奢华物资云集，茶叶和红酒需求量极大。", multiplier: { spices: 1.0, tea: 1.5, wood: 1.0, wine: 0.6, iron: 1.3 } },
  { name: "亚历山大前哨", x: 1650, y: 1400, desc: "东行线的中转站，极其渴望西方原木和钢铁。", multiplier: { spices: 0.9, tea: 0.5, wood: 1.6, wine: 1.2, iron: 1.5 } },
  { name: "北海冰峰港", x: 1450, y: 1150, desc: "极寒碎冰港口，急需红酒暖胃，香料防腐。", multiplier: { spices: 1.6, tea: 1.1, wood: 0.6, wine: 1.8, iron: 0.8 } }
];

// --- Canvas 渲染器组件 ---
const canvas = document.getElementById('seaCanvas');
const ctx = canvas.getContext('2d');

// 虚拟地图尺寸 2000x2000
const MAP_SIZE = 2000;
const MAP_ZOOM = 3.5; // 【视野拉近系数】由卫星高度拉近至战路高度，海浪与细节更加突出
let cameraX = 1000;
let cameraY = 1000;

// 投影转换函数：将球体绕行算法世界坐标，向拉近后的镜头投影空间投射
function worldToScreen(wx, wy) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  let dx = wx - cameraX;
  if (dx > MAP_SIZE / 2) dx -= MAP_SIZE;
  else if (dx < -MAP_SIZE / 2) dx += MAP_SIZE;

  let dy = wy - cameraY;
  if (dy > MAP_SIZE / 2) dy -= MAP_SIZE;
  else if (dy < -MAP_SIZE / 2) dy += MAP_SIZE;

  return {
    x: dx * MAP_ZOOM + cx,
    y: dy * MAP_ZOOM + cy
  };
}

// 海洋与岛屿生成数据 (种子生成)
const islands = [];
function generateIslands() {
  for (let i = 0; i < 18; i++) {
    const rx = 100 + Math.random() * (MAP_SIZE - 200);
    const ry = 100 + Math.random() * (MAP_SIZE - 200);
    
    // 避开玩家出生点 (1000, 1000)
    if (Math.abs(rx - 1000) < 150 && Math.abs(ry - 1000) < 150) {
      continue;
    }

    const radius = 60 + Math.random() * 80;
    const vertexCount = 6 + Math.floor(Math.random() * 4);
    const vertices = [];
    
    for (let v = 0; v < vertexCount; v++) {
      const angle = (v / vertexCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const r = radius * (0.75 + Math.random() * 0.4);
      vertices.push({
        x: rx + Math.cos(angle) * r,
        y: ry + Math.sin(angle) * r
      });
    }

    islands.push({ x: rx, y: ry, radius: radius, vertices: vertices });
  }
}

// 战争迷雾数据 (Canvas羽化遮罩刮开效果)
const fogCanvas = document.createElement('canvas');
const fogCtx = fogCanvas.getContext('2d');

function initFog() {
  fogCanvas.width = MAP_SIZE;
  fogCanvas.height = MAP_SIZE;
  
  // 填充带有手绘羊皮纸杂质感的迷雾原色
  fogCtx.fillStyle = '#dfd3bb';
  fogCtx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

  // 给迷雾加一些微弱的手绘线条底纹
  fogCtx.strokeStyle = 'rgba(124, 98, 67, 0.12)';
  fogCtx.lineWidth = 1;
  for (let i = 0; i < MAP_SIZE; i += 60) {
    fogCtx.beginPath();
    fogCtx.moveTo(i, 0);
    fogCtx.lineTo(i, MAP_SIZE);
    fogCtx.moveTo(0, i);
    fogCtx.lineTo(MAP_SIZE, i);
    fogCtx.stroke();
  }
  
  // 默认在大本营港口周围刮开一层可见区
  gameState.ports.forEach(p => {
    revealFogAt(p.x, p.y, 150); // 视野拉近后将港口刮雾圆度同步调整为150px
  });
}

function revealFogAt(x, y, radius) {
  for (let ox = -MAP_SIZE; ox <= MAP_SIZE; ox += MAP_SIZE) {
    for (let oy = -MAP_SIZE; oy <= MAP_SIZE; oy += MAP_SIZE) {
      const tx = x + ox;
      const ty = y + oy;
      
      if (tx + radius < 0 || tx - radius > MAP_SIZE || ty + radius < 0 || ty - radius > MAP_SIZE) {
        continue;
      }
      
      fogCtx.save();
      fogCtx.globalCompositeOperation = 'destination-out';
      
      const grad = fogCtx.createRadialGradient(tx, ty, 0, tx, ty, radius);
      grad.addColorStop(0, 'rgba(0,0,0,1)');      
      grad.addColorStop(0.65, 'rgba(0,0,0,0.85)'); 
      grad.addColorStop(0.85, 'rgba(0,0,0,0.2)');  
      grad.addColorStop(1, 'rgba(0,0,0,0)');       
      
      fogCtx.fillStyle = grad;
      fogCtx.beginPath();
      fogCtx.arc(tx, ty, radius, 0, Math.PI * 2);
      fogCtx.fill();
      
      fogCtx.restore();
    }
  }
}

function revealFog() {
  revealFogAt(gameState.shipX, gameState.shipY, 110);
}

// --- 游戏初始化 ---
function initGame() {
  resizeCanvas();
  generateIslands();

  // 部署港口 (将前6个港口精准绑定在前6个岛屿海岸线外缘)
  gameState.ports = PORTS_PRESETS.map((p, idx) => {
    const island = islands[idx % islands.length];
    const angle = (idx / 6) * Math.PI * 2; 
    const px = Math.round(island.x + Math.cos(angle) * (island.radius + 22));
    const py = Math.round(island.y + Math.sin(angle) * (island.radius + 22));
    return {
      ...p,
      x: px,
      y: py,
      suppliesCost: 5 + Math.floor(Math.random() * 4) 
    };
  });

  initFog();
  createNPCShips();

  // 生成 25 条古典手绘海浪线
  gameState.seaWaves = [];
  for (let i = 0; i < 25; i++) {
    gameState.seaWaves.push({
      x: Math.random() * MAP_SIZE,
      y: Math.random() * MAP_SIZE,
      width: 25 + Math.random() * 20, 
      phase: Math.random() * Math.PI * 2, 
      speed: 0.1 + Math.random() * 0.15, 
      pulseSpeed: 0.02 + Math.random() * 0.03 
    });
  }

  // 预生成 A* 网格静态碰撞缓存，寻路性能极速狂飙
  const gSize = 20;
  const cols = Math.floor(MAP_SIZE / gSize);
  const rows = Math.floor(MAP_SIZE / gSize);
  gameState.blockedGrid = [];
  for (let c = 0; c < cols; c++) {
    gameState.blockedGrid[c] = [];
    for (let r = 0; r < rows; r++) {
      const wx = c * gSize + gSize / 2;
      const wy = r * gSize + gSize / 2;
      let blocked = false;
      
      for (let i = 0; i < islands.length; i++) {
        const isl = islands[i];
        let dx = isl.x - wx;
        if (dx > MAP_SIZE / 2) dx -= MAP_SIZE;
        else if (dx < -MAP_SIZE / 2) dx += MAP_SIZE;
        
        let dy = isl.y - wy;
        if (dy > MAP_SIZE / 2) dy -= MAP_SIZE;
        else if (dy < -MAP_SIZE / 2) dy += MAP_SIZE;

        if (Math.hypot(dx, dy) < isl.radius + 6) {
          blocked = true;
          break;
        }
      }
      gameState.blockedGrid[c][r] = blocked;
    }
  }

  // 玩家出生在一号港口
  gameState.shipX = gameState.ports[0].x;
  gameState.shipY = gameState.ports[0].y;
  gameState.targetX = gameState.shipX;
  gameState.targetY = gameState.shipY;
  
  revealFog();
  updateHUD();

  // 绑定封面启动按钮
  const startBtn = document.getElementById('start-game-btn');
  const startOverlay = document.getElementById('start-screen-overlay');
  if (startBtn && startOverlay) {
    startBtn.onclick = (e) => {
      e.stopPropagation();
      startOverlay.classList.add('hidden');
      enterPort(gameState.ports[0]);
      setInterval(tickGameDay, 4000);
    };
  } else {
    enterPort(gameState.ports[0]);
    setInterval(tickGameDay, 4000);
  }

  requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// --- 航海日变化 (Day Tick) ---
function tickGameDay() {
  if (gameState.isNavigating) {
    gameState.days += 1;
    adjustStats(-1, 0, 0);

    if (gameState.supplies <= 0) {
      adjustStats(0, -8, 0);
      if (gameState.hull <= 0) {
        triggerGameOver("饥荒肆虐，船员失去了意志，小木船葬送在惊涛中。");
      }
    }

    if (Math.random() < 0.12) {
      triggerRandomSeaEvent();
    }
  }

  if (Math.random() < 0.4) {
    gameState.windAngle = Math.random() * Math.PI * 2;
    gameState.windSpeed = 2 + Math.floor(Math.random() * 5); 
    updateHUD();
  }
}

// --- 海上遭遇战与随机事件 ---
function triggerRandomSeaEvent() {
  const eventType = Math.random();

  if (eventType < 0.35) {
    const goldEarned = 80 + Math.floor(Math.random() * 40);
    adjustStats(0, 0, goldEarned);
    showToast(`📦 漂流货箱：打捞海面商船遗物，获得金币 +${goldEarned} 🪙`);

  } else if (eventType < 0.7) {
    if (gameState.upgrades.sail > 0 && gameState.supplies >= 15) {
      adjustStats(-15, 0, 0);
      showToast("🌩️ 突发雷暴：水手操纵飞剪帆强行避风，消耗粮食 supplies -15");
    } else {
      const dmg = 15;
      adjustStats(0, -dmg, 0);
      showToast(`🌩️ 突发雷暴：巨浪扑打甲板，避风不及，船体受损 -${dmg} Hull`);
      if (gameState.hull <= 0) {
        triggerGameOver("狂风巨浪撕裂了木质甲板，船只沉没在无尽风暴中。");
      }
    }

  } else {
    const firePower = gameState.upgrades.cannon;
    if (firePower > 0) {
      const winGold = 120 + Math.floor(Math.random() * 60);
      adjustStats(0, -8, winGold);
      showToast(`🏴‍☠️ 海盗退治：开火还击！火炮压制敌船，抢夺战利品 +${winGold} 🪙 (船体擦伤-8)`);
      if (gameState.hull <= 0) {
        triggerGameOver("战火引爆了炸药桶，船只沉没在火海中。");
      }
    } else {
      if (gameState.gold >= 80) {
        adjustStats(0, 0, -80);
        showToast("🏴‍☠️ 遭遇劫掠：船只无火炮反击，被迫向海盗缴纳过路费 -80 🪙 消灾");
      } else {
        let lostCount = 0;
        Object.keys(gameState.cargo).forEach(k => {
          if (gameState.cargo[k] > 0) {
            const lost = Math.ceil(gameState.cargo[k] * 0.5);
            gameState.cargo[k] -= lost;
            gameState.cargoUsed -= lost;
            lostCount += lost;
          }
        });
        const dmg = 20;
        adjustStats(0, -dmg, 0);
        showToast(`🏴‍☠️ 海盗洗劫：金币不足！海盗洗劫了货舱部分货物，并砸坏了龙骨 (-${dmg} Hull)`);
        if (gameState.hull <= 0) {
          triggerGameOver("船体龙骨被海盗砍断，小船在大海中央沉没。");
        }
      }
    }
  }
}

// --- 港口停靠与交互界面 (太阁/航海4 风格) ---
function enterPort(port) {
  gameState.currentPort = port;
  gameState.isNavigating = false;
  gameState.targetX = gameState.shipX = port.x;
  gameState.targetY = gameState.shipY = port.y;

  document.getElementById('port-name').textContent = `⚓ ${port.name}`;
  document.getElementById('port-desc').textContent = port.desc;

  switchTab('market');

  const panel = document.getElementById('port-panel');
  if (panel) {
    panel.style.removeProperty('display');
    panel.classList.remove('hidden');
  }
  updateHUD();
}

const tabs = ['market', 'tavern', 'shipyard'];
tabs.forEach(tName => {
  document.getElementById(`tab-${tName}-btn`).onclick = () => switchTab(tName);
});

function switchTab(tabName) {
  tabs.forEach(t => {
    document.getElementById(`tab-${t}-btn`).classList.remove('active');
    document.getElementById(`${t}-sec`).classList.add('hidden');
  });
  document.getElementById(`tab-${tabName}-btn`).classList.add('active');
  document.getElementById(`${tabName}-sec`).classList.remove('hidden');

  if (tabName === 'market') renderMarketTable();
  if (tabName === 'tavern') renderTavern();
}

// A. 交易所列表绘制
function renderMarketTable() {
  const tbody = document.getElementById('trade-goods-list');
  tbody.innerHTML = "";
  
  const mult = gameState.currentPort.multiplier;

  Object.keys(GOODS_DATA).forEach(key => {
    const item = GOODS_DATA[key];
    const price = Math.round(item.basePrice * mult[key]);
    const hold = gameState.cargo[key];

    const diffPct = Math.round((mult[key] - 1) * 100);
    let profitBadge = "";
    if (diffPct > 20) {
      profitBadge = `<span style="color:#d35400; font-weight:bold;">🔥 暴利 (+${diffPct}%)</span>`;
    } else if (diffPct > 0) {
      profitBadge = `<span style="color:#a33b26; font-weight:bold;">📈 高价 (+${diffPct}%)</span>`;
    } else if (diffPct < -20) {
      profitBadge = `<span style="color:#27ae60; font-weight:bold;">💎 极低 (${diffPct}%)</span>`;
    } else {
      profitBadge = `<span style="color:#2ecc71; font-weight:bold;">📉 低廉 (${diffPct}%)</span>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td><strong>${price}</strong> 🪙</td>
      <td>${profitBadge}</td>
      <td>${hold} 个</td>
      <td>
        <div class="trade-btn-group">
          <button onclick="tradeItem('${goodKeyMapping(key)}', 'buy', ${price})" class="action-btn">买入</button>
          <button onclick="tradeItem('${goodKeyMapping(key)}', 'sell', ${price})" class="action-btn">卖出</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function goodKeyMapping(k) {
  return k;
}

window.sellAllCargo = () => {
  let totalGoldEarned = 0;
  let itemsSold = 0;
  const mult = gameState.currentPort.multiplier;

  Object.keys(gameState.cargo).forEach(key => {
    const holdCount = gameState.cargo[key];
    if (holdCount > 0) {
      const price = Math.round(GOODS_DATA[key].basePrice * mult[key]);
      const gold = holdCount * price;
      
      gameState.gold += gold;
      totalGoldEarned += gold;
      itemsSold += holdCount;
      
      gameState.cargo[key] = 0;
    }
  });

  if (itemsSold === 0) {
    showToast("🚫 货舱空空如也，无可卖之物！");
    return;
  }

  gameState.cargoUsed = 0;
  showToast(`💰 倾仓抛售！一次性卖出 ${itemsSold} 件货物，共计入账 +${totalGoldEarned} 🪙 金币！`);
  renderMarketTable();
  updateHUD();
};

window.tradeItem = (goodKey, type, price) => {
  if (type === 'buy') {
    if (gameState.gold < price) {
      showToast("🪙 金币不足！多跑几趟低价货物赚取差价吧。");
      return;
    }
    if (gameState.cargoUsed >= gameState.cargoCapacity) {
      showToast("📦 货舱已满！去造船厂扩建货舱，或者抛售货物。");
      return;
    }
    gameState.gold -= price;
    gameState.cargo[goodKey]++;
    gameState.cargoUsed++;
  } else {
    if (gameState.cargo[goodKey] <= 0) {
      showToast("🚫 货舱中并无此类货物！");
      return;
    }
    gameState.gold += price;
    gameState.cargo[goodKey]--;
    gameState.cargoUsed--;
  }
  renderMarketTable();
  updateHUD();
};

// B. 酒馆奇遇
function renderTavern() {
  const dialog = document.getElementById('tavern-dialog');
  const opts = document.getElementById('tavern-options');
  opts.innerHTML = "";

  const rand = Math.random();
  if (rand < 0.45) {
    dialog.textContent = `“老板，给我的兄弟们注满淡水和咸麦饼！”（补给站：消耗金币采购补给食物）`;
    const cost = gameState.currentPort.suppliesCost;
    
    const buyBtn = document.createElement('button');
    buyBtn.className = "action-btn";
    buyBtn.textContent = `采购粮食补给 (+25) // 消耗 ${cost} 金币`;
    buyBtn.onclick = () => {
      if (gameState.gold >= cost) {
        adjustStats(25, 0, -cost);
        renderTavern();
      } else {
        showToast("🪙 囊中羞涩！金币不够买麦饼。");
      }
    };
    opts.appendChild(buyBtn);

  } else if (rand < 0.75) {
    dialog.textContent = `“我这里有一张在沉船中找到的古老羊皮纸残卷，你可以花钱买下...”`;
    
    const mapBtn = document.createElement('button');
    mapBtn.className = "action-btn";
    mapBtn.textContent = `买下古海图残页 // 消耗 80 金币`;
    mapBtn.onclick = () => {
      if (gameState.gold >= 80) {
        adjustStats(0, 0, -80);
        revealLargeFog();
        showToast("🗺️ 成功拼凑出海图残卷，远方未知海域的迷雾退去了！");
        renderTavern();
      } else {
        showToast("🪙 金币不足！");
      }
    };
    opts.appendChild(mapBtn);
  } else {
    const otherPorts = gameState.ports.filter(p => p.name !== gameState.currentPort.name);
    const targetPort = otherPorts[Math.floor(Math.random() * otherPorts.length)];
    
    const mult = targetPort.multiplier;
    let cheapestGood = null;
    let expensiveGood = null;
    let minMult = 999;
    let maxMult = -1;

    Object.keys(mult).forEach(key => {
      if (mult[key] < minMult) {
        minMult = mult[key];
        cheapestGood = key;
      }
      if (mult[key] > maxMult) {
        maxMult = mult[key];
        expensiveGood = key;
      }
    });

    const cheapName = GOODS_DATA[cheapestGood].name;
    const expensiveName = GOODS_DATA[expensiveGood].name;

    dialog.textContent = `木桶上坐着一个胡子拉碴的醉酒老水手，端着杯子冲你笑。你可以向他打听远洋商旅的情报。`;
    
    const checkBtn = document.createElement('button');
    checkBtn.className = "action-btn";
    checkBtn.textContent = "倾听航线传闻 (无消耗)";
    checkBtn.onclick = () => {
      showToast(`📢 传闻线索：\n水手打了个饱嗝：“我表哥刚从【${targetPort.name}】回来，听说那里的【${cheapName}】贱卖得像垃圾，但是那帮家伙极度渴望【${expensiveName}】，价格炒上天了！”`);
    };
    opts.appendChild(checkBtn);
  }

  const repairBtn = document.createElement('button');
  repairBtn.className = "action-btn";
  repairBtn.textContent = `修理受损船体 (恢复+30 Hull) // 消耗 40 金币`;
  repairBtn.onclick = () => {
    if (gameState.gold >= 40) {
      adjustStats(0, 30, -40);
    } else {
      showToast("🪙 金币不够，船坞木匠拒绝为你开工修理！");
    }
  };
  opts.appendChild(repairBtn);
}

function revealLargeFog() {
  const rx = 200 + Math.random() * (MAP_SIZE - 400);
  const ry = 200 + Math.random() * (MAP_SIZE - 400);
  revealFogAt(rx, ry, 320); 
}

// C. 造船厂升级
window.buyUpgrade = (type) => {
  let cost = 0;
  if (type === 'cargo') cost = 150;
  if (type === 'armor') cost = 120;
  if (type === 'sail') cost = 200;
  if (type === 'cannon') cost = 180;

  if (gameState.gold < cost) {
    showToast("🪙 金币不足，配件商拒绝向你赊账！");
    return;
  }

  gameState.gold -= cost;
  gameState.upgrades[type]++;

  if (type === 'cargo') gameState.cargoCapacity += 20;
  if (type === 'armor') gameState.maxHull += 30;

  showToast(`🔨 改装成功！当前 [${type}] 已加装至第 ${gameState.upgrades[type]} 层`);
  updateHUD();
};

// 离港扬帆
window.leavePort = () => {
  console.log("LEAVE PORT FUNCTION CALLED");
  const panel = document.getElementById('port-panel');
  if (panel) {
    panel.style.setProperty('display', 'none', 'important');
    panel.classList.add('hidden');
  }
  gameState.isNavigating = false; 
  gameState.currentPort = null; 
  updateHUD();
};

// --- HUD 信息同步更新 ---
function updateHUD() {
  document.getElementById('supply-bar').style.width = `${(gameState.supplies / gameState.maxSupplies) * 100}%`;
  document.getElementById('supply-text').textContent = `${gameState.supplies}/${gameState.maxSupplies}`;

  document.getElementById('hull-bar').style.width = `${(gameState.hull / gameState.maxHull) * 100}%`;
  document.getElementById('hull-text').textContent = `${gameState.hull}/${gameState.maxHull}`;

  document.getElementById('gold-text').textContent = `${gameState.gold} 🪙`;
  document.getElementById('cargo-text').textContent = `${gameState.cargoUsed} / ${gameState.cargoCapacity} 个`;
  document.getElementById('days-val').textContent = `第 ${gameState.days} 天`;

  // 风力罗盘
  const deg = (gameState.windAngle * 180) / Math.PI;
  document.getElementById('wind-arrow').style.transform = `rotate(${deg}deg)`;
  
  let dirStr = "南风";
  if (deg > 337 || deg <= 22) dirStr = "北风";
  else if (deg > 22 && deg <= 67) dirStr = "东北风";
  else if (deg > 67 && deg <= 112) dirStr = "东风";
  else if (deg > 112 && deg <= 157) dirStr = "东南风";
  else if (deg > 157 && deg <= 202) dirStr = "南风";
  else if (deg > 202 && deg <= 247) dirStr = "西南风";
  else if (deg > 247 && deg <= 292) dirStr = "西风";
  else if (deg > 292 && deg <= 337) dirStr = "西北风";
  
  document.getElementById('wind-dir-val').textContent = dirStr;
  document.getElementById('wind-speed-val').textContent = `${gameState.windSpeed} 节`;

  // 达成2000金币，解锁大厅成就
  if (gameState.gold >= 2000) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'UNLOCK_ACHIEVEMENT',
        gameId: 'mainland',
        achievementId: 'mainland_gold'
      }, '*');
    }
  }
}

function adjustStats(supVal, hullVal, goldVal) {
  gameState.supplies = Math.max(0, Math.min(gameState.maxSupplies, gameState.supplies + supVal));
  gameState.hull = Math.max(0, Math.min(gameState.maxHull, gameState.hull + hullVal));
  gameState.gold = Math.max(0, gameState.gold + goldVal);
  updateHUD();
}

// --- 2D 帆船航行物理与点击输入 ---
function onCanvasClick(e) {
  console.log("Global Window Click Event Fired. Target:", e.target);

  if (e.target.closest('.log-panel') || e.target.closest('.hud-panel') || e.target.closest('.overlay') || e.target.closest('.action-btn')) {
    console.log("Click ignored: user clicked on HUD interactive elements.");
    return;
  }

  const portPanel = document.getElementById('port-panel');
  if (gameState.currentPort && portPanel && !portPanel.classList.contains('hidden')) {
    console.log("Click ignored: docked in port.");
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const canvasClickX = e.clientX - rect.left;
  const canvasClickY = e.clientY - rect.top;

  // 将屏幕输入坐标，通过 MAP_ZOOM 逆向解算，折算回大地图的世界坐标
  let worldX = (canvasClickX - canvas.width / 2) / MAP_ZOOM + cameraX;
  let worldY = (canvasClickY - canvas.height / 2) / MAP_ZOOM + cameraY;
  
  worldX = (worldX % MAP_SIZE + MAP_SIZE) % MAP_SIZE;
  worldY = (worldY % MAP_SIZE + MAP_SIZE) % MAP_SIZE;
  console.log("Calculated World Coordinates (Wrapped with Zoom):", worldX, worldY);

  // 判定是否点在某个港口锚点上
  const clickedPort = gameState.ports.find(p => {
    let pdx = p.x - worldX;
    if (pdx > MAP_SIZE / 2) pdx -= MAP_SIZE;
    else if (pdx < -MAP_SIZE / 2) pdx += MAP_SIZE;
    
    let pdy = p.y - worldY;
    if (pdy > MAP_SIZE / 2) pdy -= MAP_SIZE;
    else if (pdy < -MAP_SIZE / 2) pdy += MAP_SIZE;

    const d = Math.hypot(pdx, pdy);
    return d < 22; // 锚点半径
  });

  if (clickedPort) {
    console.log("Target Locked to Port Anchor:", clickedPort.name);
    gameState.targetX = clickedPort.x;
    gameState.targetY = clickedPort.y;
  } else {
    // 检查是否点在某个陆地上，若是则自动把 target 纠偏推到海岸线外侧
    const hitIsland = islands.find(isl => {
      let idx = isl.x - worldX;
      if (idx > MAP_SIZE / 2) idx -= MAP_SIZE;
      else if (idx < -MAP_SIZE / 2) idx += MAP_SIZE;

      let idy = isl.y - worldY;
      if (idy > MAP_SIZE / 2) idy -= MAP_SIZE;
      else if (idy < -MAP_SIZE / 2) idy += MAP_SIZE;

      const d = Math.hypot(idx, idy);
      return d < isl.radius;
    });

    if (hitIsland) {
      console.log("Target Locked to Land! Snapping to coast.");
      let angle = Math.atan2(worldY - hitIsland.y, worldX - hitIsland.x);
      
      let tx = Math.round(hitIsland.x + Math.cos(angle) * (hitIsland.radius + 22));
      let ty = Math.round(hitIsland.y + Math.sin(angle) * (hitIsland.radius + 22));
      
      worldX = (tx % MAP_SIZE + MAP_SIZE) % MAP_SIZE;
      worldY = (ty % MAP_SIZE + MAP_SIZE) % MAP_SIZE;
      showToast("🧭 航道纠偏：目标在陆地内部，已将航线终点推至海岸锚地。");
    }

    gameState.targetX = worldX;
    gameState.targetY = worldY;
  }

  // A* 避障寻路开始
  const path = findAStarPath(gameState.shipX, gameState.shipY, gameState.targetX, gameState.targetY);
  if (path && path.length > 0) {
    gameState.navigationPath = path;
    const firstNode = gameState.navigationPath.shift();
    gameState.targetX = firstNode.x;
    gameState.targetY = firstNode.y;
  } else {
    gameState.navigationPath = []; 
  }

  gameState.isNavigating = true;
  gameState.currentPort = null;
}

// 基于高分辨率 20px 网格的球体 A* 寻路算法
function findAStarPath(startX, startY, endX, endY) {
  const gridSize = 20; // 网格大小由 40 缩减至 20 像素，分辨率提升一倍，实现精细穿梭
  const cols = Math.floor(MAP_SIZE / gridSize);
  const rows = Math.floor(MAP_SIZE / gridSize);

  // 辅助函数：判断网格坐标 (cx, cy) 是否会碰触岛屿 (常驻 O(1) 碰撞阻挡判定)
  function isCellBlocked(cx, cy) {
    const safeC = (cx + cols) % cols;
    const safeR = (cy + rows) % rows;
    return gameState.blockedGrid[safeC] ? !!gameState.blockedGrid[safeC][safeR] : false;
  }

  const startGCol = Math.floor(startX / gridSize) % cols;
  const startGRow = Math.floor(startY / gridSize) % rows;
  const endGCol = Math.floor(endX / gridSize) % cols;
  const endGRow = Math.floor(endY / gridSize) % rows;

  // 辅助函数：球体网格的最短距离估值
  function getWrappedGridDist(c1, r1, c2, r2) {
    let dc = Math.abs(c1 - c2);
    if (dc > cols / 2) dc = cols - dc;
    let dr = Math.abs(r1 - r2);
    if (dr > rows / 2) dr = rows - dr;
    return Math.hypot(dc, dr);
  }

  const openSet = [];
  const closedSet = new Set();

  function cellKey(c, r) {
    return `${c},${r}`;
  }

  const startNode = {
    c: startGCol,
    r: startGRow,
    x: startX,
    y: startY,
    g: 0,
    h: getWrappedGridDist(startGCol, startGRow, endGCol, endGRow),
    parent: null
  };
  startNode.f = startNode.g + startNode.h;
  openSet.push(startNode);

  let iterations = 0;
  const maxIterations = 1500; 

  while (openSet.length > 0 && iterations++ < maxIterations) {
    // F 值极速寻优单次线性扫描 (代替原有 N log N 的 sort，流畅控制舵向)
    let minIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[minIdx].f) {
        minIdx = i;
      }
    }
    const current = openSet.splice(minIdx, 1)[0];

    if (current.c === endGCol && current.r === endGRow) {
      const pathPoints = [];
      let temp = current;
      while (temp.parent) {
        pathPoints.push({ x: temp.x, y: temp.y });
        temp = temp.parent;
      }
      pathPoints.reverse();
      pathPoints.push({ x: endX, y: endY });

      // 路径简化 (Path Smoothing/Simplification) -> 去除不必要的网格微小拐角
      return simplifyPath(pathPoints);
    }

    closedSet.add(cellKey(current.c, current.r));

    // 邻居八方向移动 (处理球体环绕)
    const dirs = [
      {dc:0, dr:-1}, {dc:0, dr:1}, {dc:-1, dr:0}, {dc:1, dr:0},
      {dc:-1, dr:-1}, {dc:1, dr:-1}, {dc:-1, dr:1}, {dc:1, dr:1}
    ];

    for (let d of dirs) {
      const neighborC = (current.c + d.dc + cols) % cols;
      const neighborR = (current.r + d.dr + rows) % rows;

      if (closedSet.has(cellKey(neighborC, neighborR))) continue;
      if (isCellBlocked(neighborC, neighborR)) continue;

      const gScore = current.g + Math.hypot(d.dc, d.dr);
      
      let neighborNode = openSet.find(n => n.c === neighborC && n.r === neighborR);
      if (!neighborNode) {
        const hVal = getWrappedGridDist(neighborC, neighborR, endGCol, endGRow);
        
        // 网格中心坐标需球形自适应
        const nX = (neighborC * gridSize + gridSize / 2) % MAP_SIZE;
        const nY = (neighborR * gridSize + gridSize / 2) % MAP_SIZE;

        neighborNode = {
          c: neighborC,
          r: neighborR,
          x: nX,
          y: nY,
          g: gScore,
          h: hVal,
          f: gScore + hVal,
          parent: current
        };
        openSet.push(neighborNode);
      } else if (gScore < neighborNode.g) {
        neighborNode.g = gScore;
        neighborNode.f = gScore + neighborNode.h;
        neighborNode.parent = current;
      }
    }
  }

  return [{ x: endX, y: endY }];
}

// 路径拉直算法
function simplifyPath(pts) {
  if (pts.length <= 2) return pts;
  
  const simplified = [];
  simplified.push(pts[0]);
  
  let currentIdx = 0;
  
  while (currentIdx < pts.length - 1) {
    let bestNextIdx = currentIdx + 1;
    
    // 尝试直接向前看，拉直连线
    for (let i = currentIdx + 2; i < pts.length; i++) {
      if (isLineWalkable(pts[currentIdx].x, pts[currentIdx].y, pts[i].x, pts[i].y)) {
        bestNextIdx = i; // 无碰撞，可以直接跳过中间点拉直！
      }
    }
    
    simplified.push(pts[bestNextIdx]);
    currentIdx = bestNextIdx;
  }
  
  return simplified;
}

// 检查两点之间连线是否安全 (无陆地岛屿碰撞)
function isLineWalkable(x1, y1, x2, y2) {
  const steps = 15;
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    // 考虑球体环绕线性插值
    let ix = x1 + (x2 - x1) * t;
    let iy = y1 + (y2 - y1) * t;
    
    // 映射到球体空间
    ix = (ix % MAP_SIZE + MAP_SIZE) % MAP_SIZE;
    iy = (iy % MAP_SIZE + MAP_SIZE) % MAP_SIZE;

    // 检查这个插值点是否距离岛屿太近
    for (let i = 0; i < islands.length; i++) {
      const isl = islands[i];
      let dx = isl.x - ix;
      if (dx > MAP_SIZE / 2) dx -= MAP_SIZE;
      else if (dx < -MAP_SIZE / 2) dx += MAP_SIZE;
      
      let dy = isl.y - iy;
      if (dy > MAP_SIZE / 2) dy -= MAP_SIZE;
      else if (dy < -MAP_SIZE / 2) dy += MAP_SIZE;

      if (Math.hypot(dx, dy) < isl.radius + 6) {
        return false; // 碰到了，不能拉直
      }
    }
  }
  return true;
}

// 统一的非阻断式轻提示 (Toast)
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;
  container.appendChild(toast);
  // 3.5秒后自动清理 DOM
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

// 物理位置插值与风力影响
function updateShipMovement(delta) {
  if (!gameState.isNavigating) return;

  // 在球体坐标系下计算最短的 dx, dy (Wrap-around 环绕最短距离)
  let dx = gameState.targetX - gameState.shipX;
  let dy = gameState.targetY - gameState.shipY;

  // 跨越左右边界判定
  if (dx > MAP_SIZE / 2) dx -= MAP_SIZE;
  else if (dx < -MAP_SIZE / 2) dx += MAP_SIZE;

  // 跨越上下边界判定
  if (dy > MAP_SIZE / 2) dy -= MAP_SIZE;
  else if (dy < -MAP_SIZE / 2) dy += MAP_SIZE;

  const dist = Math.hypot(dx, dy);

  // 【斜帆受风力学算法】
  // 计算航向角与风向角的夹角。夹角为0为绝对顺风，为 PI 为绝对逆风。
  const angleDiff = Math.abs(gameState.shipAngle - gameState.windAngle);
  const normalizedDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff); // 0 到 PI 之间
  
  // 顺风乘数 (1.0)，逆风最大缩水 72%（逆风阻力）
  let windEfficiency = 1.0 - (normalizedDiff / Math.PI) * 0.72;
  
  // 船帆改装降低逆风阻力特权
  if (gameState.upgrades.sail > 0) {
    windEfficiency += gameState.upgrades.sail * 0.08;
    windEfficiency = Math.min(1.0, windEfficiency);
  }

  // 基础航速
  const baseSpeed = (gameState.shipSpeed + gameState.windSpeed * 0.15) * windEfficiency;

  // 物理朝向目标角计算
  const targetAngle = Math.atan2(dy, dx);
  let diff = targetAngle - gameState.shipAngle;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;

  // 急转弯时降低移速，防止转弯半径过大冲过头原地转圈
  const speedFactor = Math.cos(diff) > 0 ? Math.cos(diff) : 0;
  const speed = baseSpeed * (0.2 + 0.8 * speedFactor);

  // 到达判定：如果剩余距离小于 6 像素，或者本帧速度已足以覆盖大部分距离，算抵达当前节点
  if (dist < Math.max(6, speed * 1.5)) {
    // 抵达当前临时节点
    gameState.shipX = gameState.targetX;
    gameState.shipY = gameState.targetY;

    // 检查 A* 路径中是否还有下一个转折节点
    if (gameState.navigationPath && gameState.navigationPath.length > 0) {
      const nextNode = gameState.navigationPath.shift();
      gameState.targetX = nextNode.x;
      gameState.targetY = nextNode.y;
    } else {
      // 真正抵达终点
      const port = gameState.ports.find(p => p.x === gameState.shipX && p.y === gameState.shipY);
      if (port) {
        enterPort(port);
      } else {
        gameState.isNavigating = false;
      }
    }
    return;
  }

  // 平滑角度旋转
  gameState.shipAngle += diff * 0.15;
  while (gameState.shipAngle < -Math.PI) gameState.shipAngle += Math.PI * 2;
  while (gameState.shipAngle > Math.PI) gameState.shipAngle -= Math.PI * 2;

  // 记录移动前位置以备回退
  const prevX = gameState.shipX;
  const prevY = gameState.shipY;

  // 执行移动
  let nextX = gameState.shipX + Math.cos(gameState.shipAngle) * speed;
  let nextY = gameState.shipY + Math.sin(gameState.shipAngle) * speed;

  // 球体边界环绕 (Wrap-around)
  nextX = (nextX + MAP_SIZE) % MAP_SIZE;
  nextY = (nextY + MAP_SIZE) % MAP_SIZE;

  gameState.shipX = nextX;
  gameState.shipY = nextY;

  // 判定是否触礁：与岛屿的距离是否小于 island.radius + 6
  // 计算当前玩家坐标和终点坐标附近是否有港口，如果有，豁免其关联的岛屿碰撞，防止出港/进港卡死
  const finalTargetPort = gameState.ports.find(p => {
    // 检查最终终点或者 navigationPath 的最后一个节点是否是港口
    let lastNode = gameState.navigationPath && gameState.navigationPath.length > 0
      ? gameState.navigationPath[gameState.navigationPath.length - 1]
      : null;
    const tx = lastNode ? lastNode.x : gameState.targetX;
    const ty = lastNode ? lastNode.y : gameState.targetY;
    return p.x === tx && p.y === ty;
  });

  const startPort = gameState.ports.find(p => {
    let pdx = p.x - gameState.shipX;
    if (pdx > MAP_SIZE / 2) pdx -= MAP_SIZE;
    else if (pdx < -MAP_SIZE / 2) pdx += MAP_SIZE;
    let pdy = p.y - gameState.shipY;
    if (pdy > MAP_SIZE / 2) pdy -= MAP_SIZE;
    else if (pdy < -MAP_SIZE / 2) pdy += MAP_SIZE;
    return Math.hypot(pdx, pdy) < 45;
  });

  const finalPortIdx = gameState.ports.indexOf(finalTargetPort);
  const finalIslandIdx = finalPortIdx !== -1 ? (finalPortIdx % islands.length) : -1;

  const startPortIdx = gameState.ports.indexOf(startPort);
  const startIslandIdx = startPortIdx !== -1 ? (startPortIdx % islands.length) : -1;
  
  for (let i = 0; i < islands.length; i++) {
    const island = islands[i];
    
    // 如果是玩家正在靠近或刚刚离开的港口关联的岛屿，豁免碰撞判定
    if (i === finalIslandIdx || i === startIslandIdx) {
      continue;
    }

    // 球体距离判定 (岛屿与船的相对坐标同样要取最短路径)
    let idistX = island.x - gameState.shipX;
    let idistY = island.y - gameState.shipY;
    if (idistX > MAP_SIZE / 2) idistX -= MAP_SIZE;
    else if (idistX < -MAP_SIZE / 2) idistX += MAP_SIZE;
    if (idistY > MAP_SIZE / 2) idistY -= MAP_SIZE;
    else if (idistY < -MAP_SIZE / 2) idistY += MAP_SIZE;

    const distToIsland = Math.hypot(idistX, idistY);
    if (distToIsland < island.radius + 6) {
      // 算出从岛中心指向船只的向量
      const pushAngle = Math.atan2(gameState.shipY - island.y, gameState.shipX - island.x);
      
      // 停止航行并沿岛外侧微调推离 1.5 像素以脱离临界区，防止高频抖动
      gameState.shipX = (prevX + Math.cos(pushAngle) * 1.5 + MAP_SIZE) % MAP_SIZE;
      gameState.shipY = (prevY + Math.sin(pushAngle) * 1.5 + MAP_SIZE) % MAP_SIZE;
      
      gameState.isNavigating = false;
      gameState.navigationPath = []; // 清空路线，避免下一帧强行再走
      
      // 10% 概率触发轻微擦碰（chujiao）
      if (Math.random() < 0.10) {
        const damage = 5;
        adjustStats(0, -damage, 0);
        showToast(`💥 碰触暗礁！受到轻微擦损 (-${damage} Hull)`);
        if (gameState.hull <= 0) {
          triggerGameOver("船只在剧烈的撞击中解体，碎木与货物一同沉入了深渊。");
        }
      }
      return;
    }
  }

  // 镜头平滑跟随 (相机同样要处理球体环绕)
  let camDx = gameState.shipX - cameraX;
  if (camDx > MAP_SIZE / 2) camDx -= MAP_SIZE;
  else if (camDx < -MAP_SIZE / 2) camDx += MAP_SIZE;
  cameraX = (cameraX + camDx * 0.08 + MAP_SIZE) % MAP_SIZE;

  let camDy = gameState.shipY - cameraY;
  if (camDy > MAP_SIZE / 2) camDy -= MAP_SIZE;
  else if (camDy < -MAP_SIZE / 2) camDy += MAP_SIZE;
  cameraY = (cameraY + camDy * 0.08 + MAP_SIZE) % MAP_SIZE;

  revealFog();

  // 每帧产生新的尾迹粒子 (当且仅当正在航行时)
  if (gameState.isNavigating && Math.random() < 0.6) {
    // 算下船尾的绝对坐标
    const trailAngle = gameState.shipAngle + Math.PI + (Math.random() - 0.5) * 0.4;
    gameState.shipTrails.push({
      x: (gameState.shipX + Math.cos(trailAngle) * 8 + MAP_SIZE) % MAP_SIZE,
      y: (gameState.shipY + Math.sin(trailAngle) * 8 + MAP_SIZE) % MAP_SIZE,
      size: 2 + Math.random() * 3,
      alpha: 0.6,
      vx: Math.cos(trailAngle) * 0.3 + (Math.random() - 0.5) * 0.1,
      vy: Math.sin(trailAngle) * 0.3 + (Math.random() - 0.5) * 0.1
    });
  }

  // 物理更新粒子状态 (生命周期递减、微弱扩散移位)
  gameState.shipTrails.forEach(t => {
    t.x = (t.x + t.vx + MAP_SIZE) % MAP_SIZE;
    t.y = (t.y + t.vy + MAP_SIZE) % MAP_SIZE;
    t.alpha -= 0.015; // 渐隐
    t.size += 0.08;   // 扩散变大
  });
  gameState.shipTrails = gameState.shipTrails.filter(t => t.alpha > 0);
}

// --- 2D Canvas 羊皮纸手绘风绘制 ---
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // 1. 绘制海洋主色调 (羊皮纸黄底色渐变，四周带焦糖暗影)
  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(canvas.width, canvas.height) * 0.8);
  grad.addColorStop(0, '#fbf6eb');
  grad.addColorStop(0.7, '#f4eccd');
  grad.addColorStop(1, '#dfd3bb');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. 绘制经纬度线条网格 (手绘古典航海线，自适应 MAP_ZOOM 分离度)
  ctx.strokeStyle = 'rgba(124, 98, 67, 0.06)';
  ctx.lineWidth = 1;
  const gridGap = 80;
  
  const startX = Math.floor((cameraX - cx / MAP_ZOOM) / gridGap) * gridGap;
  const startY = Math.floor((cameraY - cy / MAP_ZOOM) / gridGap) * gridGap;

  for (let x = startX; x < cameraX + cx / MAP_ZOOM; x += gridGap) {
    let sPos = worldToScreen(x, cameraY);
    ctx.beginPath();
    ctx.moveTo(sPos.x, 0);
    ctx.lineTo(sPos.x, canvas.height);
    ctx.stroke();
  }
  for (let y = startY; y < cameraY + cy / MAP_ZOOM; y += gridGap) {
    let sPos = worldToScreen(cameraX, y);
    ctx.beginPath();
    ctx.moveTo(0, sPos.y);
    ctx.lineTo(canvas.width, sPos.y);
    ctx.stroke();
  }

  // 2.5 绘制动态漂流的古典手绘海浪线粒子 (高度自适应缩放)
  gameState.seaWaves.forEach(w => {
    w.x = (w.x - w.speed + MAP_SIZE) % MAP_SIZE;
    w.y = (w.y - w.speed * 0.5 + MAP_SIZE) % MAP_SIZE;
    w.phase = (w.phase + w.pulseSpeed) % (Math.PI * 2);

    const sPos = worldToScreen(w.x, w.y);

    if (sPos.x > -100 && sPos.x < canvas.width + 100 && sPos.y > -100 && sPos.y < canvas.height + 100) {
      ctx.save();
      
      const alpha = 0.08 + 0.08 * Math.sin(w.phase); 
      ctx.strokeStyle = `rgba(124, 98, 67, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';

      ctx.beginPath();
      // 浪宽按 MAP_ZOOM 等比例放大，展现木刻褶皱细节
      const scaledWidth = w.width * MAP_ZOOM;
      ctx.arc(sPos.x - scaledWidth / 3, sPos.y, 4 * MAP_ZOOM, Math.PI, 0, false);
      ctx.arc(sPos.x, sPos.y + 1 * MAP_ZOOM, 5 * MAP_ZOOM, Math.PI, 0, false);
      ctx.arc(sPos.x + scaledWidth / 3, sPos.y, 4 * MAP_ZOOM, Math.PI, 0, false);
      
      ctx.stroke();
      ctx.restore();
    }
  });

  // 3. 绘制岛屿 (伪 2D 羊皮纸木刻浮雕风格：无描边，深色底层阴影偏置 + 浅色顶层覆盖)
  
  // 第一步：绘制所有岛屿的深色底层投影 (等比例缩放后向右下偏置)
  islands.forEach(island => {
    const sPos = worldToScreen(island.x, island.y);

    if (sPos.x < -200 || sPos.x > canvas.width + 200 || sPos.y < -200 || sPos.y > canvas.height + 200) {
      return;
    }

    // 阴影填充色 (焦糖暗褐)
    ctx.fillStyle = '#c7b79a'; 
    ctx.beginPath();
    
    // 浮雕阴影偏移按比例偏置
    const vOffset = { dx: 4 * MAP_ZOOM, dy: 5 * MAP_ZOOM };
    
    const firstVert = worldToScreen(island.vertices[0].x, island.vertices[0].y);
    ctx.moveTo(firstVert.x + vOffset.dx, firstVert.y + vOffset.dy);
    for (let v = 1; v < island.vertices.length; v++) {
      const vert = worldToScreen(island.vertices[v].x, island.vertices[v].y);
      ctx.lineTo(vert.x + vOffset.dx, vert.y + vOffset.dy);
    }
    ctx.closePath();
    ctx.fill();
  });

  // 第二步：绘制所有岛屿的顶层主体陆地 (正常填充，无任何边框)
  islands.forEach(island => {
    const sPos = worldToScreen(island.x, island.y);

    if (sPos.x < -200 || sPos.x > canvas.width + 200 || sPos.y < -200 || sPos.y > canvas.height + 200) {
      return;
    }

    // 主体陆地填充色 (温暖明亮的羊皮土黄)
    ctx.fillStyle = '#ebdebf'; 
    ctx.beginPath();
    
    const firstVert = worldToScreen(island.vertices[0].x, island.vertices[0].y);
    ctx.moveTo(firstVert.x, firstVert.y);
    for (let v = 1; v < island.vertices.length; v++) {
      const vert = worldToScreen(island.vertices[v].x, island.vertices[v].y);
      ctx.lineTo(vert.x, vert.y);
    }
    ctx.closePath();
    ctx.fill();

    // 辅助判定一个世界坐标点是否在其他岛屿内 (标注地名时避开重合中心)
    function pointInOtherIslands(wx, wy, curIsl) {
      for (let i = 0; i < islands.length; i++) {
        const other = islands[i];
        if (other === curIsl) continue;
        
        let dx = other.x - wx;
        if (dx > MAP_SIZE / 2) dx -= MAP_SIZE;
        else if (dx < -MAP_SIZE / 2) dx += MAP_SIZE;
        
        let dy = other.y - wy;
        if (dy > MAP_SIZE / 2) dy -= MAP_SIZE;
        else if (dy < -MAP_SIZE / 2) dy += MAP_SIZE;

        if (Math.hypot(dx, dy) < other.radius - 5) {
          return true;
        }
      }
      return false;
    }

    // 在没有被完全包在内部的岛中央标注地名
    if (!pointInOtherIslands(island.x, island.y, island)) {
      ctx.fillStyle = '#755d43';
      ctx.font = 'italic 10px Georgia';
      ctx.fillText("礁石/未知荒岛", sPos.x - 35, sPos.y);
    }
  });

  // 4. 绘制 A* 避障航线目标指示虚线 (完整折线网络，支持球体绕行与视野缩放)
  if (gameState.isNavigating) {
    ctx.strokeStyle = '#a33b26';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();

    const startPos = worldToScreen(gameState.shipX, gameState.shipY);
    ctx.moveTo(startPos.x, startPos.y);

    const nextPos = worldToScreen(gameState.targetX, gameState.targetY);
    ctx.lineTo(nextPos.x, nextPos.y);

    // 后续 A* 折线各路点
    if (gameState.navigationPath && gameState.navigationPath.length > 0) {
      gameState.navigationPath.forEach(node => {
        const nodePos = worldToScreen(node.x, node.y);
        ctx.lineTo(nodePos.x, nodePos.y);
      });
    }

    ctx.stroke();
    ctx.setLineDash([]); // 还原
  }

  // 5. 绘制港口锚点 (古典手绘铁锈红小锚，等比拉近放大)
  gameState.ports.forEach(port => {
    const sPos = worldToScreen(port.x, port.y);

    ctx.save();
    ctx.translate(sPos.x, sPos.y);
    ctx.scale(MAP_ZOOM, MAP_ZOOM);

    ctx.strokeStyle = '#a33b26';
    ctx.fillStyle = '#a33b26';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. 顶端小圆环
    ctx.beginPath();
    ctx.arc(0, -12, 3.5, 0, Math.PI * 2);
    ctx.stroke();

    // 2. 竖杆
    ctx.beginPath();
    ctx.moveTo(0, -8.5);
    ctx.lineTo(0, 8);
    ctx.stroke();

    // 3. 横梁
    ctx.beginPath();
    ctx.moveTo(-6, -5);
    ctx.lineTo(6, -5);
    ctx.stroke();

    // 4. 弯曲的锚爪 (弧形)
    ctx.beginPath();
    ctx.arc(0, 3, 9, 0.1 * Math.PI, 0.9 * Math.PI, false);
    ctx.stroke();

    // 5. 锚爪两端的尖刺 (画两个小三角形或者斜线)
    ctx.beginPath();
    ctx.moveTo(-8.5, 5.8);
    ctx.lineTo(-11, 2);
    ctx.lineTo(-6.5, 3);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(8.5, 5.8);
    ctx.lineTo(11, 2);
    ctx.lineTo(6.5, 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // 绘制港口名 (保持矢量像素大小不缩放，确保高保真高清晰度)
    ctx.fillStyle = '#2f2518';
    ctx.font = 'bold 12px "Cinzel", Georgia';
    ctx.fillText(port.name, sPos.x - 45, sPos.y - 20 * MAP_ZOOM);
  });

  // 5.5 绘制航行尾迹 (淡白色小水花，多层混合效果，支持球体跨界投影)
  gameState.shipTrails.forEach(t => {
    const sPos = worldToScreen(t.x, t.y);

    ctx.save();
    // 渐隐半透明，中心亮边缘淡
    const trailGrad = ctx.createRadialGradient(sPos.x, sPos.y, 0, sPos.x, sPos.y, t.size * MAP_ZOOM);
    trailGrad.addColorStop(0, `rgba(253, 250, 243, ${t.alpha * 1.1})`);
    trailGrad.addColorStop(0.5, `rgba(244, 236, 205, ${t.alpha * 0.6})`);
    trailGrad.addColorStop(1, 'rgba(244, 236, 205, 0)');
    
    ctx.fillStyle = trailGrad;
    ctx.beginPath();
    ctx.arc(sPos.x, sPos.y, t.size * MAP_ZOOM, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 6. 绘制 NPC 智能体船舶 (等比映射与视野自适应缩放)
  gameState.npcShips.forEach(npc => {
    const sPos = worldToScreen(npc.x, npc.y);

    // 只有在屏幕视野范围内的一定距离内才绘制
    if (Math.abs(sPos.x - cx) < canvas.width / 2 + 50 && Math.abs(sPos.y - cy) < canvas.height / 2 + 50) {
      // A. 先画船只投影 (向右下偏移，自适应缩放)
      ctx.save();
      ctx.translate(sPos.x + 2, sPos.y + 2);
      ctx.scale(MAP_ZOOM, MAP_ZOOM);
      ctx.rotate(npc.angle);
      ctx.fillStyle = 'rgba(47, 37, 24, 0.22)';
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-8, -6);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-8, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // B. 画 NPC 船体主身
      ctx.save();
      ctx.translate(sPos.x, sPos.y);
      ctx.scale(MAP_ZOOM, MAP_ZOOM);
      ctx.rotate(npc.angle);

      // 船身 (木褐色多边形，略小于玩家船只)
      ctx.fillStyle = '#7a5f34';
      ctx.strokeStyle = '#2f2518';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(10, 0);   // 船头
      ctx.lineTo(-8, -6);  // 左船尾
      ctx.lineTo(-6, 0);   // 船尾中心收束
      ctx.lineTo(-8, 6);   // 右船尾
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 船体吃水线细节
      ctx.strokeStyle = 'rgba(47, 37, 24, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(8, 0);
      ctx.stroke();

      // 船帆 (使用 npc 特定的 sailColor 三角帆)
      ctx.fillStyle = npc.sailColor;
      ctx.beginPath();
      ctx.moveTo(1, 0);
      ctx.lineTo(-5, -5);
      ctx.lineTo(-3, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  });

  // 7. 绘制玩家的小帆船 (三角桅杆，等比缩放渲染)
  const sPos = worldToScreen(gameState.shipX, gameState.shipY);

  // A. 绘制玩家船只投影
  ctx.save();
  ctx.translate(sPos.x + 3, sPos.y + 3);
  ctx.scale(MAP_ZOOM, MAP_ZOOM);
  ctx.rotate(gameState.shipAngle);
  ctx.fillStyle = 'rgba(47, 37, 24, 0.28)';
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-10, -8);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-10, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // A.5 绘制风向航海辅助圆环 (罗盘圈 - 分段过渡顺逆风态，随 MAP_ZOOM 等比放宽半径)
  ctx.save();
  ctx.translate(sPos.x, sPos.y);
  
  const ringRadius = 32 * MAP_ZOOM;

  // 1. 绘制极淡的虚线参考底圈
  ctx.strokeStyle = 'rgba(124, 98, 67, 0.15)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]); // 恢复实线

  // 2. 绘制逆风弧区 (分 12 段描边，根据角度差进行平滑渐透，向两侧自然消散)
  const headwindAngle = (gameState.windAngle + Math.PI) % (Math.PI * 2);
  const headArcStart = headwindAngle - Math.PI / 4;
  const stepCount = 12;
  const stepRad = (Math.PI / 2) / stepCount; // 总共 90 度细分
  
  ctx.lineWidth = 3.5;
  for (let i = 0; i < stepCount; i++) {
    const startA = headArcStart + i * stepRad;
    const endA = startA + stepRad;
    
    // 计算当前段距离中心偏角的比例 (0 到 1)
    const centerDist = Math.abs(i - (stepCount - 1) / 2) / (stepCount / 2);
    // 线性/二次平滑渐隐公式
    const alpha = 0.45 * (1 - centerDist * centerDist); 
    
    ctx.strokeStyle = `rgba(163, 59, 38, ${alpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, startA, endA);
    ctx.stroke();
  }

  // 3. 绘制顺风弧区 (同理分 12 段，向两侧柔和消散)
  const tailwindAngle = gameState.windAngle;
  const tailArcStart = tailwindAngle - Math.PI / 4;
  
  for (let i = 0; i < stepCount; i++) {
    const startA = tailArcStart + i * stepRad;
    const endA = startA + stepRad;
    
    const centerDist = Math.abs(i - (stepCount - 1) / 2) / (stepCount / 2);
    const alpha = 0.45 * (1 - centerDist * centerDist);
    
    ctx.strokeStyle = `rgba(39, 174, 96, ${alpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, startA, endA);
    ctx.stroke();
  }

  // 4. 在圆环上绘制一个微小指风针箭头，指明风吹来的方向
  ctx.save();
  ctx.rotate(gameState.windAngle);
  ctx.fillStyle = '#a33b26'; // 铁锈红
  ctx.beginPath();
  ctx.moveTo(ringRadius + 3, 0);
  ctx.lineTo(ringRadius - 3, -3);
  ctx.lineTo(ringRadius - 1, 0);
  ctx.lineTo(ringRadius - 3, 3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore();

  // B. 绘制玩家船体主身与帆结构
  ctx.save();
  ctx.translate(sPos.x, sPos.y);
  ctx.scale(MAP_ZOOM, MAP_ZOOM);
  ctx.rotate(gameState.shipAngle);

  // 船身 (焦糖木褐色多边形)
  ctx.fillStyle = '#8a6f44';
  ctx.strokeStyle = '#2f2518';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(12, 0);   // 船头
  ctx.lineTo(-10, -8); // 左船尾
  ctx.lineTo(-8, 0);   // 船尾中心收束
  ctx.lineTo(-10, 8);  // 右船尾
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 船身吃水线与甲板桅杆缝隙 (细化手绘纹路)
  ctx.strokeStyle = '#2f2518';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.lineTo(10, 0); // 龙骨中轴吃水线
  ctx.moveTo(-2, -3);
  ctx.lineTo(-2, 3);  // 桅杆座线条
  ctx.stroke();

  // 1. 白色三角后帆 (主帆)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.lineTo(-6, -6);
  ctx.lineTo(-4, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. 米黄色三角前帆 (副帆 - 视觉更饱满)
  ctx.fillStyle = '#f4eccd';
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(1, -4);
  ctx.lineTo(2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  // 7. 绘制古老的战争迷雾 (Canvas 羽化贴图 - 处理球体 Wrap-around 平铺)
  // 当视口跨越 [0, MAP_SIZE] 边界时，我们需要将迷雾平铺渲染以保证无缝拼接
  // 【视口尺寸自适应 MAP_ZOOM 转换】拉近視野，裁剪更小的迷雾源数据，并放大渲染到整块物理画布
  const viewW = canvas.width / MAP_ZOOM;
  const viewH = canvas.height / MAP_ZOOM;
  const viewX = cameraX - viewW / 2;
  const viewY = cameraY - viewH / 2;

  function drawFogTile(srcX, srcY, destX_unscaled, destY_unscaled, w, h) {
    if (w <= 0 || h <= 0) return;
    const destX = destX_unscaled * MAP_ZOOM;
    const destY = destY_unscaled * MAP_ZOOM;
    const destW = w * MAP_ZOOM;
    const destH = h * MAP_ZOOM;
    ctx.drawImage(fogCanvas, srcX, srcY, w, h, destX, destY, destW, destH);
  }

  // 算出平铺的起点
  const startTileX = Math.floor(viewX / MAP_SIZE) * MAP_SIZE;
  const startTileY = Math.floor(viewY / MAP_SIZE) * MAP_SIZE;

  // 覆盖当前视口的九宫格区域
  for (let tx = startTileX - MAP_SIZE; tx <= startTileX + MAP_SIZE; tx += MAP_SIZE) {
    for (let ty = startTileY - MAP_SIZE; ty <= startTileY + MAP_SIZE; ty += MAP_SIZE) {
      // 算出在 fogCanvas 上的源坐标 (映射到 0 到 MAP_SIZE)
      const srcX = (tx % MAP_SIZE + MAP_SIZE) % MAP_SIZE;
      const srcY = (ty % MAP_SIZE + MAP_SIZE) % MAP_SIZE;
      
      // 算出在主屏幕 Canvas 上的投影目标坐标
      const destX = tx - viewX;
      const destY = ty - viewY;

      // 裁剪视口重合区域并绘制
      const clipLeft = Math.max(0, destX);
      const clipTop = Math.max(0, destY);
      const clipRight = Math.min(viewW, destX + MAP_SIZE);
      const clipBottom = Math.min(viewH, destY + MAP_SIZE);

      if (clipRight > clipLeft && clipBottom > clipTop) {
        const drawW = clipRight - clipLeft;
        const drawH = clipBottom - clipTop;
        const sX = srcX + (clipLeft - destX);
        const sY = srcY + (clipTop - destY);
        drawFogTile(sX, sY, clipLeft, clipTop, drawW, drawH);
      }
    }
  }

  // 8. 绘制古典羊皮纸的边缘旧损遮罩 (Vignette)
  const outerGrad = ctx.createRadialGradient(cx, cy, Math.min(canvas.width, canvas.height) * 0.45, cx, cy, Math.max(canvas.width, canvas.height) * 0.8);
  outerGrad.addColorStop(0, 'rgba(0,0,0,0)');
  outerGrad.addColorStop(1, 'rgba(47, 37, 24, 0.45)');
  ctx.fillStyle = outerGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// 死亡重置
function triggerGameOver(reasonText) {
  gameState.isNavigating = false;
  document.getElementById('game-over-desc').textContent = reasonText;
  document.getElementById('game-over-overlay').classList.remove('hidden');
}

document.getElementById('restart-btn').onclick = () => {
  document.getElementById('game-over-overlay').classList.add('hidden');
  
  // 重置
  gameState.days = 1;
  gameState.gold = 350;
  gameState.supplies = 100;
  gameState.maxSupplies = 100;
  gameState.hull = 100;
  gameState.maxHull = 100;
  gameState.cargoUsed = 0;
  gameState.cargoCapacity = 60;
  Object.keys(gameState.cargo).forEach(k => gameState.cargo[k] = 0);
  Object.keys(gameState.upgrades).forEach(k => gameState.upgrades[k] = 0);

  gameState.shipX = gameState.ports[0].x;
  gameState.shipY = gameState.ports[0].y;
  gameState.targetX = gameState.shipX;
  gameState.targetY = gameState.shipY;
  
  cameraX = gameState.shipX;
  cameraY = gameState.shipY;

  initFog();
  revealFog();
  updateHUD();

  enterPort(gameState.ports[0]);
};

// 绘制精美小地图 (迷你雷达)
function drawMinimap() {
  const mCanvas = document.getElementById('minimapCanvas');
  if (!mCanvas) return;
  const mCtx = mCanvas.getContext('2d');
  const mw = mCanvas.width;
  const mh = mCanvas.height;

  mCtx.clearRect(0, 0, mw, mh);

  // 1. 羊皮纸背景色
  mCtx.fillStyle = '#fbf6eb';
  mCtx.fillRect(0, 0, mw, mh);

  const scale = mw / MAP_SIZE;

  // 2. 绘制岛屿
  islands.forEach(isl => {
    mCtx.fillStyle = '#ebdebf';
    mCtx.strokeStyle = '#7c6243';
    mCtx.lineWidth = 1;
    
    mCtx.beginPath();
    mCtx.arc(isl.x * scale, isl.y * scale, isl.radius * scale, 0, Math.PI * 2);
    mCtx.fill();
    mCtx.stroke();
  });

  // 3. 绘制港口
  gameState.ports.forEach(port => {
    mCtx.fillStyle = '#a33b26';
    mCtx.beginPath();
    mCtx.arc(port.x * scale, port.y * scale, 3, 0, Math.PI * 2);
    mCtx.fill();
  });

  // 3.5 绘制 NPC 船舶在大地图的缩影 (用蓝色和橙色小点)
  gameState.npcShips.forEach(npc => {
    mCtx.fillStyle = npc.type === 'merchant' ? '#3498db' : '#e67e22';
    mCtx.beginPath();
    mCtx.arc(npc.x * scale, npc.y * scale, 2.5, 0, Math.PI * 2);
    mCtx.fill();
  });

  // 4. 绘制玩家自身位置与方向
  mCtx.save();
  mCtx.translate(gameState.shipX * scale, gameState.shipY * scale);
  mCtx.rotate(gameState.shipAngle);
  mCtx.fillStyle = '#a33b26';
  mCtx.beginPath();
  mCtx.moveTo(4, 0);
  mCtx.lineTo(-3, -3);
  mCtx.lineTo(-3, 3);
  mCtx.closePath();
  mCtx.fill();
  mCtx.restore();

  // 5. 叠加战争迷雾：把 fogCanvas 以缩放模式渲染在最上层！
  mCtx.save();
  mCtx.globalAlpha = 0.95;
  mCtx.drawImage(fogCanvas, 0, 0, MAP_SIZE, MAP_SIZE, 0, 0, mw, mh);
  mCtx.restore();

  // 6. 额外画一个红色的迷你视口边框指示玩家的当前屏幕在什么地方 (随 MAP_ZOOM 缩放红框尺寸)
  const viewW = (canvas.width / MAP_SIZE) * mw / MAP_ZOOM;
  const viewH = (canvas.height / MAP_SIZE) * mh / MAP_ZOOM;
  const viewX = (cameraX * scale) - viewW / 2;
  const viewY = (cameraY * scale) - viewH / 2;
  
  mCtx.strokeStyle = 'rgba(163, 59, 38, 0.4)';
  mCtx.lineWidth = 1;
  mCtx.strokeRect(viewX, viewY, viewW, viewH);
}

// 初始化 NPC 船舶数据
function createNPCShips() {
  gameState.npcShips = [
    {
      id: 1,
      name: "东方商会号",
      type: "merchant",
      x: gameState.ports[1].x,
      y: gameState.ports[1].y,
      targetX: gameState.ports[2].x,
      targetY: gameState.ports[2].y,
      speed: 1.5,
      angle: 0,
      path: [],
      sailColor: "#3498db" // 蓝色帆
    },
    {
      id: 2,
      name: "北海巡逻舰",
      type: "patrol",
      x: gameState.ports[3].x,
      y: gameState.ports[3].y,
      targetX: gameState.ports[4].x,
      targetY: gameState.ports[4].y,
      speed: 1.8,
      angle: 0,
      path: [],
      sailColor: "#e67e22" // 橙色帆
    },
    {
      id: 3,
      name: "皇家特遣船",
      type: "patrol",
      x: gameState.ports[5].x,
      y: gameState.ports[5].y,
      targetX: gameState.ports[0].x,
      targetY: gameState.ports[0].y,
      speed: 1.6,
      angle: 0,
      path: [],
      sailColor: "#9b59b6" // 紫色帆
    }
  ];
}

// 物理更新 NPC 智能体船舶状态 (自主寻路航行)
function updateNPCs(delta) {
  gameState.npcShips.forEach(npc => {
    // 1. 如果当前没有临时寻路目标，或临时目标为空，进行 A* 寻路
    if (!npc.path || npc.path.length === 0) {
      // 重新挑选一个随机的目标港口
      const randomPort = gameState.ports[Math.floor(Math.random() * gameState.ports.length)];
      npc.targetX = randomPort.x;
      npc.targetY = randomPort.y;
      npc.path = findAStarPath(npc.x, npc.y, npc.targetX, npc.targetY);
      npc.stuckFrames = 0; // 重置卡住帧数计数
    }

    // 2. 取出路径点移动
    if (npc.path && npc.path.length > 0) {
      const nextNode = npc.path[0];
      
      let dx = nextNode.x - npc.x;
      let dy = nextNode.y - npc.y;
      if (dx > MAP_SIZE / 2) dx -= MAP_SIZE;
      else if (dx < -MAP_SIZE / 2) dx += MAP_SIZE;
      if (dy > MAP_SIZE / 2) dy -= MAP_SIZE;
      else if (dy < -MAP_SIZE / 2) dy += MAP_SIZE;

      const dist = Math.hypot(dx, dy);

      // 到达判定：如果距离小于 8 像素，或者本帧速度已足以覆盖距离，算到达
      if (dist < Math.max(8, npc.speed * 1.5)) {
        npc.x = nextNode.x;
        npc.y = nextNode.y;
        npc.path.shift(); // 移除当前路点
        npc.stuckFrames = 0;
      } else {
        // 平滑转向
        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - npc.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        
        // 角度插值（NPC 使用 0.15 插值强度，与玩家一致）
        npc.angle += diff * 0.15;
        // 角度归一化到 [-PI, PI]
        while (npc.angle < -Math.PI) npc.angle += Math.PI * 2;
        while (npc.angle > Math.PI) npc.angle -= Math.PI * 2;

        // 如果角度差非常大（例如需要急转弯），船只应该降低速度，防止冲过头打转
        const speedFactor = Math.cos(diff) > 0 ? Math.cos(diff) : 0; // 夹角大于90度时不往前冲
        const currentMoveSpeed = npc.speed * (0.3 + 0.7 * speedFactor);

        // 记录旧位置以备碰撞回退
        const oldX = npc.x;
        const oldY = npc.y;

        npc.x = (npc.x + Math.cos(npc.angle) * currentMoveSpeed + MAP_SIZE) % MAP_SIZE;
        npc.y = (npc.y + Math.sin(npc.angle) * currentMoveSpeed + MAP_SIZE) % MAP_SIZE;

        // NPC 触礁碰撞检测 (同样使用与 A* 一致的 radius + 6)
        let isStuck = false;
        // 计算目标港口和当前出发港口，豁免关联岛屿，防止 NPC 在港口内卡死
        const destPort = gameState.ports.find(p => p.x === npc.targetX && p.y === npc.targetY);
        const destPortIdx = gameState.ports.indexOf(destPort);
        const destIslandIdx = destPortIdx !== -1 ? (destPortIdx % islands.length) : -1;

        for (let i = 0; i < islands.length; i++) {
          if (i === destIslandIdx) continue; // 进港豁免
          
          const island = islands[i];
          let idistX = island.x - npc.x;
          let idistY = island.y - npc.y;
          if (idistX > MAP_SIZE / 2) idistX -= MAP_SIZE;
          else if (idistX < -MAP_SIZE / 2) idistX += MAP_SIZE;
          if (idistY > MAP_SIZE / 2) idistY -= MAP_SIZE;
          else if (idistY < -MAP_SIZE / 2) idistY += MAP_SIZE;

          if (Math.hypot(idistX, idistY) < island.radius + 6) {
            isStuck = true;
            break;
          }
        }

        if (isStuck) {
          // 寻找最近的那个阻挡岛屿，将 NPC 向外推离
          let closestIsland = null;
          let minDist = 9999;
          for (let i = 0; i < islands.length; i++) {
            if (i === destIslandIdx) continue;
            const island = islands[i];
            let idistX = island.x - npc.x;
            let idistY = island.y - npc.y;
            if (idistX > MAP_SIZE / 2) idistX -= MAP_SIZE;
            else if (idistX < -MAP_SIZE / 2) idistX += MAP_SIZE;
            if (idistY > MAP_SIZE / 2) idistY -= MAP_SIZE;
            else if (idistY < -MAP_SIZE / 2) idistY += MAP_SIZE;
            const dist = Math.hypot(idistX, idistY);
            if (dist < island.radius + 6 && dist < minDist) {
              minDist = dist;
              closestIsland = island;
            }
          }

          if (closestIsland) {
            // 向岛屿外侧法线方向推离 1.5 像素，脱离极近区
            const pushAngle = Math.atan2(oldY - closestIsland.y, oldX - closestIsland.x);
            npc.x = (oldX + Math.cos(pushAngle) * 1.5 + MAP_SIZE) % MAP_SIZE;
            npc.y = (oldY + Math.sin(pushAngle) * 1.5 + MAP_SIZE) % MAP_SIZE;
            
            // 立即强行将船头朝向推离岛屿的方向，并允许微调
            npc.angle = pushAngle + (Math.random() - 0.5) * 0.4;
          } else {
            npc.x = oldX;
            npc.y = oldY;
            npc.angle = (npc.angle + Math.PI + (Math.random() - 0.5) * 1.0) % (Math.PI * 2);
          }

          // 发生触礁碰撞，立刻清空路径触发重新选路，杜绝原地打转
          npc.path = [];
          npc.stuckFrames = 0;
        } else {
          // 检查微小位移判定卡死（如果连续多帧位置没怎么动）
          const actualMoveDist = Math.hypot(npc.x - oldX, npc.y - oldY);
          if (actualMoveDist < 0.1) {
            npc.stuckFrames = (npc.stuckFrames || 0) + 1;
          } else {
            npc.stuckFrames = 0;
          }
        }

        // 如果 NPC 因为其他未知原因（如微小位移）卡住超过 30 帧，重新选路
        if (npc.stuckFrames > 30) {
          npc.path = [];
        }

        // 产生少许 NPC 尾迹水花效果
        if (Math.random() < 0.15) {
          const trailAngle = npc.angle + Math.PI + (Math.random() - 0.5) * 0.4;
          gameState.shipTrails.push({
            x: (npc.x + Math.cos(trailAngle) * 6 + MAP_SIZE) % MAP_SIZE,
            y: (npc.y + Math.sin(trailAngle) * 6 + MAP_SIZE) % MAP_SIZE,
            size: 1.5 + Math.random() * 2,
            alpha: 0.35,
            vx: Math.cos(trailAngle) * 0.1,
            vy: Math.sin(trailAngle) * 0.1
          });
        }
      }
    }
  });
}

// --- 引擎主循环 ---
function gameLoop() {
  const delta = 1/60; // 假定 60fps

  // 更新玩家帆船位置与镜头
  updateShipMovement(delta);

  // 更新 NPC 船舶智能体物理
  updateNPCs(delta);

  // 绘制大世界
  draw();

  // 绘制小地图
  drawMinimap();

  requestAnimationFrame(gameLoop);
}

function onWindowResize() {
  resizeCanvas();
}

// 鼠标按下：开启长按控制
function onMouseDown(e) {
  // 防御性过滤
  if (e.target.closest('.log-panel') || e.target.closest('.hud-panel') || e.target.closest('.overlay') || e.target.closest('.action-btn')) {
    return;
  }
  const portPanel = document.getElementById('port-panel');
  if (gameState.currentPort && portPanel && !portPanel.classList.contains('hidden')) {
    return;
  }

  // 标记开始拖拽
  gameState.isDragging = true;
  updateDragTarget(e.clientX, e.clientY);
}

// 鼠标移动：如果处于长按状态，更新拖拽目标
function onMouseMove(e) {
  if (!gameState.isDragging) return;

  // 如果在拖拽过程中鼠标划入 HUD，可以继续拖拽但防御交互
  if (e.target.closest('.log-panel') || e.target.closest('.hud-panel') || e.target.closest('.overlay') || e.target.closest('.action-btn')) {
    return;
  }

  updateDragTarget(e.clientX, e.clientY);
}

// 鼠标松开：结束长按控制
function onMouseUp(e) {
  gameState.isDragging = false;
}

// 辅助函数：根据屏幕鼠标坐标更新船只目标并启用直接跟随
function updateDragTarget(clientX, clientY) {
  // 使用 getBoundingClientRect 纠正可能由 Canvas border/margin 产生的偏移量
  const rect = canvas.getBoundingClientRect();
  const canvasClickX = clientX - rect.left;
  const canvasClickY = clientY - rect.top;

  // 计算点击在世界坐标系中的 X, Y (引入 MAP_ZOOM 逆向换算)
  let worldX = (canvasClickX - canvas.width / 2) / MAP_ZOOM + cameraX;
  let worldY = (canvasClickY - canvas.height / 2) / MAP_ZOOM + cameraY;
  
  // 映射回球体 [0, MAP_SIZE] 空间
  worldX = (worldX % MAP_SIZE + MAP_SIZE) % MAP_SIZE;
  worldY = (worldY % MAP_SIZE + MAP_SIZE) % MAP_SIZE;

  // 长按时直接设置目标，并清空 A* 折线以便瞬时跟随鼠标的舵向
  gameState.targetX = worldX;
  gameState.targetY = worldY;
  gameState.navigationPath = []; // 清空 A*，进入直航手动模式
  gameState.isNavigating = true;
  gameState.currentPort = null;
}

window.onload = initGame;
window.addEventListener('click', onCanvasClick);
window.addEventListener('mousedown', onMouseDown);
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('mouseup', onMouseUp);
window.addEventListener('resize', onWindowResize);