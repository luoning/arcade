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

// 2D 坐标配置
const cityCoords = {
    "武威": { x: 5, y: 12 }, "金城": { x: 7, y: 22 }, "天水": { x: 13, y: 32 }, "安定": { x: 20, y: 20 }, "武都": { x: 13, y: 45 }, "长安": { x: 30, y: 32 }, "弘农": { x: 37, y: 32 },
    "洛阳": { x: 44, y: 32 }, "晋阳": { x: 41, y: 14 }, "上党": { x: 45, y: 22 }, "中山": { x: 51, y: 8 }, "邺": { x: 51, y: 19 }, "南皮": { x: 61, y: 12 }, "蓟": { x: 62, y: 4 },
    "北平": { x: 74, y: 4 }, "襄平": { x: 86, y: 4 }, "乐浪": { x: 94, y: 6 }, "平原": { x: 59, y: 20 }, "濮阳": { x: 58, y: 28 }, "北海": { x: 67, y: 24 }, "陈留": { x: 51, y: 36 },
    "许昌": { x: 48, y: 44 }, "宛": { x: 41, y: 49 }, "汝南": { x: 52, y: 52 }, "下邳": { x: 65, y: 36 }, "广陵": { x: 71, y: 40 }, "寿春": { x: 60, y: 46 }, "庐江": { x: 62, y: 56 },
    "建业": { x: 74, y: 56 }, "吴": { x: 84, y: 62 }, "会稽": { x: 89, y: 70 }, "建安": { x: 81, y: 82 }, "夷洲": { x: 94, y: 88 }, "新野": { x: 44, y: 59 }, "上庸": { x: 34, y: 52 },
    "襄阳": { x: 44, y: 68 }, "江陵": { x: 47, y: 77 }, "江夏": { x: 57, y: 70 }, "豫章": { x: 67, y: 78 }, "长沙": { x: 51, y: 86 }, "武陵": { x: 41, y: 84 }, "零陵": { x: 43, y: 92 },
    "桂阳": { x: 51, y: 94 }, "南海": { x: 60, y: 96 }, "汉中": { x: 27, y: 46 }, "梓潼": { x: 20, y: 57 }, "成都": { x: 13, y: 67 }, "江州": { x: 25, y: 72 }, "永安": { x: 34, y: 72 },
    "永昌": { x: 4, y: 78 }, "建宁": { x: 11, y: 86 }, "交趾": { x: 9, y: 95 }, "合浦": { x: 21, y: 96 }, "朱崖洲": { x: 21, y: 99 }
};

// 3. 势力配置
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
    speed: 1000, // 默认推演周期毫秒
    stats: {
        people: 1000000,
        avator: 576,
        army_shield: 300, // 虎贲军
        army_cavalry: 150, // 南蛮象兵
        army_spear: 280,   // 长枪兵
        cash: 4875231,
        food: 74112453,
        means: 254
    },
    cities: {},
    cityNow: "新野",
    selectedCity: null, // 当前鼠标点选中的城市
    history: []
};

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
    
    // 清空选中信息显示
    updateSelectedCityUI();
    
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
    renderStats({ people: 0, avator: 0, army_shield: 0, army_cavalry: 0, army_spear: 0, cash: 0, food: 0, means: 0 });
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
    
    // 关闭设置弹窗
    const modal = document.getElementById("settingsModal");
    if (modal) modal.classList.remove("active");
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

            const lineKey = [startCity, endCity].sort().join("-");
            if (drawn.has(lineKey)) return;
            drawn.add(lineKey);

            const isWarLine = gameState.cities[startCity]?.isWar || gameState.cities[endCity]?.isWar;
            
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

// 绝对定位 2D 渲染地图关卡
function renderMap() {
    const container = document.getElementById("content");
    if (!container) return;
    
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
        
        cityEl.style.left = `${coord.x}%`;
        cityEl.style.top = `${coord.y}%`;

        let cardClasses = `map_gird ${role.color}`;
        if (cityName === gameState.cityNow) {
            cardClasses += " focused";
        }
        if (cityData.isWar) {
            cardClasses += " war-active";
        }
        if (cityName === gameState.selectedCity) {
            cardClasses += " selected"; // 点选高亮
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
        
        // 绑定点击选中事件
        cityEl.onclick = function(e) {
            e.stopPropagation();
            gameState.selectedCity = cityName;
            renderMap(); // 重新画出高亮圈
            updateSelectedCityUI();
        };

        container.appendChild(cityEl);
    });

    drawConnections();
}

