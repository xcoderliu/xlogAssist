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
                <div class="investigation-content">${this.applySearchHighlighting(log.content)}</div>
                <div class="investigation-note" style="margin-top: 5px;">
                    <textarea 
                        placeholder="添加备注..." 
                        style="width: 100%; height: 30px; resize: vertical; border: 1px solid #ddd; border-radius: 4px; padding: 4px; font-size: 12px; font-family: inherit;"
                    >${log.note || ''}</textarea>
                </div>
            `;

            // 绑定备注输入事件
            const noteTextarea = itemElement.querySelector('textarea');
            noteTextarea.addEventListener('input', (e) => {
                log.note = e.target.value;
            });
            // 阻止点击textarea时触发item的点击跳转
            noteTextarea.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // 添加点击事件 - 跳转到原日志行
            itemElement.addEventListener('click', () => {
                this.core.selectLine(log.originalIndex);
                // 滚动到选中行 - 使用Monaco渲染器
                if (this.core.monacoRenderer) {
                    this.core.monacoRenderer.scrollToLine(log.originalIndex);
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
        let highlightedText = text;

        // 应用正则高亮（同步版本，专门用于排查区）
        if (this.core.regexRules && this.core.regexRules.length > 0) {
            const activeRules = this.core.getActiveRules ? this.core.getActiveRules() : this.core.regexRules;
            activeRules.forEach((rule, index) => {
                try {
                    const regex = new RegExp(rule.pattern, 'gi');
                    highlightedText = highlightedText.replace(regex, match =>
                        `<span style="color: ${rule.color}; background-color: ${rule.bgColor}; border-radius: 2px; padding: 1px 2px;">${match}</span>`
                    );
                } catch (error) {
                    // 忽略正则表达式错误
                }
            });
        }

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