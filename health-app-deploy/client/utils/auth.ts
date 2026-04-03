import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 获取认证请求头
 * 优先使用 userId，如果没有则使用 deviceId
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // 从本地存储获取用户ID
  try {
    const userJson = await AsyncStorage.getItem('user_data');
    if (userJson) {
      const user = JSON.parse(userJson);
      if (user.id) {
        headers['x-user-id'] = String(user.id);
        return headers;
      }
    }
  } catch (error) {
    console.error('[Auth] 获取用户ID失败:', error);
  }

  // 如果没有用户ID，使用设备ID
  const deviceId = await AsyncStorage.getItem('deviceId');
  if (deviceId) {
    headers['x-device-id'] = deviceId;
  }

  return headers;
}

/**
 * 在 React 组件中使用的认证 header hook
 * 优先使用 userId，如果没有则使用 deviceId
 */
export function useAuthHeaders(): () => Promise<Record<string, string>> {
  const { user } = useAuth();

  return async () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 优先使用已登录用户的ID
    if (user?.id) {
      headers['x-user-id'] = String(user.id);
      return headers;
    }

    // 如果没有用户ID，使用设备ID
    const deviceId = await AsyncStorage.getItem('deviceId');
    if (deviceId) {
      headers['x-device-id'] = deviceId;
    }

    return headers;
  };
}
