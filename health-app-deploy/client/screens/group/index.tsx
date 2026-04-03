import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  FlatList,
  RefreshControl,
  Image,
  Modal,
  Text,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { createStyles } from './styles';
import { FontAwesome6 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import * as ImagePicker from 'expo-image-picker';
import { createFormDataFile } from '@/utils';
import { getApiUrl } from '@/config/api';
import { EMOJI_IMAGES } from '@/constants/emojis';
import { Spacing } from '@/constants/theme';
import { getAuthHeaders } from '@/utils/auth';
import { useAuth } from '@/contexts/AuthContext';

// Web 端应用固定宽度 390px，移动端使用实际屏幕尺寸
const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');
const SCREEN_WIDTH = Platform.OS === 'web' ? 390 : WINDOW_WIDTH;
const SCREEN_HEIGHT = Platform.OS === 'web' ? 844 : WINDOW_HEIGHT;
// 图片查看器使用实际窗口尺寸（全屏 Modal）
const VIEWER_WIDTH = WINDOW_WIDTH;

// 格式化日期时间
const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
};

// 表情颜色映射
const EMOJI_COLORS: { [key: string]: string } = {
  'happy': '#FFB800',
  'laugh': '#FF6B6B',
  'cool': '#4ECDC4',
  'love': '#FF4757',
  'thumb': '#2ED573',
  'clap': '#FFA502',
  'fire': '#FF6348',
  'star': '#3742FA',
  'run': '#1E90FF',
  'muscle': '#FF4500',
  'medal': '#FFD700',
  'trophy': '#FFD700',
  'think': '#9370DB',
  'surprise': '#FF69B4',
  'cry': '#87CEEB',
  'shy': '#FFB6C1',
};

// 常用快捷回复
const QUICK_REPLIES = ['好的', '加油', '厉害', '真棒', '继续', '不错', '给力', '点赞', '冲啊', '强', '赞', '优秀'];

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

interface WorkoutData {
  type: string;
  duration: number;
  photoUrl?: string;
  photoUrls?: string[];
  date: string;
  calories?: number;
}

interface DailySummaryData {
  date: string;
  checkInCount: number;
  photos: { url: string; userName: string; type: string; duration: number }[];
  totalRecords: number;
}

interface ImageMeta {
  url: string;
  date: string;
  senderName: string;
}

interface Message {
  id: number;
  group_id: number;
  user_id: number | null;
  content: string;
  type: string;
  photo_url?: string;
  workout_data?: WorkoutData | DailySummaryData;
  created_at: string;
  user: { name: string; avatar_url?: string };
}

interface Member {
  id: number;
  role: string;
  joined_at: string;
  users: {
    id: number;
    name: string;
    avatar_url?: string;
  };
}

interface MemberRecord {
  id: number;
  date: string;
  type: string;
  duration: number;
  photo_url?: string;
}

interface GroupInfo {
  id: number;
  code: string;
  group_number?: string;
  name: string;
  members: Member[];
  isCreator?: boolean;
}

// 运动记录消息卡片组件
function WorkoutMessageCard({ 
  message, 
  theme, 
  styles 
}: { 
  message: Message; 
  theme: any; 
  styles: any;
}) {
  const workoutData = message.workout_data as WorkoutData;
  const iconName = workoutData ? WORKOUT_ICONS[workoutData.type] || 'plus' : 'plus';

  if (!workoutData || !('type' in workoutData)) return null;

  // 一行显示：运动类型 + 时长 + 卡路里
  return (
    <View style={styles.workoutCardCompactInner}>
      <View style={styles.workoutIconSmall}>
        <FontAwesome6 name={iconName} size={14} color={theme.primary} />
      </View>
      <ThemedText variant="body" color={theme.textPrimary} numberOfLines={1}>
        {workoutData.type} {workoutData.duration}分钟
      </ThemedText>
      {workoutData.calories && (
        <ThemedText variant="caption" color={theme.primary} style={{ marginLeft: Spacing.xs }} numberOfLines={1}>
          {workoutData.calories}千卡
        </ThemedText>
      )}
    </View>
  );
}

