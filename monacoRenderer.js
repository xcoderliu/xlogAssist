// 日志渲染模块 - 基于Monaco Editor的高性能日志渲染
import RendererInterface from './rendererInterface.js';

class MonacoRenderer extends RendererInterface {
    constructor(core) {
        super(core);
        this.editor = null;
        this.isInitialized = false;
        this.logsText = '';
        this.currentDecorations = []; // 当前装饰器
        this.searchDecorations = []; // 搜索装饰器
    }

    // 初始化Monaco Editor
    async initialize() {
        if (this.isInitialized) return;

        try {
            // 配置Monaco Editor路径
            require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });

            // 加载Monaco Editor
            await new Promise((resolve, reject) => {
                require(['vs/editor/editor.main'], resolve, reject);
            });

            // 创建编辑器实例
            const container = document.getElementById('monacoEditor');
            if (!container) {
                console.warn('Monaco Editor容器未找到');
                return;
            }

            this.editor = monaco.editor.create(container, {
                value: '',
                language: 'plaintext',
                theme: 'vs', // 使用浅色主题
                readOnly: true,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                lineNumbers: 'on',
                folding: false,
                minimap: { enabled: false },
                automaticLayout: true,
                fontSize: 13, // 与原有系统保持一致
                lineHeight: 18,
                fontFamily: "'Roboto Mono', 'Monaco', 'Menlo', monospace", // 与原有字体一致
                renderLineHighlight: 'none',
                scrollbar: {
                    vertical: 'visible',
                    horizontal: 'visible',
                    useShadows: false
                },
                // 禁用不必要的功能
                contextmenu: false,
                quickSuggestions: false,
                suggestOnTriggerCharacters: false,
                parameterHints: { enabled: false },
                occurrencesHighlight: false,
                selectionHighlight: false
            });

            this.isInitialized = true;

