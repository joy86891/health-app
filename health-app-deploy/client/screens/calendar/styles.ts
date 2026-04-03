import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing['2xl'],
      paddingBottom: Spacing['5xl'],
    },
    header: {
      marginBottom: Spacing['2xl'],
    },
    subtitle: {
      marginTop: Spacing.sm,
    },
    calendarContainer: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius['2xl'],
      padding: Spacing.lg,
      marginBottom: Spacing['2xl'],
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    monthNavigation: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.xl,
    },
    monthNavButton: {
      padding: Spacing.sm,
    },
    monthTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    dropdownIcon: {
      marginLeft: Spacing.xs,
    },
    weekDaysRow: {
      flexDirection: 'row',
      marginBottom: Spacing.md,
    },
    weekDayCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: Spacing.sm,
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: '14.28%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayEmpty: {
      width: 36,
      height: 36,
    },
    dayButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayButtonSelected: {
      backgroundColor: theme.primary,
    },
    dayButtonToday: {
      borderWidth: 2,
      borderColor: theme.primary,
    },
    dayText: {
      textAlign: 'center',
    },
    workoutDot: {
      position: 'absolute',
      bottom: 4,
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    recordsSection: {
      marginBottom: Spacing['2xl'],
    },
    sectionTitle: {
      marginBottom: Spacing.lg,
    },
    emptyState: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.xl,
      padding: Spacing['3xl'],
      alignItems: 'center',
    },
    emptyText: {
      marginTop: Spacing.md,
    },
    recordCard: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.xl,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    recordIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recordInfo: {
      marginLeft: Spacing.lg,
      flex: 1,
    },
    recordDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.xs,
    },
    recordPhoto: {
      width: 48,
      height: 48,
      borderRadius: BorderRadius.sm,
      marginLeft: Spacing.sm,
    },
    deleteButton: {
      padding: Spacing.sm,
      marginLeft: Spacing.sm,
    },

    // 激励话术卡片
    motivationCard: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius['2xl'],
      padding: Spacing.lg,
      marginBottom: Spacing['2xl'],
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 2,
    },
    motivationIcon: {
      marginRight: Spacing.md,
    },
    motivationText: {
      flex: 1,
      lineHeight: 24,
    },

    // 年月选择器弹窗
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    datePickerModal: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius['2xl'],
      padding: Spacing.xl,
      width: '90%',
      maxWidth: 400,
    },
    modalTitle: {
      textAlign: 'center',
      marginBottom: Spacing.xl,
    },
    yearRow: {
      marginBottom: Spacing.lg,
    },
    yearHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    yearLabel: {
      fontWeight: '600',
    },
    monthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    monthButton: {
      width: '23%',
      paddingVertical: Spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundTertiary,
    },
    monthButtonActive: {
      backgroundColor: theme.primary,
    },
    futureYearButton: {
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      alignItems: 'center',
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundTertiary,
      marginTop: Spacing.xs,
    },
  });
};
