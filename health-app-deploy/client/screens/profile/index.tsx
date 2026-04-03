import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Text,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { createStyles } from './styles';
import { FontAwesome6 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { LineChart } from 'react-native-gifted-charts';
import { ECharts } from '@/components/ECharts';
import { getAuthHeaders } from '@/utils/auth';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { createFormDataFile } from '@/utils';
import { getRandomQuote } from '@/constants/motivationQuotes';
import { useAppUpdate, AppUpdateModal } from '@/components/AppUpdate';
import Constants from 'expo-constants';
import { getApiUrl } from '@/config/api';
import { Spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface UserData {
  id: number;
  username?: string;
  name: string;
  avatar_url?: string;
  avatarUrl?: string;  // 后端返回驼峰命名
  height?: number;
  weight?: number;
  group_id?: number;
}

interface BodyRecord {
  id: number;
  user_id: string;
  height?: number;
  weight?: number;
  record_date: string;
}

interface Milestone {
  label: string;
  date: string;
  dayOffset: number;
}

interface BodyHistoryData {
  records: BodyRecord[];
  milestones: Milestone[];
  joinDate: string | null;
}

interface WorkoutStats {
  totalRecords: number;
  totalDuration: number;
  totalCalories: number;
  thisMonthRecords: number;
}

interface WorkoutRecord {
  id: number;
  date: string;
  type: string;
  duration: number;
  photo_url?: string;
  photo_urls?: string[];
  calories?: number;
  created_at: string;
}

// BMI 范围配置（中国成人标准，六个档位）
const BMI_RANGES = [
  { min: 0, max: 18.5, label: '低体重', color: '#3B82F6', advice: '建议适当增加营养摄入，配合力量训练增加肌肉量。' },
  { min: 18.5, max: 24, label: '正常', color: '#10B981', advice: '继续保持健康的生活方式，定期运动，保持均衡饮食。' },
  { min: 24, max: 28, label: '肥胖前', color: '#F59E0B', advice: '建议控制饮食热量，增加有氧运动，每周至少运动3次。' },
  { min: 28, max: 32, label: '一级肥胖', color: '#F97316', advice: '建议制定减重计划，严格控制饮食，每日进行中等强度运动。' },
  { min: 32, max: 37, label: '二级肥胖', color: '#EF4444', advice: '建议咨询专业医生或营养师，制定科学的减重方案。' },
  { min: 37, max: 100, label: '三级肥胖', color: '#DC2626', advice: '建议尽快就医，在专业指导下进行体重管理。' },
];

export default function ProfileScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // 应用更新相关状态
  const {
    state: updateState,
    showModal: showUpdateModal,
    currentVersion: currentAppVersion,
    checkForUpdate,
    downloadAndInstall: handleDownloadUpdate,
    closeModal: handleCloseUpdateModal,
  } = useAppUpdate();

  const [user, setUser] = useState<UserData | null>(null);
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now()); // 头像缓存时间戳
  const [bodyHistory, setBodyHistory] = useState<BodyRecord[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [joinDate, setJoinDate] = useState<string | null>(null);
  const [workoutStats, setWorkoutStats] = useState<WorkoutStats>({
    totalRecords: 0,
    totalDuration: 0,
    totalCalories: 0,
    thisMonthRecords: 0,
  });
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editHeight, setEditHeight] = useState('');
  const [editWeight, setEditWeight] = useState('');
  
  // 修改密码Modal状态
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [motivationQuote, setMotivationQuote] = useState('');
  const [workoutRecords, setWorkoutRecords] = useState<WorkoutRecord[]>([]);
  
  // 图片查看器状态
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImages, setViewerImages] = useState<{ url: string; date: string; type: string; duration: number }[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [viewerCurrentIndex, setViewerCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const VIEWER_WIDTH = Dimensions.get('window').width;
  
  const { logout, updateUser, user: authUser, isAuthenticated } = useAuth();
  const router = useSafeRouter();

  // Web 端文件输入 ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Web 端处理文件选择
  const handleWebFileSelect = useCallback((event: Event) => {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      const file = files[0];
      // 创建本地预览 URL
      const localUri = URL.createObjectURL(file);
      uploadAvatar(localUri);
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
      input.addEventListener('change', handleWebFileSelect);
      document.body.appendChild(input);
      fileInputRef.current = input;

      return () => {
        input.removeEventListener('change', handleWebFileSelect);
        document.body.removeChild(input);
      };
    }
  }, [handleWebFileSelect]);

  // 上传头像
  const handleUploadAvatar = async () => {
    // Web 端直接打开文件选择器
    if (Platform.OS === 'web') {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }
    
    // 移动端显示选择弹窗
    Alert.alert(
      '选择头像',
      '请选择头像来源',
      [
        { text: '从相册选择', onPress: pickFromGallery },
        { text: '拍照', onPress: takePhoto },
        { text: '取消', style: 'cancel' },
      ]
    );
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('权限不足', '需要相册访问权限才能选择头像');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('权限不足', '需要相机访问权限才能拍照');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    setUploadingAvatar(true);
    try {
      const headers = await getAuthHeaders();
      const fileData = await createFormDataFile(uri, 'avatar.jpg', 'image/jpeg');
      
      // 使用FormData包装
      const formData = new FormData();
      formData.append('file', fileData as any);

      const response = await fetch(getApiUrl('/api/v1/users/avatar'), {
        method: 'POST',
        headers: {
          'x-user-id': headers['x-user-id'] || '',
        },
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        // 同时更新两种命名方式，确保兼容性
        setUser(prev => prev ? { 
          ...prev, 
          avatar_url: result.data.avatarUrl,
          avatarUrl: result.data.avatarUrl 
        } : prev);
        setAvatarTimestamp(Date.now()); // 更新时间戳强制刷新头像
        updateUser({ avatarUrl: result.data.avatarUrl });
        if (Platform.OS === 'web') {
          window.alert('头像已更新');
        } else {
          Alert.alert('成功', '头像已更新');
        }
      } else {
        if (Platform.OS === 'web') {
          window.alert(result.error || '上传失败');
        } else {
          Alert.alert('错误', result.error || '上传失败');
        }
      }
    } catch (error) {
      console.error('上传头像失败:', error);
      if (Platform.OS === 'web') {
        window.alert('上传头像失败，请重试');
      } else {
        Alert.alert('错误', '上传头像失败，请重试');
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();

      // 获取用户信息
      const userRes = await fetch(getApiUrl('/api/v1/users/me'), {
        headers,
      });
      const userResult = await userRes.json();
      if (userResult.success && userResult.data) {
        setUser(userResult.data);
        setEditHeight(userResult.data.height?.toString() || '');
        setEditWeight(userResult.data.weight?.toString() || '');
        // 同步用户数据到AuthContext，确保其他页面也能获取最新数据
        updateUser({
          name: userResult.data.name,
          avatarUrl: userResult.data.avatarUrl || userResult.data.avatar_url,
          height: userResult.data.height,
          weight: userResult.data.weight,
        });
      }

      // 获取身体数据历史
      const historyRes = await fetch(getApiUrl('/api/v1/users/body-history'), {
        headers,
      });
      const historyResult = await historyRes.json();
      if (historyResult.success) {
        const historyData = historyResult.data as BodyHistoryData;
        setBodyHistory(historyData?.records || []);
        setMilestones(historyData?.milestones || []);
        setJoinDate(historyData?.joinDate || null);
      }

      // 获取运动统计
      const statsRes = await fetch(getApiUrl('/api/v1/workouts'), {
        headers,
      });
      const statsResult = await statsRes.json();
      if (statsResult.success && statsResult.data) {
        const records = statsResult.data;
        
        // 保存完整的运动记录（用于个人相册）
        setWorkoutRecords(records || []);
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const thisMonthRecords = records.filter((r: any) => {
          const date = new Date(r.date);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        setWorkoutStats({
          totalRecords: records.length,
          totalDuration: records.reduce((sum: number, r: any) => sum + r.duration, 0),
          totalCalories: records.reduce((sum: number, r: any) => sum + (r.calories || 0), 0),
          thisMonthRecords: thisMonthRecords.length,
        });

        // 计算本周运动天数
        const today = new Date();
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const weekDates = new Set<string>();
        records.forEach((r: any) => {
          const recordDate = new Date(r.date);
          if (recordDate >= startOfWeek && recordDate <= endOfWeek) {
            weekDates.add(r.date);
          }
        });

        const weeklyDays = weekDates.size;
        if (weeklyDays > 0) {
          setMotivationQuote(getRandomQuote(weeklyDays));
        } else {
          setMotivationQuote('');
        }
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // 相册照片列表（包含元数据）
  const albumPhotos = useMemo(() => {
    return workoutRecords
      .filter(r => r.photo_urls && r.photo_urls.length > 0)
      .flatMap(r => (r.photo_urls || []).map((url, idx) => ({
        url,
        date: r.date,
        type: r.type,
        duration: r.duration,
      })));
  }, [workoutRecords]);

  // 打开图片查看器
  const openImageViewer = useCallback((imageUrl: string) => {
    const index = albumPhotos.findIndex(img => img.url === imageUrl);
    const validIndex = index >= 0 ? index : 0;
    setViewerImages(albumPhotos);
    setViewerInitialIndex(validIndex);
    setViewerCurrentIndex(validIndex);
    setShowImageViewer(true);
  }, [albumPhotos]);

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
  }, [showImageViewer, viewerInitialIndex, VIEWER_WIDTH]);

  // 处理图片滑动
  const handleImageViewerScroll = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / VIEWER_WIDTH);
    if (newIndex !== viewerCurrentIndex && newIndex >= 0 && newIndex < viewerImages.length) {
      setViewerCurrentIndex(newIndex);
    }
  }, [viewerCurrentIndex, viewerImages.length, VIEWER_WIDTH]);

  // 格式化日期
  const formatDateTime = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}-${day}`;
  };

  // 计算BMI
  const bmi = useMemo(() => {
    if (!user?.height || !user?.weight) return null;
    const heightM = user.height / 100;
    return Number((user.weight / (heightM * heightM)).toFixed(1));
  }, [user?.height, user?.weight]);

  // 获取BMI状态
  const bmiStatus = useMemo(() => {
    if (!bmi) return null;
    for (const range of BMI_RANGES) {
      if (bmi >= range.min && bmi < range.max) {
        return { label: range.label, color: range.color, advice: range.advice };
      }
    }
    // 超出范围的归入最后一级
    const lastRange = BMI_RANGES[BMI_RANGES.length - 1];
    return { label: lastRange.label, color: lastRange.color, advice: lastRange.advice };
  }, [bmi]);

  // BMI进度条位置（0-100%）
  // 根据BMI范围分段映射，确保指示器位置与下方标签对齐
  const bmiProgress = useMemo(() => {
    if (!bmi) return 0;
    
    // BMI分级边界: 0 -> 18.5 -> 24 -> 28 -> 32 -> 37 -> 45
    // 对应进度:    0% -> 16.7% -> 33.3% -> 50% -> 66.7% -> 83.3% -> 100%
    
    if (bmi < 18.5) {
      // 低体重区间: 0-18.5 -> 0-16.7%
      return Math.max(0, (bmi / 18.5) * 16.7);
    } else if (bmi < 24) {
      // 正常区间: 18.5-24 -> 16.7-33.3%
      return 16.7 + ((bmi - 18.5) / (24 - 18.5)) * 16.6;
    } else if (bmi < 28) {
      // 肥胖前区间: 24-28 -> 33.3-50%
      return 33.3 + ((bmi - 24) / (28 - 24)) * 16.7;
    } else if (bmi < 32) {
      // 一级肥胖区间: 28-32 -> 50-66.7%
      return 50 + ((bmi - 28) / (32 - 28)) * 16.7;
    } else if (bmi < 37) {
      // 二级肥胖区间: 32-37 -> 66.7-83.3%
      return 66.7 + ((bmi - 32) / (37 - 32)) * 16.6;
    } else {
      // 三级肥胖区间: 37+ -> 83.3-100%
      return Math.min(100, 83.3 + Math.min((bmi - 37) / 8, 1) * 16.7);
    }
  }, [bmi]);

  // 计算图表尺寸（三端适配）
  const chartDimensions = useMemo(() => {
    // Web 端固定宽度 390px，移动端使用实际屏幕尺寸
    const containerWidth = Platform.OS === 'web' ? 390 : SCREEN_WIDTH;
    // 图表宽度 = 容器宽度 - 左右边距 - Y轴空间
    const chartWidth = containerWidth - 32 - 60; // 32px左右边距，60px Y轴空间
    const chartHeight = 180;
    
    return { containerWidth, chartWidth, chartHeight };
  }, []);

  // 体重历史图表数据 - 支持5个固定节点 + 自定义数据
  const weightChartData = useMemo(() => {
    if (!joinDate || !milestones || milestones.length === 0) return [];
    if (!bodyHistory || !Array.isArray(bodyHistory)) return [];
    
    const joinDateObj = new Date(joinDate);
    const today = new Date();
    
    // 创建数据点映射（按日期）
    const recordMap = new Map<string, number>();
    bodyHistory.forEach(record => {
      if (record.weight) {
        recordMap.set(record.record_date, record.weight);
      }
    });
    
    // 创建里程碑日期集合
    const milestoneDateSet = new Set(milestones.map(m => m.date));
    
    // 生成图表数据
    const data: any[] = [];
    
    // 1. 首先添加5个固定节点（里程碑）
    milestones.forEach((milestone, index) => {
      // 只显示当前日期之前的里程碑
      if (new Date(milestone.date) <= today) {
        const weight = recordMap.get(milestone.date);
        data.push({
          value: weight || 0,
          label: milestone.label,
          isMilestone: true,
          hasData: !!weight,
          date: milestone.date,
          // 里程碑样式
          dataPointHeight: weight ? 8 : 4,
          dataPointWidth: weight ? 8 : 4,
          dataPointColor: weight ? theme.primary : theme.borderLight,
          dataPointShape: 'circle',
          text: weight ? weight.toString() : '',
          textColor: theme.textPrimary,
          textSize: 11,
          textShiftY: -12,
        });
      }
    });
    
    // 2. 添加里程碑之间的自定义数据点
    bodyHistory
      .filter(record => record.weight && !milestoneDateSet.has(record.record_date))
      .sort((a, b) => a.record_date.localeCompare(b.record_date))
      .forEach(record => {
        // 计算该日期相对于加入日期的天数
        const recordDate = new Date(record.record_date);
        const daysSinceJoin = Math.floor((recordDate.getTime() - joinDateObj.getTime()) / (1000 * 60 * 60 * 24));
        
        // 只显示在6个月范围内且不在里程碑日期的数据
        if (daysSinceJoin >= 0 && daysSinceJoin <= 180) {
          data.push({
            value: record.weight!,
            label: record.record_date.slice(5), // MM-DD
            isMilestone: false,
            date: record.record_date,
            daysSinceJoin,
            // 普通数据点样式
            dataPointHeight: 4,
            dataPointWidth: 4,
            dataPointColor: theme.accent,
            dataPointShape: 'circle',
          });
        }
      });
    
    return data;
  }, [bodyHistory, milestones, joinDate, theme]);

  // 计算体重图表的纵坐标范围
  const weightChartRange = useMemo(() => {
    if (!bodyHistory || !Array.isArray(bodyHistory)) {
      return { minValue: 50, maxValue: 100 };
    }
    
    // 获取所有有数据的记录
    const weightsWithData = bodyHistory
      .filter(r => r.weight)
      .map(r => r.weight!);
    
    if (weightsWithData.length === 0) {
      return { minValue: 50, maxValue: 100 };
    }

    const minWeight = Math.min(...weightsWithData);
    const maxWeight = Math.max(...weightsWithData);

    // 默认范围 50-100
    let minValue = 50;
    let maxValue = 100;

    // 如果超出范围，自动调整
    if (minWeight < 50) {
      minValue = Math.floor(minWeight / 10) * 10;
    }
    if (maxWeight > 100) {
      maxValue = Math.ceil(maxWeight / 10) * 10;
    }
    
    // 确保范围至少有10kg
    if (maxValue - minValue < 10) {
      maxValue = minValue + 10;
    }

    return { minValue, maxValue };
  }, [bodyHistory]);

  // 计算里程碑进度（用于时间线显示）
  const milestoneProgress = useMemo(() => {
    if (!joinDate || !milestones || milestones.length === 0) return [];
    if (!bodyHistory || !Array.isArray(bodyHistory)) return [];
    
    const today = new Date();
    
    return milestones.map((milestone, index) => {
      const milestoneDate = new Date(milestone.date);
      const isPassed = milestoneDate <= today;
      const daysUntil = Math.ceil((milestoneDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // 查找该日期是否有体重记录
      const record = bodyHistory.find(r => r.record_date === milestone.date && r.weight);
      
      return {
        ...milestone,
        isPassed,
        daysUntil,
        hasData: !!record,
        weight: record?.weight,
      };
    });
  }, [joinDate, milestones, bodyHistory]);

  // 计算X轴标签（每半个月或一个月标注）
  const xAxisLabels = useMemo(() => {
    if (weightChartData.length === 0) return [];
    
    const labelInterval = weightChartData.length > 30 ? 15 : weightChartData.length > 14 ? 7 : 1;
    
    return weightChartData.map((item, index) => {
      // 只在间隔点显示标签
      if (index % labelInterval === 0 || index === weightChartData.length - 1) {
        return item.label;
      }
      return '';
    });
  }, [weightChartData]);

  const handleSaveBodyData = async () => {
    try {
      const height = editHeight ? parseInt(editHeight, 10) : undefined;
      const weight = editWeight ? parseInt(editWeight, 10) : undefined;

      if (!height && !weight) {
        Alert.alert('提示', '请至少输入一项数据');
        return;
      }

      const headers = await getAuthHeaders();
      const res = await fetch(getApiUrl('/api/v1/users/body'), {
        method: 'PUT',
        headers,
        body: JSON.stringify({ height, weight }),
      });

      const result = await res.json();
      if (result.success) {
        setUser(result.data);
        setShowEditModal(false);
        // 同步用户数据到AuthContext
        updateUser({
          height: result.data.height,
          weight: result.data.weight,
        });
        fetchData(); // 刷新数据
      } else {
        Alert.alert('错误', result.error || '保存失败');
      }
    } catch (error) {
      console.error('保存身体数据失败:', error);
      Alert.alert('错误', '保存失败，请重试');
    }
  };

  const handleLogout = () => {
    if (!isAuthenticated) {
      // 未登录时跳转到登录页面
      router.push('/login');
      return;
    }
    
    // Web 端使用 window.confirm
    if (Platform.OS === 'web') {
      if (window.confirm('确定要退出当前账号吗？')) {
        logout();
        setUser(null);
        setBodyHistory([]);
        setWorkoutStats({
          totalRecords: 0,
          totalDuration: 0,
          totalCalories: 0,
          thisMonthRecords: 0,
        });
        // 使用 setTimeout 确保状态更新后再跳转
        setTimeout(() => {
          router.replace('/login');
        }, 100);
      }
      return;
    }
    
    Alert.alert(
      '退出登录',
      '确定要退出当前账号吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: async () => {
            await logout();
            setUser(null);
            setBodyHistory([]);
            setWorkoutStats({
              totalRecords: 0,
              totalDuration: 0,
              totalCalories: 0,
              thisMonthRecords: 0,
            });
            // 使用 setTimeout 确保状态更新后再跳转
            setTimeout(() => {
              router.replace('/login');
            }, 100);
          },
        },
      ]
    );
  };

  // 修改密码
  const handleChangePassword = async () => {
    if (!oldPassword.trim()) {
      if (Platform.OS === 'web') {
        window.alert('请输入旧密码');
      } else {
        Alert.alert('提示', '请输入旧密码');
      }
      return;
    }

    if (!newPassword.trim()) {
      if (Platform.OS === 'web') {
        window.alert('请输入新密码');
      } else {
        Alert.alert('提示', '请输入新密码');
      }
      return;
    }

    if (newPassword.length < 6 || newPassword.length > 20) {
      if (Platform.OS === 'web') {
        window.alert('新密码长度需要6-20个字符');
      } else {
        Alert.alert('提示', '新密码长度需要6-20个字符');
      }
      return;
    }

    if (newPassword !== confirmNewPassword) {
      if (Platform.OS === 'web') {
        window.alert('两次输入的新密码不一致');
      } else {
        Alert.alert('提示', '两次输入的新密码不一致');
      }
      return;
    }

    setChangingPassword(true);
    try {
      const headers = await getAuthHeaders();
      
      /**
       * 服务端文件：server/src/routes/users.ts
       * 接口：PUT /api/v1/users/password
       * Body 参数：oldPassword: string, newPassword: string
       */
      const response = await fetch(getApiUrl('/api/v1/users/password'), {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oldPassword,
          newPassword,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setShowPasswordModal(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        if (Platform.OS === 'web') {
          window.alert('密码修改成功！');
        } else {
          Alert.alert('成功', '密码修改成功！');
        }
      } else {
        if (Platform.OS === 'web') {
          window.alert(result.error || '修改失败');
        } else {
          Alert.alert('错误', result.error || '修改失败');
        }
      }
    } catch (error) {
      console.error('修改密码失败:', error);
      if (Platform.OS === 'web') {
        window.alert('修改密码失败，请重试');
      } else {
        Alert.alert('错误', '修改密码失败，请重试');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedView level="root" style={styles.header}>
          <ThemedText variant="h2" color={theme.textPrimary}>
            个人中心
          </ThemedText>
        </ThemedView>

        {/* 用户信息卡片 */}
        <ThemedView level="default" style={styles.profileCard}>
          <View style={styles.userRow}>
            <TouchableOpacity 
              style={styles.avatarContainer}
              onPress={isAuthenticated ? handleUploadAvatar : undefined}
              disabled={uploadingAvatar || !isAuthenticated}
            >
              {(user?.avatarUrl || user?.avatar_url) ? (
                <Image 
                  key={user?.avatarUrl || user?.avatar_url}
                  source={{ uri: user?.avatarUrl || user?.avatar_url }} 
                  style={styles.avatarImage} 
                />
              ) : (
                <FontAwesome6 name="user" size={32} color={theme.buttonPrimaryText} />
              )}
              {uploadingAvatar && (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator color={theme.buttonPrimaryText} />
                </View>
              )}
              {isAuthenticated && (
                <View style={styles.avatarEditBadge}>
                  <FontAwesome6 name="camera" size={10} color={theme.buttonPrimaryText} />
                </View>
              )}
            </TouchableOpacity>
            
            <View style={styles.userInfoColumn}>
              <ThemedText variant="title" color={theme.textPrimary} numberOfLines={1}>
                {isAuthenticated ? (user?.name || '未设置') : '未登录'}
              </ThemedText>
              {isAuthenticated && (
                <ThemedText variant="bodyMedium" color={theme.textMuted} numberOfLines={1}>
                  @{user?.username || '未设置'}
                </ThemedText>
              )}
              {isAuthenticated && user?.group_id && (
                <View style={styles.groupBadge}>
                  <FontAwesome6 name="users" size={10} color={theme.primary} />
                  <ThemedText variant="caption" color={theme.primary} style={{ marginLeft: 4 }}>
                    已加入群组
                  </ThemedText>
                </View>
              )}
            </View>

            {/* 按钮区域 - 上下排列 */}
            <View style={styles.actionButtonsContainer}>
              {/* 修改密码按钮 */}
              {isAuthenticated && (
                <TouchableOpacity 
                  style={styles.changePasswordButton}
                  onPress={() => setShowPasswordModal(true)}
                >
                  <FontAwesome6 name="key" size={12} color={theme.primary} />
                  <ThemedText variant="tiny" color={theme.primary} style={{ marginLeft: 4 }}>
                    修改密码
                  </ThemedText>
                </TouchableOpacity>
              )}

              {/* 退出登录按钮 */}
              <TouchableOpacity 
                style={[styles.logoutButton, !isAuthenticated && styles.loginButton]} 
                onPress={handleLogout}
              >
                <FontAwesome6 
                  name={isAuthenticated ? "right-from-bracket" : "right-to-bracket"} 
                  size={12} 
                  color={isAuthenticated ? theme.error : theme.primary} 
                />
                <ThemedText variant="tiny" color={isAuthenticated ? theme.error : theme.primary} style={{ marginLeft: 4 }}>
                  {isAuthenticated ? '退出' : '登录'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ThemedView>

        {/* 身体数据卡片 */}
        <ThemedView level="default" style={styles.bodyDataCard}>
          <View style={styles.bodyDataHeader}>
            <ThemedText variant="title" color={theme.textPrimary}>身体数据</ThemedText>
            <TouchableOpacity style={styles.editButton} onPress={() => setShowEditModal(true)}>
              <FontAwesome6 name="pen" size={14} color={theme.primary} />
              <ThemedText variant="small" color={theme.primary} style={{ marginLeft: 4 }}>编辑</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.bodyDataRow}>
            <View style={styles.bodyDataItem}>
              <ThemedText variant="h3" color={theme.primary}>
                {user?.height || '--'}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>身高 cm</ThemedText>
            </View>
            <View style={styles.bodyDataDivider} />
            <View style={styles.bodyDataItem}>
              <ThemedText variant="h3" color={theme.primary}>
                {user?.weight || '--'}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>体重 kg</ThemedText>
            </View>
            <View style={styles.bodyDataDivider} />
            <View style={styles.bodyDataItem}>
              <ThemedText variant="h3" color={bmiStatus?.color || theme.textMuted}>
                {bmi?.toFixed(1) || '--'}
              </ThemedText>
              <ThemedText variant="caption" color={bmiStatus?.color || theme.textMuted}>
                {bmiStatus?.label || 'BMI'}
              </ThemedText>
            </View>
          </View>

          {/* BMI 指示条 */}
          {bmi && (
            <View style={styles.bmiIndicator}>
              <View style={styles.bmiLabels}>
                <ThemedText variant="caption" color={BMI_RANGES[0].color}>低体重</ThemedText>
                <ThemedText variant="caption" color={BMI_RANGES[1].color}>正常</ThemedText>
                <ThemedText variant="caption" color={BMI_RANGES[2].color}>肥胖前</ThemedText>
                <ThemedText variant="caption" color={BMI_RANGES[3].color}>一级肥胖</ThemedText>
                <ThemedText variant="caption" color={BMI_RANGES[4].color}>二级肥胖</ThemedText>
                <ThemedText variant="caption" color={BMI_RANGES[5].color}>三级肥胖</ThemedText>
              </View>
              <View style={styles.bmiBarContainer}>
                <View
                  style={[
                    styles.bmiPointer,
                    { left: `${bmiProgress}%`, marginLeft: -10 },
                  ]}
                />
              </View>
              {bmiStatus?.advice && (
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.bmiAdvice}>
                  {bmiStatus.advice}
                </ThemedText>
              )}
            </View>
          )}

          {/* 提示信息 */}
          {!user?.height && !user?.weight && (
            <View style={styles.hintRow}>
              <FontAwesome6 name="circle-info" size={12} color={theme.textMuted} />
              <ThemedText variant="caption" color={theme.textMuted} style={{ marginLeft: 4 }}>
                点击编辑设置身体数据
              </ThemedText>
            </View>
          )}
        </ThemedView>

        {/* 体重变化趋势 */}
        <ThemedView level="default" style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <ThemedText variant="title" color={theme.textPrimary}>
              体重变化趋势
            </ThemedText>
          </View>

          {bodyHistory.filter(r => r.weight).length > 0 ? (
            <>
              {/* 体重趋势曲线图 - 使用 ECharts */}
              {(() => {
                const allRecords = bodyHistory
                  .filter(r => r.weight)
                  .sort((a, b) => a.record_date.localeCompare(b.record_date));
                
                if (allRecords.length < 1) return null;
                
                // 格式化日期为 "月/日"
                const formatDate = (dateStr: string) => {
                  const d = new Date(dateStr);
                  const month = d.getMonth() + 1;
                  const day = d.getDate();
                  return `${month}/${day.toString().padStart(2, '0')}`;
                };
                
                // 计算标签显示间隔（根据数据点数量自动调整）
                const totalPoints = allRecords.length;
                let labelInterval;
                if (totalPoints <= 30) {
                  labelInterval = 6; // 每7天显示一个标签
                } else if (totalPoints <= 90) {
                  labelInterval = 9; // 每10天显示一个标签
                } else {
                  labelInterval = Math.floor(totalPoints / 12); // 约显示12个标签
                }
                
                // 准备图表数据
                const dates = allRecords.map(r => r.record_date);
                const weights = allRecords.map(r => r.weight!);
                
                // 找出最高和最低体重点
                let maxWeight = { value: 0, date: '', index: 0 };
                let minWeight = { value: 999, date: '', index: 0 };
                allRecords.forEach((r, i) => {
                  if (r.weight! > maxWeight.value) {
                    maxWeight = { value: r.weight!, date: r.record_date, index: i };
                  }
                  if (r.weight! < minWeight.value) {
                    minWeight = { value: r.weight!, date: r.record_date, index: i };
                  }
                });
                
                // 计算Y轴范围
                const minY = Math.floor(minWeight.value - 2);
                const maxY = Math.ceil(maxWeight.value + 2);
                
                // 构建标记点数据
                const markPointData = [
                  {
                    name: '起始',
                    coord: [allRecords[0].record_date, allRecords[0].weight!],
                    value: allRecords[0].weight!,
                    itemStyle: { color: theme.primary }
                  },
                  {
                    name: '最高',
                    coord: [maxWeight.date, maxWeight.value],
                    value: maxWeight.value,
                    itemStyle: { color: '#EF4444' }
                  },
                  {
                    name: '最低',
                    coord: [minWeight.date, minWeight.value],
                    value: minWeight.value,
                    itemStyle: { color: '#10B981' }
                  },
                  {
                    name: '最新',
                    coord: [allRecords[allRecords.length - 1].record_date, allRecords[allRecords.length - 1].weight!],
                    value: allRecords[allRecords.length - 1].weight!,
                    itemStyle: { color: '#F59E0B' }
                  }
                ];
                
                // ECharts 配置
                const chartOption = {
                  grid: {
                    left: 40,
                    right: 10,
                    top: 30,
                    bottom: 45,
                  },
                  tooltip: {
                    trigger: 'axis',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderColor: '#e0e0e0',
                    borderWidth: 1,
                    textStyle: {
                      color: '#333',
                      fontSize: 12
                    },
                    formatter: (params: any) => {
                      const data = params[0];
                      const date = new Date(data.name);
                      const dateStr = `${date.getFullYear()}/${(date.getMonth() + 1)}/${date.getDate()}`;
                      return `<div style="padding: 4px 8px;">
                        <div style="font-weight: 600; margin-bottom: 4px;">${dateStr}</div>
                        <div>体重：<strong>${data.value}</strong> kg</div>
                      </div>`;
                    }
                  },
                  xAxis: {
                    type: 'category',
                    data: dates,
                    boundaryGap: false,
                    axisLine: {
                      lineStyle: { color: theme.border }
                    },
                    axisTick: { show: false },
                    axisLabel: {
                      interval: labelInterval,
                      rotate: 45,
                      fontSize: 10,
                      color: theme.textMuted,
                      formatter: (value: string) => formatDate(value)
                    }
                  },
                  yAxis: {
                    type: 'value',
                    min: minY,
                    max: maxY,
                    splitLine: {
                      lineStyle: {
                        color: theme.border,
                        type: 'dashed' as const
                      }
                    },
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: {
                      fontSize: 10,
                      color: theme.textMuted
                    }
                  },
                  series: [{
                    name: '体重',
                    type: 'line',
                    data: weights,
                    smooth: 0.3,
                    symbol: 'circle',
                    symbolSize: 4,
                    showSymbol: false,
                    lineStyle: {
                      width: 2,
                      color: theme.primary
                    },
                    areaStyle: {
                      color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                          { offset: 0, color: `${theme.primary}40` },
                          { offset: 1, color: `${theme.primary}05` }
                        ]
                      }
                    },
                    markPoint: {
                      data: markPointData,
                      symbol: 'circle',
                      symbolSize: 10,
                      label: {
                        show: true,
                        position: 'top',
                        fontSize: 9,
                        fontWeight: 'bold',
                        formatter: '{c}'
                      }
                    },
                    emphasis: {
                      focus: 'series',
                      itemStyle: {
                        borderWidth: 2,
                        borderColor: '#fff'
                      }
                    }
                  }],
                  dataZoom: [
                    {
                      type: 'inside',
                      start: 0,
                      end: 100
                    }
                  ]
                };
                
                return (
                  <View style={styles.echartsContainer}>
                    <ECharts 
                      option={chartOption} 
                      height={220} 
                      width={SCREEN_WIDTH - 48}
                    />
                  </View>
                );
              })()}
              
              {/* 关键数据点卡片 */}
              {(() => {
                const records = bodyHistory
                  .filter(r => r.weight)
                  .sort((a, b) => a.record_date.localeCompare(b.record_date));
                
                if (records.length === 0) return null;
                
                // 找出关键点
                let maxRecord = records[0];
                let minRecord = records[0];
                records.forEach(r => {
                  if (r.weight! > maxRecord.weight!) maxRecord = r;
                  if (r.weight! < minRecord.weight!) minRecord = r;
                });
                
                const firstRecord = records[0];
                const latestRecord = records[records.length - 1];
                const totalChange = latestRecord.weight! - firstRecord.weight!;
                
                // 格式化日期
                const formatDate = (dateStr: string) => {
                  const date = new Date(dateStr);
                  return `${date.getMonth() + 1}月${date.getDate()}日`;
                };
                
                return (
                  <View style={styles.weightKeyPoints}>
                    {/* 起始体重 */}
                    <View style={[styles.weightPointCard, { borderLeftColor: theme.primary }]}>
                      <View style={styles.weightPointHeader}>
                        <View style={[styles.weightPointDot, { backgroundColor: theme.primary }]} />
                        <ThemedText variant="caption" color={theme.textMuted}>起始体重</ThemedText>
                      </View>
                      <ThemedText variant="h2" color={theme.primary}>{firstRecord.weight}</ThemedText>
                      <ThemedText variant="tiny" color={theme.textMuted}>{formatDate(firstRecord.record_date)}</ThemedText>
                    </View>
                    
                    {/* 最高体重 */}
                    <View style={[styles.weightPointCard, { borderLeftColor: '#EF4444' }]}>
                      <View style={styles.weightPointHeader}>
                        <View style={[styles.weightPointDot, { backgroundColor: '#EF4444' }]} />
                        <ThemedText variant="caption" color={theme.textMuted}>最高体重</ThemedText>
                      </View>
                      <ThemedText variant="h2" color="#EF4444">{maxRecord.weight}</ThemedText>
                      <ThemedText variant="tiny" color={theme.textMuted}>{formatDate(maxRecord.record_date)}</ThemedText>
                    </View>
                    
                    {/* 最低体重 */}
                    <View style={[styles.weightPointCard, { borderLeftColor: '#10B981' }]}>
                      <View style={styles.weightPointHeader}>
                        <View style={[styles.weightPointDot, { backgroundColor: '#10B981' }]} />
                        <ThemedText variant="caption" color={theme.textMuted}>最低体重</ThemedText>
                      </View>
                      <ThemedText variant="h2" color="#10B981">{minRecord.weight}</ThemedText>
                      <ThemedText variant="tiny" color={theme.textMuted}>{formatDate(minRecord.record_date)}</ThemedText>
                    </View>
                    
                    {/* 最新体重 */}
                    <View style={[styles.weightPointCard, { borderLeftColor: '#F59E0B' }]}>
                      <View style={styles.weightPointHeader}>
                        <View style={[styles.weightPointDot, { backgroundColor: '#F59E0B' }]} />
                        <ThemedText variant="caption" color={theme.textMuted}>最新体重</ThemedText>
                      </View>
                      <ThemedText variant="h2" color="#F59E0B">{latestRecord.weight}</ThemedText>
                      <ThemedText variant="tiny" color={theme.textMuted}>{formatDate(latestRecord.record_date)}</ThemedText>
                    </View>
                  </View>
                );
              })()}
              
              {/* 变化趋势 */}
              {(() => {
                const records = bodyHistory
                  .filter(r => r.weight)
                  .sort((a, b) => a.record_date.localeCompare(b.record_date));
                
                if (records.length < 2) return null;
                
                const firstRecord = records[0];
                const latestRecord = records[records.length - 1];
                const totalChange = latestRecord.weight! - firstRecord.weight!;
                const isDown = totalChange < 0;
                const changeColor = isDown ? '#10B981' : '#EF4444';
                
                return (
                  <View style={styles.weightTrendCard}>
                    <View style={styles.weightTrendLeft}>
                      <FontAwesome6 
                        name={isDown ? "arrow-trend-down" : "arrow-trend-up"} 
                        size={24} 
                        color={changeColor} 
                      />
                      <View style={styles.weightTrendInfo}>
                        <ThemedText variant="caption" color={theme.textMuted}>累计变化</ThemedText>
                        <ThemedText variant="h3" color={changeColor}>
                          {isDown ? '' : '+'}{totalChange.toFixed(1)} kg
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.weightTrendRight}>
                      <ThemedText variant="tiny" color={theme.textMuted}>
                        共{records.length}次记录
                      </ThemedText>
                    </View>
                  </View>
                );
              })()}
            </>
          ) : (
            <View style={styles.historyEmpty}>
              <FontAwesome6 name="chart-line" size={40} color={theme.textMuted} />
              <ThemedText variant="body" color={theme.textMuted} style={{ marginTop: 12 }}>
                暂无体重记录
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted} style={{ marginTop: 4 }}>
                在固定节点打卡记录体重效果更佳
              </ThemedText>
            </View>
          )}
        </ThemedView>

        {/* 运动统计 */}
        <ThemedView level="default" style={styles.statsCard}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.cardTitle}>
            运动统计
          </ThemedText>

          <View style={styles.statsGrid}>
            <View style={styles.statsItem}>
              <ThemedText variant="h2" color={theme.primary} style={styles.statsValue}>
                {workoutStats.totalRecords}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary}>
                总打卡次数
              </ThemedText>
            </View>
            <View style={styles.statsItem}>
              <ThemedText variant="h2" color={theme.primary} style={styles.statsValue}>
                {(workoutStats.totalDuration / 60).toFixed(2)}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary}>
                总运动时长(小时)
              </ThemedText>
            </View>
            <View style={styles.statsItem}>
              <ThemedText variant="h2" color={theme.primary} style={styles.statsValue}>
                {workoutStats.totalCalories}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary}>
                总消耗(千卡)
              </ThemedText>
            </View>
            <View style={styles.statsItem}>
              <ThemedText variant="h2" color={theme.primary} style={styles.statsValue}>
                {workoutStats.thisMonthRecords}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary}>
                本月打卡次数
              </ThemedText>
            </View>
          </View>

          {/* 激励话术 */}
          {motivationQuote && (
            <View style={styles.motivationCard}>
              <FontAwesome6 name="fire" size={18} color={theme.primary} style={styles.motivationIcon} />
              <ThemedText variant="body" color={theme.textPrimary} style={styles.motivationText}>
                {motivationQuote}
              </ThemedText>
            </View>
          )}
        </ThemedView>

        {/* 个人相册 */}
        <ThemedView level="default" style={styles.albumCard}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.cardTitle}>
            个人相册
          </ThemedText>
          <ThemedText variant="caption" color={theme.textMuted} style={{ marginBottom: Spacing.md }}>
            运动记录照片
          </ThemedText>

          {workoutRecords.filter(r => r.photo_urls && r.photo_urls.length > 0).length > 0 ? (
            <View style={styles.albumGrid}>
              {workoutRecords
                .filter(r => r.photo_urls && r.photo_urls.length > 0)
                .flatMap(r => (r.photo_urls || []).map((url, idx) => ({
                  url,
                  date: r.date,
                  type: r.type,
                  duration: r.duration,
                  photoIndex: idx + 1,
                  totalPhotos: (r.photo_urls || []).length,
                })))
                .slice(0, 12) // 最多显示12张
                .map((photo, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={styles.albumPhotoItem}
                    onPress={() => openImageViewer(photo.url)}
                    activeOpacity={0.9}
                  >
                    <Image source={{ uri: photo.url }} style={styles.albumPhoto} />
                    <View style={styles.albumPhotoOverlay}>
                      <ThemedText variant="tiny" color="#FFFFFF">
                        {photo.date}
                      </ThemedText>
                      <ThemedText variant="tiny" color="#FFFFFF" style={{ opacity: 0.8 }}>
                        {photo.type} · {photo.duration}分钟
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          ) : (
            <View style={styles.albumEmpty}>
              <FontAwesome6 name="images" size={40} color={theme.textMuted} />
              <ThemedText variant="body" color={theme.textMuted} style={{ marginTop: 12 }}>
                暂无运动照片
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted} style={{ marginTop: 4 }}>
                打卡时上传照片会自动保存到这里
              </ThemedText>
            </View>
          )}
        </ThemedView>

        {/* 检查更新按钮 */}
        <TouchableOpacity 
          style={styles.checkUpdateButton}
          onPress={checkForUpdate}
          disabled={updateState.status === 'checking'}
        >
          {updateState.status === 'checking' ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <FontAwesome6 
              name="cloud-arrow-down" 
              size={16} 
              color={updateState.status === 'latest' ? theme.success : theme.textMuted} 
            />
          )}
          <ThemedText variant="body" color={theme.textMuted} style={{ marginLeft: 8, flex: 1 }}>
            检查更新
          </ThemedText>
          {updateState.status === 'checking' ? (
            <ThemedText variant="caption" color={theme.primary}>
              检查中...
            </ThemedText>
          ) : updateState.status === 'latest' ? (
            <ThemedText variant="caption" color={theme.success}>
              已是最新 ✓
            </ThemedText>
          ) : (
            <ThemedText variant="caption" color={theme.textMuted}>
              v{currentAppVersion}
            </ThemedText>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* 应用更新弹窗 */}
      <AppUpdateModal
        visible={showUpdateModal}
        state={updateState}
        currentVersion={currentAppVersion}
        onDownload={handleDownloadUpdate}
        onClose={handleCloseUpdateModal}
      />

      {/* 编辑身体数据模态框 */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => Platform.OS !== 'web' && Keyboard.dismiss()}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalOverlay}>
              <ThemedView level="default" style={styles.modalContent}>
                <ThemedText variant="title" color={theme.textPrimary} style={styles.modalTitle}>
                  更新身体数据
                </ThemedText>

                <View style={{ gap: 16 }}>
                  <View>
                    <ThemedText variant="small" color={theme.textMuted} style={{ marginBottom: 8 }}>
                      身高 (cm)
                    </ThemedText>
                    <TextInput
                      style={{
                        backgroundColor: theme.backgroundTertiary,
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        fontSize: 16,
                        color: theme.textPrimary,
                      }}
                      value={editHeight}
                      onChangeText={setEditHeight}
                      placeholder="请输入身高"
                      placeholderTextColor={theme.textMuted}
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                  </View>

                  <View>
                    <ThemedText variant="small" color={theme.textMuted} style={{ marginBottom: 8 }}>
                      体重 (kg)
                    </ThemedText>
                    <TextInput
                      style={{
                        backgroundColor: theme.backgroundTertiary,
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        fontSize: 16,
                        color: theme.textPrimary,
                      }}
                      value={editWeight}
                      onChangeText={setEditWeight}
                      placeholder="请输入体重"
                      placeholderTextColor={theme.textMuted}
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalCancelButton]}
                    onPress={() => setShowEditModal(false)}
                  >
                    <ThemedText variant="bodyMedium" color={theme.textPrimary}>取消</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalConfirmButton]}
                    onPress={handleSaveBodyData}
                  >
                    <ThemedText variant="bodyMedium" color={theme.buttonPrimaryText}>保存</ThemedText>
                  </TouchableOpacity>
                </View>
              </ThemedView>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
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
          
          {/* 图片信息：时间和运动类型 */}
          {viewerImages.length > 0 && (
            <View style={styles.imageViewerInfo}>
              <ThemedText variant="small" color="#fff">
                {formatDateTime(viewerImages[viewerCurrentIndex]?.date)}
              </ThemedText>
              <ThemedText variant="small" color="rgba(255,255,255,0.8)">
                {viewerImages[viewerCurrentIndex]?.type} · {viewerImages[viewerCurrentIndex]?.duration}分钟
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
              {viewerCurrentIndex + 1} / {viewerImages.length}
            </ThemedText>
          </View>
        </View>
      </Modal>

      {/* 修改密码Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => Platform.OS !== 'web' && Keyboard.dismiss()}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalOverlay}>
              <ThemedView level="default" style={styles.passwordModalContent}>
                <View style={styles.modalHeader}>
                  <ThemedText variant="title" color={theme.textPrimary}>修改密码</ThemedText>
                  <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                    <FontAwesome6 name="xmark" size={20} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.passwordModalBody}>
                  <View style={styles.inputWrapper}>
                    <FontAwesome6 name="lock" size={16} color={theme.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      value={oldPassword}
                      onChangeText={setOldPassword}
                      placeholder="旧密码"
                      placeholderTextColor={theme.textMuted}
                      secureTextEntry
                      maxLength={20}
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <FontAwesome6 name="key" size={16} color={theme.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="新密码（6-20位）"
                      placeholderTextColor={theme.textMuted}
                      secureTextEntry
                      maxLength={20}
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <FontAwesome6 name="check-double" size={16} color={theme.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      value={confirmNewPassword}
                      onChangeText={setConfirmNewPassword}
                      placeholder="确认新密码"
                      placeholderTextColor={theme.textMuted}
                      secureTextEntry
                      maxLength={20}
                    />
                  </View>

                  <ThemedText variant="caption" color={theme.textMuted} style={styles.passwordHint}>
                    密码长度6-20个字符，修改后请使用新密码登录
                  </ThemedText>
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]} 
                    onPress={() => setShowPasswordModal(false)}
                  >
                    <ThemedText variant="bodyMedium" color={theme.textSecondary}>取消</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.confirmButton, changingPassword && styles.buttonDisabled]} 
                    onPress={handleChangePassword}
                    disabled={changingPassword}
                  >
                    <ThemedText variant="bodyMedium" color={theme.buttonPrimaryText}>
                      {changingPassword ? '修改中...' : '确认修改'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </ThemedView>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </Screen>
  );
}
