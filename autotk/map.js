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
    let size = "small";
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
                if (line.getAttribute("stroke") !== "#e74c3c") line.setAttribute("stroke", "#e74c3c");
                if (line.getAttribute("stroke-width") !== "4") line.setAttribute("stroke-width", "4");
                if (line.getAttribute("stroke-dasharray") !== "6,6") line.setAttribute("stroke-dasharray", "6,6");
                if (line.getAttribute("class") !== "war-link-line") line.setAttribute("class", "war-link-line");
            } else {
                const x1Val = `${startCoord.x}%`;
                const y1Val = `${startCoord.y}%`;
                const x2Val = `${endCoord.x}%`;
                const y2Val = `${endCoord.y}%`;
                
                if (line.getAttribute("x1") !== x1Val) line.setAttribute("x1", x1Val);
                if (line.getAttribute("y1") !== y1Val) line.setAttribute("y1", y1Val);
                if (line.getAttribute("x2") !== x2Val) line.setAttribute("x2", x2Val);
                if (line.getAttribute("y2") !== y2Val) line.setAttribute("y2", y2Val);
                if (line.getAttribute("stroke") !== "rgba(255,255,255,0.08)") line.setAttribute("stroke", "rgba(255,255,255,0.08)");
                if (line.getAttribute("stroke-width") !== "1.5") line.setAttribute("stroke-width", "1.5");
                if (line.getAttribute("stroke-dasharray")) line.removeAttribute("stroke-dasharray");
                if (line.getAttribute("class")) line.removeAttribute("class");
            }

            if (isNew) {
                svg.appendChild(line);
            }
        });
    });
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
