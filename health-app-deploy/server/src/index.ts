import 'dotenv/config';
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import workoutsRouter from "./routes/workouts";
import uploadRouter from "./routes/upload";
import usersRouter from "./routes/users";
import groupsRouter from "./routes/groups";
import adminRouter from "./routes/admin";
import versionRouter from "./routes/version";
import adminApkRouter from "./routes/admin-apk";
import { startDailySummaryCron, triggerDailySummaryManually } from "./cron/dailySummary";

// ES Module 环境下获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 9091;

// CORS 配置
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['*'];

app.use(cors({
  origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
  credentials: true,
}));

// 服务重启工具页面（独立于前端，可直接访问）
app.get('/restart', (req, res) => {
  const htmlPath = path.join(__dirname, '../public/restart.html');
  res.sendFile(htmlPath);
});
app.use(express.json({ limit: '300mb' }));
app.use(express.urlencoded({ limit: '300mb', extended: true }));

// 增加请求超时时间（用于大文件上传）
app.use((req, res, next) => {
  res.setTimeout(300000); // 5分钟超时
  next();
});

// 前端静态文件托管（生产环境）
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

// 手动触发每日总结（测试用）
app.post('/api/v1/admin/trigger-daily-summary', async (req, res) => {
  try {
    await triggerDailySummaryManually();
    res.json({ success: true, message: '每日总结已触发' });
  } catch (error) {
    console.error('触发每日总结失败:', error);
    res.status(500).json({ error: '触发失败' });
  }
});

// 挂载路由
app.use('/api/v1/workouts', workoutsRouter);
app.use('/api/v1/upload', uploadRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/groups', groupsRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/version', versionRouter);
app.use('/api/v1/admin/apk', adminApkRouter); // APK管理页面

// 错误处理中间件
// @ts-ignore
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Error]', err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: '文件太大，最大支持300MB',
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: '无效的文件字段',
    });
  }
  
  res.status(500).json({
    success: false,
    error: err.message || '服务器错误',
  });
});

// 启动定时任务
startDailySummaryCron();

// SPA 路由通配符（必须在所有 API 路由之后）
// 所有未被匹配的路由都返回 index.html，让前端路由处理
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
