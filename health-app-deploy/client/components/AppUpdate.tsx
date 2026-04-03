import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Linking from 'expo-linking';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from './ThemedText';

// 获取文档目录（兼容 legacy 模式）
const getDocumentDirectory = (): string | null => {
  return (FileSystem as any).documentDirectory || null;
};
import { ThemedView } from './ThemedView';
import { Spacing, BorderRadius } from '@/constants/theme';
import Constants from 'expo-constants';
import { getApiUrl } from '@/config/api';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'error' | 'latest';

interface AppUpdateState {
  status: UpdateStatus;
  progress: number;
  message: string;
  latestVersion?: string;
  updateUrl?: string;
  releaseNotes?: string;
}

// APK 下载目录 - 使用函数获取文档目录
const getApkDownloadDir = (): string => {
  const docDir = getDocumentDirectory();
  return docDir ? docDir + 'updates/' : '';
};
const APK_FILE_NAME = 'app-update.apk';

/**
 * 应用更新 Hook
 * 
 * 国内适配版本：禁用 OTA 热更新（Expo 服务器需翻墙）
 * 只支持 APK 下载更新
 */
export function useAppUpdate() {
  const [state, setState] = useState<AppUpdateState>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const [showModal, setShowModal] = useState(false);
  const { theme } = useTheme();

  // 当前版本信息 - 直接使用 expoConfig.version（已改为日期格式）
  const currentVersion = Constants.expoConfig?.version || '1.0.0';
  const currentVersionCode = Constants.expoConfig?.android?.versionCode || 1000001;
  
  console.log('[AppUpdate] currentVersion:', currentVersion, 'versionCode:', currentVersionCode);

  // 检查更新
  const checkForUpdate = useCallback(async () => {
    // Web 端不支持
    if (Platform.OS === 'web') {
      setState({ status: 'checking', progress: 0, message: '正在检查更新...' });
      setTimeout(() => {
        setState({ status: 'latest', progress: 0, message: 'Web端暂不支持' });
        setTimeout(() => {
          setState({ status: 'idle', progress: 0, message: '' });
        }, 2000);
      }, 500);
      return;
    }

    try {
      setState({ status: 'checking', progress: 0, message: '正在检查更新...' });

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
        const { needsUpdate, latestVersion, downloadUrl, releaseNotes, isForced } = result.data;

        if (needsUpdate && downloadUrl) {
          // 需要 APK 更新
          setState({
            status: 'available',
            progress: 0,
            message: '发现新版本',
            latestVersion,
            updateUrl: downloadUrl,
            releaseNotes,
          });
          setShowModal(true);
        } else {
          // 已是最新版本
          setState({ status: 'latest', progress: 0, message: '当前已是最新版本' });
          // 3秒后恢复 idle 状态
          setTimeout(() => {
            setState(prev => prev.status === 'latest' ? { status: 'idle', progress: 0, message: '' } : prev);
          }, 3000);
        }
      } else {
        // 接口返回失败，显示已是最新
        setState({ status: 'latest', progress: 0, message: '当前已是最新版本' });
        setTimeout(() => {
          setState(prev => prev.status === 'latest' ? { status: 'idle', progress: 0, message: '' } : prev);
        }, 3000);
      }
    } catch (error) {
      console.error('检查更新失败:', error);
      setState({
        status: 'error',
        progress: 0,
        message: '检查更新失败',
      });
      Alert.alert('错误', '检查更新失败，请稍后重试');
    }
  }, [currentVersion, currentVersionCode]);

  // 下载并安装 APK
  const downloadAndInstall = useCallback(async () => {
    if (!state.updateUrl) {
      Alert.alert('错误', '下载地址无效');
      return;
    }

    try {
      setState(prev => ({ ...prev, status: 'downloading', message: '正在下载更新...', progress: 0 }));

      // 获取下载目录
      const apkDownloadDir = getApkDownloadDir();
      if (!apkDownloadDir) {
        throw new Error('无法获取存储目录');
      }

      // 确保目录存在
      const dirInfo = await (FileSystem as any).getInfoAsync(apkDownloadDir);
      if (!dirInfo.exists) {
        await (FileSystem as any).makeDirectoryAsync(apkDownloadDir, { intermediates: true });
      }

      const apkPath = apkDownloadDir + APK_FILE_NAME;

      // 使用 Promise.race 实现超时检测（60秒超时）
      const downloadPromise = (FileSystem as any).downloadAsync(
        state.updateUrl,
        apkPath
      );

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('下载超时，请检查网络连接或使用浏览器下载')), 60000);
      });

      // 模拟进度更新（因为 legacy 模式不支持进度回调）
      const progressInterval = setInterval(() => {
        setState(prev => {
          if (prev.status === 'downloading' && prev.progress < 90) {
            return { ...prev, progress: prev.progress + 2, message: '正在下载更新...' };
          }
          return prev;
        });
      }, 1000);

      let downloadResult;
      try {
        downloadResult = await Promise.race([downloadPromise, timeoutPromise]);
      } finally {
        clearInterval(progressInterval);
      }

      // 验证文件存在
      const fileInfo = await (FileSystem as any).getInfoAsync(downloadResult.uri);
      if (!fileInfo.exists) {
        throw new Error('下载文件不存在');
      }

      setState(prev => ({ ...prev, progress: 100, message: '下载完成，正在安装...' }));

      // 安装 APK
      if (Platform.OS === 'android') {
        const contentUri = await (FileSystem as any).getContentUriAsync(downloadResult.uri);
        await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
          data: contentUri,
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        });
      }

      // 关闭弹窗
      setShowModal(false);
      setState({ status: 'idle', progress: 0, message: '' });

    } catch (error: any) {
      console.error('下载安装失败:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        message: error.message || '下载安装失败',
      }));
      
      // 如果是网络问题，提供浏览器下载选项
      const isNetworkError = error.message?.includes('超时') || error.message?.includes('network');
      
      Alert.alert(
        '下载失败',
        error.message || '下载安装失败，请稍后重试',
        isNetworkError ? [
          { text: '取消', style: 'cancel' },
          { 
            text: '使用浏览器下载', 
            onPress: () => {
              // 使用浏览器打开下载链接
              if (state.updateUrl) {
                Linking.openURL(state.updateUrl);
              }
            }
          }
        ] : [
          { text: '确定', style: 'cancel' }
        ]
      );
    }
  }, [state.updateUrl]);

  // 关闭弹窗
  const closeModal = useCallback(() => {
    setShowModal(false);
    setState({ status: 'idle', progress: 0, message: '' });
  }, []);

  return {
    state,
    showModal,
    currentVersion,
    checkForUpdate,
    downloadAndInstall,
    closeModal,
  };
}

