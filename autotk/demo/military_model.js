// ⚔️ 汉末三国「部众三维矩阵」测试与胜率结算模型 (military_model.js)

// 1. 基础配置定义
const CORE_BRANCHES = {
    "SWD": { name: "短兵", baseAttack: 2.0, baseDefense: 1.5, weight: 1 },
    "LNC": { name: "长兵", baseAttack: 1.0, baseDefense: 2.5, weight: 2 },
    "RNG": { name: "远射", baseAttack: 2.5, baseDefense: 0.8, weight: 1 },
    "CAV": { name: "突骑", baseAttack: 3.0, baseDefense: 1.0, weight: 3 }
};

const ARMOR_CLASSES = {
    "ARM_NONE": { name: "无甲", defenseMod: 0.0, speedMod: 0.0 },
    "ARM_LEATHER": { name: "犀皮甲", defenseMod: 0.25, speedMod: 0.0 },
    "ARM_扎甲": { name: "扎甲", defenseMod: 0.60, speedMod: -0.03 },
    "ARM_具装": { name: "马铠具装", defenseMod: 1.20, speedMod: -0.25 } // 仅骑兵
};

const WEAPON_SYSTEMS = {
    "WEP_STANDARD": { name: "普通武器", attackMod: 0.0, tags: [] },
    "WEP_鋼铤": { name: "百炼钢铤", attackMod: 0.5, tags: ["pierce"] }, // 破甲
    "WEP_劈山斧": { name: "重劈大斧", attackMod: 0.4, tags: ["axe_shield_breaker"] },
    "WEP_大黄弩": { name: "大黄弩", attackMod: 0.8, tags: ["volley_boost"] },
    "WEP_连弩": { name: "元戎连弩", attackMod: 0.3, tags: ["double_shoot"] },
    "WEP_马槊": { name: "马槊", attackMod: 0.6, tags: ["charge"] }
};

const TRAINING_DOCTRINES = {
    "DOC_STANDARD": { name: "寻常训法", attackMod: 0.0, defenseMod: 0.0, speedMod: 0.0 },
    "DOC_OFFENSIVE": { name: "攻坚先登", attackMod: 0.25, defenseMod: -0.10, speedMod: 0.0 },
    "DOC_DEFENSIVE": { name: "牙门固守", attackMod: 0.0, defenseMod: 0.30, speedMod: -0.15 },
    "DOC_SKIRMISH": { name: "袭掠飞骑", attackMod: 0.0, defenseMod: -0.15, speedMod: 0.15 }
};

// 2. 动态历史称谓生成引擎
function getUnitHistoricalName(branch, armor, weapon, doctrine, faction = "none") {
    // A. 势力特种精锐判定
    if (faction === "曹操" && branch === "CAV" && armor === "ARM_具装" && weapon === "WEP_马槊") {
        return "重装虎豹骑";
    }
    if (faction === "刘备" && branch === "LNC" && armor === "ARM_扎甲" && weapon === "WEP_鋼铤") {
        return "白耳兵";
    }
    if (faction === "袁绍" && branch === "LNC" && armor === "ARM_扎甲" && weapon === "WEP_劈山斧") {
        return "大戟士";
    }
    if (faction === "吕布" && branch === "CAV" && armor === "ARM_LEATHER" && weapon === "WEP_大黄弩") {
        return "并州飞将";
    }
    if (faction === "孙权" && branch === "SWD" && armor === "ARM_扎甲" && weapon === "WEP_劈山斧") {
        return "丹阳精兵";
    }
    if (faction === "孟获" && branch === "LNC" && armor === "ARM_NONE" && weapon === "WEP_STANDARD") {
        return "南蛮藤甲军";
    }
    if (faction === "公孙瓒" && branch === "CAV" && armor === "ARM_LEATHER" && weapon === "WEP_大黄弩") {
        return "白马义从";
    }

    // B. 基于战术体系与装备映射的标准古风称谓
    if (branch === "SWD") {
        if (doctrine === "DOC_OFFENSIVE") return "先登锐士";
        if (armor === "ARM_扎甲" && weapon === "WEP_劈山斧") return "重甲破阵士";
        if (armor === "ARM_扎甲") return "扎甲先锋";
        if (weapon === "WEP_劈山斧") return "白刃解烦卫";
        return "环首刀手";
    }
    if (branch === "LNC") {
        if (doctrine === "DOC_DEFENSIVE") return "牙门御寇卫";
        if (weapon === "WEP_鋼铤") return "百炼破甲士";
        if (weapon === "WEP_劈山斧") return "积弩戟盾兵";
        if (armor === "ARM_扎甲") return "持戟甲卫";
        return "列阵矛士";
    }
    if (branch === "RNG") {
        if (weapon === "WEP_大黄弩") return "大黄弩士";
        if (weapon === "WEP_连弩") return "元戎弩卫";
        if (armor === "ARM_扎甲") return "扎甲控弦士";
        return "控弦弩手";
    }
    if (branch === "CAV") {
        if (doctrine === "DOC_SKIRMISH") return "并州飞骑";
        if (weapon === "WEP_马槊" && armor === "ARM_扎甲") return "槊血铁骑";
        if (armor === "ARM_NONE") return "游侠突骑";
        return "轻装骁骑";
    }
    return "役卒";
}

