#!/bin/bash

# xlogAssist 服务安装脚本
# 用于在macOS上设置开机自动启动

echo "🔧 安装 xlogAssist 开机启动服务..."

# 检查当前用户
CURRENT_USER=$(whoami)
echo "当前用户: $CURRENT_USER"

# 检查脚本路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "项目目录: $SCRIPT_DIR"

# 创建临时plist文件，动态设置路径
TEMP_PLIST="$SCRIPT_DIR/com.xlogassist.temp.plist"

# 使用项目实际路径创建plist内容
cat > "$TEMP_PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.xlogassist</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>$SCRIPT_DIR/server.js</string>
    </array>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    
    <key>StandardOutPath</key>
    <string>$SCRIPT_DIR/xlogassist.log</string>
    
    <key>StandardErrorPath</key>
    <string>$SCRIPT_DIR/xlogassist-error.log</string>
    
    <key>WorkingDirectory</key>
    <string>$SCRIPT_DIR</string>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
        <key>NODE_ENV</key>
        <string>production</string>
    </dict>
</dict>
</plist>
EOF


# 复制plist文件到LaunchAgents目录
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_DEST="$LAUNCH_AGENTS_DIR/com.xlogassist.plist"

echo "📁 复制配置文件到: $PLIST_DEST"
cp "$TEMP_PLIST" "$PLIST_DEST"

# 清理临时文件
rm "$TEMP_PLIST"

# 加载服务
echo "🔄 加载启动服务..."
launchctl load "$PLIST_DEST"

# 立即启动服务（可选）
echo "🚀 立即启动服务..."
launchctl start com.xlogassist

echo "✅ xlogAssist 开机启动服务安装完成!"
echo ""
echo "📋 服务管理命令:"
echo "   启动服务: launchctl start com.xlogassist"
echo "   停止服务: launchctl stop com.xlogassist"
echo "   重启服务: launchctl unload $PLIST_DEST && launchctl load $PLIST_DEST"
echo "   查看状态: launchctl list | grep xlogassist"
echo ""
echo "📝 日志文件位置:"
echo "   标准输出: $SCRIPT_DIR/xlogassist.log"
echo "   错误日志: $SCRIPT_DIR/xlogassist-error.log"
