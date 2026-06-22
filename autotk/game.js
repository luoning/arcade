// 三国演兵录 (Idle Run) 核心逻辑

// 1. 城市连接数据
// 1. 城市连接数据 (依照史实与商业策略游戏设定的交通要道网构建，打通死胡同与战略水道)
const cityConnections = {
    "武威":{"connect":["金城"]},
    "金城":{"connect":["武威","天水"]},
    "天水":{"connect":["金城","安定","武都"]},
    "安定":{"connect":["天水","长安"]},
    "武都":{"connect":["天水","长安","汉中"]},
    "长安":{"connect":["安定","武都","弘农","汉中"]},
    "弘农":{"connect":["长安","洛阳","宛"]},
    "洛阳":{"connect":["弘农","上党","许昌","陈留"]},
    "许昌":{"connect":["洛阳","陈留","宛","汝南"]},
    "陈留":{"connect":["洛阳","许昌","濮阳","小沛"]},
    "濮阳":{"connect":["陈留","邺","平原","北海"]},
    "宛":{"connect":["弘农","许昌","新野","上庸"]},
    "新野":{"connect":["宛","汝南","上庸","襄阳"]},
    "上庸":{"connect":["宛","新野","汉中","襄阳"]},
    "汝南":{"connect":["许昌","新野","寿春","江夏"]},
    "晋阳":{"connect":["上党","中山"]},
    "上党":{"connect":["晋阳","邺","洛阳"]},
    "邺":{"connect":["上党","濮阳","平原","中山"]},
    "中山":{"connect":["晋阳","邺","蓟","南皮"]},
    "南皮":{"connect":["中山","平原","蓟","北平"]},
    "平原":{"connect":["邺","南皮","濮阳","北海"]},
    "蓟":{"connect":["中山","南皮","北平"]},
    "北平":{"connect":["蓟","南皮","襄平"]},
    "襄平":{"connect":["北平","乐浪"]},
    "乐浪":{"connect":["襄平"]},
    "北海":{"connect":["濮阳","平原","小沛"]},
    "小沛":{"connect":["陈留","北海","下邳"]},
    "下邳":{"connect":["小沛","寿春","广陵"]},
    "广陵":{"connect":["下邳","建业"]},
    "寿春":{"connect":["汝南","下邳","庐江"]},
    "庐江":{"connect":["寿春","江夏","建业","豫章"]},
    "建业":{"connect":["广陵","庐江","吴","会稽"]},
    "吴":{"connect":["建业","会稽"]},
    "会稽":{"connect":["建业","吴","建安"]},
    "建安":{"connect":["会稽","豫章","夷洲"]},
    "夷洲":{"connect":["建安"]},
    "豫章":{"connect":["建安","庐江","桂阳"]},
    "襄阳":{"connect":["新野","上庸","江夏","江陵"]},
    "江陵":{"connect":["襄阳","江夏","永安","长沙","武陵"]},
    "江夏":{"connect":["襄阳","江陵","汝南","庐江"]},
    "长沙":{"connect":["江陵","武陵","零陵","桂阳"]},
    "武陵":{"connect":["江陵","长沙"]},
    "零陵":{"connect":["长沙","桂阳","交趾"]},
    "桂阳":{"connect":["长沙","零陵","豫章","南海"]},
    "南海":{"connect":["桂阳","合浦"]},
    "合浦":{"connect":["南海","交趾","朱崖洲"]},
    "交趾":{"connect":["零陵","合浦","建宁"]},
    "朱崖洲":{"connect":["合浦"]},
    "汉中":{"connect":["长安","武都","上庸","梓潼"]},
    "梓潼":{"connect":["汉中","成都"]},
    "成都":{"connect":["梓潼","江州","建宁","永昌"]},
    "江州":{"connect":["成都","永安","建宁"]},
    "永安":{"connect":["江州","江陵"]},
    "永昌":{"connect":["成都","建宁"]},
    "建宁":{"connect":["成都","江州","永昌","交趾"]}
};

// 2D 地理坐标配置 (基于真实地理格局精细调配，拉开重合间距，避免任何视觉重叠)
const cityCoords = {
    "武威": { x: 5, y: 12 }, "金城": { x: 7, y: 22 }, "天水": { x: 13, y: 32 }, "安定": { x: 20, y: 20 }, "武都": { x: 13, y: 44 }, "长安": { x: 30, y: 36 }, "弘农": { x: 38, y: 38 },
    "洛阳": { x: 46, y: 34 }, "晋阳": { x: 42, y: 17 }, "上党": { x: 46, y: 25 }, "中山": { x: 53, y: 11 }, "邺": { x: 52, y: 21 }, "南皮": { x: 63, y: 15 }, "蓟": { x: 62, y: 4 },
    "北平": { x: 74, y: 4 }, "襄平": { x: 84, y: 4 }, "乐浪": { x: 92, y: 6 }, "平原": { x: 60, y: 22 }, "濮阳": { x: 60, y: 28 }, "北海": { x: 70, y: 23 }, "陈留": { x: 53, y: 32 }, "小沛": { x: 62, y: 34 },
    "许昌": { x: 51, y: 43 }, "宛": { x: 43, y: 48 }, "汝南": { x: 53, y: 52 }, "下邳": { x: 69, y: 37 }, "广陵": { x: 74, y: 44 }, "寿春": { x: 62, y: 49 }, "庐江": { x: 65, y: 62 },
    "建业": { x: 77, y: 53 }, "吴": { x: 86, y: 59 }, "会稽": { x: 90, y: 67 }, "建安": { x: 83, y: 78 }, "夷洲": { x: 94, y: 84 }, "新野": { x: 44, y: 56 }, "上庸": { x: 34, y: 52 },
    "襄阳": { x: 44, y: 64 }, "江陵": { x: 44, y: 73 }, "江夏": { x: 56, y: 70 }, "豫章": { x: 68, y: 74 }, "长沙": { x: 54, y: 80 }, "武陵": { x: 43, y: 81 }, "零陵": { x: 44, y: 89 },
    "桂阳": { x: 54, y: 89 }, "南海": { x: 62, y: 92 }, "汉中": { x: 26, y: 49 }, "梓潼": { x: 19, y: 59 }, "成都": { x: 12, y: 68 }, "江州": { x: 23, y: 73 }, "永安": { x: 33, y: 73 },
    "永昌": { x: 3, y: 81 }, "建宁": { x: 10, y: 87 }, "交趾": { x: 8, y: 95 }, "合浦": { x: 20, y: 95 }, "朱崖洲": { x: 20, y: 99 }
};

// 3. 势力配置
const rolesConfig = {
    "无主": { flag: "circle-o", color: "blank", logo: "无", winByGod: ["混沌", "从零开始吧."] },
    "刘备": { flag: "bookmark", color: "gird1", logo: "备", winByGod: ["刘备", "终于，大汉的江山还是姓刘."] },
    "曹操": { flag: "bookmark", color: "gird2", logo: "操", winByGod: ["曹操", "奉孝，你还记得么？"] },
    "孙权": { flag: "bookmark", color: "gird3", logo: "孙", winByGod: ["孙权", "呵呵，我不比哥爹差."] },
    "董卓": { flag: "bookmark", color: "gird4", logo: "董", winByGod: ["董卓", "看吧，你们都给我敞开了吃！"] },
    "汉献帝": { flag: "bookmark", color: "gird5", logo: "汉", winByGod: ["汉献帝", "高祖，让那些力挽狂澜的汉臣，夺回江山吧"] },
    "司马炎": { flag: "bookmark", color: "gird6", logo: "司", winByGod: ["司马炎", "三分天下？我才是真命天子！"] },
    "吕布": { flag: "bookmark", color: "gird7", logo: "吕", winByGod: ["吕布", "君不见辕门射戟乎！"] },
    "袁绍": { flag: "bookmark", color: "gird5", logo: "绍", winByGod: ["袁绍", "四世三公，名门袁氏终临天下！"] },
    "刘表": { flag: "bookmark", color: "gird6", logo: "表", winByGod: ["刘表", "八俊之一，跨有江汉，雄据荆襄！"] }
};

const scriptUnits = window.scriptUnits || {};

// 4. 运行状态
let hasDragged = false;
const CFG = window.GAME_CONFIG || {};
let gameState = {
    running: false,
    timer: null,
    script: "三分天下",
    speed: CFG.speeds?.normal || 1000, 
    stats: {
        people: CFG.initialStats?.people || 1000000,
        avator: CFG.initialStats?.avator || 576,
        army_shield: CFG.initialStats?.army_shield || 300, 
        army_cavalry: CFG.initialStats?.army_cavalry || 150, 
        army_spear: CFG.initialStats?.army_spear || 280,   
        cash: CFG.initialStats?.cash || 4875231,
        food: CFG.initialStats?.food || 74112453,
        means: CFG.initialStats?.means || 254
    },
    cities: {},
    cityNow: "新野",
    selectedCity: null, 
    currentWar: null, 
    cards: [], 
    activeCardIndex: null, 
    tacticRounds: 0,
    lordSkillCD: 0, // 主动主公策略技能冷却时间
    playerLord: "刘备", // 玩家选择扮演的主公角色，默认刘备
    actionsLeft: 0, // 当前剩余可用委任数
    history: []
};

// 头像资源映射定义 (主公头像未来复用于名将)
const LORD_AVATAR_MAP = {
    "刘备": "assets/avatars/liubei.png",
    "曹操": "assets/avatars/caocao.png",
    "孙权": "assets/avatars/sunquan.png",
    "董卓": "assets/avatars/dongzhuo.png",
    "吕布": "assets/avatars/lvbu.png",
    "袁绍": "assets/avatars/yuanshao.png",
    "汉献帝": "assets/avatars/hanxiandi.png"
};

function getLordAvatar(lordName) {
    return LORD_AVATAR_MAP[lordName] || "assets/avatars/default.png";
}

function getLordBorderClass(lordName) {
    if (lordName === "刘备") return "border-shuxian";
    if (lordName === "曹操") return "border-caowei";
    if (lordName === "孙权") return "border-dongwu";
    return "border-qunxiong";
}

// 刷新顶部状态栏迷你头像与边框
function updateTopLordAvatar() {
    const pLord = getPlayerLordName();
    const avatarImg = document.getElementById("topAvatarImg");
    const avatarFrame = document.getElementById("topAvatarFrame");
    if (avatarImg) {
        avatarImg.src = getLordAvatar(pLord);
    }
    if (avatarFrame) {
        avatarFrame.className = `avatar-frame size-mini ${getLordBorderClass(pLord)}`;
    }
}


