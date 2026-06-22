// AI 地缘决策轮转与推演逻辑
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
