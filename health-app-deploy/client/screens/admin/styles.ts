import { StyleSheet, Dimensions, Platform } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

const { width } = Dimensions.get('window');

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    // 登录页面
    loginContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xl,
    },
    loginCard: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.xl,
      padding: Spacing['2xl'],
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    loginHeader: {
      alignItems: 'center',
      marginBottom: Spacing['2xl'],
    },
    loginTitle: {
      marginTop: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    loginInput: {
      width: '100%',
      height: 52,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.lg,
      fontSize: 16,
      color: theme.textPrimary,
      marginBottom: Spacing.lg,
    },
    loginButton: {
      width: '100%',
      height: 52,
      backgroundColor: theme.primary,
      borderRadius: BorderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loginButtonDisabled: {
      opacity: 0.6,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.lg,
      marginTop: Spacing.md,
    },

    // 头部
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    logoutButton: {
      padding: Spacing.sm,
    },

    // 标签栏
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: Spacing.lg,
      gap: Spacing.xs,
    },
    tabItemActive: {
      borderBottomWidth: 2,
      borderBottomColor: theme.primary,
    },

    // 内容区域
    content: {
      flex: 1,
    },

    // 统计面板
    statsContainer: {
      padding: Spacing.lg,
    },
    refreshButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    refreshButtonLoading: {
      opacity: 0.6,
    },
    serverInfoCard: {
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.lg,
    },
    serverInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: Spacing['2xl'],
    },
    statCard: {
      width: '48%',
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      marginBottom: 16,
      marginHorizontal: '1%',
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    statIconBg: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    exportSection: {
      marginTop: Spacing.lg,
    },
    sectionTitle: {
      marginBottom: Spacing.lg,
    },
    exportButtons: {
      flexDirection: 'row',
      gap: Spacing.md,
      flexWrap: 'wrap',
    },
    exportButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.lg,
      gap: Spacing.sm,
    },
    exportButtonSecondary: {
      backgroundColor: theme.backgroundTertiary,
    },

    // 列表容器
    listContainer: {
      flex: 1,
    },
    list: {
      padding: Spacing.lg,
    },

    // 搜索栏
    searchBar: {
      flexDirection: 'row',
      padding: Spacing.md,
      gap: Spacing.sm,
      backgroundColor: theme.backgroundDefault,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    searchInput: {
      flex: 1,
      height: 44,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.lg,
      fontSize: 14,
      color: theme.textPrimary,
    },
    searchButton: {
      width: 44,
      height: 44,
      backgroundColor: theme.primary,
      borderRadius: BorderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // 筛选栏
    filterBar: {
      flexDirection: 'row',
      padding: Spacing.md,
      gap: Spacing.sm,
      backgroundColor: theme.backgroundDefault,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    filterInput: {
      flex: 1,
      height: 40,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.lg,
      fontSize: 14,
      color: theme.textPrimary,
    },
    filterButton: {
      width: 40,
      height: 40,
      backgroundColor: theme.primary,
      borderRadius: BorderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // 用户卡片
    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.md,
      backgroundColor: theme.backgroundDefault,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    userAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.lg,
      overflow: 'hidden',
    },
    avatarImage: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    userDetails: {
      flex: 1,
    },
    userActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      gap: Spacing.xs,
    },
    deleteButton: {
      backgroundColor: theme.backgroundTertiary,
    },
    resetPasswordButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
      gap: Spacing.xs,
    },

    // 运动记录卡片
    workoutCard: {
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.md,
      backgroundColor: theme.backgroundDefault,
    },
    workoutHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    workoutDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
    },
    workoutType: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    photoButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginTop: Spacing.md,
      paddingVertical: Spacing.sm,
    },

    // 体重记录卡片
    bodyRecordCard: {
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.md,
      backgroundColor: theme.backgroundDefault,
    },
    bodyRecordHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    bodyRecordDetails: {
      flexDirection: 'row',
      gap: Spacing.xl,
    },
    bodyRecordItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    // 体重汇总卡片
    bodySummaryCard: {
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.md,
      backgroundColor: theme.backgroundDefault,
    },
    bodySummaryHeader: {
      marginBottom: Spacing.md,
    },
    bodySummaryUser: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    bodySummaryContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    bodySummaryItem: {
      alignItems: 'center',
      flex: 1,
    },
    bodySummaryDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.border,
    },
    emptyCard: {
      padding: Spacing['2xl'],
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.backgroundDefault,
    },

    // 分页
    pagination: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xl,
      paddingVertical: Spacing.lg,
    },
    pageButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
    },
    pageButtonDisabled: {
      opacity: 0.5,
    },

    // 弹窗
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xl,
    },
    modalContent: {
      width: '100%',
      maxWidth: 400,
      borderRadius: BorderRadius.xl,
      padding: Spacing['2xl'],
      alignItems: 'center',
    },
    modalTitle: {
      marginBottom: Spacing.lg,
    },
    modalText: {
      marginBottom: Spacing.md,
    },
    passwordBox: {
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.xl,
    },
    modalButton: {
      width: '100%',
      height: 48,
      backgroundColor: theme.primary,
      borderRadius: BorderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalButtonRow: {
      flexDirection: 'row',
      gap: Spacing.md,
      width: '100%',
      marginTop: Spacing.lg,
    },
    modalButtonSecondary: {
      flex: 1,
      backgroundColor: theme.backgroundTertiary,
    },
    modalButtonDanger: {
      flex: 1,
      backgroundColor: theme.error,
    },
    modalHint: {
      marginBottom: Spacing.sm,
      textAlign: 'center',
    },
    confirmInput: {
      width: '100%',
      height: 48,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.lg,
      fontSize: 16,
      color: theme.textPrimary,
      textAlign: 'center',
      marginTop: Spacing.md,
      // Web 平台输入框样式
      ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {}),
    },

    // 照片查看器
    photoViewerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.9)',
      justifyContent: 'center',
    },
    photoViewerClose: {
      position: 'absolute',
      top: 50,
      right: 20,
      zIndex: 10,
      padding: 10,
    },
    photoViewerItem: {
      width: 350,
      justifyContent: 'center',
      alignItems: 'center',
    },
    photoViewerImage: {
      width: 350,
      height: 400,
      borderRadius: BorderRadius.lg,
    },

    // 群组管理
    groupCard: {
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.md,
      backgroundColor: theme.backgroundDefault,
    },
    groupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    groupInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      flex: 1,
    },
    groupText: {
      flex: 1,
    },
    groupActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    groupActionButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
    },
    groupActionButtonDanger: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    groupFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: Spacing.md,
      paddingTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },

    // 系统设置
    settingsContainer: {
      padding: Spacing.lg,
    },
    settingsSection: {
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    settingsTitle: {
      marginBottom: Spacing.lg,
    },
    settingsItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    settingsItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },

    // 群组成员弹窗
    modalContentLarge: {
      width: '100%',
      maxWidth: 500,
      maxHeight: '80%',
      borderRadius: BorderRadius.xl,
      padding: Spacing['2xl'],
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    membersList: {
      marginTop: Spacing.lg,
    },
    memberItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    memberAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    memberInfo: {
      flex: 1,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: Spacing.md,
      width: '100%',
      marginTop: Spacing.lg,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing['3xl'],
    },
    modalCancelButton: {
      flex: 1,
      height: 48,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingContainer: {
      paddingVertical: Spacing['2xl'],
      alignItems: 'center',
    },
  });
};
