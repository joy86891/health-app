import { ExpoConfig, ConfigContext } from 'expo/config';

const appName = '电控设备分会健康达人';
const cozeProjectId = process.env.COZE_PROJECT_ID || process.env.EXPO_PUBLIC_COZE_PROJECT_ID;
const slugAppName = cozeProjectId ? `app${cozeProjectId}` : 'myapp';

// 版本号配置 - 固定值，发布新版本时需手动更新
// APK 显示版本号：语义化版本号
const APP_VERSION = '1.2.0';

// Android versionCode：固定值，每次发版递增
// 格式：MMDDHHMM (月份日期时分)，确保每次发版都比之前大
const ANDROID_VERSION_CODE = 3290000; // 1.2.0 版本

// 构建版本号（用于显示构建时间）
const BUILD_VERSION = (() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();
  return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}.${String(hour).padStart(2, '0')}${String(minute).padStart(2, '0')}`;
})();

console.log(`[Build] Version: ${APP_VERSION}, Build: ${BUILD_VERSION}, Android Code: ${ANDROID_VERSION_CODE}`);

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    "name": appName,
    "slug": slugAppName,
    "version": APP_VERSION,
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "myapp",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "buildNumber": BUILD_VERSION
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#FF4500"
      },
      "package": `com.anonymous.x${cozeProjectId || '0'}`,
      "versionCode": ANDROID_VERSION_CODE,
      "allowBackup": false  // 禁止备份，覆盖安装时不保留本地数据
    },
    "web": {
      "bundler": "metro",
      "output": "single",
      "favicon": "./assets/images/favicon.png"
    },
    // 国内适配：禁用 OTA 热更新（Expo 服务器需翻墙）
    // 更新方式：下载新版本 APK 覆盖安装
    "plugins": [
      process.env.EXPO_PUBLIC_BACKEND_BASE_URL ? [
        "expo-router",
        {
          "origin": process.env.EXPO_PUBLIC_BACKEND_BASE_URL
        }
      ] : 'expo-router',
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#FF4500"
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": `允许运动日历App访问您的相册，以便您上传或保存图片。`,
          "cameraPermission": `允许运动日历App使用您的相机，以便您直接拍摄照片上传。`,
          "microphonePermission": `允许运动日历App访问您的麦克风，以便您拍摄带有声音的视频。`
        }
      ],
      [
        "expo-location",
        {
          "locationWhenInUsePermission": `运动日历App需要访问您的位置以提供周边服务及导航功能。`
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": `运动日历App需要访问相机以拍摄照片和视频。`,
          "microphonePermission": `运动日历App需要访问麦克风以录制视频声音。`,
          "recordAudioAndroid": true
        }
      ],
      "./plugins/androidInstallPermission.js",
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "eas": {
        "projectId": "8c652502-1ef2-4fa1-83b3-5b6a1cb851ec"
      },
      "EXPO_PUBLIC_BACKEND_BASE_URL": process.env.EXPO_PUBLIC_BACKEND_BASE_URL || process.env.COZE_PROJECT_DOMAIN_DEFAULT || '',
      "EXPO_PUBLIC_COZE_PROJECT_ID": cozeProjectId,
      "EXPO_PUBLIC_BUILD_VERSION": BUILD_VERSION,
    }
  };
};
