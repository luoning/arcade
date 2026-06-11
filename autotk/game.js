// 三国演兵录 (Idle Run) 核心逻辑

// 1. 城市连接数据
const cityConnections = {
    "武威":{"connect":["金城"]},
    "金城":{"connect":["武威","天水"]},
    "安定":{"connect":["天水","长安"]},
    "晋阳":{"connect":["中山","上党"]},
    "中山":{"connect":["蓟","南皮","晋阳"]},
    "蓟":{"connect":["北平","中山"]},
    "襄平":{"connect":["北平","乐浪"]}, 
    "乐浪":{"connect":["襄平"]},
    "天水":{"connect":["金城","安定","武都"]},
    "长安":{"connect":["弘农","安定","武都","汉中"]},
    "弘农":{"connect":["长安","汉中","洛阳","宛"]},
    "洛阳":{"connect":["弘农"]},
    "上党":{"connect":["晋阳","邺"]},
    "邺":{"connect":["平原","南皮","上党"]},
    "南皮":{"connect":["蓟","平原"]},    
    "北平":{"connect":["襄平","蓟","南皮"]},
    "武都":{"connect":["天水","长安"]},
    "汉中":{"connect":["长安","梓潼"]},
    "上庸":{"connect":["新野"]},
    "许昌":{"connect":["宛"]},
    "陈留":{"connect":["濮阳"]},
    "濮阳":{"connect":["洛阳","陈留","小沛","北海"]},
    "平原":{"connect":["南皮","邺"]},
    "北海":{"connect":["平原","濮阳","小沛"]},
    "成都":{"connect":["梓潼","江州","建宁","永昌"]},
    "梓潼":{"connect":["汉中","成都"]},
    "宛":{"connect":["新野","弘农","许昌"]}, 
    "汝南":{"connect":["许昌","寿春","江夏","新野"]},
    "寿春":{"connect":["庐江","下邳","汝南"]},
    "小沛":{"connect":["濮阳","北海","下邳"]},
    "下邳":{"connect":["小沛","广陵","寿春"]},
    "广陵":{"connect":["下邳"]},
    "江州":{"connect":["成都","永安"]},
    "永安":{"connect":["江州"]},   
    "新野":{"connect":["宛","上庸","襄阳","汝南"]},
    "江陵":{"connect":["长沙"]},  
    "江夏":{"connect":["庐江","江陵","汝南"]},
    "庐江":{"connect":["建业","江夏","寿春"]},
    "建业":{"connect":["庐江","吴","会稽"]},
    "吴":{"connect":["会稽","建业"]},
    "永昌":{"connect":["成都"]}, 
    "建宁":{"connect":["交趾","永昌","成都"]},
    "襄阳":{"connect":["新野"]}, 
    "武陵":{"connect":["长沙"]},
    "零陵":{"connect":["长沙"]},
    "长沙":{"connect":["武陵","零陵","桂阳","江陵"]},
    "桂阳":{"connect":["豫章","南海","长沙","零陵"]},
    "会稽":{"connect":["建安","吴"]},
    "交趾":{"connect":["合浦","建宁"]},
    "合浦":{"connect":["南海","朱崖洲","交趾"]},
    "朱崖洲":{"connect":["合浦"]},
    "南海":{"connect":["桂阳","合浦"]},
    "豫章":{"connect":["建安","桂阳"]},        
    "建安":{"connect":["夷洲","会稽","豫章"]},        
    "夷洲":{"connect":["建安"]}
};

