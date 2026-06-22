// 三国演兵录 核心状态管理与 Lord 配置
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
};

// 势力徽章、样式颜色与天命一统文案配置
const rolesConfig = {
    "刘备": { logo: "蜀", color: "gird3", winByGod: ["xiandi", "大德昭烈，季汉复兴！汉室社稷重归正统，天下大吉！"] },
    "曹操": { logo: "魏", color: "gird4", winByGod: ["caocao", "魏武雄图，霸业功成！九州重归一统，天下大吉！"] },
    "孙权": { logo: "吴", color: "gird5", winByGod: ["sunquan", "神皇偏安，终定乾坤！江东霸业一统江山，天下大吉！"] },
    "董卓": { logo: "董", color: "gird1", winByGod: ["war3", "穷兵黩武，横征暴敛！魔王降世终吞四海，天下大吉！"] },
    "吕布": { logo: "吕", color: "gird6", winByGod: ["war4", "战神威震，飞将席卷！无双神武扫平乱世，天下大吉！"] },
    "袁绍": { logo: "袁", color: "gird7", winByGod: ["war5", "名门号令，望族威仪！四世三公终定中原，天下大吉！"] },
    "汉献帝": { logo: "汉", color: "gird2", winByGod: ["xiandi", "汉帝还都，天下大同！皇权神授大统复归，天下大吉！"] },
    "司马炎": { logo: "晋", color: "gird2", winByGod: ["sima", "三分归一，大晋受禅！天下重归司马，天下大吉！"] },
    "无主": { logo: "野", color: "blank", winByGod: ["xiandi", "天下重归荒芜，野蛮生长！"] }
};
window.rolesConfig = rolesConfig;


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

// 获取玩家当前所属剧本中的势力主公姓名
function getPlayerLordName() {
    return gameState.playerLord || "刘备";
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
