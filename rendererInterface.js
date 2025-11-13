// 渲染器接口定义 - 统一传统渲染器和Monaco渲染器的行为
class RendererInterface {
    constructor(core) {
        if (new.target === RendererInterface) {
            throw new Error('RendererInterface 是抽象类，不能直接实例化');
        }
        this.core = core;
    }

    // 必须实现的方法
    async renderLogs() {
        throw new Error('renderLogs 方法必须被子类实现');
    }

    // 必须实现的方法 - 高亮当前搜索结果
    highlightCurrentSearchResult(index) {
        throw new Error('highlightCurrentSearchResult 方法必须被子类实现');
    }

    // 必须实现的方法 - 更新选中行样式
    updateSelectedLine() {
        throw new Error('updateSelectedLine 方法必须被子类实现');
    }

    // 必须实现的方法 - 更新日志计数
    updateLogCount() {
        throw new Error('updateLogCount 方法必须被子类实现');
    }

    // 必须实现的方法 - 应用正则高亮
    applyRegexHighlighting() {
        throw new Error('applyRegexHighlighting 方法必须被子类实现');
    }

    // 必须实现的方法 - 应用搜索高亮
    applySearchHighlighting() {
        throw new Error('applySearchHighlighting 方法必须被子类实现');
    }

    // 必须实现的方法 - 应用配置组过滤
    applyGroupFiltering(logs) {
        throw new Error('applyGroupFiltering 方法必须被子类实现');
    }

    // 必须实现的方法 - 滚动到指定行
    scrollToLine(lineIndex) {
        throw new Error('scrollToLine 方法必须被子类实现');
    }

    // 必须实现的方法 - 获取行元素
    getLineElement(lineIndex) {
        throw new Error('getLineElement 方法必须被子类实现');
    }

    // 必须实现的方法 - 显示右键菜单
    showContextMenu(event, lineIndex) {
        throw new Error('showContextMenu 方法必须被子类实现');
    }

    // 必须实现的方法 - 添加行点击事件
    addLineClickHandler(lineIndex, handler) {
        throw new Error('addLineClickHandler 方法必须被子类实现');
    }

    // 必须实现的方法 - 添加行右键菜单事件
    addLineContextMenuHandler(lineIndex, handler) {
        throw new Error('addLineContextMenuHandler 方法必须被子类实现');
    }

    // 可选方法 - 清理资源
    dispose() {
        // 默认实现为空，子类可以重写
    }

    // 可选方法 - 刷新高亮
    refreshHighlighting() {
        // 默认实现为空，子类可以重写
    }

    // 工具方法 - 转义正则表达式特殊字符
    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // 工具方法 - HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 工具方法 - 获取激活的规则
    getActiveRules() {
        return this.core.getActiveRules();
    }

    // 工具方法 - 获取要渲染的日志
    getLogsToRender() {
        let logsToRender = this.core.filteredLogs || this.core.logs;
        
        // 应用配置组过滤
        if (this.core.filterGroups.size > 0) {
            logsToRender = this.applyGroupFiltering(logsToRender);
        }
        
        return logsToRender;
    }

    // 工具方法 - 控制拖拽区域显示
    controlUploadSection() {
        const uploadSection = this.core.dropZone.closest('.upload-section');
        if (this.core.logs.length === 0) {
            this.core.dropZone.style.display = 'block';
            uploadSection.style.display = 'block';
        } else {
            this.core.dropZone.style.display = 'none';
            uploadSection.style.display = 'none';
        }
    }

    // 工具方法 - 显示空状态
    showEmptyState(isFiltered = false) {
        const hasLastLogs = this.core.loadLastLogs && this.core.loadLastLogs().length > 0;
        
        let emptyContent = `
            <div class="empty-state">
                <p>${isFiltered ? '没有找到匹配的日志' : '暂无日志内容'}</p>
                <p>${isFiltered ? '请尝试其他过滤关键词' : '请上传日志文件开始分析'}</p>
        `;
        
        // 如果没有过滤且没有日志，显示快速打开按钮
        if (!isFiltered && hasLastLogs) {
            emptyContent += `
                <div style="margin-top: 16px;">
                    <button id="quickOpenLastLogs" class="btn" style="background: #34a853;">
                        快速打开上次日志
                    </button>
                </div>
            `;
        }
        
        emptyContent += `</div>`;
        
        return emptyContent;
    }

    // 工具方法 - 绑定快速打开按钮事件
    bindQuickOpenButton() {
        const quickOpenBtn = document.getElementById('quickOpenLastLogs');
        if (quickOpenBtn && this.core.quickOpenLastLogs) {
            quickOpenBtn.addEventListener('click', () => {
                this.core.quickOpenLastLogs();
            });
        }
    }
}

export default RendererInterface;