// 3. 单兵战力计算
function calculateSingleUnitStats(branchId, armorId, weaponId, doctrineId, level) {
    const branch = CORE_BRANCHES[branchId];
    const armor = ARMOR_CLASSES[armorId] || { defenseMod: 0, speedMod: 0 };
    const weapon = WEAPON_SYSTEMS[weaponId] || { attackMod: 0, tags: [] };
    const doctrine = TRAINING_DOCTRINES[doctrineId] || { attackMod: 0, defenseMod: 0, speedMod: 0 };

    if (!branch) return { attack: 0, defense: 0, speed: 0 };

    // 等级加成 (一阶0%，二阶20%，三阶45%，四阶75%)
    let lvlBonus = 0;
    if (level === 2) lvlBonus = 0.20;
    if (level === 3) lvlBonus = 0.45;
    if (level === 4) lvlBonus = 0.75;

    // 基础战力
    let attack = branch.baseAttack;
    let defense = branch.baseDefense;

    // 累加计算
    attack = attack * (1 + lvlBonus) * (1 + weapon.attackMod + doctrine.attackMod);
    defense = defense * (1 + lvlBonus) * (1 + armor.defenseMod + doctrine.defenseMod);

    // 速度机动性
    let speed = 1.0 + armor.speedMod + doctrine.speedMod;

    return {
        attack: parseFloat(attack.toFixed(2)),
        defense: parseFloat(defense.toFixed(2)),
        speed: parseFloat(speed.toFixed(2))
    };
}

// 4. 攻守两军总战力与胜率结算引擎
function runBattleSimulation(attacker, defender) {
    let attPower = 0;
    let defPower = 0;

    // A. 攻方攻击战力累加
    attacker.troops.forEach(t => {
        const stats = calculateSingleUnitStats(t.branch, t.armor, t.weapon, t.doctrine, t.level);
        let troopPower = stats.attack * t.count;

        // 突骑冲锋加成
        if (t.branch === "CAV" && t.weapon === "WEP_马槊") {
            troopPower *= 1.6; // 马槊冲锋加成 60%
        }
        // 攻坚战法加成
        if (t.doctrine === "DOC_OFFENSIVE") {
            troopPower *= 1.25;
        }

        attPower += troopPower;
    });

    // 攻城军器修饰
    if (attacker.engines.chongche > 0) {
        attPower *= (1 + attacker.engines.chongche * 0.15); // 每个冲车增加攻城力量 15%
    }

    // B. 守方防御战力累加
    defender.troops.forEach(t => {
        const stats = calculateSingleUnitStats(t.branch, t.armor, t.weapon, t.doctrine, t.level);
        let troopPower = stats.defense * t.count;

        // 枪矛拒马克骑
        const hasAttackerCavalry = attacker.troops.some(at => at.branch === "CAV");
        if (t.branch === "LNC" && hasAttackerCavalry) {
            troopPower *= 2.0; // 持矛戟士对骑兵战力翻倍
        }

        // 固守战法加成
        if (t.doctrine === "DOC_DEFENSIVE") {
            troopPower *= 1.3;
        }

        defPower += troopPower;
    });

    // 城防繁荣度修饰
    let cityDefenseMul = 1.0 + (defender.cityValue / 100000) * 0.5; // 最高防御加成 50%
    if (attacker.engines.chongche > 0) {
        cityDefenseMul = 1.0; // 冲车直接废除城防繁荣度胜率修正
    }
    defPower *= cityDefenseMul;

    // 守城器械修饰
    if (defender.engines.quanti > 0) {
        // 筌蹄废除突骑马槊冲撞加成
        // (在真实算法中会将 attPower 冲锋修正扣除，此处简化为直接提升守方战力 10%)
        defPower *= 1.1;
    }

    // C. 胜率解算 (文明式占比公式)
    let winRate = (attPower / (attPower + defPower)) * 100;
    if (isNaN(winRate)) winRate = 50;
    winRate = Math.min(95, Math.max(5, winRate)); // 胜率界定于 5% ~ 95%

    return {
        attPower: parseFloat(attPower.toFixed(2)),
        defPower: parseFloat(defPower.toFixed(2)),
        winRate: parseFloat(winRate.toFixed(1))
    };
}
