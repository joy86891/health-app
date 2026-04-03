/**
 * 服务唤醒工具
 * 在 APP 启动时自动唤醒后端服务
 */

const HEALTH_CHECK_URL = 'https://561b9af8-c1e5-426c-b873-60191e12cc56.dev.coze.site/api/v1/health';
const WAKEUP_TIMEOUT = 30000; // 30秒超时

// 缓存上次唤醒时间，避免频繁唤醒
let lastWakeTime = 0;
const WAKE_INTERVAL = 5 * 60 * 1000; // 5分钟内不重复唤醒

/**
 * 唤醒后端服务
 * @param force 是否强制唤醒（忽略缓存时间）
 * @returns Promise<boolean> 是否唤醒成功
 */
export async function wakeUpServer(force = false): Promise<boolean> {
  const now = Date.now();
  
  // 如果距离上次唤醒不到5分钟，且不是强制唤醒，则跳过
  if (!force && now - lastWakeTime < WAKE_INTERVAL) {
    console.log('[WakeUp] 服务最近已唤醒，跳过');
    return true;
  }

  console.log('[WakeUp] 开始唤醒服务...');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WAKEUP_TIMEOUT);

    const response = await fetch(HEALTH_CHECK_URL, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      console.log('[WakeUp] 服务唤醒成功:', data);
      lastWakeTime = now;
      return true;
    } else {
      console.log('[WakeUp] 服务响应异常:', response.status);
      return false;
    }
  } catch (error) {
    // 如果是超时，可能是服务正在启动，也算成功
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[WakeUp] 服务可能正在启动中...');
      lastWakeTime = now;
      return true;
    }
    console.log('[WakeUp] 唤醒失败:', error);
    return false;
  }
}

/**
 * 检查服务是否在线
 * @returns Promise<boolean> 服务是否在线
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(HEALTH_CHECK_URL, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}
