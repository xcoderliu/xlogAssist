// 右键菜单模块 - 负责上下文菜单处理
class ContextMenu {
    constructor(core) {
        this.core = core;
    }

    // 处理右键菜单事件
    handleContextMenu(e) {
        if (e.target.closest('.investigation-item')) {
            e.preventDefault();
            const investigationItem = e.target.closest('.investigation-item');
            const originalIndex = parseInt(investigationItem.dataset.index);
            this.showInvestigationContextMenu(e, originalIndex);
        } else if (e.target.closest('.monaco-editor')) {
            // 处理Monaco Editor中的右键点击
            e.preventDefault();
            // 通过Monaco渲染器获取当前行索引
            if (this.core.currentRenderer === this.core.monacoRenderer && this.core.currentRenderer.editor) {
                const position = this.core.currentRenderer.editor.getPosition();
                if (position) {
                    const lineIndex = position.lineNumber - 1;
                    // 确保日志索引正确
                    if (lineIndex >= 0 && lineIndex < this.core.logs.length) {
                        this.showContextMenu(e, lineIndex);
                    }
                }
            }
        }
    }

    // 显示日志右键菜单
    showContextMenu(e, index) {
        this.core.contextMenu.style.display = 'block';
        this.core.contextMenu.style.left = e.pageX + 'px';
        this.core.contextMenu.style.top = e.pageY + 'px';
        this.core.contextMenu.dataset.index = index;
    }

    // 显示排查区右键菜单
    showInvestigationContextMenu(e, originalIndex) {
        this.core.investigationContextMenu.style.display = 'block';
        this.core.investigationContextMenu.style.left = e.pageX + 'px';
        this.core.investigationContextMenu.style.top = e.pageY + 'px';
        this.core.investigationContextMenu.dataset.originalIndex = originalIndex;
    }

    // 隐藏右键菜单
    hideContextMenu() {
        this.core.contextMenu.style.display = 'none';
        this.core.investigationContextMenu.style.display = 'none';
    }

    // 处理菜单操作
    handleMenuAction(e) {
        const action = e.target.dataset.action;
        const index = parseInt(this.core.contextMenu.dataset.index);

        if (action === 'add-to-investigation') {
            this.addToInvestigation(index);
        } else if (action === 'copy-line') {
            this.copyLine(index);
        } else if (action === 'format-json') {
            this.formatJSON(index);
        }

        this.hideContextMenu();
    }

    // 处理排查区菜单操作
    handleInvestigationMenuAction(e) {
        const action = e.target.dataset.action;
        const originalIndex = parseInt(this.core.investigationContextMenu.dataset.originalIndex);

        if (action === 'remove-from-investigation') {
            this.removeFromInvestigation(originalIndex);
        } else if (action === 'copy-line') {
            this.copyLineFromInvestigation(originalIndex);
        } else if (action === 'format-json') {
            this.formatJSONFromInvestigation(originalIndex);
        }

        this.hideContextMenu();
    }

    // 格式化JSON
    formatJSON(index) {
        const log = this.core.logs[index];
        this.extractAndShowJSON(log.content);
    }

    // 从排查区格式化JSON
    formatJSONFromInvestigation(originalIndex) {
        const log = this.core.investigationLogs.find(item => item.originalIndex === originalIndex);
        if (log) {
            this.extractAndShowJSON(log.content);
        }
    }

    // 提取并显示JSON
    extractAndShowJSON(content) {
        const foundJSONs = [];
        let i = 0;

        while (i < content.length) {
            // Find start of JSON candidate
            if (content[i] === '{' || content[i] === '[') {
                const result = this._tryExtractJSON(content, i);
                if (result) {
                    foundJSONs.push(result.obj);
                    i = result.endIndex; // Skip past the found object
                    continue;
                }
            }
            i++;
        }

        if (foundJSONs.length > 0) {
            this.showJSONModal(foundJSONs);
        } else {
            this.core.setStatus('未在当前行找到有效的 JSON 内容', 'warning');
        }
    }

