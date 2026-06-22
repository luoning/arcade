# 💾 核心状态模型升级设计文档 (`state_upgrade.md`)

本规范详细定义了 `state.js` 数据结构的调整方案，将原本全局的大池兵力字段彻底剥离，全面下放到郡县（城池）的驻军结构（`garrison`）中，并建立“平民 $\rightarrow$ 役夫 $\rightarrow$ 部众”的三级人口分类属性。

---

## 一、 核心状态 `gameState` 结构变更

原有的全局兵力指标 `gameState.stats.army_shield`、`army_spear`、`army_cavalry` 被全部移除。

```javascript
let gameState = {
    running: false,
    timer: null,
    script: "三分天下",
    speed: 1000, 
    stats: {
        people: 1000000,  // 全局总人口 (各郡县平民与役夫的总和)
        avator: 576,      // 麾下名将数
        cash: 4875231,    // 国库资金 (金贯)
        food: 74112453,   // 屯粮储积 (石)
        means: 254        // 珍宝数 (件)
    },
    cities: {},           // 郡县驻防与人口数据详见下述结构
    cityNow: "新野", 
    selectedCity: null, 
    currentWar: null, 
    cards: [], 
    activeCardIndex: null, 
    tacticRounds: 0,
    lordSkillCD: 0,
    playerLord: "刘备", 
    actionsLeft: 0, 
    history: []
};
```

---

## 二、 郡县（郡国）数据模型重构

每一个郡县节点（`gameState.cities[cityName]`）维护平民、役夫、四大兵科的配置（数量、等级、护甲、兵刃）与防御设备状态：

```javascript
gameState.cities["新野"] = {
    value: 50000,          // 当前郡县繁荣度 (相当于城池血量上限)
    union: "刘备",         // 所属割据势力
    isWar: false,          // 是否处于交战状态
    avoidWarTurns: 0,      // 免战保护余剩回合
    lianhuanTurns: 0,      // 混乱瘫痪余剩回合
    
    // 👥 郡县人口分类与本地驻军 (Demographics & Garrison)
    civilians: 80000,      // 郡县本地黔首(平民)数量 -> 提供日常钱粮税收
    auxiliary: 5000,       // 本地役夫(预备兵)数量 -> 消耗粮食，基建与简拔之基础
    
    // 四大核心兵科部众
    garrison: {
        sword: { level: 1, count: 0, armor: "ARM_NONE", weapon: "WEP_STANDARD" },
        spear_halberd: { level: 1, count: 0, armor: "ARM_NONE", weapon: "WEP_STANDARD" },
        bow_crossbow: { level: 1, count: 0, armor: "ARM_NONE", weapon: "WEP_STANDARD" },
        cavalry: { level: 1, count: 0, armor: "ARM_NONE", weapon: "WEP_STANDARD" }
    },
    
    // 🛠️ 郡县重装战争防具与攻器
    siegeEngines: {
        piliche: 0,        // 霹雳车数量
        chongche: 0,       // 冲车数量
        quanti: 0,         // 筌蹄部署 (0/1)
        mushou: 0          // 木兽部署 (0/1)
    }
};
```

---

## 三、 数据转换 API 接口约束

`state.js` 需要定义以下原子数据转换函数，用于保证“平民 $\rightarrow$ 役夫 $\rightarrow$ 兵员 / 建筑消耗”的转化逻辑：

*   `draftAuxiliary(cityName, count)`：征发徭役。将本城 `civilians` 减少 `count`，增加到 `auxiliary`。
*   `trainGarrison(cityName, branch, count)`：简拔正规军。将本城 `auxiliary` 减少 `count`，增加到指定兵科部众数量。
*   `disbandToAuxiliary(cityName, branch, count)`：退役。将本城指定兵科部众减少 `count`，归入 `auxiliary`。
*   `consumeAuxiliaryForWork(cityName, count)`：基建工程消耗。扣减本城 `auxiliary` 预备兵役夫，触发折损并部分回流至 `civilians`。
