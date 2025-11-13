// UI渲染模块 - 负责日志显示、高亮和样式处理
import RendererInterface from './rendererInterface.js';

class UIRenderer extends RendererInterface {
    constructor(core) {
        super(core);
        this._regexCache = new Map();
        this._partialRegexCache = new Map();
    }

    // 渲染日志内容
    async renderLogs() {
        // 显示loading状态
        this.showLoading('渲染日志中...');
        
        // 添加延迟确保loading能够显示出来
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
            this.core.logContent.innerHTML = '';
            
            // 控制拖拽区域的显示
            this.controlUploadSection();
            
            // 获取要渲染的日志
            let logsToRender = this.getLogsToRender();
            
            if (logsToRender.length === 0) {
                const isFiltered = !!this.core.filteredLogs;
                this.core.logContent.innerHTML = this.showEmptyState(isFiltered);
                this.bindQuickOpenButton();
                this.hideLoading();
                return;
            }

            // 分批渲染日志，避免阻塞UI
            const batchSize = 100; // 每批渲染100条日志
            for (let i = 0; i < logsToRender.length; i += batchSize) {
                const batch = logsToRender.slice(i, i + batchSize);
                
                // 渲染当前批次
                batch.forEach((log, index) => {
                    const lineElement = document.createElement('div');
                    lineElement.className = 'log-line';
                    lineElement.dataset.index = log.originalIndex;
                    
                    // 应用正则高亮和搜索高亮
                    let content = this.applyRegexHighlighting(log.content);
                    
                    // 如果是搜索模式，应用搜索高亮
                    if (this.core.isRealSearchMode && this.core.searchTerm) {
                        content = this.applySearchHighlightingToContent(content, log.content);
                    }
                    
                    lineElement.innerHTML = content;
                    
                    // 添加点击事件选中行
                    this.addLineClickHandler(log.originalIndex, () => {
                        this.core.selectLine(log.originalIndex);
                    });
                    
                    // 添加右键菜单事件
                    this.addLineContextMenuHandler(log.originalIndex, (e) => {
                        e.preventDefault();
                        this.showContextMenu(e, log.originalIndex);
                    });
                    
                    this.core.logContent.appendChild(lineElement);
                });
                
                // 每渲染完一批，让出控制权给浏览器
                if (i + batchSize < logsToRender.length) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
            
            // 如果正在搜索模式，重新高亮当前搜索结果并选中对应行
            if (this.core.isRealSearchMode && this.core.currentSearchIndex >= 0) {
                this.highlightCurrentSearchResult(this.core.currentSearchIndex);
            }
            
            // 更新选中行样式
            this.updateSelectedLine();
        } finally {
            // 确保loading总是被隐藏
            this.hideLoading();
        }
    }
    
