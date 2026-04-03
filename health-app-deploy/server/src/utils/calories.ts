/**
 * 运动卡路里消耗估算工具
 * 公式: 卡路里(kcal) = MET值 × 体重(kg) × 时间(小时)
 * 默认体重: 65kg
 */

// 各运动类型的MET值（代谢当量）
const WORKOUT_MET: { [key: string]: number } = {
  '跑步': 8.0,      // 中等速度跑步
  '健身': 5.5,      // 力量训练
  '骑行': 6.0,      // 中等速度骑行
  '瑜伽': 3.0,      // 哈他瑜伽
  '舞蹈': 6.0,      // 一般舞蹈
  '健身操': 6.5,    // 有氧健身操
  '游泳': 8.0,      // 中等强度游泳
  '羽毛球': 5.5,    // 一般羽毛球
  '登山': 7.5,      // 中等强度登山
  '其他': 4.0,      // 默认值
};

// 默认体重(kg)
const DEFAULT_WEIGHT = 65;

/**
 * 计算卡路里消耗
 * @param type 运动类型
 * @param duration 运动时长(分钟)
 * @param weight 体重(kg)，可选，默认65kg
 * @returns 卡路里消耗(kcal)
 */
export function calculateCalories(type: string, duration: number, weight: number = DEFAULT_WEIGHT): number {
  const met = WORKOUT_MET[type] || WORKOUT_MET['其他'];
  const hours = duration / 60;
  const calories = met * weight * hours;
  return Math.round(calories);
}

/**
 * 格式化卡路里显示
 * @param calories 卡路里值
 * @returns 格式化字符串
 */
export function formatCalories(calories: number): string {
  if (calories >= 1000) {
    return `${(calories / 1000).toFixed(1)}k kcal`;
  }
  return `${calories} kcal`;
}

/**
 * 获取运动的MET值
 * @param type 运动类型
 * @returns MET值
 */
export function getWorkoutMet(type: string): number {
  return WORKOUT_MET[type] || WORKOUT_MET['其他'];
}

/**
 * 获取所有运动类型及其MET值
 */
export function getAllWorkoutMets(): { type: string; met: number }[] {
  return Object.entries(WORKOUT_MET).map(([type, met]) => ({ type, met }));
}
