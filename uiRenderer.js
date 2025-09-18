// UI渲染模块 - 负责日志显示、高亮和样式处理
class UIRenderer {
    constructor(core) {
        this.core = core;
    }

    // 渲染日志内容
    renderLogs() {
        this.core.logContent.innerHTML = '';
        
        // 控制拖拽区域的显示
        const uploadSection = this.core.dropZone.closest('.upload-section');
        if (this.core.logs.length === 0) {
            this.core.dropZone.style.display = 'block';
            uploadSection.style.display = 'block';
        } else {
            this.core.dropZone.style.display = 'none';
            uploadSection.style.display = 'none';
        }
        
        // 获取要渲染的日志（应用过滤）
        const logsToRender = this.core.filteredLogs || this.core.logs;
        
        if (logsToRender.length === 0) {
            this.core.logContent.innerHTML = `
                <div class="empty-state">
                    <p>${this.core.filteredLogs ? '没有找到匹配的日志' : '暂无日志内容'}</p>
                    <p>${this.core.filteredLogs ? '请尝试其他过滤关键词' : '请上传日志文件开始分析'}</p>
                </div>
            `;
            return;
        }

        logsToRender.forEach((log, index) => {
            const lineElement = document.createElement('div');
            lineElement.className = 'log-line';
            lineElement.dataset.index = log.originalIndex;
            lineElement.innerHTML = this.applyRegexHighlighting(log.content);
            
            // 添加点击事件选中行
            lineElement.addEventListener('click', () => {
                this.core.selectLine(log.originalIndex);
            });
            
            lineElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.core.showContextMenu(e, log.originalIndex);
            });
            
            this.core.logContent.appendChild(lineElement);
        });
        
        // 如果正在搜索模式，重新高亮当前搜索结果
        if (this.core.isRealSearchMode && this.core.currentSearchIndex >= 0) {
            this.highlightCurrentSearchResult(this.core.currentSearchIndex);
        }
        
        // 更新选中行样式
        this.updateSelectedLine();
    }

    // 应用正则表达式高亮
    applyRegexHighlighting(text) {
        let highlightedText = this.escapeHtml(text);
        let shouldHighlightLine = false;
        let lineStyle = '';
        
        // 获取当前激活的配置组中的规则
        const activeRules = this.core.getActiveRules();
        
        activeRules.forEach(rule => {
            try {
                const regex = new RegExp(rule.pattern, 'gi');
                if (rule.highlightWholeLine && regex.test(text)) {
                    shouldHighlightLine = true;
                    lineStyle = `style="color: ${rule.color}; background: ${rule.bgColor}"`;
                } else if (!rule.highlightWholeLine) {
                    highlightedText = highlightedText.replace(regex,
                        `<span style="color: ${rule.color}; background: ${rule.bgColor}">$&</span>`
                    );
                }
            } catch (error) {
                console.warn('正则表达式错误:', rule.pattern, error);
            }
        });
        
        if (shouldHighlightLine) {
            return `<div ${lineStyle}>${highlightedText}</div>`;
        }
        
        return highlightedText;
    }

    // 高亮当前搜索结果
    highlightCurrentSearchResult(index) {
        // 清除之前的高亮
        this.core.logContent.querySelectorAll('.log-line .search-char-highlight').forEach(el => {
            // 只移除搜索高亮类，保留其他样式
            const parent = el.parentNode;
            const text = el.textContent;
            parent.replaceChild(document.createTextNode(text), el);
        });
        
        if (index >= 0 && index < this.core.searchResults.length) {
            const result = this.core.searchResults[index];
            const lineElement = this.core.logContent.querySelector(`[data-index="${result.log.originalIndex}"]`);
            if (lineElement) {
                // 获取原始内容（包含正则高亮）
                const originalContent = this.applyRegexHighlighting(result.log.content);
                
                // 创建临时元素来操作HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = originalContent;
                
                // 获取文本内容（不含HTML标签）
                const textContent = tempDiv.textContent || tempDiv.innerText || '';
                
                // 查找所有匹配位置
                let matchIndex = -1;
                const matches = [];
                let searchText = textContent.toLowerCase();
                
                while ((matchIndex = searchText.indexOf(this.core.searchTerm, matchIndex + 1)) !== -1) {
                    matches.push(matchIndex);
                }
                
                if (matches.length > 0) {
                    // 重新构建HTML，在所有匹配位置插入搜索高亮
                    let currentPos = 0;
                    let highlightedHtml = '';
                    
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
                                nodeHtml += this.escapeHtml(nodeText.substring(lastPos, localMatchIndex));
                                // 添加高亮的匹配文本
                                nodeHtml += `<span class="search-char-highlight">${this.escapeHtml(nodeText.substring(localMatchIndex, matchEnd))}</span>`;
                                lastPos = matchEnd;
                            });
                            
                            // 添加剩余的文本
                            nodeHtml += this.escapeHtml(nodeText.substring(lastPos));
                            
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
                    
                    lineElement.innerHTML = tempDiv.innerHTML;
                } else {
                    lineElement.innerHTML = originalContent;
                }
                
                // 选中当前搜索结果所在的行
                this.core.selectLine(result.log.originalIndex);
                lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    // 更新选中行样式
    updateSelectedLine() {
        // 清除之前的选中样式
        this.core.logContent.querySelectorAll('.log-line.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        // 应用新的选中样式
        if (this.core.selectedLineIndex >= 0) {
            const lineElement = this.core.logContent.querySelector(`[data-index="${this.core.selectedLineIndex}"]`);
            if (lineElement) {
                lineElement.classList.add('selected');
            }
        }
    }

    // 更新日志计数
    updateLogCount() {
        this.core.logCount.textContent = `${this.core.logs.length} 行`;
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export default UIRenderer;