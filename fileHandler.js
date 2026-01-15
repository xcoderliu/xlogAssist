// 文件处理模块 - 负责文件上传、读取和解析
import MonacoRenderer from './monacoRenderer.js';

class FileHandler {
    constructor(core) {
        this.core = core;
        this.initWorker();
    }

    // 初始化Worker
    initWorker() {
        if (window.Worker) {
            this.worker = new Worker('./logWorker.js');
            this.worker.onmessage = (e) => this.handleWorkerMessage(e);
            this.worker.onerror = (error) => {
                console.error('Worker error:', error);
                this.core.setStatus('后台处理服务出错', 'error');
            };
        }
    }

    // 处理Worker消息
    handleWorkerMessage(e) {
        const { type, logs, progress, error, isLast } = e.data;

        switch (type) {
            case 'START':
                this.core.setStatus('开始处理文件...');
                this.core.logs = []; // 清空现有日志
                this.processingLogs = []; // 临时存储
                break;

            case 'CHUNK':
                if (logs && logs.length > 0) {
                    // 为新日志添加索引
                    const startIndex = this.core.logs.length;
                    const logsWithIndex = logs.map((log, i) => ({
                        ...log,
                        originalIndex: startIndex + i
                    }));

                    this.core.logs.push(...logsWithIndex);
                }

                this.core.setStatus(`正在处理... ${progress}%`);

                if (isLast) {
                    this.finishProcessing();
                }
                break;

            case 'ERROR':
                this.core.setStatus(`处理出错: ${error}`, 'error');
                break;
        }
    }

    async finishProcessing() {
        this.core.setStatus('文件处理完成');

        // 使用Monaco渲染器
        if (!this.core.monacoRenderer) {
            this.core.monacoRenderer = new MonacoRenderer(this.core);
        }
        // 设置当前渲染器为Monaco
        this.core.currentRenderer = this.core.monacoRenderer;

        // 通知核心模块重新渲染
        if (this.core.renderLogs) {
            await this.core.renderLogs();
        }
        if (this.core.updateLogCount) {
            this.core.updateLogCount();
        }
    }

    // 拖拽事件处理
    handleDragOver(e) {
        e.preventDefault();
        this.core.dropZone.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.core.dropZone.classList.remove('drag-over');
    }

    async handleDrop(e) {
        e.preventDefault();
        this.core.dropZone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await this.processFiles(files);
        }
    }

    async handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            await this.processFiles(files);
        }
    }

    // 处理文件
    async processFiles(files) {
        this.core.setStatus('准备处理文件...');

        try {
            for (const file of files) {
                this.core.currentFile = file;

                if (this.worker) {
                    // 使用Worker处理
                    this.worker.postMessage({ type: 'PROCESS_FILE', file: file });
                } else {
                    // 降级处理
                    const content = await this.readFile(file);
                    this.parseLogContent(content, file.name);
                }
            }
        } catch (error) {
            console.error('文件处理错误:', error);
            this.core.setStatus('处理失败: ' + error.message, 'error');
        }
    }

    // 读取文件内容（降级方案）
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    }

    // 解析日志内容（降级方案）
    parseLogContent(content, filename) {
        const lines = content.split('\n').filter(line => line.trim());
        this.core.logs.push(...lines.map((line, index) => ({
            content: line,
            originalIndex: this.core.logs.length + index,
            file: filename,
            timestamp: new Date().toISOString()
        })));

        this.finishProcessing();
    }

    // 清空日志
    clearLogs() {
        if (confirm('确定要清空所有日志吗？')) {
            this.core.logs = [];
            this.core.filteredLogs = null;
            this.core.filterTerm = '';
            if (this.core.filterInput) this.core.filterInput.value = '';
            if (this.core.clearFilter) this.core.clearFilter.style.display = 'none';

            this.core.searchResults = [];
            this.core.currentSearchIndex = -1;
            this.core.searchTerm = '';
            if (this.core.searchInput) this.core.searchInput.value = '';
            if (this.core.clearSearch) this.core.clearSearch.style.display = 'none';
            if (this.core.prevMatch) this.core.prevMatch.style.display = 'none';
            if (this.core.nextMatch) this.core.nextMatch.style.display = 'none';
            this.core.isRealSearchMode = false;

            this.core.selectedLineIndex = -1;

            // 重置渲染器选择，下次打开文件时重新决定
            this.core.currentRenderer = null;

            // 隐藏Monaco容器
            const monacoContainer = document.getElementById('monacoEditorContainer');
            if (monacoContainer) monacoContainer.style.display = 'none';

            // 重置文件输入框，允许重新选择相同的文件
            if (this.core.fileInput) this.core.fileInput.value = '';

            // 重新显示上传区域
            const uploadSection = this.core.dropZone.closest('.upload-section');
            if (this.core.dropZone) this.core.dropZone.style.display = 'block';
            if (uploadSection) uploadSection.style.display = 'block';

            // 通知核心模块重新渲染
            if (this.core.renderLogs) {
                this.core.renderLogs();
            }
            if (this.core.updateLogCount) {
                this.core.updateLogCount();
            }

            // 确保上传区域正确显示 - 通过Monaco渲染器调用
            if (this.core.monacoRenderer && this.core.monacoRenderer.controlUploadSection) {
                this.core.monacoRenderer.controlUploadSection();
            }

            this.core.setStatus('日志已清空，可以重新上传');
        }
    }
}

export default FileHandler;