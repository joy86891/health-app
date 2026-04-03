import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { S3Storage } from 'coze-coding-dev-sdk';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as crypto from 'crypto';

const router = Router();

// ES Module 环境下获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// S3客户端配置
const s3Client = new S3Client({
  endpoint: process.env.COZE_BUCKET_ENDPOINT_URL,
  region: 'cn-beijing',
  credentials: {
    accessKeyId: process.env.COZE_WORKLOAD_IDENTITY_CLIENT_ID || '',
    secretAccessKey: process.env.COZE_WORKLOAD_IDENTITY_CLIENT_SECRET || '',
  },
});

/**
 * 应用版本信息配置
 * 
 * 发布新版本 APK 时需要更新以下配置：
 * 1. 将新版 APK 上传到对象存储
 * 2. 更新 LATEST_VERSION 和 LATEST_VERSION_CODE
 * 3. 更新 APK_DOWNLOAD_URL
 * 4. 填写 RELEASE_NOTES 说明更新内容
 * 
 * 版本号格式说明：
 * - LATEST_VERSION: 使用日期格式 YYYYMMDD.HHMM (如 20260325.1600)
 * - LATEST_VERSION_CODE: 使用 MDDHHMM 格式 (如 3251600 表示 3月25日16:00)
 * 
 * 重要：这些值应该是固定值，指向实际发布的 APK 版本
 * 
 * 国内适配说明：
 * - 已禁用 OTA 热更新（Expo 服务器需翻墙）
 * - APK 从对象存储分发（国内可访问）
 */

// 版本信息文件路径
const VERSION_FILE = path.join(__dirname, '../version.json');

// 读取版本信息
function getVersionInfo() {
  if (fs.existsSync(VERSION_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(VERSION_FILE, 'utf-8'));
    } catch {
      // 忽略错误
    }
  }
  return null;
}

// 最新版本信息
const defaultVersionInfo = getVersionInfo();
let LATEST_VERSION = defaultVersionInfo?.latestVersion || '1.1.0';
let LATEST_VERSION_CODE = defaultVersionInfo?.latestVersionCode || 3271900;
let APK_DOWNLOAD_URL = defaultVersionInfo?.downloadUrl || process.env.APK_DOWNLOAD_URL || '';
let RELEASE_NOTES = defaultVersionInfo?.releaseNotes || '1.1.0 版本更新：\n• 优化体重趋势图显示，标注关键数据点\n• 修复版本检查逻辑';

/**
 * 检查应用更新
 * GET /api/v1/version/check
 * 
 * Query 参数：
 * - platform: 平台 (android/ios)
 * - currentVersion: 当前版本号字符串 (如 20260325.1008)
 * - versionCode: 当前版本号整数 (如 3251008)
 */
router.get('/check', async (req: Request, res: Response) => {
  try {
    // 动态读取版本信息
    const versionInfo = getVersionInfo();
    const latestVersion = versionInfo?.latestVersion || LATEST_VERSION;
    const latestVersionCode = versionInfo?.latestVersionCode || LATEST_VERSION_CODE;
    const apkDownloadUrl = versionInfo?.downloadUrl || APK_DOWNLOAD_URL;
    const releaseNotes = versionInfo?.releaseNotes || RELEASE_NOTES;

    const { platform, currentVersion, versionCode } = req.query;

    console.log('[版本检查] 收到请求:', { platform, currentVersion, versionCode });

    // 参数校验
    if (!platform || !currentVersion) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数',
      });
    }

    // 当前只支持 Android
    if (platform !== 'android') {
      return res.json({
        success: true,
        data: {
          needsUpdate: false,
          latestVersion,
          message: '当前平台暂不支持更新',
        },
      });
    }

    // 比较版本号
    const currentCode = parseInt(String(versionCode), 10) || 0;
    
    // 只有当有 APK 下载地址时才检查版本更新
    const hasApkUrl = Boolean(apkDownloadUrl && apkDownloadUrl.length > 0);
    const needsUpdate = hasApkUrl && currentCode < latestVersionCode;

    console.log('[版本检查] 比较结果:', { 
      currentCode, 
      latestCode: latestVersionCode, 
      hasApkUrl,
      needsUpdate 
    });

    return res.json({
      success: true,
      data: {
        needsUpdate,
        latestVersion,
        currentVersion,
        downloadUrl: needsUpdate ? apkDownloadUrl : undefined,
        releaseNotes: needsUpdate ? releaseNotes : '',
        isForced: false,
      },
    });
  } catch (error) {
    console.error('检查版本更新失败:', error);
    return res.status(500).json({
      success: false,
      error: '检查更新失败',
    });
  }
});

