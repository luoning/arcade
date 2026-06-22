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
    civilians: 45000,      // 本地户籍黔首(平民)数量
    garrison: {
        auxiliary: 1000,   // 本地徭役役夫/预备兵数量
        
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

---

## 四、 兵农转换与基建政令接口 API

为实现“役夫作为前线工程与兵员补充之核心预备力量”，状态机需声明并提供以下接口：

*   `draftAuxiliary(cityName, count)`：【征发徭役】。扣除 $N$ 名 `civilians`（平民），转化为本地 `garrison.auxiliary`（役夫）。
*   `disbandAuxiliary(cityName, count)`：【解甲归田】。解散本地 $N$ 名役夫或专业部众，还原为平民百姓，归还生产税收。
*   `promoteToSoldier(cityName, troopType, count)`：【简拔编练】。从本地 `garrison.auxiliary` 中扣除 $N$ 名役夫，将其武装并升擢为指定专业兵科（一阶新卒）。
*   `consumeAuxiliaryForConstruct(cityName, taskType, count)`：【役作工程】。修筑农田水利或加固防线、督造霹雳车，必须指派并扣减本地 $N$ 名役卒作为工损折耗。

