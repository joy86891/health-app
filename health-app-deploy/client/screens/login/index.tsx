import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { createStyles } from './styles';
import { FontAwesome6 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth, User } from '@/contexts/AuthContext';
import { getApiUrl, API_BASE_URL } from '@/config/api';
import { fetchWithRetry } from '@/utils/fetchWithRetry';

type LoginMode = 'login' | 'register';
type GuestStep = 1 | 2;

export default function LoginScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { login, getRememberedUsername } = useAuth();

  const [loginMode, setLoginMode] = useState<LoginMode>('login');
  const [guestStep, setGuestStep] = useState<GuestStep>(1);
  
  // 账号密码登录
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // 游客登录状态
  const [name, setName] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  
  const [loading, setLoading] = useState(false);

  // 加载记住的用户名
  useEffect(() => {
    const loadRememberedUsername = async () => {
      const remembered = await getRememberedUsername();
      if (remembered) {
        setUsername(remembered);
      }
    };
    loadRememberedUsername();
  }, [getRememberedUsername]);

  const handleAccountLogin = async () => {
    console.log('[登录] 开始登录，用户名:', username);
    
    if (!username.trim()) {
      if (Platform.OS === 'web') {
        window.alert('请输入账号');
      } else {
        Alert.alert('提示', '请输入账号');
      }
      return;
    }

    if (!password.trim()) {
      if (Platform.OS === 'web') {
        window.alert('请输入密码');
      } else {
        Alert.alert('提示', '请输入密码');
      }
      return;
    }

    setLoading(true);
    try {
      console.log('[登录] API_BASE_URL:', API_BASE_URL, '用户名:', username.trim());
      
      /**
       * 服务端文件：server/src/routes/users.ts
       * 接口：POST /api/v1/users/login
       * Body 参数：username: string, password: string
       */
      const url = getApiUrl('/api/v1/users/login');
      console.log('[登录] 请求URL:', url);
      
      // 使用带超时和重试的请求
      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
        timeout: 10000,  // 10秒超时
        retries: 2,      // 重试2次
      });

      const result = await response.json();
      console.log('[登录] 响应:', result);

      if (result.success) {
        const userData: User = {
          id: result.data.id,
          username: result.data.username,
          name: result.data.name,
          avatarUrl: result.data.avatarUrl,
          height: result.data.height,
          weight: result.data.weight,
        };
        login(userData);
        router.replace('/(tabs)');
      } else {
        if (Platform.OS === 'web') {
          window.alert(result.error || '登录失败');
        } else {
          Alert.alert('错误', result.error || '登录失败');
        }
      }
    } catch (error) {
      console.error('登录失败:', error);
      const errorMessage = (error as Error).name === 'AbortError' 
        ? '网络请求超时，请检查网络后重试'
        : (error as Error).message || '登录失败，请重试';
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert('错误', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    console.log('[注册] 开始注册，用户名:', username);
    
    const showWebAlert = (message: string) => {
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('提示', message);
      }
    };
    
    if (!username.trim()) {
      showWebAlert('请输入账号');
      return;
    }

    if (username.length < 4 || username.length > 12) {
      showWebAlert('账号长度需要4-12个字符');
      return;
    }

    if (!/^\w+$/i.test(username)) {
      showWebAlert('账号只能包含字母、数字和下划线');
      return;
    }

    if (!password.trim()) {
      showWebAlert('请输入密码');
      return;
    }

    if (password.length < 6) {
      showWebAlert('密码至少需要6个字符');
      return;
    }

    if (password.length > 20) {
      showWebAlert('密码最多20个字符');
      return;
    }

    if (username === password) {
      showWebAlert('密码不能与账号相同');
      return;
    }

    if (password !== confirmPassword) {
      showWebAlert('两次输入的密码不一致');
      return;
    }

    if (!name.trim()) {
      showWebAlert('请输入姓名');
      return;
    }

    console.log('[注册] 验证通过，开始请求');
    setLoading(true);
    try {
      console.log('[注册] API_BASE_URL:', API_BASE_URL);
      const url = getApiUrl('/api/v1/users/register');
      console.log('[注册] 请求URL:', url);
      /**
       * 服务端文件：server/src/routes/users.ts
       * 接口：POST /api/v1/users/register
       * Body 参数：username: string, password: string, name?: string, height?: number, weight?: number
       */
      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          name: name.trim(),
          height: height ? parseInt(height, 10) : undefined,
          weight: weight ? parseInt(weight, 10) : undefined,
        }),
        timeout: 10000,
        retries: 2,
      });

      const result = await response.json();
      console.log('[注册] 响应:', result);

      if (result.success) {
        const userData: User = {
          id: result.data.id,
          username: result.data.username,
          name: result.data.name,
          avatarUrl: result.data.avatarUrl,
          height: result.data.height,
          weight: result.data.weight,
        };
        login(userData);
        if (Platform.OS === 'web') {
          window.alert('注册成功！');
        } else {
          Alert.alert('成功', '注册成功！');
        }
        router.replace('/(tabs)');
      } else {
        if (Platform.OS === 'web') {
          window.alert(result.error || '注册失败');
        } else {
          Alert.alert('错误', result.error || '注册失败');
        }
      }
    } catch (error) {
      console.error('注册失败:', error);
      const errorMessage = (error as Error).name === 'AbortError' 
        ? '网络请求超时，请检查网络后重试'
        : (error as Error).message || '注册失败，请重试';
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert('错误', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    if (!name.trim()) {
      Alert.alert('提示', '请输入你的名字');
      return;
    }

    setLoading(true);
    try {
      let deviceId = await AsyncStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = Crypto.randomUUID();
        await AsyncStorage.setItem('deviceId', deviceId);
      }

      /**
       * 服务端文件：server/src/routes/users.ts
       * 接口：POST /api/v1/users/guest
       * Body 参数：name: string, deviceId: string, height?: number, weight?: number
       */
      const response = await fetchWithRetry(getApiUrl('/api/v1/users/guest'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        body: JSON.stringify({
          name: name.trim(),
          deviceId,
          height: height ? parseInt(height, 10) : undefined,
          weight: weight ? parseInt(weight, 10) : undefined,
        }),
        timeout: 10000,
        retries: 2,
      });

      const result = await response.json();

      if (result.success) {
        const userData: User = {
          id: result.data.id,
          name: result.data.name,
          height: result.data.height,
          weight: result.data.weight,
        };
        login(userData);
        router.replace('/(tabs)');
      } else {
        Alert.alert('错误', result.error || '登录失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      const errorMessage = (error as Error).name === 'AbortError' 
        ? '网络请求超时，请检查网络后重试'
        : (error as Error).message || '登录失败，请重试';
      Alert.alert('错误', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderAccountAuth = () => (
    <>
      <ThemedView level="default" style={styles.formContainer}>
        <ThemedText variant="title" color={theme.textPrimary} style={styles.formTitle}>
          {loginMode === 'login' ? '欢迎回来' : '创建账号'}
        </ThemedText>
        <ThemedText variant="small" color={theme.textSecondary} style={styles.formSubtitle}>
          {loginMode === 'login' ? '登录你的账号查看运动记录' : '注册后可跨设备同步数据'}
        </ThemedText>

        {/* 用户名输入 */}
        <View style={styles.inputWrapper}>
          <FontAwesome6 name="user" size={16} color={theme.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={username}
            onChangeText={setUsername}
            placeholder="用户名"
            placeholderTextColor={theme.textMuted}
            maxLength={12}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {loginMode === 'register' && (
          <ThemedText variant="tiny" color={theme.textMuted} style={styles.inputHint}>
            账号长度4-12个字符，仅限字母、数字、下划线
          </ThemedText>
        )}

        {/* 密码输入 */}
        <View style={styles.inputWrapper}>
          <FontAwesome6 name="lock" size={16} color={theme.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={password}
            onChangeText={setPassword}
            placeholder="密码"
            placeholderTextColor={theme.textMuted}
            secureTextEntry={!showPassword}
            maxLength={20}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <FontAwesome6 
              name={showPassword ? "eye-slash" : "eye"} 
              size={16} 
              color={theme.textMuted} 
            />
          </TouchableOpacity>
        </View>
        {loginMode === 'register' && (
          <ThemedText variant="tiny" color={theme.textMuted} style={styles.inputHint}>
            密码长度6-20个字符，不能与账号相同
          </ThemedText>
        )}

        {/* 确认密码（注册时显示） */}
        {loginMode === 'register' && (
          <>
            <View style={styles.inputWrapper}>
              <FontAwesome6 name="lock" size={16} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="确认密码"
                placeholderTextColor={theme.textMuted}
                secureTextEntry={!showPassword}
                maxLength={20}
              />
            </View>

            {/* 姓名 */}
            <View style={styles.inputWrapper}>
              <FontAwesome6 name="id-card" size={16} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={name}
                onChangeText={setName}
                placeholder="姓名"
                placeholderTextColor={theme.textMuted}
                maxLength={20}
              />
            </View>

            {/* 身高体重（可选） */}
            <View style={styles.inputRow}>
              <View style={styles.inputFieldWrap}>
                <TextInput
                  style={styles.inputFieldSmall}
                  value={height}
                  onChangeText={setHeight}
                  placeholder="身高 cm"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
              <View style={styles.inputFieldWrap}>
                <TextInput
                  style={styles.inputFieldSmall}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="体重 kg"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={loginMode === 'login' ? handleAccountLogin : handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          <ThemedText variant="bodyMedium" color={theme.buttonPrimaryText}>
            {loading ? '处理中...' : (loginMode === 'login' ? '登录' : '注册')}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchModeButton}
          onPress={() => {
            setLoginMode(loginMode === 'login' ? 'register' : 'login');
            setPassword('');
            setConfirmPassword('');
          }}
        >
          <ThemedText variant="small" color={theme.primary}>
            {loginMode === 'login' ? '没有账号？立即注册' : '已有账号？立即登录'}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </>
  );

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ThemedView level="root" style={styles.container}>
          {/* Logo区域 */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <FontAwesome6 name="dumbbell" size={48} color={theme.buttonPrimaryText} />
            </View>
            <ThemedText variant="h2" color={theme.textPrimary} style={styles.appName}>
              电控设备分会健康达人
            </ThemedText>
            <ThemedText variant="body" color={theme.textSecondary}>
              记录运动，分享健康
            </ThemedText>
          </View>

          {/* 账号密码登录/注册 */}
          {renderAccountAuth()}

          {/* 管理后台入口 */}
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => router.push('/admin')}
          >
            <FontAwesome6 name="shield-halved" size={14} color={theme.textMuted} />
            <ThemedText variant="small" color={theme.textMuted}>管理后台</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </Screen>
  );
}