// 昨日总结消息卡片组件
function DailySummaryCard({ 
  message, 
  theme, 
  styles,
  onPhotoPress,
}: { 
  message: Message; 
  theme: any; 
  styles: any;
  onPhotoPress?: (imageUrl: string) => void;
}) {
  const summaryData = message.workout_data as DailySummaryData;
  const photos = summaryData?.photos || [];

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <View style={styles.summaryIconWrap}>
          <FontAwesome6 name="calendar-check" size={20} color={theme.primary} />
        </View>
        <View style={styles.summaryHeaderText}>
          <ThemedText variant="bodyMedium" color={theme.textPrimary}>
            昨日运动总结
          </ThemedText>
          <ThemedText variant="caption" color={theme.textSecondary}>
            {summaryData?.date}
          </ThemedText>
        </View>
      </View>
      
      <ThemedText variant="body" color={theme.textPrimary} style={styles.summaryContent}>
        {message.content}
      </ThemedText>
      
      {photos.length > 0 && (
        <View style={styles.summaryPhotosSection}>
          <ThemedText variant="caption" color={theme.textMuted} style={styles.summaryPhotosTitle}>
            昨日运动照片 ({photos.length}张)
          </ThemedText>
          <View style={styles.summaryPhotosScrollWrapper}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.summaryPhotosScroll}
            >
              {photos.map((photo, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.summaryPhotoItem}
                  onPress={() => onPhotoPress?.(photo.url)}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: photo.url }} style={styles.summaryPhoto} />
                  <View style={styles.summaryPhotoInfo}>
                    <ThemedText variant="tiny" color={theme.textSecondary} numberOfLines={1}>
                      {photo.userName}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
      
      <View style={styles.summaryStats}>
        <View style={styles.summaryStatItem}>
          <FontAwesome6 name="users" size={14} color={theme.primary} />
          <ThemedText variant="small" color={theme.textSecondary}>
            {summaryData?.checkInCount}人打卡
          </ThemedText>
        </View>
        <View style={styles.summaryStatItem}>
          <FontAwesome6 name="dumbbell" size={14} color={theme.primary} />
          <ThemedText variant="small" color={theme.textSecondary}>
            {summaryData?.totalRecords}条记录
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

export default function GroupScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { user: currentUser } = useAuth();

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberRecords, setMemberRecords] = useState<MemberRecord[]>([]);
  const [loadingMemberRecords, setLoadingMemberRecords] = useState(false);
  const [hideWorkoutRecords, setHideWorkoutRecords] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  // 追踪当前可见的第一条消息（用于切换隐藏时保持位置）
  const firstVisibleMessageId = useRef<number | null>(null);
  // 追踪是否需要在过滤后滚动到指定位置
  const pendingScrollToId = useRef<number | null>(null);
  // 稳定的 viewabilityConfig（避免 FlatList 报错）
  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 50 }), []);
  
  // 图片查看器状态
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImages, setViewerImages] = useState<ImageMeta[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [viewerCurrentIndex, setViewerCurrentIndex] = useState(0);
  const [viewerType, setViewerType] = useState<'chat' | 'workout'>('chat');
  const scrollViewRef = useRef<ScrollView>(null);
  
  // 运动记录展开状态
  const [expandedWorkoutIds, setExpandedWorkoutIds] = useState<Set<number>>(new Set());
  
  // 追踪是否已首次加载消息（用于首次滚动到末尾）
  const hasInitiallyLoaded = useRef(false);
  
  // Web 端文件输入 ref
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Web 端处理图片文件选择
  const handleWebImageSelect = useCallback((event: Event) => {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      const file = files[0];
      // 创建本地预览 URL
      const localUri = URL.createObjectURL(file);
      uploadAndSendImage(localUri);
    }
    // 清理 input 值，允许重复选择相同文件
    input.value = '';
  }, []);

  // 创建隐藏的文件输入元素（Web 端）
  useEffect(() => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.addEventListener('change', handleWebImageSelect);
      document.body.appendChild(input);
      imageInputRef.current = input;

      return () => {
        input.removeEventListener('change', handleWebImageSelect);
        document.body.removeChild(input);
      };
    }
  }, [handleWebImageSelect]);

  // 成员运动统计计算
  const memberStats = useMemo(() => {
    if (memberRecords.length === 0) {
      return { totalRecords: 0, totalDuration: 0, totalCalories: 0, uniqueDays: 0, typeStats: {} };
    }
    
    const uniqueDays = new Set(memberRecords.map(r => r.date)).size;
    const totalDuration = memberRecords.reduce((sum, r) => sum + r.duration, 0);
    const typeStats: { [key: string]: number } = {};
    memberRecords.forEach(r => {
      typeStats[r.type] = (typeStats[r.type] || 0) + 1;
    });
    
    return {
      totalRecords: memberRecords.length,
      totalDuration,
      totalCalories: 0, // 从记录中无法获取卡路里，需要后端返回
      uniqueDays,
      typeStats,
    };
  }, [memberRecords]);

  // 过滤后的消息列表（根据隐藏设置过滤）
  const filteredMessages = useMemo(() => {
    if (!hideWorkoutRecords) {
      return messages;
    }
    // 隐藏运动打卡记录，但保留每日通报
    return messages.filter(m => m.type !== 'workout_record');
  }, [messages, hideWorkoutRecords]);

  // 提取聊天照片列表（仅包含image类型消息的照片，包含元数据）
  const chatImages = useMemo(() => {
    return messages
      .filter(m => m.type === 'image' && m.photo_url)
      .map(m => ({
        url: m.photo_url as string,
        date: m.created_at,
        senderName: m.user.name,
      }));
  }, [messages]);

  // 提取运动记录照片列表（包含所有照片，包含元数据）
  const workoutImages = useMemo(() => {
    const allPhotos: ImageMeta[] = [];
    messages
      .filter(m => m.type === 'workout_record' && m.workout_data)
      .forEach(m => {
        const data = m.workout_data as WorkoutData;
        // 添加所有照片
        if (data.photoUrls && data.photoUrls.length > 0) {
          data.photoUrls.forEach(url => {
            allPhotos.push({
              url,
              date: m.created_at,
              senderName: m.user.name,
            });
          });
        } else if (data.photoUrl) {
          allPhotos.push({
            url: data.photoUrl,
            date: m.created_at,
            senderName: m.user.name,
          });
        }
      });
    return allPhotos;
  }, [messages]);

  // 运动记录照片到消息的映射（用于查找照片所属消息）
  const workoutPhotoToMessage = useMemo(() => {
    const map = new Map<string, Message>();
    messages
      .filter(m => m.type === 'workout_record' && m.workout_data)
      .forEach(m => {
        const data = m.workout_data as WorkoutData;
        if (data.photoUrls && data.photoUrls.length > 0) {
          data.photoUrls.forEach(url => map.set(url, m));
        } else if (data.photoUrl) {
          map.set(data.photoUrl, m);
        }
      });
    return map;
  }, [messages]);

  // 打开图片查看器
  const openImageViewer = useCallback((imageUrl: string, type: 'chat' | 'workout') => {
    const images = type === 'chat' ? chatImages : workoutImages;
    const index = images.findIndex(img => img.url === imageUrl);
    const validIndex = index >= 0 ? index : 0;
    setViewerImages(images);
    setViewerInitialIndex(validIndex);
    setViewerCurrentIndex(validIndex);
    setViewerType(type);
    setShowImageViewer(true);
  }, [chatImages, workoutImages]);

  // Modal 打开后滚动到正确的图片
  useEffect(() => {
    if (showImageViewer && viewerInitialIndex > 0 && scrollViewRef.current) {
      // 延迟执行确保 ScrollView 已渲染
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

  // 切换运动记录展开状态
  const toggleWorkoutExpand = useCallback((messageId: number) => {
    setExpandedWorkoutIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  }, []);

  // 检查消息是否可以撤回（1分钟内自己的消息）
  const canRecallMessage = useCallback((message: Message): boolean => {
    if (!currentUser || message.user_id !== currentUser.id) return false;
    const messageTime = new Date(message.created_at).getTime();
    const now = Date.now();
    const oneMinute = 60 * 1000;
    return now - messageTime <= oneMinute;
  }, [currentUser]);

  // 撤回消息
  const handleRecallMessage = useCallback(async (message: Message) => {
    if (Platform.OS === 'web') {
      if (!window.confirm('确定要撤回这条消息吗？')) return;
    } else {
      Alert.alert(
        '撤回消息',
        '确定要撤回这条消息吗？',
        [
          { text: '取消', style: 'cancel' },
          { 
            text: '撤回', 
            style: 'destructive',
            onPress: async () => {
              await doRecallMessage(message.id);
            }
          }
        ]
      );
      return;
    }
    await doRecallMessage(message.id);
  }, []);

  const doRecallMessage = async (messageId: number) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl(`/api/v1/groups/messages/${messageId}`), {
        method: 'DELETE',
        headers,
      });

      const result = await response.json();
      if (result.success) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        if (Platform.OS === 'web') {
          window.alert('消息已撤回');
        } else {
          Alert.alert('成功', '消息已撤回');
        }
      } else {
        if (Platform.OS === 'web') {
          window.alert(result.error || '撤回失败');
        } else {
          Alert.alert('错误', result.error || '撤回失败');
        }
      }
    } catch (error) {
      console.error('撤回消息失败:', error);
      if (Platform.OS === 'web') {
        window.alert('撤回消息失败');
      } else {
        Alert.alert('错误', '撤回消息失败');
      }
    }
  };

  const fetchGroupInfo = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl('/api/v1/groups/current'), {
        headers,
      });

      const result = await response.json();
      setGroup(result.data);
    } catch (error) {
      console.error('获取群组信息失败:', error);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      // 获取所有消息（包括每日总结）
      const response = await fetch(getApiUrl('/api/v1/groups/messages'), {
        headers,
      });

      const result = await response.json();
      setMessages(result.data || []);
    } catch (error) {
      console.error('获取消息失败:', error);
    }
  }, []);

  const fetchMemberRecords = async (member: Member) => {
    setLoadingMemberRecords(true);
    setMemberRecords([]); // 先清空之前的记录
    try {
      const headers = await getAuthHeaders();
      const userId = member.users?.id;
      console.log('[群组] 获取成员运动记录:', { userId, memberName: member.users?.name });
      if (!userId) {
        console.log('[群组] 用户ID为空，跳过请求');
        return;
      }
      
      const response = await fetch(
        getApiUrl(`/api/v1/groups/members/${userId}/records`),
        { headers }
      );

      const result = await response.json();
      console.log('[群组] 成员运动记录结果:', result);
      if (result.success) {
        setMemberRecords(result.data || []);
      } else {
        console.error('[群组] 获取成员运动记录失败:', result.error);
      }
    } catch (error) {
      console.error('获取成员运动记录失败:', error);
    } finally {
      setLoadingMemberRecords(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchGroupInfo(), fetchMessages()]);
    setRefreshing(false);
  }, [fetchGroupInfo, fetchMessages]);

  useFocusEffect(
    useCallback(() => {
      fetchGroupInfo();
      fetchMessages();
    }, [fetchGroupInfo, fetchMessages])
  );

  useEffect(() => {
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // 首次加载消息后滚动到末尾
  useEffect(() => {
    if (messages.length > 0 && !hasInitiallyLoaded.current) {
      hasInitiallyLoaded.current = true;
      // 延迟执行，等待 FlatList 渲染完成
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [messages.length]);

  // 切换隐藏状态后滚动到之前记录的位置
  useEffect(() => {
    if (pendingScrollToId.current !== null && filteredMessages.length > 0) {
      const targetId = pendingScrollToId.current;
      pendingScrollToId.current = null; // 清除标记
      
      // Web 端不支持 scrollToIndex，跳过此功能
      if (Platform.OS === 'web') {
        return;
      }
      
      // 延迟执行，等待 FlatList 渲染完成
      setTimeout(() => {
        // 在过滤后的消息列表中找到该消息
        const targetIndex = filteredMessages.findIndex(m => m.id === targetId);
        
        if (targetIndex >= 0) {
          // 消息仍在列表中，直接滚动到该位置
          flatListRef.current?.scrollToIndex({
            index: targetIndex,
            animated: false,
          });
        } else {
          // 消息被过滤掉了（可能是打卡记录被隐藏），找到最近的前一条消息
          const originalIndex = messages.findIndex(m => m.id === targetId);
          if (originalIndex > 0) {
            // 向前查找最近的一条仍在过滤后列表中的消息
            for (let i = originalIndex - 1; i >= 0; i--) {
              const prevMessage = messages[i];
              const newIndex = filteredMessages.findIndex(m => m.id === prevMessage.id);
              if (newIndex >= 0) {
                flatListRef.current?.scrollToIndex({
                  index: newIndex,
                  animated: false,
                });
                break;
              }
            }
          }
        }
      }, 50);
    }
  }, [filteredMessages, messages]);

  const handleCreateGroup = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl('/api/v1/groups'), {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });

      const result = await response.json();
      if (result.success) {
        setShowCreateModal(false);
        // 重新获取群组信息（包含成员列表）
        await fetchGroupInfo();
        fetchMessages();
        Alert.alert('成功', `群组已创建！群号：${result.data.group_number}`);
      } else {
        Alert.alert('错误', result.error || '创建失败');
      }
    } catch (error) {
      console.error('创建群组失败:', error);
      Alert.alert('错误', '创建群组失败');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) {
      Alert.alert('提示', '请输入群号');
      return;
    }

    // 验证群号为4位数字
    if (!/^\d{4}$/.test(joinCode.trim())) {
      Alert.alert('提示', '群号应为4位数字');
      return;
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      console.log('[加入群组] 请求头:', headers, '群号:', joinCode.trim());
      
      const response = await fetch(getApiUrl('/api/v1/groups/join'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ groupNumber: joinCode.trim() }),
      });

      const result = await response.json();
      console.log('[加入群组] 响应:', result);
      
      if (result.success) {
        setShowJoinModal(false);
        setJoinCode('');
        fetchGroupInfo();
        fetchMessages();
        Alert.alert('成功', '已加入群组');
      } else {
        // 如果用户已在群组中，显示提示并刷新群组信息
        if (result.group) {
          Alert.alert('提示', result.error || '您已在群组中', [
            { text: '确定', onPress: () => {
              setShowJoinModal(false);
              setJoinCode('');
              fetchGroupInfo();
              fetchMessages();
            }}
          ]);
        } else {
          Alert.alert('错误', result.error || '加入失败');
        }
      }
    } catch (error) {
      console.error('加入群组失败:', error);
      Alert.alert('错误', '加入群组失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGroupName = async () => {
    if (!editingName.trim()) {
      Alert.alert('提示', '群组名称不能为空');
      return;
    }

    try {
      const headers = await getAuthHeaders();

      const response = await fetch(getApiUrl('/api/v1/groups/name'), {
        method: 'PUT',
        headers,
        body: JSON.stringify({ name: editingName.trim() }),
      });

      const result = await response.json();
      if (result.success) {
        setGroup(prev => prev ? { ...prev, name: editingName.trim() } : null);
        setIsEditingName(false);
      } else {
        Alert.alert('错误', result.error || '修改失败');
      }
    } catch (error) {
      console.error('修改群组名称失败:', error);
      Alert.alert('错误', '修改群组名称失败');
    }
  };

  // 追踪可见消息（使用 useCallback 稳定引用）
  const handleViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: any[] }) => {
    // 记录第一条可见消息的ID
    if (viewableItems.length > 0 && viewableItems[0].item) {
      firstVisibleMessageId.current = viewableItems[0].item.id;
    }
  }, []);

  // 切换隐藏/显示运动打卡记录
  const toggleHideWorkoutRecords = () => {
    // 记录当前可见的第一条消息，切换后滚动到该位置
    pendingScrollToId.current = firstVisibleMessageId.current;
    setHideWorkoutRecords(prev => !prev);
  };

  const handleSendMessage = async (content?: string, type: string = 'text', photoUrl?: string) => {
    const messageContent = content || messageInput.trim();
    if (!messageContent && type === 'text') return;

    if (type === 'text') {
      setMessageInput('');
    }
    setShowEmojiPicker(false);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl('/api/v1/groups/messages'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: messageContent, type, photoUrl }),
      });

      const result = await response.json();
      if (result.success) {
        fetchMessages();
      }
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };

  const handlePickImage = async () => {
    // Web 端使用隐藏的 file input
    if (Platform.OS === 'web' && imageInputRef.current) {
      imageInputRef.current.click();
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('提示', '需要相册权限才能发送图片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await uploadAndSendImage(asset.uri);
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      Alert.alert('错误', '选择图片失败');
    }
  };

  const uploadAndSendImage = async (uri: string) => {
    try {
      const headers = await getAuthHeaders();
      delete headers['Content-Type']; // FormData 需要删除 Content-Type

      const formData = new FormData();
      const file = await createFormDataFile(uri, `chat_${Date.now()}.jpg`, 'image/jpeg');
      formData.append('file', file as any);

      const uploadResponse = await fetch(getApiUrl('/api/v1/upload'), {
        method: 'POST',
        headers,
        body: formData,
      });

      const uploadResult = await uploadResponse.json();
      if (uploadResult.success && uploadResult.data?.url) {
        await handleSendMessage('[图片]', 'image', uploadResult.data.url);
      } else {
        Alert.alert('错误', '上传图片失败');
      }
    } catch (error) {
      console.error('上传图片失败:', error);
      Alert.alert('错误', '上传图片失败');
    }
  };

  const handleMemberPress = (member: Member) => {
    console.log('[群组] 点击成员:', member);
    setSelectedMember(member);
    setShowMembersModal(true); // 确保弹窗打开
    fetchMemberRecords(member);
  };

  // 根据用户ID显示用户详情（用于点击聊天消息中的头像/用户名）
  const handleUserPress = useCallback((userId: number, userName: string, avatarUrl?: string) => {
    // 如果是自己，跳转到个人中心
    if (currentUser && userId === currentUser.id) {
      router.push('/profile');
      return;
    }
    
    // 从群组成员列表中查找该用户
    const member = group?.members?.find(m => m.users?.id === userId);
    if (member) {
      handleMemberPress(member);
    } else {
      // 用户不在群组中（可能是已退出的用户），创建临时成员对象
      const tempMember: Member = {
        id: 0,
        role: 'member',
        joined_at: '',
        users: {
          id: userId,
          name: userName,
          avatar_url: avatarUrl,
        },
      };
      setSelectedMember(tempMember);
      setShowMembersModal(true); // 确保弹窗打开
      fetchMemberRecords(tempMember);
    }
  }, [currentUser, group?.members, router]);

  const handleLeaveGroup = async () => {
    // Web 端使用 window.confirm，移动端使用 Alert.alert
    if (Platform.OS === 'web') {
      if (!window.confirm('确定要退出群组吗？退出后需要重新加入才能看到群组内容。')) {
        return;
      }
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(getApiUrl('/api/v1/groups/leave'), {
          method: 'DELETE',
          headers,
        });

        const result = await response.json();
        if (result.success) {
          setGroup(null);
          setMessages([]);
          setShowMembersModal(false);
          window.alert('已退出群组');
        } else {
          window.alert(result.error || '退出失败');
        }
      } catch (error) {
        console.error('退出群组失败:', error);
        window.alert('退出群组失败');
      }
      return;
    }

    // 移动端使用 Alert.alert
    Alert.alert(
      '退出群组',
      '确定要退出群组吗？退出后需要重新加入才能看到群组内容。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '退出',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(getApiUrl('/api/v1/groups/leave'), {
                method: 'DELETE',
                headers,
              });

              const result = await response.json();
              if (result.success) {
                setGroup(null);
                setMessages([]);
                setShowMembersModal(false);
                Alert.alert('成功', '已退出群组');
              } else {
                Alert.alert('错误', result.error || '退出失败');
              }
            } catch (error) {
              console.error('退出群组失败:', error);
              Alert.alert('错误', '退出群组失败');
            }
          },
        },
      ]
    );
  };

  // 踢出群组成员
  const handleKickMember = (member: Member) => {
    const memberName = member.users?.name || '该成员';
    
    // Web 端使用 window.confirm
    if (Platform.OS === 'web') {
      if (!window.confirm(`确定要将 ${memberName} 移出群组吗？`)) {
        return;
      }
      
      doKickMember(member);
      return;
    }

    // 移动端使用 Alert.alert
    Alert.alert(
      '踢出成员',
      `确定要将 ${memberName} 移出群组吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: () => doKickMember(member),
        },
      ]
    );
  };

  const doKickMember = async (member: Member) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl(`/api/v1/groups/members/${member.users.id}`), {
        method: 'DELETE',
        headers,
      });

      const result = await response.json();
      if (result.success) {
        // 刷新群组信息
        fetchGroupInfo();
        if (Platform.OS === 'web') {
          window.alert('已将成员移出群组');
        } else {
          Alert.alert('成功', '已将成员移出群组');
        }
      } else {
        if (Platform.OS === 'web') {
          window.alert(result.error || '操作失败');
        } else {
          Alert.alert('错误', result.error || '操作失败');
        }
      }
    } catch (error) {
      console.error('踢出成员失败:', error);
      if (Platform.OS === 'web') {
        window.alert('踢出成员失败');
      } else {
        Alert.alert('错误', '踢出成员失败');
      }
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // 格式化日期用于分隔符显示
  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[date.getDay()];
    
    if (isToday) {
      return `今天 ${month}月${day}日 ${weekday}`;
    } else if (isYesterday) {
      return `昨天 ${month}月${day}日 ${weekday}`;
    } else {
      return `${month}月${day}日 ${weekday}`;
    }
  };

  // 获取消息的日期字符串（用于比较）
  const getMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toDateString();
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    // 检查是否需要显示日期分隔符
    const showDateSeparator = index === 0 || 
      getMessageDate(item.created_at) !== getMessageDate(filteredMessages[index - 1].created_at);
    const isSystem = item.type === 'system';
    const isWorkout = item.type === 'workout_record';
    const isDailySummary = item.type === 'daily_summary';
    const isImage = item.type === 'image';
    const isEmoji = item.type === 'emoji';
    const isOwnMessage = currentUser && item.user_id === currentUser.id;

    if (isWorkout) {
      // 打卡记录消息：一行显示（用户名 + 运动信息 + 时间）
      const workoutData = item.workout_data as WorkoutData;
      const iconName = workoutData ? WORKOUT_ICONS[workoutData.type] || 'plus' : 'plus';
      const hasPhotos = workoutData && ((workoutData.photoUrls && workoutData.photoUrls.length > 0) || workoutData.photoUrl);
      const isExpanded = expandedWorkoutIds.has(item.id);
      const photoList = (workoutData?.photoUrls && workoutData.photoUrls.length > 0) 
        ? workoutData.photoUrls 
        : (workoutData?.photoUrl ? [workoutData.photoUrl] : []);
      
      return (
        <View style={styles.messageItem}>
          {showDateSeparator && (
            <View style={styles.dateSeparator}>
              <ThemedText variant="caption" color={theme.textMuted}>
                {formatDateSeparator(item.created_at)}
              </ThemedText>
            </View>
          )}
          <View style={[styles.workoutRecordMessage]}>
          <View style={styles.workoutRecordOneLine}>
            {/* 用户头像 - 可点击查看用户详情 */}
            <TouchableOpacity 
              style={styles.workoutRecordAvatar}
              onPress={() => item.user_id && handleUserPress(item.user_id, item.user?.name || '未知用户', item.user?.avatar_url)}
              activeOpacity={0.7}
            >
              {item.user?.avatar_url ? (
                <Image source={{ uri: item.user.avatar_url }} style={styles.avatarImageSmall} />
              ) : (
                <View style={styles.avatarPlaceholderSmall}>
                  <FontAwesome6 name="user" size={10} color={theme.buttonPrimaryText} />
                </View>
              )}
            </TouchableOpacity>
            {/* 用户名 - 可点击查看用户详情 */}
            <TouchableOpacity
              onPress={() => item.user_id && handleUserPress(item.user_id, item.user?.name || '未知用户', item.user?.avatar_url)}
              activeOpacity={0.7}
            >
              <ThemedText variant="small" color={theme.primary} style={styles.workoutRecordUserName} numberOfLines={1}>
                {item.user?.name || '未知用户'}
              </ThemedText>
            </TouchableOpacity>
            {/* 运动图标 */}
            <View style={styles.workoutIconTiny}>
              <FontAwesome6 name={iconName} size={12} color={theme.primary} />
            </View>
            {/* 运动类型和时长 */}
            {workoutData && (
              <>
                <ThemedText variant="small" color={theme.textPrimary} numberOfLines={1}>
                  {workoutData.type} {workoutData.duration}分钟
                </ThemedText>
                {workoutData.calories && (
                  <ThemedText variant="tiny" color={theme.primary} style={{ marginLeft: 2 }} numberOfLines={1}>
                    {workoutData.calories}千卡
                  </ThemedText>
                )}
              </>
            )}
            {/* 时间 */}
            <ThemedText variant="tiny" color={theme.textMuted} style={{ marginLeft: 4 }} numberOfLines={1}>
              {formatTime(item.created_at)}
            </ThemedText>
            {/* 图片小标志 - 可点击展开照片 */}
            {hasPhotos && (
              <TouchableOpacity 
                style={styles.photoIndicator}
                onPress={() => toggleWorkoutExpand(item.id)}
                activeOpacity={0.7}
              >
                <FontAwesome6 name="images" size={12} color={theme.primary} />
                <ThemedText variant="tiny" color={theme.primary} style={{ marginLeft: 2 }}>
                  {photoList.length}
                </ThemedText>
                <FontAwesome6 
                  name={isExpanded ? "chevron-up" : "chevron-down"} 
                  size={10} 
                  color={theme.primary} 
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            )}
          </View>
          {/* 展开的照片 - 统一方形网格布局 */}
          {isExpanded && photoList.length > 0 && (
            <View style={styles.workoutPhotosGrid}>
              <View style={styles.workoutPhotoRow}>
                {photoList.slice(0, 5).map((url, idx) => (
                  <TouchableOpacity 
                    key={idx}
                    onPress={() => openImageViewer(url, 'workout')}
                    activeOpacity={0.9}
                    style={styles.workoutPhotoItem}
                  >
                    <Image source={{ uri: url }} style={styles.workoutPhotoItemImage} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

    if (isDailySummary) {
      return (
        <View style={styles.messageItem}>
          {showDateSeparator && (
            <View style={styles.dateSeparator}>
              <ThemedText variant="caption" color={theme.textMuted}>
                {formatDateSeparator(item.created_at)}
              </ThemedText>
            </View>
          )}
          <DailySummaryCard 
            message={item} 
            theme={theme} 
            styles={styles} 
            onPhotoPress={(url) => openImageViewer(url, 'workout')}
          />
        </View>
      );
    }

    if (isSystem) {
      return (
        <View style={styles.messageItem}>
          {showDateSeparator && (
            <View style={styles.dateSeparator}>
              <ThemedText variant="caption" color={theme.textMuted}>
                {formatDateSeparator(item.created_at)}
              </ThemedText>
            </View>
          )}
          <View style={[styles.systemMessage]}>
            <ThemedView level="tertiary" style={styles.systemMessageBubble}>
              <ThemedText variant="small" color={theme.textSecondary}>
                {item.content}
              </ThemedText>
            </ThemedView>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.messageItem}>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <ThemedText variant="caption" color={theme.textMuted}>
              {formatDateSeparator(item.created_at)}
            </ThemedText>
          </View>
        )}
        <TouchableOpacity 
          style={[isOwnMessage && styles.messageItemOwn]}
          onLongPress={() => {
            if (canRecallMessage(item)) {
              handleRecallMessage(item);
            }
          }}
          delayLongPress={500}
          activeOpacity={1}
        >
        <View style={[styles.messageRow, isOwnMessage && styles.messageRowOwn]}>
          {!isOwnMessage && (
            <TouchableOpacity 
              style={styles.messageAvatar}
              onPress={() => item.user_id && handleUserPress(item.user_id, item.user?.name || '未知用户', item.user?.avatar_url)}
              activeOpacity={0.7}
            >
              {item.user?.avatar_url ? (
                <Image source={{ uri: item.user.avatar_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <FontAwesome6 name="user" size={16} color={theme.buttonPrimaryText} />
                </View>
              )}
            </TouchableOpacity>
          )}
          <View style={[styles.messageContentWrap, isOwnMessage && styles.messageContentWrapOwn]}>
            {!isOwnMessage && (
              <TouchableOpacity
                onPress={() => item.user_id && handleUserPress(item.user_id, item.user?.name || '未知用户', item.user?.avatar_url)}
                activeOpacity={0.7}
              >
                <ThemedText variant="caption" color={theme.primary} style={styles.messageSender}>
                  {item.user?.name || '未知用户'}
                </ThemedText>
              </TouchableOpacity>
            )}
            {isEmoji ? (
              <View style={styles.emojiMessageBubble}>
                {(() => {
                  const emoji = EMOJI_IMAGES.find(e => e.id === item.photo_url);
                  if (emoji) {
                    return (
                      <View style={[styles.emojiIconWrap, { backgroundColor: EMOJI_COLORS[emoji.id] + '20' }]}>
                        <FontAwesome6 
                          name={emoji.icon} 
                          size={36} 
                          color={EMOJI_COLORS[emoji.id]} 
                        />
                      </View>
                    );
                  }
                  return <ThemedText variant="title" color={theme.textPrimary}>{item.content}</ThemedText>;
                })()}
              </View>
            ) : isImage && item.photo_url ? (
              <TouchableOpacity onPress={() => openImageViewer(item.photo_url!, 'chat')} activeOpacity={0.9}>
                <Image source={{ uri: item.photo_url }} style={styles.messageImage} resizeMode="cover" />
              </TouchableOpacity>
            ) : (
              <ThemedView level="default" style={[styles.messageContent, isOwnMessage && styles.messageContentOwn]}>
                <ThemedText variant="body" color={isOwnMessage ? theme.buttonPrimaryText : theme.textPrimary}>{item.content}</ThemedText>
              </ThemedView>
            )}
            <View style={[styles.messageTimeRow, isOwnMessage && styles.messageTimeRowOwn]}>
              <ThemedText variant="tiny" color={theme.textMuted}>{formatTime(item.created_at)}</ThemedText>
              {canRecallMessage(item) && (
                <ThemedText variant="tiny" color={theme.textMuted}> · 长按撤回</ThemedText>
              )}
            </View>
          </View>
          {isOwnMessage && (
            <TouchableOpacity 
              style={styles.messageAvatar}
              onPress={() => router.push('/profile')}
              activeOpacity={0.7}
            >
              {item.user?.avatar_url ? (
                <Image source={{ uri: item.user.avatar_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <FontAwesome6 name="user" size={16} color={theme.buttonPrimaryText} />
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
      </View>
    );
  };

  // 未加入群组时的界面
  if (!group) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <FontAwesome6 name="users" size={48} color={theme.textMuted} />
          </View>
          <ThemedText variant="h3" color={theme.textPrimary} style={styles.emptyTitle}>
            加入运动群组
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.emptySubtitle}>
            和朋友一起打卡，互相监督
          </ThemedText>

          <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)} disabled={loading}>
            <FontAwesome6 name="plus" size={20} color={theme.buttonPrimaryText} />
            <ThemedText variant="bodyMedium" color={theme.buttonPrimaryText} style={styles.buttonText}>
              创建群组
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.joinButton} onPress={() => setShowJoinModal(true)}>
            <FontAwesome6 name="keyboard" size={20} color={theme.primary} />
            <ThemedText variant="bodyMedium" color={theme.primary} style={styles.buttonText}>
              输入群号加入
            </ThemedText>
          </TouchableOpacity>
        </View>

        {showJoinModal && (
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()} disabled={Platform.OS === 'web'}>
              <ThemedView level="default" style={styles.modalContent}>
                <ThemedText variant="title" color={theme.textPrimary} style={styles.modalTitle}>
                  输入群号
                </ThemedText>
                <TextInput
                  style={styles.codeInput}
                  value={joinCode}
                  onChangeText={setJoinCode}
                  placeholder="请输入4位群号"
                  placeholderTextColor={theme.textMuted}
                  maxLength={4}
                  keyboardType="number-pad"
                  autoFocus
                  editable={true}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => { setShowJoinModal(false); setJoinCode(''); }}
                  >
                    <ThemedText variant="body" color={theme.textSecondary}>取消</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalConfirmButton} onPress={handleJoinGroup} disabled={loading}>
                    <ThemedText variant="bodyMedium" color={theme.buttonPrimaryText}>加入</ThemedText>
                  </TouchableOpacity>
                </View>
              </ThemedView>
            </TouchableWithoutFeedback>
          </View>
        )}

        {showCreateModal && (
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()} disabled={Platform.OS === 'web'}>
              <ThemedView level="default" style={styles.modalContent}>
                <ThemedText variant="title" color={theme.textPrimary} style={styles.modalTitle}>
                  创建群组
                </ThemedText>
                <ThemedText variant="small" color={theme.textSecondary} style={styles.modalSubtitle}>
                  创建成功后将自动生成4位群号，方便他人加入
                </ThemedText>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => { setShowCreateModal(false); }}
                  >
                    <ThemedText variant="body" color={theme.textSecondary}>取消</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalConfirmButton} onPress={handleCreateGroup} disabled={loading}>
                    <ThemedText variant="bodyMedium" color={theme.buttonPrimaryText}>
                      {loading ? '创建中...' : '创建'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </ThemedView>
            </TouchableWithoutFeedback>
          </View>
        )}
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      {/* 群组头部 */}
      <ThemedView level="default" style={styles.groupHeader}>
        <View style={styles.groupInfo}>
            {isEditingName ? (
              <View style={styles.groupNameRow}>
                <TextInput
                  style={styles.editNameInput}
                  value={editingName}
                  onChangeText={setEditingName}
                  autoFocus
                  maxLength={50}
                />
                <TouchableOpacity onPress={handleUpdateGroupName} style={styles.editNameButton}>
                  <FontAwesome6 name="check" size={18} color={theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsEditingName(false)} style={styles.editNameButton}>
                  <FontAwesome6 name="xmark" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.groupNameRow}>
                <ThemedText variant="bodyMedium" color={theme.textPrimary}>{group.name}</ThemedText>
                {group.isCreator && (
                  <TouchableOpacity 
                    onPress={() => { setEditingName(group.name); setIsEditingName(true); }}
                    style={styles.editNameButton}
                  >
                    <FontAwesome6 name="pen" size={14} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            )}
            <TouchableOpacity 
              style={styles.memberCountRow}
              onPress={() => setShowMembersModal(true)}
            >
              <FontAwesome6 name="users" size={12} color={theme.textSecondary} />
              <ThemedText variant="caption" color={theme.textSecondary}>
                {group.members?.length || 0} 人
              </ThemedText>
              <FontAwesome6 name="chevron-right" size={10} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.calendarButton}
            onPress={() => router.push('/group-calendar')}
          >
            <FontAwesome6 name="calendar-days" size={24} color={theme.primary} />
          </TouchableOpacity>
        </ThemedView>

        {/* 消息列表容器 - 占据剩余空间 */}
        <View style={styles.messageListContainer}>
          <FlatList
          ref={flatListRef}
          data={filteredMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messageList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="handled"
          onScrollToIndexFailed={({ index, highestMeasuredFrameIndex }) => {
            // 如果滚动失败，尝试滚动到最近的可用位置
            if (highestMeasuredFrameIndex >= 0) {
              flatListRef.current?.scrollToIndex({
                index: Math.min(index, highestMeasuredFrameIndex),
                animated: false,
              });
            }
          }}
        />
        </View>

        {/* 键盘避让区域：包裹表情选择器和输入框 */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          style={styles.inputArea}
        >
          {/* 快捷回复和表情面板 */}
          {showEmojiPicker && (
            <View style={styles.emojiPicker}>
              {/* 表情图片区 */}
              <View style={styles.emojiSection}>
                <ThemedText variant="caption" color={theme.textMuted} style={styles.emojiSectionTitle}>
                  发送表情
                </ThemedText>
                <View style={styles.emojiImageGrid}>
                  {EMOJI_IMAGES.map((emoji) => (
                    <TouchableOpacity
                      key={emoji.id}
                      style={styles.emojiImageButton}
                      onPress={() => handleSendMessage(emoji.name, 'emoji', emoji.id)}
                    >
                      <View style={[styles.emojiIconWrap, { backgroundColor: EMOJI_COLORS[emoji.id] + '20' }]}>
                        <FontAwesome6 
                          name={emoji.icon} 
                          size={22} 
                          color={EMOJI_COLORS[emoji.id]} 
                        />
                      </View>
                      <ThemedText variant="tiny" color={theme.textMuted}>{emoji.name}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {/* 快捷文字区 */}
              <View style={styles.emojiSection}>
                <ThemedText variant="caption" color={theme.textMuted} style={styles.emojiSectionTitle}>
                  快捷回复
                </ThemedText>
                <View style={styles.emojiGrid}>
                  {QUICK_REPLIES.map((reply, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.emojiButton}
                      onPress={() => setMessageInput(prev => prev + reply)}
                    >
                      <ThemedText variant="small" color={theme.textPrimary}>{reply}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* 输入框区域 */}
          <ThemedView level="default" style={styles.inputContainer}>
            <View style={styles.inputActionsRow}>
              <TouchableOpacity style={styles.actionButton} onPress={handlePickImage}>
                <FontAwesome6 name="image" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <FontAwesome6 
                  name="face-smile" 
                  size={18} 
                  color={showEmojiPicker ? theme.primary : theme.textSecondary} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={toggleHideWorkoutRecords}
              >
                <FontAwesome6 
                  name={hideWorkoutRecords ? "eye-slash" : "eye"} 
                  size={18} 
                  color={hideWorkoutRecords ? theme.error : theme.textSecondary} 
                />
              </TouchableOpacity>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.messageInput}
                value={messageInput}
                onChangeText={setMessageInput}
                placeholder="输入消息..."
                placeholderTextColor={theme.textMuted}
                multiline
                maxLength={500}
                editable={true}
                selectTextOnFocus={false}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[styles.sendButton, !messageInput.trim() && styles.sendButtonDisabled]}
                onPress={() => handleSendMessage()}
                disabled={!messageInput.trim()}
              >
                <FontAwesome6 name="paper-plane" size={20} color={theme.buttonPrimaryText} />
              </TouchableOpacity>
            </View>
          </ThemedView>
        </KeyboardAvoidingView>

      {/* 成员列表弹窗 */}
      <Modal
        visible={showMembersModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowMembersModal(false); setSelectedMember(null); }}
      >
        <View style={styles.membersModalOverlay}>
          <ThemedView level="default" style={styles.membersModalContent}>
            {selectedMember ? (
              <>
                {/* 成员运动记录 */}
                <View style={styles.membersModalHeader}>
                  <TouchableOpacity onPress={() => setSelectedMember(null)} style={styles.backButton}>
                    <FontAwesome6 name="chevron-left" size={20} color={theme.textPrimary} />
                  </TouchableOpacity>
                  <ThemedText variant="title" color={theme.textPrimary}>
                    {selectedMember.users?.name || '未知用户'}
                  </ThemedText>
                  <View style={{ width: 40 }} />
                </View>
                
                {/* 运动统计卡片 */}
                <View style={styles.memberStatsCard}>
                  <View style={styles.memberStatsRow}>
                    <View style={styles.memberStatsItem}>
                      <ThemedText variant="h2" color={theme.primary}>
                        {memberStats.totalRecords}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textSecondary}>
                        总打卡次数
                      </ThemedText>
                    </View>
                    <View style={styles.memberStatsItem}>
                      <ThemedText variant="h2" color={theme.primary}>
                        {memberStats.uniqueDays}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textSecondary}>
                        打卡天数
                      </ThemedText>
                    </View>
                    <View style={styles.memberStatsItem}>
                      <ThemedText variant="h2" color={theme.primary}>
                        {Math.floor(memberStats.totalDuration / 60)}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textSecondary}>
                        总时长(小时)
                      </ThemedText>
                    </View>
                  </View>
                  
                  {/* 运动类型分布 */}
                  {Object.keys(memberStats.typeStats).length > 0 && (
                    <View style={styles.typeStatsRow}>
                      {Object.entries(memberStats.typeStats)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 4)
                        .map(([type, count]) => (
                          <View key={type} style={styles.typeStatItem}>
                            <FontAwesome6 
                              name={WORKOUT_ICONS[type] || 'plus'} 
                              size={16} 
                              color={theme.primary} 
                            />
                            <ThemedText variant="tiny" color={theme.textMuted}>
                              {type} {count}次
                            </ThemedText>
                          </View>
                        ))}
                    </View>
                  )}
                </View>
                
                {/* 运动记录列表 */}
                <ThemedText variant="bodyMedium" color={theme.textSecondary} style={styles.sectionTitle}>
                  运动记录
                </ThemedText>
                
                {loadingMemberRecords ? (
                  <View style={styles.loadingContainer}>
                    <ThemedText variant="body" color={theme.textMuted}>加载中...</ThemedText>
                  </View>
                ) : memberRecords.length === 0 ? (
                  <View style={styles.loadingContainer}>
                    <FontAwesome6 name="dumbbell" size={40} color={theme.textMuted} />
                    <ThemedText variant="body" color={theme.textMuted} style={{ marginTop: 12 }}>
                      暂无运动记录
                    </ThemedText>
                  </View>
                ) : (
                  <FlatList
                    data={memberRecords}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.recordsList}
                    renderItem={({ item }) => (
                      <ThemedView level="tertiary" style={styles.memberRecordCard}>
                        <View style={styles.recordIconWrap}>
                          <FontAwesome6 
                            name={WORKOUT_ICONS[item.type] || 'plus'} 
                            size={20} 
                            color={theme.primary} 
                          />
                        </View>
                        <View style={styles.recordInfoWrap}>
                          <ThemedText variant="bodyMedium" color={theme.textPrimary}>
                            {item.type}
                          </ThemedText>
                          <ThemedText variant="caption" color={theme.textSecondary}>
                            {item.date} · {item.duration}分钟
                          </ThemedText>
                        </View>
                        {item.photo_url && (
                          <Image source={{ uri: item.photo_url }} style={styles.recordPhotoSmall} />
                        )}
                      </ThemedView>
                    )}
                  />
                )}
              </>
            ) : (
              <>
                {/* 成员列表 */}
                <View style={styles.membersModalHeader}>
                  <TouchableOpacity onPress={() => setShowMembersModal(false)} style={styles.backButton}>
                    <FontAwesome6 name="xmark" size={20} color={theme.textPrimary} />
                  </TouchableOpacity>
                  <ThemedText variant="title" color={theme.textPrimary}>
                    群组成员 ({group.members?.length || 0})
                  </ThemedText>
                  <View style={{ width: 40 }} />
                </View>
                
                {/* 群号和邀请码区域 */}
                <View style={styles.inviteCodeSection}>
                  {/* 固定群号 */}
                  <View style={styles.codeRow}>
                    <View style={styles.codeItem}>
                      <View style={styles.codeHeader}>
                        <FontAwesome6 name="hashtag" size={14} color={theme.textSecondary} />
                        <ThemedText variant="caption" color={theme.textSecondary} style={{ marginLeft: 4 }}>
                          固定群号
                        </ThemedText>
                      </View>
                      <ThemedText variant="h3" color={theme.textPrimary} style={styles.groupNumberText}>
                        {group.group_number || group.id?.toString().padStart(4, '0')}
                      </ThemedText>
                    </View>
                  </View>
                  
                  <ThemedText variant="caption" color={theme.textMuted} style={{ marginTop: Spacing.sm, textAlign: 'center' }}>
                    分享群号给朋友，一起打卡运动
                  </ThemedText>
                </View>
                
                <FlatList
                  data={group.members}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={styles.membersList}
                  style={styles.membersFlatList}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.memberItem}
                      onPress={() => handleMemberPress(item)}
                    >
                      <View style={styles.memberAvatar}>
                        <FontAwesome6 name="user" size={20} color={theme.textSecondary} />
                      </View>
                      <ThemedText variant="body" color={theme.textPrimary} style={styles.memberName}>
                        {item.users?.name || '未知用户'}
                        {item.role === 'owner' && (
                          <ThemedText variant="caption" color={theme.primary}> (群主)</ThemedText>
                        )}
                      </ThemedText>
                      {/* 群主可以踢出普通成员 */}
                      {group.isCreator && item.role !== 'owner' && item.users?.id !== currentUser?.id && (
                        <TouchableOpacity 
                          style={styles.kickButton}
                          onPress={() => handleKickMember(item)}
                        >
                          <FontAwesome6 name="user-minus" size={16} color={theme.error} />
                          <ThemedText variant="tiny" color={theme.error} style={{ marginLeft: 4 }}>移出</ThemedText>
                        </TouchableOpacity>
                      )}
                      <FontAwesome6 name="chevron-right" size={14} color={theme.textMuted} />
                    </TouchableOpacity>
                  )}
                />
                {/* 退出群组按钮 */}
                <View style={styles.leaveGroupContainer}>
                  <TouchableOpacity 
                    style={styles.leaveGroupButton}
                    onPress={handleLeaveGroup}
                  >
                    <FontAwesome6 name="right-from-bracket" size={18} color={theme.error} />
                    <ThemedText variant="body" color={theme.error} style={{ marginLeft: Spacing.sm }}>
                      退出群组
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ThemedView>
        </View>
      </Modal>

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
          
          {/* 图片类型标签 */}
          <View style={styles.imageViewerTypeLabel}>
            <ThemedText variant="small" color="#fff">
              {viewerType === 'chat' ? '聊天图片' : '运动记录图片'}
            </ThemedText>
          </View>
          
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
          
          {/* 图片信息：时间和发送人 */}
          {viewerImages.length > 0 && (
            <View style={styles.imageViewerInfo}>
              <ThemedText variant="small" color="#fff">
                {formatDateTime(viewerImages[viewerCurrentIndex]?.date)}
              </ThemedText>
              <ThemedText variant="small" color="rgba(255,255,255,0.8)">
                {viewerImages[viewerCurrentIndex]?.senderName}
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
    </Screen>
  );
}