// 2D 坐标配置（基于三国历史地图的相对百分比 X, Y 坐标）
const cityCoords = {
    // 关中 / 西北
    "武威": { x: 5, y: 12 },
    "金城": { x: 7, y: 22 },
    "天水": { x: 13, y: 32 },
    "安定": { x: 20, y: 20 },
    "武都": { x: 13, y: 45 },
    "长安": { x: 30, y: 32 },
    "弘农": { x: 37, y: 32 },

    // 河北 / 中原 / 北疆
    "洛阳": { x: 44, y: 32 },
    "晋阳": { x: 41, y: 14 },
    "上党": { x: 45, y: 22 },
    "中山": { x: 51, y: 8 },
    "邺": { x: 51, y: 19 },
    "南皮": { x: 61, y: 12 },
    "蓟": { x: 62, y: 4 },
    "北平": { x: 74, y: 4 },
    "襄平": { x: 86, y: 4 },
    "乐浪": { x: 94, y: 6 },
    "平原": { x: 59, y: 20 },
    "濮阳": { x: 58, y: 28 },
    "北海": { x: 67, y: 24 },
    "陈留": { x: 51, y: 36 },
    "许昌": { x: 48, y: 44 },
    "宛": { x: 41, y: 49 },
    "汝南": { x: 52, y: 52 },

    // 徐州 / 淮南 / 江东
    "下邳": { x: 65, y: 36 },
    "广陵": { x: 71, y: 40 },
    "寿春": { x: 60, y: 46 },
    "庐江": { x: 62, y: 56 },
    "建业": { x: 74, y: 56 },
    "吴": { x: 84, y: 62 },
    "会稽": { x: 89, y: 70 },
    "建安": { x: 81, y: 82 },
    "夷洲": { x: 94, y: 88 },

    // 荆襄 / 华中 / 华南
    "新野": { x: 44, y: 59 },
    "上庸": { x: 34, y: 52 },
    "襄阳": { x: 44, y: 68 },
    "江陵": { x: 47, y: 77 },
    "江夏": { x: 57, y: 70 },
    "豫章": { x: 67, y: 78 },
    "长沙": { x: 51, y: 86 },
    "武陵": { x: 41, y: 84 },
    "零陵": { x: 43, y: 92 },
    "桂阳": { x: 51, y: 94 },
    "南海": { x: 60, y: 96 },

    // 巴蜀 / 大西南
    "汉中": { x: 27, y: 46 },
    "梓潼": { x: 20, y: 57 },
    "成都": { x: 13, y: 67 },
    "江州": { x: 25, y: 72 },
    "永安": { x: 34, y: 72 },
    "永昌": { x: 4, y: 78 },
    "建宁": { x: 11, y: 86 },
    "交趾": { x: 9, y: 95 },
    "合浦": { x: 21, y: 96 },
    "朱崖洲": { x: 21, y: 99 }
};

// 3. 势力配置数据
const rolesConfig = {
    "无主": { flag: "circle-o", color: "blank", winByGod: ["混沌", "从零开始吧."] },
    "刘备": { flag: "bookmark", color: "gird1", winByGod: ["刘备", "终于，大汉的江山还是姓刘."] },
    "曹操": { flag: "bookmark", color: "gird2", winByGod: ["曹操", "奉孝，你还记得么？"] },
    "孙权": { flag: "bookmark", color: "gird3", winByGod: ["孙权", "呵呵，我不比哥爹差."] },
    "董卓": { flag: "bookmark", color: "gird4", winByGod: ["董卓", "看吧，你们都给我敞开了吃！"] },
    "汉献帝": { flag: "bookmark", color: "gird5", winByGod: ["汉献帝", "高祖，让那些乱尘贼子们，都消失吧"] },
    "司马炎": { flag: "bookmark", color: "gird6", winByGod: ["司马炎", "三分天下？我才是真命天子！"] },
    "吕布": { flag: "bookmark", color: "gird7", winByGod: ["吕布", "君不见辕门射戟乎！"] }
};

