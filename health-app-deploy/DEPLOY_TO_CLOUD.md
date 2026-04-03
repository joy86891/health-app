# 健康达人 App 部署指南

## 概述

将应用部署到 Vercel + Render 免费云平台，实现永久稳定运行。

---

## 第一步：准备工作

### 1.1 下载代码包

从 `health-app-deploy.tar.gz` 解压得到项目代码。

### 1.2 注册账号（需要翻墙）

| 平台 | 网址 | 用途 |
|------|------|------|
| GitHub | https://github.com | 代码托管 |
| Vercel | https://vercel.com | 前端部署 |
| Render | https://render.com | 后端部署 |

**注意**：Vercel 和 Render 都可以用 GitHub 账号直接登录，只需要注册 GitHub 就行。

---

## 第二步：推送到 GitHub

### 2.1 创建仓库

1. 登录 GitHub
2. 点击右上角 **+** → **New repository**
3. Repository name: `health-app`
4. 选择 **Public**（公开）
5. 点击 **Create repository**

### 2.2 推送代码

在解压后的项目目录打开终端（Terminal/命令行）：

```bash
# 初始化
git init
git add .
git commit -m "Initial commit"

# 推送（替换 YOUR_USERNAME 为你的 GitHub 用户名）
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/health-app.git
git push -u origin main
```

---

## 第三步：部署后端到 Render

### 3.1 创建服务

1. 打开 https://render.com
2. 点击 **Sign Up** → 选择 **Continue with GitHub**
3. 授权后，点击 **New** → **Web Service**
4. 选择你刚创建的 `health-app` 仓库

### 3.2 填写配置

| 配置项 | 值 |
|--------|---|
| Name | `health-app-backend` |
| Region | `Singapore` 或 `Oregon` |
| Branch | `main` |
| Root Directory | `server` |
| Runtime | `Node` |
| Build Command | `npm install -g pnpm && pnpm install && pnpm run build` |
| Start Command | `pnpm start` |
| Instance Type | `Free` |

### 3.3 添加环境变量

点击 **Advanced** → **Add Environment Variable**，添加以下变量：

| 变量名 | 值 |
|--------|---|
| DATABASE_URL | `https://br-solid-slug-533bf48c.supabase2.aidap-global.cn-beijing.volces.com` |
| SUPABASE_DB_URL | `https://br-solid-slug-533bf48c.supabase2.aidap-global.cn-beijing.volces.com` |
| COZE_BUCKET_ENDPOINT_URL | `https://integration.coze.cn/coze-coding-s3proxy/v1` |
| COZE_BUCKET_NAME | `bucket_1773820517254` |
| COZE_WORKLOAD_IDENTITY_CLIENT_ID | `fLALLrv3g96puJyzgqerWFprO2ghXDzb` |
| COZE_WORKLOAD_IDENTITY_CLIENT_SECRET | `pEmq4xG2wdaU8xRw6rZIHTaWQLwFqB8FwcdzafbvzCvHux0bHaTsHIS3Qkx1bc1p` |
| JWT_SECRET | `health-app-jwt-secret-2026` |
| ADMIN_KEY | `88888888` |

### 3.4 部署

1. 点击 **Create Web Service**
2. 等待 5-10 分钟完成部署
3. 部署成功后，你会得到一个地址，如：`https://health-app-backend.onrender.com`

### 3.5 测试后端

访问：`https://health-app-backend.onrender.com/api/v1/health`

如果返回 `{"status":"ok"}` 就成功了。

---

## 第四步：部署前端到 Vercel

### 4.1 创建项目

1. 打开 https://vercel.com
2. 点击 **Sign Up** → 选择 **Continue with GitHub**
3. 授权后，点击 **Add New** → **Project**
4. 选择 `health-app` 仓库

### 4.2 填写配置

| 配置项 | 值 |
|--------|---|
| Framework Preset | `Other` |
| Root Directory | `client` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

### 4.3 添加环境变量

点击 **Environment Variables**，添加：

| 变量名 | 值 |
|--------|---|
| EXPO_PUBLIC_BACKEND_BASE_URL | `https://health-app-backend.onrender.com` |
| EXPO_PUBLIC_PRODUCTION_API_URL | `https://health-app-backend.onrender.com` |

**注意**：把 `health-app-backend` 换成你在 Render 创建的服务名。

### 4.4 部署

1. 点击 **Deploy**
2. 等待 3-5 分钟完成部署
3. 部署成功后，你会得到一个地址，如：`https://health-app.vercel.app`

---

## 第五步：配置 CORS

回到 Render，添加一个环境变量：

| 变量名 | 值 |
|--------|---|
| ALLOWED_ORIGINS | `https://health-app.vercel.app` |

**注意**：把 `health-app` 换成你在 Vercel 的项目名。

然后 Render 会自动重新部署。

---

## 第六步：更新 APP 后端地址

需要重新打包 APK，把后端地址改为 Render 的地址。

修改 `client/config/api.ts` 中的 `PRODUCTION_API_URL`：

```typescript
const PRODUCTION_API_URL = 'https://health-app-backend.onrender.com';
```

然后重新打包 APK。

---

## 完成！

部署完成后：

| 服务 | 地址 |
|------|------|
| 前端网页 | `https://health-app.vercel.app` |
| 后端 API | `https://health-app-backend.onrender.com` |
| APK 管理 | `https://health-app-backend.onrender.com/api/v1/admin/apk` |

---

## 注意事项

### Render 免费版限制
- 每月 750 小时（足够一个服务 24/7 运行）
- 15 分钟无请求会休眠
- 首次访问可能需要 30 秒冷启动

### 避免 Render 后端休眠
在 `https://cron-job.org` 创建定时任务：
- URL: `https://health-app-backend.onrender.com/api/v1/health`
- 频率: 每 5 分钟

---

## 如有问题

如果部署过程中遇到问题，检查：
1. 环境变量是否正确配置
2. Build Command 和 Start Command 是否正确
3. 查看 Render/Vercel 的日志排查错误
