// 排查区模块 - 负责排查日志管理
class Investigation {
    constructor(core) {
        this.core = core;
    }

    // 渲染排查区日志
    renderInvestigationLogs() {
        const investigationContent = document.getElementById('investigationContent');
        if (!investigationContent) return;
        
        investigationContent.innerHTML = '';
        
        if (this.core.investigationLogs.length === 0) {
            investigationContent.innerHTML = `
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
                <div>${this.applySearchHighlighting(log.content)}</div>
            `;
            
            // 添加点击事件 - 跳转到原日志行
            itemElement.addEventListener('click', () => {
                this.core.selectLine(log.originalIndex);
                // 滚动到选中行 - 兼容Monaco和传统渲染器
                if (this.core.scrollToLine) {
                    this.core.scrollToLine(log.originalIndex);
                } else {
                    // 传统渲染器的滚动方式
                    const lineElement = this.core.logContent.querySelector(`[data-index="${log.originalIndex}"]`);
                    if (lineElement) {
                        lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            });
            
            // 添加右键事件
            itemElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.core.showInvestigationContextMenu(e, log.originalIndex);
            });
            
            investigationContent.appendChild(itemElement);
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

    // 应用搜索高亮
    applySearchHighlighting(text) {
        let highlightedText = this.core.applyRegexHighlighting ? this.core.applyRegexHighlighting(text) : text;
        
        // 如果有搜索关键词，应用搜索高亮
        if (this.core.searchTerm && this.core.isRealSearchMode) {
            // 使用DOM操作来确保只高亮纯文本部分，不破坏已有的HTML结构
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = highlightedText;
            
            // 获取纯文本内容用于搜索匹配
            const textContent = tempDiv.textContent || tempDiv.innerText || '';
            
            // 查找所有匹配位置
            let matchIndex = -1;
            const matches = [];
            let searchText = textContent.toLowerCase();
            
            while ((matchIndex = searchText.indexOf(this.core.searchTerm, matchIndex + 1)) !== -1) {
                matches.push(matchIndex);
            }
            
            if (matches.length > 0) {
                // 使用DOM遍历来正确处理HTML结构
                const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
                let node;
                let offset = 0;
                
                while ((node = walker.nextNode())) {
                    const nodeText = node.textContent;
                    const nodeLength = nodeText.length;
                    
                    // 查找在当前文本节点内的所有匹配
                    const nodeMatches = matches.filter(match =>
                        match >= offset && match < offset + nodeLength
                    );
                    
                    if (nodeMatches.length > 0) {
                        let nodeHtml = '';
                        let lastPos = 0;
                        
                        nodeMatches.forEach(matchPos => {
                            const localMatchIndex = matchPos - offset;
                            const matchEnd = localMatchIndex + this.core.searchTerm.length;
                            
                            // 添加匹配前的文本
                            nodeHtml += this.core.escapeHtml ? this.core.escapeHtml(nodeText.substring(lastPos, localMatchIndex)) : nodeText.substring(lastPos, localMatchIndex);
                            // 添加高亮的匹配文本
                            nodeHtml += `<span class="search-char-highlight">${this.core.escapeHtml ? this.core.escapeHtml(nodeText.substring(localMatchIndex, matchEnd)) : nodeText.substring(localMatchIndex, matchEnd)}</span>`;
                            lastPos = matchEnd;
                        });
                        
                        // 添加剩余的文本
                        nodeHtml += this.core.escapeHtml ? this.core.escapeHtml(nodeText.substring(lastPos)) : nodeText.substring(lastPos);
                        
                        // 替换当前节点的HTML
                        const parent = node.parentNode;
                        const temp = document.createElement('div');
                        temp.innerHTML = nodeHtml;
                        
                        while (temp.firstChild) {
                            parent.insertBefore(temp.firstChild, node);
                        }
                        parent.removeChild(node);
                    }
                    
                    offset += nodeLength;
                }
                
                highlightedText = tempDiv.innerHTML;
            }
        }
        
        return highlightedText;
    }
}

export default Investigation;