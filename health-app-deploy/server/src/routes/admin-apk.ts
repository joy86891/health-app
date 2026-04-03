import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { S3Storage } from 'coze-coding-dev-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 临时目录
const tmpDir = '/tmp/apk-upload';
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// APK上传配置
const apkUpload = multer({
  storage: multer.diskStorage({
    destination: tmpDir,
    filename: (req, file, cb) => {
      cb(null, `upload-${Date.now()}.apk`);
    }
  }),
  limits: { fileSize: 300 * 1024 * 1024 }, // 300MB
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.apk')) {
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

// 版本信息文件路径
const VERSION_FILE = path.join(__dirname, '../../version.json');

// 读取版本信息
function getVersionInfo() {
  if (fs.existsSync(VERSION_FILE)) {
    return JSON.parse(fs.readFileSync(VERSION_FILE, 'utf-8'));
  }
  return {
    latestVersion: '1.0.0',
    latestVersionCode: 1000000,
    releaseNotes: '',
    downloadUrl: process.env.APK_DOWNLOAD_URL || '',
    updatedAt: ''
  };
}

// 保存版本信息
function saveVersionInfo(info: any) {
  fs.writeFileSync(VERSION_FILE, JSON.stringify(info, null, 2));
}

/**
 * APK上传管理页面
 * GET /api/v1/admin/apk
 */
router.get('/', (req: Request, res: Response) => {
  const versionInfo = getVersionInfo();
  
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>APK版本管理</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
    }
    .upload-area {
      border: 3px dashed #ddd;
      border-radius: 16px;
      padding: 60px 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      margin-bottom: 20px;
    }
    .upload-area:hover, .upload-area.dragover {
      border-color: #667eea;
      background: #f8f9ff;
    }
    .upload-area.has-file {
      border-color: #10b981;
      background: #f0fdf4;
    }
    .upload-icon {
      font-size: 48px;
      margin-bottom: 15px;
    }
    .upload-text {
      color: #666;
      font-size: 16px;
    }
    .file-info {
      display: none;
      margin-top: 15px;
      padding: 15px;
      background: #f0f9ff;
      border-radius: 8px;
    }
    .file-info.show {
      display: block;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      color: #333;
      font-weight: 600;
      margin-bottom: 8px;
    }
    input[type="text"], input[type="number"], textarea {
      width: 100%;
      padding: 12px 15px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.3s;
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: #667eea;
    }
    textarea {
      resize: vertical;
      min-height: 100px;
    }
    .btn {
      width: 100%;
      padding: 15px;
      border: none;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .progress {
      display: none;
      margin-top: 20px;
    }
    .progress.show {
      display: block;
    }
    .progress-bar {
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      width: 0%;
      transition: width 0.3s;
    }
    .progress-text {
      text-align: center;
      margin-top: 10px;
      color: #666;
    }
    .result {
      display: none;
      margin-top: 20px;
      padding: 20px;
      border-radius: 8px;
    }
    .result.show {
      display: block;
    }
    .result.success {
      background: #f0fdf4;
      border: 1px solid #10b981;
    }
    .result.error {
      background: #fef2f2;
      border: 1px solid #ef4444;
    }
    .current-version {
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .current-version h3 {
      color: #333;
      margin-bottom: 10px;
    }
    .current-version p {
      color: #666;
      margin: 5px 0;
    }
    .version-badge {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
    }
    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .tab {
      flex: 1;
      padding: 12px;
      text-align: center;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s;
    }
    .tab.active {
      border-color: #667eea;
      background: #667eea;
      color: white;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
    .alert {
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .alert-info {
      background: #eff6ff;
      border: 1px solid #3b82f6;
      color: #1e40af;
    }
    .alert-warning {
      background: #fffbeb;
      border: 1px solid #f59e0b;
      color: #92400e;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>📦 APK版本管理</h1>
      <p class="subtitle">上传新版本APK，用户即可在APP内检查更新</p>
      
      <div class="current-version">
        <h3>当前版本信息</h3>
        <p><span class="version-badge">v${versionInfo.latestVersion}</span></p>
        <p>版本号: ${versionInfo.latestVersionCode}</p>
        <p>更新时间: ${versionInfo.updatedAt || '未设置'}</p>
        <p>下载链接: ${versionInfo.downloadUrl ? '已配置' : '未配置'}</p>
      </div>

      <!-- 上传方式切换 -->
      <div class="tabs">
        <div class="tab active" id="tabUrl" onclick="switchTab('url')">🔗 从URL上传</div>
        <div class="tab" id="tabFile" onclick="switchTab('file')">📁 本地上传</div>
      </div>

      <!-- URL上传方式 -->
      <div class="tab-content active" id="urlContent">
        <div class="alert alert-info">
          <strong>推荐方式：</strong>先将APK上传到网盘或文件分享服务，然后粘贴下载链接。
          <br><br>
          <strong>推荐网盘：</strong>
          <br>• 阿里云盘、百度网盘（分享链接）
          <br>• https://send.vis.ee/（免费临时分享）
          <br>• 蓝奏云、123云盘等
        </div>
        <form id="urlForm">
          <div class="form-group">
            <label for="apkUrl">APK下载链接</label>
            <input type="text" id="apkUrl" name="apkUrl" placeholder="https://example.com/app.apk" required>
          </div>
          <div class="form-group">
            <label for="versionUrl">版本号 (如 1.2.0)</label>
            <input type="text" id="versionUrl" name="version" placeholder="1.2.0" value="${versionInfo.latestVersion}" required>
          </div>
          <div class="form-group">
            <label for="versionCodeUrl">版本代码 (数字，每次发版递增)</label>
            <input type="number" id="versionCodeUrl" name="versionCode" placeholder="1002000" value="${versionInfo.latestVersionCode + 1000}" required>
          </div>
          <div class="form-group">
            <label for="releaseNotesUrl">更新说明</label>
            <textarea id="releaseNotesUrl" name="releaseNotes" placeholder="本次更新内容...">${versionInfo.releaseNotes}</textarea>
          </div>
          <button type="submit" class="btn btn-primary">🚀 从URL上传</button>
        </form>
      </div>

      <!-- 本地上传方式 -->
      <div class="tab-content" id="fileContent">
        <div class="alert alert-warning">
          <strong>注意：</strong>本地上传受平台限制，仅支持 <strong>10MB以内</strong> 的文件。
          <br>大文件请使用"从URL上传"方式。
        </div>
        <form id="uploadForm">
          <div class="upload-area" id="dropZone">
            <div class="upload-icon">📁</div>
            <div class="upload-text">拖拽APK文件到此处，或点击选择文件</div>
            <input type="file" id="fileInput" accept=".apk" style="display:none">
            <div class="file-info" id="fileInfo">
              <strong>已选择:</strong> <span id="fileName"></span><br>
              <strong>大小:</strong> <span id="fileSize"></span>
            </div>
          </div>

        <div class="form-group">
          <label for="version">版本号 (如 1.1.0)</label>
          <input type="text" id="version" name="version" placeholder="1.1.0" value="${versionInfo.latestVersion}" required>
        </div>

        <div class="form-group">
          <label for="versionCode">版本代码 (数字，每次发版递增)</label>
          <input type="number" id="versionCode" name="versionCode" placeholder="1001000" value="${versionInfo.latestVersionCode + 1000}" required>
        </div>

        <div class="form-group">
          <label for="releaseNotes">更新说明</label>
          <textarea id="releaseNotes" name="releaseNotes" placeholder="本次更新内容...">${versionInfo.releaseNotes}</textarea>
        </div>

        <button type="submit" class="btn btn-primary" id="submitBtn">
          🚀 发布新版本
        </button>

        <div class="progress" id="progress">
          <div class="progress-bar">
            <div class="progress-fill" id="progressFill"></div>
          </div>
          <div class="progress-text" id="progressText">上传中...</div>
        </div>

        <div class="result" id="result"></div>
      </form>
      </div>

      <div class="progress" id="progressUrl" style="display:none;">
        <div class="progress-bar">
          <div class="progress-fill" id="progressFillUrl"></div>
        </div>
        <div class="progress-text" id="progressTextUrl">上传中...</div>
      </div>

      <div class="result" id="resultUrl"></div>
    </div>
  </div>

  <script>
    // Tab切换
    function switchTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      if (tab === 'url') {
        document.getElementById('tabUrl').classList.add('active');
        document.getElementById('urlContent').classList.add('active');
      } else {
        document.getElementById('tabFile').classList.add('active');
        document.getElementById('fileContent').classList.add('active');
      }
    }

    // URL上传表单
    const urlForm = document.getElementById('urlForm');
    const progressUrl = document.getElementById('progressUrl');
    const progressFillUrl = document.getElementById('progressFillUrl');
    const progressTextUrl = document.getElementById('progressTextUrl');
    const resultUrl = document.getElementById('resultUrl');

    urlForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const apkUrl = document.getElementById('apkUrl').value;
      const version = document.getElementById('versionUrl').value;
      const versionCode = document.getElementById('versionCodeUrl').value;
      const releaseNotes = document.getElementById('releaseNotesUrl').value;

      if (!apkUrl) {
        alert('请输入APK下载链接');
        return;
      }

      progressUrl.style.display = 'block';
      resultUrl.className = 'result';
      progressFillUrl.style.width = '30%';
      progressTextUrl.textContent = '正在从URL下载APK...';

      try {
        const response = await fetch('/api/v1/version/upload-from-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: apkUrl, version, versionCode, releaseNotes })
        });

        progressFillUrl.style.width = '80%';
        progressTextUrl.textContent = '处理中...';

        const data = await response.json();

        if (data.success) {
          progressFillUrl.style.width = '100%';
          progressTextUrl.textContent = '发布成功！';
          
          resultUrl.className = 'result show success';
          resultUrl.innerHTML = \`
            <h3 style="color: #10b981; margin-bottom: 10px;">✅ 发布成功！</h3>
            <p><strong>版本:</strong> \${data.data.version}</p>
            <p><strong>版本代码:</strong> \${data.data.versionCode}</p>
            <p><strong>下载链接:</strong> <a href="\${data.data.downloadUrl}" target="_blank">点击查看</a></p>
            <p style="margin-top: 15px; color: #666;">用户现在可以在APP内检查更新了！</p>
          \`;
          
          urlForm.reset();
        } else {
          throw new Error(data.error || '上传失败');
        }
      } catch (error) {
        resultUrl.className = 'result show error';
        resultUrl.innerHTML = \`
          <h3 style="color: #ef4444; margin-bottom: 10px;">❌ 发布失败</h3>
          <p>\${error.message}</p>
        \`;
      } finally {
        setTimeout(() => {
          progressUrl.style.display = 'none';
          progressFillUrl.style.width = '0%';
        }, 2000);
      }
    });

    // 本地上传
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const form = document.getElementById('uploadForm');
    const progress = document.getElementById('progress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const result = document.getElementById('result');
    const submitBtn = document.getElementById('submitBtn');

    let selectedFile = null;

    // 点击上传区域
    dropZone.addEventListener('click', () => fileInput.click());

    // 拖拽事件
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].name.endsWith('.apk')) {
        handleFile(files[0]);
      } else {
        alert('请选择APK文件');
      }
    });

    // 文件选择
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    });

    function handleFile(file) {
      selectedFile = file;
      fileName.textContent = file.name;
      fileSize.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
      fileInfo.classList.add('show');
      dropZone.classList.add('has-file');
    }

    // 表单提交
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!selectedFile) {
        alert('请先选择APK文件');
        return;
      }

      const version = document.getElementById('version').value;
      const versionCode = document.getElementById('versionCode').value;
      const releaseNotes = document.getElementById('releaseNotes').value;

      // 显示进度
      progress.classList.add('show');
      result.classList.remove('show', 'success', 'error');
      submitBtn.disabled = true;

      const formData = new FormData();
      formData.append('apk', selectedFile);
      formData.append('version', version);
      formData.append('versionCode', versionCode);
      formData.append('releaseNotes', releaseNotes);

      try {
        progressText.textContent = '上传APK文件...';
        progressFill.style.width = '30%';

        const response = await fetch('/api/v1/admin/apk/upload', {
          method: 'POST',
          body: formData
        });

        progressFill.style.width = '80%';
        progressText.textContent = '处理中...';

        // 先检查响应状态
        if (!response.ok) {
          const text = await response.text();
          throw new Error('服务器错误: ' + text.substring(0, 200));
        }

        const data = await response.json();

        if (data.success) {
          progressFill.style.width = '100%';
          progressText.textContent = '发布成功！';
          
          result.className = 'result show success';
          result.innerHTML = \`
            <h3 style="color: #10b981; margin-bottom: 10px;">✅ 发布成功！</h3>
            <p><strong>版本:</strong> \${data.data.version}</p>
            <p><strong>版本代码:</strong> \${data.data.versionCode}</p>
            <p><strong>下载链接:</strong> <a href="\${data.data.downloadUrl}" target="_blank">点击查看</a></p>
            <p style="margin-top: 15px; color: #666;">用户现在可以在APP内检查更新了！</p>
          \`;
          
          // 重置表单
          selectedFile = null;
          fileInput.value = '';
          fileInfo.classList.remove('show');
          dropZone.classList.remove('has-file');
        } else {
          throw new Error(data.error || '上传失败');
        }
      } catch (error) {
        result.className = 'result show error';
        result.innerHTML = \`
          <h3 style="color: #ef4444; margin-bottom: 10px;">❌ 发布失败</h3>
          <p>\${error.message}</p>
        \`;
      } finally {
        submitBtn.disabled = false;
        setTimeout(() => {
          progress.classList.remove('show');
          progressFill.style.width = '0%';
        }, 2000);
      }
    });
  </script>
</body>
</html>`;

  res.send(html);
});

/**
 * 上传APK文件
 * POST /api/v1/admin/apk/upload
 */
router.post('/upload', apkUpload.single('apk'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '未收到APK文件' });
    }

    const { path: filePath, originalname, size } = req.file;
    const { version, versionCode, releaseNotes } = req.body;

    console.log(`[APK上传] 文件: ${originalname}, 大小: ${(size / 1024 / 1024).toFixed(2)}MB`);
    console.log(`[APK上传] 版本: ${version}, 版本代码: ${versionCode}`);

    // 读取文件
    const buffer = fs.readFileSync(filePath);

    // 生成文件名
    const fileName = `apk/app-${Date.now()}.apk`;

    // 上传到对象存储
    console.log('[APK上传] 正在上传到对象存储...');
    const key = await s3Storage.uploadFile({
      fileContent: buffer,
      fileName,
      contentType: 'application/vnd.android.package-archive',
    });

    console.log(`[APK上传] 上传成功: ${key}`);

    // 删除临时文件
    fs.unlinkSync(filePath);

    // 生成下载链接（180天有效期）
    const downloadUrl = await s3Storage.generatePresignedUrl({
      key,
      expireTime: 86400 * 180,
    });

    console.log('[APK上传] 下载链接已生成');

    // 更新版本信息文件
    const versionInfo = {
      latestVersion: version,
      latestVersionCode: parseInt(versionCode, 10),
      releaseNotes: releaseNotes || '',
      downloadUrl,
      key,
      updatedAt: new Date().toISOString(),
    };
    saveVersionInfo(versionInfo);

    // 同时更新.env文件
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

    console.log('[APK上传] 版本信息已更新');

    return res.json({
      success: true,
      data: {
        version,
        versionCode: parseInt(versionCode, 10),
        releaseNotes,
        downloadUrl,
        key,
        message: '发布成功！',
      },
    });
  } catch (error) {
    console.error('[APK上传] 失败:', error);
    return res.status(500).json({
      success: false,
      error: '上传失败: ' + (error as Error).message,
    });
  }
});

/**
 * 获取当前版本信息
 * GET /api/v1/admin/apk/info
 */
router.get('/info', (req: Request, res: Response) => {
  const versionInfo = getVersionInfo();
  res.json({ success: true, data: versionInfo });
});

export default router;
