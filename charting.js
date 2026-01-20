
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

        // 绑定拖拽事件
        this.bindDragEvents();
    }

    // 获取图表占位符文本
    getChartPlaceholderText(chartType) {
        const placeholderMap = {
            'line': '适合展示趋势变化，如网络成功率、响应时间',
            'bar': '适合展示分类对比，如错误类型分布、请求量统计',
            'pie': '适合展示比例分布，如状态码分布、用户类型占比',
            'doughnut': '适合展示比例分布，类似饼图但中心镂空',
            'radar': '适合展示多维数据对比，如综合能力评估',
            'polarArea': '适合展示极坐标分类数据',
            'scatter': '适合展示两个变量之间的关系分布',
            'bubble': '适合展示三个变量之间的关系（x, y, r）'
        };
        return placeholderMap[chartType] || '点击生成图表查看数据可视化';
    }

    // 获取图表类型名称
    getChartTypeName(type) {
        const typeMap = {
            'line': '折线图',
            'bar': '柱状图',
            'pie': '饼图',
            'doughnut': '甜甜圈图',
            'radar': '雷达图',
            'polarArea': '极地图',
            'scatter': '散点图',
            'bubble': '气泡图'
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

                if (result && result.datasets) {
                    // data.labels is optional for some chart types (like scatter/bubble usually imply x/y)
                    // but Chart.js usually expects structure. 
                    // Let's relax the check slightly or keep it but allow options.
                    resolve({
                        success: true,
                        data: result // result includes labels, datasets, and optional 'options'
                    });
                } else {
                    resolve({
                        success: false,
                        error: '脚本必须返回包含 datasets 字段的对象 (通常也需要 labels)'
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

        // 基础配置
        // 获取当前主题
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const zoomBgColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
        const zoomBorderColor = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)';

        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: isDark ? '#e0e0e0' : '#666'
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                },
                zoom: {
                    zoom: {
                        drag: {
                            enabled: true,
                            backgroundColor: zoomBgColor,
                            borderColor: zoomBorderColor,
                            borderWidth: 1
                        },
                        mode: 'x',
                    },
                    pan: {
                        enabled: false,
                        mode: 'x',
                    }
                }
            },
            layout: {
                padding: 10
            },
            scales: {
                x: {
                    grid: {
                        color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: isDark ? '#a0a0a0' : '#666'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: isDark ? '#a0a0a0' : '#666'
                    }
                }
            }
        };

        // 根据图表类型设置默认配置
        let typeSpecificOptions = {};
        switch (config.type) {
            case 'line':
            case 'bar':
                typeSpecificOptions = {
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    scales: {
                        x: { display: true },
                        y: { display: true, beginAtZero: true }
                    }
                };
                break;
            case 'pie':
            case 'doughnut':
            case 'polarArea':
                typeSpecificOptions = {
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const label = context.label || '';
                                    const value = context.parsed;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                };
                break;
            case 'radar':
                typeSpecificOptions = {
                    elements: { line: { tension: 0.1 } }
                };
                break;
            case 'scatter':
            case 'bubble':
                typeSpecificOptions = {
                    scales: {
                        x: {
                            type: 'linear',
                            position: 'bottom'
                        },
                        y: {
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        tooltip: {
                            mode: 'point'
                        }
                    }
                };
                break;
        }

        // 合并配置：基础配置 < 类型默认配置 < 脚本返回的高级配置
        const chartOptions = this.deepMerge(baseOptions, typeSpecificOptions);
        if (data.options) {
            this.deepMerge(chartOptions, data.options);
        }

        // 准备数据集
        const datasets = data.datasets.map((dataset, index) => {
            // 默认颜色池
            const colors = [
                'rgba(54, 162, 235, 1)',
                'rgba(255, 99, 132, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)'
            ];
            const bgColor = colors[index % colors.length].replace('1)', '0.2)');
            const borderColor = colors[index % colors.length];

            const defaultDatasetConfig = {
                label: dataset.label || `数据集 ${index + 1}`,
                borderWidth: 1,
                backgroundColor: bgColor,
                borderColor: borderColor,
            };

            // 根据类型微调默认样式
            if (config.type === 'line' || config.type === 'radar') {
                defaultDatasetConfig.borderWidth = 2;
                defaultDatasetConfig.fill = false; // 默认不填充
            }

            // 合并用户在dataset中定义的特定样式
            return {
                ...defaultDatasetConfig,
                ...dataset
            };
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

    // 辅助深度合并函数
    deepMerge(target, source) {
        for (const key in source) {
            if (source[key] instanceof Object && key in target) {
                Object.assign(source[key], this.deepMerge(target[key], source[key]));
            } else {
                target[key] = source[key];
            }
        }
        return target;
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

        // 绑定拖拽事件
        this.bindDragEvents();
    }

    // 绑定图表拖拽排序事件
    bindDragEvents() {
        const container = document.getElementById('chartsContainer');
        if (!container) return;

        let dragSrcEl = null;
        const items = container.querySelectorAll('.chart-item');

        const handleDragStart = (e) => {
            dragSrcEl = e.currentTarget;
            e.dataTransfer.effectAllowed = 'move';
            // 延迟添加样式
            setTimeout(() => e.target.classList.add('dragging'), 0);
        };

        const handleDragOver = (e) => {
            if (e.preventDefault) e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            return false;
        };

        const handleDragEnter = (e) => {
            const target = e.currentTarget;
            if (target !== dragSrcEl) {
                target.classList.add('drag-over');
            }
        };

        const handleDragLeave = (e) => {
            e.currentTarget.classList.remove('drag-over');
        };

        const handleDrop = (e) => {
            if (e.stopPropagation) e.stopPropagation();

            const target = e.currentTarget;
            if (dragSrcEl !== target) {
                const srcId = dragSrcEl.dataset.configId;
                const targetId = target.dataset.configId;

                // 在主配置数组中找到对应的索引
                const oldIndex = this.chartConfigs.findIndex(c => c.id == srcId);
                const newIndex = this.chartConfigs.findIndex(c => c.id == targetId);

                if (oldIndex !== -1 && newIndex !== -1) {
                    // 重新排序
                    const [movedItem] = this.chartConfigs.splice(oldIndex, 1);
                    this.chartConfigs.splice(newIndex, 0, movedItem);

                    // 保存配置
                    this.saveChartConfigs();

                    // 仅调整DOM顺序，不重新生成图表
                    this.reorderChartsDOM();
                }
            }
            return false;
        };

        const handleDragEnd = (e) => {
            e.target.classList.remove('dragging');
            items.forEach(item => item.classList.remove('drag-over'));
        };

        items.forEach(item => {
            // 确保是该元素本身开启拖拽
            item.setAttribute('draggable', 'true');
            item.addEventListener('dragstart', handleDragStart, false);
            item.addEventListener('dragenter', handleDragEnter, false);
            item.addEventListener('dragover', handleDragOver, false);
            item.addEventListener('dragleave', handleDragLeave, false);
            item.addEventListener('drop', handleDrop, false);
            item.addEventListener('dragend', handleDragEnd, false);
        });
    }

    // 根据配置顺序重新排列图表DOM元素 (保持Canvas状态)
    reorderChartsDOM() {
        const container = document.getElementById('chartsContainer');
        if (!container) return;

        const grid = container.querySelector('.charts-grid');
        if (!grid) return;

        const items = Array.from(grid.querySelectorAll('.chart-item'));
        const itemMap = new Map();
        items.forEach(item => {
            if (item.dataset.configId) {
                itemMap.set(item.dataset.configId, item);
            }
        });

        // 按照当前的chartConfigs顺序重新追加元素
        this.chartConfigs.forEach(config => {
            if (!config.enabled) return;
            const item = itemMap.get(config.id.toString());
            if (item) {
                grid.appendChild(item); // appendChild会将元素移动到最后，实现排序
            }
        });
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
    // 更新图表主题
    updateTheme(theme) {
        const isDark = theme === 'dark';
        const zoomBgColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
        const zoomBorderColor = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)';
        const textColor = isDark ? '#e0e0e0' : '#666';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        // 更新所有显示的图表
        const canvases = document.querySelectorAll('.chart-preview canvas');
        canvases.forEach(canvas => {
            if (canvas.chart) {
                const chart = canvas.chart;

                // 更新Zoom插件颜色
                if (chart.options.plugins && chart.options.plugins.zoom &&
                    chart.options.plugins.zoom.zoom && chart.options.plugins.zoom.zoom.drag) {
                    chart.options.plugins.zoom.zoom.drag.backgroundColor = zoomBgColor;
                    chart.options.plugins.zoom.zoom.drag.borderColor = zoomBorderColor;
                }

                // 更新坐标轴颜色
                if (chart.options.scales) {
                    ['x', 'y'].forEach(axis => {
                        if (chart.options.scales[axis]) {
                            if (chart.options.scales[axis].grid) {
                                chart.options.scales[axis].grid.color = gridColor;
                            }
                            if (chart.options.scales[axis].ticks) {
                                chart.options.scales[axis].ticks.color = textColor;
                            }
                        }
                    });
                }

                // 更新图例文字颜色
                if (chart.options.plugins && chart.options.plugins.legend && chart.options.plugins.legend.labels) {
                    chart.options.plugins.legend.labels.color = textColor;
                }

                chart.update('none'); // 无动画更新
            }
        });
    }
}

export default Charting;