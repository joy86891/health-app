import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  FlatList,
  Image,
  Modal,
  Text,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { createStyles } from './styles';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { getApiUrl, API_BASE_URL } from '@/config/api';

// 获取APP版本信息
const APP_VERSION = Constants.expoConfig?.version || '未知版本';
const APP_PLATFORM = Platform.OS;

// 注意：管理员密码从数据库system_settings表获取，初始密码为88888888
// 登录时由用户输入，不再使用硬编码密钥

interface User {
  id: number;
  username: string;
  name: string;
  avatar_url?: string;
  height?: number;
  weight?: number;
  created_at: string;
}

interface Workout {
  id: number;
  user_id: number;
  date: string;
  type: string;
  duration: number;
  calories?: number;
  photo_urls?: string;
  users: {
    id: number;
    username: string;
    name: string;
  };
}

interface BodyRecord {
  id: number;
  user_id: number;
  record_date: string;
  height?: number;
  weight?: number;
  users: {
    id: number;
    username: string;
    name: string;
  };
}

interface Group {
  id: number;
  name: string;
  group_number: string;
  created_at: string;
  created_by: number;
  memberCount: number;
  creator?: {
    id: number;
    username: string;
    name: string;
  };
}

interface GroupMember {
  id: number;
  role: string;
  joined_at: string;
  users: {
    id: number;
    username: string;
    name: string;
    avatar_url?: string;
  };
}

interface BodySummary {
  userId: number;
  username: string;
  name: string;
  height?: number;
  firstWeight?: number;
  firstRecordDate?: string;
  latestWeight?: number;
  latestRecordDate?: string;
  weightChange?: number;
  firstBMI?: number;
  latestBMI?: number;
  bmiChange?: number;
  recordCount: number;
}

interface Stats {
  totalUsers: number;
  totalWorkouts: number;
  todayCheckIns: number;
  totalGroups: number;
}

type TabType = 'stats' | 'users' | 'workouts' | 'body-records' | 'groups' | 'settings';

// 统计卡片组件 - 独立定义，使用最简单的样式
function StatCard({ icon, value, label, color, bgColor }: { 
  icon: string; 
  value: number; 
  label: string; 
  color: string;
  bgColor: string;
}) {
  return (
    <View style={{
      width: '48%',
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      marginBottom: 16,
      marginHorizontal: '1%',
      borderWidth: 1,
      borderColor: '#E5E7EB',
    }}>
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: bgColor,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
      }}>
        <FontAwesome6 name={icon} size={24} color={color} />
      </View>
      <Text style={{ fontSize: 32, fontWeight: '700', color: '#1C1917' }}>{value}</Text>
      <Text style={{ fontSize: 14, color: '#78716c' }}>{label}</Text>
    </View>
  );
}

