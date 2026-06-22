# 💾 核心状态模型升级设计文档 (`state_upgrade.md`)

本规范详细定义了 `state.js` 数据结构的调整方案，将原本全局的大池兵力字段彻底剥离，全面下放到郡县（城池）的驻军结构（`garrison`）中，并基于三维矩阵（四大兵科、护甲、兵刃）进行存储。

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
        people: 1000000,  // 全局总人口
        avator: 576,      // 麾下名将数
        cash: 4875231,    // 国库资金 (金贯)
        food: 74112453,   // 屯粮储积 (石)
        means: 254        // 珍宝数 (件)
    },
    cities: {},           // 郡县驻防数据详见下述结构
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

每一个郡县节点（`gameState.cities[cityName]`）维护四大兵科的配置（数量、等级、护甲、兵刃）与防御设备状态：

```javascript
gameState.cities["新野"] = {
    value: 50000,          // 当前郡县繁荣度 (相当于城池血量上限)
    union: "刘备",         // 所属割据势力
    isWar: false,          // 是否处于交战状态
    avoidWarTurns: 0,      // 免战保护余剩回合
    lianhuanTurns: 0,      // 混乱瘫痪余剩回合
    
    // ⚔️ 郡县本地驻军 (Garrison) - 承接三维矩阵
    garrison: {
        auxiliary: 1000,   // 本地徭役役卒数量 (不具备等级与装备)
        
        // 四大核心兵科
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

## 三、 枚举参数值限定

为了确保与命名生成和属性向量映射无缝对接，定义以下枚举值标准：

1.  **护甲制式 (`armor`)**：
    *   `ARM_NONE` (无甲)
    *   `ARM_LEATHER` (犀皮革甲)
    *   `ARM_扎甲` (扎甲/扎甲)
    *   `ARM_具装` (战马具装，仅突骑适用)
2.  **兵刃远射 (`weapon`)**：
    *   `WEP_STANDARD` (标配武器)
    *   `WEP_鋼铤` (百炼钢铤)
    *   `WEP_劈山斧` (重劈大斧)
    *   `WEP_大黄弩` (强力擘张弩)
    *   `WEP_连弩` (元戎连弩)
    *   `WEP_马槊` (重突骑槊，仅突骑适用)