// ==========================================
// 👑 剧本主公特有策略技能设计与配置 (精简三国杀逻辑)
// ==========================================
const LORD_STRATEGY_CONFIG = {
    "刘备": {
        name: "携民渡江",
        desc: `主动技：💰${(CFG.lordSkills?.liuBei?.cashCost || 120000) / 10000}万资金。提升我方一城 ${CFG.lordSkills?.liuBei?.valueGain || 25000} 繁荣度。(冷却${CFG.lordSkills?.liuBei?.cd || 12}回合)`,
        type: "active_city",
        cd: CFG.lordSkills?.liuBei?.cd || 12,
        costCheck: () => gameState.stats.cash >= (CFG.lordSkills?.liuBei?.cashCost || 120000),
        costPay: () => { gameState.stats.cash -= (CFG.lordSkills?.liuBei?.cashCost || 120000); },
        action: (cityName) => {
            if (gameState.cities[cityName]) {
                gameState.cities[cityName].value += (CFG.lordSkills?.liuBei?.valueGain || 25000);
                addLog("刘备", `施展主公技【携民渡江】于【${cityName}】，大施仁政，携民渡江，该城繁荣度提升了 ${CFG.lordSkills?.liuBei?.valueGain || 25000}！`, "econ");
                SFX.victory();
                return true;
            }
            return false;
        }
    },
    "孙权": {
        name: "权衡调度",
        desc: `主动技：无消耗。瞬间将手中计策牌全部洗牌重抽。(冷却${CFG.lordSkills?.sunQuan?.cd || 10}回合)`,
        type: "active_card",
        cd: CFG.lordSkills?.sunQuan?.cd || 10,
        costCheck: () => true,
        costPay: () => {},
        action: () => {
            const count = gameState.cards.length;
            if (count === 0) {
                addLog("孙权", "手牌中没有任何锦囊牌，无法使用【权衡调度】进行洗牌！", "system");
                return false;
            }
            gameState.cards = [];
            for (let i = 0; i < count; i++) {
                const pool = Object.keys(TACTICS_CONFIG);
                gameState.cards.push(randChoice(pool));
            }
            addLog("孙权", `施展主公技【权衡调度】，审时度势，制衡天下，洗牌重抽了 ${count} 张锦囊妙计！`, "victory");
            SFX.card();
            updateTacticsUI();
            return true;
        }
    },
    "汉献帝": {
        name: "勤王密诏",
        desc: `主动技：💎${CFG.lordSkills?.hanXianDi?.meansCost || 6}珍宝。策反接壤敌方城池 ${CFG.lordSkills?.hanXianDi?.stealValue || 5000} 繁荣度至我方。(冷却${CFG.lordSkills?.hanXianDi?.cd || 15}回合)`,
        type: "active_city_enemy_reachable",
        cd: CFG.lordSkills?.hanXianDi?.cd || 15,
        costCheck: () => gameState.stats.means >= (CFG.lordSkills?.hanXianDi?.meansCost || 6),
        costPay: () => { gameState.stats.means -= (CFG.lordSkills?.hanXianDi?.meansCost || 6); },
        action: (cityName) => {
            const cData = gameState.cities[cityName];
            if (cData) {
                const stealVal = Math.min(cData.value, CFG.lordSkills?.hanXianDi?.stealValue || 5000);
                cData.value -= stealVal;
                // 均分到玩家拥有的城市中
                const myCities = getOwnedCities("刘备");
                if (myCities.length > 0) {
                    const addPerCity = Math.floor(stealVal / myCities.length);
                    myCities.forEach(c => {
                        gameState.cities[c].value += addPerCity;
                    });
                }
                addLog("汉献帝", `施展主公技【勤王密诏】，策反【${cityName}】${stealVal} 繁荣度并暗中输送至我方治下！`, "victory");
                SFX.tactic();
                return true;
            }
            return false;
        }
    },
    "吕布": {
        name: "飞将袭掠",
        desc: `主动技：🌾${(CFG.lordSkills?.luBu?.foodCost || 300000) / 10000}万粮食。摧毁接壤敌城 ${Math.round((CFG.lordSkills?.luBu?.damageRate || 0.35) * 100)}% 守兵(即繁荣度)，并使其陷入 3 回合混乱。(冷却${CFG.lordSkills?.luBu?.cd || 12}回合)`,
        type: "active_city_enemy_reachable",
        cd: CFG.lordSkills?.luBu?.cd || 12,
        costCheck: () => gameState.stats.food >= (CFG.lordSkills?.luBu?.foodCost || 300000),
        costPay: () => { gameState.stats.food -= (CFG.lordSkills?.luBu?.foodCost || 300000); },
        action: (cityName) => {
            const cData = gameState.cities[cityName];
            if (cData) {
                const loss = Math.floor(cData.value * (CFG.lordSkills?.luBu?.damageRate || 0.35));
                cData.value = Math.max(CFG.lordSkills?.luBu?.minValueAfter || 2000, cData.value - loss);
                cData.lianhuanTurns = CFG.lordSkills?.luBu?.lianhuanTurns || 4;
                addLog("吕布", `施展主公技【飞将袭掠】，飞将神威，铁骑扫荡，摧毁【${cityName}】${loss} 繁荣度并使其陷入防御瘫痪！`, "war");
                SFX.war();
                return true;
            }
            return false;
        }
    },
    "曹操": {
        name: "绝地反击",
        desc: "被动常驻：坚防御敌。被动御敌时，我军抵御成功率提升，且每次成功防守都会激发起军心，获得 10,000 资金与 50,000 粮食补给。",
        type: "passive"
    },
    "董卓": {
        name: "穷兵黩武",
        desc: "被动常驻：暴虐无道。在所有我方城市【募兵】的资金与粮食消耗减免 30%。但每隔 5 个推演回合，因横征暴敛，所有我方城市繁荣度降低 3%。",
        type: "passive"
    },
    "司马炎": {
        name: "三分归一",
        desc: "被动常驻：晋代魏禅。强攻城池被击退时，不会因为撤退混乱而导致任何人口和兵力的损耗折损。",
        type: "passive"
    },
    "袁绍": {
        name: "名门号令",
        desc: "被动常驻：四世三公。开局额外获得 200,000 资金与 5 个珍宝。但在推演中，使用任何锦囊妙计消耗的钱粮及珍宝需求增加 20%。",
        type: "passive"
    },
    "刘表": {
        name: "割据避战",
        desc: "被动常驻：坐谈荆楚。不主动发起地缘扩张，但所有我方城市每回合的自然繁荣增长速度提升 50%。",
        type: "passive"
    }
};

// ==========================================
// [第三阶段-音效] Web Audio API 8-bit 复古音效引擎
// ==========================================
const SFX = (() => {
    let ctx = null;

    function getCtx() {
        if (!ctx) {
            try {
                ctx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) { return null; }
        }
        return ctx;
    }

    // 基础合成音 (frequency: Hz, type: sine/square/sawtooth, duration: ms)
    function beep(frequency, type, duration, volume = 0.18) {
        const c = getCtx();
        if (!c) return;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain);
        gain.connect(c.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, c.currentTime);
        gain.gain.setValueAtTime(volume, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration / 1000);
        osc.start(c.currentTime);
        osc.stop(c.currentTime + duration / 1000);
    }

    return {
        // 战斗爆发：双音低沉打击
        war() {
            beep(180, "sawtooth", 80, 0.22);
            setTimeout(() => beep(140, "sawtooth", 120, 0.18), 70);
        },
        // 攻城得手：上扬三级音阶
        victory() {
            beep(523, "square", 80);
            setTimeout(() => beep(659, "square", 80), 90);
            setTimeout(() => beep(784, "square", 160), 180);
        },
        // 天下一统：宏大五音
        unify() {
            [392, 523, 659, 784, 1047].forEach((f, i) => {
                setTimeout(() => beep(f, "square", 200, 0.25), i * 130);
            });
        },
        // 锦囊凝聚：清脆提示音
        card() {
            beep(880, "sine", 60, 0.12);
            setTimeout(() => beep(1047, "sine", 90, 0.10), 70);
        },
        // 存档成功：短促双音
        save() {
            beep(440, "sine", 60, 0.10);
            setTimeout(() => beep(660, "sine", 80, 0.10), 70);
        },
        // 施放计策
        tactic() {
            beep(600, "sawtooth", 50, 0.14);
            setTimeout(() => beep(400, "sawtooth", 100, 0.10), 60);
        }
    };
})();

// 工具函数
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getUpDownHTML(n) {
    if (n < 0) return `<span class="updown warning">-${Math.abs(n)}</span>`;
    if (n > 0) return `<span class="updown running">+${Math.abs(n)}</span>`;
    return '<span class="updown"></span>';
}

