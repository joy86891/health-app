import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { createStyles } from './styles';
import { FontAwesome6 } from '@expo/vector-icons';
import { getAuthHeaders } from '@/utils/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { getApiUrl } from '@/config/api';

// 图片查看器使用实际窗口尺寸（全屏 Modal）
const { width: VIEWER_WIDTH } = Dimensions.get('window');

// 运动类型图标映射
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

// 成员颜色
const MEMBER_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#A855F7', '#F43F5E', '#22C55E', '#0EA5E9',
];

interface WorkoutRecord {
  id: number;
  date: string;
  type: string;
  duration: number;
  user_id: string;
  photo_url?: string;
  photo_urls?: string[] | string; // 可能是数组或JSON字符串
  calories?: number;
  user: { id: number; name: string };
}

interface Member {
  id: number;
  name: string;
}

// 总打卡排行数据
interface TotalStatItem {
  id: number;
  name: string;
  totalDays: number;
  totalCount: number;
  totalDuration: number;
  totalCalories: number;
}

interface GroupCalendarData {
  members: Member[];
  records: WorkoutRecord[];
  totalStats?: TotalStatItem[];
}

interface ImageMeta {
  url: string;
  date: string;
  userName: string;
}

type TabType = 'calendar' | 'stats' | 'album';
type RankingType = 'monthly' | 'total';

