# ---- 1. 构建阶段 ----
FROM node:20-alpine AS builder
WORKDIR /app

# 复制依赖文件
COPY package*.json ./
RUN npm ci

# 复制源码和配置
COPY . .

# 构建应用
RUN npm run build

# ---- 2. 运行阶段 ----
FROM node:20-alpine
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production

# 复制必要文件
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/config ./config

EXPOSE 3000

CMD ["npm", "run", "start"]