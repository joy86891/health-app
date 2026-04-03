import express from 'express';
import multer from 'multer';
import { S3Storage } from 'coze-coding-dev-sdk';

const router = express.Router();

// 允许的文件类型白名单
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

// 允许的文件扩展名
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// 文件大小限制：10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    // 检查MIME类型
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('不支持的文件类型，仅支持 JPG、PNG、GIF、WebP 格式的图片'));
    }
    
    // 检查文件扩展名
    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error('不支持的文件扩展名'));
    }
    
    cb(null, true);
  }
});

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

/**
 * 上传文件
 * POST /api/v1/upload
 * Body: file (FormData)
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未收到文件' });
    }

    const { buffer, originalname, mimetype } = req.file;
    
    // 二次校验：检查文件魔数（防止伪造扩展名）
    // 只验证是否为有效的图片格式，不要求与声明的 MIME 类型严格匹配
    const fileSignature = buffer.slice(0, 4).toString('hex').toLowerCase();
    const allValidSignatures = [
      'ffd8ffe0', 'ffd8ffe1', 'ffd8ffdb', // JPEG
      '89504e47', // PNG
      '47494638', // GIF
      '52494646', // WebP (RIFF)
    ];
    
    const isValidImage = allValidSignatures.some(sig => fileSignature.startsWith(sig));
    
    if (!isValidImage) {
      console.warn('文件签名校验失败，非有效图片格式:', { mimetype, signature: fileSignature });
      return res.status(400).json({ error: '文件不是有效的图片格式' });
    }
    
    // 生成唯一文件名（使用时间戳+随机数）
    const ext = originalname.toLowerCase().substring(originalname.lastIndexOf('.'));
    const fileName = `workouts/${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    
    // 上传到对象存储
    const key = await storage.uploadFile({
      fileContent: buffer,
      fileName,
      contentType: mimetype,
    });

    // 生成签名URL（延长有效期至1年，避免图片失效）
    const url = await storage.generatePresignedUrl({
      key,
      expireTime: 86400 * 365, // 1年有效期
    });

    res.json({ 
      success: true, 
      data: { key, url }
    });
  } catch (error) {
    console.error('上传文件失败:', error);
    res.status(500).json({ error: '上传文件失败' });
  }
});

// multer错误处理中间件
router.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.message.includes('不支持的文件类型') || err.message.includes('不支持的文件扩展名')) {
    return res.status(400).json({ error: err.message });
  }
  if (err.message.includes('File too large')) {
    return res.status(400).json({ error: '文件大小不能超过10MB' });
  }
  console.error('上传中间件错误:', err);
  res.status(500).json({ error: '上传文件失败' });
});

export default router;