// 更新弹窗组件
interface AppUpdateModalProps {
  visible: boolean;
  state: AppUpdateState;
  currentVersion: string;
  onDownload: () => void;
  onClose: () => void;
}

export function AppUpdateModal({
  visible,
  state,
  currentVersion,
  onDownload,
  onClose,
}: AppUpdateModalProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const renderContent = () => {
    switch (state.status) {
      case 'checking':
        return (
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
            <ThemedText variant="h3" color={theme.textPrimary} style={styles.title}>
              检查更新
            </ThemedText>
            <ThemedText variant="body" color={theme.textSecondary}>
              正在检查是否有新版本...
            </ThemedText>
          </View>
        );

      case 'available':
        return (
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <FontAwesome6 name="gift" size={28} color={theme.primary} />
            </View>
            <ThemedText variant="h3" color={theme.textPrimary} style={styles.title}>
              发现新版本
            </ThemedText>
            <ThemedText variant="body" color={theme.textSecondary}>
              当前版本: {currentVersion}
            </ThemedText>
            <ThemedText variant="bodyMedium" color={theme.primary}>
              最新版本: {state.latestVersion}
            </ThemedText>
            {state.releaseNotes && (
              <View style={styles.releaseNotes}>
                <ThemedText variant="caption" color={theme.textMuted}>
                  {state.releaseNotes}
                </ThemedText>
              </View>
            )}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
                <ThemedText variant="bodyMedium" color={theme.textSecondary}>稍后更新</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={onDownload}>
                <ThemedText variant="bodyMedium" color={theme.buttonPrimaryText}>立即更新</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'downloading':
        return (
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <FontAwesome6 name="cloud-arrow-down" size={28} color={theme.primary} />
            </View>
            <ThemedText variant="h3" color={theme.textPrimary} style={styles.title}>
              正在下载
            </ThemedText>
            <View style={styles.progressContainer}>
              <View style={styles.progressBackground}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${state.progress}%`, backgroundColor: theme.primary }
                  ]}
                />
              </View>
              <ThemedText variant="body" color={theme.textSecondary}>
                {Math.round(state.progress)}%
              </ThemedText>
            </View>
            <ThemedText variant="caption" color={theme.textMuted}>
              请勿关闭应用
            </ThemedText>
          </View>
        );

      case 'error':
        return (
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <FontAwesome6 name="circle-xmark" size={28} color={theme.error} />
            </View>
            <ThemedText variant="h3" color={theme.error} style={styles.title}>
              更新失败
            </ThemedText>
            <ThemedText variant="body" color={theme.textSecondary} style={styles.desc}>
              {state.message || '更新过程中出现错误，请稍后重试'}
            </ThemedText>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <ThemedText variant="bodyMedium" color={theme.textSecondary}>关闭</ThemedText>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={state.status === 'downloading' ? undefined : onClose}
    >
      <View style={styles.overlay}>
        <ThemedView level="default" style={styles.modal}>
          {renderContent()}
        </ThemedView>
      </View>
    </Modal>
  );
}

const createStyles = (theme: any) =>
  ({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.lg,
    },
    modal: {
      width: '100%',
      maxWidth: 340,
      borderRadius: BorderRadius.xl,
      padding: Spacing.xl,
    },
    content: {
      alignItems: 'center',
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    title: {
      marginBottom: Spacing.sm,
    },
    desc: {
      textAlign: 'center',
      marginBottom: Spacing.xl,
    },
    releaseNotes: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginVertical: Spacing.md,
      width: '100%',
    },
    progressContainer: {
      width: '100%',
      alignItems: 'center',
      marginVertical: Spacing.lg,
    },
    progressBackground: {
      width: '100%',
      height: 8,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: Spacing.sm,
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: Spacing.md,
      marginTop: Spacing.lg,
    },
    primaryButton: {
      backgroundColor: theme.primary,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.lg,
      minWidth: 120,
      alignItems: 'center',
    },
    secondaryButton: {
      backgroundColor: theme.backgroundTertiary,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.lg,
      minWidth: 120,
      alignItems: 'center',
    },
  } as const);
