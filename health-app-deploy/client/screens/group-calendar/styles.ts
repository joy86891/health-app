import { StyleSheet, Platform, Dimensions } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

// 图片查看器使用实际窗口尺寸（全屏 Modal）
const { width: VIEWER_WIDTH, height: VIEWER_HEIGHT } = Dimensions.get('window');

export const createStyles = (theme: Theme) => {
  // Web 端输入框通用样式
  const webInputStyle: any = Platform.OS === 'web' ? {
    outlineStyle: 'none',
  } : {};

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: Spacing.lg,
      paddingBottom: Spacing['3xl'],
    },

    // 头部
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.backgroundDefault,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      marginBottom: 0,
    },

    // Tab栏
    tabBar: {
      flexDirection: 'row',
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.lg,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.xl,
      padding: Spacing.xs,
    },
    tabItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
    },
    tabItemActive: {
      backgroundColor: theme.backgroundTertiary,
    },

    // 年月选择器
    yearMonthPicker: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.md,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
      zIndex: 100,
    },
    dropdownContainer: {
      position: 'relative',
      zIndex: 101,
    },
    dropdownButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
    },
    dropdownMenu: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      marginTop: Spacing.xs,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
      maxHeight: 200,
      zIndex: 1000,
    },
    dropdownItem: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    dropdownItemActive: {
      backgroundColor: theme.backgroundTertiary,
    },

    // 月选择器网格
    monthPickerGrid: {
      position: 'absolute',
      top: '100%',
      left: '50%',
      transform: [{ translateX: -80 }],
      width: 168,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      marginTop: Spacing.xs,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
      padding: Spacing.xs,
      zIndex: 1000,
    },
    monthPickerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: Spacing.xs,
    },
    monthPickerItem: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.md,
    },
    monthPickerItemActive: {
      backgroundColor: theme.primary,
    },

    // 日历网格
    calendarContainer: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.xl,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    weekDaysRow: {
      flexDirection: 'row',
      marginBottom: Spacing.sm,
    },
    weekDay: {
      flex: 1,
      textAlign: 'center',
      paddingVertical: Spacing.sm,
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: `${100/7}%`,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 2,
    },
    dayCellContent: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.md,
    },
    todayCell: {
      borderWidth: 2,
      borderColor: theme.primary,
    },
    hasRecordCell: {
      backgroundColor: theme.backgroundTertiary,
    },
    emptyCell: {},
    selectedDateCell: {
      borderWidth: 2,
      borderColor: theme.accent,
    },
    todayHasRecordCell: {
      backgroundColor: theme.backgroundTertiary,
      borderWidth: 2,
      borderColor: theme.primary,
    },

    // 成员打卡指示器
    memberIndicators: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginTop: 2,
      gap: 1,
    },
    memberDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    countBadge: {
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },

    // 图例
    legendContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendHasRecord: {
      width: 24,
      height: 24,
      borderRadius: 6,
      backgroundColor: theme.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // 月度冠军卡片
    championCard: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.xl,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: 1,
      borderColor: '#F59E0B33',
    },
    championHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    championList: {
      gap: Spacing.sm,
    },
    championItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
      padding: Spacing.md,
      borderRadius: BorderRadius.lg,
    },
    championAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    championInfo: {
      flex: 1,
      marginLeft: Spacing.md,
    },
    championStats: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },

    // 选中日期运动记录区域
    selectedDateSection: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.xl,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    selectedDateHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    dateStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      marginBottom: Spacing.md,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
    },
    dateStatItem: {
      alignItems: 'center',
    },
    dateStatDivider: {
      width: 1,
      height: 30,
      backgroundColor: theme.border,
    },
    selectedDateList: {
      gap: Spacing.sm,
    },
    selectedDateItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    selectedDateItemInfo: {
      flex: 1,
      marginLeft: Spacing.md,
    },
    selectedDatePhoto: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.md,
    },

    // 成员列表
    membersSection: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.xl,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    sectionTitle: {
      marginBottom: Spacing.md,
    },
    rankingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.md,
    },
    rankingTabs: {
      flexDirection: 'row',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      padding: 2,
    },
    rankingTab: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
    },
    rankingTabActive: {
      backgroundColor: theme.backgroundDefault,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
    },
    championRow: {
      backgroundColor: '#FFF7ED',
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.md,
      marginBottom: Spacing.xs,
    },
    rankContainer: {
      width: 28,
      alignItems: 'center',
    },
    rankNumber: {
      fontWeight: '600',
    },
    championBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#FEF3C7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    memberColorDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: Spacing.md,
    },
    memberName: {
      flex: 1,
    },

    // 日期详情弹窗
    dateDetailOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    dateDetailModal: {
      width: '92%',
      maxHeight: '80%',
      borderRadius: BorderRadius.xl,
      overflow: 'hidden',
    },
    dateDetailHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    
    // 统计概览
    dateStatsOverview: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingVertical: Spacing.md,
      backgroundColor: theme.backgroundTertiary,
    },
    
    // 筛选栏
    filterBar: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.md,
      height: 36,
      gap: Spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: theme.textPrimary,
      paddingVertical: 0,
      ...webInputStyle,
    },
    
    // 类型筛选标签
    typeFilterScroll: {
      maxHeight: 40,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    typeFilterContainer: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      gap: Spacing.sm,
    },
    typeFilterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.backgroundTertiary,
    },
    typeFilterChipActive: {
      backgroundColor: theme.primary,
    },
    
    // 打卡列表
    dateDetailList: {
      flex: 1,
    },
    dateDetailListContent: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
    },
    dateDetailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      height: 52,
    },
    dateDetailIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.sm,
    },
    dateDetailInfo: {
      flex: 1,
    },
    dateDetailPhoto: {
      width: 36,
      height: 36,
      borderRadius: BorderRadius.sm,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing['2xl'],
      gap: Spacing.sm,
    },

    // 统计卡片
    statsCard: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.xl,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: Spacing.sm,
    },
    statsItem: {
      alignItems: 'center',
    },
    typeStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
    },
    typeStatsIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    typeStatsInfo: {
      flex: 1,
    },
    typeStatsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: Spacing.xs,
    },
    typeStatsBar: {
      height: 6,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: 3,
      overflow: 'hidden',
    },
    typeStatsBarFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: 3,
    },
    memberStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
    },

    // 相册
    albumSection: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.xl,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    photoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    photoItem: {
      width: '31%',
      aspectRatio: 1,
      borderRadius: BorderRadius.md,
      overflow: 'hidden',
    },
    photoImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    photoOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: Spacing.xs,
      paddingVertical: 4,
    },
    emptyPhotoState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing['2xl'],
      gap: Spacing.md,
    },
    memberAlbumRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },

    // 空状态
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.lg,
    },

    // 图片查看器
    imageViewerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    imageViewerClose: {
      position: 'absolute',
      top: Platform.OS === 'web' ? 20 : 60,
      right: 20,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    imageViewerScroll: {
      flex: 1,
    },
    imageViewerScrollContent: {
      flexDirection: 'row',
    },
    imageViewerItem: {
      width: VIEWER_WIDTH,
      height: VIEWER_HEIGHT,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageViewerImage: {
      width: VIEWER_WIDTH - 40,
      height: VIEWER_HEIGHT * 0.7,
      maxWidth: 800,
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
    imageViewerCounter: {
      position: 'absolute',
      bottom: Platform.OS === 'web' ? 20 : 60,
      alignSelf: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: BorderRadius.md,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    imageViewerNavButton: {
      position: 'absolute',
      top: '50%',
      marginTop: -22,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
  });
};
