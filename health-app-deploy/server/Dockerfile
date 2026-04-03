FROM node:20-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package.json
COPY package.json ./

# 安装依赖
RUN pnpm install --prod

# 复制构建产物
COPY dist ./dist

# 暴露端口
EXPOSE 10000

# 启动命令
CMD ["node", "dist/index.js"]
