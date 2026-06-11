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
    "北平": { x: 74, y: 4 }, "襄平": { x: 84, y: 4 }, "乐浪": { x: 92, y: 6 }, "平原": { x: 60, y: 22 }, "濮阳": { x: 60, y: 28 }, "北海": { x: 70, y: 23 }, "陈留": { x: 53, y: 32 },
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
let gameState = {
    running: false,
    timer: null,
    script: "三分天下",
    speed: 1000, 
    stats: {
        people: 1000000,
        avator: 576,
        army_shield: 300, 
        army_cavalry: 150, 
        army_spear: 280,   
        cash: 4875231,
        food: 74112453,
        means: 254
    },
    cities: {},
    cityNow: "新野",
    selectedCity: null, 
    currentWar: null, 
    cards: [], 
    activeCardIndex: null, 
    tacticRounds: 0,
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
    gameState.currentWar = null;
    gameState.cards = [];
    gameState.activeCardIndex = null;
    gameState.tacticRounds = 0;
    
    updateSelectedCityUI();
    updateTacticsUI();
    
    const citiesList = Object.keys(cityConnections);
    gameState.cities = {};
    citiesList.forEach(c => {
        gameState.cities[c] = { 
            value: 10000, 
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
                    value: 50000, 
                    union: unitName, 
                    isWar: false,
                    avoidWarTurns: 0,
                    lianhuanTurns: 0
                };
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
                line.setAttribute("x1", `${fromCoord.x}%`);
                line.setAttribute("y1", `${fromCoord.y}%`);
                line.setAttribute("x2", `${toCoord.x}%`);
                line.setAttribute("y2", `${toCoord.y}%`);
                if (line.getAttribute("class") !== "war-line") {
                    line.setAttribute("class", "war-line");
                }
            } else {
                line.setAttribute("x1", `${startCoord.x}%`);
                line.setAttribute("y1", `${startCoord.y}%`);
                line.setAttribute("x2", `${endCoord.x}%`);
                line.setAttribute("y2", `${endCoord.y}%`);
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
            cityEl.className = "city-wrapper";
            cityEl.style.left = `${coord.x}%`;
            cityEl.style.top = `${coord.y}%`;
            
            cityEl.onclick = function(e) {
                e.stopPropagation();
                
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

        let cardClasses = `map_gird ${role.color}`;
        if (cityName === gameState.cityNow) {
            cardClasses += " focused";
        }
        if (cityData.isWar) {
            cardClasses += " war-active";
        }
        if (cityName === gameState.selectedCity) {
            cardClasses += " selected"; 
        }

        if (!isNew) {
            const gridEl = cityEl.querySelector(".map_gird");
            if (gridEl) {
                gridEl.className = cardClasses;
            }
            const itemEl = cityEl.querySelector(".map_item");
            if (itemEl) {
                itemEl.className = `map_item tip ${role.color}`;
            }
            const badgesEl = document.getElementById(`${cityName}_badges`);
            if (badgesEl) {
                badgesEl.innerHTML = badgesHTML;
            }
            const indexEl = cityEl.querySelector(".map_index");
            if (indexEl) {
                indexEl.textContent = role.logo || cityData.union[0];
            }
            const ownerEl = document.getElementById(`${cityName}_owner`);
            if (ownerEl) {
                ownerEl.textContent = cityData.union;
            }
            const contentEl = document.getElementById(`${cityName}_content`);
            if (contentEl) {
                contentEl.innerHTML = `
                    状态: <span style="color:#66fcf1;">${statusTexts.join(" / ")}</span><br/>
                    繁荣度: ${cityData.value} <br/>
                    连通: ${cityConnections[cityName].connect.join(", ")}
                `;
            }
        } else {
            const contentHTML = `
                <div class="city-status-badges" id="${cityName}_badges">${badgesHTML}</div>
                <span class="${cardClasses}">
                    <div class="map_item tip ${role.color}">
                        <span class="city-name-label">${cityName}</span>
                        <span class="map_index">${role.logo || cityData.union[0]}</span>
                        <span class="prompt-box">
                            <strong>${cityName}</strong> - 归属: <span id="${cityName}_owner">${cityData.union}</span>
                            <div class="main73">
                                <div id="${cityName}_content" style="width:100%; padding:5px 0;">
                                    状态: <span style="color:#66fcf1;">${statusTexts.join(" / ")}</span><br/>
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
        }
    });

    drawConnections();
}

// 刷新【就地悬浮命令菜单】UI
function updateSelectedCityUI() {
    const bubble = document.getElementById("floatingContext");
    if (!bubble) return;

    if (!gameState.selectedCity) {
        bubble.style.display = "none";
        return;
    }

    const cName = gameState.selectedCity;
    const cData = gameState.cities[cName];
    const coord = cityCoords[cName];
    if (!coord) return;

    const isMine = cData.union === "刘备";
    const myCities = getOwnedCities("刘备");
    const neighbours = getNeighbours(myCities);
    const isReachable = neighbours.includes(cName);

    // 智能计算气泡位置，防止超出沙盘边缘 (避让极端边界城市)
    let finalLeft = coord.x + 4.5;
    let finalTop = coord.y;

    if (coord.x > 75) {
        finalLeft = coord.x - 18.5; // 靠右侧的城市，气泡显示在左边
    }
    if (coord.y > 65) {
        finalTop = coord.y - 18; // 靠下侧的城市 (交趾、朱崖洲等)，气泡往上提
    } else if (coord.y < 15) {
        finalTop = coord.y + 2; // 靠上侧的城市，气泡往下压
    }

    bubble.style.left = `${finalLeft}%`;
    bubble.style.top = `${finalTop}%`;
    bubble.style.display = "block";

    let actionsHTML = "";
    if (isMine) {
        actionsHTML = `
            <div class="bubble-actions">
                <button class="b-action-btn cbtn-recruit" onclick="cityAction('recruit_shield')">🛡️ 虎贲军 (-15万)</button>
                <button class="b-action-btn cbtn-recruit" onclick="cityAction('recruit_spear')">🔱 长枪兵 (-8万)</button>
                <button class="b-action-btn cbtn-recruit" onclick="cityAction('recruit_cavalry')">🐘 象骑兵 (-25万)</button>
                <button class="b-action-btn cbtn-econ" onclick="cityAction('farm')">🌾 屯田灌溉 (-5万)</button>
            </div>
        `;
    } else {
        actionsHTML = `
            <div class="bubble-actions">
                <button class="b-action-btn cbtn-war ${isReachable ? '' : 'disabled'}" ${isReachable ? '' : 'disabled'} onclick="cityAction('attack')">⚔️ 亲征强攻</button>
                <button class="b-action-btn cbtn-plot" onclick="cityAction('plot')">🔥 流言破坏 (-5珍宝)</button>
            </div>
            ${!isReachable ? '<div style="font-size:0.65rem; color:#ff4e50; margin-top:5px; text-align:center;">提示：需接壤才可亲征</div>' : ''}
        `;
    }

    const isCapital = isCapitalCity(cName, cData.union);
    const badgesHTML = getCityStatusBadgesHTML(cData, isCapital);

    bubble.innerHTML = `
        <div class="bubble-city-name">${cName}</div>
        <div class="bubble-city-info">
            <span>归属：${cData.union}</span>
            <span>繁荣：${cData.value}</span>
        </div>
        <div class="bubble-city-states">
            ${badgesHTML}
        </div>
        ${actionsHTML}
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
        renderStats({ cash: -150000, food: -50000, army_shield: 100 });

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
        renderStats({ cash: -80000, food: -30000, army_spear: 100 });

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
        renderStats({ cash: -250000, food: -120000, army_cavalry: 50 });

    } else if (type === "farm") {
        if (gameState.stats.cash < 50000) {
            addLog("修水利失败", "资金不足（需5万金）！", "system");
            return;
        }
        gameState.stats.cash -= 50000;
        cData.value += 12000;
        gameState.stats.food += 300000;
        addLog("修生养息", `在【${cName}】大兴民夫屯田水利，使该城繁荣度显著飙升！`, "econ");
        renderStats({ cash: -50000, food: 300000 });

    } else if (type === "attack") {
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

        gameState.stats.army_cavalry -= 30; 
        gameState.stats.cash -= 500000;

        cData.isWar = true;
        // 计算发起我方强攻的接壤城池以进行连线
        const myAttackers = myCities.filter(c => cityConnections[c]?.connect.includes(cName));
        const attackerCity = randChoice(myAttackers) || myCities[0];
        gameState.currentWar = { from: attackerCity, to: cName };
        const hasLianhuan = cData.lianhuanTurns > 0;
        const success = hasLianhuan || Math.random() < 0.75;
        if (success) {
            const old = cData.union;
            cData.union = "刘备";
            cData.value = Math.floor(cData.value * 0.95);
            if (hasLianhuan) {
                cData.lianhuanTurns = 0; // 解除连环计
                addLog("亲征大捷", `【战报】乘【${cName}】受连环计防线混乱之际，皇叔挥师踏平防线，不费吹灰之力强攻收复！`, "victory");
            } else {
                addLog("亲征大捷", `【战报】刘皇叔率领精装象兵大举突破【${cName}】，瞬间踩平【${old}】防御，收复失地！`, "victory");
            }
        } else {
            addLog("亲征受挫", `【战报】强攻【${cName}】遭遇激烈反抗，象兵被枪兵伏击折损，被迫收兵。`, "war");
        }
        renderStats({ army_cavalry: -30, cash: -500000 });
        renderMap();
        updateSelectedCityUI();

    } else if (type === "plot") {
        if (gameState.stats.means < 5) {
            addLog("破坏失败", "缺少收买提线木偶的名器珍宝（需 5 个珍宝）！", "system");
            return;
        }

        gameState.stats.means -= 5;
        const loss = Math.floor(cData.value * 0.5);
        cData.value = Math.max(1000, cData.value - loss);

        addLog("刺客与破坏", `暗中派死士刺客混入【${cName}】密谋纵火并收买内战，该城经济被重创！`, "war");
        renderStats({ means: -5 });
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

// 单次推演动作
function nextStep() {
    gameState.currentWar = null; // 重置本回合战斗发起线路
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
    const owned = getOwnedCities(targetUnit);

    const neighbours = getNeighbours(owned);
    const isAggressive = Math.random() < 0.65 && neighbours.length > 0;

    let targetCity = "";
    let change = { people: 0, avator: 0, army_shield: 0, army_cavalry: 0, army_spear: 0, cash: 0, food: 0, means: 0 };
    let logMsg = "";
    let logType = "normal";

    if (isAggressive) {
        targetCity = randChoice(neighbours);
        
        // 拦截：如果敌军准备进攻的目标是我方且处于【免战】状态下
        if (gameState.cities[targetCity].union === "刘备" && gameState.cities[targetCity].avoidWarTurns > 0) {
            logMsg = `大举企图进犯我方防线，但行至【${targetCity}】时守军大开城门弹琴唱曲。敌方怀疑有诈被迫退兵。`;
            addLog(targetUnit, logMsg, "system");
            renderMap();
            
            // 扣除一些微量日常维持费
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
        
        if (defender === "刘备" && gameState.stats.army_shield > 100 && Math.random() < 0.3) {
            logMsg = `派遣兵马大肆入侵我方【${targetCity}】，但遭到驻防的【虎贲重步兵】誓死抵抗，强行守住了要塞关隘！`;
            logType = "war";
            change.army_shield = -randInt(10, 30);
        } else {
            const isSuccess = Math.random() < 0.55;
            if (isSuccess) {
                gameState.cities[targetCity].union = targetUnit;
                gameState.cities[targetCity].value = Math.max(5000, Math.floor(gameState.cities[targetCity].value * 0.7));
                
                logMsg = `挥师强攻【${targetCity}】，击溃了【${defender}】的守备部队，成功将城池夺回！`;
                logType = "war";
                
                if (defender === "刘备") {
                    change.people = -randInt(50, 200);
                    change.army_spear = -randInt(5, 15);
                }
            } else {
                logMsg = `袭击强攻【${targetCity}】失利，遭遇坚固拒马城墙，只得撤兵。`;
                logType = "normal";
            }
        }

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
    
    // 累加回合计数器并定时自动抽卡
    gameState.tacticRounds++;
    if (gameState.tacticRounds >= 15) {
        gameState.tacticRounds = 0;
        drawRandomCard();
    }
    
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

// 页面加载就绪
window.onload = function() {
    initGame("三分天下");

    // 地图空白区点击，重置选中关隘，隐藏就地气泡
    document.getElementById("content").onclick = function(e) {
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

    // 绑定大厅侧的迷你剧本按钮
    document.getElementById("cheat_war1").onclick = function(e) {
        e.preventDefault();
        document.getElementById("cheat_war1").classList.add("active");
        document.getElementById("cheat_war6").classList.remove("active");
        initGame("三分天下");
    };
    document.getElementById("cheat_war6").onclick = function(e) {
        e.preventDefault();
        document.getElementById("cheat_war6").classList.add("active");
        document.getElementById("cheat_war1").classList.remove("active");
        initGame("群雄并起");
    };

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

// ==========================================
// 🧭 军师计策锦囊核心逻辑与数据配置
// ==========================================
const TACTICS_CONFIG = {
    "kongcheng": {
        name: "🛡️ 空城计",
        desc: "指定我方一城获得 5 回合【免战】状态，敌军无法进犯。",
        costText: "💰 30万",
        type: "self",
        costCheck: () => gameState.stats.cash >= 300000,
        costPay: () => { gameState.stats.cash -= 300000; }
    },
    "huoshao": {
        name: "🔥 火烧连营",
        desc: "指定敌方一城，瞬间削减其 50% 繁荣度，并平息战火。",
        costText: "💰 50万 + 🌾 10万",
        type: "enemy",
        costCheck: () => gameState.stats.cash >= 500000 && gameState.stats.food >= 100000,
        costPay: () => {
            gameState.stats.cash -= 500000;
            gameState.stats.food -= 100000;
        }
    },
    "dongfeng": {
        name: "🌾 借东风",
        desc: "指定我方一城，祈风求雨以战养战，后勤暴增 60万 粮食。",
        costText: "💎 5个珍宝",
        type: "self",
        costCheck: () => gameState.stats.means >= 5,
        costPay: () => { gameState.stats.means -= 5; }
    },
    "lianhuan": {
        name: "🔗 连环计",
        desc: "对敌方接壤城施放，3 回合内我方强攻该城成功率升至 100%。",
        costText: "💎 8个珍宝",
        type: "enemy_reachable",
        costCheck: () => gameState.stats.means >= 8,
        costPay: () => { gameState.stats.means -= 8; }
    }
};

// 定时抽取随机锦囊卡牌
function drawRandomCard() {
    if (gameState.cards.length >= 3) {
        addLog("锦囊堆叠", "军师牌库已满 (最多3张)，无法凝聚更多的妙计！", "system");
        return;
    }
    const pool = Object.keys(TACTICS_CONFIG);
    const cardId = randChoice(pool);
    gameState.cards.push(cardId);
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
    const isMine = cData.union === "刘备";

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
        const myCities = getOwnedCities("刘备");
        const neighbours = getNeighbours(myCities);
        if (!neighbours.includes(cityName)) {
            addLog("施法失败", `【${config.name}】必须施放在与我方接壤的敌军关口！`, "system");
            return false;
        }
    }

    // 扣除资源
    config.costPay();

    // 触发效果
    if (cardId === "kongcheng") {
        cData.avoidWarTurns = 6; // 设置免战保护回合 (下回合扣除，实质有 5 回合)
        addLog("空城高悬", `【计策】在【${cityName}】城头大设空城计！获得 5 回合免战保护，敌军不可犯！`, "victory");
    } else if (cardId === "huoshao") {
        const loss = Math.floor(cData.value * 0.5);
        cData.value = Math.max(2000, cData.value - loss);
        cData.isWar = false;
        if (gameState.currentWar && (gameState.currentWar.from === cityName || gameState.currentWar.to === cityName)) {
            gameState.currentWar = null; // 扑灭战火连线
        }
        addLog("火烧连营", `【计策】顺风纵火突袭【${cityName}】，重创守军，其城市繁荣度惨遭腰斩！`, "war");
    } else if (cardId === "dongfeng") {
        gameState.stats.food += 600000;
        addLog("借得东风", `【计策】在【${cityName}】借东风天降甘霖，后勤获得 60万 石粮草补给！`, "econ");
    } else if (cardId === "lianhuan") {
        cData.lianhuanTurns = 4; // 设置连环计弱化回合 (实质 3 回合)
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

    if (gameState.cards.length === 0) {
        list.innerHTML = `<div class="no-cards-tip" style="font-size:0.65rem; color:#666; text-align:center; padding:10px 0;">等待凝聚锦囊妙计...</div>`;
        return;
    }

    let html = "";
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