const scriptUnits = {
    "三分天下": {
        "刘备": { home: ["新野", "成都", "永安", "汉中", "梓潼"] },
        "曹操": { home: ["许昌", "洛阳", "陈留", "汝南", "寿春", "濮阳"] },
        "孙权": { home: ["吴", "建安", "桂阳", "会稽", "建业"] }
    },
    "群雄并起": {
        "刘备": { home: ["新野"] },
        "曹操": { home: ["许昌"] },
        "孙权": { home: ["吴"] },
        "董卓": { home: ["洛阳"] },
        "吕布": { home: ["下邳"] }
    }
};

// 4. 运行状态
let gameState = {
    running: false,
    timer: null,
    script: "三分天下",
    stats: {
        people: 1000000,
        avator: 576,
        army: 730,
        cash: 4875231,
        food: 74112453,
        means: 254
    },
    cities: {},
    cityNow: "新野",
    history: []
};

// 工具函数
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// 模拟 Python updown HTML
function getUpDownHTML(n) {
    if (n < 0) return `<span class="updown warning">-${Math.abs(n)}</span>`;
    if (n > 0) return `<span class="updown running">+${Math.abs(n)}</span>`;
    return '<span class="updown"></span>';
}

// 初始化游戏
function initGame(scriptName) {
    gameState.script = scriptName;
    gameState.history = [];
    
    // 初始化城市归属
    const citiesList = Object.keys(cityConnections);
    gameState.cities = {};
    citiesList.forEach(c => {
        gameState.cities[c] = { value: 10000, union: "无主", isWar: false };
    });

    const activeUnits = scriptUnits[scriptName] || scriptUnits["三分天下"];
    Object.keys(activeUnits).forEach(unitName => {
        activeUnits[unitName].home.forEach(hCity => {
            if (gameState.cities[hCity]) {
                gameState.cities[hCity] = { value: 50000, union: unitName, isWar: false };
            }
        });
    });

    gameState.cityNow = activeUnits["刘备"] ? activeUnits["刘备"].home[0] : "新野";
    
    const msgContainer = document.getElementById("message");
    if (msgContainer) msgContainer.innerHTML = "";
    
    addLog("system", `${scriptName}时代，天下割据，狼烟四起。`, "system");
    renderMap();
    renderStats({ people: 0, avator: 0, army: 0, cash: 0, food: 0, means: 0 });
}

// 一键强制统一
function setAllCity(unitName) {
    const citiesList = Object.keys(cityConnections);
    citiesList.forEach(c => {
        gameState.cities[c].union = unitName;
        gameState.cities[c].value = 100000;
        gameState.cities[c].isWar = false;
    });
    
    const winMsg = rolesConfig[unitName] ? rolesConfig[unitName].winByGod[1] : "天命所归，天下大吉！";
    addLog("victory", `${unitName}：${winMsg}`, "victory");
    renderMap();
    checkVictory();
}

// 动态绘制 SVG 连线
function drawConnections() {
    const svg = document.getElementById("map-links-svg");
    if (!svg) return;

    svg.innerHTML = "";
    const drawn = new Set();

    Object.keys(cityConnections).forEach(startCity => {
        const startCoord = cityCoords[startCity];
        if (!startCoord) return;

        const conns = cityConnections[startCity].connect;
        conns.forEach(endCity => {
            const endCoord = cityCoords[endCity];
            if (!endCoord) return;

            // 避免重复画线 (A-B 和 B-A 只画一次)
            const lineKey = [startCity, endCity].sort().join("-");
            if (drawn.has(lineKey)) return;
            drawn.add(lineKey);

            // 检查线条属性 (如是否涉及战火)
            const isWarLine = gameState.cities[startCity]?.isWar || gameState.cities[endCity]?.isWar;
            
            // 构造 SVG line 标签
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", `${startCoord.x}%`);
            line.setAttribute("y1", `${startCoord.y}%`);
            line.setAttribute("x2", `${endCoord.x}%`);
            line.setAttribute("y2", `${endCoord.y}%`);
            
            if (isWarLine) {
                line.setAttribute("class", "war-line");
            } else {
                line.setAttribute("class", "normal-line");
            }
            svg.appendChild(line);
        });
    });
}

