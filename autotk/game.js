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

// 2. 势力配置数据
const rolesConfig = {
    "无主": { flag: "circle-o", color: "blank", winByGod: ["混沌", "从零开始吧."] },
    "刘备": { flag: "bookmark", color: "gird1", winByGod: ["刘备", "终于，大汉的江山还是姓刘."] },
    "曹操": { flag: "bookmark", color: "gird2", winByGod: ["曹操", "奉孝，你还记得么？"] },
    "孙权": { flag: "bookmark", color: "gird3", winByGod: ["孙权", "呵呵，我不比哥爹差."] },
    "董卓": { flag: "bookmark", color: "gird4", winByGod: ["董卓", "看吧，你们都给我敞开了吃！"] },
    "汉献帝": { flag: "bookmark", color: "gird5", winByGod: ["汉献帝", "高祖，让那些乱臣贼子们，都消失吧"] },
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

// 3. 运行状态
let gameState = {
    running: false,
    timer: null,
    script: "三分天下",
    // 玩家个人属性数据
    stats: {
        people: 1000000,
        avator: 576,
        army: 730,
        cash: 4875231,
        food: 74112453,
        means: 254
    },
    cities: {}, // 保存当前所有城市的状态 { cityName: { value: 50000, union: "曹操" } }
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
    if (n < 0) return `<span class="updown warning">减少${Math.abs(n)}</span>`;
    if (n > 0) return `<span class="updown running">增加${Math.abs(n)}</span>`;
    return '<span class="updown"></span>';
}

// 初始化地图
function initGame(scriptName) {
    gameState.script = scriptName;
    gameState.history = [];
    
    // 初始化城市归属
    const citiesList = Object.keys(cityConnections);
    gameState.cities = {};
    citiesList.forEach(c => {
        gameState.cities[c] = { value: 0, union: "无主" };
    });

    const activeUnits = scriptUnits[scriptName] || scriptUnits["三分天下"];
    Object.keys(activeUnits).forEach(unitName => {
        activeUnits[unitName].home.forEach(hCity => {
            if (gameState.cities[hCity]) {
                gameState.cities[hCity] = { value: 50000, union: unitName };
            }
        });
    });

    // 默认定位到玩家首府或新野
    gameState.cityNow = activeUnits["刘备"] ? activeUnits["刘备"].home[0] : "新野";
    
    // 清空前端事件信息
    const msgContainer = document.getElementById("message");
    if (msgContainer) msgContainer.innerHTML = "";
    
    addLog("嗨", `${scriptName}时代，又是一轮乱世。`);
    renderMap();
    renderStats({ people: 0, avator: 0, army: 0, cash: 0, food: 0, means: 0 });
}

// 一键强制统一（测试用/作弊菜单）
function setAllCity(unitName) {
    const citiesList = Object.keys(cityConnections);
    citiesList.forEach(c => {
        gameState.cities[c].union = unitName;
        gameState.cities[c].value = 100000;
    });
    
    const winMsg = rolesConfig[unitName] ? rolesConfig[unitName].winByGod[1] : "天下归一";
    addLog(unitName, winMsg);
    renderMap();
    checkVictory();
}

// 渲染地图
function renderMap() {
    const container = document.getElementById("content");
    if (!container) return;
    
    container.innerHTML = "";
    const citiesList = Object.keys(cityConnections);

    citiesList.forEach(cityName => {
        const cityData = gameState.cities[cityName] || { value: 0, union: "无主" };
        const role = rolesConfig[cityData.union] || rolesConfig["无主"];
        
        // 创建城市节点
        const cityEl = document.createElement("div");
        cityEl.id = cityName;
        cityEl.className = "city-wrapper";

        const contentHTML = `
            <span class="map_gird ${role.color}">
                <div class="map_item tip ${role.color}">
                    <i class="fa fa-${role.flag}"></i> ${cityName}
                    <br/>
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
}

// 渲染玩家数值看板
function renderStats(change = { people: 0, avator: 0, army: 0, cash: 0, food: 0, means: 0 }) {
    document.getElementById("people").innerHTML = `${gameState.stats.people} ${getUpDownHTML(change.people)}`;
    document.getElementById("avator").innerHTML = `${gameState.stats.avator} ${getUpDownHTML(change.avator)}`;
    document.getElementById("army").innerHTML = `${gameState.stats.army} ${getUpDownHTML(change.army)}`;
    document.getElementById("cash").innerHTML = `${gameState.stats.cash} ${getUpDownHTML(change.cash)}`;
    document.getElementById("food").innerHTML = `${gameState.stats.food} ${getUpDownHTML(change.food)}`;
    document.getElementById("means").innerHTML = `${gameState.stats.means} ${getUpDownHTML(change.means)}`;
}

// 添加日志
function addLog(tag, content) {
    const msgContainer = document.getElementById("message");
    if (!msgContainer) return;

    const line = document.createElement("div");
    line.className = "line";
    line.innerHTML = `<i class="fa fa-bookmark-o"> [${tag}]</i> <br/> ${content}`;
    msgContainer.insertBefore(line, msgContainer.firstChild);

    // 限制行数防溢出
    if (msgContainer.children.length > 50) {
        msgContainer.removeChild(msgContainer.lastChild);
    }
}

// 单次推演动作 (原本 python 里的 actions/action)
function nextStep() {
    const citiesList = Object.keys(cityConnections);
    
    // 1. 随机选个发生随机事件的城市
    const targetCity = randChoice(citiesList);
    
    // 2. 选个发生影响的角色 (在当前势力池里挑)
    const activeUnits = scriptUnits[gameState.script];
    const unitList = Object.keys(activeUnits);
    const targetUnit = randChoice(unitList);

    // 3. 随机事件触发
    const events = [
        { msg: "正在鏖战中，喊杀声震天", people: randInt(-1000, 0), avator: randInt(-10, 0), army: randInt(-10, 0), cash: randInt(-10000, 0), food: randInt(-100000, 0), means: 0, owner: targetUnit },
        { msg: "庄稼丰收了，仓廪满满", people: randInt(0, 10000), avator: 0, army: 0, cash: 0, food: 0, means: 0, owner: randChoice(unitList) },
        { msg: "出现了盗匪，守备逃亡，城空了", people: randInt(-1000, 0), avator: randInt(-2, 0), army: randInt(-2, 0), cash: randInt(-10000, 0), food: randInt(-100000, 0), means: 0, owner: "无主" },
        { msg: "商业繁茂，吸引了大量商业人才", people: randInt(0, 100), avator: randInt(3, 10), army: 0, cash: randInt(5000, 100000), food: randInt(50, 1000), means: randInt(0, 2), owner: targetUnit },
        { msg: "论道风气，吸引了大量知名人士", people: randInt(0, 50), avator: randInt(5, 10), army: 0, cash: 0, food: 0, means: randInt(0, 2), owner: randChoice(unitList) },
        { msg: `前往相邻城市附近找到了宝藏。`, people: randInt(-50, 0), avator: 0, army: 0, cash: randInt(50, 1000), food: 0, means: randInt(1, 5), owner: targetUnit },
        { msg: `计划攻略邻城正在招募乡勇。`, people: 0, avator: 0, army: randInt(5, 10), cash: 0, food: 0, means: 0, owner: randChoice(unitList) }
    ];

    const ev = randChoice(events);

    // 4. 应用资源修改
    gameState.stats.people += ev.people;
    gameState.stats.avator += ev.avator;
    gameState.stats.army += ev.army;
    gameState.stats.cash += ev.cash;
    gameState.stats.food += ev.food;
    gameState.stats.means += ev.means;

    // 5. 转移城市控制权或繁荣度变动
    gameState.cities[targetCity].union = ev.owner;
    gameState.cities[targetCity].value = Math.max(0, gameState.cities[targetCity].value + ev.people * 10);

    // 6. 随机移动当前视点
    const connections = cityConnections[gameState.cityNow].connect;
    gameState.cityNow = randChoice(connections);

    // 7. 更新UI
    addLog(`${ev.owner}-${targetCity}`, ev.msg);
    renderStats(ev);
    renderMap();

    // 8. 检查胜利
    checkVictory();
}

// 检查是否达成“天下一统”
function checkVictory() {
    const citiesList = Object.keys(cityConnections);
    const firstOwner = gameState.cities[citiesList[0]].union;
    
    if (firstOwner === "无主") return;

    const isAllSame = citiesList.every(c => gameState.cities[c].union === firstOwner);
    if (isAllSame) {
        // 达成大统！向大厅上报成就
        addLog("天下大势", `【${firstOwner}】占领了所有疆土，天下一统！`);
        window.parent.postMessage({
            type: "unlock_achievement",
            achievement: "天下一统"
        }, "*");
        
        // 停止运行
        toggleTimer(false);
    }
}

// 控制循环定时器
function toggleTimer(forceState = null) {
    const playBtn = document.getElementById("pause");
    if (!playBtn) return;

    if (forceState !== null) {
        gameState.running = !forceState; // 巧妙反转以迎合下面的逻辑
    }

    if (gameState.running) {
        // 暂停
        gameState.running = false;
        clearInterval(gameState.timer);
        gameState.timer = null;
        playBtn.innerHTML = `<i class="fa fa-play running"> 回合开始</i>`;
    } else {
        // 开始
        gameState.running = true;
        gameState.timer = setInterval(nextStep, 1000);
        playBtn.innerHTML = `<i class="fa fa-random stop"> 他势力进行中</i>`;
    }
}

// 页面加载就绪
window.onload = function() {
    // 1. 初始化游戏
    initGame("三分天下");

    // 2. 绑定事件
    document.getElementById("pause").onclick = function(e) {
        e.preventDefault();
        toggleTimer();
    };

    // 剧本切换绑定
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

    // 退出游戏返回大厅
    document.getElementById("exit").onclick = function(e) {
        e.preventDefault();
        // 优雅退出 fullscreen
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.log(err));
        }
        window.parent.postMessage({ type: "exit_cabinet" }, "*");
    };
};
