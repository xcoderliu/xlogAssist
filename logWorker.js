// 日志处理Worker - 在后台线程中处理大文件

self.addEventListener('message', async (e) => {
    const { type, file, content, filename } = e.data;

    switch (type) {
        case 'PROCESS_FILE':
            try {
                // 如果直接传递了内容（针对小文件或已读取内容）
                if (content) {
                    processContent(content, filename);
                }
                // 如果传递了文件对象（针对大文件）
                else if (file) {
                    await readFileAndProcess(file);
                }
            } catch (error) {
                self.postMessage({ type: 'ERROR', error: error.message });
            }
            break;
    }
});

// 读取并处理文件
async function readFileAndProcess(file) {
    const reader = new FileReader();

    // 分块读取配置
    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB per chunk
    let offset = 0;
    let partialLine = '';
    let totalSize = file.size;

    // 报告开始处理
    self.postMessage({ type: 'START', totalSize });

    while (offset < totalSize) {
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const text = await readSlice(slice);

        // 处理文本，处理跨Chunk的行
        const fullText = partialLine + text;
        const lastNewlineIndex = fullText.lastIndexOf('\n');

        let chunkContent;
        if (lastNewlineIndex !== -1 && offset + CHUNK_SIZE < totalSize) {
            // 如果不是最后一块，且包含换行符
            chunkContent = fullText.substring(0, lastNewlineIndex);
            partialLine = fullText.substring(lastNewlineIndex + 1);
        } else {
            // 最后一块，或者不包含换行符（极长的一行？）
            chunkContent = fullText;
            partialLine = '';
        }

        // 解析当前块的日志
        const logs = parseLogs(chunkContent, file.name, offset);

        // 发送处理进度和数据
        offset += slice.size;
        const progress = Math.min(100, Math.round((offset / totalSize) * 100));

        self.postMessage({
            type: 'CHUNK',
            logs: logs,
            progress: progress,
            isLast: offset >= totalSize
        });

        // 让出主线程一小会儿（虽然Worker本身就是独立的，但为了不卡Worker的消息队列）
        await new Promise(resolve => setTimeout(resolve, 0));
    }
}

function readSlice(slice) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Read failed'));
        reader.readAsText(slice);
    });
}

function processContent(content, filename) {
    const logs = parseLogs(content, filename, 0);
    self.postMessage({
        type: 'CHUNK',
        logs: logs,
        progress: 100,
        isLast: true
    });
}

function parseLogs(content, filename, baseIndex) {
    if (!content) return [];

    // 简单的按行分割
    const lines = content.split('\n');
    // 注意：这里过滤空行可能会导致索引与原始文件行号不一致
    // 如果需要精确对应行号，建议保留空行但标记为空，或者前端处理时注意
    // 这里为了保持与原有逻辑一致，暂时先保留空行，但在前端渲染时可能被忽略

    return lines.map((line) => ({
        content: line,
        // 这里不设置 originalIndex，由主线程根据总长度累计
        // 或者 Worker 维护一个计数器
        file: filename,
        timestamp: new Date().toISOString()
    }));
}
