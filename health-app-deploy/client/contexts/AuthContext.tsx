import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/config/api";

export interface User {
  id: number;
  username?: string;
  phone?: string;
  name: string;
  avatarUrl?: string;
  height?: number;
  weight?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  getRememberedUsername: () => Promise<string>;
  setRememberedUsername: (username: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'user_data';
const REMEMBERED_USERNAME_KEY = 'remembered_username';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 从后端获取最新用户信息
  const fetchUserFromServer = async (userId: number): Promise<User | null> => {
    try {
      const response = await fetch(getApiUrl('/api/v1/users/me'), {
        headers: {
          'x-user-id': String(userId),
        },
      });
      const result = await response.json();
      if (result.success && result.data) {
        return {
          id: result.data.id,
          username: result.data.username,
          phone: result.data.phone,
          name: result.data.name,
          avatarUrl: result.data.avatarUrl,
          height: result.data.height,
          weight: result.data.weight,
        };
      }
      return null;
    } catch (error) {
      console.error('[Auth] 从服务器获取用户信息失败:', error);
      return null;
    }
  };

  // 初始化：从本地存储加载用户信息，并从服务器同步最新数据
  useEffect(() => {
    const loadUser = async () => {
      try {
        // 先从本地加载用户信息
        const userJson = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (userJson) {
          const localUserData = JSON.parse(userJson) as User;
          console.log('[Auth] 已从本地加载用户:', localUserData.name || localUserData.username);
          
          // 如果有用户ID，尝试从服务器获取最新信息
          if (localUserData.id) {
            const serverUser = await fetchUserFromServer(localUserData.id);
            if (serverUser) {
              // 合并本地和服务器数据，服务器数据优先
              const mergedUser = { ...localUserData, ...serverUser };
              setUser(mergedUser);
              // 更新本地存储
              await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mergedUser));
              console.log('[Auth] 已从服务器同步用户信息:', serverUser.name);
            } else {
              // 服务器用户不存在，清除本地无效数据
              console.log('[Auth] 服务器用户不存在，清除本地旧数据:', localUserData.username);
              await AsyncStorage.removeItem(USER_STORAGE_KEY);
              await AsyncStorage.removeItem(REMEMBERED_USERNAME_KEY);
              setUser(null);
            }
          } else {
            // 没有用户ID，清除无效数据
            console.log('[Auth] 本地数据无效，清除');
            await AsyncStorage.removeItem(USER_STORAGE_KEY);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('[Auth] 加载用户信息失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (userData: User) => {
    setUser(userData);
    try {
      // 保存用户 ID 到本地（用于 API 认证）
      // Web 端也需要保存，否则 getAuthHeaders 会读取到旧数据
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      
      // 保存记住的用户名
      if (userData.username) {
        await AsyncStorage.setItem(REMEMBERED_USERNAME_KEY, userData.username);
      }
      console.log('[Auth] 用户登录成功:', userData.name);
    } catch (error) {
      console.error('[Auth] 保存用户信息失败:', error);
    }
  };

  const logout = async () => {
    setUser(null);
    try {
      // 清除用户信息（所有平台）
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      console.log('[Auth] 用户已登出');
    } catch (error) {
      console.error('[Auth] 清除用户信息失败:', error);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...userData };
      setUser(newUser);
      try {
        // 更新用户信息（所有平台）
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
      } catch (error) {
        console.error('[Auth] 更新用户信息失败:', error);
      }
    }
  };

  // 手动刷新用户信息
  const refreshUser = async () => {
    if (user?.id) {
      const serverUser = await fetchUserFromServer(user.id);
      if (serverUser) {
        setUser(serverUser);
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(serverUser));
        console.log('[Auth] 已刷新用户信息');
      }
    }
  };

  const getRememberedUsername = async (): Promise<string> => {
    try {
      return await AsyncStorage.getItem(REMEMBERED_USERNAME_KEY) || '';
    } catch (error) {
      console.error('[Auth] 获取记住的用户名失败:', error);
      return '';
    }
  };

  const setRememberedUsername = async (username: string): Promise<void> => {
    try {
      if (username) {
        await AsyncStorage.setItem(REMEMBERED_USERNAME_KEY, username);
      } else {
        await AsyncStorage.removeItem(REMEMBERED_USERNAME_KEY);
      }
    } catch (error) {
      console.error('[Auth] 保存用户名失败:', error);
    }
  };

  const value: AuthContextType = {
    user,
    token: null,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser,
    refreshUser,
    getRememberedUsername,
    setRememberedUsername,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
