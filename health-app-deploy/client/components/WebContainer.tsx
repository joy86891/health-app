import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface WebContainerProps {
  children: React.ReactNode;
}

/**
 * Web端容器组件
 * 在Web端将内容限制在手机屏幕比例，居中显示
 * 在移动端保持全屏显示
 */
export function WebContainer({ children }: WebContainerProps) {
  const { theme } = useTheme();

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={[styles.webWrapper, { backgroundColor: '#1a1a2e' }]}>
      <View style={[styles.phoneContainer, { backgroundColor: theme.backgroundRoot }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%' as ViewStyle['height'],
  },
  phoneContainer: {
    width: 390, // iPhone 14 Pro 宽度
    maxWidth: '100%' as ViewStyle['width'],
    height: 844, // iPhone 14 Pro 高度
    maxHeight: '100%' as ViewStyle['height'],
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
});
