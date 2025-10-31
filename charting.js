
// 绘图区模块 - 负责图表显示和管理（纯JavaScript实现）
class Charting {
    constructor(core) {
        this.core = core;
        this.charts = []; // 当前显示的图表实例
        this.activeChartId = null;
        this.chartConfigs = []; // 图表配置
        this.generatedChartIds = new Set(); // 存储已生成的图表ID

        // 自动初始化，与其他模块保持一致
        this.loadChartConfigs();
        this.initializeChartingUI();
        this.renderCharts();
    }

    // 加载图表配置
    loadChartConfigs() {
        const savedConfigs = localStorage.getItem('xlogAssist_chartConfigs');
        if (savedConfigs) {
            this.chartConfigs = JSON.parse(savedConfigs);
        }
    }

    // 保存图表配置
    saveChartConfigs() {
        localStorage.setItem('xlogAssist_chartConfigs', JSON.stringify(this.chartConfigs));
    }

    // 初始化绘图区UI
    initializeChartingUI() {
        // 绘图区内容已经在诊断模块中创建，这里不需要额外操作
        this.renderCharts();
    }


    // 渲染图表配置列表
    renderCharts() {
        const container = document.getElementById('chartsContainer');
        if (!container) return;

        // 只显示启用的图表配置
        const enabledConfigs = this.chartConfigs.filter(config => config.enabled);

        if (enabledConfigs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>暂无启用的图表配置</p>
                    <p>请在配置面板中启用图表配置</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="charts-grid">
                ${enabledConfigs.map(config => {
            const hasGeneratedChart = this.generatedChartIds.has(config.id);
            const placeholderText = hasGeneratedChart ? '已生成 - 点击重新生成' : '点击生成图表';

            return `
                    <div class="chart-item" data-config-id="${config.id}">
                        <div class="chart-header">
                            <div class="chart-title-section">
                                <div class="chart-title-left">
                                    <h4 class="chart-name">${config.name}</h4>
                                    <span class="chart-type-badge">${this.getChartTypeName(config.type)}</span>
                                </div>
                                ${hasGeneratedChart ? `
                                <div class="chart-actions">
                                    <button class="btn-icon fullscreen-btn" data-config-id="${config.id}" title="全屏查看">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                                        </svg>
                                    </button>
                                </div>
                                ` : ''}
                            </div>
                            ${config.description ? `<div class="chart-description">${config.description}</div>` : ''}
                        </div>
                        <div class="chart-preview" id="chart-preview-${config.id}">
                            ${hasGeneratedChart ?
                    `<div class="chart-placeholder">
                                    <button class="btn btn-small generate-single-chart" data-config-id="${config.id}">重新生成图表</button>
                                </div>` :
                    `<div class="chart-placeholder">
                                    <button class="btn btn-small generate-single-chart" data-config-id="${config.id}">生成图表</button>
                                </div>`
                }
                        </div>
                    </div>
                `}).join('')}
            </div>
        `;

        // 绑定图表配置操作事件
        this.bindChartConfigActions();

        // 自动重新生成已生成的图表
        this.regenerateGeneratedCharts();
    }

    // 获取图表占位符文本
    getChartPlaceholderText(chartType) {
        const placeholderMap = {
            'line': '适合展示趋势变化，如网络成功率、响应时间',
            'bar': '适合展示分类对比，如错误类型分布、请求量统计',
            'pie': '适合展示比例分布，如状态码分布、用户类型占比'
        };
        return placeholderMap[chartType] || '点击生成图表查看数据可视化';
    }

    // 获取图表类型名称
    getChartTypeName(type) {
        const typeMap = {
            'line': '折线图',
            'bar': '柱状图',
            'pie': '饼图'
        };
        return typeMap[type] || type;
    }

    // 绑定图表配置操作事件
    bindChartConfigActions() {
        const container = document.getElementById('chartsContainer');
        if (!container) return;

        // 生成单个图表
        container.querySelectorAll('.generate-single-chart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const configId = e.target.dataset.configId;
                this.generateChart(configId);
            });
        });

        // 全屏按钮
        container.querySelectorAll('.fullscreen-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const configId = e.target.closest('.fullscreen-btn').dataset.configId;
                this.openFullscreenChart(configId);
            });
        });

    }

    // 打开全屏查看图表
    openFullscreenChart(configId) {
        const config = this.chartConfigs.find(c => c.id === configId);
        if (!config) return;

        const previewElement = document.getElementById(`chart-preview-${configId}`);
        if (!previewElement) return;

        // 获取图表容器和canvas
        const chartContainer = previewElement.querySelector('div');
        if (!chartContainer) return;

        const canvas = chartContainer.querySelector('canvas');
        if (!canvas || !canvas.chart) return;

        // 创建全屏模态框
        const modal = document.createElement('div');
        modal.className = 'chart-fullscreen-modal active';
        modal.innerHTML = `
            <div class="chart-fullscreen-content">
                <div class="chart-fullscreen-header">
                    <div class="chart-title-left">
                        <h3 class="chart-name">${config.name}</h3>
                        <span class="chart-type-badge">${this.getChartTypeName(config.type)}</span>
                    </div>
                    <button class="btn-icon close-fullscreen-btn" title="关闭全屏">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
                <div class="chart-fullscreen-body">
                    <div class="chart-fullscreen-canvas-container">
                        <canvas id="chart-fullscreen-canvas"></canvas>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 重新创建全屏图表
        const fullscreenCanvas = document.getElementById('chart-fullscreen-canvas');
        if (fullscreenCanvas) {
            // 复制原始图表的数据和配置
            const originalChart = canvas.chart;
            const chartData = {
                labels: originalChart.data.labels,
                datasets: originalChart.data.datasets.map(dataset => ({
                    ...dataset,
                    // 重新设置数据，避免引用问题
                    data: [...dataset.data]
                }))
            };

            // 创建全屏图表配置
            const fullscreenOptions = {
                ...originalChart.options,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    ...originalChart.options.plugins,
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            };

            // 创建全屏图表
            fullscreenCanvas.chart = new Chart(fullscreenCanvas, {
                type: originalChart.config.type,
                data: chartData,
                options: fullscreenOptions
            });
        }

        // 绑定关闭事件
        const closeBtn = modal.querySelector('.close-fullscreen-btn');
        closeBtn.addEventListener('click', () => {
            if (fullscreenCanvas && fullscreenCanvas.chart) {
                fullscreenCanvas.chart.destroy();
            }
            modal.remove();
        });

        // ESC键关闭
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                if (fullscreenCanvas && fullscreenCanvas.chart) {
                    fullscreenCanvas.chart.destroy();
                }
                modal.remove();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);

        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                if (fullscreenCanvas && fullscreenCanvas.chart) {
                    fullscreenCanvas.chart.destroy();
                }
                modal.remove();
                document.removeEventListener('keydown', handleKeydown);
            }
        });
    }

    // 生成单个图表
    async generateChart(configId) {
        const config = this.chartConfigs.find(c => c.id === configId);
        if (!config) return;

        const previewElement = document.getElementById(`chart-preview-${configId}`);
        if (previewElement) {
            previewElement.innerHTML = '<div class="chart-loading">正在生成图表...</div>';
        }

        try {
            // 执行JavaScript脚本提取数据
            const chartData = await this.executeChartScript(config);

            if (chartData.success) {
                // 创建Canvas容器
                const chartContainer = document.createElement('div');
                chartContainer.style.width = '100%';
                chartContainer.style.height = '400px'; // 固定高度，确保图表有足够空间
                chartContainer.style.maxHeight = '500px';
                chartContainer.style.minHeight = '300px';
                chartContainer.style.padding = '10px';
                chartContainer.style.boxSizing = 'border-box';

                const canvas = document.createElement('canvas');
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.display = 'block';

                chartContainer.appendChild(canvas);
                previewElement.innerHTML = '';
                previewElement.appendChild(chartContainer);

                // 使用Chart.js生成图表
                this.createChartWithChartJS(canvas, config, chartData.data);

                // 标记图表为已生成
                this.generatedChartIds.add(configId);

                // 只更新当前图表的标题区域以显示全屏按钮，避免重新渲染整个容器
                this.updateChartHeader(configId);

                this.core.setStatus(`图表 "${config.name}" 生成成功`);
            } else {
                previewElement.innerHTML = `<div class="chart-error">图表生成失败: ${chartData.error}</div>`;
            }
        } catch (error) {
            previewElement.innerHTML = `<div class="chart-error">生成图表时出错: ${error.message}</div>`;
        }
    }

    // 执行图表脚本提取数据
    executeChartScript(config) {
        return new Promise((resolve) => {
            try {
                // 创建安全的执行环境
                const safeFunctions = {
                    console: {
                        log: (...args) => console.log('[Chart Script]', ...args),
                        warn: (...args) => console.warn('[Chart Script]', ...args),
                        error: (...args) => console.error('[Chart Script]', ...args)
                    },
                    JSON: JSON,
                    Math: Math,
                    String: String,
                    Number: Number,
                    Array: Array,
                    Object: Object,
                    Date: Date,
                    RegExp: RegExp
                };

                // 创建执行上下文
                const context = {
                    logs: this.core.logs,
                    ...safeFunctions
                };

                // 使用Function构造函数创建安全的函数
                const func = new Function(...Object.keys(context), `
                    try {
                        ${config.dataSource.script}
                    } catch (error) {
                        return { error: error.message };
                    }
                `);

                // 执行脚本
                const result = func(...Object.values(context));

                if (result && result.labels && result.datasets) {
                    resolve({
                        success: true,
                        data: result
                    });
                } else {
                    resolve({
                        success: false,
                        error: '脚本必须返回包含 labels 和 datasets 字段的对象'
                    });
                }
            } catch (error) {
                resolve({
                    success: false,
                    error: error.message
                });
            }
        });
    }

    // 使用Chart.js创建图表
    createChartWithChartJS(canvas, config, data) {
        // 清理之前的图表实例
        if (canvas.chart) {
            canvas.chart.destroy();
        }

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false, // 隐藏图例（蓝色小方块）
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            layout: {
                padding: {
                    top: 10,
                    right: 10,
                    bottom: 10,
                    left: 10
                }
            },
            scales: {}
        };

        // 根据图表类型配置不同的选项
        switch (config.type) {
            case 'line':
                chartOptions.scales = {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'X轴'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Y轴'
                        },
                        beginAtZero: true
                    }
                };
                break;
            case 'bar':
                chartOptions.scales = {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: '分类'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: '数值'
                        },
                        beginAtZero: true
                    }
                };
                break;
            case 'pie':
                chartOptions.plugins.tooltip = {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                };
                break;
        }

        // 准备数据集 - 支持多条线/多数据集
        const datasets = data.datasets.map((dataset, index) => {
            const baseConfig = {
                label: dataset.label || `数据集 ${index + 1}`,
                data: dataset.data,
                borderWidth: 2,
                fill: false
            };

            // 让Chart.js自动处理颜色，不设置固定颜色
            // 这样多数据集会自动分配不同的颜色

            // 根据图表类型设置不同的样式
            switch (config.type) {
                case 'line':
                    return {
                        ...baseConfig,
                        tension: 0.4,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    };
                case 'bar':
                    return {
                        ...baseConfig,
                        borderWidth: 1,
                        borderRadius: 4
                    };
                case 'pie':
                    return {
                        ...baseConfig,
                        borderWidth: 2
                    };
                default:
                    return baseConfig;
            }
        });

        // 创建图表
        canvas.chart = new Chart(canvas, {
            type: config.type,
            data: {
                labels: data.labels || [],
                datasets: datasets
            },
            options: chartOptions
        });
    }



    // 刷新所有图表
    async refreshAllCharts() {
        const enabledConfigs = this.chartConfigs.filter(config => config.enabled);

        if (enabledConfigs.length === 0) {
            this.core.setStatus('暂无启用的图表配置可刷新');
            return;
        }

        this.core.setStatus(`正在刷新 ${enabledConfigs.length} 个图表...`);

        for (const config of enabledConfigs) {
            await this.generateChart(config.id);
            // 添加延迟避免请求过于频繁
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.core.setStatus('所有图表刷新完成');
    }

    // 生成所有图表
    async generateAllCharts() {
        const enabledConfigs = this.chartConfigs.filter(config => config.enabled);

        if (enabledConfigs.length === 0) {
            this.core.setStatus('暂无启用的图表配置可生成');
            return;
        }

        this.core.setStatus(`正在生成 ${enabledConfigs.length} 个图表...`);

        // 清除所有现有图表
        const container = document.getElementById('chartsContainer');
        if (container) {
            container.innerHTML = `
                <div class="charts-grid">
                    ${enabledConfigs.map(config => {
                        const hasGeneratedChart = this.generatedChartIds.has(config.id);
                        return `
                        <div class="chart-item" data-config-id="${config.id}">
                            <div class="chart-header">
                                <div class="chart-title-section">
                                    <div class="chart-title-left">
                                        <h4 class="chart-name">${config.name}</h4>
                                        <span class="chart-type-badge">${this.getChartTypeName(config.type)}</span>
                                    </div>
                                    ${hasGeneratedChart ? `
                                    <div class="chart-actions">
                                        <button class="btn-icon fullscreen-btn" data-config-id="${config.id}" title="全屏查看">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                                            </svg>
                                        </button>
                                    </div>
                                    ` : ''}
                                </div>
                                ${config.description ? `<div class="chart-description">${config.description}</div>` : ''}
                            </div>
                            <div class="chart-preview" id="chart-preview-${config.id}">
                                <div class="chart-loading">正在生成图表...</div>
                            </div>
                        </div>
                    `}).join('')}
                </div>
            `;
        }

        for (const config of enabledConfigs) {
            await this.generateChart(config.id);
            // 添加延迟避免请求过于频繁
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.core.setStatus('所有图表生成完成');
    }

    // 自动重新生成已生成的图表
    regenerateGeneratedCharts() {
        // 为所有已生成的图表重新生成
        this.generatedChartIds.forEach(configId => {
            setTimeout(() => {
                this.generateChart(configId);
            }, 100); // 短暂延迟确保DOM已更新
        });
    }

    // 更新图表标题区域以显示全屏按钮
    updateChartHeader(configId) {
        const chartItem = document.querySelector(`.chart-item[data-config-id="${configId}"]`);
        if (!chartItem) return;

        const config = this.chartConfigs.find(c => c.id === configId);
        if (!config) return;

        const titleSection = chartItem.querySelector('.chart-title-section');
        if (titleSection) {
            titleSection.innerHTML = `
                <div class="chart-title-left">
                    <h4 class="chart-name">${config.name}</h4>
                    <span class="chart-type-badge">${this.getChartTypeName(config.type)}</span>
                </div>
                <div class="chart-actions">
                    <button class="btn-icon fullscreen-btn" data-config-id="${configId}" title="全屏查看">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                        </svg>
                    </button>
                </div>
            `;

            // 重新绑定全屏按钮事件
            const fullscreenBtn = titleSection.querySelector('.fullscreen-btn');
            if (fullscreenBtn) {
                fullscreenBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openFullscreenChart(configId);
                });
            }
        }
    }

    // 清空已生成的图表状态
    clearGeneratedCharts() {
        this.generatedChartIds.clear();
        this.renderCharts(); // 重新渲染以更新状态
    }
}

export default Charting;