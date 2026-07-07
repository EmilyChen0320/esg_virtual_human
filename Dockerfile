# 建置階段
FROM node:24-slim AS build-stage

WORKDIR /app

# 啟用 corepack 以使用 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 先複製 dependency 相關檔案與 pnpm policy，利用 Docker layer cache
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 安裝專案依賴（frozen lockfile 確保一致性）
RUN pnpm install --frozen-lockfile

# 複製專案檔案
COPY . .

# 建置專案
RUN pnpm build

# 正式環境階段
FROM nginx:alpine AS production-stage

# 複製建置產物到 nginx 目錄
COPY --from=build-stage /app/dist /usr/share/nginx/html

# 暴露 3008 port
EXPOSE 3008

# nginx 設定
RUN echo 'server { \
    listen 3008; \
    location / { \
    root /usr/share/nginx/html; \
    try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(mp4|png|jpg|jpeg|gif|svg|webp|json)$ { \
    root /usr/share/nginx/html; \
    add_header Cache-Control "public, max-age=31536000, immutable"; \
    } \
    }' > /etc/nginx/conf.d/default.conf

# 啟動 nginx
CMD ["nginx", "-g", "daemon off;"]
