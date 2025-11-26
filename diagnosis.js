// 问题诊断模块 - 负责问题诊断规则管理和自动诊断
class Diagnosis {
    constructor(core) {
        this.core = core;
        this.diagnosisResults = [];
        this.editingDiagnosisIndex = undefined;
        this._regexCache = new Map(); // 正则表达式缓存
    }

    // 初始化诊断模块
    initialize() {
        try {
            this.loadDiagnosisRules();
            this.initializeDiagnosisUI();
        } catch (error) {
            alert('诊断模块初始化出错: ' + error.message);
        }
    }

    // 初始化诊断UI - 恢复原始逻辑
    initializeDiagnosisUI() {
        // 修改右侧区域为标签页结构
        const investigationArea = document.getElementById('investigationArea');
        if (investigationArea) {
            investigationArea.innerHTML = `
                <div class="investigation-header">
                    <div class="investigation-tabs">
                        <button class="tab-btn active" data-tab="investigation">排查区</button>
                        <button class="tab-btn" data-tab="diagnosis">诊断区</button>
                        <button class="tab-btn" data-tab="charting">绘图区</button>
                    </div>
                    <div class="investigation-controls">
                        <button id="clearBtn" class="btn btn-small">清空</button>
                        <button id="exportBtn" class="btn btn-small">导出</button>
                        <button id="performDiagnosis" class="btn btn-small" style="display: none;">执行诊断</button>
                        <button id="generateChart" class="btn btn-small" style="display: none;">生成图表</button>
                    </div>
                </div>
                <div class="investigation-content">
                    <!-- 排查区内容 -->
                    <div class="tab-content active" data-tab="investigation">
                        <div id="investigationContent">
                            <div class="empty-state">
                                <p>暂无排查日志</p>
                                <p>右键日志行添加到排查区</p>
                            </div>
                        </div>
                    </div>
                    <!-- 诊断区内容 -->
                    <div class="tab-content" data-tab="diagnosis">
                        <div id="diagnosisContent">
                            <div class="empty-state">
                                <p>暂无诊断结果</p>
                                <p>点击"执行诊断"开始分析</p>
                            </div>
                        </div>
                    </div>
                    <!-- 绘图区内容 -->
                    <div class="tab-content" data-tab="charting">
                        <div class="charts-container" id="chartsContainer">
                            <div class="empty-state">
                                <p>暂无图表</p>
                                <p>请在配置面板中添加图表配置</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // 绑定标签页切换事件
            this.bindTabEvents();
            // 绑定诊断按钮事件
            this.bindDiagnosisEvents();

            // 确保默认显示排查区
            this.updateControlButtons('investigation');
        }
    }

    // 绑定标签页切换事件
    bindTabEvents() {
        const tabButtons = document.querySelectorAll('.investigation-tabs .tab-btn');
        const tabContents = document.querySelectorAll('.investigation-content .tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;

                // 更新按钮状态
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // 更新内容显示
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.dataset.tab === tabName) {
                        content.classList.add('active');
                    }
                });

                // 根据当前标签页更新控制按钮
                this.updateControlButtons(tabName);

                // 如果是诊断标签，显示诊断结果
                if (tabName === 'diagnosis') {
                    this.renderDiagnosisResults();
                }
                // 如果是绘图标签，显示图表
                else if (tabName === 'charting') {
                    if (this.core.charting && this.core.charting.renderCharts) {
                        this.core.charting.renderCharts();
                    }
                }
            });
        });
    }

    // 根据标签页更新控制按钮
    updateControlButtons(tabName) {
        const clearBtn = document.getElementById('clearBtn');
        const exportBtn = document.getElementById('exportBtn');
        const performDiagnosisBtn = document.getElementById('performDiagnosis');
        const generateChartBtn = document.getElementById('generateChart');

        if (tabName === 'investigation') {
            // 排查区：显示清空和导出按钮，隐藏其他按钮
            clearBtn.style.display = 'inline-block';
            exportBtn.style.display = 'inline-block';
            performDiagnosisBtn.style.display = 'none';
            generateChartBtn.style.display = 'none';

            // 更新按钮文本
            clearBtn.textContent = '清空';
            exportBtn.textContent = '导出';

            // 重新绑定事件
            this.bindInvestigationEvents();
        } else if (tabName === 'diagnosis') {
            // 诊断区：显示执行诊断、清空和导出按钮
            clearBtn.style.display = 'inline-block';
            exportBtn.style.display = 'inline-block';
            performDiagnosisBtn.style.display = 'inline-block';
            generateChartBtn.style.display = 'none';

            // 更新按钮文本
            clearBtn.textContent = '清空';
            exportBtn.textContent = '导出';

            // 重新绑定事件
            this.bindDiagnosisEvents();
        } else if (tabName === 'charting') {
            // 绘图区：显示生成图表按钮，隐藏其他按钮
            clearBtn.style.display = 'none';
            exportBtn.style.display = 'none';
            performDiagnosisBtn.style.display = 'none';
            generateChartBtn.style.display = 'inline-block';

            // 更新按钮文本
            generateChartBtn.textContent = '生成图表';

            // 重新绑定事件
            this.bindChartingEvents();
        }
    }

    // 绑定排查区事件
    bindInvestigationEvents() {
        const clearBtn = document.getElementById('clearBtn');
        const exportBtn = document.getElementById('exportBtn');

        // 移除之前的事件监听器
        clearBtn.replaceWith(clearBtn.cloneNode(true));
        exportBtn.replaceWith(exportBtn.cloneNode(true));

        // 重新获取元素
        const newClearBtn = document.getElementById('clearBtn');
        const newExportBtn = document.getElementById('exportBtn');

        // 绑定排查区清空事件
        newClearBtn.addEventListener('click', () => {
            this.core.clearInvestigation();
        });

        // 绑定排查区导出事件
        newExportBtn.addEventListener('click', () => {
            this.core.exportInvestigation();
        });
    }

    // 绑定诊断按钮事件
    bindDiagnosisEvents() {
        const performDiagnosisBtn = document.getElementById('performDiagnosis');
        const clearBtn = document.getElementById('clearBtn');
        const exportBtn = document.getElementById('exportBtn');

        // 移除之前的事件监听器
        performDiagnosisBtn.replaceWith(performDiagnosisBtn.cloneNode(true));
        clearBtn.replaceWith(clearBtn.cloneNode(true));
        exportBtn.replaceWith(exportBtn.cloneNode(true));

        // 重新获取元素
        const newPerformDiagnosisBtn = document.getElementById('performDiagnosis');
        const newClearBtn = document.getElementById('clearBtn');
        const newExportBtn = document.getElementById('exportBtn');

        // 绑定执行诊断事件
        newPerformDiagnosisBtn.addEventListener('click', () => {
            this.performDiagnosis();
        });

        // 绑定诊断区清空事件
        newClearBtn.addEventListener('click', () => {
            this.clearDiagnosisResults();
        });

        // 绑定诊断区导出事件
        newExportBtn.addEventListener('click', () => {
            this.exportDiagnosisResults();
        });
    }

    // 绑定绘图区事件
    bindChartingEvents() {
        const generateChartBtn = document.getElementById('generateChart');

        // 移除之前的事件监听器
        generateChartBtn.replaceWith(generateChartBtn.cloneNode(true));

        // 重新获取元素
        const newGenerateChartBtn = document.getElementById('generateChart');

        // 绑定生成图表事件
        newGenerateChartBtn.addEventListener('click', () => {
            if (this.core.charting && this.core.charting.generateAllCharts) {
                this.core.charting.generateAllCharts();
            }
        });
    }

    // 加载诊断规则
    loadDiagnosisRules() {
        const savedRules = localStorage.getItem('xlogAssist_diagnosisRules');
        if (savedRules && savedRules.trim() !== '') {
            this.core.diagnosisRules = JSON.parse(savedRules);
        } else {
            // 如果没有保存的规则，初始化为空数组
            this.core.diagnosisRules = [];
        }
    }

    // 保存诊断规则
    saveDiagnosisRules() {
        localStorage.setItem('xlogAssist_diagnosisRules', JSON.stringify(this.core.diagnosisRules));
    }

    // 执行问题诊断
    performDiagnosis() {
        this.diagnosisResults = [];

        if (this.core.logs.length === 0) {
            alert('没有日志数据');
            this.core.setStatus('请先上传日志文件', 'error');
            return;
        }

        // 对每条日志应用诊断规则
        this.core.logs.forEach((log, index) => {
            this.core.diagnosisRules.forEach(rule => {
                // 检查规则是否启用
                if (!rule.enabled) {
                    return; // 跳过禁用的规则
                }

                rule.patterns.forEach(pattern => {
                    try {
                        // 使用正则表达式缓存优化性能
                        let regex = this._regexCache.get(pattern);
                        if (!regex) {
                            regex = new RegExp(pattern, 'i');
                            this._regexCache.set(pattern, regex);
                        }

                        if (regex.test(log.content)) {
                            let customResult = null;

                            // 如果有自定义脚本，执行脚本处理
                            if (rule.customScript) {
                                try {
                                    customResult = this.executeCustomScript(rule.customScript, log.content, pattern);
                                } catch (error) {
                                    console.warn('自定义脚本执行错误:', error);
                                }
                            }

                            this.diagnosisResults.push({
                                ruleId: rule.id,
                                ruleName: rule.name,
                                description: rule.description,
                                severity: rule.severity,
                                category: rule.category,
                                solution: rule.solution,
                                logIndex: index,
                                logContent: log.content,
                                matchedPattern: pattern,
                                timestamp: new Date().toISOString(),
                                customResult: customResult
                            });
                        }
                    } catch (error) {
                        console.warn('诊断规则正则表达式错误:', pattern, error);
                    }
                });
            });
        });

        // 按原日志顺序和严重程度排序
        this.diagnosisResults.sort((a, b) => {
            // 首先按原日志顺序排序
            const logIndexDiff = a.logIndex - b.logIndex;

            // 如果同一行日志，按严重程度排序
            if (logIndexDiff === 0) {
                const severityOrder = { error: 0, warning: 1, info: 2 };
                return severityOrder[a.severity] - severityOrder[b.severity];
            }

            return logIndexDiff;
        });

        this.core.setStatus(`诊断完成，发现 ${this.diagnosisResults.length} 个问题`);
        this.renderDiagnosisResults();
        return this.diagnosisResults;
    }

    // 获取诊断结果统计
    getDiagnosisStats() {
        const stats = {
            total: this.diagnosisResults.length,
            bySeverity: {},
            byCategory: {}
        };

        this.diagnosisResults.forEach(result => {
            // 按严重程度统计
            stats.bySeverity[result.severity] = (stats.bySeverity[result.severity] || 0) + 1;

            // 按类别统计
            stats.byCategory[result.category] = (stats.byCategory[result.category] || 0) + 1;
        });

        return stats;
    }


    // 渲染诊断结果 - 按日志行分组显示
    renderDiagnosisResults() {
        const diagnosisContent = document.getElementById('diagnosisContent');
        if (!diagnosisContent) return;

        if (this.diagnosisResults.length === 0) {
            diagnosisContent.innerHTML = `
                <div class="empty-state">
                    <p>暂无诊断结果</p>
                    <p>点击"执行诊断"开始分析</p>
                </div>
            `;
            return;
        }

        // 按日志行分组诊断结果
        const groupedResults = this.groupDiagnosisResultsByLogLine();
        const stats = this.getDiagnosisStats();

        diagnosisContent.innerHTML = `
            <div class="diagnosis-stats">
                <div class="stats-grid">
                    <div class="stat-item" data-filter="all">
                        <span class="stat-value">${stats.total}</span>
                        <span class="stat-label">总问题数</span>
                    </div>
                    <div class="stat-item" data-filter="error">
                        <span class="stat-value">${stats.bySeverity.error || 0}</span>
                        <span class="stat-label">严重问题</span>
                    </div>
                    <div class="stat-item" data-filter="warning">
                        <span class="stat-value">${stats.bySeverity.warning || 0}</span>
                        <span class="stat-label">警告问题</span>
                    </div>
                    <div class="stat-item" data-filter="info">
                        <span class="stat-value">${stats.bySeverity.info || 0}</span>
                        <span class="stat-label">信息问题</span>
                    </div>
                </div>
            </div>
            <div class="diagnosis-list">
                ${groupedResults.map(group => `
                    <div class="diagnosis-group" data-log-index="${group.logIndex}">
                        <div class="diagnosis-group-header">
                            <div class="group-main-info">
                                <div class="group-title">
                                    <span class="log-line-number">第 ${group.logIndex + 1} 行</span>
                                    <span class="rule-count">${group.rules.length} 个匹配规则</span>
                                </div>
                                <div class="group-severity-stats">
                                    ${this.renderGroupSeverityBadges(group)}
                                </div>
                            </div>
                        </div>
                        <div class="diagnosis-rules-container">
                            ${group.rules.map(result => `
                                <div class="diagnosis-item severity-${result.severity}" data-log-index="${result.logIndex}" data-severity="${result.severity}">
                                    <div class="diagnosis-header">
                                        <span class="severity-badge">${result.severity}</span>
                                        <span class="diagnosis-title">${result.ruleName}</span>
                                        <span class="diagnosis-category">${result.category}</span>
                                    </div>
                                    <div class="diagnosis-description">${result.description}</div>
                                    ${result.solution ? `
                                    <div class="diagnosis-solution">
                                        <strong>解决方案:</strong> ${result.solution}
                                    </div>
                                    ` : ''}
                                    ${result.customResult ? `
                                    <div class="diagnosis-custom-result">
                                        <strong>自定义分析结果:</strong>
                                        <pre>${this.formatCustomResult(result.customResult)}</pre>
                                    </div>
                                    ` : ''}
                                    <div class="diagnosis-details">
                                        <span>匹配模式: ${result.matchedPattern}</span>
                                    </div>
                                    <div class="diagnosis-log-preview">
                                        <pre>${result.logContent}</pre>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // 绑定统计项点击事件
        this.bindStatsFilterEvents();

        // 默认选中"全部问题"
        this.updateStatsFilterStyle('all');

        // 绑定诊断项点击事件
        this.bindDiagnosisItemEvents();
    }

    // 按日志行分组诊断结果
    groupDiagnosisResultsByLogLine() {
        const groups = {};

        this.diagnosisResults.forEach(result => {
            const logIndex = result.logIndex;
            if (!groups[logIndex]) {
                groups[logIndex] = {
                    logIndex: logIndex,
                    logContent: result.logContent,
                    rules: []
                };
            }
            groups[logIndex].rules.push(result);
        });

        // 转换为数组并按日志行号排序
        return Object.values(groups).sort((a, b) => a.logIndex - b.logIndex);
    }

    // 渲染分组严重程度徽章
    renderGroupSeverityBadges(group) {
        const severityCounts = {};
        group.rules.forEach(result => {
            severityCounts[result.severity] = (severityCounts[result.severity] || 0) + 1;
        });

        return Object.entries(severityCounts).map(([severity, count]) =>
            `<span class="severity-badge severity-${severity}">${severity}(${count})</span>`
        ).join('');
    }

    // 绑定诊断项点击事件
    bindDiagnosisItemEvents() {
        const diagnosisItems = document.querySelectorAll('.diagnosis-item');
        diagnosisItems.forEach(item => {
            item.addEventListener('click', () => {
                const logIndex = parseInt(item.dataset.logIndex);
                if (!isNaN(logIndex)) {
                    // 跳转到原日志行
                    this.core.selectLine(logIndex);
                    // 滚动到选中行 - 兼容Monaco和传统渲染器
                    if (this.core.scrollToLine) {
                        this.core.scrollToLine(logIndex);
                    } else {
                        // 使用Monaco渲染器的滚动方式
                        if (this.core.monacoRenderer) {
                            this.core.monacoRenderer.scrollToLine(logIndex);
                        }
                    }
                }
            });
        });
    }

    // 添加诊断规则
    addDiagnosisRule(rule) {
        if (this.editingDiagnosisIndex !== undefined) {
            // 编辑模式：更新现有规则
            this.core.diagnosisRules[this.editingDiagnosisIndex] = rule;
            delete this.editingDiagnosisIndex;
            this.core.setStatus('诊断规则更新成功');
        } else {
            // 添加模式：添加新规则
            rule.id = rule.id || `rule_${Date.now()}`;
            this.core.diagnosisRules.push(rule);
            this.core.setStatus('诊断规则添加成功');
        }
        this.saveDiagnosisRules();
    }

    // 更新诊断规则
    updateDiagnosisRule(ruleId, updatedRule) {
        const index = this.core.diagnosisRules.findIndex(rule => rule.id === ruleId);
        if (index !== -1) {
            this.core.diagnosisRules[index] = { ...this.core.diagnosisRules[index], ...updatedRule };
            this.saveDiagnosisRules();
            this.core.setStatus('诊断规则更新成功');
        }
    }

    // 删除诊断规则
    deleteDiagnosisRule(ruleId) {
        const index = this.core.diagnosisRules.findIndex(rule => rule.id === ruleId);
        if (index !== -1) {
            this.core.diagnosisRules.splice(index, 1);
            this.saveDiagnosisRules();
            this.core.setStatus('诊断规则删除成功');
        }
    }

    // 导出诊断规则
    exportDiagnosisRules() {
        const exportData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            diagnosisRules: this.core.diagnosisRules
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `xlogassist-diagnosis-rules-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.core.setStatus('诊断规则导出成功');
    }

    // 导入诊断规则
    importDiagnosisRules(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target.result);

                if (!importData.diagnosisRules) {
                    throw new Error('无效的诊断规则文件格式');
                }

                // 合并诊断规则
                importData.diagnosisRules.forEach(newRule => {
                    const existingIndex = this.core.diagnosisRules.findIndex(rule => rule.id === newRule.id);
                    if (existingIndex === -1) {
                        this.core.diagnosisRules.push(newRule);
                    } else {
                        // 更新现有规则
                        this.core.diagnosisRules[existingIndex] = newRule;
                    }
                });

                this.saveDiagnosisRules();
                this.core.setStatus('诊断规则导入成功');
            } catch (error) {
                alert('导入诊断规则失败: ' + error.message);
                this.core.setStatus('诊断规则导入失败', 'error');
            }
        };
        reader.readAsText(file);
    }

    // 清空诊断结果
    clearDiagnosisResults() {
        this.diagnosisResults = [];
        this._regexCache.clear(); // 清空正则表达式缓存
        this.renderDiagnosisResults();
        this.core.setStatus('诊断结果已清空');
    }

    // 导出诊断结果
    exportDiagnosisResults() {
        if (this.diagnosisResults.length === 0) {
            this.core.setStatus('暂无诊断结果可导出', 'error');
            return;
        }

        const exportData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            diagnosisResults: this.diagnosisResults,
            stats: this.getDiagnosisStats()
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `xlogassist-diagnosis-results-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.core.setStatus('诊断结果导出成功');
    }


    // 执行自定义脚本
    executeCustomScript(script, logContent, matchedPattern) {
        try {
            // 创建安全的执行环境
            const safeFunctions = {
                console: {
                    log: (...args) => console.log('[Custom Script]', ...args),
                    warn: (...args) => console.warn('[Custom Script]', ...args),
                    error: (...args) => console.error('[Custom Script]', ...args)
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
                logContent: logContent,
                matchedPattern: matchedPattern,
                ...safeFunctions
            };

            // 使用Function构造函数创建安全的函数
            const func = new Function(...Object.keys(context), `
                try {
                    ${script}
                } catch (error) {
                    return { error: error.message };
                }
            `);

            // 执行脚本
            const result = func(...Object.values(context));
            return result;
        } catch (error) {
            return { error: error.message };
        }

    }

    // 绑定统计项点击事件
    bindStatsFilterEvents() {
        const statItems = document.querySelectorAll('.diagnosis-stats .stat-item');
        statItems.forEach(item => {
            item.addEventListener('click', () => {
                const filter = item.dataset.filter;
                this.filterDiagnosisResults(filter);
            });
        });
    }

    // 过滤诊断结果 - 支持分组显示
    filterDiagnosisResults(severityFilter) {
        const diagnosisGroups = document.querySelectorAll('.diagnosis-group');

        diagnosisGroups.forEach(group => {
            if (severityFilter === 'all') {
                // 显示所有分组
                group.style.display = 'block';
                // 显示分组内所有项目
                const groupItems = group.querySelectorAll('.diagnosis-item');
                groupItems.forEach(item => item.style.display = 'block');
            } else {
                // 根据严重程度过滤分组
                const groupItems = group.querySelectorAll('.diagnosis-item');
                let hasMatchingItem = false;

                groupItems.forEach(item => {
                    const itemSeverity = item.dataset.severity;
                    if (itemSeverity === severityFilter) {
                        hasMatchingItem = true;
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });

                // 如果分组中有匹配的项目，显示整个分组
                if (hasMatchingItem) {
                    group.style.display = 'block';
                } else {
                    group.style.display = 'none';
                }
            }
        });

        // 更新统计项样式
        this.updateStatsFilterStyle(severityFilter);
    }

    // 更新统计项过滤样式
    updateStatsFilterStyle(activeFilter) {
        const statItems = document.querySelectorAll('.diagnosis-stats .stat-item');
        statItems.forEach(item => {
            if (item.dataset.filter === activeFilter) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // 格式化自定义结果
    formatCustomResult(customResult) {
        if (!customResult || customResult.error) {
            return JSON.stringify(customResult, null, 2);
        }

        return JSON.stringify(customResult, null, 2);
    }
}

export default Diagnosis;