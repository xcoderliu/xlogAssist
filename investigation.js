// 排查区模块 - 负责排查日志管理
class Investigation {
    constructor(core) {
        this.core = core;
    }

    // 渲染排查区日志
    renderInvestigationLogs() {
        this.core.investigationContent.innerHTML = '';
        
        if (this.core.investigationLogs.length === 0) {
            this.core.investigationContent.innerHTML = `
                <div class="empty-state">
                    <p>暂无排查日志</p>
                    <p>右键日志行添加到排查区</p>
                </div>
            `;
            return;
        }

        // 按照原始日志顺序排序
        const sortedLogs = [...this.core.investigationLogs].sort((a, b) => a.originalIndex - b.originalIndex);
        
        sortedLogs.forEach((log, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'investigation-item';
            itemElement.dataset.index = log.originalIndex;
            itemElement.innerHTML = `
                <div style="font-size: 10px; color: #666; margin-bottom: 2px;">
                    ${log.file} - 行 ${log.originalIndex + 1}
                </div>
                <div>${this.core.applyRegexHighlighting ? this.core.applyRegexHighlighting(log.content) : log.content}</div>
            `;
            // 添加右键事件
            itemElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.core.showInvestigationContextMenu(e, log.originalIndex);
            });
            
            this.core.investigationContent.appendChild(itemElement);
        });
    }

    // 清空排查区
    clearInvestigation() {
        if (confirm('确定要清空排查区吗？')) {
            this.core.investigationLogs = [];
            this.renderInvestigationLogs();
            this.core.setStatus('排查区已清空');
        }
    }
}

export default Investigation;