    _tryExtractJSON(str, startIndex) {
        const startChar = str[startIndex];
        const endChar = startChar === '{' ? '}' : ']';

        let balance = 0;
        let inString = false;
        let escaped = false;

        for (let i = startIndex; i < str.length; i++) {
            const char = str[i];

            if (escaped) {
                escaped = false;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                continue;
            }

            if (char === '"') {
                inString = !inString;
                continue;
            }

            if (!inString) {
                if (char === startChar) {
                    balance++;
                } else if (char === endChar) {
                    balance--;
                    if (balance === 0) {
                        try {
                            const candidate = str.substring(startIndex, i + 1);
                            return { obj: JSON.parse(candidate), endIndex: i };
                        } catch (e) {
                            return null;
                        }
                    }
                }
            }
        }
        return null;
    }

    // 显示 JSON 模态框
    showJSONModal(jsonInfos) {
        const modal = document.getElementById('jsonViewerModal');
        const modalBody = document.getElementById('jsonModalBody');
        modalBody.innerHTML = ''; // Clear previous content

        // Container for JSONEditor
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.minHeight = '400px';
        modalBody.appendChild(container);

        // Prepare data: if multiple JSONs, wrap them in an array
        let dataToView = jsonInfos;
        if (Array.isArray(jsonInfos) && jsonInfos.length === 1) {
            dataToView = jsonInfos[0];
        }

        const options = {
            mode: 'view',
            modes: ['view', 'tree', 'code'],
            search: true,
            navigationBar: true,
            statusBar: true
        };

        try {
            if (typeof JSONEditor === 'undefined') {
                throw new Error('JSONEditor library not loaded');
            }
            const editor = new JSONEditor(container, options);
            editor.set(dataToView);
            editor.expandAll();
        } catch (e) {
            console.error('Failed to initialize JSONEditor:', e);
            container.innerHTML = `<div style="padding: 20px; color: red;">
                <h3>Error loading JSON Editor</h3>
                <p>${e.message}</p>
                <p>Falling back to raw text view:</p>
                <pre style="background: #f0f0f0; padding: 10px; overflow: auto;">${JSON.stringify(dataToView, null, 2)}</pre>
            </div>`;
        }

        modal.style.display = 'flex';

        // 绑定复制按钮 (复制所有JSON的文本)
        const copyBtn = document.getElementById('copyJsonBtn');
        const newCopyBtn = copyBtn.cloneNode(true);
        copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);

        newCopyBtn.addEventListener('click', () => {
            const allText = JSON.stringify(dataToView, null, 2);
            navigator.clipboard.writeText(allText).then(() => {
                this.core.setStatus('JSON 已复制');
            });
        });
    }

    // 添加到排查区
    addToInvestigation(index) {
        const log = this.core.logs[index];
        if (!this.core.investigationLogs.some(item => item.originalIndex === log.originalIndex)) {
            this.core.investigationLogs.push({ ...log });
            if (this.core.renderInvestigationLogs) {
                this.core.renderInvestigationLogs();
            }
            this.core.setStatus('已添加到排查区');
        }
    }

    // 从排查区移除
    removeFromInvestigation(originalIndex) {
        const index = this.core.investigationLogs.findIndex(item => item.originalIndex === originalIndex);
        if (index !== -1) {
            this.core.investigationLogs.splice(index, 1);
            if (this.core.renderInvestigationLogs) {
                this.core.renderInvestigationLogs();
            }
            this.core.setStatus('已从排查区移除');
        }
    }

    // 复制行内容
    copyLine(index) {
        const log = this.core.logs[index];
        navigator.clipboard.writeText(log.content).then(() => {
            this.core.setStatus('已复制到剪贴板');
        });
    }

    // 从排查区复制行内容
    copyLineFromInvestigation(originalIndex) {
        const log = this.core.investigationLogs.find(item => item.originalIndex === originalIndex);
        if (log) {
            navigator.clipboard.writeText(log.content).then(() => {
                this.core.setStatus('已复制到剪贴板');
            });
        }
    }
}

export default ContextMenu;