// 初始化游戏
function initGame(scriptName) {
    gameState.script = scriptName;
    gameState.history = [];
    gameState.selectedCity = null;
    gameState.currentWar = null;
    gameState.cards = [];
    gameState.activeCardIndex = null;
    gameState.tacticRounds = 0;
    gameState.lordSkillCD = 0; // 初始化主公特有技能 CD
    gameState.activeLordSkillName = null; // 当前正在指向释放的主公技名称
    
    updateSelectedCityUI();
    updateTacticsUI();
    
    const citiesList = Object.keys(cityConnections);
    gameState.cities = {};
    citiesList.forEach(c => {
        gameState.cities[c] = { 
            value: CFG.city?.defaultValue || 10000, 
            union: "无主", 
            isWar: false,
            avoidWarTurns: 0,
            lianhuanTurns: 0
        };
    });

    const activeUnits = scriptUnits[scriptName] || scriptUnits["三分天下"];
    Object.keys(activeUnits).forEach(unitName => {
        activeUnits[unitName].home.forEach(hCity => {
            if (gameState.cities[hCity]) {
                gameState.cities[hCity] = { 
                    value: CFG.city?.ownedValue || 50000, 
                    union: unitName, 
                    isWar: false,
                    avoidWarTurns: 0,
                    lianhuanTurns: 0
                };
            }
        });
    });

    // 袁绍被动【名门号令】开局额外获得资金和珍宝加成
    const pLord = getPlayerLordName();
    const initCash = CFG.initialStats?.cash || 4875231;
    const initMeans = CFG.initialStats?.means || 254;
    if (pLord === "袁绍") {
        gameState.stats.cash = initCash + (CFG.yuanShaoBonus?.cash || 200000);
        gameState.stats.means = initMeans + (CFG.yuanShaoBonus?.means || 5);
    } else {
        // 重置为原本默认默认配置
        gameState.stats.cash = initCash;
        gameState.stats.means = initMeans;
    }

    gameState.cityNow = activeUnits[pLord] ? activeUnits[pLord].home[0] : (activeUnits["刘备"] ? activeUnits["刘备"].home[0] : "新野");
    gameState.actionsLeft = getPlayerMaxActions();

    
    const msgContainer = document.getElementById("message");
    if (msgContainer) msgContainer.innerHTML = "";
    
    addLog("system", `${scriptName}时代，天下割据，狼烟四起。`, "system");
    
    // 同步侧边栏剧本按钮的激活状态
    const scriptBtns = document.querySelectorAll(".mini-script-btn");
    scriptBtns.forEach(btn => {
        if (btn.textContent.trim() === scriptName) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    updateTopLordAvatar();
    renderMap();
    renderStats({ people: 0, avator: 0, army_shield: 0, army_cavalry: 0, army_spear: 0, cash: 0, food: 0, means: 0 });
}

// 一键强制统一
function setAllCity(unitName) {
    const citiesList = Object.keys(cityConnections);
    citiesList.forEach(c => {
        gameState.cities[c].union = unitName;
        gameState.cities[c].value = CFG.city?.maxValue || 100000;
        gameState.cities[c].isWar = false;
    });
    
    const winMsg = rolesConfig[unitName] ? rolesConfig[unitName].winByGod[1] : "天命所归，天下大吉！";
    addLog("victory", `${unitName}：${winMsg}`, "victory");
    renderMap();
    checkVictory();
    
    const modal = document.getElementById("settingsModal");
    if (modal) modal.classList.remove("active");
}

// 动态绘制/更新 SVG 连线
function drawConnections() {
    const svg = document.getElementById("map-links-svg");
    if (!svg) return;

    const drawn = new Set();

    Object.keys(cityConnections).forEach(startCity => {
        const startCoord = cityCoords[startCity];
        if (!startCoord) return;

        const conns = cityConnections[startCity].connect;
        conns.forEach(endCity => {
            const endCoord = cityCoords[endCity];
            if (!endCoord) return;

            const lineKey = [startCity, endCity].sort().join("-");
            if (drawn.has(lineKey)) return;
            drawn.add(lineKey);

            const isWarLine = gameState.currentWar && (
                (startCity === gameState.currentWar.from && endCity === gameState.currentWar.to) ||
                (startCity === gameState.currentWar.to && endCity === gameState.currentWar.from)
            );
            
            let line = document.getElementById(`link-${lineKey}`);
            let isNew = false;
            
            if (!line) {
                isNew = true;
                line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.id = `link-${lineKey}`;
            }

            if (isWarLine) {
                const fromCoord = cityCoords[gameState.currentWar.from];
                const toCoord = cityCoords[gameState.currentWar.to];
                const x1Val = `${fromCoord.x}%`;
                const y1Val = `${fromCoord.y}%`;
                const x2Val = `${toCoord.x}%`;
                const y2Val = `${toCoord.y}%`;
                
                if (line.getAttribute("x1") !== x1Val) line.setAttribute("x1", x1Val);
                if (line.getAttribute("y1") !== y1Val) line.setAttribute("y1", y1Val);
                if (line.getAttribute("x2") !== x2Val) line.setAttribute("x2", x2Val);
                if (line.getAttribute("y2") !== y2Val) line.setAttribute("y2", y2Val);
                if (line.getAttribute("class") !== "war-line") {
                    line.setAttribute("class", "war-line");
                }
            } else {
                const x1Val = `${startCoord.x}%`;
                const y1Val = `${startCoord.y}%`;
                const x2Val = `${endCoord.x}%`;
                const y2Val = `${endCoord.y}%`;

                if (line.getAttribute("x1") !== x1Val) line.setAttribute("x1", x1Val);
                if (line.getAttribute("y1") !== y1Val) line.setAttribute("y1", y1Val);
                if (line.getAttribute("x2") !== x2Val) line.setAttribute("x2", x2Val);
                if (line.getAttribute("y2") !== y2Val) line.setAttribute("y2", y2Val);
                if (line.getAttribute("class") !== "normal-line") {
                    line.setAttribute("class", "normal-line");
                }
            }

            if (isNew) {
                svg.appendChild(line);
            }
        });
    });
}

// 绝对定位 2D 渲染/更新地图关卡
// 城市规模规划表 (未在此表中的城市默认归为中型 "medium")
const citySizes = {
    // 大型城市 (中心州府或战略要冲)
    "长安": "large", "洛阳": "large", "许昌": "large", "成都": "large", "建业": "large", 
    "襄阳": "large", "邺": "large", "寿春": "large", "江陵": "large", "下邳": "large",
    "北平": "large", "南皮": "large", "宛": "large", "豫章": "large", "长沙": "large",
    // 小型城市 (塞外、边关防线或小城隘)
    "武威": "small", "金城": "small", "乐浪": "small", "夷洲": "small", "朱崖洲": "small", 
    "永昌": "small", "合浦": "small", "交趾": "small", "武都": "small", "上庸": "small",
    "梓潼": "small", "汉中": "small", "江州": "small", "永安": "small", "建宁": "small"
};

// 根据城市规模与状态获取对应像素画图标路径
function getCityIcon(cityName, cityData, isCapital) {
    // 确定尺寸级别 (在其他规格资源补齐前，我们先回落到已生成的 small 级别)
    let size = "small";

    /* 待后续中型/大型/都城等资源图生成完后，只需把上面那行 size = "small" 改为如下逻辑即可：
    if (isCapital) {
        size = "capital";
    } else {
        size = citySizes[cityName] || "medium";
    }
    */

    // 仅保留普通状态，废弃凋敝与战争状态
    return `assets/city_${size}_normal.png`;
}

// 绝对定位 2D 渲染/更新地图关卡
function renderMap() {
    const container = document.getElementById("content");
    if (!container) return;

    const citiesList = Object.keys(cityConnections);

    citiesList.forEach(cityName => {
        const cityData = gameState.cities[cityName] || { value: 0, union: "无主", isWar: false };
        const role = rolesConfig[cityData.union] || rolesConfig["无主"];
        const coord = cityCoords[cityName] || { x: 50, y: 50 };
        
        let cityEl = document.getElementById(cityName);
        let isNew = false;
        
        if (!cityEl) {
            isNew = true;
            cityEl = document.createElement("div");
            cityEl.id = cityName;
            cityEl.style.left = `${coord.x}%`;
            cityEl.style.top = `${coord.y}%`;
            
            cityEl.onclick = function(e) {
                e.stopPropagation();
                
                // 优先判定是否主公主动指向性技能释放
                if (gameState.activeLordSkillName) {
                    const handled = triggerLordSkill(cityName);
                    if (handled) return;
                }

                // 尝试释放卡牌计策，如果成功释放，直接返回不触发常规点选
                if (gameState.activeCardIndex !== null) {
                    const handled = applyTactic(cityName);
                    if (handled) return;
                }
                
                gameState.selectedCity = cityName;
                renderMap(); 
                updateSelectedCityUI();
            };
        }

        const isCapital = isCapitalCity(cityName, cityData.union);
        const badgesHTML = getCityStatusBadgesHTML(cityData, isCapital);
        const statusTexts = getCityStatusTextList(cityData, isCapital);

        // 构建状态类名
        let wrapperClasses = "city-wrapper";
        if (cityName === gameState.cityNow) {
            wrapperClasses += " focused";
        }
        if (cityData.isWar) {
            wrapperClasses += " war-active";
        }
        if (cityName === gameState.selectedCity) {
            wrapperClasses += " selected"; 
        }
        cityEl.className = wrapperClasses;

        if (!isNew) {
            // 进行值比对，若完全一致则跳过 DOM 刷新以优化 CPU 性能
            const isCapital = isCapitalCity(cityName, cityData.union);
            const badgesHTML = getCityStatusBadgesHTML(cityData, isCapital);
            const statusTexts = getCityStatusTextList(cityData, isCapital);

            const iconEl = document.getElementById(`${cityName}_icon`);
            if (iconEl && iconEl.getAttribute("data-capital") !== String(isCapital)) {
                iconEl.src = getCityIcon(cityName, cityData, isCapital);
                iconEl.setAttribute("data-capital", String(isCapital));
            }
            const factionEl = document.getElementById(`${cityName}_faction`);
            if (factionEl) {
                const newBadgeClass = `city-faction-badge ${role.color}`;
                const newBadgeText = role.logo || cityData.union[0];
                if (factionEl.className !== newBadgeClass) factionEl.className = newBadgeClass;
                if (factionEl.textContent !== newBadgeText) factionEl.textContent = newBadgeText;
            }
            const badgesEl = document.getElementById(`${cityName}_badges`);
            if (badgesEl && badgesEl.getAttribute("data-badges-key") !== badgesHTML) {
                badgesEl.innerHTML = badgesHTML;
                badgesEl.setAttribute("data-badges-key", badgesHTML);
            }
            const ownerEl = document.getElementById(`${cityName}_owner`);
            if (ownerEl && ownerEl.textContent !== cityData.union) {
                ownerEl.textContent = cityData.union;
            }
            const contentEl = document.getElementById(`${cityName}_content`);
            if (contentEl) {
                const newContent = `
                    状态: <span style="color:#66fcf1;">${statusTexts.join(" / ")}</span><br/>
                    繁荣度: ${cityData.value} <br/>
                    连通: ${cityConnections[cityName].connect.join(", ")}
                `;
                if (contentEl.getAttribute("data-content-key") !== `${cityData.value}-${cityData.isWar}-${cityData.avoidWarTurns}`) {
                    contentEl.innerHTML = newContent;
                    contentEl.setAttribute("data-content-key", `${cityData.value}-${cityData.isWar}-${cityData.avoidWarTurns}`);
                }
            }
        } else {
            const isCapital = isCapitalCity(cityName, cityData.union);
            const badgesHTML = getCityStatusBadgesHTML(cityData, isCapital);
            const statusTexts = getCityStatusTextList(cityData, isCapital);
            const contentHTML = `
                <div class="city-status-badges" id="${cityName}_badges" data-badges-key="${encodeURIComponent(badgesHTML)}">${badgesHTML}</div>
                <div class="city-main-node tip">
                    <img class="city-icon" id="${cityName}_icon" data-capital="${isCapital}" src="${getCityIcon(cityName, cityData, isCapital)}" alt="${cityName}" />
                    <div class="city-faction-badge ${role.color}" id="${cityName}_faction">${role.logo || cityData.union[0]}</div>
                    <span class="prompt-box">
                        <strong>${cityName}</strong> - 归属: <span id="${cityName}_owner">${cityData.union}</span>
                        <div class="main73">
                            <div id="${cityName}_content" data-content-key="${cityData.value}-${cityData.isWar}-${cityData.avoidWarTurns}" style="width:100%; padding:5px 0;">
                                状态: <span style="color:#66fcf1;">${statusTexts.join(" / ")}</span><br/>
                                繁荣度: ${cityData.value} <br/>
                                连通: ${cityConnections[cityName].connect.join(", ")}
                            </div>
                        </div>
                    </span>
                </div>
                <div class="city-name-tag">${cityName}</div>
            `;
            cityEl.innerHTML = contentHTML;
            container.appendChild(cityEl);
        }
    });

    drawConnections();
}

// 刷新【右侧停靠式城池微操面板】UI
function updateSelectedCityUI() {
    const defaultEl = document.getElementById("defaultRightContent");
    const cityEl = document.getElementById("cityRightContent");
    if (!defaultEl || !cityEl) return;

    if (!gameState.selectedCity) {
        cityEl.style.display = "none";
        defaultEl.style.display = "block";
        return;
    }

    const cName = gameState.selectedCity;
    const cData = gameState.cities[cName];
    if (!cData) return;

    const pLord = getPlayerLordName();
    const isMine = cData.union === pLord;
    const myCities = getOwnedCities(pLord);
    const neighbours = getNeighbours(myCities);
    const isReachable = neighbours.includes(cName);

    // 主公技能按钮 HTML 构建
    let lordSkillHTML = "";
    const config = LORD_STRATEGY_CONFIG[pLord];

    if (config) {
        if (config.type === "passive") {
            // 被动徽章常驻
            lordSkillHTML = `
                <div class="lord-passive-badge" title="${config.desc}">
                    <span class="lbadge-tag">【被动常驻】</span>
                    <span class="lbadge-name">${config.name}</span>
                </div>
            `;
        } else if (config.type.startsWith("active_city")) {
            // 主动技能按钮，显示在微操详情顶部
            const isCooling = gameState.lordSkillCD > 0;
            const canAfford = config.costCheck();
            const isPrep = gameState.activeLordSkillName !== null;
            let btnClass = "b-action-btn lord-skill-btn";
            if (isCooling) btnClass += " cooling";
            if (!canAfford && !isCooling) btnClass += " disabled";
            if (isPrep) btnClass += " preparing";

            let btnText = `【主公技】${config.name} (就绪)`;
            if (isCooling) {
                btnText = `【冷却中】${config.name} (${gameState.lordSkillCD}回合)`;
            } else if (isPrep) {
                btnText = `【生效中】请点击目标城池`;
            }

            lordSkillHTML = `
                <div class="lord-active-container">
                    <button class="${btnClass}" ${isCooling || (!canAfford && !isPrep) ? 'disabled' : ''} onclick="prepLordActiveSkill('${config.name}')">
                        ${btnText}
                    </button>
                    <div style="font-size:0.62rem; color:#aaa; margin:2px 0 6px 0; text-align:center; line-height:1.2;">
                        ${config.desc}
                    </div>
                </div>
            `;
        }
    }

    let actionsHTML = "";
    const isNoActions = gameState.actionsLeft <= 0;
    const actionSuffix = isNoActions ? " (委任点不足)" : "";

    if (isMine) {
        // 董卓被动【穷兵黩武】30% 减免字面量提示
        const showDongDiscount = (pLord === "董卓");
        const recruitShieldCost = showDongDiscount ? "💰10.5万/🌾3.5万" : "💰15万/🌾5万";
        const recruitSpearCost = showDongDiscount ? "💰5.6万/🌾2.1万" : "💰8万/🌾3万";
        const recruitCavalryCost = showDongDiscount ? "💰17.5万/🌾8.4万" : "💰25万/🌾12万";

        const btnClass = `b-action-btn cbtn-recruit${isNoActions ? ' disabled' : ''}`;
        const econClass = `b-action-btn cbtn-econ${isNoActions ? ' disabled' : ''}`;
        const disabledAttr = isNoActions ? 'disabled' : '';

        actionsHTML = `
            <div class="docked-actions">
                <button class="${btnClass}" ${disabledAttr} onclick="cityAction('recruit_shield')">🛡️ 招募虎贲军 (${recruitShieldCost})${actionSuffix}</button>
                <button class="${btnClass}" ${disabledAttr} onclick="cityAction('recruit_spear')">🔱 招募长枪兵 (${recruitSpearCost})${actionSuffix}</button>
                <button class="${btnClass}" ${disabledAttr} onclick="cityAction('recruit_cavalry')">🐘 招募南蛮象兵 (${recruitCavalryCost})${actionSuffix}</button>
                <button class="${econClass}" ${disabledAttr} onclick="cityAction('farm')">🌾 屯田灌溉 (💰5万)${actionSuffix}</button>
            </div>
        `;
    } else {
        const warClass = `b-action-btn cbtn-war${(!isReachable || isNoActions) ? ' disabled' : ''}`;
        const plotClass = `b-action-btn cbtn-plot${isNoActions ? ' disabled' : ''}`;
        const warDisabledAttr = (!isReachable || isNoActions) ? 'disabled' : '';
        const plotDisabledAttr = isNoActions ? 'disabled' : '';

        actionsHTML = `
            <div class="docked-actions">
                <button class="${warClass}" ${warDisabledAttr} onclick="cityAction('attack')">⚔️ 亲征强攻${isNoActions ? actionSuffix : ''}</button>
                <button class="${plotClass}" ${plotDisabledAttr} onclick="cityAction('plot')">🔥 流言破坏 (💎5珍宝)${actionSuffix}</button>
            </div>
            ${!isReachable ? '<div style="font-size:0.62rem; color:#ff4e50; margin-top:5px; text-align:center;"><i class="fa fa-exclamation-triangle"></i> 提示：需接壤才可发起强攻</div>' : ''}
        `;
    }

    let avatarHTML = "";
    if (isMine) {
        avatarHTML = `
            <div style="display: flex; justify-content: center; margin: 4px 0 8px 0;">
                <div class="avatar-frame size-medium ${getLordBorderClass(pLord)}" title="当前委任主公：${pLord}">
                    <img src="${getLordAvatar(pLord)}" class="avatar-img" />
                </div>
            </div>
        `;
    }

    const isCapital = isCapitalCity(cName, cData.union);
    const badgesHTML = getCityStatusBadgesHTML(cData, isCapital);
    const conns = cityConnections[cName]?.connect || [];

    cityEl.innerHTML = `
        <div class="docked-city-detail">
            <div class="docked-title">
                <span>🏰 ${cName}</span>
                <span class="city-faction-badge ${rolesConfig[cData.union]?.color || 'blank'}">${rolesConfig[cData.union]?.logo || cData.union[0]}</span>
            </div>
            
            ${avatarHTML}
            ${lordSkillHTML}

            <div class="docked-info-grid">
                <div class="docked-info-row">
                    <span>势力归属:</span>
                    <span style="font-weight:bold; color:#fff;">${cData.union}</span>
                </div>
                <div class="docked-info-row">
                    <span>城市繁荣度:</span>
                    <span style="color:#66fcf1;">${cData.value}</span>
                </div>
                <div class="docked-info-row" style="flex-direction:column; gap:2px; margin-top:2px;">
                    <span style="color:#888;">地缘连通:</span>
                    <span style="color:#aaa; font-size:0.65rem;">${conns.join(" ↔ ")}</span>
                </div>
            </div>
            <div style="display:flex; gap:3px; margin:4px 0; justify-content:center; flex-wrap:wrap;">
                ${badgesHTML}
            </div>
            ${actionsHTML}
            <button class="docked-back-btn" onclick="clearSelectedCity()"><i class="fa fa-arrow-left"></i> 返回总览</button>
        </div>
    `;

    defaultEl.style.display = "none";
    cityEl.style.display = "block";
}

// 清除选择并返回总览
function clearSelectedCity() {
    gameState.selectedCity = null;
    renderMap();
    updateSelectedCityUI();
}

// 城市操作指令响应
function cityAction(type) {
    const cName = gameState.selectedCity;
    if (!cName) return;

    // 检查委任点数是否足够
    if (gameState.actionsLeft <= 0) {
        addLog("操作失败", "本回合委任指令点数已耗尽，请进入下一回合刷新点数！", "system");
        return;
    }

    const cData = gameState.cities[cName];
    const pLord = getPlayerLordName();
    // 董卓被动【穷兵黩武】减免因子
    const isDongDiscount = (pLord === "董卓" || (pLord === "刘备" && gameState.script === "赤壁之战"));
    const costMult = isDongDiscount ? (CFG.passives?.dongZhuo?.recruitDiscount || 0.7) : 1.0;

    const rc = CFG.recruitment;

    if (type === "recruit_shield") {
        const cashCost = Math.floor((rc?.shield?.cash || 150000) * costMult);
        const foodCost = Math.floor((rc?.shield?.food || 50000) * costMult);
        if (gameState.stats.cash < cashCost || gameState.stats.food < foodCost) {
            addLog("募兵失败", `国库资金（需${cashCost/10000}万）或粮草（需${foodCost/10000}万）不足！`, "system");
            return;
        }
        gameState.stats.cash -= cashCost;
        gameState.stats.food -= foodCost;
        gameState.stats.army_shield += (rc?.shield?.amount || 100);
        cData.value += (rc?.shield?.valueGain || 3000);
        gameState.actionsLeft--;
        addLog("增兵布守", `在【${cName}】征发钱粮，编练招募了 ${rc?.shield?.amount || 100} 名重装【虎贲军】驻防！`, "econ");
        renderStats({ cash: -cashCost, food: -foodCost, army_shield: rc?.shield?.amount || 100 });

    } else if (type === "recruit_spear") {
        const cashCost = Math.floor((rc?.spear?.cash || 80000) * costMult);
        const foodCost = Math.floor((rc?.spear?.food || 30000) * costMult);
        if (gameState.stats.cash < cashCost || gameState.stats.food < foodCost) {
            addLog("募兵失败", `国库资金（需${cashCost/10000}万）或粮草（需${foodCost/10000}万）不足！`, "system");
            return;
        }
        gameState.stats.cash -= cashCost;
        gameState.stats.food -= foodCost;
        gameState.stats.army_spear += (rc?.spear?.amount || 100);
        cData.value += (rc?.spear?.valueGain || 1500);
        gameState.actionsLeft--;
        addLog("增兵布守", `在【${cName}】募民兵，编训了 ${rc?.spear?.amount || 100} 名【精锐长枪兵】！`, "econ");
        renderStats({ cash: -cashCost, food: -foodCost, army_spear: rc?.spear?.amount || 100 });

    } else if (type === "recruit_cavalry") {
        const cashCost = Math.floor((rc?.cavalry?.cash || 250000) * costMult);
        const foodCost = Math.floor((rc?.cavalry?.food || 120000) * costMult);
        if (gameState.stats.cash < cashCost || gameState.stats.food < foodCost) {
            addLog("募兵失败", `招募野象装甲兵费高，资金（需${cashCost/10000}万）或粮草（需${foodCost/10000}万）不足！`, "system");
            return;
        }
        gameState.stats.cash -= cashCost;
        gameState.stats.food -= foodCost;
        gameState.stats.army_cavalry += (rc?.cavalry?.amount || 50);
        cData.value += (rc?.cavalry?.valueGain || 5000);
        gameState.actionsLeft--;
        addLog("巨兽营房", `在【${cName}】重金引进象群，训练了 ${rc?.cavalry?.amount || 50} 名重装【南蛮象兵】！`, "victory");
        renderStats({ cash: -cashCost, food: -foodCost, army_cavalry: rc?.cavalry?.amount || 50 });

    } else if (type === "farm") {
        const farmCash = CFG.economy?.farm?.cashCost || 50000;
        if (gameState.stats.cash < farmCash) {
            addLog("修水利失败", `资金不足（需${farmCash/10000}万金）！`, "system");
            return;
        }
        gameState.stats.cash -= farmCash;
        cData.value += (CFG.economy?.farm?.valueGain || 12000);
        gameState.stats.food += (CFG.economy?.farm?.foodGain || 300000);
        gameState.actionsLeft--;
        addLog("修生养息", `在【${cName}】大兴民夫屯田水利，使该城繁荣度显著飙升！`, "econ");
        renderStats({ cash: -farmCash, food: CFG.economy?.farm?.foodGain || 300000 });

    } else if (type === "attack") {
        const myLord = getPlayerLordName();
        const myCities = getOwnedCities(myLord);
        const neighbours = getNeighbours(myCities);
        if (!neighbours.includes(cName)) {
            addLog("出征失败", "非接壤关隘，无法强袭！", "system");
            return;
        }

        const atkCfg = CFG.combat?.playerAttack;
        if (gameState.stats.army_cavalry < (atkCfg?.cavalryRequired || 30) || gameState.stats.cash < (atkCfg?.cashCost || 500000)) {
            addLog("出征失败", `需要至少 ${atkCfg?.cavalryRequired || 30} 名南蛮突击象兵作为攻坚，且战费需 ${(atkCfg?.cashCost || 500000)/10000}万金！`, "system");
            return;
        }

        gameState.stats.army_cavalry -= (atkCfg?.cavalryRequired || 30); 
        gameState.stats.cash -= (atkCfg?.cashCost || 500000);
        gameState.actionsLeft--;

        cData.isWar = true;
        // 计算发起我方强攻的接壤城池以进行连线
        const myAttackers = myCities.filter(c => cityConnections[c]?.connect.includes(cName));
        const attackerCity = randChoice(myAttackers) || myCities[0];
        gameState.currentWar = { from: attackerCity, to: cName };
        const hasLianhuan = cData.lianhuanTurns > 0;
        const success = hasLianhuan || Math.random() < (atkCfg?.baseSuccessRate || 0.75);
        if (success) {
            const old = cData.union;
            cData.union = myLord;
            cData.value = Math.floor(cData.value * (CFG.city?.postConquerRetain || 0.95));
            if (hasLianhuan) {
                cData.lianhuanTurns = 0; // 解除连环计
                addLog("亲征大捷", `【战报】乘【${cName}】受连环计防线混乱之际，我军挥师踏平防线，不费吹灰之力强攻收复！`, "victory");
            } else {
                addLog("亲征大捷", `【战报】${myLord}亲率大军大举突破【${cName}】，瞬间踩平【${old}】防御，收复失地！`, "victory");
            }
        } else {
            addLog("亲征受挫", `【战报】强攻【${cName}】遭遇敌坚决抵抗，突击象兵折损，被迫收兵。`, "war");
        }
        renderStats({ army_cavalry: -(atkCfg?.cavalryRequired || 30), cash: -(atkCfg?.cashCost || 500000) });
        renderMap();
        updateSelectedCityUI();

    } else if (type === "plot") {
        const plotMeans = CFG.plot?.meansCost || 5;
        if (gameState.stats.means < plotMeans) {
            addLog("破坏失败", `缺少收买提线木偶的名器珍宝（需 ${plotMeans} 个珍宝）！`, "system");
            return;
        }

        gameState.stats.means -= plotMeans;
        const loss = Math.floor(cData.value * (CFG.plot?.valueDamageRate || 0.5));
        cData.value = Math.max(CFG.plot?.minValueAfter || 1000, cData.value - loss);
        gameState.actionsLeft--;

        addLog("刺客与破坏", `暗中派死士刺客混入【${cName}】密谋纵火并收买内战，该城经济被重创！`, "war");
        renderStats({ means: -plotMeans });
        renderMap();
        updateSelectedCityUI();
    }

    updateBarracksUI();
}

// 刷新右侧兵种列表UI
function updateBarracksUI() {
    const list = document.getElementById("barracksList");
    if (!list) return;

    list.innerHTML = `
        <div class="info-item spec-barrack">
            <span>🛡️ 虎贲重步 (防备)</span> 
            <strong>${gameState.stats.army_shield} 名</strong>
        </div>
        <div class="info-item spec-barrack" style="margin-top: 4px;">
            <span>🐘 南蛮骑象 (攻坚)</span> 
            <strong>${gameState.stats.army_cavalry} 骑</strong>
        </div>
        <div class="info-item spec-barrack" style="margin-top: 4px;">
            <span>🔱 精锐枪兵 (防骑)</span> 
            <strong>${gameState.stats.army_spear} 杆</strong>
        </div>
        <div style="font-size:0.65rem; color:#777; margin-top:8px; line-height:1.3;">
            攻城由象兵开锋(需30骑)；守城时虎贲战法防御几率坚守免遭丢失。
        </div>
    `;
}

// 触发数值变动背景微光闪烁
function flashStatCard(statId, isIncrease) {
    const card = document.getElementById(statId)?.parentElement;
    if (!card) return;
    const flashClass = isIncrease ? "flash-green" : "flash-red";
    card.classList.add(flashClass);
    setTimeout(() => {
        card.classList.remove(flashClass);
    }, 450);
}

// 渲染玩家数值看板 (三兵种拆分)
function renderStats(change = { people: 0, avator: 0, army_shield: 0, army_cavalry: 0, army_spear: 0, cash: 0, food: 0, means: 0 }) {
    const fields = ["people", "avator", "army_shield", "army_cavalry", "army_spear", "cash", "food", "means"];
    fields.forEach(field => {
        const val = change[field];
        if (val && val !== 0) {
            flashStatCard(field, val > 0);
        }
    });

    const totalArmy = gameState.stats.army_shield + gameState.stats.army_cavalry + gameState.stats.army_spear;
    const totalChange = (change.army_shield || 0) + (change.army_cavalry || 0) + (change.army_spear || 0);

    document.getElementById("people").innerHTML = `${gameState.stats.people} ${getUpDownHTML(change.people)}`;
    document.getElementById("avator").innerHTML = `${gameState.stats.avator} ${getUpDownHTML(change.avator)}`;
    document.getElementById("army").innerHTML = `${totalArmy} ${getUpDownHTML(totalChange)}`;
    document.getElementById("cash").innerHTML = `${gameState.stats.cash} ${getUpDownHTML(change.cash)}`;
    document.getElementById("food").innerHTML = `${gameState.stats.food} ${getUpDownHTML(change.food)}`;
    document.getElementById("means").innerHTML = `${gameState.stats.means} ${getUpDownHTML(change.means)}`;
    if (document.getElementById("actions")) {
        document.getElementById("actions").innerHTML = `${gameState.actionsLeft} / ${getPlayerMaxActions()}`;
    }

    updateBarracksUI();
}

// 添加分级日志
function addLog(tag, content, type = "normal") {
    const msgContainer = document.getElementById("message");
    if (!msgContainer) return;

    const line = document.createElement("div");
    line.className = `line ${type}`;

    let icon = "fa-bookmark-o";
    if (type === "war") icon = "fa-shield";
    if (type === "econ") icon = "fa-money";
    if (type === "victory") icon = "fa-trophy";
    if (type === "system") icon = "fa-info-circle";

    line.innerHTML = `<i class="fa ${icon}"> [${tag}]</i> <br/> ${content}`;
    msgContainer.insertBefore(line, msgContainer.firstChild);

    if (msgContainer.children.length > 50) {
        msgContainer.removeChild(msgContainer.lastChild);
    }
}

// 找到某个势力所有拥有的城池
function getOwnedCities(unitName) {
    const list = [];
    Object.keys(gameState.cities).forEach(cityName => {
        if (gameState.cities[cityName].union === unitName) {
            list.push(cityName);
        }
    });
    return list;
}

// 获取玩家最大委任次数限制（基于控制城池数量和规模）
function getPlayerMaxActions() {
    const myLord = getPlayerLordName();
    const myCities = getOwnedCities(myLord);
    let maxActions = 0;
    myCities.forEach(c => {
        const size = citySizes[c] || "medium";
        if (size === "large") maxActions += (CFG.actions?.largeCity || 3);
        else if (size === "small") maxActions += (CFG.actions?.smallCity || 1);
        else maxActions += (CFG.actions?.mediumCity || 2); // medium
    });
    return maxActions;
}


// 寻找相邻城池
function getNeighbours(citiesArr) {
    const neighbours = new Set();
    citiesArr.forEach(c => {
        const conns = cityConnections[c]?.connect || [];
        conns.forEach(n => {
            if (!citiesArr.includes(n)) {
                neighbours.add(n);
            }
        });
    });
    return Array.from(neighbours);
}

// 单次推演动作
function nextStep() {
    gameState.currentWar = null; // 重置本回合战斗发起线路
    
    // 恢复委任点数
    gameState.actionsLeft = getPlayerMaxActions();

    
    // 递减主公主动技冷却时间
    if (gameState.lordSkillCD > 0) {
        gameState.lordSkillCD--;
    }

    Object.keys(gameState.cities).forEach(c => {
        gameState.cities[c].isWar = false;
        // 递减锦囊计策的回合计数器
        if (gameState.cities[c].avoidWarTurns > 0) gameState.cities[c].avoidWarTurns--;
        if (gameState.cities[c].lianhuanTurns > 0) gameState.cities[c].lianhuanTurns--;
    });

    const activeUnits = scriptUnits[gameState.script];
    // 过滤出当前至少拥有一座城池的存活势力
    const aliveUnits = Object.keys(activeUnits).filter(unit => getOwnedCities(unit).length > 0);
    
    if (aliveUnits.length === 0) return;

    const targetUnit = randChoice(aliveUnits);
    
    // 刘表被动【割据避战】：刘表不主动发起对外战争，如果随机到刘表且为侵略，有概率改成休养生息
    let forceEcon = false;
    if (targetUnit === "刘表" && Math.random() < (CFG.passives?.liuBiao?.avoidWarRate || 0.75)) {
        forceEcon = true;
    }

    const owned = getOwnedCities(targetUnit);
    const neighbours = getNeighbours(owned);
    const isAggressive = !forceEcon && Math.random() < (CFG.combat?.aiAttack?.aggressionRate || 0.65) && neighbours.length > 0;

    let targetCity = "";
    let change = { people: 0, avator: 0, army_shield: 0, army_cavalry: 0, army_spear: 0, cash: 0, food: 0, means: 0 };
    let logMsg = "";
    let logType = "normal";

    if (isAggressive) {
        // AI 地缘战略智商评估
        let bestCity = "";
        let maxWeight = -999999;
        
        const shuffledNeighbours = [...neighbours].sort(() => Math.random() - 0.5);
        
        shuffledNeighbours.forEach(nCity => {
            const nData = gameState.cities[nCity];
            let weight = CFG.aiEvents?.aiCityWeight?.base || 1000;
            
            weight -= Math.floor(nData.value / (CFG.aiEvents?.aiCityWeight?.valuePenaltyPer250 ? 250 / CFG.aiEvents?.aiCityWeight?.valuePenaltyPer250 : 250));
            
            if (isCapitalCity(nCity, nData.union)) {
                weight -= (CFG.aiEvents?.aiCityWeight?.capitalPenalty || 800);
            }
            
            if (nData.avoidWarTurns > 0) {
                weight -= (CFG.aiEvents?.aiCityWeight?.avoidWarPenalty || 5000);
            }
            
            if (weight > maxWeight) {
                maxWeight = weight;
                bestCity = nCity;
            }
        });
        
        targetCity = bestCity || randChoice(neighbours);
        
        const pLord = getPlayerLordName();
        // 拦截：如果敌军准备进攻的目标是我方且处于【免战】状态下
        if (gameState.cities[targetCity].union === pLord && gameState.cities[targetCity].avoidWarTurns > 0) {
            logMsg = `大举企图进犯我方防线，但行至【${targetCity}】时守军大开城门弹琴唱曲。敌方怀疑有诈被迫退兵。`;
            addLog(targetUnit, logMsg, "system");
            renderMap();
            
            gameState.stats.cash += randInt(-2000, 500);
            gameState.stats.food += randInt(-8000, 1000);
            renderStats();
            return;
        }

        gameState.cities[targetCity].isWar = true;

        // 寻找是哪一个己方接壤的城池发起的进攻以连线
        const attackers = owned.filter(c => cityConnections[c]?.connect.includes(targetCity));
        const attackerCity = randChoice(attackers) || owned[0];
        gameState.currentWar = { from: attackerCity, to: targetCity };

        const defender = gameState.cities[targetCity].union;
        
        // 曹操被动【绝地反击】：防御战防御成功率提高
        let shieldDefendRate = CFG.combat?.defense?.baseShieldRate || 0.3;
        if (defender === "曹操") {
            shieldDefendRate = CFG.combat?.defense?.caoCaoShieldRate || 0.6;
        }

        const shieldMin = CFG.combat?.defense?.shieldMin || 100;
        if (defender === pLord && gameState.stats.army_shield > shieldMin && Math.random() < shieldDefendRate) {
            logMsg = `派遣兵马大肆入侵我方【${targetCity}】，但遭到驻防的【虎贲重步兵】誓死抵抗，强行守住了要塞关隘！`;
            logType = "war";
            change.army_shield = -randInt(
                CFG.combat?.postDefense?.shieldLossMin || 10,
                CFG.combat?.postDefense?.shieldLossMax || 30
            );
            SFX.war();
        } else {
            const isSuccess = Math.random() < (CFG.combat?.aiAttack?.baseSuccessRate || 0.55);
            if (isSuccess) {
                gameState.cities[targetCity].union = targetUnit;
                gameState.cities[targetCity].value = Math.max(
                    CFG.city?.aiConquerMin || 5000,
                    Math.floor(gameState.cities[targetCity].value * (CFG.city?.aiConquerRetain || 0.7))
                );
                
                logMsg = `挥师强攻【${targetCity}】，击溃了【${defender}】的守备部队，成功将城池夺回！`;
                logType = "war";
                SFX.war();
                
                if (defender === pLord) {
                    change.people = -randInt(
                        CFG.combat?.postFailedAttack?.peopleLossMin || 50,
                        CFG.combat?.postFailedAttack?.peopleLossMax || 200
                    );
                    change.army_spear = -randInt(
                        CFG.combat?.postFailedAttack?.spearLossMin || 5,
                        CFG.combat?.postFailedAttack?.spearLossMax || 15
                    );
                }
            } else {
                logMsg = `袭击强攻【${targetCity}】失利，遭遇坚固拒马城墙，只得撤兵。`;
                logType = "normal";

                // 司马炎被动【三分归一】：强攻被击退时，不会因为混乱损耗兵力与人口
                if (targetUnit === "司马炎" && CFG.passives?.siMaYan?.noRetreatLoss) {
                    logMsg += ` (【司马炎】施展三分归一，全军安然撤回无损折)`;
                }
            }
        }

        change.cash = randInt(
            CFG.aiEvents?.warCashMin || -6000,
            CFG.aiEvents?.warCashMax || 1000
        );
        change.food = randInt(
            CFG.aiEvents?.warFoodMin || -20000,
            CFG.aiEvents?.warFoodMax || 2000
        );
    } else {
        targetCity = randChoice(owned);
        const randEvent = Math.random();
        const pLord = getPlayerLordName();

        if (randEvent < (CFG.aiEvents?.econThreshold || 0.45)) {
            const addedFood = randInt(
                CFG.aiEvents?.foodGainMin || 20000,
                CFG.aiEvents?.foodGainMax || 100000
            );
            gameState.cities[targetCity].value += randInt(
                CFG.aiEvents?.valueGainMin || 2000,
                CFG.aiEvents?.valueGainMax || 8000
            );
            logMsg = `在【${targetCity}】修筑水利，全境麦浪滚滚，粮食丰登。`;
            logType = "econ";
            change.food = addedFood;
            change.cash = randInt(
                CFG.aiEvents?.cashGainMin || 5000,
                CFG.aiEvents?.cashGainMax || 20000
            );
        } else if (randEvent < (CFG.aiEvents?.recruitThreshold || 0.75)) {
            const recruitCount = randInt(
                CFG.aiEvents?.recruitCountMin || 5,
                CFG.aiEvents?.recruitCountMax || 15
            );
            logMsg = `在【${targetCity}】开设校场募集乡勇，获得 10 名长枪步兵入伍。`;
            if (targetUnit === pLord) {
                change.army_spear = recruitCount;
            }
            change.people = randInt(
                CFG.aiEvents?.peopleGainMin || 20,
                CFG.aiEvents?.peopleGainMax || 200
            );
        } else {
            logMsg = `派遣偏师在【${targetCity}】郊野深山行军，意外掘出了一箱上古珍宝。`;
            logType = "econ";
            change.means = randInt(
                CFG.aiEvents?.meansGainMin || 1,
                CFG.aiEvents?.meansGainMax || 3
            );
            change.cash = randInt(
                CFG.aiEvents?.meansCashMin || 2000,
                CFG.aiEvents?.meansCashMax || 8000
            );
        }
    }

    // 刘表被动【割据避战】繁荣自然增长率：每回合所有城市略微增加繁荣，刘表势力增加
    Object.keys(gameState.cities).forEach(cName => {
        const cData = gameState.cities[cName];
        if (cData.union !== "无主") {
            let valGrowth = randInt(
                CFG.city?.growth?.min || 150,
                CFG.city?.growth?.max || 400
            );
            if (cData.union === "刘表") {
                valGrowth = Math.floor(valGrowth * (CFG.passives?.liuBiao?.growthBonus || 1.5));
            }
            cData.value = Math.min(CFG.city?.maxValue || 100000, cData.value + valGrowth);
        }
    });

    // 董卓被动【穷兵黩武】每隔一定回合城市由于暴虐损耗繁荣度
    const dongInterval = CFG.passives?.dongZhuo?.decayInterval || 5;
    const dongRate = CFG.passives?.dongZhuo?.decayRate || 0.97;
    if (gameState.tacticRounds > 0 && gameState.tacticRounds % dongInterval === 0) {
        Object.keys(gameState.cities).forEach(cName => {
            const cData = gameState.cities[cName];
            if (cData.union === "董卓") {
                cData.value = Math.max(CFG.city?.minValue || 2000, Math.floor(cData.value * dongRate));
            }
        });
    }

    gameState.stats.people += (change.people || 0);
    gameState.stats.avator += (change.avator || 0);
    gameState.stats.army_shield += (change.army_shield || 0);
    gameState.stats.army_cavalry += (change.army_cavalry || 0);
    gameState.stats.army_spear += (change.army_spear || 0);
    gameState.stats.cash += (change.cash || 0);
    gameState.stats.food += (change.food || 0);
    gameState.stats.means += (change.means || 0);

    const currentConns = cityConnections[gameState.cityNow]?.connect || ["新野"];
    gameState.cityNow = randChoice(currentConns);

    addLog(targetUnit, logMsg, logType);
    renderStats(change);
    renderMap();
    
    // 累加回合计数器、自动抽卡、自动存档
    gameState.tacticRounds++;
    if (gameState.tacticRounds >= (CFG.autoSave?.interval || 15)) {
        gameState.tacticRounds = 0;
        drawRandomCard();
        // 自动静默存档 (每15回合触发一次，无日志干扰)
        try {
            const autoState = {
                running: false, script: gameState.script, speed: gameState.speed,
                stats: { ...gameState.stats }, cities: JSON.parse(JSON.stringify(gameState.cities)),
                cityNow: gameState.cityNow, selectedCity: gameState.selectedCity,
                currentWar: null, cards: [...gameState.cards], activeCardIndex: null,
                tacticRounds: 0, lordSkillCD: gameState.lordSkillCD, history: [...gameState.history]
            };
            localStorage.setItem("autotk_autosave", JSON.stringify(autoState));
            // 更新自动存档状态指示
            const statusEl = document.getElementById("autosave-status");
            if (statusEl) {
                const t = new Date();
                statusEl.textContent = `自动存档: ${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}:${t.getSeconds().toString().padStart(2,'0')}`;
                statusEl.style.color = "rgba(46, 204, 113, 0.7)";
            }
        } catch(e) {}
    }
    
    if (gameState.selectedCity) {
        updateSelectedCityUI();
    }
    updateTacticsUI(); // 同步主公技卡牌按钮冷却文字
    
    checkVictory();
}

// 检查是否天下一统
function checkVictory() {
    const citiesList = Object.keys(cityConnections);
    const firstOwner = gameState.cities[citiesList[0]].union;
    
    if (firstOwner === "无主") return;

    const isAllSame = citiesList.every(c => gameState.cities[c].union === firstOwner);
    if (isAllSame) {
        addLog("天下大势", `【${firstOwner}】占领了所有疆土，天下一统！`, "victory");
        SFX.unify();
        window.parent.postMessage({
            type: "unlock_achievement",
            achievement: "天下一统"
        }, "*");
        toggleTimer(false);
    }
}

// 控制循环定时器
function toggleTimer(forceState = null) {
    const playBtn = document.getElementById("pause");
    if (!playBtn) return;

    if (forceState !== null) {
        gameState.running = !forceState;
    }

    if (gameState.running) {
        gameState.running = false;
        clearInterval(gameState.timer);
        gameState.timer = null;
        playBtn.innerHTML = `<i class="fa fa-play running"> 开始回合</i>`;
    } else {
        gameState.running = true;
        gameState.timer = setInterval(nextStep, gameState.speed);
        playBtn.innerHTML = `<i class="fa fa-random stop"> 他势力进行中</i>`;
    }
}

// 更改推演速度
function changeSpeed(speedMs, btnEl) {
    gameState.speed = speedMs;
    
    const btns = document.querySelectorAll(".speed-btn-mini");
    btns.forEach(b => b.classList.remove("active"));
    btnEl.classList.add("active");

    if (gameState.running) {
        clearInterval(gameState.timer);
        gameState.timer = setInterval(nextStep, gameState.speed);
    }
}

// [第一阶段] 存档与读档功能
function saveGame() {
    const serializedState = {
        running: false, // 载入时默认先暂停，安全为主
        script: gameState.script,
        speed: gameState.speed,
        stats: { ...gameState.stats },
        cities: JSON.parse(JSON.stringify(gameState.cities)),
        cityNow: gameState.cityNow,
        selectedCity: gameState.selectedCity,
        currentWar: gameState.currentWar,
        cards: [ ...gameState.cards ],
        activeCardIndex: null,
        tacticRounds: gameState.tacticRounds,
        lordSkillCD: gameState.lordSkillCD,
        actionsLeft: gameState.actionsLeft,
        playerLord: gameState.playerLord,
        history: [ ...gameState.history ]
    };
    try {
        localStorage.setItem("autotk_save", JSON.stringify(serializedState));
        SFX.save();
        addLog("系统存档", "当前军政大势与国库储备已成功封存入档！", "victory");
    } catch (e) {
        addLog("存档失败", "本地存储空间不足，未能成功保存进度！", "system");
    }
}

function loadGame() {
    try {
        const saved = localStorage.getItem("autotk_save");
        if (!saved) {
            addLog("载入失败", "未找到任何已保存的军政档案！", "system");
            return;
        }
        const loadedState = JSON.parse(saved);
        
        // 停止当前推演定时器
        if (gameState.running) {
            toggleTimer(false);
        }

        // 恢复状态
        gameState.running = false;
        gameState.script = loadedState.script;
        gameState.speed = loadedState.speed;
        gameState.stats = loadedState.stats;
        gameState.cities = loadedState.cities;
        gameState.cityNow = loadedState.cityNow;
        gameState.selectedCity = loadedState.selectedCity;
        gameState.currentWar = loadedState.currentWar;
        gameState.cards = loadedState.cards;
        gameState.activeCardIndex = null;
        gameState.tacticRounds = loadedState.tacticRounds;
        gameState.lordSkillCD = loadedState.lordSkillCD !== undefined ? loadedState.lordSkillCD : 0;
        gameState.actionsLeft = loadedState.actionsLeft !== undefined ? loadedState.actionsLeft : 0;
        gameState.playerLord = loadedState.playerLord !== undefined ? loadedState.playerLord : "刘备";
        gameState.history = loadedState.history || [];


        // 更新 UI 展示
        updateTopLordAvatar();
        updateSelectedCityUI();
        updateTacticsUI();
        updateBarracksUI();
        renderStats();
        
        // 同步剧本按钮高亮
        const scriptBtns = document.querySelectorAll(".mini-script-btn");
        scriptBtns.forEach(btn => {
            if (btn.textContent.trim() === gameState.script) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        // 重新渲染大地图
        renderMap();
        
        addLog("载入成功", `已读取【${gameState.script}】剧本的历时档案，推演已暂停，等待调遣！`, "victory");
    } catch (e) {
        addLog("载入失败", "档案文件格式损坏，未能恢复进度！", "system");
    }
}

// 地图沙盘拖拽平移与滚轮缩放控制
function initMapZoomAndPan() {
    const wrapper = document.querySelector(".map-stage-wrapper");
    const stage = document.getElementById("content");
    if (!wrapper || !stage) return;

    let zoom = 1.0;
    const minZoom = CFG.mapZoom?.min || 0.5;
    const maxZoom = CFG.mapZoom?.max || 2.5;
    const zoomStep = CFG.mapZoom?.step || 0.08;
    
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let translateX = 0;
    let translateY = 0;
    
    // 设置变换中心为左上角
    stage.style.transformOrigin = "0 0";

    // 监听滚轮缩放
    wrapper.addEventListener("wheel", (e) => {
        e.preventDefault();
        
        const rect = wrapper.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const prevZoom = zoom;
        if (e.deltaY < 0) {
            zoom = Math.min(maxZoom, zoom + zoomStep);
        } else {
            zoom = Math.max(minZoom, zoom - zoomStep);
        }
        
        // 缩放修正公式
        translateX = mouseX - (mouseX - translateX) * (zoom / prevZoom);
        translateY = mouseY - (mouseY - translateY) * (zoom / prevZoom);
        
        updateTransform();
    }, { passive: false });

    // 监听鼠标拖拽
    wrapper.addEventListener("mousedown", (e) => {
        // 仅在点击空白沙盘或SVG线层时允许拖动，避免影响城市的点击选择
        if (e.target.id === "content" || e.target.tagName.toLowerCase() === "svg") {
            isDragging = true;
            hasDragged = false;
            wrapper.style.cursor = "grabbing";
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
        }
    });

    window.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        
        const currentX = e.clientX - startX;
        const currentY = e.clientY - startY;
        
        if (Math.abs(currentX - translateX) > 4 || Math.abs(currentY - translateY) > 4) {
            hasDragged = true;
        }
        
        translateX = currentX;
        translateY = currentY;
        updateTransform();
    });

    window.addEventListener("mouseup", () => {
        if (isDragging) {
            isDragging = false;
            wrapper.style.cursor = "default";
        }
    });

    function updateTransform() {
        stage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${zoom})`;
    }
}

// 页面加载就绪
window.onload = function() {
    // 绑定存档读档按钮
    const btnSave = document.getElementById("btn_save_game");
    const btnLoad = document.getElementById("btn_load_game");
    if (btnSave) {
        btnSave.onclick = function(e) {
            e.preventDefault();
            saveGame();
        };
    }
    if (btnLoad) {
        btnLoad.onclick = function(e) {
            e.preventDefault();
            loadGame();
        };
    }
    
    // 初始化沙盘拖拽与缩放
    initMapZoomAndPan();
    
    initGame("三分天下");

    // 地图空白区点击，重置选中关隘，隐藏气泡
    document.getElementById("content").onclick = function(e) {
        if (hasDragged) {
            hasDragged = false;
            return;
        }
        if (e.target.id === "content" || e.target.tagName.toLowerCase() === "svg") {
            gameState.selectedCity = null;
            renderMap();
            updateSelectedCityUI();
        }
    };

    document.getElementById("pause").onclick = function(e) {
        e.preventDefault();
        toggleTimer();
    };

    const settingsBtn = document.getElementById("settingsBtn");
    const settingsModal = document.getElementById("settingsModal");
    const closeSettings = document.getElementById("closeSettings");

    settingsBtn.onclick = function(e) {
        e.preventDefault();
        settingsModal.classList.add("active");
    };

    closeSettings.onclick = function(e) {
        e.preventDefault();
        settingsModal.classList.remove("active");
    };

    settingsModal.onclick = function(e) {
        if (e.target === settingsModal) {
            settingsModal.classList.remove("active");
        }
    };

    const cheatActions = [
        { id: "cheat_war0", action: () => setAllCity("汉献帝") },
        { id: "cheat_war1", action: () => { initGame("三分天下"); settingsModal.classList.remove("active"); } },
        { id: "cheat_war2", action: () => setAllCity("司马炎") },
        { id: "cheat_war3", action: () => setAllCity("曹操") },
        { id: "cheat_war4", action: () => setAllCity("刘备") },
        { id: "cheat_war5", action: () => setAllCity("孙权") },
        { id: "cheat_war6", action: () => { initGame("群雄并起"); settingsModal.classList.remove("active"); } }
    ];

    cheatActions.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) {
            el.onclick = function(e) {
                e.preventDefault();
                item.action();
            };
        }
    });



    const speedButtons = [
        { id: "speed_1x", ms: CFG.speeds?.normal || 1000 },
        { id: "speed_2x", ms: CFG.speeds?.fast || 400 },
        { id: "speed_5x", ms: CFG.speeds?.ultra || 150 }
    ];
    speedButtons.forEach(sb => {
        const el = document.getElementById(sb.id);
        if (el) {
            el.onclick = function() {
                changeSpeed(sb.ms, el);
            };
        }
    });

    document.getElementById("exit").onclick = function(e) {
        e.preventDefault();
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.log(err));
        }
        window.parent.postMessage({ type: "exit_cabinet" }, "*");
    };

    // 提取并提取渲染主公选择网格的独立函数（与当前天下剧本存在的主公关联）
    window.renderLordSelectGrid = function() {
        const lordGrid = document.getElementById("lordSelectGrid");
        if (!lordGrid) return;

        const activeUnits = scriptUnits[gameState.script] || {};
        const aliveLords = Object.keys(activeUnits);

        // 如果当前玩家主公不在这个剧本的存活名单里，自动纠偏为剧本里的第一个主公
        if (aliveLords.length > 0 && !aliveLords.includes(gameState.playerLord)) {
            gameState.playerLord = aliveLords[0];
            const nameTextEl = document.getElementById("roleNameText");
            if (nameTextEl) {
                nameTextEl.textContent = `主公：${gameState.playerLord}`;
            }
        }

        let gridHTML = "";
        aliveLords.forEach(lord => {
            const isSelected = gameState.playerLord === lord;
            const logo = rolesConfig[lord]?.logo || lord[0];
            const colorClass = rolesConfig[lord]?.color || "blank";
            gridHTML += `
                <button class="cheat-btn bg-lord-select ${isSelected ? 'active' : ''}" data-lord="${lord}" style="border: 1.5px solid ${isSelected ? '#66fcf1' : 'rgba(255,255,255,0.1)'}; padding: 6px; font-size: 0.7rem; border-radius: 4px; color: #fff; cursor: pointer; background: rgba(255,255,255,0.03); transition: all 0.2s;">
                    <div class="avatar-frame size-large ${getLordBorderClass(lord)}">
                        <img src="${getLordAvatar(lord)}" class="avatar-img" />
                    </div>
                    <div style="display: flex; align-items: center; justify-content: center;">
                        <span class="city-faction-badge ${colorClass}" style="position: static; display: inline-flex; width: 15px; height: 15px; font-size: 0.58rem; margin-right: 4px;">${logo}</span>
                        <span>${lord}</span>
                    </div>
                </button>
            `;
        });
        lordGrid.innerHTML = gridHTML;

        // 重新绑定点击切换主公事件
        lordGrid.querySelectorAll("button").forEach(btn => {
            btn.onclick = function(e) {
                e.preventDefault();
                const newLord = btn.getAttribute("data-lord");
                gameState.playerLord = newLord;
                
                // 袁绍被动开局奖励
                if (newLord === "袁绍") {
                    gameState.stats.cash += 200000;
                    gameState.stats.means += 5;
                    addLog("袁绍", "【名门号令】袁氏四世三公，开局获得额外 20万 资金与 5 个珍宝！", "victory");
                }

                // 重建主公按钮激活样式
                lordGrid.querySelectorAll("button").forEach(b => {
                    const isSel = b.getAttribute("data-lord") === newLord;
                    b.style.borderColor = isSel ? '#66fcf1' : 'rgba(255,255,255,0.1)';
                });

                // 同步刷新 StatusBar
                const nameTextEl = document.getElementById("roleNameText");
                if (nameTextEl) {
                    nameTextEl.textContent = `主公：${newLord}`;
                }

                // 重新初始化该剧本
                initGame(gameState.script);
                settingsModal.classList.remove("active");
            };
        });
    };

    // 绑定大厅侧的迷你剧本按钮
    const scriptBtns = document.querySelectorAll(".mini-script-btn");
    scriptBtns.forEach(btn => {
        btn.onclick = function(e) {
            e.preventDefault();
            const scriptName = btn.textContent.trim();
            gameState.script = scriptName;
            
            // 重新绘制主公选择网格并纠偏主公
            renderLordSelectGrid();
            
            initGame(scriptName);
        };
    });

    // 初始化主公选择网格
    renderLordSelectGrid();

    // 初始化时同步StatusBar名称
    const nameTextEl = document.getElementById("roleNameText");
    if (nameTextEl) {
        nameTextEl.textContent = `主公：${gameState.playerLord}`;
    }

    window.addEventListener("resize", drawConnections);
};

// ==========================================
// 🧭 军师计策锦囊核心逻辑与数据配置
// ==========================================
const TACTICS_CONFIG = {
    "kongcheng": {
        name: "🛡️ 空城计",
        desc: "指定我方一城获得 5 回合【免战】状态，敌军无法进犯。",
        costText: "💰 30万",
        type: "self",
        costCheck: () => {
            const factor = (gameState.script === "官渡之战") ? 1.2 : 1.0; // 模拟袁绍的名门限制(如果是袁绍剧本或玩家是袁绍)
            return gameState.stats.cash >= (300000 * factor);
        },
        costPay: () => {
            const factor = (gameState.script === "官渡之战") ? 1.2 : 1.0;
            gameState.stats.cash -= Math.floor(300000 * factor);
        }
    },
    "huoshao": {
        name: "🔥 火烧连营",
        desc: "指定敌方一城，瞬间削减其 50% 繁荣度，并平息战火。",
        costText: "💰 50万 + 🌾 10万",
        type: "enemy",
        costCheck: () => {
            const factor = (gameState.script === "官渡之战") ? 1.2 : 1.0;
            return gameState.stats.cash >= (500000 * factor) && gameState.stats.food >= (100000 * factor);
        },
        costPay: () => {
            const factor = (gameState.script === "官渡之战") ? 1.2 : 1.0;
            gameState.stats.cash -= Math.floor(500000 * factor);
            gameState.stats.food -= Math.floor(100000 * factor);
        }
    },
    "dongfeng": {
        name: "🌾 借东风",
        desc: "指定我方一城，祈风求雨以战养战，后勤暴增 60万 粮食。",
        costText: "💎 5个珍宝",
        type: "self",
        costCheck: () => {
            const factor = (gameState.script === "官渡之战") ? 1.2 : 1.0;
            return gameState.stats.means >= Math.ceil(5 * factor);
        },
        costPay: () => {
            const factor = (gameState.script === "官渡之战") ? 1.2 : 1.0;
            gameState.stats.means -= Math.ceil(5 * factor);
        }
    },
    "lianhuan": {
        name: "🔗 连环计",
        desc: "对敌方接壤城施放，3 回合内我方强攻该城成功率升至 100%。",
        costText: "💎 8个珍宝",
        type: "enemy_reachable",
        costCheck: () => {
            const factor = (gameState.script === "官渡之战") ? 1.2 : 1.0;
            return gameState.stats.means >= Math.ceil(8 * factor);
        },
        costPay: () => {
            const factor = (gameState.script === "官渡之战") ? 1.2 : 1.0;
            gameState.stats.means -= Math.ceil(8 * factor);
        }
    }
};

// ==========================================
// 👑 主公策略技能触发控制引擎
// ==========================================

// 获取玩家当前所属剧本中的势力主公姓名
function getPlayerLordName() {
    return gameState.playerLord || "刘备";
}

// 签发或筹备主动技能 (刘备, 汉献帝, 吕布)
function prepLordActiveSkill(skillName) {
    const config = LORD_STRATEGY_CONFIG[getPlayerLordName()];
    if (!config) return;

    if (gameState.lordSkillCD > 0) {
        addLog("系统", `主公技【${config.name}】还在冷却中，需等待 ${gameState.lordSkillCD} 回合！`, "system");
        return;
    }

    if (!config.costCheck()) {
        addLog("系统", `施展主公技【${config.name}】所需的资源不足！`, "system");
        return;
    }

    if (gameState.activeLordSkillName === skillName) {
        // 取消签发
        gameState.activeLordSkillName = null;
        addLog("系统", `收回了主公技【${config.name}】的密令。`, "system");
    } else {
        gameState.activeLordSkillName = skillName;
        addLog("系统", `签发主公技【${config.name}】密诏！请在沙盘上点击选择生效的目标城池。`, "system");
    }
    renderMap();
    updateSelectedCityUI();
}

// 执行城池指向性主动技能 (在城市 click 事件中触发)
function triggerLordSkill(cityName) {
    if (!gameState.activeLordSkillName) return false;

    const lordName = getPlayerLordName();
    const config = LORD_STRATEGY_CONFIG[lordName];
    if (!config) return false;

    const cData = gameState.cities[cityName];
    if (!cData) return false;

    const myLord = getPlayerLordName();
    const isMine = cData.union === myLord;

    // 目标检查
    if (config.type === "active_city" && !isMine) {
        addLog("系统", `【${config.name}】只能施放于我方城市！`, "system");
        return false;
    }
    if (config.type === "active_city_enemy_reachable") {
        if (isMine) {
            addLog("系统", `【${config.name}】必须对敌方或无主城市施放！`, "system");
            return false;
        }
        const myCities = getOwnedCities(myLord);
        const neighbours = getNeighbours(myCities);
        if (!neighbours.includes(cityName)) {
            addLog("系统", `【${config.name}】必须施放在与我方接壤的敌军关隘上！`, "system");
            return false;
        }
    }

    // 扣费并执行
    config.costPay();
    const success = config.action(cityName);
    if (success) {
        gameState.lordSkillCD = config.cd; // 进入冷却
        gameState.activeLordSkillName = null; // 复位
        renderStats();
        renderMap();
        updateSelectedCityUI();
        updateTacticsUI();
        return true;
    }
    return false;
}

// 释放孙权的【权衡调度】卡牌重洗技 (直接释放)
function triggerLordCardSkill() {
    const lordName = getPlayerLordName();
    // 强制模拟：
    const config = LORD_STRATEGY_CONFIG["孙权"];
    if (gameState.lordSkillCD > 0) {
        addLog("系统", `主公技【${config.name}】还在冷却中，需 ${gameState.lordSkillCD} 回合！`, "system");
        return;
    }
    const success = config.action();
    if (success) {
        gameState.lordSkillCD = config.cd;
        renderStats();
        updateTacticsUI();
    }
}

// 定时抽取随机锦囊卡牌
function drawRandomCard() {
    if (gameState.cards.length >= (CFG.autoSave?.maxCards || 3)) {
        addLog("锦囊堆叠", `军师牌库已满 (最多${CFG.autoSave?.maxCards || 3}张)，无法凝聚更多的妙计！`, "system");
        return;
    }
    const pool = Object.keys(TACTICS_CONFIG);
    const cardId = randChoice(pool);
    gameState.cards.push(cardId);
    SFX.card();
    addLog("妙计入库", `军师夜观星象，成功推演并凝聚了锦囊妙计：【${TACTICS_CONFIG[cardId].name}】！`, "victory");
    updateTacticsUI();
}

// 选中锦囊卡牌
function selectCard(index) {
    const cardId = gameState.cards[index];
    if (!cardId) return;

    const config = TACTICS_CONFIG[cardId];
    if (!config.costCheck()) {
        addLog("筹备失败", `释放【${config.name}】所需要的钱粮珍宝不足！`, "system");
        return;
    }

    if (gameState.activeCardIndex === index) {
        // 取消选择
        gameState.activeCardIndex = null;
        addLog("取消计策", `军师收回了【${config.name}】的将令。`, "system");
    } else {
        gameState.activeCardIndex = index;
        addLog("计策筹备", `已签发【${config.name}】将令！请直接在堪舆图上点击目标城池释放！`, "system");
    }
    
    updateTacticsUI();
    renderMap();
}

// 作用锦囊计策到指定城市
function applyTactic(cityName) {
    if (gameState.activeCardIndex === null) return false;

    const cardIndex = gameState.activeCardIndex;
    const cardId = gameState.cards[cardIndex];
    if (!cardId) return false;

    const config = TACTICS_CONFIG[cardId];
    const cData = gameState.cities[cityName];
    const myLord = getPlayerLordName();
    const isMine = cData.union === myLord;

    // 目标合法性验证
    if (config.type === "self" && !isMine) {
        addLog("施法失败", `【${config.name}】必须对我方城市施放！`, "system");
        return false;
    }
    if (config.type === "enemy" && isMine) {
        addLog("施法失败", `【${config.name}】必须对敌方或无主城市施放！`, "system");
        return false;
    }
    if (config.type === "enemy_reachable") {
        if (isMine) {
            addLog("施法失败", `【${config.name}】必须对敌方或无主城市施放！`, "system");
            return false;
        }
        const myCities = getOwnedCities(myLord);
        const neighbours = getNeighbours(myCities);
        if (!neighbours.includes(cityName)) {
            addLog("施法失败", `【${config.name}】必须施放在与我方接壤 of 敌军关口！`, "system");
            return false;
        }
    }

    // 扣除资源并触发音效
    config.costPay();
    SFX.tactic();

    // 触发效果
    if (cardId === "kongcheng") {
        cData.avoidWarTurns = CFG.tactics?.kongcheng?.avoidWarTurns || 6;
        addLog("空城高悬", `【计策】在【${cityName}】城头大设空城计！获得 ${(CFG.tactics?.kongcheng?.avoidWarTurns || 6) - 1} 回合免战保护，敌军不可犯！`, "victory");
    } else if (cardId === "huoshao") {
        const loss = Math.floor(cData.value * (CFG.tactics?.huoshao?.damageRate || 0.5));
        cData.value = Math.max(CFG.tactics?.huoshao?.minValueAfter || 2000, cData.value - loss);
        cData.isWar = false;
        if (gameState.currentWar && (gameState.currentWar.from === cityName || gameState.currentWar.to === cityName)) {
            gameState.currentWar = null; // 扑灭战火连线
        }
        addLog("火烧连营", `【计策】顺风纵火突袭【${cityName}】，重创守军，其城市繁荣度惨遭腰斩！`, "war");
    } else if (cardId === "dongfeng") {
        gameState.stats.food += (CFG.tactics?.dongfeng?.foodGain || 600000);
        addLog("借得东风", `【计策】在【${cityName}】借东风天降甘霖，后勤获得 ${(CFG.tactics?.dongfeng?.foodGain || 600000) / 10000}万 石粮草补给！`, "econ");
    } else if (cardId === "lianhuan") {
        cData.lianhuanTurns = CFG.tactics?.lianhuan?.lianhuanTurns || 4;
        addLog("连锁战船", `【计策】对【${cityName}】巧授连环计，敌方阵营铁锁连环，我军对其强攻成功率提升至 100%！`, "victory");
    }

    // 消耗手牌并复位
    gameState.cards.splice(cardIndex, 1);
    gameState.activeCardIndex = null;

    renderStats();
    renderMap();
    updateTacticsUI();
    updateSelectedCityUI();
    return true;
}

// 刷新军师锦囊列表面板
function updateTacticsUI() {
    const list = document.getElementById("tacticsList");
    const count = document.getElementById("cardCount");
    if (!list || !count) return;

    count.textContent = `(${gameState.cards.length}/3)`;

    // 无论当前手牌是否为空，如果当前玩家可以施放孙权调度（例如剧本或机制需要展现），在最左侧追加一个“权衡调度”的卡片按钮
    // 权衡调度卡牌 HTML 构建：
    const isCooling = gameState.lordSkillCD > 0;
    let cardSkillHTML = "";
    
    // 如果当前玩家主公是孙权，在最左侧追加一个“权衡调度”的卡片按钮
    const sunQuanConfig = LORD_STRATEGY_CONFIG["孙权"];
    if (sunQuanConfig && getPlayerLordName() === "孙权") {
        let skillClass = "tactic-card lord-card-skill";
        if (isCooling) skillClass += " cooling";
        
        let displayTitle = "权衡调度";
        let displayDesc = sunQuanConfig.desc;
        let displayStatus = isCooling ? `冷却中 (${gameState.lordSkillCD}回合)` : "就绪 (可洗牌)";

        cardSkillHTML = `
            <div class="${skillClass}" onclick="triggerLordCardSkill()">
                <div class="tactic-name" style="color: #66fcf1; font-weight: bold;">💙 ${displayTitle}</div>
                <div class="tactic-desc" style="font-size: 0.58rem; color: #aaa;">${displayDesc}</div>
                <div class="tactic-cost" style="color: #00ffcc; font-weight: bold; border-top: 1px dashed rgba(102,252,241,0.2); padding-top: 2px; margin-top: 2px;">
                    状态：${displayStatus}
                </div>
            </div>
        `;
    }

    if (gameState.cards.length === 0) {
        list.innerHTML = cardSkillHTML + `<div class="no-cards-tip" style="font-size:0.65rem; color:#666; text-align:center; padding:10px 0; flex: 1;">等待凝聚锦囊妙计...</div>`;
        return;
    }

    let html = cardSkillHTML;
    gameState.cards.forEach((cardId, index) => {
        const config = TACTICS_CONFIG[cardId];
        const canPay = config.costCheck();
        const isSelected = gameState.activeCardIndex === index;

        let cardClass = `tactic-card card-${cardId}`;
        if (!canPay) cardClass += " disabled";
        if (isSelected) cardClass += " selected";

        html += `
            <div class="${cardClass}" onclick="selectCard(${index})">
                <div class="tactic-name">${config.name}</div>
                <div class="tactic-desc">${config.desc}</div>
                <div class="tactic-cost">消耗：${config.costText}</div>
            </div>
        `;
    });
    list.innerHTML = html;
}

// 判断某城市是否是势力的初始都城 (首府)
function isCapitalCity(cityName, union) {
    if (!union || union === "无主") return false;
    const activeUnits = scriptUnits[gameState.script];
    if (activeUnits && activeUnits[union]) {
        return activeUnits[union].home[0] === cityName;
    }
    return false;
}

// 构造城市上方徽章栏的 HTML
function getCityStatusBadgesHTML(cityData, isCapital) {
    let badges = "";
    if (isCapital) {
        badges += `<span class="status-badge-mini b-capital" title="势力首府都城">👑 都城</span>`;
    }
    if (cityData.avoidWarTurns > 0) {
        badges += `<span class="status-badge-mini b-avoid" title="免战保护中 (还剩 ${cityData.avoidWarTurns}回合)">🛡️ 免战(${cityData.avoidWarTurns})</span>`;
    }
    if (cityData.lianhuanTurns > 0) {
        badges += `<span class="status-badge-mini b-chaos" title="防御瘫痪 (还剩 ${cityData.lianhuanTurns}回合)">🔗 混乱(${cityData.lianhuanTurns})</span>`;
    }
    if (cityData.value >= 70000) {
        badges += `<span class="status-badge-mini b-rich" title="富庶繁荣度很高">🌾 富庶</span>`;
    } else if (cityData.value < 6000) {
        badges += `<span class="status-badge-mini b-poor" title="残破废墟经济凋敝">🏚️ 残破</span>`;
    }
    return badges;
}

// 构造城市状态提示详情文字列表
function getCityStatusTextList(cityData, isCapital) {
    const states = [];
    if (isCapital) states.push("👑 势力都城");
    if (cityData.avoidWarTurns > 0) states.push(`🛡️ 免战保护(${cityData.avoidWarTurns}回合)`);
    if (cityData.lianhuanTurns > 0) states.push(`🔗 防线瘫痪(${cityData.lianhuanTurns}回合)`);
    if (cityData.value >= 70000) {
        states.push("🌾 富庶繁华");
    } else if (cityData.value < 6000) {
        states.push("🏚️ 满目疮痍");
    } else {
        states.push("🕯️ 饱暖安宁");
    }
    return states;
}
