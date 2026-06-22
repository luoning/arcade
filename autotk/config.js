// ==========================================
// 三国演兵录 - 全局数值配置表
// 所有游戏平衡性数值集中于此，便于调整
// ==========================================

const GAME_CONFIG = {
    // ------------------------------------------
    // 1. 初始资源
    // ------------------------------------------
    initialStats: {
        people: 1000000,
        avator: 576,
        army_shield: 300,
        army_cavalry: 150,
        army_spear: 280,
        cash: 4875231,
        food: 74112453,
        means: 254
    },

    // ------------------------------------------
    // 2. 推演速度 (毫秒/回合)
    // ------------------------------------------
    speeds: {
        normal: 1000,   // 1.0x 推演
        fast: 400,      // 2.5x 交火
        ultra: 150      // 6.0x 超频
    },

    // ------------------------------------------
    // 3. 城市数值
    // ------------------------------------------
    city: {
        defaultValue: 10000,      // 无主城市默认繁荣度
        ownedValue: 50000,        // 势力初始城市繁荣度
        maxValue: 100000,         // 城市繁荣度上限
        minValue: 1000,           // 城市繁荣度下限（破坏后）
        postAttackMin: 2000,      // 战后城市最低繁荣度
        postConquerRetain: 0.95,  // 玩家攻城成功后保留比例
        aiConquerRetain: 0.7,     // AI 攻城成功后保留比例
        aiConquerMin: 5000,       // AI 攻城后最低繁荣度
        // 自然增长
        growth: {
            min: 150,
            max: 400,
            liuBiaoBonus: 1.5     // 刘表被动增长率倍率
        },
        // 董卓被动损耗
        dongZhuoDecay: {
            interval: 5,          // 每 N 回合
            rate: 0.97            // 保留 97%（损耗 3%）
        }
    },

    // ------------------------------------------
    // 4. 委任系统
    // ------------------------------------------
    actions: {
        largeCity: 3,    // 大型城市提供委任数
        mediumCity: 2,   // 中型城市提供委任数
        smallCity: 1     // 小型城市提供委任数
    },

    // ------------------------------------------
    // 5. 募兵成本
    // ------------------------------------------
    recruitment: {
        shield: {
            cash: 150000,
            food: 50000,
            amount: 100,
            valueGain: 3000
        },
        spear: {
            cash: 80000,
            food: 30000,
            amount: 100,
            valueGain: 1500
        },
        cavalry: {
            cash: 250000,
            food: 120000,
            amount: 50,
            valueGain: 5000
        }
    },

    // ------------------------------------------
    // 6. 经济建设
    // ------------------------------------------
    economy: {
        farm: {
            cashCost: 50000,
            valueGain: 12000,
            foodGain: 300000
        }
    },

    // ------------------------------------------
    // 7. 攻城/战斗
    // ------------------------------------------
    combat: {
        // 玩家攻城
        playerAttack: {
            cavalryRequired: 30,
            cashCost: 500000,
            baseSuccessRate: 0.75
        },
        // AI 攻城
        aiAttack: {
            baseSuccessRate: 0.55,
            aggressionRate: 0.65,    // AI 选择攻击的概率
            liuBiaoAvoidRate: 0.75   // 刘表避战概率
        },
        // 防御
        defense: {
            baseShieldRate: 0.3,     // 虎贲防御基础成功率
            caoCaoShieldRate: 0.6,   // 曹操被动防御成功率
            shieldMin: 100           // 触发防御所需最低虎贲数
        },
        // 曹操被动奖励
        caoCaoDefenseReward: {
            cash: 10000,
            food: 50000
        },
        // 战后损耗
        postDefense: {
            shieldLossMin: 10,
            shieldLossMax: 30
        },
        postFailedAttack: {
            peopleLossMin: 50,
            peopleLossMax: 200,
            spearLossMin: 5,
            spearLossMax: 15
        }
    },

    // ------------------------------------------
    // 8. 流言破坏
    // ------------------------------------------
    plot: {
        meansCost: 5,
        valueDamageRate: 0.5,
        minValueAfter: 1000
    },

    // ------------------------------------------
    // 9. 主公技能
    // ------------------------------------------
    lordSkills: {
        liuBei: {
            name: "携民渡江",
            cd: 12,
            cashCost: 120000,
            valueGain: 25000
        },
        sunQuan: {
            name: "权衡调度",
            cd: 10
        },
        hanXianDi: {
            name: "勤王密诏",
            cd: 15,
            meansCost: 6,
            stealValue: 5000
        },
        luBu: {
            name: "飞将袭掠",
            cd: 12,
            foodCost: 300000,
            damageRate: 0.35,
            lianhuanTurns: 4,        // 实质 3 回合
            minValueAfter: 2000
        }
    },

    // ------------------------------------------
    // 10. 被动技能
    // ------------------------------------------
    passives: {
        dongZhuo: {
            recruitDiscount: 0.7,    // 募兵消耗 30% 减免
            decayInterval: 5,
            decayRate: 0.97
        },
        caoCao: {
            defenseRateBonus: 0.6
        },
        siMaYan: {
            noRetreatLoss: true
        },
        yuanShao: {
            initialCashBonus: 200000,
            initialMeansBonus: 5,
            tacticCostPenalty: 1.2   // 计策消耗增加 20%
        },
        liuBiao: {
            growthBonus: 1.5,
            avoidWarRate: 0.75
        }
    },

    // ------------------------------------------
    // 11. 计策锦囊
    // ------------------------------------------
    tactics: {
        kongcheng: {
            name: "🛡️ 空城计",
            cashCost: 300000,
            avoidWarTurns: 6,        // 实质 5 回合
            type: "self"
        },
        huoshao: {
            name: "🔥 火烧连营",
            cashCost: 500000,
            foodCost: 100000,
            damageRate: 0.5,
            minValueAfter: 2000,
            type: "enemy"
        },
        dongfeng: {
            name: "🌾 借东风",
            meansCost: 5,
            foodGain: 600000,
            type: "self"
        },
        lianhuan: {
            name: "🔗 连环计",
            meansCost: 8,
            lianhuanTurns: 4,        // 实质 3 回合
            type: "enemy_reachable"
        },
        // 剧本特殊倍率
        scriptMultiplier: {
            guandu: 1.2              // 官渡之战计策消耗 +20%
        }
    },

    // ------------------------------------------
    // 12. AI 事件
    // ------------------------------------------
    aiEvents: {
        // 经济事件概率区间 (0.45)
        econThreshold: 0.45,
        // 募兵事件概率区间 (0.45 ~ 0.75)
        recruitThreshold: 0.75,
        // 经济收益
        foodGainMin: 20000,
        foodGainMax: 100000,
        valueGainMin: 2000,
        valueGainMax: 8000,
        cashGainMin: 5000,
        cashGainMax: 20000,
        // 募兵收益
        recruitCountMin: 5,
        recruitCountMax: 15,
        // 珍宝收益
        meansGainMin: 1,
        meansGainMax: 3,
        meansCashMin: 2000,
        meansCashMax: 8000,
        // 人口收益
        peopleGainMin: 20,
        peopleGainMax: 200,
        // 战争损耗
        warCashMin: -6000,
        warCashMax: 1000,
        warFoodMin: -20000,
        warFoodMax: 2000,
        // AI 选城权重
        aiCityWeight: {
            base: 1000,
            valuePenaltyPer250: 1,
            capitalPenalty: 800,
            avoidWarPenalty: 5000
        }
    },

    // ------------------------------------------
    // 13. 袁绍开局奖励
    // ------------------------------------------
    yuanShaoBonus: {
        cash: 200000,
        means: 5
    },

    // ------------------------------------------
    // 14. 存档/抽卡
    // ------------------------------------------
    autoSave: {
        interval: 15,            // 每 N 回合自动存档
        maxCards: 3              // 手牌上限
    },

    // ------------------------------------------
    // 15. 地图缩放
    // ------------------------------------------
    mapZoom: {
        min: 0.5,
        max: 2.5,
        step: 0.08
    },

    // ------------------------------------------
    // 16. 音效
    // ------------------------------------------
    sfx: {
        volume: 0.18,
        war: { freq1: 180, freq2: 140, type: "sawtooth", dur1: 80, dur2: 120, vol: 0.22 },
        victory: { freqs: [523, 659, 784], type: "square", dur: 80 },
        unify: { freqs: [392, 523, 659, 784, 1047], type: "square", dur: 200, vol: 0.25 },
        card: { freqs: [880, 1047], type: "sine", dur: 60, vol: 0.12 },
        save: { freqs: [440, 660], type: "sine", dur: 60, vol: 0.10 },
        tactic: { freqs: [600, 400], type: "sawtooth", dur: 50, vol: 0.14 }
    }
};

// 兼容旧代码：将配置挂载到 window
window.GAME_CONFIG = GAME_CONFIG;
