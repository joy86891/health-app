import { useEffect, useState, useCallback } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ColorSchemeProvider } from '@/hooks/useColorScheme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { WebContainer } from '@/components/WebContainer';
import { useStartupUpdate } from '@/hooks/useStartupUpdate';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { wakeUpServer } from '@/utils/wakeUp';

LogBox.ignoreLogs([
  "TurboModuleRegistrygetEnforcing(...): 'RNMapsAirModule' could not be found",
]);

// APK 更新提示组件
function ApkUpdateBanner({ 
  visible, 
  latestVersion, 
  onClose 
}: { 
  visible: boolean; 
  latestVersion?: string;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const router = useSafeRouter();

  const handleGoToProfile = useCallback(() => {
    onClose();
    router.navigate('/(tabs)');
    // 切换到"我的"Tab
  }, [onClose, router]);

  if (!visible) return null;

  return (
    <View style={[styles.banner, { backgroundColor: theme.primary }]}>
      <FontAwesome6 name="circle-down" size={20} color="#fff" />
      <View style={styles.bannerContent}>
        <Text style={styles.bannerTitle}>发现新版本 {latestVersion}</Text>
        <Text style={styles.bannerDesc}>请前往「我的」页面下载更新</Text>
      </View>
      <TouchableOpacity onPress={handleGoToProfile} style={styles.bannerButton}>
        <Text style={styles.bannerButtonText}>去更新</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onClose} style={styles.bannerClose}>
        <FontAwesome6 name="xmark" size={16} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
    </View>
  );
}

function RootLayoutNav() {
  const rootState = useRootNavigationState();
  const segments = useSegments();
  const router = useSafeRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();
  
  // 启动时更新检查（仅 APK）
  const { state: updateState, checkForUpdate } = useStartupUpdate();

  // 🌟 启动时唤醒服务
  useEffect(() => {
    wakeUpServer();
  }, []);

  // 启动时检查更新
  useEffect(() => {
    if (!rootState?.key || isLoading) return;
    if (!isAuthenticated) return;
    
    // 延迟检查，避免影响启动
    const timer = setTimeout(() => {
      checkForUpdate();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [rootState?.key, isAuthenticated, isLoading, checkForUpdate]);

  // 根据检查结果显示提示（使用 useMemo 避免在 effect 中调用 setState）
  const shouldShowApkBanner = updateState.hasChecked && updateState.updateType === 'apk';

  useEffect(() => {
    // 等待导航就绪和鉴权加载完成
    if (!rootState?.key || isLoading) return;

    const inLoginRoute = segments.includes('login');
    const inAdminRoute = segments.includes('admin');

    // 未登录且不在登录页或管理后台 -> 跳转登录页
    if (!isAuthenticated && !inLoginRoute && !inAdminRoute) {
      router.replace('/login');
    }

    // 已登录但在登录页 -> 跳转首页
    if (isAuthenticated && inLoginRoute) {
      router.replace('/');
    }
  }, [rootState?.key, isAuthenticated, isLoading, segments, router]);

  return (
    <>
      {/* APK 更新提示 Banner */}
      <ApkUpdateBanner
        visible={shouldShowApkBanner}
        latestVersion={updateState.latestVersion}
        onClose={() => {}}
      />
      
      <Stack screenOptions={{
        animation: 'slide_from_right',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        headerShown: false
      }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="group-calendar" />
        <Stack.Screen name="admin" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  bannerContent: {
    flex: 1,
    marginLeft: 12,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bannerDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  bannerButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bannerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bannerClose: {
    marginLeft: 8,
    padding: 4,
  },
});

export default function RootLayout() {
  return (
    <AuthProvider>
      <ColorSchemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <WebContainer>
            <StatusBar style="dark"></StatusBar>
            <RootLayoutNav />
            <Toast />
          </WebContainer>
        </GestureHandlerRootView>
      </ColorSchemeProvider>
    </AuthProvider>
  );
}
