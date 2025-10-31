// 导出模块 - 负责日志导出功能
class ExportManager {
    constructor(core) {
        this.core = core;
    }

    // 导出日志
    exportLogs() {
        // 如果有过滤结果，导出过滤后的日志；否则导出所有日志
        const logsToExport = this.core.filteredLogs || this.core.logs;
        const filename = this.core.filteredLogs ? 'xlogAssistFiltered.log' : 'xlogAssistSaved.log';
        this.exportContent(logsToExport.map(log => log.content).join('\n'), filename);
    }

    // 导出排查区日志
    exportInvestigation() {
        // 按照原始日志顺序排序
        const sortedLogs = [...this.core.investigationLogs].sort((a, b) => a.originalIndex - b.originalIndex);
        const content = sortedLogs.map(log =>
            `[${log.file}:${log.originalIndex + 1}] ${log.content}`
        ).join('\n');
        this.exportContent(content, 'investigation.log');
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