// 绝对定位 2D 渲染地图关卡与连线
function renderMap() {
    const container = document.getElementById("content");
    if (!container) return;
    
    // 清理除 SVG 画布层以外的所有旧城市节点
    const oldNodes = container.querySelectorAll(".city-wrapper");
    oldNodes.forEach(node => node.remove());

    const citiesList = Object.keys(cityConnections);

    citiesList.forEach(cityName => {
        const cityData = gameState.cities[cityName] || { value: 0, union: "无主", isWar: false };
        const role = rolesConfig[cityData.union] || rolesConfig["无主"];
        const coord = cityCoords[cityName] || { x: 50, y: 50 };
        
        const cityEl = document.createElement("div");
        cityEl.id = cityName;
        cityEl.className = "city-wrapper";
        
        // 核心：绝对定位
        cityEl.style.left = `${coord.x}%`;
        cityEl.style.top = `${coord.y}%`;

        let cardClasses = `map_gird ${role.color}`;
        if (cityName === gameState.cityNow) {
            cardClasses += " focused";
        }
        if (cityData.isWar) {
            cardClasses += " war-active";
        }

        const contentHTML = `
            <span class="${cardClasses}">
                <div class="map_item tip ${role.color}">
                    <span class="city-name-label">${cityName}</span>
                    <span class="map_index">${cityData.union[0]}</span>
                    <span class="prompt-box">
                        <strong>${cityName}</strong> - 归属: ${cityData.union}
                        <div class="main73">
                            <div id="${cityName}_content" style="width:100%; padding:5px 0;">
                                繁荣度: ${cityData.value} <br/>
                                连通: ${cityConnections[cityName].connect.join(", ")}
                            </div>
                        </div>
                    </span>
                </div>
            </span>
        `;
        cityEl.innerHTML = contentHTML;
        container.appendChild(cityEl);
    });

    // 渲染动态连线
    drawConnections();
}

// 触发数值变动背景微光闪烁
function flashStatCard(statId, isIncrease) {
    const card = document.getElementById(statId).parentElement;
    if (!card) return;
    const flashClass = isIncrease ? "flash-green" : "flash-red";
    card.classList.add(flashClass);
    setTimeout(() => {
        card.classList.remove(flashClass);
    }, 450);
}