// 刷新右侧选定城市交互 UI
function updateSelectedCityUI() {
    const box = document.getElementById("selectedCityBox");
    if (!box) return;

    if (!gameState.selectedCity) {
        box.innerHTML = `
            <div style="text-align: center; color: #888; padding: 20px 0;">
                <i class="fa fa-hand-pointer-o" style="font-size: 1.5rem; margin-bottom: 8px;"></i>
                <br/>请在堪舆图中点选任一城市关隘进行布防指挥
            </div>
        `;
        return;
    }

    const cName = gameState.selectedCity;
    const cData = gameState.cities[cName];
    const isMine = cData.union === "刘备";
    
    // 计算是否可达 (接壤)
    const myCities = getOwnedCities("刘备");
    const neighbours = getNeighbours(myCities);
    const isReachable = neighbours.includes(cName);

    let actionsHTML = "";
    if (isMine) {
        actionsHTML = `
            <div class="city-action-grid">
                <button class="action-trigger-btn cbtn-recruit" onclick="cityAction('recruit_shield')">募虎贲军 (-15万金)</button>
                <button class="action-trigger-btn cbtn-recruit" onclick="cityAction('recruit_spear')">募长枪兵 (-8万金)</button>
                <button class="action-trigger-btn cbtn-recruit" onclick="cityAction('recruit_cavalry')">募象骑兵 (-25万金)</button>
                <button class="action-trigger-btn cbtn-econ" onclick="cityAction('farm')">屯田修水利 (-5万金)</button>
            </div>
        `;
    } else {
        actionsHTML = `
            <div class="city-action-grid">
                <button class="action-trigger-btn cbtn-war ${isReachable ? '' : 'disabled'}" ${isReachable ? '' : 'disabled'} onclick="cityAction('attack')">亲征强攻 (需兵将与金)</button>
                <button class="action-trigger-btn cbtn-plot" onclick="cityAction('plot')">流言破坏 (-5珍宝)</button>
            </div>
            ${!isReachable ? '<p style="font-size:0.7rem; color:#ff4e50; margin-top:6px; text-align:center;">提示：非接壤关隘，无法出兵强攻</p>' : ''}
        `;
    }

    box.innerHTML = `
        <div class="city-info-card">
            <div class="city-info-header">
                <span class="c-name">${cName}</span>
                <span class="c-union badge-${cData.union === '无主' ? 'gray' : 'color'}">${cData.union}</span>
            </div>
            <div class="city-info-body">
                <div>繁荣度：<strong>${cData.value}</strong></div>
                <div style="font-size: 0.75rem; color: #888; margin-top: 4px;">地缘邻接：${cityConnections[cName].connect.join(", ")}</div>
            </div>
            <div class="city-info-actions">
                ${actionsHTML}
            </div>
        </div>
    `;
}