/**
 * 获取最新版本信息（管理员接口）
 * GET /api/v1/version/latest
 */
router.get('/latest', async (req: Request, res: Response) => {
  try {
    return res.json({
      success: true,
      data: {
        latestVersion: LATEST_VERSION,
        latestVersionCode: LATEST_VERSION_CODE,
        downloadUrl: APK_DOWNLOAD_URL,
        releaseNotes: RELEASE_NOTES,
      },
    });
  } catch (error) {
    console.error('获取版本信息失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取版本信息失败',
    });
  }
});

/**
 * 更新版本信息（管理员接口）
 * POST /api/v1/version/update
 * Body: { version: string, versionCode: number, downloadUrl: string, releaseNotes?: string }
 */
router.post('/update', async (req: Request, res: Response) => {
  try {
    const { version, versionCode, downloadUrl, releaseNotes } = req.body;

    // 这里可以写入数据库或配置文件
    // 目前只是返回成功，实际需要持久化存储

    return res.json({
      success: true,
      message: '版本信息已更新（注意：需要持久化存储）',
      data: {
        version,
        versionCode,
        downloadUrl,
        releaseNotes,
      },
    });
  } catch (error) {
    console.error('更新版本信息失败:', error);
    return res.status(500).json({
      success: false,
      error: '更新版本信息失败',
    });
  }
});

// APK上传配置 - 使用磁盘存储避免内存限制
const tmpDir = '/tmp/apk-upload';
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const apkUpload = multer({
  storage: multer.diskStorage({
    destination: tmpDir,
    filename: (req, file, cb) => {
      cb(null, `upload-${Date.now()}.apk`);
    }
  }),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.android.package-archive' ||
        file.originalname.endsWith('.apk')) {
      return cb(null, true);
    }
    cb(new Error('只支持APK文件'));
  }
});

// 对象存储实例
const s3Storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

/**
 * 上传APK文件（管理员接口）
 * POST /api/v1/version/upload-apk
 * Body: FormData { apk: File, version?: string, versionCode?: number, releaseNotes?: string }
 */
router.post('/upload-apk', apkUpload.single('apk'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '未收到APK文件' });
    }

    const { path: filePath, originalname, size } = req.file;
    const { version, versionCode, releaseNotes } = req.body;

    console.log(`[APK上传] 文件名: ${originalname}, 大小: ${(size / 1024 / 1024).toFixed(2)}MB`);

    // 读取文件
    const buffer = fs.readFileSync(filePath);

    // 生成文件名
    const fileName = `apk/app-${Date.now()}.apk`;

    // 上传到对象存储
    const key = await s3Storage.uploadFile({
      fileContent: buffer,
      fileName,
      contentType: 'application/vnd.android.package-archive',
    });

    console.log(`[APK上传] 上传成功, key: ${key}`);

    // 删除临时文件
    fs.unlinkSync(filePath);

    // 生成签名URL（有效期180天）
    const signedUrl = await s3Storage.generatePresignedUrl({
      key,
      expireTime: 86400 * 180, // 180天
    });

    console.log(`[APK上传] 签名URL已生成`);

    // 更新.env文件中的APK_DOWNLOAD_URL
    const envPath = path.join(__dirname, '../../.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    // 更新或添加APK_DOWNLOAD_URL
    const lines = envContent.split('\n');
    let foundApkUrl = false;
    const updatedLines = lines.map(line => {
      if (line.startsWith('APK_DOWNLOAD_URL=')) {
        foundApkUrl = true;
        return `APK_DOWNLOAD_URL=${signedUrl}`;
      }
      return line;
    });

    if (!foundApkUrl) {
      updatedLines.push(`APK_DOWNLOAD_URL=${signedUrl}`);
    }

    fs.writeFileSync(envPath, updatedLines.join('\n'));
    console.log(`[APK上传] .env文件已更新`);

    return res.json({
      success: true,
      data: {
        key,
        downloadUrl: signedUrl,
        version: version || LATEST_VERSION,
        versionCode: versionCode || LATEST_VERSION_CODE,
        releaseNotes: releaseNotes || RELEASE_NOTES,
        message: 'APK上传成功，下载链接已更新',
      },
    });
  } catch (error) {
    console.error('上传APK失败:', error);
    return res.status(500).json({
      success: false,
      error: '上传APK失败: ' + (error as Error).message,
    });
  }
});

