import { StyleSheet, Platform } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  // Web 端输入框通用样式 - 在函数内部定义以确保 Platform 可用
  // 使用 any 绕过 React Native 类型检查，因为 outlineStyle 是 Web 专有属性
  const webInputStyle: any = Platform.OS === 'web' ? {
    outlineStyle: 'none',
  } : {};

  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingBottom: Spacing['3xl'],
    },
    container: {
      flex: 1,
      paddingHorizontal: Spacing['2xl'],
      paddingTop: Spacing['6xl'],
      paddingBottom: Spacing['4xl'],
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: Spacing['3xl'],
    },
    logoCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xl,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
    appName: {
      marginBottom: Spacing.sm,
    },
    // 表单容器
    formContainer: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius['2xl'],
      padding: Spacing['2xl'],
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    formTitle: {
      textAlign: 'center',
      marginBottom: Spacing.sm,
    },
    formSubtitle: {
      textAlign: 'center',
      marginBottom: Spacing['2xl'],
    },
    // 带图标的输入框
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    inputIcon: {
      marginRight: Spacing.md,
    },
    inputWithIcon: {
      flex: 1,
      paddingVertical: Spacing.lg,
      fontSize: 16,
      color: theme.textPrimary,
      ...webInputStyle,
    },
    eyeIcon: {
      padding: Spacing.sm,
    },
    inputHint: {
      marginLeft: Spacing.sm,
      marginBottom: Spacing.sm,
      marginTop: -Spacing.md,
    },
    // 普通输入框
    input: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      fontSize: 18,
      color: theme.textPrimary,
      marginBottom: Spacing.xl,
      textAlign: 'center',
      ...webInputStyle,
    },
    // 双输入框布局
    inputRow: {
      flexDirection: 'row',
      gap: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    inputFieldWrap: {
      flex: 1,
    },
    inputFieldSmall: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      fontSize: 16,
      color: theme.textPrimary,
      textAlign: 'center',
      ...webInputStyle,
    },
    inputLabel: {
      marginBottom: Spacing.sm,
    },
    inputWithUnit: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
    },
    inputField: {
      flex: 1,
      fontSize: 18,
      color: theme.textPrimary,
      textAlign: 'center',
      padding: 0,
      ...webInputStyle,
    },
    loginButton: {
      backgroundColor: theme.primary,
      borderRadius: BorderRadius.xl,
      paddingVertical: Spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 4,
      marginTop: Spacing.md,
    },
    loginButtonDisabled: {
      opacity: 0.6,
    },
    switchModeButton: {
      alignItems: 'center',
      paddingVertical: Spacing.lg,
      marginTop: Spacing.md,
    },
    skipButton: {
      alignItems: 'center',
      paddingVertical: Spacing.lg,
      marginTop: Spacing.md,
    },
    resendButton: {
      alignItems: 'center',
      paddingVertical: Spacing.lg,
      marginTop: Spacing.md,
    },
    adminButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      marginTop: Spacing['2xl'],
      paddingVertical: Spacing.md,
    },
  });
};
