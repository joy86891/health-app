import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { createStyles } from './styles';
import { FontAwesome6 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getAuthHeaders } from '@/utils/auth';
import { getRandomQuote } from '@/constants/motivationQuotes';
import { getApiUrl } from '@/config/api';

interface WorkoutRecord {
  id: number;
  user_id: string;
  date: string;
  duration: number;
  type: string;
  photo_url?: string;
  photo_urls?: string[];
  calories?: number;
  created_at: string;
  updated_at: string;
}

const WORKOUT_ICONS: { [key: string]: string } = {
  '跑步': 'person-running',
  '健身': 'dumbbell',
  '骑行': 'bicycle',
  '瑜伽': 'person-praying',
  '舞蹈': 'person',
  '健身操': 'heart-pulse',
  '游泳': 'person-swimming',
  '羽毛球': 'shuffle',
  '登山': 'mountain',
  '其他': 'plus',
};

export default function CalendarScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [records, setRecords] = useState<WorkoutRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [motivationQuote, setMotivationQuote] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(getApiUrl('/api/v1/workouts'), {
        headers,
      });

      const result = await response.json();
      if (result.success) {
        setRecords(result.data || []);
      }
    } catch (error) {
      console.error('获取运动记录失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRecords();
    }, [fetchRecords])
  );

  // 默认选中当天
  useEffect(() => {
    if (records.length > 0 && !selectedDate) {
      const today = new Date().toISOString().split('T')[0];
      const hasTodayRecord = records.some(r => r.date === today);
      if (hasTodayRecord) {
        setSelectedDate(today);
      }
    }
  }, [records, selectedDate]);

  // 监听 records 变化，自动更新激励话术
  useEffect(() => {
    if (records.length === 0) {
      setMotivationQuote('');
      return;
    }
    
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weekDates = new Set<string>();
    records.forEach((record) => {
      const recordDate = new Date(record.date);
      if (recordDate >= startOfWeek && recordDate <= endOfWeek) {
        weekDates.add(record.date);
      }
    });

    const weeklyDays = weekDates.size;
    if (weeklyDays > 0) {
      setMotivationQuote(getRandomQuote(weeklyDays));
    } else {
      setMotivationQuote('');
    }
  }, [records]);

  // 删除运动记录
  const handleDeleteRecord = async (recordId: number) => {
    // Web 环境使用 confirm，Native 环境使用 Alert.alert
    const confirmDelete = () => {
      return new Promise<boolean>((resolve) => {
        if (Platform.OS === 'web') {
          resolve(window.confirm('确定要删除这条运动记录吗？'));
        } else {
          Alert.alert(
            '确认删除',
            '确定要删除这条运动记录吗？',
            [
              { text: '取消', style: 'cancel', onPress: () => resolve(false) },
              { text: '删除', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        }
      });
    };

    const confirmed = await confirmDelete();
    if (!confirmed) return;

    try {
      const headers = await getAuthHeaders();

      /**
       * 服务端文件：server/src/routes/workouts.ts
       * 接口：DELETE /api/v1/workouts/:id
       */
      const response = await fetch(getApiUrl(`/api/v1/workouts/${recordId}`), {
        method: 'DELETE',
        headers,
      });

      const result = await response.json();
      if (result.success) {
        // 从本地列表中移除
        setRecords(prev => prev.filter(r => r.id !== recordId));
        if (Platform.OS === 'web') {
          window.alert('记录已删除');
        } else {
          Alert.alert('成功', '记录已删除');
        }
      } else {
        if (Platform.OS === 'web') {
          window.alert(result.error || '删除失败');
        } else {
          Alert.alert('错误', result.error || '删除失败');
        }
      }
    } catch (error) {
      console.error('删除运动记录失败:', error);
      if (Platform.OS === 'web') {
        window.alert('删除失败，请重试');
      } else {
        Alert.alert('错误', '删除失败，请重试');
      }
    }
  };

  // 获取有记录的日期集合
  const markedDates = useMemo(() => {
    const marks: { [key: string]: boolean } = {};
    records.forEach((record) => {
      marks[record.date] = true;
    });
    return marks;
  }, [records]);

  // 获取选中日期的记录
  const selectedDateRecords = useMemo(() => {
    if (!selectedDate) return [];
    return records.filter((record) => record.date === selectedDate);
  }, [records, selectedDate]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDatePress = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };

  const handleYearMonthSelect = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
    setShowDatePicker(false);
  };

  const renderCalendar = () => {
    const days = [];
    
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <View key={`empty-${i}`} style={styles.dayCell}>
          <View style={styles.dayEmpty} />
        </View>
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasRecord = markedDates[dateStr];
      const isSelected = selectedDate === dateStr;
      const isToday = new Date().toISOString().split('T')[0] === dateStr;

      days.push(
        <View key={day} style={styles.dayCell}>
          <TouchableOpacity
            style={[
              styles.dayButton,
              isSelected && styles.dayButtonSelected,
              isToday && !isSelected && styles.dayButtonToday,
            ]}
            onPress={() => handleDatePress(day)}
            activeOpacity={0.7}
          >
            <ThemedText
              variant="body"
              color={isSelected ? theme.buttonPrimaryText : theme.textPrimary}
              style={styles.dayText}
            >
              {day}
            </ThemedText>
            {/* 运动日期标注点 */}
            {hasRecord && !isSelected && (
              <View style={[styles.workoutDot, { backgroundColor: theme.primary }]} />
            )}
            {hasRecord && isSelected && (
              <View style={[styles.workoutDot, { backgroundColor: theme.buttonPrimaryText }]} />
            )}
          </TouchableOpacity>
        </View>
      );
    }

    return days;
  };

  // 生成年月选择器数据 - 只显示当前年及之后的年份
  const generateYearMonthData = () => {
    const currentYearNow = new Date().getFullYear();
    const years = [];
    // 只显示当前年份及之后3年
    for (let y = currentYearNow; y <= currentYearNow + 3; y++) {
      years.push(y);
    }
    return years;
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedView level="root" style={styles.header}>
          <ThemedText variant="h2" color={theme.textPrimary}>
            运动日历
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.subtitle}>
            查看你的运动记录
          </ThemedText>
        </ThemedView>

        {/* 日历 */}
        <ThemedView level="default" style={styles.calendarContainer}>
          {/* 月份导航 - 点击可快速选择 */}
          <TouchableOpacity 
            style={styles.monthNavigation}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <TouchableOpacity onPress={handlePreviousMonth} style={styles.monthNavButton}>
              <FontAwesome6 name="chevron-left" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <View style={styles.monthTitleContainer}>
              <ThemedText variant="h4" color={theme.textPrimary}>
                {currentYear}年 {monthNames[currentMonth]}
              </ThemedText>
              <FontAwesome6 name="chevron-down" size={12} color={theme.textSecondary} style={styles.dropdownIcon} />
            </View>
            <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavButton}>
              <FontAwesome6 name="chevron-right" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
          </TouchableOpacity>

          {/* 星期标题 */}
          <View style={styles.weekDaysRow}>
            {weekDays.map((day, index) => (
              <View key={index} style={styles.weekDayCell}>
                <ThemedText variant="caption" color={theme.textMuted}>
                  {day}
                </ThemedText>
              </View>
            ))}
          </View>

          {/* 日期网格 */}
          <View style={styles.daysGrid}>{renderCalendar()}</View>
        </ThemedView>

        {/* 激励话术 */}
        {motivationQuote && (
          <ThemedView level="default" style={styles.motivationCard}>
            <FontAwesome6 name="fire" size={20} color={theme.primary} style={styles.motivationIcon} />
            <ThemedText variant="body" color={theme.textPrimary} style={styles.motivationText}>
              {motivationQuote}
            </ThemedText>
          </ThemedView>
        )}

        {/* 选中日期的记录 */}
        {selectedDate && (
          <ThemedView level="root" style={styles.recordsSection}>
            <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
              {selectedDate} 的运动记录
            </ThemedText>
            
            {selectedDateRecords.length === 0 ? (
              <ThemedView level="tertiary" style={styles.emptyState}>
                <FontAwesome6 name="calendar-xmark" size={40} color={theme.textMuted} />
                <ThemedText variant="body" color={theme.textMuted} style={styles.emptyText}>
                  这一天没有运动记录
                </ThemedText>
              </ThemedView>
            ) : (
              selectedDateRecords.map((record) => (
                <ThemedView key={record.id} level="default" style={styles.recordCard}>
                  <View style={styles.recordIconContainer}>
                    <FontAwesome6
                      name={WORKOUT_ICONS[record.type] || 'plus'}
                      size={24}
                      color={theme.primary}
                    />
                  </View>
                  <View style={styles.recordInfo}>
                    <ThemedText variant="bodyMedium" color={theme.textPrimary}>
                      {record.type}
                    </ThemedText>
                    <View style={styles.recordDetails}>
                      <ThemedText variant="small" color={theme.textSecondary}>
                        {record.duration} 分钟
                      </ThemedText>
                      {record.calories && (
                        <>
                          <ThemedText variant="small" color={theme.textMuted}> · </ThemedText>
                          <ThemedText variant="small" color={theme.primary}>
                            约 {record.calories} 千卡
                          </ThemedText>
                        </>
                      )}
                    </View>
                  </View>
                  {record.photo_url && (
                    <Image 
                      source={{ uri: record.photo_url }} 
                      style={styles.recordPhoto}
                    />
                  )}
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteRecord(record.id)}
                  >
                    <FontAwesome6 name="trash" size={16} color={theme.error} />
                  </TouchableOpacity>
                </ThemedView>
              ))
            )}
          </ThemedView>
        )}
      </ScrollView>

      {/* 年月快速选择弹窗 */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <ThemedView level="default" style={styles.datePickerModal}>
            <ThemedText variant="title" color={theme.textPrimary} style={styles.modalTitle}>
              选择年月
            </ThemedText>
            
            {generateYearMonthData().map((year) => {
              const currentYearNow = new Date().getFullYear();
              const isCurrentYear = year === currentYearNow;
              const isExpanded = expandedYears.has(year);
              
              const toggleYearExpand = () => {
                setExpandedYears(prev => {
                  const next = new Set(prev);
                  if (next.has(year)) {
                    next.delete(year);
                  } else {
                    next.add(year);
                  }
                  return next;
                });
              };
              
              return (
                <View key={year} style={styles.yearRow}>
                  <TouchableOpacity 
                    style={styles.yearHeader}
                    onPress={isCurrentYear ? undefined : toggleYearExpand}
                    activeOpacity={isCurrentYear ? 1 : 0.7}
                  >
                    <ThemedText variant="bodyMedium" color={theme.textPrimary} style={styles.yearLabel}>
                      {year}年
                    </ThemedText>
                    {!isCurrentYear && (
                      <FontAwesome6 
                        name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                        size={12} 
                        color={theme.textMuted} 
                      />
                    )}
                  </TouchableOpacity>
                  
                  {(isCurrentYear || isExpanded) && (
                    <View style={styles.monthGrid}>
                      {monthNames.map((month, idx) => (
                        <TouchableOpacity
                          key={`${year}-${idx}`}
                          style={[
                            styles.monthButton,
                            currentYear === year && currentMonth === idx && styles.monthButtonActive,
                          ]}
                          onPress={() => handleYearMonthSelect(year, idx)}
                        >
                          <ThemedText
                            variant="small"
                            color={currentYear === year && currentMonth === idx ? theme.buttonPrimaryText : theme.textPrimary}
                          >
                            {month}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </ThemedView>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}
