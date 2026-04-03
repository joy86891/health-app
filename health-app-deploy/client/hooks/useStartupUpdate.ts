import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { getApiUrl } from '@/config/api';

type UpdateType = 'none' | 'apk';

interface StartupUpdateState {
  isChecking: boolean;
  updateType: UpdateType;
  latestVersion?: string;
  releaseNotes?: string;
  hasChecked: boolean;
}

interface StartupUpdateResult {
  state: StartupUpdateState;
  checkForUpdate: () => Promise<void>;
}

/**
 * 启动时更新检查 Hook
 * 
 * 国内适配版本：禁用 OTA 热更新（Expo 服务器需翻墙）
 * 只检查 APK 更新，提示用户去个人中心下载新版本
 */
export function useStartupUpdate(): StartupUpdateResult {
  const [state, setState] = useState<StartupUpdateState>({
    isChecking: false,
    updateType: 'none',
    hasChecked: false,
  });

  const hasCheckedRef = useRef(false);

  const checkForUpdate = useCallback(async () => {
    // 防止重复检查
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    // 开发环境或 Web 端跳过
    if (__DEV__ || Platform.OS === 'web') {
      console.log('[StartupUpdate] 开发环境或Web端，跳过更新检查');
      setState(prev => ({ ...prev, hasChecked: true }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isChecking: true }));

      // 当前版本信息
      const currentVersion = Constants.expoConfig?.version || '1.0.0';
      const currentVersionCode = Constants.expoConfig?.android?.versionCode || 1000001;

      console.log('[StartupUpdate] 检查更新, 当前版本:', currentVersion, 'versionCode:', currentVersionCode);

      // 检查 APK 更新
      /**
       * 服务端文件：server/src/routes/version.ts
       * 接口：GET /api/v1/version/check
       * Query 参数：platform: string, currentVersion: string, versionCode: number
       */
      const response = await fetch(
        getApiUrl(`/api/v1/version/check?platform=android&currentVersion=${currentVersion}&versionCode=${currentVersionCode}`)
      );

      const result = await response.json();

      if (result.success && result.data) {
        const { needsUpdate, latestVersion, downloadUrl, releaseNotes } = result.data;

        if (needsUpdate && downloadUrl) {
          // 有 APK 更新，需要提示用户去个人中心下载
          console.log('[StartupUpdate] 发现 APK 更新:', latestVersion);
          setState({
            isChecking: false,
            updateType: 'apk',
            latestVersion,
            releaseNotes,
            hasChecked: true,
          });
          return;
        }
      }

      // 没有更新
      console.log('[StartupUpdate] 已是最新版本');
      setState({
        isChecking: false,
        updateType: 'none',
        hasChecked: true,
      });

    } catch (error) {
      console.error('[StartupUpdate] 检查更新失败:', error);
      setState({
        isChecking: false,
        updateType: 'none',
        hasChecked: true,
      });
    }
  }, []);

  return {
    state,
    checkForUpdate,
  };
}
