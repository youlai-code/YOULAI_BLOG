#!/bin/bash

# --- 配置部分 ---
PROJECT_DIR="/www/wwwroot/YOULAI_BLOG"
DATA_DIR="/www/blog_data"
APP_NAME="youlai-blog"

# --- 1. 关键：解决环境变量问题 ---
# 强制加载环境变量，确保能找到 node, npm, pm2
export PATH=$PATH:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
# 尝试加载常见的配置文件
[ -f ~/.bashrc ] && source ~/.bashrc
[ -f /etc/profile ] && source /etc/profile
# 针对宝塔环境的特殊处理 (如果上面没加载到)
if [ -d "/www/server/nodejs" ]; then
    # 自动找到安装的 node 版本路径并加入 PATH
    NODE_BIN=$(ls -d /www/server/nodejs/*/bin | head -n 1)
    export PATH=$PATH:$NODE_BIN
fi

echo "----------------------------------------------------"
echo "开始部署: $(date)"
echo "Node版本: $(node -v)"
echo "NPM版本:  $(npm -v)"
echo "----------------------------------------------------"

# --- 2. 进入项目目录 ---
if [ ! -d "$PROJECT_DIR" ]; then
  echo "❌ 错误：项目目录不存在 $PROJECT_DIR"
  exit 1
fi
cd $PROJECT_DIR

# --- 3. 拉取代码 ---
echo "⬇️  正在拉取最新代码..."
git pull origin master

# --- 4. 重新建立软连接 (防止目录结构变化) ---
echo "🔗 正在链接数据目录..."
# -sfn: 强制更新符号链接
ln -sfn "$DATA_DIR/posts" ./public/posts
ln -sfn "$DATA_DIR/uploads" ./public/uploads
ln -sf "$DATA_DIR/config.json" ./public/config.json

# --- 5. 安装依赖 ---
echo "📦 正在安装依赖..."
# 加上 --no-audit 加快速度
npm install --production --registry=https://registry.npmmirror.com --no-audit

# --- 6. 重启服务 ---
echo "Hz  正在重启 PM2 服务..."
# 如果服务存在则 reload，不存在则 start
if pm2 list | grep -q "$APP_NAME"; then
    pm2 reload "$APP_NAME"
else
    pm2 start server.js --name "$APP_NAME"
fi

# 保存当前进程列表，防止重启服务器后丢失
pm2 save

echo "----------------------------------------------------"
echo "✅ 部署成功！"
echo "----------------------------------------------------"