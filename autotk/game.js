// 三国演兵录 (Idle Run) 核心控制流与主入口

// 基础工具函数
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
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

// 存档与读档功能
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

    // 绑定开始推演与下一回合按钮
    const btnPause = document.getElementById("pause");
    const btnNext = document.getElementById("next");
    if (btnPause) {
        btnPause.onclick = function(e) {
            e.preventDefault();
            toggleTimer();
        };
    }
    if (btnNext) {
        btnNext.onclick = function(e) {
            e.preventDefault();
            if (gameState.running) {
                toggleTimer(false);
            }
            nextStep();
        };
    }

    // 绑定一键强制统一功能 (军政司)
    const settingsModal = document.getElementById("settingsModal");
    const btnShowSettings = document.getElementById("btn_show_settings");
    const btnCloseSettings = document.getElementById("btn_close_settings");

    if (btnShowSettings) {
        btnShowSettings.onclick = function(e) {
            e.preventDefault();
            settingsModal.classList.add("active");
            renderLordSelectGrid();
        };
    }
    if (btnCloseSettings) {
        btnCloseSettings.onclick = function(e) {
            e.preventDefault();
            settingsModal.classList.remove("active");
        };
    }

    // 绑定作弊指令按钮
    const cheatActions = [
        { id: "cheat_war3", action: () => setAllCity("曹操") },
        { id: "cheat_war4", action: () => setAllCity("刘备") },
        { id: "cheat_war5", action: () => setAllCity("孙权") },
        { id: "cheat_war2", action: () => setAllCity("司马炎") },
        { id: "cheat_war0", action: () => setAllCity("汉献帝") }
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

    initMapZoomAndPan();
    initGame("三分天下");

    window.addEventListener("resize", drawConnections);
};
