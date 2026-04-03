import { StyleSheet, Dimensions, Platform } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 375;

export const createStyles = (theme: Theme) => {
  // Web 端输入框通用样式
  const webInputStyle: any = Platform.OS === 'web' ? {
    outlineStyle: 'none',
  } : {};

  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing['2xl'],
      paddingBottom: Spacing['5xl'],
    },
    header: {
      marginBottom: Spacing.lg,
    },
    
    // 用户信息卡片
    profileCard: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius['2xl'],
      padding: isSmallScreen ? Spacing.lg : Spacing.xl,
      marginBottom: Spacing.lg,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    
    // 用户信息行
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarContainer: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'visible',
    },
    avatarImage: {
      width: 72,
      height: 72,
      borderRadius: 36,
    },
    avatarLoadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarEditBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.backgroundDefault,
    },
    userInfoColumn: {
      marginLeft: Spacing.lg,
      flex: 1,
      justifyContent: 'center',
    },
    // 群组徽章
    groupBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary + '15',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: BorderRadius.full,
      marginTop: Spacing.xs,
      alignSelf: 'flex-start',
    },
    
    // 按钮区域容器（上下排列）
    actionButtonsContainer: {
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: Spacing.xs,
    },
    
    // 修改密码按钮和退出登录按钮统一样式
    changePasswordButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.primary + '15',
      width: 80,
    },
    
    // 退出登录按钮
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.error + '10',
      width: 80,
    },
    loginButton: {
      backgroundColor: theme.primary + '15',
    },
    
    // 身体数据卡片
    bodyDataCard: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius['2xl'],
      padding: isSmallScreen ? Spacing.lg : Spacing.xl,
      marginBottom: Spacing.lg,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    bodyDataHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.primary + '10',
    },
    bodyDataRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    bodyDataItem: {
      alignItems: 'center',
      flex: 1,
    },
    bodyDataDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.border,
    },
    
    // BMI 指示器
    bmiIndicator: {
      marginTop: Spacing.lg,
      paddingTop: Spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    bmiBarContainer: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.backgroundTertiary,
      marginTop: Spacing.sm,
      position: 'relative',
    },
    bmiPointer: {
      position: 'absolute',
      top: -5,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.textPrimary,
      borderWidth: 2,
      borderColor: theme.backgroundDefault,
    },
    bmiLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    bmiAdvice: {
      marginTop: Spacing.sm,
      textAlign: 'center',
      lineHeight: 18,
    },
    
    // 提示信息行
    hintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: Spacing.lg,
      paddingTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    
    // 卡片标题
    cardTitle: {
      marginBottom: 0,
    },
    
    // 历史记录卡片
    historyCard: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius['2xl'],
      padding: isSmallScreen ? Spacing.lg : Spacing.xl,
      marginBottom: Spacing.lg,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    // 时间线容器
    timelineContainer: {
      marginTop: Spacing.md,
      marginBottom: Spacing.lg,
      paddingHorizontal: Spacing.xs,
    },
    timelineBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      position: 'relative',
    },
    timelineNodeWrapper: {
      alignItems: 'center',
      flex: 1,
    },
    timelineNode: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.borderLight,
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timelineNodePassed: {
      backgroundColor: theme.backgroundTertiary,
      borderColor: theme.primary,
    },
    timelineNodeHasData: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    timelineNodeInner: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.buttonPrimaryText,
    },
    timelineLabel: {
      marginTop: 4,
      textAlign: 'center',
    },
    timelineWeight: {
      marginTop: 2,
      fontWeight: '600',
    },
    historyChart: {
      marginTop: Spacing.md,
      alignItems: 'center',
      overflow: 'hidden',
    },
    historyEmpty: {
      alignItems: 'center',
      paddingVertical: Spacing['2xl'],
    },
    // 图表容器
    chartContainer: {
      flexDirection: 'row',
      marginTop: Spacing.md,
      marginBottom: Spacing.lg,
    },
    // ECharts 容器
    echartsContainer: {
      marginTop: Spacing.md,
      marginBottom: Spacing.lg,
      alignItems: 'center',
    },
    // Y轴标签
    yAxisLabels: {
      width: 24,
      height: 150,
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingRight: Spacing.xs,
    },
    // 图表区域
    chartArea: {
      flex: 1,
    },
    // 横坐标标签
    xAxisLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: Spacing.xs,
      paddingHorizontal: Spacing.xs,
    },
    // 体重关键点卡片
    weightKeyPoints: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginTop: Spacing.md,
    },
    weightPointCard: {
      width: '48%',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      borderLeftWidth: 3,
    },
    weightPointHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginBottom: Spacing.xs,
    },
    weightPointDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    // 体重趋势卡片
    weightTrendCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginTop: Spacing.md,
    },
    weightTrendLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    weightTrendInfo: {
      gap: 2,
    },
    weightTrendRight: {
      alignItems: 'flex-end',
    },
    // 图例
    chartLegend: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: Spacing.md,
      gap: Spacing.lg,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    // 体重统计摘要
    weightSummary: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: Spacing.lg,
      paddingTop: Spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      gap: Spacing.md,
    },
    weightSummaryItem: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: theme.backgroundTertiary,
      padding: Spacing.md,
      borderRadius: BorderRadius.lg,
    },
    weightSummaryDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    // 运动统计卡片
    statsCard: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius['2xl'],
      padding: isSmallScreen ? Spacing.lg : Spacing.xl,
      marginBottom: Spacing.lg,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    statsItem: {
      width: '48%',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      padding: isSmallScreen ? Spacing.md : Spacing.lg,
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    statsValue: {
      marginBottom: Spacing.xs,
    },
    // 激励话术卡片
    motivationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginTop: Spacing.lg,
    },
    motivationIcon: {
      marginRight: Spacing.md,
    },
    motivationText: {
      flex: 1,
      lineHeight: 22,
    },
    // 个人相册
    albumCard: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius['2xl'],
      padding: isSmallScreen ? Spacing.lg : Spacing.xl,
      marginBottom: Spacing.lg,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    albumGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    albumPhotoItem: {
      width: '31%',
      aspectRatio: 1,
      borderRadius: BorderRadius.md,
      overflow: 'hidden',
      position: 'relative',
    },
    albumPhoto: {
      width: '100%',
      height: '100%',
    },
    albumPhotoOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: Spacing.xs,
      paddingVertical: Spacing.xs,
    },
    albumEmpty: {
      alignItems: 'center',
      paddingVertical: Spacing['2xl'],
    },
    // 编辑模态框
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalContent: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius['2xl'],
      padding: isSmallScreen ? Spacing.lg : Spacing['2xl'],
      width: '85%',
      maxWidth: 320,
    },
    modalTitle: {
      textAlign: 'center',
      marginBottom: Spacing.xl,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: Spacing.md,
      marginTop: Spacing.xl,
    },
    modalButton: {
      flex: 1,
      paddingVertical: Spacing.lg,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
    },
    modalCancelButton: {
      backgroundColor: theme.backgroundTertiary,
    },
    // 修改密码Modal专用样式
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: Spacing.md,
      padding: Spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
    },
    confirmButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      backgroundColor: theme.primary,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.md,
    },
    inputIcon: {
      marginRight: Spacing.sm,
    },
    inputWithIcon: {
      flex: 1,
      height: 48,
      color: theme.textPrimary,
      fontSize: 16,
    },
    modalConfirmButton: {
      backgroundColor: theme.primary,
    },
    // 提示文字
    hintText: {
      textAlign: 'center',
      marginTop: Spacing.lg,
      paddingHorizontal: Spacing.xl,
    },
    // 手机号绑定弹窗
    phoneModalContent: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius['2xl'],
      padding: isSmallScreen ? Spacing.lg : Spacing['2xl'],
      width: '85%',
      maxWidth: 320,
    },
    modalSubtitle: {
      textAlign: 'center',
      marginBottom: Spacing.xl,
    },
    phoneInput: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      fontSize: 18,
      color: theme.textPrimary,
      textAlign: 'center',
      marginBottom: Spacing.lg,
      ...webInputStyle,
    },
    fullWidthButton: {
      paddingVertical: Spacing.lg,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    resendButton: {
      alignItems: 'center',
      paddingVertical: Spacing.md,
      marginTop: Spacing.md,
    },
    closeButton: {
      alignItems: 'center',
      paddingVertical: Spacing.md,
      marginTop: Spacing.md,
    },
    // 图片查看器
    imageViewerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    imageViewerClose: {
      position: 'absolute',
      top: Platform.OS === 'web' ? 20 : 50,
      right: 20,
      zIndex: 10,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    imageViewerScroll: {
      flex: 1,
      justifyContent: 'center',
    },
    imageViewerScrollContent: {
      flexDirection: 'row',
    },
    imageViewerItem: {
      width: Dimensions.get('window').width,
      height: Dimensions.get('window').height,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageViewerImage: {
      width: '100%',
      height: '80%',
    },
    imageViewerInfo: {
      position: 'absolute',
      bottom: Platform.OS === 'web' ? 60 : 100,
      alignSelf: 'center',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    imageViewerNavButton: {
      position: 'absolute',
      top: '50%',
      marginTop: -22,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    imageViewerPrevButton: {
      left: 20,
    },
    imageViewerNextButton: {
      right: 20,
    },
    imageViewerCounter: {
      position: 'absolute',
      bottom: Platform.OS === 'web' ? 20 : 60,
      alignSelf: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: BorderRadius.md,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    
    // 修改密码Modal
    passwordModalContent: {
      width: '90%',
      maxWidth: 400,
      borderRadius: BorderRadius.xl,
      overflow: 'hidden',
    },
    passwordModalBody: {
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    passwordHint: {
      marginTop: Spacing.xs,
      textAlign: 'center',
    },
    
    // 检查更新按钮
    checkUpdateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius['2xl'],
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
  });
};
