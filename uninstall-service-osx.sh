#!/bin/bash

# xlogAssist 服务卸载脚本
# 用于在macOS上移除开机自动启动

echo "🗑️ 卸载 xlogAssist 开机启动服务..."

# 检查当前用户
CURRENT_USER=$(whoami)
echo "当前用户: $CURRENT_USER"

# LaunchAgents目录路径
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_FILE="$LAUNCH_AGENTS_DIR/com.xlogassist.plist"

# 停止服务
echo "🛑 停止服务..."
launchctl stop com.xlogassist 2>/dev/null || true

# 卸载服务
echo "📤 卸载服务配置..."
launchctl unload "$PLIST_FILE" 2>/dev/null || true

# 删除plist文件
if [ -f "$PLIST_FILE" ]; then
    echo "🗑️ 删除配置文件: $PLIST_FILE"
    rm "$PLIST_FILE"
else
    echo "ℹ️ 配置文件不存在: $PLIST_FILE"
fi

# 清理日志文件
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/xlogassist.log"
ERROR_LOG="$SCRIPT_DIR/xlogassist-error.log"

if [ -f "$LOG_FILE" ]; then
    echo "🗑️ 删除日志文件: $LOG_FILE"
    rm "$LOG_FILE"
fi

if [ -f "$ERROR_LOG" ]; then
    echo "🗑️ 删除错误日志: $ERROR_LOG"
    rm "$ERROR_LOG"
fi

echo "✅ xlogAssist 开机启动服务已完全卸载!"
echo ""
echo "💡 提示: 如果需要重新安装，请运行 ./install-service-osx.sh"