export default function AdminScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  // 数据状态
  const [users, setUsers] = useState<User[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [bodyRecords, setBodyRecords] = useState<BodyRecord[]>([]);
  const [bodySummary, setBodySummary] = useState<BodySummary[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalWorkouts: 0,
    todayCheckIns: 0,
    totalGroups: 0,
  });

  // API调试信息
  const [apiDebugInfo, setApiDebugInfo] = useState<string>('');
  const [rawApiData, setRawApiData] = useState<string>('');

  // 分页状态
  const [userPage, setUserPage] = useState(1);
  const [workoutPage, setWorkoutPage] = useState(1);
  const [bodyRecordPage, setBodyRecordPage] = useState(1);
  const [bodySummaryPage, setBodySummaryPage] = useState(1);
  const [groupPage, setGroupPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [totalBodyRecords, setTotalBodyRecords] = useState(0);
  const [totalBodySummary, setTotalBodySummary] = useState(0);
  const [totalGroups, setTotalGroups] = useState(0);


  // 当前标签
  const [activeTab, setActiveTab] = useState<TabType>('stats');

  // 筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');

  // 照片查看器
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // 重置密码弹窗
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // 删除用户确认弹窗
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleteConfirmCode, setDeleteConfirmCode] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 群组成员弹窗
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // 解散群组确认弹窗
  const [showDissolveConfirm, setShowDissolveConfirm] = useState(false);
  const [dissolveGroup, setDissolveGroup] = useState<Group | null>(null);
  const [dissolveConfirmCode, setDissolveConfirmCode] = useState('');
  const [dissolveLoading, setDissolveLoading] = useState(false);

  // 组件加载时调试
  useEffect(() => {
    console.log('[Admin] 组件加载, API_BASE_URL:', API_BASE_URL);
    console.log('[Admin] 初始 isAuthenticated:', isAuthenticated);
  }, []);

  // 登录后自动加载数据
  useEffect(() => {
    console.log('[Admin] isAuthenticated 变化:', isAuthenticated);
    if (isAuthenticated) {
      console.log('[Admin] 开始加载统计数据...');
      fetchStats();
      fetchUsers(1, '');
    }
  }, [isAuthenticated]);

  // 页面获得焦点时自动刷新数据（返回后台时）
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        console.log('[Admin] 页面获得焦点，刷新数据');
        fetchStats();
      }
    }, [isAuthenticated])
  );

  // 登录
  const handleLogin = async () => {
    if (!adminKey.trim()) {
      Alert.alert('提示', '请输入管理员密钥');
      return;
    }

    setLoading(true);
    try {
      console.log('[Admin] 登录请求, key:', adminKey.trim(), 'API_BASE_URL:', API_BASE_URL);
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: adminKey.trim() }),
      });

      const result = await response.json();
      console.log('[Admin] 登录结果:', result);
      if (result.success) {
        setIsAuthenticated(true);
        fetchStats();
        fetchUsers();
      } else {
        Alert.alert('错误', result.error || '登录失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      Alert.alert('错误', '登录失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取统计数据
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      // 使用用户登录时输入的密钥
      const key = adminKey.trim();
      const apiUrl = `${API_BASE_URL}/api/v1/admin/stats`;
      
      console.log('[Admin] API_BASE_URL:', API_BASE_URL);
      console.log('[Admin] 请求URL:', apiUrl);
      setApiDebugInfo(`请求: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        headers: { 'x-admin-key': key },
      });
      
      const result = await response.json();
      console.log('[Admin] 原始返回:', JSON.stringify(result));
      
      // 存储原始API数据用于调试
      setRawApiData(JSON.stringify(result, null, 2));
      
      if (result.success) {
        setStats(result.data);
        console.log('[Admin] 统计数据已设置:', result.data);
      } else {
        console.error('[Admin] 获取统计数据失败:', result.error);
        setApiDebugInfo(`错误: ${result.error}`);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
      setApiDebugInfo(`请求失败: ${error}`);
    } finally {
      setStatsLoading(false);
    }
  };

  // 获取用户列表
  const fetchUsers = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.append('search', search);

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/users?${params}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      });
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
        setTotalUsers(result.pagination.total);
        setUserPage(page);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取运动记录
  const fetchWorkouts = async (page = 1, userId = '', date = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (userId) params.append('userId', userId);
      if (date) params.append('date', date);

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/workouts?${params}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      });
      const result = await response.json();
      if (result.success) {
        setWorkouts(result.data);
        setTotalWorkouts(result.pagination.total);
        setWorkoutPage(page);
      }
    } catch (error) {
      console.error('获取运动记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取体重记录
  const fetchBodyRecords = async (page = 1, userId = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (userId) params.append('userId', userId);

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/body-records?${params}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      });
      const result = await response.json();
      if (result.success) {
        setBodyRecords(result.data);
        setTotalBodyRecords(result.pagination.total);
        setBodyRecordPage(page);
      }
    } catch (error) {
      console.error('获取体重记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取体重汇总
  const fetchBodySummary = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/body-summary?${params}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      });
      const result = await response.json();
      if (result.success) {
        setBodySummary(result.data);
        setTotalBodySummary(result.pagination.total);
        setBodySummaryPage(page);
      }
    } catch (error) {
      console.error('获取体重汇总失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取群组列表
  const fetchGroups = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.append('search', search);

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/groups?${params}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      });
      const result = await response.json();
      if (result.success) {
        setGroups(result.data);
        setTotalGroups(result.pagination.total);
        setGroupPage(page);
      }
    } catch (error) {
      console.error('获取群组列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取群组成员
  const fetchGroupMembers = async (groupId: number) => {
    setLoadingMembers(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/groups/${groupId}/members`, {
        headers: { 'x-admin-key': adminKey.trim() },
      });
      const result = await response.json();
      if (result.success) {
        setGroupMembers(result.data);
      }
    } catch (error) {
      console.error('获取群组成员失败:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  // 查看群组成员
  const handleViewGroupMembers = (group: Group) => {
    setSelectedGroup(group);
    setGroupMembers([]);
    setShowGroupMembers(true);
    fetchGroupMembers(group.id);
  };

  // 解散群组
  const handleDissolveGroup = async () => {
    if (!dissolveGroup) return;
    if (dissolveConfirmCode !== String(dissolveGroup.id)) {
      Alert.alert('错误', '确认码不匹配，请输入群组ID');
      return;
    }

    setDissolveLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/groups/${dissolveGroup.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey.trim(),
        },
        body: JSON.stringify({ confirmCode: dissolveConfirmCode }),
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert('成功', result.message);
        setShowDissolveConfirm(false);
        setDissolveGroup(null);
        setDissolveConfirmCode('');
        fetchGroups(groupPage, searchQuery);
        fetchStats();
      } else {
        Alert.alert('错误', result.error || '解散失败');
      }
    } catch (error) {
      console.error('解散群组失败:', error);
      Alert.alert('错误', '解散群组失败');
    } finally {
      setDissolveLoading(false);
    }
  };

  // 修改管理员密钥
  // 重置密码
  const handleResetPassword = async (user: User) => {
    setResetPasswordUser(user);
    setShowResetPassword(true);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey.trim(),
        },
      });

      const result = await response.json();
      if (result.success) {
        setNewPassword(result.data.newPassword);
      } else {
        Alert.alert('错误', result.error || '重置失败');
        setShowResetPassword(false);
      }
    } catch (error) {
      console.error('重置密码失败:', error);
      Alert.alert('错误', '重置密码失败');
      setShowResetPassword(false);
    } finally {
      setLoading(false);
    }
  };

  // 打开删除确认弹窗
  const openDeleteConfirm = (user: User) => {
    setDeleteUser(user);
    setDeleteConfirmCode('');
    setDeletePassword('');
    setShowDeleteConfirm(true);
  };

  // 确认删除用户
  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    
    console.log('[Admin] 开始删除用户验证:', {
      deleteConfirmCode,
      deleteConfirmCodeType: typeof deleteConfirmCode,
      deletePassword,
      deleteUser,
    });
    
    // 验证删除密码
    const trimmedPassword = deletePassword.trim();
    if (trimmedPassword !== 'QRSC') {
      console.log('[Admin] 删除密码错误:', { trimmedPassword, expected: 'QRSC' });
      Alert.alert('错误', '删除密码错误');
      return;
    }
    
    // 去除输入的空格，转换为字符串比较
    const inputCode = String(deleteConfirmCode).trim();
    const expectedCode = String(deleteUser.id);
    
    console.log('[Admin] 用户ID验证:', { 
      inputCode, 
      inputCodeType: typeof inputCode,
      expectedCode, 
      expectedCodeType: typeof expectedCode,
      match: inputCode === expectedCode 
    });
    
    if (inputCode !== expectedCode) {
      Alert.alert('错误', `确认码不匹配\n请输入用户ID: ${expectedCode}\n您输入的是: ${inputCode || '(空)'}`);
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/${deleteUser.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey.trim(),
        },
        body: JSON.stringify({ 
          confirmCode: String(deleteConfirmCode.trim()),
          deletePassword: String(deletePassword.trim()),
        }),
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert('成功', result.message);
        setShowDeleteConfirm(false);
        fetchUsers(userPage, searchQuery);
        fetchStats();
      } else {
        Alert.alert('错误', result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      Alert.alert('错误', '删除用户失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  // 导出Excel
  const handleExportExcel = () => {
    if (Platform.OS === 'web') {
      window.open(`${API_BASE_URL}/api/v1/admin/export-excel?key=${encodeURIComponent(adminKey.trim())}`, '_blank');
    } else {
      Alert.alert('提示', '导出功能仅支持Web端');
    }
  };

  // 导出照片
  const handleExportPhotos = () => {
    if (Platform.OS === 'web') {
      window.open(`${API_BASE_URL}/api/v1/admin/export-photos?key=${encodeURIComponent(adminKey.trim())}`, '_blank');
    } else {
      Alert.alert('提示', '导出功能仅支持Web端');
    }
  };

  // 查看照片
  const handleViewPhotos = (photoUrls: string | string[]) => {
    try {
      const urls = Array.isArray(photoUrls) ? photoUrls : JSON.parse(photoUrls);
      if (urls && urls.length > 0) {
        setViewerPhotos(urls);
        setViewerIndex(0);
        setShowPhotoViewer(true);
      }
    } catch (e) {
      console.error('解析照片URL失败:', e);
    }
  };

  // 强制刷新所有数据（清除状态后重新加载）
  const forceRefreshAll = async () => {
    console.log('[Admin] 强制刷新所有数据...');
    // 清除所有数据状态
    setStats({ totalUsers: 0, totalWorkouts: 0, todayCheckIns: 0, totalGroups: 0 });
    setUsers([]);
    setWorkouts([]);
    setBodyRecords([]);
    setBodySummary([]);
    setGroups([]);
    
    // 重新加载当前标签的数据
    fetchStats();
    if (activeTab === 'users') fetchUsers(1, searchQuery);
    else if (activeTab === 'workouts') fetchWorkouts(1, userFilter, dateFilter);
    else if (activeTab === 'body-records') fetchBodySummary(1);
    else if (activeTab === 'groups') fetchGroups(1, searchQuery);
    
    Alert.alert('刷新完成', '已从服务器重新获取最新数据');
  };

  // 切换标签
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'stats') fetchStats();
    else if (tab === 'users') fetchUsers(1, searchQuery);
    else if (tab === 'workouts') fetchWorkouts(1, userFilter, dateFilter);
    else if (tab === 'body-records') fetchBodySummary(1);
    else if (tab === 'groups') fetchGroups(1, searchQuery);
  };

  // 搜索用户
  const handleSearchUsers = () => {
    fetchUsers(1, searchQuery);
  };

  // 未登录界面
  if (!isAuthenticated) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.loginContainer}>
          <View style={styles.loginCard}>
            <View style={styles.loginHeader}>
              <FontAwesome6 name="shield-halved" size={48} color={theme.primary} />
              <ThemedText variant="h2" color={theme.textPrimary} style={styles.loginTitle}>
                管理后台
              </ThemedText>
              <ThemedText variant="body" color={theme.textSecondary}>
                请输入管理员密钥登录
              </ThemedText>
            </View>

            <TextInput
              style={styles.loginInput}
              value={adminKey}
              onChangeText={setAdminKey}
              placeholder="管理员密钥"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <ThemedText variant="bodyMedium" color={theme.buttonPrimaryText}>
                {loading ? '登录中...' : '登录'}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <FontAwesome6 name="arrow-left" size={14} color={theme.textMuted} />
              <ThemedText variant="small" color={theme.textMuted}>返回用户登录</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Screen>
    );
  }

  // 主界面
  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      {/* 头部 */}
      <ThemedView level="default" style={styles.header}>
        <ThemedText variant="h2" color={theme.textPrimary}>管理后台</ThemedText>
        <TouchableOpacity onPress={() => setIsAuthenticated(false)} style={styles.logoutButton}>
          <FontAwesome6 name="right-from-bracket" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </ThemedView>

      {/* 标签栏 */}
      <ThemedView level="default" style={styles.tabBar}>
        {[
          { key: 'stats' as TabType, label: '统计', icon: 'chart-pie' },
          { key: 'users' as TabType, label: '用户', icon: 'users' },
          { key: 'workouts' as TabType, label: '运动', icon: 'dumbbell' },
          { key: 'body-records' as TabType, label: '体重', icon: 'weight-scale' },
          { key: 'groups' as TabType, label: '群组', icon: 'people-group' },
          { key: 'settings' as TabType, label: '设置', icon: 'gear' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
            onPress={() => handleTabChange(tab.key)}
          >
            <FontAwesome6
              name={tab.icon}
              size={18}
              color={activeTab === tab.key ? theme.primary : theme.textMuted}
            />
            <ThemedText
              variant="small"
              color={activeTab === tab.key ? theme.primary : theme.textMuted}
            >
              {tab.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ThemedView>

      {/* 内容区域 */}
      <View style={styles.content}>
        {/* 统计面板 */}
        {activeTab === 'stats' && (
          <ScrollView contentContainerStyle={styles.statsContainer}>
            {/* 刷新按钮 */}
            <TouchableOpacity 
              style={[styles.refreshButton, statsLoading && styles.refreshButtonLoading]} 
              onPress={forceRefreshAll}
              disabled={statsLoading}
            >
              <FontAwesome6 
                name={statsLoading ? "spinner" : "rotate"} 
                size={16} 
                color={theme.primary} 
              />
              <ThemedText variant="bodyMedium" color={theme.primary}>
                {statsLoading ? '刷新中...' : '强制刷新所有数据'}
              </ThemedText>
            </TouchableOpacity>
            
            {/* 后端地址和API调试信息 */}
            <ThemedView level="tertiary" style={styles.serverInfoCard}>
              <View style={styles.serverInfoRow}>
                <FontAwesome6 name="mobile-screen" size={14} color={theme.primary} />
                <ThemedText variant="caption" color={theme.textPrimary} style={{ fontWeight: '600' }}>
                  APP版本: {APP_VERSION} | 平台: {APP_PLATFORM}
                </ThemedText>
              </View>
              <View style={[styles.serverInfoRow, { marginTop: 8 }]}>
                <FontAwesome6 name="server" size={14} color={theme.primary} />
                <ThemedText variant="caption" color={theme.textPrimary} style={{ fontWeight: '600' }}>
                  后端地址: {API_BASE_URL}
                </ThemedText>
              </View>
            </ThemedView>

            {/* 统计卡片 */}
            <View style={styles.statsGrid}>
              <StatCard 
                icon="users" 
                value={stats.totalUsers} 
                label="总用户数" 
                color="#059669"
                bgColor="rgba(5, 150, 105, 0.1)"
              />
              <StatCard 
                icon="dumbbell" 
                value={stats.totalWorkouts} 
                label="总运动记录" 
                color="#10B981"
                bgColor="rgba(16, 185, 129, 0.1)"
              />
              <StatCard 
                icon="calendar-check" 
                value={stats.todayCheckIns} 
                label="今日打卡" 
                color="#10B981"
                bgColor="rgba(16, 185, 129, 0.1)"
              />
              <StatCard 
                icon="people-group" 
                value={stats.totalGroups} 
                label="群组数" 
                color="#FFB800"
                bgColor="rgba(255, 184, 0, 0.1)"
              />
            </View>

            <View style={styles.exportSection}>
              <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
                数据导出
              </ThemedText>
              <View style={styles.exportButtons}>
                <TouchableOpacity style={styles.exportButton} onPress={handleExportExcel}>
                  <FontAwesome6 name="file-excel" size={20} color={theme.buttonPrimaryText} />
                  <ThemedText variant="bodyMedium" color={theme.buttonPrimaryText}>导出Excel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.exportButton, styles.exportButtonSecondary]} onPress={handleExportPhotos}>
                  <FontAwesome6 name="file-zipper" size={20} color={theme.primary} />
                  <ThemedText variant="bodyMedium" color={theme.primary}>打包照片</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}

        {/* 用户列表 */}
        {activeTab === 'users' && (
          <View style={styles.listContainer}>
            <View style={styles.searchBar}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="搜索用户名或姓名..."
                placeholderTextColor={theme.textMuted}
                onSubmitEditing={handleSearchUsers}
              />
              <TouchableOpacity style={styles.searchButton} onPress={handleSearchUsers}>
                <FontAwesome6 name="magnifying-glass" size={18} color={theme.buttonPrimaryText} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={users}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <ThemedView level="default" style={styles.userCard}>
                  <View style={styles.userInfo}>
                    <View style={styles.userAvatar}>
                      {item.avatar_url ? (
                        <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
                      ) : (
                        <FontAwesome6 name="user" size={24} color={theme.textMuted} />
                      )}
                    </View>
                    <View style={styles.userDetails}>
                      <ThemedText variant="bodyMedium" color={theme.textPrimary}>
                        {item.name || item.username}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textMuted}>
                        @{item.username}
                      </ThemedText>
                      <ThemedText variant="tiny" color={theme.textMuted}>
                        ID: {item.id} · {item.created_at?.split('T')[0]}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.userActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleResetPassword(item)}
                    >
                      <FontAwesome6 name="key" size={14} color={theme.buttonPrimaryText} />
                      <ThemedText variant="small" color={theme.buttonPrimaryText}>重置密码</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => openDeleteConfirm(item)}
                    >
                      <FontAwesome6 name="trash" size={14} color={theme.error} />
                      <ThemedText variant="small" color={theme.error}>删除</ThemedText>
                    </TouchableOpacity>
                  </View>
                </ThemedView>
              )}
              ListFooterComponent={
                <View style={styles.pagination}>
                  <TouchableOpacity
                    style={[styles.pageButton, userPage === 1 && styles.pageButtonDisabled]}
                    disabled={userPage === 1}
                    onPress={() => fetchUsers(userPage - 1, searchQuery)}
                  >
                    <FontAwesome6 name="chevron-left" size={16} color={userPage === 1 ? theme.textMuted : theme.textPrimary} />
                  </TouchableOpacity>
                  <ThemedText variant="body" color={theme.textSecondary}>
                    {userPage} / {Math.ceil(totalUsers / 20) || 1}
                  </ThemedText>
                  <TouchableOpacity
                    style={[styles.pageButton, userPage * 20 >= totalUsers && styles.pageButtonDisabled]}
                    disabled={userPage * 20 >= totalUsers}
                    onPress={() => fetchUsers(userPage + 1, searchQuery)}
                  >
                    <FontAwesome6 name="chevron-right" size={16} color={userPage * 20 >= totalUsers ? theme.textMuted : theme.textPrimary} />
                  </TouchableOpacity>
                </View>
              }
            />
          </View>
        )}

        {/* 运动记录列表 */}
        {activeTab === 'workouts' && (
          <View style={styles.listContainer}>
            <View style={styles.filterBar}>
              <TextInput
                style={styles.filterInput}
                value={dateFilter}
                onChangeText={setDateFilter}
                placeholder="日期筛选 (YYYY-MM-DD)"
                placeholderTextColor={theme.textMuted}
              />
              <TouchableOpacity style={styles.filterButton} onPress={() => fetchWorkouts(1, userFilter, dateFilter)}>
                <FontAwesome6 name="filter" size={16} color={theme.buttonPrimaryText} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={workouts}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <ThemedView level="default" style={styles.workoutCard}>
                  <View style={styles.workoutHeader}>
                    <ThemedText variant="bodyMedium" color={theme.textPrimary}>
                      {item.users?.name || item.users?.username}
                    </ThemedText>
                    <ThemedText variant="caption" color={theme.textMuted}>
                      {item.date}
                    </ThemedText>
                  </View>
                  <View style={styles.workoutDetails}>
                    <View style={styles.workoutType}>
                      <FontAwesome6 name="dumbbell" size={14} color={theme.primary} />
                      <ThemedText variant="body" color={theme.textPrimary}>{item.type}</ThemedText>
                    </View>
                    <ThemedText variant="body" color={theme.textSecondary}>
                      {item.duration}分钟
                    </ThemedText>
                    {item.calories && (
                      <ThemedText variant="body" color={theme.accent}>
                        {item.calories}千卡
                      </ThemedText>
                    )}
                  </View>
                  {item.photo_urls && (
                    <TouchableOpacity
                      style={styles.photoButton}
                      onPress={() => handleViewPhotos(item.photo_urls!)}
                    >
                      <FontAwesome6 name="images" size={14} color={theme.primary} />
                      <ThemedText variant="small" color={theme.primary}>查看照片</ThemedText>
                    </TouchableOpacity>
                  )}
                </ThemedView>
              )}
              ListFooterComponent={
                <View style={styles.pagination}>
                  <TouchableOpacity
                    style={[styles.pageButton, workoutPage === 1 && styles.pageButtonDisabled]}
                    disabled={workoutPage === 1}
                    onPress={() => fetchWorkouts(workoutPage - 1, userFilter, dateFilter)}
                  >
                    <FontAwesome6 name="chevron-left" size={16} color={workoutPage === 1 ? theme.textMuted : theme.textPrimary} />
                  </TouchableOpacity>
                  <ThemedText variant="body" color={theme.textSecondary}>
                    {workoutPage} / {Math.ceil(totalWorkouts / 20) || 1}
                  </ThemedText>
                  <TouchableOpacity
                    style={[styles.pageButton, workoutPage * 20 >= totalWorkouts && styles.pageButtonDisabled]}
                    disabled={workoutPage * 20 >= totalWorkouts}
                    onPress={() => fetchWorkouts(workoutPage + 1, userFilter, dateFilter)}
                  >
                    <FontAwesome6 name="chevron-right" size={16} color={workoutPage * 20 >= totalWorkouts ? theme.textMuted : theme.textPrimary} />
                  </TouchableOpacity>
                </View>
              }
            />
          </View>
        )}

        {/* 体重汇总 */}
        {activeTab === 'body-records' && (
          <View style={styles.listContainer}>
            <ScrollView contentContainerStyle={styles.list}>
              {bodySummary.length === 0 ? (
                <ThemedView level="default" style={styles.emptyCard}>
                  <FontAwesome6 name="weight-scale" size={48} color={theme.textMuted} />
                  <ThemedText variant="body" color={theme.textMuted} style={{ marginTop: 16 }}>
                    暂无体重记录
                  </ThemedText>
                </ThemedView>
              ) : (
                bodySummary.map((item) => (
                  <ThemedView key={item.userId} level="default" style={styles.bodySummaryCard}>
                    <View style={styles.bodySummaryHeader}>
                      <View style={styles.bodySummaryUser}>
                        <FontAwesome6 name="user" size={20} color={theme.primary} />
                        <ThemedText variant="bodyMedium" color={theme.textPrimary} style={{ marginLeft: 8 }}>
                          {item.name || item.username}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.bodySummaryContent}>
                      <View style={styles.bodySummaryItem}>
                        <ThemedText variant="caption" color={theme.textMuted}>首次体重</ThemedText>
                        <ThemedText variant="h3" color={theme.textPrimary}>
                          {item.firstWeight ? item.firstWeight.toFixed(1) : '--'}
                        </ThemedText>
                        <ThemedText variant="caption" color={theme.textMuted}>kg</ThemedText>
                      </View>
                      <View style={styles.bodySummaryDivider} />
                      <View style={styles.bodySummaryItem}>
                        <ThemedText variant="caption" color={theme.textMuted}>最新体重</ThemedText>
                        <ThemedText variant="h3" color={theme.textPrimary}>
                          {item.latestWeight ? item.latestWeight.toFixed(1) : '--'}
                        </ThemedText>
                        <ThemedText variant="caption" color={theme.textMuted}>kg</ThemedText>
                      </View>
                      <View style={styles.bodySummaryDivider} />
                      <View style={styles.bodySummaryItem}>
                        <ThemedText variant="caption" color={theme.textMuted}>BMI变化</ThemedText>
                        <ThemedText 
                          variant="h3" 
                          color={
                            item.bmiChange !== undefined && item.bmiChange !== null 
                              ? (item.bmiChange > 0 ? theme.error : item.bmiChange < 0 ? theme.success : theme.textPrimary)
                              : theme.textPrimary
                          }
                        >
                          {item.bmiChange !== undefined && item.bmiChange !== null ? `${item.bmiChange > 0 ? '+' : ''}${item.bmiChange.toFixed(2)}` : '--'}
                        </ThemedText>
                        <ThemedText variant="caption" color={theme.textMuted}>BMI差值</ThemedText>
                      </View>
                    </View>
                  </ThemedView>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {/* 群组管理 */}
        {activeTab === 'groups' && (
          <View style={styles.listContainer}>
            {/* 刷新按钮 */}
            <View style={styles.searchBar}>
              <TouchableOpacity 
                style={[styles.refreshButton, { marginBottom: 0, flex: 1 }]} 
                onPress={() => fetchGroups(1, searchQuery)}
              >
                <FontAwesome6 name="rotate" size={16} color={theme.primary} />
                <ThemedText variant="bodyMedium" color={theme.primary}>刷新群组数据</ThemedText>
              </TouchableOpacity>
            </View>
            <FlatList
              data={groups}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <ThemedView level="default" style={styles.groupCard}>
                  <View style={styles.groupHeader}>
                    <View style={styles.groupInfo}>
                      <FontAwesome6 name="people-group" size={24} color={theme.primary} />
                      <View style={styles.groupText}>
                        <ThemedText variant="bodyMedium" color={theme.textPrimary}>
                          {item.name || '未命名群组'}
                        </ThemedText>
                        <ThemedText variant="caption" color={theme.textMuted}>
                          群号: {item.group_number} · {item.memberCount}人
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.groupActions}>
                      <TouchableOpacity
                        style={styles.groupActionButton}
                        onPress={() => handleViewGroupMembers(item)}
                      >
                        <FontAwesome6 name="users" size={16} color={theme.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.groupActionButton, styles.groupActionButtonDanger]}
                        onPress={() => {
                          setDissolveGroup(item);
                          setDissolveConfirmCode('');
                          setShowDissolveConfirm(true);
                        }}
                      >
                        <FontAwesome6 name="trash" size={16} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.groupFooter}>
                    <ThemedText variant="tiny" color={theme.textMuted}>
                      创建人: {item.creator?.name || '未知'} · ID: {item.id}
                    </ThemedText>
                    <ThemedText variant="tiny" color={theme.textMuted}>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                    </ThemedText>
                  </View>
                </ThemedView>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <FontAwesome6 name="people-group" size={48} color={theme.textMuted} />
                  <ThemedText variant="body" color={theme.textMuted} style={{ marginTop: 12 }}>
                    暂无群组
                  </ThemedText>
                </View>
              }
            />
          </View>
        )}

        {/* 系统设置 */}
        {activeTab === 'settings' && (
          <ScrollView contentContainerStyle={styles.settingsContainer}>
            <ThemedView level="default" style={styles.settingsSection}>
              <ThemedText variant="title" color={theme.textPrimary} style={styles.settingsTitle}>
                数据维护
              </ThemedText>
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={() => {
                  Alert.alert(
                    '清理孤立消息',
                    '将删除群组已不存在的消息记录，此操作不可恢复。是否继续？',
                    [
                      { text: '取消', style: 'cancel' },
                      {
                        text: '确认清理',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            const response = await fetch(`${API_BASE_URL}/api/v1/admin/cleanup`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'x-admin-key': adminKey.trim(),
                              },
                              body: JSON.stringify({ type: 'orphaned_messages' }),
                            });
                            const result = await response.json();
                            if (result.success) {
                              Alert.alert('成功', result.message);
                            } else {
                              Alert.alert('错误', result.error);
                            }
                          } catch (error) {
                            Alert.alert('错误', '清理失败');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <View style={styles.settingsItemLeft}>
                  <FontAwesome6 name="broom" size={20} color={theme.accent} />
                  <ThemedText variant="body" color={theme.textPrimary}>清理孤立消息</ThemedText>
                </View>
                <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={() => {
                  Alert.alert(
                    '清理旧消息',
                    '将删除90天前的普通聊天消息（保留运动打卡和每日总结），此操作不可恢复。是否继续？',
                    [
                      { text: '取消', style: 'cancel' },
                      {
                        text: '确认清理',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            const response = await fetch(`${API_BASE_URL}/api/v1/admin/cleanup`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'x-admin-key': adminKey.trim(),
                              },
                              body: JSON.stringify({ type: 'old_messages' }),
                            });
                            const result = await response.json();
                            if (result.success) {
                              Alert.alert('成功', result.message);
                            } else {
                              Alert.alert('错误', result.error);
                            }
                          } catch (error) {
                            Alert.alert('错误', '清理失败');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <View style={styles.settingsItemLeft}>
                  <FontAwesome6 name="clock-rotate-left" size={20} color={theme.accent} />
                  <ThemedText variant="body" color={theme.textPrimary}>清理90天前消息</ThemedText>
                </View>
                <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            </ThemedView>
          </ScrollView>
        )}
      </View>

      {/* 群组成员弹窗 */}
      <Modal visible={showGroupMembers} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ThemedView level="default" style={styles.modalContentLarge}>
            <View style={styles.modalHeader}>
              <ThemedText variant="title" color={theme.textPrimary}>
                {selectedGroup?.name || '群组成员'}
              </ThemedText>
              <TouchableOpacity onPress={() => setShowGroupMembers(false)}>
                <FontAwesome6 name="xmark" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            <ThemedText variant="caption" color={theme.textMuted}>
              群号: {selectedGroup?.group_number} · {groupMembers.length}人
            </ThemedText>
            
            {loadingMembers ? (
              <View style={styles.loadingContainer}>
                <ThemedText variant="body" color={theme.textMuted}>加载中...</ThemedText>
              </View>
            ) : (
              <FlatList
                data={groupMembers}
                keyExtractor={(item) => item.id.toString()}
                style={styles.membersList}
                renderItem={({ item }) => (
                  <View style={styles.memberItem}>
                    <View style={styles.memberAvatar}>
                      {item.users?.avatar_url ? (
                        <Image source={{ uri: item.users.avatar_url }} style={styles.avatarImage} />
                      ) : (
                        <FontAwesome6 name="user" size={20} color={theme.textMuted} />
                      )}
                    </View>
                    <View style={styles.memberInfo}>
                      <ThemedText variant="body" color={theme.textPrimary}>
                        {item.users?.name || item.users?.username || '未知用户'}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textMuted}>
                        {item.role === 'owner' ? '群主' : '成员'}
                      </ThemedText>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <ThemedText variant="body" color={theme.textMuted}>暂无成员</ThemedText>
                  </View>
                }
              />
            )}
          </ThemedView>
        </View>
      </Modal>

      {/* 解散群组确认弹窗 */}
      <Modal visible={showDissolveConfirm} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => Platform.OS !== 'web' && Keyboard.dismiss()}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalOverlay}>
              <ThemedView level="default" style={styles.modalContent}>
                <ThemedText variant="title" color={theme.error} style={styles.modalTitle}>
                  确认解散群组
                </ThemedText>
                {dissolveGroup && (
                  <ThemedText variant="body" color={theme.textSecondary} style={styles.modalText}>
                    群组「{dissolveGroup.name}」将被解散，{dissolveGroup.memberCount}名成员将被移出，所有消息记录将删除。
                  </ThemedText>
                )}
                <ThemedText variant="caption" color={theme.textMuted}>
                  请输入群组ID进行确认：
                </ThemedText>
                <ThemedText variant="h3" color={theme.textPrimary}>
                  {dissolveGroup?.id}
                </ThemedText>
                <TextInput
                  style={styles.confirmInput}
                  value={dissolveConfirmCode}
                  onChangeText={setDissolveConfirmCode}
                  placeholder="输入群组ID"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => {
                      setShowDissolveConfirm(false);
                      setDissolveGroup(null);
                      setDissolveConfirmCode('');
                    }}
                  >
                    <ThemedText variant="body" color={theme.textSecondary}>取消</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonDanger]}
                    onPress={handleDissolveGroup}
                    disabled={dissolveLoading}
                  >
                    <ThemedText variant="bodyMedium" color={theme.buttonPrimaryText}>
                      {dissolveLoading ? '处理中...' : '确认解散'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </ThemedView>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 重置密码弹窗 */}
      <Modal visible={showResetPassword} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ThemedView level="default" style={styles.modalContent}>
            <ThemedText variant="title" color={theme.textPrimary} style={styles.modalTitle}>
              密码已重置
            </ThemedText>
            {resetPasswordUser && (
              <ThemedText variant="body" color={theme.textSecondary} style={styles.modalText}>
                用户 {resetPasswordUser.name || resetPasswordUser.username} 的新密码：
              </ThemedText>
            )}
            <ThemedView level="tertiary" style={styles.passwordBox}>
              <ThemedText variant="h2" color={theme.primary}>{newPassword}</ThemedText>
            </ThemedView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowResetPassword(false)}
            >
              <ThemedText variant="bodyMedium" color={theme.buttonPrimaryText}>确定</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>

      {/* 删除用户确认弹窗 */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => Platform.OS !== 'web' && Keyboard.dismiss()}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalOverlay}>
              <ThemedView level="default" style={styles.modalContent}>
                <ThemedText variant="title" color={theme.error} style={styles.modalTitle}>
                  确认删除用户
                </ThemedText>
                {deleteUser && (
                  <>
                    <ThemedText variant="body" color={theme.textSecondary} style={styles.modalText}>
                      即将删除用户：{deleteUser.name || deleteUser.username}
                    </ThemedText>
                    <ThemedText variant="caption" color={theme.textMuted} style={styles.modalHint}>
                      此操作将删除该用户的所有数据（运动记录、体重记录、群组消息等），且无法恢复。
                    </ThemedText>
                    <ThemedText variant="body" color={theme.textPrimary} style={styles.modalHint}>
                      请输入用户ID进行确认：
                    </ThemedText>
                    <ThemedText variant="h2" color={theme.textPrimary} style={styles.modalHint}>
                      {deleteUser.id}
                    </ThemedText>
                    <TextInput
                      style={styles.confirmInput}
                      value={deleteConfirmCode}
                      onChangeText={setDeleteConfirmCode}
                      placeholder="输入用户ID确认"
                      placeholderTextColor={theme.textMuted}
                      keyboardType="numeric"
                    />
                    <ThemedText variant="body" color={theme.textPrimary} style={[styles.modalHint, { marginTop: 16 }]}>
                      请输入删除密码：
                    </ThemedText>
                    <TextInput
                      style={styles.confirmInput}
                      value={deletePassword}
                      onChangeText={setDeletePassword}
                      placeholder="输入删除密码"
                      placeholderTextColor={theme.textMuted}
                      secureTextEntry
                    />
                    <View style={styles.modalButtonRow}>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.modalButtonSecondary]}
                        onPress={() => setShowDeleteConfirm(false)}
                        disabled={deleteLoading}
                      >
                        <ThemedText variant="bodyMedium" color={theme.textSecondary}>取消</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.modalButtonDanger]}
                        onPress={handleDeleteUser}
                        disabled={deleteLoading || deleteConfirmCode.trim() !== String(deleteUser.id) || deletePassword.trim() !== 'QRSC'}
                      >
                        <ThemedText variant="bodyMedium" color={theme.buttonPrimaryText}>
                          {deleteLoading ? '删除中...' : '确认删除'}
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ThemedView>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 照片查看器 */}
      <Modal visible={showPhotoViewer} transparent animationType="fade">
        <View style={styles.photoViewerOverlay}>
          <TouchableOpacity
            style={styles.photoViewerClose}
            onPress={() => setShowPhotoViewer(false)}
          >
            <FontAwesome6 name="xmark" size={24} color="#FFF" />
          </TouchableOpacity>
          <FlatList
            data={viewerPhotos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={viewerIndex}
            getItemLayout={(_, index) => ({
              length: 350,
              offset: 350 * index,
              index,
            })}
            renderItem={({ item }) => (
              <View style={styles.photoViewerItem}>
                <Image source={{ uri: item }} style={styles.photoViewerImage} resizeMode="contain" />
              </View>
            )}
          />
        </View>
      </Modal>
    </Screen>
  );
}
