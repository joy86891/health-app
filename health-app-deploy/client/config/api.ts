import Constants from 'expo-constants';

/**
 * 开发环境API基础URL（Coze沙箱）
 */
const DEV_API_URL = 'https://561b9af8-c1e5-426c-b873-60191e12cc56.dev.coze.site';

/**
 * 生产环境API基础URL（部署到云平台后更新此地址）
 * 部署到 Render 后，将此地址改为你的 Render 后端地址
 * 例如：https://health-app-backend.onrender.com
 */
const PRODUCTION_API_URL = process.env.EXPO_PUBLIC_PRODUCTION_API_URL || '';

/**
 * 判断是否为生产环境
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * 获取API基础URL
 * 优先级：
 * 1. 生产环境变量 EXPO_PUBLIC_PRODUCTION_API_URL（部署时设置）
 * 2. 环境变量 process.env.EXPO_PUBLIC_BACKEND_BASE_URL（开发环境）
 * 3. Constants.expoConfig.extra.EXPO_PUBLIC_BACKEND_BASE_URL
 * 4. 开发环境地址（Coze沙箱）
 */
export const getApiBaseUrl = (): string => {
  // 1. 生产环境优先使用生产地址
  if (isProduction && PRODUCTION_API_URL) {
    console.log('[Config] API Base URL (production):', PRODUCTION_API_URL);
    return PRODUCTION_API_URL;
  }

  // 2. 尝试从环境变量获取（开发模式和Web端）
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  if (envUrl) {
    console.log('[Config] API Base URL from env:', envUrl);
    return envUrl;
  }

  // 3. 尝试从 Constants 获取（原生APP）
  const extraUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_BASE_URL as string | undefined;
  if (extraUrl) {
    console.log('[Config] API Base URL from Constants.expoConfig.extra:', extraUrl);
    return extraUrl;
  }

  // 4. 兜底：使用开发环境地址
  console.log('[Config] API Base URL (dev fallback):', DEV_API_URL);
  return DEV_API_URL;
};

/**
 * 构建完整的API URL
 */
export const getApiUrl = (path: string): string => {
  const baseUrl = getApiBaseUrl();
  // 确保path以/开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

// 导出默认值，方便直接使用
export const API_BASE_URL = getApiBaseUrl();