// 城市操作指令响应
function cityAction(type) {
    const cName = gameState.selectedCity;
    if (!cName) return;

    const cData = gameState.cities[cName];

    if (type === "recruit_shield") {
        if (gameState.stats.cash < 150000 || gameState.stats.food < 50000) {
            addLog("募兵失败", "国库资金（需15万）或粮草（需5万）不足！", "system");
            return;
        }
        gameState.stats.cash -= 150000;
        gameState.stats.food -= 50000;
        gameState.stats.army_shield += 100;
        cData.value += 3000;
        addLog("增兵布守", `在【${cName}】征发钱粮，编练招募了 100 名重装【虎贲军】驻防！`, "econ");
        renderStats({ cash: -150000, food: -50000, army_shield: 100, people: 0, avator: 0, means: 0, army_cavalry: 0, army_spear: 0 });

    } else if (type === "recruit_spear") {
        if (gameState.stats.cash < 80000 || gameState.stats.food < 30000) {
            addLog("募兵失败", "国库资金（需8万）或粮草（需3万）不足！", "system");
            return;
        }
        gameState.stats.cash -= 80000;
        gameState.stats.food -= 30000;
        gameState.stats.army_spear += 100;
        cData.value += 1500;
        addLog("增兵布守", `在【${cName}】募民兵，编训了 100 名【精锐长枪兵】！`, "econ");
        renderStats({ cash: -80000, food: -3000, army_spear: 100, people: 0, avator: 0, means: 0, army_cavalry: 0, army_shield: 0 });

    } else if (type === "recruit_cavalry") {
        if (gameState.stats.cash < 250000 || gameState.stats.food < 120000) {
            addLog("募兵失败", "招募野象装甲兵费高，资金（需25万）或粮草（需12万）不足！", "system");
            return;
        }
        gameState.stats.cash -= 250000;
        gameState.stats.food -= 120000;
        gameState.stats.army_cavalry += 50;
        cData.value += 5000;
        addLog("巨兽营房", `在【${cName}】重金引进象群，训练了 50 名重装【南蛮象兵】！`, "victory");
        renderStats({ cash: -250000, food: -120000, army_cavalry: 50, people: 0, avator: 0, means: 0, army_shield: 0, army_spear: 0 });

    } else if (type === "farm") {
        if (gameState.stats.cash < 50000) {
            addLog("修水利失败", "资金不足（需5万金）！", "system");
            return;
        }
        gameState.stats.cash -= 50000;
        cData.value += 12000;
        gameState.stats.food += 300000;
        addLog("修生养息", `在【${cName}】大兴民夫屯田水利，使该城繁荣度显著飙升！`, "econ");
        renderStats({ cash: -50000, food: 300000, people: 0, avator: 0, means: 0, army_shield: 0, army_spear: 0, army_cavalry: 0 });

    } else if (type === "attack") {
        // 出征：象兵开路 (消耗兵马+资金)
        const myCities = getOwnedCities("刘备");
        const neighbours = getNeighbours(myCities);
        if (!neighbours.includes(cName)) {
            addLog("出征失败", "非接壤关隘，无法强袭！", "system");
            return;
        }

        if (gameState.stats.army_cavalry < 30 || gameState.stats.cash < 500000) {
            addLog("出征失败", "需要至少 30 名南蛮突击象兵作为攻坚，且战费需 50万金！", "system");
            return;
        }

        gameState.stats.army_cavalry -= 30; // 战损与动员
        gameState.stats.cash -= 500000;

        cData.isWar = true;
        // 象兵攻城，战力极强：75% 胜率
        const success = Math.random() < 0.75;
        if (success) {
            const old = cData.union;
            cData.union = "刘备";
            cData.value = Math.floor(cData.value * 0.95);
            addLog("亲征大捷", `【战报】刘皇叔率领精装象兵大举突破【${cName}】，瞬间踩平【${old}】防御，收复失地！`, "victory");
        } else {
            addLog("亲征受挫", `【战报】强攻【${cName}】遭遇激烈反抗，象兵被枪兵伏击折损，被迫收兵。`, "war");
        }
        renderStats({ army_cavalry: -30, cash: -500000, people: 0, avator: 0, means: 0, army_shield: 0, army_spear: 0, food: 0 });
        renderMap();
        updateSelectedCityUI();

    } else if (type === "plot") {
        if (gameState.stats.means < 5) {
            addLog("破坏失败", "缺少收买奸细的名器珍宝（需 5 个珍宝）！", "system");
            return;
        }

        gameState.stats.means -= 5;
        const loss = Math.floor(cData.value * 0.5);
        cData.value = Math.max(1000, cData.value - loss);

        addLog("刺客与破坏", `暗中派死士刺客混入【${cName}】密谋纵火并收买内奸，该城经济被重创！`, "war");
        renderStats({ means: -5, people: 0, avator: 0, army_shield: 0, army_cavalry: 0, army_spear: 0, cash: 0, food: 0 });
        renderMap();
        updateSelectedCityUI();
    }

    // 更新兵种营房列表
    updateBarracksUI();
}