export default router;

/**
 * 从URL拉取APK并上传到对象存储
 * POST /api/v1/version/upload-from-url
 * Body: { url: string, version?: string, versionCode?: number, releaseNotes?: string }
 * 
 * 使用方法：
 * 1. 将APK上传到任意文件分享服务（如：https://send.vis.ee/）
 * 2. 获取分享链接
 * 3. 调用此接口，服务器会从URL下载APK并上传到对象存储
 */
router.post('/upload-from-url', async (req: Request, res: Response) => {
  try {
    const { url, version, versionCode, releaseNotes } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: '缺少url参数' });
    }

    console.log(`[APK上传] 从URL拉取: ${url}`);

    // 使用SDK从URL上传
    const key = await s3Storage.uploadFromUrl({
      url,
      bucket: process.env.COZE_BUCKET_NAME,
      timeout: 300000, // 5分钟超时
    });

    console.log(`[APK上传] 上传成功, key: ${key}`);

    // 生成下载签名URL（有效期180天）
    const downloadUrl = await s3Storage.generatePresignedUrl({
      key,
      expireTime: 86400 * 180,
    });

    // 更新.env文件中的APK_DOWNLOAD_URL
    const envPath = path.join(__dirname, '../../.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    const lines = envContent.split('\n');
    let foundApkUrl = false;
    const updatedLines = lines.map(line => {
      if (line.startsWith('APK_DOWNLOAD_URL=')) {
        foundApkUrl = true;
        return `APK_DOWNLOAD_URL=${downloadUrl}`;
      }
      return line;
    });

    if (!foundApkUrl) {
      updatedLines.push(`APK_DOWNLOAD_URL=${downloadUrl}`);
    }

    fs.writeFileSync(envPath, updatedLines.join('\n'));
    console.log(`[APK上传] .env文件已更新`);

    return res.json({
      success: true,
      data: {
        key,
        downloadUrl,
        version: version || LATEST_VERSION,
        versionCode: versionCode || LATEST_VERSION_CODE,
        releaseNotes: releaseNotes || RELEASE_NOTES,
        message: 'APK上传成功，下载链接已更新',
      },
    });
  } catch (error) {
    console.error('从URL上传APK失败:', error);
    return res.status(500).json({
      success: false,
      error: '上传失败: ' + (error as Error).message,
    });
  }
});

/**
 * 确认APK上传完成，生成下载链接
 * POST /api/v1/version/confirm-upload
 * Body: { key: string, version?: string, versionCode?: number, releaseNotes?: string }
 */
router.post('/confirm-upload', async (req: Request, res: Response) => {
  try {
    const { key, version, versionCode, releaseNotes } = req.body;

    if (!key) {
      return res.status(400).json({ success: false, error: '缺少key参数' });
    }

    console.log(`[APK上传] 确认上传: ${key}`);

    // 生成下载签名URL（有效期180天）
    const bucketName = process.env.COZE_BUCKET_NAME || '';
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 86400 * 180 });

    // 更新.env文件中的APK_DOWNLOAD_URL
    const envPath = path.join(__dirname, '../../.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    const lines = envContent.split('\n');
    let foundApkUrl = false;
    const updatedLines = lines.map(line => {
      if (line.startsWith('APK_DOWNLOAD_URL=')) {
        foundApkUrl = true;
        return `APK_DOWNLOAD_URL=${downloadUrl}`;
      }
      return line;
    });

    if (!foundApkUrl) {
      updatedLines.push(`APK_DOWNLOAD_URL=${downloadUrl}`);
    }

    fs.writeFileSync(envPath, updatedLines.join('\n'));
    console.log(`[APK上传] .env文件已更新`);

    return res.json({
      success: true,
      data: {
        downloadUrl,
        version: version || LATEST_VERSION,
        versionCode: versionCode || LATEST_VERSION_CODE,
        releaseNotes: releaseNotes || RELEASE_NOTES,
        message: 'APK上传确认成功，下载链接已更新',
      },
    });
  } catch (error) {
    console.error('确认上传失败:', error);
    return res.status(500).json({
      success: false,
      error: '确认上传失败',
    });
  }
});
