const { withAndroidManifest } = require('expo/config-plugins');

/**
 * 自定义插件：添加 Android REQUEST_INSTALL_PACKAGES 权限
 * 用于支持应用内安装 APK
 */
module.exports = function withAndroidInstallPermission(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;

    // 确保 manifest 存在
    if (!androidManifest.manifest) {
      androidManifest.manifest = {};
    }

    // 确保 uses-permission 数组存在
    if (!androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = [];
    }

    // 检查是否已存在该权限
    const permissions = androidManifest.manifest['uses-permission'];
    const exists = permissions.some(
      (p) => p.$?.['android:name'] === 'android.permission.REQUEST_INSTALL_PACKAGES'
    );

    // 如果不存在则添加
    if (!exists) {
      permissions.push({
        $: {
          'android:name': 'android.permission.REQUEST_INSTALL_PACKAGES',
        },
      });
    }

    return config;
  });
};
