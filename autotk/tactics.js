// 🧭 军师计策锦囊核心逻辑与数据配置
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
