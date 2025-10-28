// 问题诊断模块 - 负责问题诊断规则管理和自动诊断
class Diagnosis {
    constructor(core) {
        this.core = core;
        this.diagnosisResults = [];
        this.editingDiagnosisIndex = undefined;
    }

    // 初始化诊断模块
    initialize() {
        this.loadDiagnosisRules();
        this.initializeDiagnosisUI();
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
            this.core.setStatus('请先上传日志文件', 'error');
            return;
        }

        // 对每条日志应用诊断规则
        this.core.logs.forEach((log, index) => {
            this.core.diagnosisRules.forEach(rule => {
                rule.patterns.forEach(pattern => {
                    try {
                        const regex = new RegExp(pattern, 'i');
                        if (regex.test(log.content)) {
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
                                timestamp: new Date().toISOString()
                            });
                        }
                    } catch (error) {
                        console.warn('诊断规则正则表达式错误:', pattern, error);
                    }
                });
            });
        });

        // 按严重程度排序
        this.diagnosisResults.sort((a, b) => {
            const severityOrder = { error: 0, warning: 1, info: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
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

    // 初始化诊断UI
    initializeDiagnosisUI() {
        // 修改右侧区域为标签页结构
        const investigationArea = document.getElementById('investigationArea');
        if (investigationArea) {
            investigationArea.innerHTML = `
                <div class="investigation-header">
                    <div class="investigation-tabs">
                        <button class="tab-btn active" data-tab="investigation">排查区</button>
                        <button class="tab-btn" data-tab="diagnosis">诊断区</button>
                    </div>
                    <div class="investigation-controls">
                        <button id="clearBtn" class="btn btn-small">清空</button>
                        <button id="exportBtn" class="btn btn-small">导出</button>
                        <button id="performDiagnosis" class="btn btn-small" style="display: none;">执行诊断</button>
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
                </div>
            `;

            // 绑定标签页切换事件
            this.bindTabEvents();
            // 绑定诊断按钮事件
            this.bindDiagnosisEvents();
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
            });
        });
    }

    // 根据标签页更新控制按钮
    updateControlButtons(tabName) {
        const clearBtn = document.getElementById('clearBtn');
        const exportBtn = document.getElementById('exportBtn');
        const performDiagnosisBtn = document.getElementById('performDiagnosis');

        if (tabName === 'investigation') {
            // 排查区：显示清空和导出按钮，隐藏执行诊断按钮
            clearBtn.style.display = 'inline-block';
            exportBtn.style.display = 'inline-block';
            performDiagnosisBtn.style.display = 'none';
            
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
            
            // 更新按钮文本
            clearBtn.textContent = '清空';
            exportBtn.textContent = '导出';
            
            // 重新绑定事件
            this.bindDiagnosisEvents();
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

    // 渲染诊断结果
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

        const stats = this.getDiagnosisStats();
        diagnosisContent.innerHTML = `
            <div class="diagnosis-stats">
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-value">${stats.total}</span>
                        <span class="stat-label">总问题数</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${stats.bySeverity.error || 0}</span>
                        <span class="stat-label">严重问题</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${stats.bySeverity.warning || 0}</span>
                        <span class="stat-label">警告问题</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${stats.bySeverity.info || 0}</span>
                        <span class="stat-label">信息问题</span>
                    </div>
                </div>
            </div>
            <div class="diagnosis-list">
                ${this.diagnosisResults.map(result => `
                    <div class="diagnosis-item severity-${result.severity}" data-log-index="${result.logIndex}">
                        <div class="diagnosis-header">
                            <span class="severity-badge">${result.severity}</span>
                            <span class="diagnosis-title">${result.ruleName}</span>
                            <span class="diagnosis-category">${result.category}</span>
                        </div>
                        <div class="diagnosis-description">${result.description}</div>
                        <div class="diagnosis-solution">
                            <strong>解决方案:</strong> ${result.solution}
                        </div>
                        <div class="diagnosis-details">
                            <span>匹配模式: ${result.matchedPattern}</span>
                            <span>日志行: ${result.logIndex + 1}</span>
                        </div>
                        <div class="diagnosis-log">
                            <pre>${result.logContent}</pre>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // 绑定诊断项点击事件
        this.bindDiagnosisItemEvents();
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
                    // 滚动到选中行
                    const lineElement = this.core.logContent.querySelector(`[data-index="${logIndex}"]`);
                    if (lineElement) {
                        lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

    // 渲染诊断规则列表（用于配置面板）
    renderDiagnosisRulesList() {
        const container = document.getElementById('diagnosisRulesList');
        if (!container) return;

        if (this.core.diagnosisRules.length === 0) {
            container.innerHTML = '<h4>当前诊断规则:</h4><div class="empty-diagnosis-rules">暂无诊断规则</div>';
            return;
        }

        container.innerHTML = '<h4>当前诊断规则:</h4>';
        
        this.core.diagnosisRules.forEach((rule, index) => {
            const ruleElement = document.createElement('div');
            ruleElement.className = 'diagnosis-rule-item';
            ruleElement.innerHTML = `
                <div class="diagnosis-rule-content">
                    <div class="diagnosis-rule-header">
                        <span class="diagnosis-rule-name">${rule.name}</span>
                        <span class="diagnosis-rule-severity severity-${rule.severity}">${rule.severity}</span>
                    </div>
                    <div class="diagnosis-rule-description">${rule.description}</div>
                    <div class="diagnosis-rule-patterns">
                        <strong>匹配模式:</strong> ${rule.patterns.join(', ')}
                    </div>
                    <div class="diagnosis-rule-category">
                        <strong>类别:</strong> ${rule.category}
                    </div>
                </div>
                <div class="diagnosis-rule-actions">
                    <button class="edit-diagnosis-rule" data-index="${index}">编辑</button>
                    <button class="delete-diagnosis-rule" data-index="${index}">删除</button>
                </div>
            `;
            container.appendChild(ruleElement);
        });

        // 绑定诊断规则操作事件
        this.bindDiagnosisRuleActionEvents();
    }

    // 绑定诊断规则操作事件
    bindDiagnosisRuleActionEvents() {
        const container = document.getElementById('diagnosisRulesList');
        if (!container) return;

        container.querySelectorAll('.edit-diagnosis-rule').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.editDiagnosisRule(index);
            });
        });

        container.querySelectorAll('.delete-diagnosis-rule').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.deleteDiagnosisRule(this.core.diagnosisRules[index].id);
                this.renderDiagnosisRulesList();
            });
        });
    }

    // 编辑诊断规则
    editDiagnosisRule(index) {
        const rule = this.core.diagnosisRules[index];
        
        // 填充表单
        document.getElementById('diagnosisRuleName').value = rule.name;
        document.getElementById('diagnosisRuleDescription').value = rule.description;
        document.getElementById('diagnosisRulePatterns').value = rule.patterns.join('\n');
        document.getElementById('diagnosisRuleSeverity').value = rule.severity;
        document.getElementById('diagnosisRuleCategory').value = rule.category;
        document.getElementById('diagnosisRuleSolution').value = rule.solution;

        // 保存当前编辑的规则索引
        this.editingDiagnosisIndex = index;
        
        // 更改按钮文字
        document.getElementById('addDiagnosisRule').textContent = '更新规则';
        
        this.core.setStatus('诊断规则已加载到编辑表单，修改后点击"更新规则"');
    }
}

export default Diagnosis;