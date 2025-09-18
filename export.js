// 导出模块 - 负责日志导出功能
class ExportManager {
    constructor(core) {
        this.core = core;
    }

    // 导出日志
    exportLogs() {
        this.exportContent(this.core.logs.map(log => log.content).join('\n'), 'logs.txt');
    }

    // 导出排查区日志
    exportInvestigation() {
        const content = this.core.investigationLogs.map(log => 
            `[${log.file}:${log.originalIndex + 1}] ${log.content}`
        ).join('\n');
        this.exportContent(content, 'investigation.txt');
    }

    // 导出内容到文件
    exportContent(content, filename) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        this.core.setStatus('导出完成');
    }
}

export default ExportManager;