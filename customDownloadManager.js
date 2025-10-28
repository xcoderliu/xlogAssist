// 自定义下载源管理模块 - 负责扫描和管理自定义下载源
class CustomDownloadManager {
    constructor(core) {
        this.core = core;
        this.customSources = [];
        this.basePath = 'customDownLoadLogSources';
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
            // 动态扫描目录结构
            const availableSources = [];
            
            // 扫描SensorLog目录
            const sensorLogUrl = `${this.basePath}/SensorLog/index.html`;
            const sensorLogAvailable = await this.checkSourceAvailability(sensorLogUrl);
            
            if (sensorLogAvailable) {
                availableSources.push({
                    name: 'SensorLog',
                    displayName: '神策埋点',
                    url: sensorLogUrl,
                    description: '从神策埋点系统下载用户行为日志'
                });
            }
            
            // 这里可以添加更多目录的扫描逻辑
            // 例如：扫描其他自定义下载源目录
            
            this.customSources = availableSources;
            return this.customSources;
        } catch (error) {
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
            
            xhr.onload = function() {
                resolve(xhr.status === 200);
            };
            
            xhr.onerror = function() {
                resolve(false);
            };
            
            xhr.ontimeout = function() {
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

        // 添加样式
        if (!document.querySelector('#custom-download-styles')) {
            const style = document.createElement('style');
            style.id = 'custom-download-styles';
            style.textContent = `
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .modal-content {
                    background: white;
                    border-radius: 8px;
                    width: 400px;
                    max-width: 90%;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                }
                .modal-header {
                    padding: 20px;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .modal-header h3 {
                    margin: 0;
                    color: #333;
                }
                .close-btn {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #999;
                }
                .close-btn:hover {
                    color: #333;
                }
                .modal-body {
                    padding: 20px;
                }
                .sources-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .source-item {
                    padding: 15px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .source-item:hover {
                    border-color: #007bff;
                    background: #f8f9fa;
                }
                .source-name {
                    font-weight: 500;
                    color: #333;
                    margin-bottom: 5px;
                }
                .source-description {
                    font-size: 12px;
                    color: #666;
                }
            `;
            document.head.appendChild(style);
        }

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

        // 添加样式
        if (!document.querySelector('#custom-source-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'custom-source-modal-styles';
            style.textContent = `
                .custom-source-modal .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                }
                .custom-source-modal .modal-content {
                    background: white;
                    border-radius: 8px;
                    width: 800px;
                    height: 600px;
                    max-width: 95vw;
                    max-height: 90vh;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    display: flex;
                    flex-direction: column;
                }
                .custom-source-modal .modal-header {
                    padding: 15px 20px;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-shrink: 0;
                }
                .custom-source-modal .modal-header h3 {
                    margin: 0;
                    color: #333;
                    font-size: 16px;
                }
                .custom-source-modal .close-btn {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    color: #999;
                }
                .custom-source-modal .close-btn:hover {
                    color: #333;
                }
                .custom-source-modal .modal-body {
                    flex: 1;
                    min-height: 0;
                    padding: 0;
                }
            `;
            document.head.appendChild(style);
        }

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
        
        // 保存上次日志到本地存储
        if (this.core.fileHandler && this.core.fileHandler.saveLastLogs) {
            this.core.fileHandler.saveLastLogs(this.core.logs);
        }
        
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