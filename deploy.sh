#!/bin/bash

# === 配置区域 ===
# 项目根目录 (根据你的截图确认是这个)
PROJECT_DIR="/www/wwwroot/YOULAI_BLOG"
APP_NAME="youlai-blog"

# === 1. 自动寻找宝塔的 Node.js 环境 ===
echo "🔍 正在寻找 Node.js 环境..."

# 强制将宝塔常见的 node 路径加入 PATH
# 宝塔通常安装在 /www/server/nodejs/vXX.XX.XX/bin
if [ -d "/www/server/nodejs" ]; then
    # 找到版本号最大的那个 node 目录
    NODE_BIN=$(ls -d /www/server/nodejs/*/bin | sort -V | tail -n 1)
    if [ -n "$NODE_BIN" ]; then
        export PATH=$NODE_BIN:$PATH
        echo "✅ 找到 Node 路径: $NODE_BIN"
    else
        echo "⚠️ 未找到宝塔 Node 目录，尝试使用系统默认..."
    fi
fi

# 打印版本以验证
echo "Node版本: $(node -v)"
echo "NPM版本:  $(npm -v)"
echo "PM2版本:  $(pm2 -v)"

# === 2. 进入项目目录 ===
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ 目录不存在: $PROJECT_DIR"
    exit 1
fi
cd $PROJECT_DIR

# === 3. 拉取最新代码 ===
echo "⬇️ 拉取代码..."
git pull origin master

# === 4. 安装/更新依赖 ===
echo "📦 安装依赖..."
# 使用淘宝源加快速度
npm install --production --registry=https://registry.npmmirror.com

# === 5. 重启 PM2 服务 ===
echo "Hz 重启服务..."
# 检查进程是否存在
if pm2 list | grep -q "$APP_NAME"; then
    pm2 reload "$APP_NAME"
else
    echo "⚠️ 服务未运行，正在启动..."
    pm2 start server.js --name "$APP_NAME"
fi

# 保存 PM2 状态，确保服务器重启后自动运行
pm2 save

echo "✅ 部署完成！"