// 渲染玩家数值看板
function renderStats(change = { people: 0, avator: 0, army: 0, cash: 0, food: 0, means: 0 }) {
    const fields = ["people", "avator", "army", "cash", "food", "means"];
    fields.forEach(field => {
        const val = change[field];
        if (val !== 0) {
            flashStatCard(field, val > 0);
        }
    });

    document.getElementById("people").innerHTML = `${gameState.stats.people} ${getUpDownHTML(change.people)}`;
    document.getElementById("avator").innerHTML = `${gameState.stats.avator} ${getUpDownHTML(change.avator)}`;
    document.getElementById("army").innerHTML = `${gameState.stats.army} ${getUpDownHTML(change.army)}`;
    document.getElementById("cash").innerHTML = `${gameState.stats.cash} ${getUpDownHTML(change.cash)}`;
    document.getElementById("food").innerHTML = `${gameState.stats.food} ${getUpDownHTML(change.food)}`;
    document.getElementById("means").innerHTML = `${gameState.stats.means} ${getUpDownHTML(change.means)}`;
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
    Object.keys(gameState.cities).forEach(c => {
        gameState.cities[c].isWar = false;
    });

    const activeUnits = scriptUnits[gameState.script];
    const unitList = Object.keys(activeUnits);
    const targetUnit = randChoice(unitList);

    const owned = getOwnedCities(targetUnit);
    
    if (owned.length === 0) {
        nextStep();
        return;
    }

    const neighbours = getNeighbours(owned);
    const isAggressive = Math.random() < 0.65 && neighbours.length > 0;

    let targetCity = "";
    let change = { people: 0, avator: 0, army: 0, cash: 0, food: 0, means: 0 };
    let logMsg = "";
    let logType = "normal";

    if (isAggressive) {
        targetCity = randChoice(neighbours);
        gameState.cities[targetCity].isWar = true;

        const isSuccess = Math.random() < 0.55;
        if (isSuccess) {
            const oldOwner = gameState.cities[targetCity].union;
            gameState.cities[targetCity].union = targetUnit;
            gameState.cities[targetCity].value = Math.max(5000, Math.floor(gameState.cities[targetCity].value * 0.7));
            
            logMsg = `挥师强攻【${targetCity}】，击溃了【${oldOwner}】的守军，成功夺取城池！`;
            logType = "war";
        } else {
            logMsg = `企图强攻【${targetCity}】，但在强力城防下丢盔弃甲，无功而返。`;
            logType = "normal";
        }

        change = {
            people: randInt(-300, 100),
            avator: randInt(-2, 1),
            army: randInt(-20, 5),
            cash: randInt(-8000, 2000),
            food: randInt(-50000, 10000),
            means: Math.random() < 0.1 ? 1 : 0
        };
    } else {
        targetCity = randChoice(owned);
        const randEvent = Math.random();

        if (randEvent < 0.45) {
            const addedFood = randInt(20000, 100000);
            gameState.cities[targetCity].value += randInt(2000, 8000);
            logMsg = `在【${targetCity}】修筑水利，全境麦浪滚滚，粮食丰登。`;
            logType = "econ";
            change.food = addedFood;
            change.cash = randInt(5000, 20000);
        } else if (randEvent < 0.75) {
            const addedArmy = randInt(10, 35);
            logMsg = `在【${targetCity}】开设校场，发布布告，招募到了大批乡勇加入。`;
            change.army = addedArmy;
            change.people = randInt(50, 500);
        } else {
            logMsg = `派遣偏师在【${targetCity}】郊野深山行军，意外掘出了一箱上古珍宝。`;
            logType = "econ";
            change.means = randInt(1, 3);
            change.cash = randInt(2000, 8000);
        }
    }

    gameState.stats.people += change.people;
    gameState.stats.avator += change.avator;
    gameState.stats.army += change.army;
    gameState.stats.cash += change.cash;
    gameState.stats.food += change.food;
    gameState.stats.means += change.means;

    const currentConns = cityConnections[gameState.cityNow]?.connect || ["新野"];
    gameState.cityNow = randChoice(currentConns);

    addLog(targetUnit, logMsg, logType);
    renderStats(change);
    renderMap();
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
        window.parent.postMessage({
            type: "unlock_achievement",
            achievement: "天下一统"
        }, "*");
        toggleTimer(false);
    }
}

