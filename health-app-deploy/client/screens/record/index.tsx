import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { createStyles } from './styles';
import { FontAwesome6 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { createFormDataFile } from '@/utils';
import { getAuthHeaders } from '@/utils/auth';
import { MOTIVATION_QUOTES, getRandomQuote } from '@/constants/motivationQuotes';
import { useFocusEffect } from 'expo-router';
import { getApiUrl } from '@/config/api';
import { fetchWithRetry } from '@/utils/fetchWithRetry';

const MAX_PHOTOS = 5;

// 运动类型列表（前9个，按3x3网格排列）
const WORKOUT_TYPES_GRID = [
  { id: '跑步', icon: 'person-running', label: '跑步' },
  { id: '健身', icon: 'dumbbell', label: '健身' },
  { id: '骑行', icon: 'bicycle', label: '骑行' },
  { id: '瑜伽', icon: 'person-praying', label: '瑜伽' },
  { id: '舞蹈', icon: 'person', label: '舞蹈' },
  { id: '健身操', icon: 'heart-pulse', label: '健身操' },
  { id: '游泳', icon: 'person-swimming', label: '游泳' },
  { id: '羽毛球', icon: 'shuffle', label: '羽毛球' },
  { id: '登山', icon: 'mountain', label: '登山' },
];

// 其他类型（单独一行）
const WORKOUT_TYPE_OTHER = { id: '其他', icon: 'plus', label: '其他' };

const DURATION_OPTIONS = [20, 30, 45, 60, 90, 120];

export default function RecordScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [customType, setCustomType] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [customDuration, setCustomDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [todayRecord, setTodayRecord] = useState<{ type: string; duration: number } | null>(null);
  const [checkingToday, setCheckingToday] = useState(true);

  // 检查今日是否已打卡
  const checkTodayRecord = async () => {
    try {
      setCheckingToday(true);
      const headers = await getAuthHeaders();
      const today = new Date().toISOString().split('T')[0];
      
      /**
       * 服务端文件：server/src/routes/workouts.ts
       * 接口：GET /api/v1/workouts/date/:date
       */
      const response = await fetchWithRetry(
        getApiUrl(`/api/v1/workouts/date/${today}`),
        { 
          headers,
          timeout: 8000,
          retries: 2,
        }
      );
      
      const result = await response.json();
      if (result.success && result.data && result.data.length > 0) {
        // 今日已有打卡记录
        const record = result.data[0];
        setTodayRecord({ type: record.type, duration: record.duration });
      } else {
        setTodayRecord(null);
      }
    } catch (error) {
      console.error('检查今日打卡记录失败:', error);
    } finally {
      setCheckingToday(false);
    }
  };

  // 页面聚焦时检查今日打卡状态
  useFocusEffect(
    React.useCallback(() => {
      checkTodayRecord();
    }, [])
  );

  // Web 端文件输入 ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Web 端处理文件选择
  const handleWebFileSelect = useCallback((event: Event) => {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      const filesToProcess = Array.from(files).slice(0, MAX_PHOTOS);
      const localUris = filesToProcess.map(file => URL.createObjectURL(file));
      setPhotoUris(prev => [...prev, ...localUris].slice(0, MAX_PHOTOS));
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
      input.multiple = true;
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

  const pickImages = async () => {
    // Web 端：使用隐藏的 file input
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
      return;
    }

    const remainingSlots = MAX_PHOTOS - photoUris.length;
    if (remainingSlots <= 0) {
      Alert.alert('提示', `最多只能上传${MAX_PHOTOS}张照片`);
      return;
    }

    // 移动端：请求相册权限
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('权限不足', '需要相册访问权限才能选择照片');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map(asset => asset.uri);
      setPhotoUris(prev => [...prev, ...newUris].slice(0, MAX_PHOTOS));
    }
  };

  const takePhoto = async () => {
    // Web 端不支持拍照，提示用户
    if (Platform.OS === 'web') {
      window.alert('Web端暂不支持拍照，请使用"从相册选择"功能');
      return;
    }
    
    // 请求相机权限
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('权限不足', '需要相机访问权限才能拍照');
      return;
    }

    if (photoUris.length >= MAX_PHOTOS) {
      Alert.alert('提示', `最多只能上传${MAX_PHOTOS}张照片`);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUris(prev => [...prev, result.assets[0].uri].slice(0, MAX_PHOTOS));
    }
  };

  const showImagePicker = () => {
    // Web 端直接打开文件选择器
    if (Platform.OS === 'web') {
      pickImages();
      return;
    }
    
    // 移动端显示水印提醒弹窗
    Alert.alert(
      '照片要求提醒',
      '请确保照片上含有【时间水印】！\n\n建议使用带时间水印的相机APP拍摄，或在拍照时确保照片中显示当前日期时间。\n\n照片将用于运动打卡凭证，请务必遵守。',
      [
        { 
          text: '知道了，继续选择', 
          onPress: () => {
            Alert.alert(
              '添加照片',
              `当前已选择 ${photoUris.length}/${MAX_PHOTOS} 张`,
              [
                { text: '从相册选择', onPress: pickImages },
                { text: '拍照', onPress: takePhoto },
                { text: '取消', style: 'cancel' },
              ]
            );
          }
        },
        { text: '取消', style: 'cancel' },
      ]
    );
  };

  const removePhoto = (index: number) => {
    setPhotoUris(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (uris: string[]): Promise<{ urls: string[]; failed: number }> => {
    const uploadedUrls: string[] = [];
    let failedCount = 0;
    
    try {
      setUploadingPhoto(true);
      
      for (const uri of uris) {
        try {
          // 使用 createFormDataFile 创建跨平台兼容的文件对象
          const formData = new FormData();
          const file = await createFormDataFile(uri, `workout_${Date.now()}.jpg`, 'image/jpeg');
          formData.append('file', file as any);

          const headers = await getAuthHeaders();
          delete headers['Content-Type']; // FormData 需要删除 Content-Type

          /**
           * 服务端文件：server/src/routes/upload.ts
           * 接口：POST /api/v1/upload
           * Body 参数：file (FormData)
           */
          const response = await fetch(getApiUrl('/api/v1/upload'), {
            method: 'POST',
            headers,
            body: formData,
          });

          const result = await response.json();
          if (result.success && result.data?.url) {
            uploadedUrls.push(result.data.url);
          } else {
            console.error('上传图片失败:', result.error);
            failedCount++;
          }
        } catch (uploadError) {
          console.error('上传单张图片异常:', uploadError);
          failedCount++;
        }
      }

      return { urls: uploadedUrls, failed: failedCount };
    } catch (error) {
      console.error('上传图片失败:', error);
      return { urls: uploadedUrls, failed: failedCount };
    } finally {
      setUploadingPhoto(false);
    }
  };

  // 获取本周运动天数
  const getWeeklyWorkoutDays = async (): Promise<number> => {
    try {
      const headers = await getAuthHeaders();
      
      // 计算本周的起始和结束日期
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      
      const startDate = monday.toISOString().split('T')[0];
      const endDate = sunday.toISOString().split('T')[0];
      
      /**
       * 服务端文件：server/src/routes/workouts.ts
       * 接口：GET /api/v1/workouts
       * Query 参数：startDate?: string, endDate?: string
       */
      const response = await fetch(
        getApiUrl(`/api/v1/workouts?startDate=${startDate}&endDate=${endDate}`),
        { headers }
      );
      
      const result = await response.json();
      if (result.success && result.data) {
        // 统计有运动记录的不同日期数量
        const workoutDates = new Set(result.data.map((w: any) => w.date));
        return workoutDates.size;
      }
      return 0;
    } catch (error) {
      console.error('获取本周运动天数失败:', error);
      return 0;
    }
  };

  const handleSave = async () => {
    const duration = selectedDuration || parseInt(customDuration);
    
    // 处理运动类型
    let finalType = selectedType;
    if (selectedType === '其他') {
      if (!customType.trim()) {
        Alert.alert('提示', '请输入运动类型');
        return;
      }
      finalType = customType.trim();
    }
    
    if (!selectedType) {
      Alert.alert('提示', '请选择运动类型');
      return;
    }
    
    if (!duration || duration <= 0) {
      Alert.alert('提示', '请输入有效的运动时长');
      return;
    }

    // 强制要求上传照片
    if (photoUris.length === 0) {
      Alert.alert('提示', '请至少上传一张运动照片');
      return;
    }

    setLoading(true);
    try {
      // 上传照片（如果有）
      let photoUrls: string[] = [];
      if (photoUris.length > 0) {
        const uploadResult = await uploadImages(photoUris);
        photoUrls = uploadResult.urls;
        
        // 检查上传结果
        if (uploadResult.failed > 0) {
          Alert.alert(
            '上传警告', 
            `${uploadResult.failed}张照片上传失败，${photoUrls.length}张上传成功。\n\n是否继续提交？（建议重新选择照片）`,
            [
              { text: '取消', style: 'cancel', onPress: () => { setLoading(false); return; } },
              { text: '继续提交', onPress: () => submitWorkout(finalType!, duration, photoUrls) },
            ]
          );
          return;
        }
        
        // 如果全部失败
        if (photoUrls.length === 0) {
          Alert.alert('上传失败', '所有照片上传失败，请检查网络连接后重试');
          setLoading(false);
          return;
        }
      }

      await submitWorkout(finalType!, duration, photoUrls);
    } catch (error) {
      console.error('保存运动记录失败:', error);
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 提交运动记录
  const submitWorkout = async (type: string, duration: number, photoUrls: string[]) => {
    try {
      // 获取今天日期
      const today = new Date().toISOString().split('T')[0];

      const headers = await getAuthHeaders();

      /**
       * 服务端文件：server/src/routes/workouts.ts
       * 接口：POST /api/v1/workouts
       * Body 参数：date: string, duration: number, type: string, photoUrl?: string, photoUrls?: string[]
       */
      const response = await fetchWithRetry(getApiUrl('/api/v1/workouts'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          date: today,
          duration,
          type,
          photoUrl: photoUrls[0] || null,
          photoUrls,
        }),
        timeout: 15000,  // 打卡提交可能需要更长时间
        retries: 2,
      });

      const result = await response.json();

      if (result.success) {
        // 获取本周运动天数并显示激励话术
        try {
          const weekDays = await getWeeklyWorkoutDays();
          const quote = getRandomQuote(weekDays);
          
          const message = `运动记录已保存！\n\n${quote}`;
          
          // 清除表单数据
          setSelectedType(null);
          setCustomType('');
          setSelectedDuration(null);
          setCustomDuration('');
          setPhotoUris([]);
          
          if (Platform.OS === 'web') {
            window.alert(message.replace(/\n/g, '\n'));
          } else {
            Alert.alert('打卡成功', message, [
              {
                text: '太棒了！',
              },
            ]);
          }
        } catch (e) {
          // 如果获取话术失败，仍显示基本成功提示
          setSelectedType(null);
          setCustomType('');
          setSelectedDuration(null);
          setCustomDuration('');
          setPhotoUris([]);
          
          Alert.alert('成功', '运动记录已保存');
        }
      } else {
        Alert.alert('错误', result.error || '保存失败');
      }
    } catch (error) {
      console.error('保存运动记录失败:', error);
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ThemedView level="root" style={styles.header}>
          <ThemedText variant="h2" color={theme.textPrimary}>
            记录运动
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.subtitle}>
            记录今天的运动，养成健康习惯
          </ThemedText>
        </ThemedView>

        {/* 今日已打卡提示 */}
        {todayRecord && (
          <ThemedView level="default" style={styles.todayRecordCard}>
            <View style={styles.todayRecordHeader}>
              <FontAwesome6 name="circle-check" size={20} color={theme.success} />
              <ThemedText variant="title" color={theme.success} style={styles.todayRecordTitle}>
                今日已打卡
              </ThemedText>
            </View>
            <ThemedText variant="body" color={theme.textSecondary}>
              {todayRecord.type} · {todayRecord.duration}分钟
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted} style={styles.todayRecordTip}>
              每人每天只能打卡一次，明天继续加油！
            </ThemedText>
          </ThemedView>
        )}

        {/* 运动类型选择 */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            运动类型
          </ThemedText>
          <View style={styles.typeGrid}>
            {WORKOUT_TYPES_GRID.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  selectedType === type.id && styles.typeCardSelected,
                ]}
                onPress={() => setSelectedType(type.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.typeIconContainer,
                    selectedType === type.id && styles.typeIconContainerSelected,
                  ]}
                >
                  <FontAwesome6
                    name={type.icon}
                    size={24}
                    color={selectedType === type.id ? theme.buttonPrimaryText : theme.primary}
                  />
                </View>
                <ThemedText
                  variant="body"
                  color={selectedType === type.id ? theme.buttonPrimaryText : theme.textPrimary}
                  style={styles.typeLabel}
                >
                  {type.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* 其他类型（单独一行，横跨整行） */}
          <View style={styles.typeOtherRow}>
            <TouchableOpacity
              style={[
                styles.typeCardOther,
                selectedType === WORKOUT_TYPE_OTHER.id && styles.typeCardSelected,
              ]}
              onPress={() => setSelectedType(WORKOUT_TYPE_OTHER.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.typeOtherIconContainer,
                  selectedType === WORKOUT_TYPE_OTHER.id && styles.typeOtherIconContainerSelected,
                ]}
              >
                <FontAwesome6
                  name={WORKOUT_TYPE_OTHER.icon}
                  size={20}
                  color={selectedType === WORKOUT_TYPE_OTHER.id ? theme.buttonPrimaryText : theme.primary}
                />
              </View>
              <ThemedText
                variant="bodyMedium"
                color={selectedType === WORKOUT_TYPE_OTHER.id ? theme.buttonPrimaryText : theme.textPrimary}
              >
                {WORKOUT_TYPE_OTHER.label}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* 自定义运动类型输入 */}
          {selectedType === '其他' && (
            <View style={styles.customTypeContainer}>
              <ThemedText variant="body" color={theme.textSecondary}>
                请输入运动类型：
              </ThemedText>
              <TextInput
                style={styles.customTypeInput}
                value={customType}
                onChangeText={setCustomType}
                placeholder="例如：羽毛球、篮球、登山..."
                placeholderTextColor={theme.textMuted}
                maxLength={20}
              />
            </View>
          )}
        </ThemedView>

        {/* 记录照片 */}
        <ThemedView level="root" style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <ThemedText variant="title" color={theme.textPrimary}>
              记录照片
            </ThemedText>
            <ThemedText variant="caption" color={theme.error}>
              *必填
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>
              ({photoUris.length}/{MAX_PHOTOS})
            </ThemedText>
          </View>
          
          {/* 已选照片预览 */}
          {photoUris.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.photosScroll}
              contentContainerStyle={styles.photosScrollContent}
            >
              {photoUris.map((uri, index) => (
                <View key={index} style={styles.photoItem}>
                  <Image source={{ uri }} style={styles.photoThumbnail} />
                  <TouchableOpacity 
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                  >
                    <FontAwesome6 name="circle-xmark" size={20} color={theme.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
          
          {/* 添加照片按钮 */}
          <TouchableOpacity 
            style={styles.photoContainer}
            onPress={showImagePicker}
            activeOpacity={0.7}
          >
            <View style={styles.photoPlaceholder}>
              <FontAwesome6 name="camera" size={32} color={theme.textMuted} />
              <ThemedText variant="small" color={theme.textMuted} style={styles.photoPlaceholderText}>
                {photoUris.length >= MAX_PHOTOS ? '已达上限' : '点击添加运动照片（至少1张）'}
              </ThemedText>
            </View>
          </TouchableOpacity>
          
          {/* 照片要求说明 */}
          <View style={styles.photoRequirement}>
            <FontAwesome6 name="clock" size={12} color={theme.textMuted} />
            <ThemedText variant="tiny" color={theme.textMuted} style={styles.photoRequirementText}>
              照片必须含有时间水印，无水印照片将被视为无效
            </ThemedText>
          </View>
          
          {uploadingPhoto && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          )}
        </ThemedView>

        {/* 运动时长选择 */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            运动时长
          </ThemedText>
          <View style={styles.durationGrid}>
            {DURATION_OPTIONS.map((duration) => (
              <TouchableOpacity
                key={duration}
                style={[
                  styles.durationCard,
                  selectedDuration === duration && styles.durationCardSelected,
                ]}
                onPress={() => {
                  setSelectedDuration(duration);
                  setCustomDuration('');
                }}
                activeOpacity={0.7}
              >
                <ThemedText
                  variant="h3"
                  color={selectedDuration === duration ? theme.buttonPrimaryText : theme.textPrimary}
                >
                  {duration}
                </ThemedText>
                <ThemedText
                  variant="caption"
                  color={selectedDuration === duration ? theme.buttonPrimaryText : theme.textMuted}
                >
                  分钟
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* 自定义时长 */}
          <View style={styles.customDurationContainer}>
            <ThemedText variant="body" color={theme.textSecondary}>
              或自定义时长：
            </ThemedText>
            <TextInput
              style={styles.customDurationInput}
              value={customDuration}
              onChangeText={(text) => {
                setCustomDuration(text);
                setSelectedDuration(null);
              }}
              placeholder="输入分钟数"
              placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
            />
          </View>
        </ThemedView>

        {/* 保存按钮 */}
        <TouchableOpacity
          style={[
            styles.saveButton, 
            (loading || todayRecord) && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={loading || !!todayRecord}
          activeOpacity={0.8}
        >
          <ThemedText variant="bodyMedium" color={theme.buttonPrimaryText}>
            {loading ? '保存中...' : todayRecord ? '今日已打卡' : '保存记录'}
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}
