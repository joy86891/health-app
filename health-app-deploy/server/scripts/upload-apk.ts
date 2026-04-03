/**
 * 上传 APK 文件到对象存储
 * 使用方法：npx tsx scripts/upload-apk.ts /path/to/app.apk
 */
import { S3Storage } from 'coze-coding-dev-sdk';
import * as fs from 'fs';

async function uploadApk(apkPath: string) {
  console.log('🚀 开始上传 APK 到对象存储...');
  console.log(`📁 本地文件: ${apkPath}`);

  // 检查文件是否存在
  if (!fs.existsSync(apkPath)) {
    console.error('❌ 文件不存在');
    process.exit(1);
  }

  const stats = fs.statSync(apkPath);
  console.log(`📏 文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  // 初始化存储
  const storage = new S3Storage({
    endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
    accessKey: '',
    secretKey: '',
    bucketName: process.env.COZE_BUCKET_NAME,
    region: 'cn-beijing',
  });

  // 读取文件
  const fileContent = fs.readFileSync(apkPath);
  const fileName = `apk/app-1.0.0-${Date.now()}.apk`;

  console.log(`📤 上传中...`);

  // 上传文件
  const key = await storage.uploadFile({
    fileContent,
    fileName,
    contentType: 'application/vnd.android.package-archive',
  });

  console.log(`✅ 上传成功！Key: ${key}`);

  // 生成签名 URL（有效期 30 天）
  const signedUrl = await storage.generatePresignedUrl({
    key,
    expireTime: 2592000, // 30 天
  });

  console.log(`\n🎉 APK 下载链接（有效期30天）:\n${signedUrl}`);

  // 同时输出一个可配置的环境变量格式
  console.log(`\n📝 建议更新服务端环境变量:`);
  console.log(`APK_DOWNLOAD_URL=${signedUrl}`);

  return { key, url: signedUrl };
}

// 执行上传
const apkPath = process.argv[2] || '/tmp/app-1.0.0.apk';
uploadApk(apkPath).catch((err) => {
  console.error('❌ 上传失败:', err);
  process.exit(1);
});
