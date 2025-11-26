const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // 提供静态文件服务

// 代理中间件 - 解决CORS问题
app.get('/api/proxy', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({ error: '缺少URL参数' });
        }

        // 验证URL格式
        let targetUrl;
        try {
            targetUrl = new URL(url);
        } catch {
            return res.status(400).json({ error: '无效的URL格式' });
        }

        // 只允许HTTP/HTTPS协议
        if (!['http:', 'https:'].includes(targetUrl.protocol)) {
            return res.status(400).json({ error: '只支持HTTP/HTTPS协议' });
        }

        const response = await fetch(targetUrl.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'xlogAssist/1.0.0'
            },
            timeout: 10000
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            res.json(data);
        } else {
            const text = await response.text();
            res.send(text);
        }

    } catch (error) {
        console.error('代理请求失败:', error);
        res.status(500).json({
            error: '代理请求失败',
            message: error.message
        });
    }
});

// 配置multer用于文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // 生成唯一文件名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB限制
    },
    fileFilter: function (req, file, cb) {
        // 只允许文本文件
        const allowedTypes = [
            'text/plain',
            'application/json',
            'text/x-log',
            'text/x-shellscript',
            'application/octet-stream'  // 添加通用二进制流类型，macOS上的.log文件可能被识别为此类型
        ];
        
        // 检查文件扩展名
        const allowedExtensions = ['.log', '.txt', '.json'];
        const fileExtension = file.originalname.toLowerCase();
        
        if (allowedTypes.includes(file.mimetype) ||
            allowedExtensions.some(ext => fileExtension.endsWith(ext))) {
            cb(null, true);
        } else {
            cb(new Error('只支持文本文件格式 (.log, .txt, .json)'));
        }
    }
});

// 路由定义

// 首页
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// 文件上传接口
app.post('/api/upload', upload.single('logFile'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '没有上传文件' });
        }

        // 读取上传的文件内容
        const filePath = req.file.path;
        const fileContent = fs.readFileSync(filePath, 'utf8');
        
        // 解析日志内容
        const logs = parseLogContent(fileContent, req.file.originalname);
        
        // 清理上传的文件
        fs.unlinkSync(filePath);

        res.json({
            success: true,
            filename: req.file.originalname,
            logs: logs,
            totalLines: logs.length
        });

    } catch (error) {
        console.error('文件处理错误:', error);
        res.status(500).json({ error: '文件处理失败: ' + error.message });
    }
});

// 批量文件上传接口
app.post('/api/upload-multiple', upload.array('logFiles', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: '没有上传文件' });
        }

        const results = [];
        
        req.files.forEach(file => {
            try {
                const filePath = file.path;
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const logs = parseLogContent(fileContent, file.originalname);
                
                results.push({
                    filename: file.originalname,
                    logs: logs,
                    totalLines: logs.length,
                    success: true
                });
                
                // 清理上传的文件
                fs.unlinkSync(filePath);
            } catch (fileError) {
                results.push({
                    filename: file.originalname,
                    success: false,
                    error: fileError.message
                });
            }
        });

        res.json({
            success: true,
            results: results
        });

    } catch (error) {
        console.error('批量文件处理错误:', error);
        res.status(500).json({ error: '批量文件处理失败: ' + error.message });
    }
});

// 日志分析接口
app.post('/api/analyze', (req, res) => {
    try {
        const { content, rules } = req.body;
        
        if (!content) {
            return res.status(400).json({ error: '缺少日志内容' });
        }

        const logs = parseLogContent(content, 'direct-input');
        const analyzedLogs = applyRegexRules(logs, rules || []);

        res.json({
            success: true,
            logs: analyzedLogs,
            totalLines: analyzedLogs.length
        });

    } catch (error) {
        console.error('日志分析错误:', error);
        res.status(500).json({ error: '日志分析失败: ' + error.message });
    }
});

// 导出接口
app.post('/api/export', (req, res) => {
    try {
        const { logs, filename = 'xlogAssistSaved.log' } = req.body;
        
        if (!logs || !Array.isArray(logs)) {
            return res.status(400).json({ error: '无效的日志数据' });
        }

        const content = logs.map(log => 
            typeof log === 'object' ? log.content : log
        ).join('\n');

        // 设置响应头
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'text/plain');
        
        res.send(content);

    } catch (error) {
        console.error('导出错误:', error);
        res.status(500).json({ error: '导出失败: ' + error.message });
    }
});

// 工具函数


// 解析日志内容
function parseLogContent(content, filename) {
    const lines = content.split('\n')
        .filter(line => line.trim())
        .map((line, index) => ({
            content: line.trim(),
            lineNumber: index + 1,
            filename: filename,
            timestamp: new Date().toISOString(),
            originalIndex: index
        }));
    
    return lines;
}

// 应用正则规则
function applyRegexRules(logs, rules) {
    return logs.map(log => {
        let highlightedContent = escapeHtml(log.content);
        
        rules.forEach(rule => {
            try {
                const regex = new RegExp(rule.pattern, 'gi');
                highlightedContent = highlightedContent.replace(regex, 
                    `<span style="color: ${rule.color}; background: ${rule.bgColor}">$&</span>`
                );
            } catch (error) {
                console.warn('正则表达式错误:', rule.pattern, error);
            }
        });
        
        return {
            ...log,
            highlightedContent: highlightedContent
        };
    });
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 错误处理中间件
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: '文件大小超过限制 (10MB)' });
        }
    }
    res.status(500).json({ error: error.message });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({ error: '接口不存在' });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 xlogAssist 服务器启动成功`);
    console.log(`📍 本地访问: http://localhost:${PORT}`);
    console.log(`📁 静态文件服务已启用`);
    console.log(`📤 文件上传目录: ./uploads/`);
    console.log(`⚡ 服务器运行中...`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭服务器...');
    process.exit(0);
});

module.exports = app;