// 刷新右侧兵种列表UI
function updateBarracksUI() {
    const list = document.getElementById("barracksList");
    if (!list) return;

    list.innerHTML = `
        <div class="info-item spec-barrack">
            <span>🛡️ 虎贲重步 (防守)</span> 
            <strong>${gameState.stats.army_shield} 名</strong>
        </div>
        <div class="info-item spec-barrack">
            <span>🐘 南蛮骑象 (攻坚)</span> 
            <strong>${gameState.stats.army_cavalry} 骑</strong>
        </div>
        <div class="info-item spec-barrack">
            <span>🔱 精锐枪兵 (反骑)</span> 
            <strong>${gameState.stats.army_spear} 杆</strong>
        </div>
        <div style="font-size:0.7rem; color:#888; margin-top:8px; line-height:1.3;">
            注：攻城战会优先调遣象兵开路，守城战时虎贲军有 30% 几率免疫城市易主。
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

    // 拼合总兵力
    const totalArmy = gameState.stats.army_shield + gameState.stats.army_cavalry + gameState.stats.army_spear;
    const totalChange = (change.army_shield || 0) + (change.army_cavalry || 0) + (change.army_spear || 0);

    document.getElementById("people").innerHTML = `${gameState.stats.people} ${getUpDownHTML(change.people)}`;
    document.getElementById("avator").innerHTML = `${gameState.stats.avator} ${getUpDownHTML(change.avator)}`;
    document.getElementById("army").innerHTML = `${totalArmy} ${getUpDownHTML(totalChange)}`;
    document.getElementById("cash").innerHTML = `${gameState.stats.cash} ${getUpDownHTML(change.cash)}`;
    document.getElementById("food").innerHTML = `${gameState.stats.food} ${getUpDownHTML(change.food)}`;
    document.getElementById("means").innerHTML = `${gameState.stats.means} ${getUpDownHTML(change.means)}`;

    // 同步刷新右侧军备
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

// 单次推演动作 (兵种克制与守城战判定)
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
    let change = { people: 0, avator: 0, army_shield: 0, army_cavalry: 0, army_spear: 0, cash: 0, food: 0, means: 0 };
    let logMsg = "";
    let logType = "normal";

    if (isAggressive) {
        targetCity = randChoice(neighbours);
        gameState.cities[targetCity].isWar = true;

        const defender = gameState.cities[targetCity].union;
        
        // 核心：若防守方是玩家刘备，且拥有【虎贲重步】防御力量，30%几率强力抵挡免予城市易主
        if (defender === "刘备" && gameState.stats.army_shield > 100 && Math.random() < 0.3) {
            logMsg = `派遣兵马大肆入侵我方【${targetCity}】，但遭到驻防的【虎贲重步兵】誓死抵抗，强行守住了要塞关隘！`;
            logType = "war";
            change.army_shield = -randInt(10, 30); // 守军消耗
        } else {
            // 常规争夺
            const isSuccess = Math.random() < 0.55;
            if (isSuccess) {
                gameState.cities[targetCity].union = targetUnit;
                gameState.cities[targetCity].value = Math.max(5000, Math.floor(gameState.cities[targetCity].value * 0.7));
                
                logMsg = `挥师强攻【${targetCity}】，击溃了【${defender}】的守备部队，成功将城池夺回！`;
                logType = "war";
                
                // 玩家被夺走领地时的连带损失
                if (defender === "刘备") {
                    change.people = -randInt(50, 200);
                    change.army_spear = -randInt(5, 15);
                }
            } else {
                logMsg = `妄图图谋攻占【${targetCity}】，结果遭遇强力城防防线，退回本部。`;
                logType = "normal";
            }
        }

        // 战火余波导致资金消耗
        change.cash = randInt(-6000, 1000);
        change.food = randInt(-20000, 2000);
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
            const recruitCount = randInt(5, 15);
            logMsg = `在【${targetCity}】开设校场募集乡勇，获得 10 名长枪步兵入伍。`;
            if (targetUnit === "刘备") {
                change.army_spear = recruitCount;
            }
            change.people = randInt(20, 200);
        } else {
            logMsg = `派遣偏师在【${targetCity}】郊野深山行军，意外掘出了一箱上古珍宝。`;
            logType = "econ";
            change.means = randInt(1, 3);
            change.cash = randInt(2000, 8000);
        }
    }

    // 状态更新并重绘
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
    
    // 如果点中的城市恰好发生归属变更，刷新直控框
    if (gameState.selectedCity) {
        updateSelectedCityUI();
    }
    
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
        gameState.timer = setInterval(nextStep, gameState.speed);
        playBtn.innerHTML = `<i class="fa fa-random stop"> 他势力进行中</i>`;
    }
}

// 更改推演速度
function changeSpeed(speedMs, btnEl) {
    gameState.speed = speedMs;
    
    // 更改激活按钮高亮
    const btns = document.querySelectorAll(".speed-btn");
    btns.forEach(b => b.classList.remove("active"));
    btnEl.classList.add("active");

    if (gameState.running) {
        // 重置定时器以应用新速度
        clearInterval(gameState.timer);
        gameState.timer = setInterval(nextStep, gameState.speed);
    }
}

// 页面加载就绪
window.onload = function() {
    initGame("三分天下");

    document.getElementById("pause").onclick = function(e) {
        e.preventDefault();
        toggleTimer();
    };

    // 绑定设置 Modal 弹窗
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

    // 绑定作弊指令（位于设置 Modal 内）
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

    // 绑定设置内的推演速度调节按钮
    const speedButtons = [
        { id: "speed_1x", ms: 1000 },
        { id: "speed_2x", ms: 400 },
        { id: "speed_5x", ms: 150 }
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

    window.addEventListener("resize", drawConnections);
};
