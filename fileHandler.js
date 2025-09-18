// 文件处理模块 - 负责文件上传、读取和解析
class FileHandler {
    constructor(core) {
        this.core = core;
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
        this.core.setStatus('正在处理文件...');
        
        try {
            for (const file of files) {
                this.core.currentFile = file;
                const content = await this.readFile(file);
                this.parseLogContent(content, file.name);
            }
            this.core.setStatus('文件处理完成');
        } catch (error) {
            console.error('文件处理错误:', error);
            this.core.setStatus('处理失败: ' + error.message, 'error');
        }
    }

    // 读取文件内容
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    }

    // 解析日志内容
    parseLogContent(content, filename) {
        const lines = content.split('\n').filter(line => line.trim());
        this.core.logs.push(...lines.map((line, index) => ({
            content: line,
            originalIndex: this.core.logs.length + index,
            file: filename,
            timestamp: new Date().toISOString()
        })));
        
        // 通知核心模块重新渲染
        if (this.core.renderLogs) {
            this.core.renderLogs();
        }
        if (this.core.updateLogCount) {
            this.core.updateLogCount();
        }
    }

    // 清空日志
    clearLogs() {
        if (confirm('确定要清空所有日志吗？')) {
            this.core.logs = [];
            this.core.filteredLogs = null;
            this.core.filterTerm = '';
            this.core.filterInput.value = '';
            this.core.clearFilter.style.display = 'none';
            
            this.core.searchResults = [];
            this.core.currentSearchIndex = -1;
            this.core.searchTerm = '';
            this.core.searchInput.value = '';
            this.core.clearSearch.style.display = 'none';
            this.core.prevMatch.style.display = 'none';
            this.core.nextMatch.style.display = 'none';
            this.core.isRealSearchMode = false;
            
            this.core.selectedLineIndex = -1;
            
            // 重置文件输入框，允许重新选择相同的文件
            this.core.fileInput.value = '';
            
            // 重新显示上传区域
            const uploadSection = this.core.dropZone.closest('.upload-section');
            this.core.dropZone.style.display = 'block';
            uploadSection.style.display = 'block';
            
            // 通知核心模块重新渲染
            if (this.core.renderLogs) {
                this.core.renderLogs();
            }
            if (this.core.updateLogCount) {
                this.core.updateLogCount();
            }
            this.core.setStatus('日志已清空，可以重新上传');
        }
    }
}

export default FileHandler;