// 玩家军机阁微操
function playerOrder(orderType) {
    if (!gameState.running) {
        addLog("阁臣上奏", "只有在回合推进中（时间流动），才能进行军机决策！", "system");
        return;
    }

    const myCities = getOwnedCities("刘备");
    if (myCities.length === 0) {
        addLog("阁臣上奏", "主公已经丢失全部城池，无力回天！", "system");
        return;
    }

    if (orderType === "attack") {
        if (gameState.stats.army < 500 || gameState.stats.cash < 1000000) {
            addLog("驱策失败", "军费不足（需 100万 资金）或兵力不足（需 500 部队）！", "system");
            return;
        }

        const enemyTargets = getNeighbours(myCities);
        if (enemyTargets.length === 0) {
            addLog("驱策失败", "没有相邻可攻打的敌对或无主领土！", "system");
            return;
        }

        gameState.stats.army -= 500;
        gameState.stats.cash -= 1000000;
        
        const target = randChoice(enemyTargets);
        gameState.cities[target].isWar = true;

        const success = Math.random() < 0.8;
        if (success) {
            const old = gameState.cities[target].union;
            gameState.cities[target].union = "刘备";
            gameState.cities[target].value = Math.floor(gameState.cities[target].value * 0.9);
            addLog("刘备亲征", `【驱策指令】主公御驾亲征突袭【${target}】，大破【${old}】偏师，成功收复失地！`, "victory");
        } else {
            addLog("刘备亲征", `【驱策指令】主公出兵强攻【${target}】受挫，敌方防备极深，只得鸣金收兵。`, "war");
        }
        
        renderStats({ people: 0, avator: 0, army: -500, cash: -1000000, food: 0, means: 0 });
        renderMap();

    } else if (orderType === "plot") {
        if (gameState.stats.means < 5) {
            addLog("破坏失败", "缺少珍贵名器（需 5 个珍宝以上以收买内应）！", "system");
            return;
        }

        const enemyCities = Object.keys(gameState.cities).filter(c => gameState.cities[c].union !== "刘备" && gameState.cities[c].union !== "无主");
        if (enemyCities.length === 0) {
            addLog("破坏失败", "天下已无其余割据势力！", "system");
            return;
        }

        gameState.stats.means -= 5;
        const target = randChoice(enemyCities);
        const valLoss = Math.floor(gameState.cities[target].value * 0.5);
        gameState.cities[target].value = Math.max(1000, gameState.cities[target].value - valLoss);

        addLog("破坏阴谋", `【破坏指令】暗中向【${target}】派遣刺客与细作，火烧粮仓并散播流言，其繁荣度瞬间腰斩！`, "war");
        renderStats({ people: 0, avator: 0, army: 0, cash: 0, food: 0, means: -5 });
        renderMap();

    } else if (orderType === "reward") {
        if (gameState.stats.cash < 500000) {
            addLog("求贤失败", "黄金不足以招募人才（需 50万 资金）！", "system");
            return;
        }

        gameState.stats.cash -= 500000;
        const gainedAvators = randInt(3, 5);
        gameState.stats.avator += gainedAvators;

        addLog("广纳贤才", `【求贤指令】主公大开国库，礼贤下士，重金招纳了【${gainedAvators}】位民间隐士及大将加盟！`, "victory");
        renderStats({ people: 0, avator: gainedAvators, army: 0, cash: -500000, food: 0, means: 0 });
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
        playBtn.innerHTML = `<i class="fa fa-play running"> 回合开始</i>`;
    } else {
        gameState.running = true;
        gameState.timer = setInterval(nextStep, 1000);
        playBtn.innerHTML = `<i class="fa fa-random stop"> 他势力进行中</i>`;
    }
}

// 页面加载就绪
window.onload = function() {
    initGame("三分天下");

    document.getElementById("pause").onclick = function(e) {
        e.preventDefault();
        toggleTimer();
    };

    const cmdList = document.querySelectorAll(".cmd-btn.active-cmd");
    cmdList.forEach(btn => {
        btn.onclick = function() {
            const actionType = btn.getAttribute("data-action");
            playerOrder(actionType);
        };
    });

    const scriptLinks = [
        { id: "war0", name: "都是逆贼", action: () => setAllCity("汉献帝") },
        { id: "war1", name: "三国时代", action: () => initGame("三分天下") },
        { id: "war2", name: "三分归晋", action: () => setAllCity("司马炎") },
        { id: "war3", name: "曹操一统", action: () => setAllCity("曹操") },
        { id: "war4", name: "刘备一统", action: () => setAllCity("刘备") },
        { id: "war5", name: "孙权一统", action: () => setAllCity("孙权") },
        { id: "war6", name: "群雄并起", action: () => initGame("群雄并起") }
    ];

    scriptLinks.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) {
            el.onclick = function(e) {
                e.preventDefault();
                item.action();
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

    // 窗口尺寸变化时重新画线，防止错位
    window.addEventListener("resize", drawConnections);
};