export default function GroupCalendarScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { user: currentUser } = useAuth();

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [data, setData] = useState<GroupCalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [rankingType, setRankingType] = useState<RankingType>('monthly'); // 排行榜类型

  // 图片查看器状态
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImages, setViewerImages] = useState<ImageMeta[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [viewerCurrentIndex, setViewerCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // 成员颜色映射
  const memberColorMap = useMemo(() => {
    if (!data?.members) return {};
    const map: { [key: number]: string } = {};
    data.members.forEach((member, index) => {
      map[member.id] = MEMBER_COLORS[index % MEMBER_COLORS.length];
    });
    return map;
  }, [data?.members]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        getApiUrl(`/api/v1/groups/calendar?year=${selectedYear}&month=${selectedMonth}`),
        { headers }
      );

      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('获取群组日历数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // 获取月份天数
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  // 获取月份第一天是周几 (0=周日, 1=周一...)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  // 按日期分组的记录
  const recordsByDate = useMemo(() => {
    if (!data?.records) return {};
    const grouped: { [key: string]: WorkoutRecord[] } = {};
    data.records.forEach(record => {
      if (!grouped[record.date]) {
        grouped[record.date] = [];
      }
      grouped[record.date].push(record);
    });
    return grouped;
  }, [data?.records]);

  // 生成日历数据
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth);
    const days: { day: number; date: string; isToday: boolean }[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({ day: 0, date: '', isToday: false });
    }

    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        day: i,
        date: dateStr,
        isToday: today.getFullYear() === selectedYear && 
                 today.getMonth() + 1 === selectedMonth && 
                 today.getDate() === i,
      });
    }

    return days;
  }, [selectedYear, selectedMonth]);

  // 成员打卡统计
  const memberStats = useMemo(() => {
    if (!data?.members || !data?.records) return [];
    
    const stats = data.members.map(member => {
      const memberRecords = data.records.filter(r => r.user?.id === member.id);
      const uniqueDates = new Set(memberRecords.map(r => r.date));
      const totalDuration = memberRecords.reduce((sum, r) => sum + r.duration, 0);
      const totalCalories = memberRecords.reduce((sum, r) => sum + (r.calories || 0), 0);
      return {
        ...member,
        count: uniqueDates.size,
        totalDuration,
        totalCalories,
        color: memberColorMap[member.id],
      };
    });

    // 排序规则：天数 > 时长 > 卡路里
    return stats.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (b.totalDuration !== a.totalDuration) return b.totalDuration - a.totalDuration;
      return b.totalCalories - a.totalCalories;
    });
  }, [data?.members, data?.records, memberColorMap]);

  // 月度打卡冠军（支持多人并列，按天数>时长>卡路里排序）
  const monthlyChampions = useMemo(() => {
    if (memberStats.length === 0 || memberStats[0].count === 0) return [];
    
    const topMember = memberStats[0];
    return memberStats.filter(m => 
      m.count === topMember.count && 
      m.totalDuration === topMember.totalDuration && 
      m.totalCalories === topMember.totalCalories
    );
  }, [memberStats]);

  // 运动类型统计
  const typeStats = useMemo(() => {
    if (!data?.records) return [];
    
    const typeMap: { [key: string]: { count: number; duration: number } } = {};
    data.records.forEach(record => {
      if (!typeMap[record.type]) {
        typeMap[record.type] = { count: 0, duration: 0 };
      }
      typeMap[record.type].count++;
      typeMap[record.type].duration += record.duration;
    });

    return Object.entries(typeMap)
      .map(([type, stats]) => ({
        type,
        count: stats.count,
        duration: stats.duration,
        icon: WORKOUT_ICONS[type] || 'plus',
      }))
      .sort((a, b) => b.count - a.count);
  }, [data?.records]);

  // 所有照片
  const allPhotos = useMemo(() => {
    if (!data?.records) return [];
    
    const photos: { url: string; userName: string; date: string; type: string }[] = [];
    data.records.forEach(record => {
      // 处理 photo_urls：可能是数组或字符串
      let urls: string[] = [];
      if (record.photo_urls) {
        if (Array.isArray(record.photo_urls)) {
          urls = record.photo_urls;
        } else if (typeof record.photo_urls === 'string') {
          try {
            urls = JSON.parse(record.photo_urls);
          } catch (e) {
            // 如果解析失败，可能是空格分隔的URL
            urls = record.photo_urls.split(' ').filter((u: string) => u.trim());
          }
        }
      } else if (record.photo_url) {
        urls = [record.photo_url];
      }
      
      urls.forEach(url => {
        if (url && url.trim()) {
          photos.push({
            url: url.trim(),
            userName: record.user?.name || '未知用户',
            date: record.date,
            type: record.type,
          });
        }
      });
    });
    console.log('[群组日历] 所有照片:', photos.length, '张');
    return photos;
  }, [data?.records]);

  // 按成员分组的照片
  const photosByMember = useMemo(() => {
    if (!data?.members || !data?.records) return {};
    
    const grouped: { [key: number]: { url: string; date: string; userName: string }[] } = {};
    data.members.forEach(member => {
      grouped[member.id] = [];
    });
    
    data.records.forEach(record => {
      // 处理 photo_urls：可能是数组或字符串
      let urls: string[] = [];
      if (record.photo_urls) {
        if (Array.isArray(record.photo_urls)) {
          urls = record.photo_urls;
        } else if (typeof record.photo_urls === 'string') {
          try {
            urls = JSON.parse(record.photo_urls);
          } catch (e) {
            urls = record.photo_urls.split(' ').filter((u: string) => u.trim());
          }
        }
      } else if (record.photo_url) {
        urls = [record.photo_url];
      }
      
      urls.forEach(url => {
        if (url && url.trim() && record.user?.id && grouped[record.user.id]) {
          grouped[record.user.id].push({
            url: url.trim(),
            date: record.date,
            userName: record.user?.name || '未知用户',
          });
        }
      });
    });
    
    console.log('[群组日历] 成员照片分组:', Object.entries(grouped).map(([id, photos]) => ({ id, count: photos.length })));
    return grouped;
  }, [data?.members, data?.records]);

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  // 年选择从2026年开始，到当前年份+2年
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: Math.max(1, currentYear - 2025 + 3) }, (_, i) => 2026 + i);

  // 点击日期
  const handleDayPress = (date: string, hasRecords: boolean) => {
    if (hasRecords) {
      setSelectedDate(date);
      setFilterType(null);
      setSearchKeyword('');
    }
  };

  // 选中的日期记录
  const selectedDateRecords = useMemo(() => {
    if (!selectedDate) return [];
    return recordsByDate[selectedDate] || [];
  }, [selectedDate, recordsByDate]);

  // 筛选后的日期记录
  const filteredDateRecords = useMemo(() => {
    let records = selectedDateRecords;
    
    // 按运动类型筛选
    if (filterType) {
      records = records.filter(r => r.type === filterType);
    }
    
    // 按关键词搜索（用户名）
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.trim().toLowerCase();
      records = records.filter(r => 
        r.user?.name?.toLowerCase().includes(keyword)
      );
    }
    
    return records;
  }, [selectedDateRecords, filterType, searchKeyword]);

  // 当日统计摘要
  const dateStats = useMemo(() => {
    if (selectedDateRecords.length === 0) {
      return { totalPeople: 0, totalDuration: 0, totalCalories: 0, types: [] };
    }
    
    const uniqueUsers = new Set(selectedDateRecords.map(r => r.user?.id));
    const totalDuration = selectedDateRecords.reduce((sum, r) => sum + r.duration, 0);
    const totalCalories = selectedDateRecords.reduce((sum, r) => sum + (r.calories || 0), 0);
    
    // 统计运动类型分布
    const typeCount: { [key: string]: number } = {};
    selectedDateRecords.forEach(r => {
      typeCount[r.type] = (typeCount[r.type] || 0) + 1;
    });
    const types = Object.entries(typeCount)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
    
    return {
      totalPeople: uniqueUsers.size,
      totalDuration,
      totalCalories,
      types,
    };
  }, [selectedDateRecords]);

  // 选中的成员照片
  const selectedMemberPhotos = useMemo(() => {
    if (!selectedMember) return [];
    return photosByMember[selectedMember.id] || [];
  }, [selectedMember, photosByMember]);

  // 打开图片查看器
  const openImageViewer = useCallback((imageUrl: string, photos: ImageMeta[]) => {
    const index = photos.findIndex(p => p.url === imageUrl);
    const validIndex = index >= 0 ? index : 0;
    setViewerImages(photos);
    setViewerInitialIndex(validIndex);
    setViewerCurrentIndex(validIndex);
    setShowImageViewer(true);
  }, []);

  // Modal 打开后滚动到正确的图片
  useEffect(() => {
    if (showImageViewer && viewerInitialIndex > 0 && scrollViewRef.current) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: viewerInitialIndex * VIEWER_WIDTH,
          y: 0,
          animated: false,
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showImageViewer, viewerInitialIndex]);

  // 处理图片滑动
  const handleImageViewerScroll = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / VIEWER_WIDTH);
    if (newIndex !== viewerCurrentIndex && newIndex >= 0 && newIndex < viewerImages.length) {
      setViewerCurrentIndex(newIndex);
    }
  }, [viewerCurrentIndex, viewerImages.length]);

  // 渲染日历单元格
  const renderDayCell = ({ item }: { item: typeof calendarDays[0] }) => {
    if (item.day === 0) {
      return <View style={styles.dayCell} />;
    }

    const records = recordsByDate[item.date] || [];
    const hasRecords = records.length > 0;
    const recordCount = records.length;
    // 当打卡人数超过 3 人时，用数字显示；否则用圆点
    const showCount = recordCount > 3;

    return (
      <TouchableOpacity 
        style={styles.dayCell}
        onPress={() => handleDayPress(item.date, hasRecords)}
        disabled={!hasRecords}
      >
        <View 
          style={[
            styles.dayCellContent, 
            // 今天且有打卡：同时显示边框和背景色
            item.isToday && hasRecords ? styles.todayHasRecordCell :
            item.isToday ? styles.todayCell : 
            hasRecords ? styles.hasRecordCell : styles.emptyCell,
            selectedDate === item.date && styles.selectedDateCell,
          ]}
        >
          <ThemedText 
            variant="smallMedium" 
            color={item.isToday && hasRecords ? theme.textPrimary : 
                   item.isToday || selectedDate === item.date ? theme.textPrimary : theme.textPrimary}
          >
            {item.day}
          </ThemedText>
          {hasRecords && (
            showCount ? (
              // 人数多时显示数字
              <View style={styles.countBadge}>
                <ThemedText variant="tiny" color={theme.buttonPrimaryText}>
                  {recordCount}
                </ThemedText>
              </View>
            ) : (
              // 人数少时显示圆点
              <View style={styles.memberIndicators}>
                {records.slice(0, 3).map((r, idx) => (
                  <View 
                    key={idx} 
                    style={[styles.memberDot, { backgroundColor: memberColorMap[r.user?.id] || theme.textMuted }]} 
                  />
                ))}
              </View>
            )
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // 渲染Tab
  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'calendar' as TabType, label: '日历', icon: 'calendar-days' },
        { key: 'stats' as TabType, label: '统计', icon: 'chart-pie' },
        { key: 'album' as TabType, label: '相册', icon: 'images' },
      ].map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
          onPress={() => setActiveTab(tab.key)}
        >
          <FontAwesome6 
            name={tab.icon} 
            size={18} 
            color={activeTab === tab.key ? theme.primary : theme.textMuted} 
          />
          <ThemedText 
            variant="caption" 
            color={activeTab === tab.key ? theme.primary : theme.textMuted}
          >
            {tab.label}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );

  // 渲染日历内容
  const renderCalendarContent = () => (
    <>
      {/* 年月选择器 */}
      <View style={styles.yearMonthPicker}>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={() => { setShowYearPicker(!showYearPicker); setShowMonthPicker(false); }}
          >
            <ThemedText variant="bodyMedium" color={theme.textPrimary}>
              {selectedYear}年
            </ThemedText>
            <FontAwesome6 name="chevron-down" size={12} color={theme.textMuted} />
          </TouchableOpacity>
          {showYearPicker && (
            <View style={styles.dropdownMenu}>
              {years.map(year => (
                <TouchableOpacity
                  key={year}
                  style={[styles.dropdownItem, year === selectedYear && styles.dropdownItemActive]}
                  onPress={() => { setSelectedYear(year); setShowYearPicker(false); }}
                >
                  <ThemedText 
                    variant="body" 
                    color={year === selectedYear ? theme.primary : theme.textPrimary}
                  >
                    {year}年
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.dropdownContainer}>
          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={() => { setShowMonthPicker(!showMonthPicker); setShowYearPicker(false); }}
          >
            <ThemedText variant="bodyMedium" color={theme.textPrimary}>
              {selectedMonth}月
            </ThemedText>
            <FontAwesome6 name="chevron-down" size={12} color={theme.textMuted} />
          </TouchableOpacity>
          {showMonthPicker && (
            <View style={styles.monthPickerGrid}>
              {[0, 4, 8].map(start => (
                <View key={start} style={styles.monthPickerRow}>
                  {months.slice(start, start + 4).map(month => (
                    <TouchableOpacity
                      key={month}
                      style={[styles.monthPickerItem, month === selectedMonth && styles.monthPickerItemActive]}
                      onPress={() => { setSelectedMonth(month); setShowMonthPicker(false); }}
                    >
                      <ThemedText 
                        variant="body" 
                        color={month === selectedMonth ? theme.buttonPrimaryText : theme.textPrimary}
                      >
                        {month}月
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* 日历 */}
      <ThemedView level="default" style={styles.calendarContainer}>
        <View style={styles.weekDaysRow}>
          {weekDays.map((day, index) => (
            <ThemedText 
              key={index} 
              variant="caption" 
              color={theme.textMuted} 
              style={styles.weekDay}
            >
              {day}
            </ThemedText>
          ))}
        </View>
        {/* 使用 View 替代 FlatList 避免 VirtualizedList 嵌套警告 */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((item, index) => renderDayCell({ item }))}
        </View>
      </ThemedView>

      {/* 图例 */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
          <ThemedText variant="caption" color={theme.textSecondary}>今天</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendHasRecord}>
            <View style={styles.memberIndicators}>
              <View style={[styles.memberDot, { backgroundColor: theme.primary, width: 4, height: 4 }]} />
              <View style={[styles.memberDot, { backgroundColor: theme.accent, width: 4, height: 4 }]} />
            </View>
          </View>
          <ThemedText variant="caption" color={theme.textSecondary}>有打卡</ThemedText>
        </View>
      </View>

      {/* 打卡排行 */}
      {(memberStats.length > 0 && memberStats[0].count > 0) || (data?.totalStats && data.totalStats.length > 0 && data.totalStats[0].totalDays > 0) ? (
        <ThemedView level="default" style={styles.membersSection}>
          {/* 切换按钮 */}
          <View style={styles.rankingHeader}>
            <View style={styles.rankingTabs}>
              <TouchableOpacity 
                style={[styles.rankingTab, rankingType === 'monthly' && styles.rankingTabActive]}
                onPress={() => setRankingType('monthly')}
              >
                <ThemedText 
                  variant="bodyMedium" 
                  color={rankingType === 'monthly' ? theme.primary : theme.textMuted}
                >
                  本月排行
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.rankingTab, rankingType === 'total' && styles.rankingTabActive]}
                onPress={() => setRankingType('total')}
              >
                <ThemedText 
                  variant="bodyMedium" 
                  color={rankingType === 'total' ? theme.primary : theme.textMuted}
                >
                  累计排行
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* 本月排行 */}
          {rankingType === 'monthly' && memberStats.slice(0, 10).map((member, index) => (
            <View key={member.id} style={[
              styles.memberRow,
              index === 0 && styles.championRow,
            ]}>
              <View style={styles.rankContainer}>
                {index === 0 ? (
                  <View style={styles.championBadge}>
                    <FontAwesome6 name="crown" size={14} color="#F59E0B" />
                  </View>
                ) : (
                  <ThemedText variant="bodyMedium" color={theme.textMuted} style={styles.rankNumber}>
                    {index + 1}
                  </ThemedText>
                )}
              </View>
              <View style={[styles.memberColorDot, { backgroundColor: member.color }]} />
              <ThemedText variant="body" color={theme.textPrimary} style={styles.memberName}>
                {member.name}
              </ThemedText>
              <ThemedText variant="bodyMedium" color={theme.textSecondary}>
                {member.totalDuration}分钟
              </ThemedText>
              <ThemedText variant="bodyMedium" color={theme.primary} style={{ marginLeft: 8 }}>
                {member.count}天
              </ThemedText>
            </View>
          ))}
          
          {/* 累计排行 */}
          {rankingType === 'total' && data?.totalStats?.slice(0, 10).map((member, index) => (
            <View key={member.id} style={[
              styles.memberRow,
              index === 0 && styles.championRow,
            ]}>
              <View style={styles.rankContainer}>
                {index === 0 ? (
                  <View style={styles.championBadge}>
                    <FontAwesome6 name="crown" size={14} color="#F59E0B" />
                  </View>
                ) : (
                  <ThemedText variant="bodyMedium" color={theme.textMuted} style={styles.rankNumber}>
                    {index + 1}
                  </ThemedText>
                )}
              </View>
              <View style={[styles.memberColorDot, { backgroundColor: memberColorMap[member.id] || theme.textMuted }]} />
              <ThemedText variant="body" color={theme.textPrimary} style={styles.memberName}>
                {member.name}
              </ThemedText>
              <ThemedText variant="bodyMedium" color={theme.textSecondary}>
                {member.totalDuration}分钟
              </ThemedText>
              <ThemedText variant="bodyMedium" color={theme.primary} style={{ marginLeft: 8 }}>
                {member.totalDays}天
              </ThemedText>
            </View>
          ))}
        </ThemedView>
      ) : null}

      {/* 选中的日期运动记录（日历下方直接显示） */}
      {selectedDate && selectedDateRecords.length > 0 && (
        <ThemedView level="default" style={styles.selectedDateSection}>
          <View style={styles.selectedDateHeader}>
            <ThemedText variant="title" color={theme.textPrimary}>
              {selectedDate.slice(5)} 打卡记录
            </ThemedText>
            <TouchableOpacity onPress={() => setSelectedDate(null)}>
              <FontAwesome6 name="xmark" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
          
          {/* 当日统计概览 */}
          <View style={styles.dateStatsRow}>
            <View style={styles.dateStatItem}>
              <ThemedText variant="h3" color={theme.primary}>{dateStats.totalPeople}</ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary}>人打卡</ThemedText>
            </View>
            <View style={styles.dateStatDivider} />
            <View style={styles.dateStatItem}>
              <ThemedText variant="h3" color={theme.textPrimary}>
                {Math.floor(dateStats.totalDuration / 60)}h{dateStats.totalDuration % 60}m
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary}>总时长</ThemedText>
            </View>
            <View style={styles.dateStatDivider} />
            <View style={styles.dateStatItem}>
              <ThemedText variant="h3" color={theme.textPrimary}>{dateStats.totalCalories}</ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary}>千卡</ThemedText>
            </View>
          </View>

          {/* 记录列表 */}
          <View style={styles.selectedDateList}>
            {selectedDateRecords.map((record) => (
              <View key={record.id} style={styles.selectedDateItem}>
                <View style={[styles.memberColorDot, { backgroundColor: memberColorMap[record.user?.id] || theme.textMuted }]} />
                <View style={styles.selectedDateItemInfo}>
                  <ThemedText variant="body" color={theme.textPrimary}>{record.user?.name}</ThemedText>
                  <ThemedText variant="caption" color={theme.textSecondary}>
                    {record.type} · {record.duration}分钟{record.calories ? ` · ${record.calories}kcal` : ''}
                  </ThemedText>
                </View>
                {record.photo_url && (
                  <Image source={{ uri: record.photo_url }} style={styles.selectedDatePhoto} />
                )}
              </View>
            ))}
          </View>
        </ThemedView>
      )}

      {/* 日期详情弹窗 */}
      {selectedDate && (
        <View style={styles.dateDetailOverlay}>
          <ThemedView level="default" style={styles.dateDetailModal}>
            {/* 头部 */}
            <View style={styles.dateDetailHeader}>
              <ThemedText variant="title" color={theme.textPrimary}>
                {selectedDate} 打卡详情
              </ThemedText>
              <TouchableOpacity onPress={() => setSelectedDate(null)}>
                <FontAwesome6 name="xmark" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* 统计概览 */}
            <View style={styles.dateStatsOverview}>
              <View style={styles.dateStatItem}>
                <ThemedText variant="h2" color={theme.primary}>
                  {dateStats.totalPeople}
                </ThemedText>
                <ThemedText variant="caption" color={theme.textSecondary}>
                  人打卡
                </ThemedText>
              </View>
              <View style={styles.dateStatDivider} />
              <View style={styles.dateStatItem}>
                <ThemedText variant="h3" color={theme.textPrimary}>
                  {Math.floor(dateStats.totalDuration / 60)}h{dateStats.totalDuration % 60}m
                </ThemedText>
                <ThemedText variant="caption" color={theme.textSecondary}>
                  总时长
                </ThemedText>
              </View>
              <View style={styles.dateStatDivider} />
              <View style={styles.dateStatItem}>
                <ThemedText variant="h3" color={theme.textPrimary}>
                  {dateStats.totalCalories}
                </ThemedText>
                <ThemedText variant="caption" color={theme.textSecondary}>
                  千卡
                </ThemedText>
              </View>
            </View>

            {/* 筛选栏 */}
            <View style={styles.filterBar}>
              {/* 搜索框 */}
              <View style={styles.searchBox}>
                <FontAwesome6 name="magnifying-glass" size={14} color={theme.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="搜索成员..."
                  placeholderTextColor={theme.textMuted}
                  value={searchKeyword}
                  onChangeText={setSearchKeyword}
                />
                {searchKeyword.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchKeyword('')}>
                    <FontAwesome6 name="xmark" size={12} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* 运动类型筛选标签 */}
            {dateStats.types.length > 1 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.typeFilterScroll}
                contentContainerStyle={styles.typeFilterContainer}
              >
                <TouchableOpacity
                  style={[styles.typeFilterChip, !filterType && styles.typeFilterChipActive]}
                  onPress={() => setFilterType(null)}
                >
                  <ThemedText 
                    variant="caption" 
                    color={!filterType ? theme.buttonPrimaryText : theme.textSecondary}
                  >
                    全部 ({selectedDateRecords.length})
                  </ThemedText>
                </TouchableOpacity>
                {dateStats.types.map(({ type, count }) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeFilterChip, filterType === type && styles.typeFilterChipActive]}
                    onPress={() => setFilterType(filterType === type ? null : type)}
                  >
                    <FontAwesome6 
                      name={WORKOUT_ICONS[type] || 'plus'} 
                      size={12} 
                      color={filterType === type ? theme.buttonPrimaryText : theme.textSecondary}
                    />
                    <ThemedText 
                      variant="caption" 
                      color={filterType === type ? theme.buttonPrimaryText : theme.textSecondary}
                    >
                      {type} ({count})
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* 打卡列表 - 使用 ScrollView + map 替代 FlatList */}
            <ScrollView 
              style={styles.dateDetailList}
              contentContainerStyle={styles.dateDetailListContent}
              showsVerticalScrollIndicator={false}
            >
              {filteredDateRecords.length === 0 ? (
                <View style={styles.emptyState}>
                  <FontAwesome6 name="users-slash" size={32} color={theme.textMuted} />
                  <ThemedText variant="body" color={theme.textMuted}>
                    {searchKeyword || filterType ? '没有匹配的记录' : '暂无打卡记录'}
                  </ThemedText>
                </View>
              ) : (
                filteredDateRecords.map((record) => (
                  <View key={record.id} style={styles.dateDetailItem}>
                    <View style={styles.dateDetailIcon}>
                      <FontAwesome6 
                        name={WORKOUT_ICONS[record.type] || 'plus'} 
                        size={16} 
                        color={theme.primary} 
                      />
                    </View>
                    <View style={styles.dateDetailInfo}>
                      <ThemedText variant="bodyMedium" color={theme.textPrimary} numberOfLines={1}>
                        {record.user?.name || '未知用户'}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textSecondary}>
                        {record.type} · {record.duration}分钟
                        {record.calories ? ` · ${record.calories}kcal` : ''}
                      </ThemedText>
                    </View>
                    {record.photo_url && (
                      <Image source={{ uri: record.photo_url }} style={styles.dateDetailPhoto} />
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </ThemedView>
        </View>
      )}

      {/* 图片查看器 */}
      <Modal
        visible={showImageViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageViewer(false)}
      >
        <View style={styles.imageViewerOverlay}>
          {/* 关闭按钮 */}
          <TouchableOpacity 
            style={styles.imageViewerClose}
            onPress={() => setShowImageViewer(false)}
          >
            <FontAwesome6 name="xmark" size={24} color="#fff" />
          </TouchableOpacity>
          
          {/* 图片滑动区域 */}
          <View style={styles.imageViewerScroll}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleImageViewerScroll}
              scrollEventThrottle={16}
              contentContainerStyle={styles.imageViewerScrollContent}
              contentOffset={{ x: viewerInitialIndex * VIEWER_WIDTH, y: 0 }}
            >
              {viewerImages.map((imageMeta, index) => (
                <View key={index} style={styles.imageViewerItem}>
                  <Image 
                    source={{ uri: imageMeta.url }} 
                    style={styles.imageViewerImage} 
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
          </View>
          
          {/* 图片信息：时间和上传人 */}
          {viewerImages.length > 0 && (
            <View style={styles.imageViewerInfo}>
              <ThemedText variant="small" color="#fff">
                {viewerImages[viewerCurrentIndex]?.date}
              </ThemedText>
              <ThemedText variant="small" color="rgba(255,255,255,0.8)">
                {viewerImages[viewerCurrentIndex]?.userName}
              </ThemedText>
            </View>
          )}
          
          {/* 上一张按钮 */}
          {viewerImages.length > 1 && viewerCurrentIndex > 0 && (
            <TouchableOpacity 
              style={[styles.imageViewerNavButton, styles.imageViewerPrevButton]}
              onPress={() => {
                const newIndex = viewerCurrentIndex - 1;
                setViewerCurrentIndex(newIndex);
                scrollViewRef.current?.scrollTo({
                  x: newIndex * VIEWER_WIDTH,
                  y: 0,
                  animated: true,
                });
              }}
            >
              <FontAwesome6 name="chevron-left" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          
          {/* 下一张按钮 */}
          {viewerImages.length > 1 && viewerCurrentIndex < viewerImages.length - 1 && (
            <TouchableOpacity 
              style={[styles.imageViewerNavButton, styles.imageViewerNextButton]}
              onPress={() => {
                const newIndex = viewerCurrentIndex + 1;
                setViewerCurrentIndex(newIndex);
                scrollViewRef.current?.scrollTo({
                  x: newIndex * VIEWER_WIDTH,
                  y: 0,
                  animated: true,
                });
              }}
            >
              <FontAwesome6 name="chevron-right" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          
          {/* 图片计数 */}
          <View style={styles.imageViewerCounter}>
            <ThemedText variant="small" color="#fff">
              {viewerImages.length > 0 ? `${viewerCurrentIndex + 1} / ${viewerImages.length}` : ''}
            </ThemedText>
          </View>
        </View>
      </Modal>
    </>
  );

  // 渲染统计内容
  const renderStatsContent = () => {
    const totalDuration = data?.records?.reduce((sum, r) => sum + r.duration, 0) || 0;
    const totalRecords = data?.records?.length || 0;
    const uniqueDays = new Set(data?.records?.map(r => r.date) || []).size;

    return (
      <>
        {/* 总体统计 */}
        <ThemedView level="default" style={styles.statsCard}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            本月总体统计
          </ThemedText>
          <View style={styles.statsGrid}>
            <View style={styles.statsItem}>
              <ThemedText variant="h2" color={theme.primary}>{totalRecords}</ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary}>打卡次数</ThemedText>
            </View>
            <View style={styles.statsItem}>
              <ThemedText variant="h2" color={theme.primary}>{uniqueDays}</ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary}>打卡天数</ThemedText>
            </View>
            <View style={styles.statsItem}>
              <ThemedText variant="h2" color={theme.primary}>{Math.floor(totalDuration / 60)}</ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary}>总时长(小时)</ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* 运动类型统计 */}
        <ThemedView level="default" style={styles.statsCard}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            运动类型分布
          </ThemedText>
          {typeStats.map((stat, index) => {
            const maxCount = typeStats[0]?.count || 1;
            const barWidth = (stat.count / maxCount) * 100;
            return (
              <View key={stat.type} style={styles.typeStatsRow}>
                <View style={styles.typeStatsIcon}>
                  <FontAwesome6 name={stat.icon} size={16} color={theme.primary} />
                </View>
                <View style={styles.typeStatsInfo}>
                  <View style={styles.typeStatsHeader}>
                    <ThemedText variant="body" color={theme.textPrimary}>{stat.type}</ThemedText>
                    <ThemedText variant="caption" color={theme.textSecondary}>
                      {stat.count}次 · {stat.duration}分钟
                    </ThemedText>
                  </View>
                  <View style={styles.typeStatsBar}>
                    <View 
                      style={[styles.typeStatsBarFill, { width: `${barWidth}%` }]} 
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </ThemedView>

        {/* 成员统计 */}
        <ThemedView level="default" style={styles.statsCard}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            成员运动时长
          </ThemedText>
          {memberStats.map(member => (
            <View key={member.id} style={styles.memberStatsRow}>
              <View style={[styles.memberColorDot, { backgroundColor: member.color }]} />
              <ThemedText variant="body" color={theme.textPrimary} style={styles.memberName}>
                {member.name}
              </ThemedText>
              <ThemedText variant="bodyMedium" color={theme.primary}>
                {member.totalDuration}分钟
              </ThemedText>
            </View>
          ))}
        </ThemedView>
      </>
    );
  };

  // 渲染相册内容
  const renderAlbumContent = () => (
    <>
      {/* 全部照片 */}
      <ThemedView level="default" style={styles.albumSection}>
        <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
          全部照片 ({allPhotos.length})
        </ThemedText>
        {allPhotos.length > 0 ? (
          <View style={styles.photoGrid}>
            {allPhotos.map((photo, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.photoItem}
                onPress={() => openImageViewer(photo.url, allPhotos)}
              >
                <Image source={{ uri: photo.url }} style={styles.photoImage} />
                <View style={styles.photoOverlay}>
                  <ThemedText variant="tiny" color="#FFFFFF" numberOfLines={1}>
                    {photo.userName}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyPhotoState}>
            <FontAwesome6 name="images" size={40} color={theme.textMuted} />
            <ThemedText variant="body" color={theme.textSecondary}>
              暂无照片
            </ThemedText>
          </View>
        )}
      </ThemedView>

      {/* 成员照片 */}
      <ThemedView level="default" style={styles.albumSection}>
        <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
          成员照片
        </ThemedText>
        {data?.members?.map(member => {
          const memberPhotos = photosByMember[member.id] || [];
          if (memberPhotos.length === 0) return null;
          return (
            <TouchableOpacity 
              key={member.id} 
              style={styles.memberAlbumRow}
              onPress={() => setSelectedMember(member)}
            >
              <View style={[styles.memberColorDot, { backgroundColor: memberColorMap[member.id] }]} />
              <ThemedText variant="body" color={theme.textPrimary} style={styles.memberName}>
                {member.name}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary}>
                {memberPhotos.length}张
              </ThemedText>
              <FontAwesome6 name="chevron-right" size={14} color={theme.textMuted} />
            </TouchableOpacity>
          );
        })}
      </ThemedView>

      {/* 成员照片详情弹窗 */}
      {selectedMember && (
        <View style={styles.dateDetailOverlay}>
          <ThemedView level="default" style={styles.dateDetailModal}>
            <View style={styles.dateDetailHeader}>
              <ThemedText variant="title" color={theme.textPrimary}>
                {selectedMember.name} 的照片
              </ThemedText>
              <TouchableOpacity onPress={() => setSelectedMember(null)}>
                <FontAwesome6 name="xmark" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dateDetailList} contentContainerStyle={styles.dateDetailListContent}>
              <View style={styles.photoGrid}>
                {selectedMemberPhotos.map((photo, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.photoItem}
                    onPress={() => openImageViewer(photo.url, selectedMemberPhotos)}
                  >
                    <Image source={{ uri: photo.url }} style={styles.photoImage} />
                    <View style={styles.photoOverlay}>
                      <ThemedText variant="tiny" color="#FFFFFF" numberOfLines={1}>
                        {photo.date}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </ThemedView>
        </View>
      )}

      {/* 图片查看器 */}
      <Modal
        visible={showImageViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageViewer(false)}
      >
        <View style={styles.imageViewerOverlay}>
          {/* 关闭按钮 */}
          <TouchableOpacity 
            style={styles.imageViewerClose}
            onPress={() => setShowImageViewer(false)}
          >
            <FontAwesome6 name="xmark" size={24} color="#fff" />
          </TouchableOpacity>
          
          {/* 图片滑动区域 */}
          <View style={styles.imageViewerScroll}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleImageViewerScroll}
              scrollEventThrottle={16}
              contentContainerStyle={styles.imageViewerScrollContent}
              contentOffset={{ x: viewerInitialIndex * VIEWER_WIDTH, y: 0 }}
            >
              {viewerImages.map((imageMeta, index) => (
                <View key={index} style={styles.imageViewerItem}>
                  <Image 
                    source={{ uri: imageMeta.url }} 
                    style={styles.imageViewerImage} 
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
          </View>
          
          {/* 图片信息：时间和上传人 */}
          {viewerImages.length > 0 && (
            <View style={styles.imageViewerInfo}>
              <ThemedText variant="small" color="#fff">
                {viewerImages[viewerCurrentIndex]?.date}
              </ThemedText>
              <ThemedText variant="small" color="rgba(255,255,255,0.8)">
                {viewerImages[viewerCurrentIndex]?.userName}
              </ThemedText>
            </View>
          )}
          
          {/* 上一张按钮 */}
          {viewerImages.length > 1 && viewerCurrentIndex > 0 && (
            <TouchableOpacity 
              style={[styles.imageViewerNavButton, styles.imageViewerPrevButton]}
              onPress={() => {
                const newIndex = viewerCurrentIndex - 1;
                setViewerCurrentIndex(newIndex);
                scrollViewRef.current?.scrollTo({
                  x: newIndex * VIEWER_WIDTH,
                  y: 0,
                  animated: true,
                });
              }}
            >
              <FontAwesome6 name="chevron-left" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          
          {/* 下一张按钮 */}
          {viewerImages.length > 1 && viewerCurrentIndex < viewerImages.length - 1 && (
            <TouchableOpacity 
              style={[styles.imageViewerNavButton, styles.imageViewerNextButton]}
              onPress={() => {
                const newIndex = viewerCurrentIndex + 1;
                setViewerCurrentIndex(newIndex);
                scrollViewRef.current?.scrollTo({
                  x: newIndex * VIEWER_WIDTH,
                  y: 0,
                  animated: true,
                });
              }}
            >
              <FontAwesome6 name="chevron-right" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          
          {/* 图片计数 */}
          <View style={styles.imageViewerCounter}>
            <ThemedText variant="small" color="#fff">
              {viewerImages.length > 0 ? `${viewerCurrentIndex + 1} / ${viewerImages.length}` : ''}
            </ThemedText>
          </View>
        </View>
      </Modal>
    </>
  );

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome6 name="chevron-left" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <ThemedText variant="h3" color={theme.textPrimary} style={styles.title}>
          群组日历
        </ThemedText>
        <View style={{ width: 36 }} />
      </View>

      {/* Tab栏 */}
      {renderTabBar()}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'calendar' && renderCalendarContent()}
        {activeTab === 'stats' && renderStatsContent()}
        {activeTab === 'album' && renderAlbumContent()}
      </ScrollView>
    </Screen>
  );
}
