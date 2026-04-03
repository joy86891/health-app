import { StyleSheet, Platform, Dimensions } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

// Web 端应用固定宽度 390px，移动端使用实际屏幕尺寸
const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');
const SCREEN_WIDTH = Platform.OS === 'web' ? 390 : WINDOW_WIDTH;
const SCREEN_HEIGHT = Platform.OS === 'web' ? 844 : WINDOW_HEIGHT;

// 图片查看器使用实际窗口尺寸（全屏 Modal）
const VIEWER_WIDTH = WINDOW_WIDTH;
const VIEWER_HEIGHT = WINDOW_HEIGHT;

export const createStyles = (theme: Theme) => {
  // Web 端输入框通用样式 - 在函数内部定义以确保 Platform 可用
  // 使用 any 绕过 React Native 类型检查，因为 outlineStyle 是 Web 专有属性
  const webInputStyle: any = Platform.OS === 'web' ? {
    outlineStyle: 'none',
  } : {};

  return StyleSheet.create({
    // 空状态
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing['2xl'],
    },
    emptyIconCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xl,
    },
    emptyTitle: {
      marginBottom: Spacing.sm,
    },
    emptySubtitle: {
      marginBottom: Spacing['3xl'],
      textAlign: 'center',
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary,
      borderRadius: BorderRadius.xl,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing['2xl'],
      marginBottom: Spacing.lg,
      gap: Spacing.sm,
    },
    joinButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.xl,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing['2xl'],
      borderWidth: 2,
      borderColor: theme.primary,
      gap: Spacing.sm,
    },
    buttonText: {
      marginLeft: Spacing.sm,
    },

    // 模态框
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalContent: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius['2xl'],
      padding: Spacing['2xl'],
      width: '85%',
      maxWidth: 320,
    },
    modalTitle: {
      textAlign: 'center',
      marginBottom: Spacing.sm,
    },
    modalSubtitle: {
      textAlign: 'center',
      marginBottom: Spacing.lg,
    },
    codeInput: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      fontSize: 18,
      color: theme.textPrimary,
      textAlign: 'center',
      marginBottom: Spacing.xl,
      letterSpacing: 4,
      ...webInputStyle,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    modalCancelButton: {
      flex: 1,
      paddingVertical: Spacing.lg,
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
    },
    modalConfirmButton: {
      flex: 1,
      paddingVertical: Spacing.lg,
      alignItems: 'center',
      backgroundColor: theme.primary,
      borderRadius: BorderRadius.lg,
    },

    // 群组头部
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    groupInfo: {
      flex: 1,
    },
    groupNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    editNameButton: {
      padding: Spacing.xs,
    },
    editNameInput: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textPrimary,
      flex: 1,
      ...webInputStyle,
    },
    calendarButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // 消息列表容器 - 占据剩余空间，防止输入框侵占
    messageListContainer: {
      flex: 1,
    },
    // 消息列表
    messageList: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      paddingBottom: Spacing['2xl'],
    },
    messageItem: {
      marginBottom: Spacing.md,
    },
    messageItemOwn: {
      alignItems: 'flex-end',
    },
    // 日期分隔符
    dateSeparator: {
      alignItems: 'center',
      marginVertical: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    // 打卡记录消息（居中显示）
    workoutRecordMessage: {
      alignItems: 'center',
      paddingHorizontal: Spacing.sm,
    },
    workoutRecordOneLine: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      gap: 4,
      flexShrink: 1,
    },
    workoutRecordContent: {
      alignItems: 'center',
      width: '100%',
      maxWidth: 320,
    },
    workoutRecordHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.xs,
      paddingHorizontal: Spacing.sm,
    },
    workoutRecordAvatar: {
      marginRight: 2,
    },
    avatarImageSmall: {
      width: 18,
      height: 18,
      borderRadius: 9,
    },
    avatarPlaceholderSmall: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    workoutRecordUserName: {
      fontWeight: '500',
    },
    workoutRecordTime: {
      marginTop: Spacing.xs,
    },
    systemMessage: {
      alignItems: 'center',
    },
    systemMessageBubble: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
    },
    messageIcon: {
      marginRight: Spacing.xs,
    },
    // 消息行（带头像）
    messageRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: Spacing.sm,
    },
    messageRowOwn: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    messageAvatar: {
      marginHorizontal: Spacing.xs,
    },
    avatarImage: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    avatarPlaceholder: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    messageContentWrap: {
      maxWidth: '75%',
      flexShrink: 1,
    },
    messageContentWrapOwn: {
      alignItems: 'flex-end',
    },
    messageSender: {
      marginBottom: 2,
    },
    messageBubble: {
      maxWidth: '85%',
    },
    messageUserName: {
      marginBottom: Spacing.xs,
    },
    messageContent: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
      alignSelf: 'flex-start',
    },
    messageContentOwn: {
      backgroundColor: theme.primary,
      alignSelf: 'flex-end',
    },
    messageImage: {
      width: 200,
      height: 200,
      borderRadius: BorderRadius.lg,
      marginTop: Spacing.sm,
    },
    messageTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    messageTimeRowOwn: {
      justifyContent: 'flex-end',
    },

    // 表情消息气泡
    emojiMessageBubble: {
      alignItems: 'center',
      justifyContent: 'center',
    },

    // 运动记录消息卡片 - 紧凑模式
    workoutCardCompact: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      alignSelf: 'center',
      minWidth: 200,
      maxWidth: '100%',
    },
    workoutCardCompactInner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      justifyContent: 'center',
    },
    workoutIconSmall: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.backgroundDefault,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.sm,
    },
    workoutIconTiny: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.backgroundDefault,
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    // 图片小标志
    photoIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 8,
      paddingHorizontal: 6,
      paddingVertical: 2,
      backgroundColor: theme.primary + '15',
      borderRadius: BorderRadius.sm,
    },
    
    // 展开的照片区域 - 网格布局（固定方形尺寸）
    workoutPhotosGrid: {
      marginTop: Spacing.sm,
      marginHorizontal: Spacing.sm,
    },
    workoutPhotoRow: {
      flexDirection: 'row',
      gap: Spacing.xs,
      flexWrap: 'wrap',
    },
    workoutPhotoRowCenter: {
      flexDirection: 'row',
      gap: Spacing.xs,
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    workoutPhotoTwoRows: {
      gap: Spacing.xs,
    },
    // 统一的方形照片项（80x80）
    workoutPhotoItem: {
      width: 80,
      height: 80,
      borderRadius: BorderRadius.md,
      overflow: 'hidden',
    },
    workoutPhotoItemImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    workoutPhotosExpanded: {
      marginTop: Spacing.xs,
      marginHorizontal: Spacing.sm,
    },
    workoutPhotosScroll: {
      paddingRight: Spacing.md,
    },
    workoutPhotoThumb: {
      width: 80,
      height: 80,
      borderRadius: BorderRadius.md,
      marginRight: Spacing.sm,
    },
    tapHint: {
      alignItems: 'center',
      paddingTop: Spacing.sm,
    },
    // 运动记录消息卡片
    workoutCard: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
    },
    workoutCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    workoutCardIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.backgroundDefault,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.sm,
    },
    workoutCardTitle: {
      flex: 1,
    },
    workoutCardArrow: {
      padding: Spacing.xs,
    },
    workoutCardExpanded: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.lg,
      minWidth: 240,
    },
    workoutDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.xs,
      justifyContent: 'space-between',
    },
    workoutDetailLabel: {
      minWidth: 70,
    },
    workoutPhoto: {
      width: '100%',
      height: 120,
      borderRadius: BorderRadius.md,
      marginTop: Spacing.sm,
    },

    // 昨日总结卡片
    summaryCard: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.primary,
      borderStyle: 'dashed',
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    summaryIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    summaryHeaderText: {
      flex: 1,
    },
    summaryContent: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    summaryPhotosSection: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.md,
    },
    summaryPhotosTitle: {
      marginBottom: Spacing.sm,
    },
    summaryPhotosScrollWrapper: {
      marginHorizontal: -Spacing.lg,
      paddingHorizontal: Spacing.lg,
    },
    summaryPhotosScroll: {
    },
    summaryPhotoItem: {
      marginRight: Spacing.sm,
    },
    summaryPhoto: {
      width: 100,
      height: 100,
      borderRadius: BorderRadius.md,
    },
    summaryPhotoInfo: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingVertical: 2,
      paddingHorizontal: 4,
      borderBottomLeftRadius: BorderRadius.md,
      borderBottomRightRadius: BorderRadius.md,
    },
    summaryStats: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Spacing.xl,
      paddingVertical: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    summaryStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },

    // 输入框区域 - 固定在底部
    inputArea: {
      flexShrink: 0,
    },
    // 输入框容器
    inputContainer: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    inputActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
      gap: Spacing.md,
    },
    actionButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    messageInput: {
      flex: 1,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.xl,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      fontSize: 16,
      color: theme.textPrimary,
      maxHeight: 100,
      marginRight: Spacing.sm,
      ...webInputStyle,
    },
    sendButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: theme.textMuted,
    },

    // 表情选择器
    emojiPicker: {
      backgroundColor: theme.backgroundDefault,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingVertical: Spacing.md,
      maxHeight: 280,
    },
    emojiSection: {
      marginBottom: Spacing.md,
    },
    emojiSectionTitle: {
      paddingHorizontal: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    emojiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: Spacing.lg,
    },
    emojiButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      margin: 4,
    },
    emojiImageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: Spacing.lg,
    },
    emojiImageButton: {
      width: 60,
      height: 80,
      alignItems: 'center',
      justifyContent: 'center',
      margin: 4,
    },
    emojiIconWrap: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xs,
    },

    // 表情消息
    emojiMessageContainer: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
    },

    // 群号和邀请码区域
    inviteCodeSection: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      backgroundColor: theme.backgroundTertiary,
      marginHorizontal: Spacing.lg,
      marginVertical: Spacing.md,
      borderRadius: BorderRadius.xl,
    },
    codeRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    codeItem: {
      flex: 1,
      alignItems: 'center',
    },
    codeDivider: {
      width: 1,
      height: 50,
      backgroundColor: theme.border,
      marginHorizontal: Spacing.md,
    },
    codeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.xs,
    },
    groupNumberText: {
      letterSpacing: 2,
    },
    inviteCodeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    inviteCodeDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    inviteCodeText: {
      letterSpacing: 3,
    },
    editCodeButton: {
      marginLeft: Spacing.sm,
      padding: Spacing.xs,
    },
    inviteCodeEditRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    inviteCodeInput: {
      flex: 1,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      fontSize: 18,
      color: theme.textPrimary,
      letterSpacing: 4,
      ...webInputStyle,
    },
    inviteCodeInputSmall: {
      flex: 1,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      fontSize: 16,
      color: theme.textPrimary,
      letterSpacing: 2,
      textAlign: 'center',
      ...webInputStyle,
    },
    inviteCodeButton: {
      padding: Spacing.md,
    },
    codeActionButton: {
      padding: Spacing.sm,
      marginLeft: Spacing.xs,
    },

    // 成员数量行
    memberCountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginTop: Spacing.xs,
    },

    // 成员列表弹窗
    membersModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      // PC 端居中显示，移动端底部弹出
      ...(Platform.OS === 'web' ? {
        alignItems: 'center',
        justifyContent: 'center',
      } : {
        justifyContent: 'flex-end',
      }),
    },
    membersModalContent: {
      backgroundColor: theme.backgroundDefault,
      // PC 端使用固定宽度和圆角，移动端仅顶部圆角
      ...(Platform.OS === 'web' ? {
        borderRadius: BorderRadius['2xl'],
        width: 400,
        maxWidth: '90%',
      } : {
        borderTopLeftRadius: BorderRadius['2xl'],
        borderTopRightRadius: BorderRadius['2xl'],
      }),
      maxHeight: '80%',
      minHeight: '50%',
      // 使用 flex 布局确保退出按钮始终可见
      flex: 1,
    },
    membersModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    membersList: {
      paddingVertical: Spacing.sm,
    },
    // 成员列表的 FlatList 容器样式，限制高度确保退出按钮可见
    membersFlatList: {
      flex: 1,
      minHeight: 100,
    },
    memberItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    memberAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    memberName: {
      flex: 1,
      marginLeft: Spacing.md,
    },

    // 成员运动记录
    recordsList: {
      padding: Spacing.lg,
    },
    sectionTitle: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
    },
    // 成员统计卡片
    memberStatsCard: {
      backgroundColor: theme.backgroundTertiary,
      marginHorizontal: Spacing.lg,
      marginVertical: Spacing.md,
      borderRadius: BorderRadius.xl,
      padding: Spacing.lg,
    },
    memberStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: Spacing.md,
    },
    memberStatsItem: {
      alignItems: 'center',
    },
    typeStatsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: Spacing.md,
      paddingTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    typeStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing['3xl'],
    },
    memberRecordCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.sm,
    },
    recordIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.backgroundDefault,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recordInfoWrap: {
      flex: 1,
      marginLeft: Spacing.md,
    },
    recordPhotoSmall: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.sm,
    },

    // 退出群组
    leaveGroupContainer: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    leaveGroupButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.lg,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.backgroundTertiary,
    },
    
    // 踢出成员按钮
    kickButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.sm,
      paddingHorizontal: Spacing.md,
      marginRight: Spacing.sm,
      backgroundColor: theme.error + '15',
      borderRadius: BorderRadius.md,
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
    imageViewerTypeLabel: {
      position: 'absolute',
      top: Platform.OS === 'web' ? 20 : 60,
      left: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: BorderRadius.md,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