            // 绑定编辑器事件
            this.bindEditorEvents();

        } catch (error) {
            this.useMonaco = false;
        }
    }

    // 绑定编辑器事件
    bindEditorEvents() {
        if (!this.editor) return;

        // 点击行选择事件
        this.editor.onMouseDown((e) => {
            if (e.target && e.target.position) {
                const lineNumber = e.target.position.lineNumber;
                this.core.selectLine(lineNumber - 1); // Monaco行号从1开始
            }
        });

        // 右键菜单事件
        this.editor.onContextMenu((e) => {
            e.event.preventDefault();
            const position = this.editor.getPosition();
            if (position) {
                const lineIndex = position.lineNumber - 1;
                // 确保日志索引正确
                if (lineIndex >= 0 && lineIndex < this.core.logs.length) {
                    this.showContextMenu(e.event, lineIndex);
                }
            }
        });

        // 监听配置变化，重新应用高亮
        this.editor.onDidChangeConfiguration(() => {
            this.applyRegexHighlighting();
        });
    }

    // 渲染日志到Monaco Editor
    async renderLogs() {
        // 确保Monaco已初始化
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.editor) {
            console.error('Monaco Editor初始化失败');
            return;
        }

        try {
            // 显示Monaco容器，隐藏传统容器
            this.showMonacoContainer();

            // 控制拖拽区域的显示 - 与原有系统保持一致
            this.controlUploadSection();

            // 获取要渲染的日志（包括过滤后的日志）
            let logsToRender = this.getLogsToRender();

            if (logsToRender.length === 0) {
                this.editor.setValue('');
                this.updateEmptyState();
                return;
            }

            // 将日志转换为文本
            const logsText = logsToRender.map(log => log.content).join('\n');

            // 设置编辑器内容
            this.editor.setValue(logsText);

            // 更新日志计数
            this.updateLogCount();

            // 强制重新加载配置，确保高亮规则是最新的
            this.core.loadConfig();

            // 应用正则高亮（捕获错误，不影响日志显示）
            try {
                await this.applyRegexHighlighting();
            } catch (error) {
                console.warn('正则高亮失败，但不影响日志显示:', error);
            }

            // 应用搜索高亮（后应用，覆盖正则高亮，优先级更高）
            if (this.core.isRealSearchMode && this.core.searchTerm) {
                try {
                    this.applySearchHighlighting();
                } catch (error) {
                    console.warn('搜索高亮失败:', error);
                }
            }

            // 更新选中行
            this.updateSelectedLine();

            // 如果正在搜索模式，滚动到当前搜索结果
            if (this.core.isRealSearchMode && this.core.currentSearchIndex >= 0) {
                try {
                    this.highlightCurrentSearchResult();
                } catch (error) {
                    console.warn('搜索结果高亮失败:', error);
                }
            }

        } catch (error) {
            console.error('Monaco渲染失败:', error);
        }
    }

    // 强制刷新高亮（供外部调用）
    refreshHighlighting() {
        if (this.editor && this.isInitialized) {
            this.applyRegexHighlighting();
        }
    }


    // 显示Monaco容器
    showMonacoContainer() {
        const monacoContainer = document.getElementById('monacoEditorContainer');
        if (monacoContainer) {
            monacoContainer.style.display = 'block';
            // 确保Monaco容器不会覆盖拖拽区域
            monacoContainer.style.zIndex = '1';
        }
    }

    // 应用正则高亮 - 可见区域高亮 + 延迟处理
    async applyRegexHighlighting() {
        if (!this.editor) return;

        try {
            const activeRules = this.getActiveRules();

            // 如果没有激活的规则，直接返回
            if (activeRules.length === 0) {
                return;
            }

            // 清除之前的正则装饰器，但保留搜索装饰器
            this.clearCurrentDecorations();

            const model = this.editor.getModel();
            const maxLines = model.getLineCount();

            // 预编译所有规则的正则表达式
            const compiledRules = [];
            for (const [index, rule] of activeRules.entries()) {
                try {
                    // 为这个规则添加CSS样式
                    this.addHighlightStyle(rule, index);

                    compiledRules.push({
                        ...rule,
                        index,
                        regex: new RegExp(rule.pattern, 'gi')
                    });
                } catch (error) {
                    console.warn('正则表达式编译错误:', rule.pattern, error);
                }
            }

            // 分离整行高亮规则和部分高亮规则
            const wholeLineRules = compiledRules.filter(rule => rule.highlightWholeLine);
            const partialHighlightRules = compiledRules.filter(rule => !rule.highlightWholeLine);

            // 获取可见区域的行范围
            const visibleRanges = this.editor.getVisibleRanges();
            if (visibleRanges.length === 0) {
                // 如果没有可见区域，处理前100行
                this.highlightLines(1, Math.min(100, maxLines), compiledRules, wholeLineRules, partialHighlightRules, model);
            } else {
                // 处理可见区域
                const startLine = visibleRanges[0].startLineNumber;
                const endLine = visibleRanges[0].endLineNumber;

                // 扩展可见区域，预加载前后一些行
                const bufferLines = 50;
                const extendedStartLine = Math.max(1, startLine - bufferLines);
                const extendedEndLine = Math.min(maxLines, endLine + bufferLines);

                this.highlightLines(extendedStartLine, extendedEndLine, compiledRules, wholeLineRules, partialHighlightRules, model);
            }

            // 监听滚动事件，动态更新可见区域的高亮
            this.setupScrollListener(compiledRules, wholeLineRules, partialHighlightRules, model);

        } catch (error) {
            console.error('Monaco高亮失败:', error);
        }
    }

    // 高亮指定范围内的行
    highlightLines(startLine, endLine, compiledRules, wholeLineRules, partialHighlightRules, model) {
        const decorations = [];

        for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
            const lineText = model.getLineContent(lineNumber);
            const lineMaxColumn = model.getLineMaxColumn(lineNumber);

            // 先处理整行高亮规则
            for (const rule of wholeLineRules) {
                try {
                    // 重置正则表达式状态
                    rule.regex.lastIndex = 0;
                    if (rule.regex.test(lineText)) {
                        decorations.push({
                            range: new monaco.Range(lineNumber, 1, lineNumber, lineMaxColumn),
                            options: {
                                inlineClassName: `regex-line-highlight-${rule.index}`,
                                stickiness: 1,
                                shouldFillLineOnLineBreak: false
                            }
                        });
                        // 整行高亮后，跳过该行的其他整行规则检查
                        break;
                    }
                } catch (error) {
                    console.warn('整行高亮正则匹配错误:', rule.pattern, error);
                }
            }

            // 处理部分高亮规则
            for (const rule of partialHighlightRules) {
                try {
                    // 重置正则表达式状态
                    rule.regex.lastIndex = 0;
                    let match;

                    while ((match = rule.regex.exec(lineText)) !== null) {
                        const startColumn = match.index + 1; // Monaco列号从1开始
                        const endColumn = startColumn + match[0].length;

                        decorations.push({
                            range: new monaco.Range(lineNumber, startColumn, lineNumber, endColumn),
                            options: {
                                inlineClassName: `regex-highlight-${rule.index}`,
                                stickiness: 2,
                                shouldFillLineOnLineBreak: false
                            }
                        });
                    }
                } catch (error) {
                    console.warn('部分高亮正则匹配错误:', rule.pattern, error);
                }
            }
        }

        // 应用装饰器
        if (decorations.length > 0) {
            const newDecorations = this.editor.deltaDecorations([], decorations);
            this.currentDecorations = [...this.currentDecorations, ...newDecorations];
        }
    }

    // 设置滚动监听器，动态更新可见区域的高亮
    setupScrollListener(compiledRules, wholeLineRules, partialHighlightRules, model) {
        // 移除之前的监听器
        if (this.scrollListener) {
            this.scrollListener.dispose();
        }

        // 添加新的滚动监听器
        this.scrollListener = this.editor.onDidScrollChange(() => {
            // 使用防抖避免频繁更新
            if (this.scrollTimeout) {
                clearTimeout(this.scrollTimeout);
            }

            this.scrollTimeout = setTimeout(() => {
                const visibleRanges = this.editor.getVisibleRanges();
                if (visibleRanges.length > 0) {
                    const startLine = visibleRanges[0].startLineNumber;
                    const endLine = visibleRanges[0].endLineNumber;

                    // 扩展可见区域，预加载前后一些行
                    const bufferLines = 40;
                    const extendedStartLine = Math.max(1, startLine - bufferLines);
                    const extendedEndLine = Math.min(model.getLineCount(), endLine + bufferLines);

                    this.highlightLines(extendedStartLine, extendedEndLine, compiledRules, wholeLineRules, partialHighlightRules, model);
                }
            }, 500);
        });
    }

    // 添加高亮样式
    addHighlightStyle(rule, index) {
        const styleId = `regex-highlight-${index}`;

        // 如果样式已存在，先移除它，确保使用最新的颜色
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .regex-highlight-${index} {
                color: ${rule.color} !important;
                background-color: ${rule.bgColor} !important;
                border-radius: 2px;
                padding: 1px 2px;
            }
            .regex-line-highlight-${index} {
                color: ${rule.color} !important;
                background-color: ${rule.bgColor} !important;
                border-radius: 2px;
                padding: 0;
            }
            .search-highlight {
                background-color: #ffff00 !important;
                color: #000000 !important;
                border-radius: 2px;
                padding: 1px 2px;
            }
        `;
        document.head.appendChild(style);
    }

    // 清除当前装饰器
    clearCurrentDecorations() {
        if (this.editor && this.currentDecorations.length > 0) {
            this.editor.deltaDecorations(this.currentDecorations, []);
            this.currentDecorations = [];
        }

        // 清除滚动监听器
        if (this.scrollListener) {
            this.scrollListener.dispose();
            this.scrollListener = null;
        }

        // 清除滚动超时
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = null;
        }
    }

    // 应用搜索高亮 - 高亮所有行中匹配的搜索词
    applySearchHighlighting() {
        if (!this.editor || !this.core.searchTerm) return;

        // 清除之前的搜索装饰器
        this.clearSearchDecorations();

        const model = this.editor.getModel();
        const searchTerm = this.core.searchTerm;

        try {
            const decorations = [];
            const totalLines = model.getLineCount();

            // 判断搜索词是否应该作为正则表达式处理
            const shouldUseRegex = this.shouldUseRegexForSearch(searchTerm);

            // 遍历所有行
            for (let lineNumber = 1; lineNumber <= totalLines; lineNumber++) {
                const lineText = model.getLineContent(lineNumber);

                if (shouldUseRegex) {
                    // 作为正则表达式处理，不转义特殊字符
                    const regex = new RegExp(searchTerm, 'gi');
                    let match;

                    // 重置正则表达式状态
                    regex.lastIndex = 0;

                    // 在当前行中查找所有匹配
                    while ((match = regex.exec(lineText)) !== null) {
                        const startColumn = match.index + 1; // Monaco列号从1开始
                        const endColumn = startColumn + match[0].length;

                        // 为每个匹配创建装饰器
                        decorations.push({
                            range: new monaco.Range(lineNumber, startColumn, lineNumber, endColumn),
                            options: {
                                inlineClassName: 'search-highlight',
                                stickiness: 2 // 比正则高亮优先级更高
                            }
                        });
                    }
                } else {
                    // 作为普通字符串处理，需要转义特殊字符
                    const escapedSearchTerm = this.escapeRegex(searchTerm);
                    const regex = new RegExp(escapedSearchTerm, 'gi');
                    let match;

                    // 重置正则表达式状态
                    regex.lastIndex = 0;

                    // 在当前行中查找所有匹配
                    while ((match = regex.exec(lineText)) !== null) {
                        const startColumn = match.index + 1; // Monaco列号从1开始
                        const endColumn = startColumn + match[0].length;

                        // 为每个匹配创建装饰器
                        decorations.push({
                            range: new monaco.Range(lineNumber, startColumn, lineNumber, endColumn),
                            options: {
                                inlineClassName: 'search-highlight',
                                stickiness: 2 // 比正则高亮优先级更高
                            }
                        });
                    }
                }
            }

            // 应用所有搜索装饰器
            this.searchDecorations = this.editor.deltaDecorations([], decorations);
        } catch (error) {
            // 忽略搜索高亮错误，不影响主要功能
        }
    }

    // 判断搜索词是否应该作为正则表达式处理
    shouldUseRegexForSearch(searchTerm) {
        // 如果以 / 开头和结尾，认为是显式正则表达式
        if (searchTerm.startsWith('/') && searchTerm.endsWith('/') && searchTerm.length > 2) {
            return true;
        }
        // 如果包含正则表达式特殊字符，也作为正则表达式处理
        if (/[.*+?^${}()|[\]\\]/.test(searchTerm)) {
            return true;
        }
        return false;
    }

    // 清除搜索装饰器
    clearSearchDecorations() {
        if (this.editor && this.searchDecorations.length > 0) {
            this.editor.deltaDecorations(this.searchDecorations, []);
            this.searchDecorations = [];
        }
    }

    // 高亮当前搜索结果
    highlightCurrentSearchResult() {
        if (!this.editor || !this.core.isRealSearchMode || this.core.currentSearchIndex < 0) return;

        const result = this.core.searchResults[this.core.currentSearchIndex];
        if (result) {
            // 获取当前显示的日志
            const logsToRender = this.getLogsToRender();

            // 找到搜索结果在当前显示日志中的位置
            const displayIndex = logsToRender.findIndex(log =>
                log.originalIndex === result.log.originalIndex
            );

            if (displayIndex !== -1) {
                // 滚动到对应行（Monaco行号从1开始）
                const lineNumber = displayIndex + 1;
                this.editor.revealLineInCenter(lineNumber);

                // 设置选中行 - 使用显示索引而不是原始索引
                this.core.selectLine(displayIndex);
            }
        }
    }


    // 更新选中行
    updateSelectedLine() {
        if (!this.editor || this.core.selectedLineIndex < 0) return;

        // 清除之前的装饰
        const oldDecorations = this.editor.getModel().getAllDecorations();
        const decorationIds = oldDecorations
            .filter(d => d.options.className === 'selected-line')
            .map(d => d.id);

        if (decorationIds.length > 0) {
            this.editor.deltaDecorations(decorationIds, []);
        }

        // 添加新的装饰 - selectedLineIndex 已经是基于当前显示日志的索引
        const lineNumber = this.core.selectedLineIndex + 1;
        const decorations = [{
            range: new monaco.Range(lineNumber, 1, lineNumber, 1),
            options: {
                isWholeLine: true,
                className: 'selected-line',
                linesDecorationsClassName: 'selected-line-decoration'
            }
        }];

        this.editor.deltaDecorations([], decorations);
    }

    // 更新日志计数
    updateLogCount() {
        const logsToRender = this.getLogsToRender();
        this.core.logCount.textContent = `${logsToRender.length} 行`;
    }

    // 应用配置组过滤
    applyGroupFiltering(logs) {
        const filterRuleIds = new Set();
        this.core.configGroups.forEach(group => {
            if (this.core.filterGroups.has(group.id)) {
                group.ruleIds.forEach(ruleId => filterRuleIds.add(ruleId));
            }
        });

        if (filterRuleIds.size === 0) {
            return logs;
        }

        const filterRules = this.core.regexRules.filter(rule =>
            filterRuleIds.has(this.core.getRuleId(rule))
        );

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
        if (this.editor) {
            const lineNumber = lineIndex + 1;
            this.editor.revealLineInCenter(lineNumber);
            // 同时选中该行
            this.core.selectLine(lineIndex);
        }
    }

    // 获取行元素
    getLineElement(lineIndex) {
        // Monaco Editor没有DOM元素，返回null
        return null;
    }

    // 显示右键菜单
    showContextMenu(event, lineIndex) {
        this.core.showContextMenu(event, lineIndex);
    }

    // 添加行点击事件
    addLineClickHandler(lineIndex, handler) {
        // Monaco Editor的点击事件在bindEditorEvents中处理
    }

    // 添加行右键菜单事件
    addLineContextMenuHandler(lineIndex, handler) {
        // Monaco Editor的右键菜单事件在bindEditorEvents中处理
    }

    // 更新空状态
    updateEmptyState() {
        // 空状态处理
        const logsToRender = this.getLogsToRender();
        if (logsToRender.length === 0) {
            this.editor.setValue('');
        }
    }

    // 清理资源
    dispose() {
        if (this.editor) {
            this.editor.dispose();
            this.editor = null;
        }
        this.isInitialized = false;
    }
}

export default MonacoRenderer;