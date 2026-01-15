// 自定义下载源管理模块 - 负责扫描和管理自定义下载源
import MonacoRenderer from './monacoRenderer.js';

class CustomDownloadManager {
    constructor(core) {
        this.core = core;
        this.customSources = [];
        this.basePath = 'customDownloadLogSources';
        this.activeDownloads = new Map(); // 存储活跃的下载任务
        this.currentDownloadId = 0; // 下载任务ID计数器

        // 确保customSources属性存在
        if (!this.customSources) {
            this.customSources = [];
        }
    }

    // 扫描自定义下载源
    async scanCustomSources() {
        try {
            // 硬编码已知的下载源列表
            const knownSources = [
                {
                    name: 'SensorLog',
                    displayName: '神策埋点',
                    url: `${this.basePath}/SensorLog/index.html`,
                    description: '从神策埋点系统下载用户行为日志'
                },
                {
                    name: 'SensorNetworkLog',
                    displayName: '神策网络埋点',
                    url: `${this.basePath}/SensorNetworkLog/index.html`,
                    description: '从神策埋点系统下载网络性能日志，仅获取jsons字段并过滤domain_performance事件'
                }
            ];

            const availableSources = [];

            // 检查每个源是否可用
            for (const source of knownSources) {
                const isAvailable = await this.checkSourceAvailability(source.url);
                if (isAvailable) {
                    availableSources.push(source);
                }
            }

            this.customSources = availableSources;
            return this.customSources;
        } catch (error) {
            console.error('扫描自定义下载源失败:', error);
            // 如果扫描失败，返回空数组
            this.customSources = [];
            return this.customSources;
        }
    }

    // 检查下载源可用性
    checkSourceAvailability(url) {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('HEAD', url, true);
            xhr.timeout = 3000; // 3秒超时

            xhr.onload = function () {
                resolve(xhr.status === 200);
            };

            xhr.onerror = function () {
                resolve(false);
            };

            xhr.ontimeout = function () {
                resolve(false);
            };

            xhr.send();
        });
    }

    // 格式化显示名称
    formatDisplayName(name) {
        // 将驼峰命名或下划线命名转换为中文显示
        const nameMap = {
            'SensorLog': '神策埋点',
            'CustomLog': '自定义日志',
            'APILog': 'API日志'
        };

        return nameMap[name] || name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }

    // 显示自定义下载源选择界面
    showCustomDownloadSources() {
        if (this.customSources.length === 0) {
            alert('暂无自定义下载源');
            return;
        }

        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>选择下载源</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="sources-list">
                        ${this.customSources.map(source => `
                            <div class="source-item" data-source="${source.name}">
                                <div class="source-name">${source.displayName}</div>
                                <div class="source-description">${source.description || ''}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;



        // 绑定事件
        modal.querySelector('.close-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelectorAll('.source-item').forEach(item => {
            item.addEventListener('click', () => {
                const sourceName = item.dataset.source;
                this.openSourceWindow(sourceName);
                document.body.removeChild(modal);
            });
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        document.body.appendChild(modal);
    }

    // 打开下载源窗口 - 使用模态框
    openSourceWindow(sourceName) {
        const source = this.customSources.find(s => s.name === sourceName);
        if (!source) return;

        // 创建模态框容器
        const modal = document.createElement('div');
        modal.className = 'custom-source-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${source.displayName}</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <iframe src="${source.url}" frameborder="0" style="width: 100%; height: 100%;"></iframe>
                    </div>
                </div>
            </div>
        `;



        // 绑定关闭事件
        modal.querySelector('.close-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
            this.cancelAllDownloads(sourceName);
        });

        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === modal.querySelector('.modal-overlay')) {
                document.body.removeChild(modal);
                this.cancelAllDownloads(sourceName);
            }
        });

        document.body.appendChild(modal);
    }

    // 开始下载任务
    startDownload(sourceName, downloadId, params) {
        this.activeDownloads.set(downloadId, {
            sourceName,
            params,
            startTime: Date.now(),
            status: 'downloading'
        });
    }

    // 完成下载任务
    completeDownload(downloadId, result) {
        const download = this.activeDownloads.get(downloadId);
        if (download) {
            download.status = 'completed';
            download.endTime = Date.now();
            download.result = result;
        }
    }

    // 取消下载任务
    cancelDownload(downloadId) {
        const download = this.activeDownloads.get(downloadId);
        if (download) {
            download.status = 'cancelled';
            download.endTime = Date.now();
            this.activeDownloads.delete(downloadId);
        }
    }

    // 取消指定源的所有下载任务
    cancelAllDownloads(sourceName) {
        for (const [downloadId, download] of this.activeDownloads.entries()) {
            if (download.sourceName === sourceName) {
                this.cancelDownload(downloadId);
            }
        }
    }

    // 获取活跃下载任务数量
    getActiveDownloadCount(sourceName = null) {
        if (sourceName) {
            return Array.from(this.activeDownloads.values()).filter(
                download => download.sourceName === sourceName && download.status === 'downloading'
            ).length;
        }
        return Array.from(this.activeDownloads.values()).filter(
            download => download.status === 'downloading'
        ).length;
    }

    // 生成下载任务ID
    generateDownloadId() {
        return `download_${++this.currentDownloadId}_${Date.now()}`;
    }


    // 添加格式化后的日志到主界面
    addFormattedLogs(formattedLogs, sourceName = '自定义下载') {
        if (!Array.isArray(formattedLogs) || formattedLogs.length === 0) {
            return;
        }

        const logsToAdd = formattedLogs.map((log, index) => ({
            content: log,
            originalIndex: this.core.logs.length + index,
            file: `${sourceName}_${new Date().toISOString().replace(/[:.]/g, '-')}`,
            timestamp: new Date().toISOString()
        }));

        this.core.logs.push(...logsToAdd);

        // 使用Monaco渲染器
        if (!this.core.monacoRenderer) {
            this.core.monacoRenderer = new MonacoRenderer(this.core);
        }
        // 设置当前渲染器为Monaco
        this.core.currentRenderer = this.core.monacoRenderer;

        // 保存上次日志到本地存储
        if (this.core.fileHandler && this.core.fileHandler.saveLastLogs) {
            this.core.fileHandler.saveLastLogs(this.core.logs);
        }

        // 清除过滤和搜索状态，确保新添加的日志能被显示
        this.core.filteredLogs = null;
        this.core.filterTerm = '';
        this.core.isRealSearchMode = false;
        this.core.searchTerm = '';
        this.core.searchResults = [];
        this.core.currentSearchIndex = -1;

        // 重置UI状态
        if (this.core.filterInput) this.core.filterInput.value = '';
        if (this.core.searchInput) this.core.searchInput.value = '';
        if (this.core.clearFilter) this.core.clearFilter.style.display = 'none';
        if (this.core.clearSearch) this.core.clearSearch.style.display = 'none';
        if (this.core.prevMatch) this.core.prevMatch.style.display = 'none';
        if (this.core.nextMatch) this.core.nextMatch.style.display = 'none';

        // 通知核心模块重新渲染
        if (this.core.renderLogs) {
            this.core.renderLogs();
        }
        if (this.core.updateLogCount) {
            this.core.updateLogCount();
        }

        this.core.setStatus(`已添加 ${logsToAdd.length} 条日志`);
    }
}

export default CustomDownloadManager;