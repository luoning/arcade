/**
 * 华容道 关卡阵型配置库
 * 各棋子坐标为 [x, y]，宽度 w 对应列数，高度 h 对应行数。
 * 棋盘尺寸固定为 4 列 x 5 行。
 */
window.GAME_LAYOUTS = {
  // 1. 横刀立马 (经典名局)
  hengdao: [
    { name: '曹操', type: 'caocao', w: 2, h: 2, x: 1, y: 0 },
    { name: '张飞', type: 'general', w: 1, h: 2, x: 0, y: 0 },
    { name: '赵云', type: 'general', w: 1, h: 2, x: 3, y: 0 },
    { name: '关羽', type: 'guanyu', w: 2, h: 1, x: 1, y: 2 },
    { name: '马超', type: 'general', w: 1, h: 2, x: 0, y: 2 },
    { name: '黄忠', type: 'general', w: 1, h: 2, x: 3, y: 2 },
    { name: '卒', type: 'soldier', w: 1, h: 1, x: 0, y: 4 },
    { name: '卒', type: 'soldier', w: 1, h: 1, x: 1, y: 3 },
    { name: '卒', type: 'soldier', w: 1, h: 1, x: 2, y: 3 },
    { name: '卒', type: 'soldier', w: 1, h: 1, x: 3, y: 4 }
  ],
  
  // 2. 指挥若定
  zhihui: [
    { name: '曹操', type: 'caocao', w: 2, h: 2, x: 1, y: 0 },
    { name: '张飞', type: 'general', w: 1, h: 2, x: 0, y: 0 },
    { name: '赵云', type: 'general', w: 1, h: 2, x: 3, y: 0 },
    { name: '关羽', type: 'guanyu', w: 2, h: 1, x: 1, y: 2 },
    { name: '马超', type: 'general', w: 1, h: 2, x: 0, y: 3 },
    { name: '黄忠', type: 'general', w: 1, h: 2, x: 3, y: 3 },
    { name: '卒', type: 'soldier', w: 1, h: 1, x: 1, y: 3 },
    { name: '卒', type: 'soldier', w: 1, h: 1, x: 2, y: 3 },
    { name: '卒', type: 'soldier', w: 1, h: 1, x: 1, y: 4 },
    { name: '卒', type: 'soldier', w: 1, h: 1, x: 2, y: 4 }
  ],
  
  // 3. 将拥蜀道
  shudao: [
    { name: '曹操', type: 'caocao', w: 2, h: 2, x: 0, y: 0 },
    { name: '关羽', type: 'guanyu', w: 2, h: 1, x: 2, y: 0 },
    { name: '张飞', type: 'general', w: 1, h: 2, x: 2, y: 1 },
    { name: '赵云', type: 'general', w: 1, h: 2, x: 3, y: 1 },
    { name: '马超', type: 'general', w: 1, h: 2, x: 0, y: 2 },
    { name: '黄忠', type: 'general', w: 1, h: 2, x: 1, y: 2 },
    { name: '卒', type: 'soldier', w: 1, h: 1, x: 0, y: 4 },
    { name: '卒', type: 'soldier', w: 1, h: 1, x: 1, y: 4 },
    { name: '卒', type: 'soldier', w: 1, h: 1, x: 2, y: 4 },
    { name: '卒', type: 'soldier', w: 1, h: 1, x: 3, y: 4 }
  ],
  
  // 4. 左右逢源
  fengyuan: [
    { name: '曹操', type: 'caocao', w: 2, h: 2, x: 1, y: 0 },
    { name: '张飞', type: 'general', w: 1, h: 2, x: 0, y: 0 },
    { name: '赵云', type: 'general', w: 1, h: 2, x: 3, y: 0 },
    { name: '关羽', type: 'guanyu', w: 2, h: 1, x: 1, y: 3 },
    { name: '马超', type: 'general', w: 1, h: 2, x: 0, y: 3 },
    { name: '黄忠', type: 'general', w: 1, h: 2, x: 3, y: 3 },
    { name: '卒', type: 'soldier', w: 1, h: 1, x: 0, y: 2 },
    { name: '卒', type: 'soldier', w: 1, h: 1, x: 3, y: 2 },
    { name: '卒', type: 'soldier', w: 1, h: 1, x: 1, y: 2 },
    { name: '卒', type: 'soldier', w: 1, h: 1, x: 2, y: 2 }
  ],
  
  // 5. 兵临城下
  binglin: [
    { name: '曹操', type: 'caocao', w: 2, h: 2, x: 1, y: 2 },
    { name: '关羽', type: 'guanyu', w: 2, h: 1, x: 1, y: 4 },
    { name: '张飞', type: 'general', w: 1, h: 2, x: 1, y: 0 },
    { name: '赵云', type: 'general', w: 1, h: 2, x: 2, y: 0 },
    { name: '马超', type: 'general', w: 1, h: 2, x: 0, y: 2 },
    { name: '黄忠', type: 'general', w: 1, h: 2, x: 3, y: 2 },
    { name: '卒', type: 'soldier', w: 1, h: 1, x: 0, y: 0 },
    { name: '卒', type: 'soldier', w: 1, h: 1, x: 3, y: 0 },
    { name: '卒', type: 'soldier', w: 1, h: 1, x: 0, y: 1 },
    { name: '卒', type: 'soldier', w: 1, h: 1, x: 3, y: 1 }
  ]
};
