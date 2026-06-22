// UI 渲染与更新模块
function getUpDownHTML(n) {
    if (n < 0) return `<span class="updown warning">-${Math.abs(n)}</span>`;
    if (n > 0) return `<span class="updown running">+${Math.abs(n)}</span>`;
    return '<span class="updown"></span>';
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

// 刷新军师锦囊列表面板
function updateTacticsUI() {
    const list = document.getElementById("tacticsList");
    const count = document.getElementById("cardCount");
    if (!list || !count) return;

    count.textContent = `(${gameState.cards.length}/3)`;

    const isCooling = gameState.lordSkillCD > 0;
    let cardSkillHTML = "";
    
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