    // 显示loading状态
    showLoading(text = '处理中...') {
        if (!this.core.logContent) return;
        
        // 先清除可能存在的loading
        this.hideLoading();
        
        // 创建loading覆盖层
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div style="text-align: center;">
                <div class="loading-spinner"></div>
                <div class="loading-text">${text}</div>
            </div>
        `;
        
        this.core.logContent.appendChild(loadingOverlay);
        this.core.logContent.classList.add('loading');
    }
    
    // 隐藏loading状态
    hideLoading() {
        if (!this.core.logContent) return;
        
        const loadingOverlay = this.core.logContent.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
        this.core.logContent.classList.remove('loading');
    }

    // 应用正则表达式高亮 - 优化性能版本
    applyRegexHighlighting(text) {
        let highlightedText = this.escapeHtml(text);
        
        // 获取当前激活的配置组中的规则
        const activeRules = this.getActiveRules();
        
        // 如果没有激活的规则，直接返回
        if (activeRules.length === 0) {
            return highlightedText;
        }
        
        // 检查整行高亮规则
        let shouldHighlightLine = false;
        let lineStyle = '';
        
        for (const rule of activeRules) {
            if (rule.highlightWholeLine) {
                try {
                    let regex = this._regexCache.get(rule.pattern);
                    if (!regex) {
                        regex = new RegExp(rule.pattern, 'gi');
                        this._regexCache.set(rule.pattern, regex);
                    }
                    if (regex.test(text)) {
                        shouldHighlightLine = true;
                        lineStyle = `style="color: ${rule.color}; background: ${rule.bgColor}"`;
                        break;
                    }
                } catch (error) {
                    console.warn('正则表达式错误:', rule.pattern, error);
                }
            }
        }
        
        // 如果不需要整行高亮，应用部分高亮
        if (!shouldHighlightLine) {
            // 使用更高效的部分高亮方法
            const nonWholeLineRules = activeRules.filter(rule => !rule.highlightWholeLine);
            if (nonWholeLineRules.length > 0) {
                highlightedText = this.applyPartialHighlighting(highlightedText, text, nonWholeLineRules);
            }
        }
        
        if (shouldHighlightLine) {
            return `<div ${lineStyle}>${highlightedText}</div>`;
        }
        
        return highlightedText;
    }

    // 高亮当前搜索结果
    highlightCurrentSearchResult(index) {
        // 只对当前搜索结果所在的行应用搜索高亮，而不是所有行
        if (index >= 0 && index < this.core.searchResults.length) {
            const result = this.core.searchResults[index];
            const lineElement = this.getLineElement(result.log.originalIndex);
            
            if (lineElement) {
                // 获取原始内容（包含正则高亮）
                const originalContent = this.applyRegexHighlighting(result.log.content);
                
                // 应用搜索高亮
                const highlightedContent = this.applySearchHighlightingToContent(originalContent, result.log.content);
                lineElement.innerHTML = highlightedContent;
                
                // 选中并滚动到当前行
                this.core.selectLine(result.log.originalIndex);
                this.scrollToLine(result.log.originalIndex);
            }
        }
    }

    // 更新选中行样式
    updateSelectedLine() {
        // 清除之前的选中样式
        this.core.logContent.querySelectorAll('.log-line.selected').forEach(el => {
            el.classList.remove('selected');
            el.style.background = ''; // 清除动态背景色
        });
        
        // 应用新的选中样式
        if (this.core.selectedLineIndex >= 0) {
            const lineElement = this.getLineElement(this.core.selectedLineIndex);
            if (lineElement) {
                lineElement.classList.add('selected');
                // 动态设置背景色以确保覆盖整个宽度
                lineElement.style.background = '#e8f0fe';
            }
        }
    }

    // 更新日志计数
    updateLogCount() {
        this.core.logCount.textContent = `${this.core.logs.length} 行`;
    }

    // 应用搜索高亮
    applySearchHighlighting() {
        // 传统渲染器在renderLogs中已经处理了搜索高亮
        // 这个方法主要用于接口兼容性
    }

    // 应用配置组过滤
    applyGroupFiltering(logs) {
        // 获取启用过滤的配置组中的规则
        const filterRuleIds = new Set();
        this.core.configGroups.forEach(group => {
            if (this.core.filterGroups.has(group.id)) {
                group.ruleIds.forEach(ruleId => filterRuleIds.add(ruleId));
            }
        });

        // 如果没有启用过滤的规则，返回所有日志
        if (filterRuleIds.size === 0) {
            return logs;
        }

        // 获取对应的规则对象
        const filterRules = this.core.regexRules.filter(rule =>
            filterRuleIds.has(this.core.getRuleId(rule))
        );

        // 过滤日志：只显示匹配任意过滤规则的日志
        return logs.filter(log => {
            return filterRules.some(rule => {
                try {
                    const regex = new RegExp(rule.pattern, 'gi');
                    return regex.test(log.content);
                } catch (error) {
                    console.warn('正则表达式错误:', rule.pattern, error);
                    return false;
                }
            });
        });
    }

    // 滚动到指定行
    scrollToLine(lineIndex) {
        const lineElement = this.getLineElement(lineIndex);
        if (lineElement) {
            lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // 获取行元素
    getLineElement(lineIndex) {
        return this.core.logContent.querySelector(`[data-index="${lineIndex}"]`);
    }

    // 显示右键菜单
    showContextMenu(event, lineIndex) {
        this.core.showContextMenu(event, lineIndex);
    }

    // 添加行点击事件
    addLineClickHandler(lineIndex, handler) {
        const lineElement = this.getLineElement(lineIndex);
        if (lineElement) {
            lineElement.addEventListener('click', handler);
        }
    }

    // 添加行右键菜单事件
    addLineContextMenuHandler(lineIndex, handler) {
        const lineElement = this.getLineElement(lineIndex);
        if (lineElement) {
            lineElement.addEventListener('contextmenu', handler);
        }
    }

    // 对内容应用搜索高亮 - 使用更简单高效的方法
    applySearchHighlightingToContent(htmlContent, originalText) {
        // 如果htmlContent已经是纯文本（没有HTML标签），直接处理
        if (htmlContent === this.escapeHtml(htmlContent)) {
            // 直接使用字符串替换，性能更好
            const searchTerm = this.core.searchTerm;
            const regex = new RegExp(this.escapeRegex(searchTerm), 'gi');
            return htmlContent.replace(regex, '<span class="search-char-highlight">$&</span>');
        }
        
        // 对于包含HTML的内容，使用更简单的方法
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // 使用更简单的高亮方法：遍历所有文本节点
        const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
        let node;
        
        while ((node = walker.nextNode())) {
            const nodeText = node.textContent;
            const searchTerm = this.core.searchTerm;
            const regex = new RegExp(this.escapeRegex(searchTerm), 'gi');
            
            if (regex.test(nodeText)) {
                const parent = node.parentNode;
                const temp = document.createElement('div');
                temp.innerHTML = nodeText.replace(regex, '<span class="search-char-highlight">$&</span>');
                
                while (temp.firstChild) {
                    parent.insertBefore(temp.firstChild, node);
                }
                parent.removeChild(node);
            }
        }
        
        return tempDiv.innerHTML;
    }

    // 应用部分高亮 - 优化性能版本
    applyPartialHighlighting(htmlText, originalText, rules) {
        let result = htmlText;
        
        // 对每个规则应用高亮
        for (const rule of rules) {
            try {
                let regex = this._partialRegexCache.get(rule.pattern);
                if (!regex) {
                    regex = new RegExp(rule.pattern, 'gi');
                    this._partialRegexCache.set(rule.pattern, regex);
                }
                
                const replacement = `<span style="color: ${rule.color}; background: ${rule.bgColor}">$&</span>`;
                result = result.replace(regex, replacement);
            } catch (error) {
                console.warn('正则表达式错误:', rule.pattern, error);
            }
        }
        
        return result;
    }
}

export default UIRenderer;