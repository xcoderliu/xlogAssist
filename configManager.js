// 配置管理模块 - 负责正则规则和配置组管理
class ConfigManager {
    constructor(core) {
        this.core = core;
    }

    // 显示配置面板
    showConfigPanel() {
        this.core.configPanel.style.display = 'block';
        this.renderRulesList();
        this.renderChartConfigsList();
    }

    // 隐藏配置面板
    hideConfigPanel() {
        this.core.configPanel.style.display = 'none';
    }

    // 添加正则规则
    addRegexRule() {
        const pattern = document.getElementById('regexPattern').value.trim();
        const color = document.getElementById('regexColor').value;
        const bgColor = document.getElementById('regexBgColor').value;
        const highlightWholeLine = document.getElementById('highlightWholeLine').checked;

        if (!pattern) {
            alert('请输入正则表达式');
            return;
        }

        try {
            // 测试正则表达式是否有效
            new RegExp(pattern, 'gi');

            const newRule = { pattern, color, bgColor, highlightWholeLine };

            if (this.core.editingIndex !== undefined) {
                // 编辑模式：替换原有规则
                const oldRuleId = this.core.getRuleId(this.core.regexRules[this.core.editingIndex]);
                this.core.regexRules[this.core.editingIndex] = newRule;

                // 更新配置组中的规则引用
                this.updateGroupRuleReferences(oldRuleId, this.core.getRuleId(newRule));

                delete this.core.editingIndex;
                this.core.setStatus('规则更新成功');
            } else {
                // 添加模式：添加新规则
                this.core.regexRules.push(newRule);
                this.core.setStatus('规则添加成功');
            }

            this.core.saveConfig();
            this.renderRulesList();
            if (this.core.renderLogs) {
                this.core.renderLogs(); // 重新渲染以应用新规则
            }
            // 修复：规则变化时重新渲染排查区
            if (this.core.renderInvestigationLogs) {
                this.core.renderInvestigationLogs();
            }
            // 强制刷新高亮（如果正在使用Monaco）
            if (this.core.currentRenderer === this.core.monacoRenderer && this.core.currentRenderer.refreshHighlighting) {
                this.core.currentRenderer.refreshHighlighting();
            }

            // 清空表单并重置按钮文字
            document.getElementById('regexPattern').value = '';
            document.getElementById('regexColor').value = '#ff4444';
            document.getElementById('regexBgColor').value = '#ffffff';
            document.getElementById('highlightWholeLine').checked = false;
            document.getElementById('addRegexRule').textContent = '添加规则';

        } catch (error) {
            alert('正则表达式无效: ' + error.message);
        }
    }

    // 更新配置组中的规则引用
    updateGroupRuleReferences(oldRuleId, newRuleId) {
        // 更新所有配置组中的规则引用
        this.core.configGroups.forEach(group => {
            const index = group.ruleIds.indexOf(oldRuleId);
            if (index !== -1) {
                group.ruleIds[index] = newRuleId;
            }
        });
    }

    // 渲染规则列表
    renderRulesList() {
        const rulesList = document.getElementById('rulesList');
        rulesList.innerHTML = '<h4>当前规则:</h4>';

        if (this.core.regexRules.length === 0) {
            rulesList.innerHTML += '<div class="empty-rules">暂无规则</div>';
            return;
        }

        this.core.regexRules.forEach((rule, index) => {
            const ruleElement = document.createElement('div');
            ruleElement.className = 'rule-item';
            ruleElement.innerHTML = `
                <div style="display: flex; align-items: center; flex-wrap: wrap;">
                    <div class="rule-preview" style="background: ${rule.bgColor}; color: ${rule.color}; display: flex; align-items: center; justify-content: center; font-weight: bold;">A</div>
                    <span class="rule-text">${rule.pattern}</span>
                    ${rule.highlightWholeLine ? '<span style="font-size: 12px; color: #666; margin-left: 8px;">(整行)</span>' : ''}
                </div>
                <div>
                    <button class="edit-rule" data-index="${index}" style="background: #28a745; margin-right: 5px;">编辑</button>
                    <button class="delete-rule" data-index="${index}">删除</button>
                </div>
            `;
            rulesList.appendChild(ruleElement);
        });

        // 绑定编辑事件
        rulesList.querySelectorAll('.edit-rule').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.editRule(index);
            });
        });

        // 绑定删除事件
        rulesList.querySelectorAll('.delete-rule').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.deleteRule(index, e);
            });
        });
    }

    // 编辑规则
    editRule(index) {
        const rule = this.core.regexRules[index];

        // 填充表单
        document.getElementById('regexPattern').value = rule.pattern;
        document.getElementById('regexColor').value = rule.color;
        document.getElementById('regexBgColor').value = rule.bgColor;
        document.getElementById('highlightWholeLine').checked = rule.highlightWholeLine;

        // 保存当前编辑的规则索引，用于后续替换
        this.core.editingIndex = index;

        // 更改按钮文字为"更新规则"
        document.getElementById('addRegexRule').textContent = '更新规则';

        this.core.setStatus('规则已加载到编辑表单，修改后点击"更新规则"');
    }

    // 删除规则
    deleteRule(index, event) {
        if (confirm('确定要删除这个规则吗？')) {
            const ruleToDelete = this.core.regexRules[index];
            const ruleIdToDelete = this.core.getRuleId(ruleToDelete);

            // 从所有配置组中移除这个规则的引用
            this.core.configGroups.forEach(group => {
                const ruleIndex = group.ruleIds.indexOf(ruleIdToDelete);
                if (ruleIndex !== -1) {
                    group.ruleIds.splice(ruleIndex, 1);
                }
            });

            this.core.regexRules.splice(index, 1);
            this.core.saveConfig();
            this.renderRulesList();
            this.renderGroupsList(); // 更新配置组列表显示
            if (this.core.renderLogs) {
                this.core.renderLogs();
            }
            // 修复：规则删除时重新渲染排查区
            if (this.core.renderInvestigationLogs) {
                this.core.renderInvestigationLogs();
            }
            // 强制刷新高亮（如果正在使用Monaco）
            if (this.core.currentRenderer === this.core.monacoRenderer && this.core.currentRenderer.refreshHighlighting) {
                this.core.currentRenderer.refreshHighlighting();
            }
            this.core.setStatus('规则已删除');
        }
    }

    // 创建配置组
    createConfigGroup() {
        const groupName = this.core.groupNameInput.value.trim();

        if (!groupName) {
            alert('请输入配置组名称');
            return;
        }

        if (this.core.configGroups.some(group => group.name === groupName)) {
            alert('配置组名称已存在');
            return;
        }

        this.core.configGroups.push({
            id: Date.now().toString(),
            name: groupName,
            ruleIds: []
        });

        this.core.saveConfig();
        this.core.groupNameInput.value = '';
        this.renderGroupsList();
        this.renderGroupSelection(); // 更新选择生效的配置组
        this.core.setStatus('配置组创建成功');
    }

    // 渲染配置组列表
    renderGroupsList() {
        const groupsList = document.getElementById('groupsList');
        groupsList.innerHTML = '<h4>配置组列表:</h4>';

        if (this.core.configGroups.length === 0) {
            groupsList.innerHTML += '<div class="empty-groups">暂无配置组</div>';
            return;
        }

        this.core.configGroups.forEach((group, index) => {
            const groupElement = document.createElement('div');
            groupElement.className = 'group-item';
            groupElement.innerHTML = `
                <div>
                    <span class="group-name">${group.name}</span>
                    <span class="group-rules-count">(${group.ruleIds.length} 条规则)</span>
                </div>
                <div class="group-controls">
                    <button class="edit-rule" data-group-index="${index}">编辑</button>
                    <button class="delete-rule" data-group-index="${index}">删除</button>
                </div>
            `;
            groupsList.appendChild(groupElement);
        });

        // 绑定配置组操作事件
        groupsList.querySelectorAll('.edit-rule').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.groupIndex);
                this.editConfigGroup(index);
            });
        });

        groupsList.querySelectorAll('.delete-rule').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.groupIndex);
                this.deleteConfigGroup(index, e);
            });
        });
    }

    // 渲染配置组选择
    renderGroupSelection() {
        const groupSelection = document.getElementById('groupSelection');
        this.core.groupCheckboxes.innerHTML = '';

        if (this.core.configGroups.length === 0) {
            groupSelection.style.display = 'none';
            return;
        }

        groupSelection.style.display = 'block';

        this.core.configGroups.forEach((group, index) => {
            const checkboxItem = document.createElement('div');
            checkboxItem.className = 'group-checkbox-item';
            checkboxItem.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <input type="checkbox" id="group-${group.id}" value="${group.id}"
                                   ${this.core.activeGroups.has(group.id) ? 'checked' : ''}>
                            <label for="group-${group.id}">${group.name}</label>
                        </div>
                        <div style="display: flex; align-items: center; gap: 4px; margin-left: 20px;">
                            <input type="checkbox" id="filter-${group.id}" value="${group.id}"
                                   ${this.core.filterGroups.has(group.id) ? 'checked' : ''}>
                            <label for="filter-${group.id}" style="font-size: 12px; color: #666;">过滤日志</label>
                        </div>
                    </div>
                </div>
            `;
            this.core.groupCheckboxes.appendChild(checkboxItem);
        });

        // 绑定激活配置组复选框变化事件
        this.core.groupCheckboxes.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            if (checkbox.id.startsWith('group-')) {
                checkbox.addEventListener('change', (e) => {
                    const groupId = e.target.value;
                    if (e.target.checked) {
                        this.core.activeGroups.add(groupId);
                    } else {
                        this.core.activeGroups.delete(groupId);
                        // 如果取消激活，同时取消过滤
                        this.core.filterGroups.delete(groupId);
                        // 更新对应的过滤复选框状态
                        const filterCheckbox = document.getElementById(`filter-${groupId}`);
                        if (filterCheckbox) {
                            filterCheckbox.checked = false;
                        }
                    }
                    this.core.saveConfig();
                    if (this.core.renderLogs) {
                        this.core.renderLogs();
                    }
                    // 修复：配置组变化时重新渲染排查区
                    if (this.core.renderInvestigationLogs) {
                        this.core.renderInvestigationLogs();
                    }
                    // 强制刷新高亮（如果正在使用Monaco）
                    if (this.core.currentRenderer === this.core.monacoRenderer && this.core.currentRenderer.refreshHighlighting) {
                        this.core.currentRenderer.refreshHighlighting();
                    }
                    this.core.setStatus('配置组已更新');
                });
            }
        });

        // 绑定过滤配置组复选框变化事件
        this.core.groupCheckboxes.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            if (checkbox.id.startsWith('filter-')) {
                checkbox.addEventListener('change', (e) => {
                    const groupId = e.target.value;
                    if (e.target.checked) {
                        // 确保配置组已激活
                        this.core.activeGroups.add(groupId);
                        this.core.filterGroups.add(groupId);
                        // 更新对应的激活复选框状态
                        const groupCheckbox = document.getElementById(`group-${groupId}`);
                        if (groupCheckbox) {
                            groupCheckbox.checked = true;
                        }
                    } else {
                        this.core.filterGroups.delete(groupId);
                    }
                    this.core.saveConfig();
                    if (this.core.renderLogs) {
                        this.core.renderLogs();
                    }
                    this.core.setStatus('过滤设置已更新');
                });
            }
        });
    }

    // 编辑配置组
    editConfigGroup(index) {
        const group = this.core.configGroups[index];
        this.openGroupRulesManager(group.id);
    }

    // 删除配置组
    deleteConfigGroup(index, event) {
        if (confirm('确定要删除这个配置组吗？')) {
            const group = this.core.configGroups[index];
            this.core.activeGroups.delete(group.id);
            this.core.filterGroups.delete(group.id); // 新增：清理过滤配置组
            this.core.configGroups.splice(index, 1);
            this.core.saveConfig();
            this.renderGroupsList();
            this.renderGroupSelection();
            this.core.setStatus('配置组已删除');
        }
    }

    // 打开配置组规则管理界面
    openGroupRulesManager(groupId) {
        const group = this.core.configGroups.find(g => g.id === groupId);
        if (!group) return;

        const modal = document.getElementById('groupRulesModal');
        const title = modal.querySelector('.modal-title');
        const content = modal.querySelector('.modal-body');

        title.textContent = `管理配置组: ${group.name}`;

        // 构建规则管理界面
        content.innerHTML = `
            <div class="group-rules-manager">
                <h4>已添加的规则</h4>
                <div id="groupRulesList" class="group-rules-list"></div>
                
                <h4>添加规则到配置组</h4>
                <div id="availableRulesList" class="available-rules-list"></div>
                
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="document.getElementById('groupRulesModal').style.display='none'">关闭</button>
                </div>
            </div>
        `;

        // 渲染已添加的规则
        this.renderGroupRulesList(group);

        // 渲染可用的规则
        this.renderAvailableRulesList(group);

        modal.style.display = 'block';

        // 绑定配置组规则操作事件
        this.bindGroupRuleEvents();
    }

    // 渲染配置组中的规则列表
    renderGroupRulesList(group) {
        const container = document.getElementById('groupRulesList');
        if (!container) return;

        if (group.ruleIds.length === 0) {
            container.innerHTML = '<p class="text-muted">暂无规则</p>';
            return;
        }

        container.innerHTML = group.ruleIds.map(ruleId => {
            const rule = this.core.regexRules.find(r => this.core.getRuleId(r) === ruleId);
            if (!rule) return '';

            return `
                <div class="group-rule-item" data-rule-id="${ruleId}">
                    <div class="rule-preview" style="color:${rule.color}; background-color:${rule.bgColor}">
                        ${rule.pattern}
                    </div>
                    <button class="btn btn-sm btn-danger remove-group-rule" data-group-id="${group.id}" data-rule-id="${ruleId}">
                        移除
                    </button>
                </div>
            `;
        }).join('');
    }

    // 渲染可用的规则列表
    renderAvailableRulesList(group) {
        const container = document.getElementById('availableRulesList');
        if (!container) return;

        const availableRules = this.core.regexRules.filter(rule => {
            const ruleId = this.core.getRuleId(rule);
            return !group.ruleIds.includes(ruleId);
        });

        if (availableRules.length === 0) {
            container.innerHTML = '<p class="text-muted">暂无可用规则</p>';
            return;
        }

        container.innerHTML = availableRules.map(rule => {
            const ruleId = this.core.getRuleId(rule);
            return `
                <div class="available-rule-item" data-rule-id="${ruleId}">
                    <div class="rule-preview" style="color:${rule.color}; background-color:${rule.bgColor}">
                        ${rule.pattern}
                    </div>
                    <button class="btn btn-sm btn-primary add-group-rule" data-group-id="${group.id}" data-rule-id="${ruleId}">
                        添加
                    </button>
                </div>
            `;
        }).join('');
    }

    // 添加规则到配置组
    addRuleToGroup(groupId, ruleId) {
        const group = this.core.configGroups.find(g => g.id === groupId);
        if (!group) return;

        // 检查规则是否已经存在
        if (group.ruleIds.includes(ruleId)) {
            this.core.setStatus('规则已存在于配置组中');
            return;
        }

        group.ruleIds.push(ruleId);
        this.core.saveConfig();
        this.renderGroupRulesList(group);
        this.renderAvailableRulesList(group);
        this.renderGroupsList(); // 更新配置组列表显示
        // 修复：配置组规则变化时重新渲染排查区
        if (this.core.renderInvestigationLogs) {
            this.core.renderInvestigationLogs();
        }
        this.core.setStatus('规则已添加到配置组');
    }

    // 绑定配置组规则操作事件
    bindGroupRuleEvents() {
        const modal = document.getElementById('groupRulesModal');
        if (!modal) return;

        // 使用事件委托处理添加规则按钮点击
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-group-rule')) {
                const groupId = e.target.dataset.groupId;
                const ruleId = e.target.dataset.ruleId;
                this.addRuleToGroup(groupId, ruleId);
            } else if (e.target.classList.contains('remove-group-rule')) {
                const groupId = e.target.dataset.groupId;
                const ruleId = e.target.dataset.ruleId;
                this.removeRuleFromGroup(groupId, ruleId);
            }
        });
    }

    // 从配置组移除规则
    removeRuleFromGroup(groupId, ruleId) {
        const group = this.core.configGroups.find(g => g.id === groupId);
        if (!group) return;

        const index = group.ruleIds.indexOf(ruleId);
        if (index !== -1) {
            group.ruleIds.splice(index, 1);
            this.core.saveConfig();
            this.renderGroupRulesList(group);
            this.renderAvailableRulesList(group);
            this.renderGroupsList(); // 更新配置组列表显示
            // 修复：配置组规则变化时重新渲染排查区
            if (this.core.renderInvestigationLogs) {
                this.core.renderInvestigationLogs();
            }
            this.core.setStatus('规则已从配置组移除');
        }
    }

    // 导出配置
    exportConfig() {
        const configData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            regexRules: this.core.regexRules,
            configGroups: this.core.configGroups,
            activeGroups: Array.from(this.core.activeGroups),
            filterGroups: Array.from(this.core.filterGroups), // 新增：导出过滤配置组
            diagnosisRules: this.core.diagnosisRules, // 新增：导出诊断规则
            chartConfigs: this.core.charting ? this.core.charting.chartConfigs : [] // 新增：导出图表配置
        };

        const jsonString = JSON.stringify(configData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `xlogassist-config-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.core.setStatus('配置导出成功');
    }

    // 导入配置
    importConfig(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const configData = JSON.parse(e.target.result);

                // 验证配置数据格式
                if (!configData.regexRules || !configData.configGroups) {
                    throw new Error('无效的配置文件格式');
                }

                // 合并配置
                this.mergeConfig(configData);

                // 导入过滤配置组（如果存在）
                if (configData.filterGroups) {
                    this.core.filterGroups = new Set(configData.filterGroups);
                }

                // 导入诊断规则（如果存在）
                if (configData.diagnosisRules) {
                    this.mergeDiagnosisRules(configData.diagnosisRules);
                    // 立即保存诊断规则到localStorage
                    localStorage.setItem('xlogAssist_diagnosisRules', JSON.stringify(this.core.diagnosisRules));
                }

                // 导入图表配置（如果存在）
                if (configData.chartConfigs && this.core.charting) {
                    this.mergeChartConfigs(configData.chartConfigs);
                }

                this.core.saveConfig();
                this.renderRulesList();
                this.renderGroupsList();
                this.renderGroupSelection();
                this.renderDiagnosisRulesList();
                this.renderChartConfigsList();

                if (this.core.renderLogs) {
                    this.core.renderLogs();
                }

                this.core.setStatus('配置导入成功');
            } catch (error) {
                alert('导入配置失败: ' + error.message);
                this.core.setStatus('配置导入失败', 'error');
            }
        };
        reader.readAsText(file);
    }

    // 合并配置数据
    mergeConfig(configData) {
        // 合并正则规则
        configData.regexRules.forEach(newRule => {
            const existingIndex = this.core.regexRules.findIndex(rule =>
                rule.pattern === newRule.pattern &&
                rule.color === newRule.color &&
                rule.bgColor === newRule.bgColor
            );

            if (existingIndex === -1) {
                this.core.regexRules.push(newRule);
            }
        });

        // 合并配置组
        configData.configGroups.forEach(newGroup => {
            const existingIndex = this.core.configGroups.findIndex(group =>
                group.name === newGroup.name
            );

            if (existingIndex === -1) {
                this.core.configGroups.push(newGroup);
            } else {
                // 合并规则ID
                const existingGroup = this.core.configGroups[existingIndex];
                newGroup.ruleIds.forEach(ruleId => {
                    if (!existingGroup.ruleIds.includes(ruleId)) {
                        existingGroup.ruleIds.push(ruleId);
                    }
                });
            }
        });
    }

    // 合并诊断规则
    mergeDiagnosisRules(diagnosisRules) {
        diagnosisRules.forEach(newRule => {
            const existingIndex = this.core.diagnosisRules.findIndex(rule => rule.id === newRule.id);
            if (existingIndex === -1) {
                this.core.diagnosisRules.push(newRule);
            } else {
                // 更新现有规则
                this.core.diagnosisRules[existingIndex] = newRule;
            }
        });
    }

    // 合并图表配置
    mergeChartConfigs(chartConfigs) {
        if (!this.core.charting) return;

        chartConfigs.forEach(newConfig => {
            const existingIndex = this.core.charting.chartConfigs.findIndex(config => config.id === newConfig.id);
            if (existingIndex === -1) {
                this.core.charting.chartConfigs.push(newConfig);
            } else {
                // 更新现有配置
                this.core.charting.chartConfigs[existingIndex] = newConfig;
            }
        });

        // 保存图表配置
        this.core.charting.saveChartConfigs();
    }

    // 绑定导出导入事件
    bindExportImportEvents() {
        // 导出配置按钮
        this.core.exportConfigBtn?.addEventListener('click', () => {
            this.exportConfig();
        });

        // 导入配置按钮
        this.core.importConfigBtn?.addEventListener('click', () => {
            this.core.importConfigFileInput?.click();
        });

        // 清空所有按钮
        this.core.clearAllStorageBtn?.addEventListener('click', () => {
            this.clearAllStorage();
        });

        // 文件选择事件
        this.core.importConfigFileInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importConfig(file);
                e.target.value = ''; // 清空文件选择器
            }
        });

        // 绑定诊断规则事件
        this.bindDiagnosisRuleEvents();

        // 绑定图表配置事件
        this.bindChartConfigEvents();
    }

    // 绑定诊断规则事件
    bindDiagnosisRuleEvents() {
        const addDiagnosisRuleBtn = document.getElementById('addDiagnosisRule');
        if (addDiagnosisRuleBtn) {
            addDiagnosisRuleBtn.addEventListener('click', () => {
                this.addDiagnosisRule();
            });
        }
    }

    // 添加诊断规则
    addDiagnosisRule() {
        const name = document.getElementById('diagnosisRuleName').value.trim();
        const description = document.getElementById('diagnosisRuleDescription').value.trim();
        const patternsText = document.getElementById('diagnosisRulePatterns').value.trim();
        const severity = document.getElementById('diagnosisRuleSeverity').value;
        const category = document.getElementById('diagnosisRuleCategory').value.trim();
        const solution = document.getElementById('diagnosisRuleSolution').value.trim();

        if (!name || !patternsText) {
            alert('请填写规则名称和匹配模式');
            return;
        }

        const patterns = patternsText.split('\n').filter(pattern => pattern.trim());
        if (patterns.length === 0) {
            alert('请至少填写一个匹配模式');
            return;
        }

        // 检查是否是编辑模式
        if (this.core.editingDiagnosisIndex !== undefined) {
            // 编辑模式：更新现有规则
            const existingRule = this.core.diagnosisRules[this.core.editingDiagnosisIndex];
            existingRule.name = name;
            existingRule.description = description;
            existingRule.patterns = patterns;
            existingRule.severity = severity;
            existingRule.category = category || 'common';
            existingRule.solution = solution;
            existingRule.customScript = document.getElementById('diagnosisRuleCustomScript').value.trim();

            delete this.core.editingDiagnosisIndex;
            this.core.setStatus('诊断规则更新成功');
        } else {
            // 添加模式：添加新规则
            const newRule = {
                id: `rule_${Date.now()}`,
                name,
                description,
                patterns,
                severity,
                category: category || 'common',
                solution,
                customScript: document.getElementById('diagnosisRuleCustomScript').value.trim(),
                enabled: true // 新增：默认启用规则
            };
            this.core.addDiagnosisRule(newRule);
            this.core.setStatus('诊断规则添加成功');
        }

        // 保存诊断规则
        localStorage.setItem('xlogAssist_diagnosisRules', JSON.stringify(this.core.diagnosisRules));

        this.renderDiagnosisRulesList();
        this.clearDiagnosisRuleForm();
    }

    // 渲染诊断规则列表
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
            ruleElement.className = `diagnosis-rule-item ${rule.enabled ? '' : 'disabled'}`;
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
                    <div class="diagnosis-rule-toggle ${rule.enabled ? 'enabled' : 'disabled'}" data-index="${index}">
                        <div class="toggle-switch"></div>
                        <span class="toggle-label">${rule.enabled ? '已启用' : '已禁用'}</span>
                    </div>
                    <button class="edit-diagnosis-rule" data-index="${index}">编辑</button>
                    <button class="delete-diagnosis-rule" data-index="${index}">删除</button>
                </div>
            `;
            container.appendChild(ruleElement);
        });

        // 立即绑定诊断规则操作事件
        setTimeout(() => {
            this.bindDiagnosisRuleActionEvents();
        }, 0);
    }

    // 绑定诊断规则操作事件
    bindDiagnosisRuleActionEvents() {
        const container = document.getElementById('diagnosisRulesList');
        if (!container) return;

        container.querySelectorAll('.diagnosis-rule-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.toggleDiagnosisRule(index);
            });
        });

        container.querySelectorAll('.edit-diagnosis-rule').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.editDiagnosisRule(index);
            });
        });

        container.querySelectorAll('.delete-diagnosis-rule').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.deleteDiagnosisRule(index);
            });
        });
    }

    // 切换诊断规则状态
    toggleDiagnosisRule(index) {
        const rule = this.core.diagnosisRules[index];
        rule.enabled = !rule.enabled;
        // 直接调用诊断模块的保存方法
        localStorage.setItem('xlogAssist_diagnosisRules', JSON.stringify(this.core.diagnosisRules));
        this.renderDiagnosisRulesList();
        this.core.setStatus(`诊断规则 "${rule.name}" 已${rule.enabled ? '启用' : '禁用'}`);
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
        document.getElementById('diagnosisRuleCustomScript').value = rule.customScript || '';

        // 保存当前编辑的规则索引
        this.core.editingDiagnosisIndex = index;

        // 更改按钮文字
        document.getElementById('addDiagnosisRule').textContent = '更新规则';

        this.core.setStatus('诊断规则已加载到编辑表单，修改后点击"更新规则"');
    }

    // 删除诊断规则
    deleteDiagnosisRule(index) {
        if (confirm('确定要删除这个诊断规则吗？')) {
            const ruleId = this.core.diagnosisRules[index].id;
            this.core.deleteDiagnosisRule(ruleId);
            this.renderDiagnosisRulesList();
            this.core.setStatus('诊断规则已删除');
        }
    }

    // 清空诊断规则表单
    clearDiagnosisRuleForm() {
        document.getElementById('diagnosisRuleName').value = '';
        document.getElementById('diagnosisRuleDescription').value = '';
        document.getElementById('diagnosisRulePatterns').value = '';
        document.getElementById('diagnosisRuleSeverity').value = 'error';
        document.getElementById('diagnosisRuleCategory').value = '';
        document.getElementById('diagnosisRuleSolution').value = '';
        document.getElementById('diagnosisRuleCustomScript').value = '';
        document.getElementById('addDiagnosisRule').textContent = '添加规则';
        delete this.core.editingDiagnosisIndex;
    }

    // 渲染图表配置列表
    renderChartConfigsList() {
        const container = document.getElementById('chartConfigsList');
        if (!container) return;

        // 检查图表模块是否存在
        if (!this.core.charting) {
            container.innerHTML = '<h4>当前图表配置:</h4><div class="empty-chart-configs">图表模块未初始化</div>';
            return;
        }

        // 检查图表配置是否存在
        if (!this.core.charting.chartConfigs || this.core.charting.chartConfigs.length === 0) {
            container.innerHTML = '<h4>当前图表配置:</h4><div class="empty-chart-configs">暂无图表配置</div>';
            return;
        }

        container.innerHTML = '<h4>当前图表配置:</h4>';

        this.core.charting.chartConfigs.forEach((config, index) => {
            const configElement = document.createElement('div');
            configElement.className = `chart-config-item ${config.enabled ? '' : 'disabled'}`;

            // 获取脚本内容预览（截取前50个字符）
            const scriptPreview = config.dataSource?.script ?
                config.dataSource.script.substring(0, 50) + (config.dataSource.script.length > 50 ? '...' : '') :
                '未设置脚本';

            configElement.innerHTML = `
                <div class="chart-config-content">
                    <div class="chart-config-header">
                        <div class="chart-config-info">
                            <h5 class="chart-config-title">${config.name || '未命名配置'}</h5>
                            <span class="chart-config-type">${this.getChartTypeName(config.type)}</span>
                        </div>
                        <div class="chart-config-description">${config.description || '无描述'}</div>
                        <div class="chart-config-details">
                            <div class="chart-config-detail">脚本: ${scriptPreview}</div>
                            <div class="chart-config-detail">类型: ${config.type}</div>
                        </div>
                    </div>
                    <div class="chart-config-actions">
                        <div class="chart-config-toggle ${config.enabled ? 'enabled' : 'disabled'}" data-config-id="${config.id}">
                            <div class="toggle-switch"></div>
                            <span class="toggle-label">${config.enabled ? '已启用' : '已禁用'}</span>
                        </div>
                        <button class="btn btn-small btn-primary edit-chart-config" data-config-id="${config.id}">编辑</button>
                        <button class="btn btn-small btn-danger delete-chart-config" data-config-id="${config.id}">删除</button>
                    </div>
                </div>
            `;
            container.appendChild(configElement);
        });

        // 绑定图表配置操作事件
        this.bindChartConfigEvents();

        // 立即绑定图表配置列表操作事件
        setTimeout(() => {
            this.bindChartConfigListEvents();
        }, 0);
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


    // 切换图表配置状态
    toggleChartConfig(configId) {
        if (!this.core.charting) return;

        const config = this.core.charting.chartConfigs.find(c => c.id === configId);
        if (!config) return;

        config.enabled = !config.enabled;
        this.core.charting.saveChartConfigs();
        this.renderChartConfigsList();

        // 重新渲染绘图区
        if (this.core.charting && this.core.charting.renderCharts) {
            this.core.charting.renderCharts();
        }

        this.core.setStatus(`图表配置 "${config.name}" 已${config.enabled ? '启用' : '禁用'}`);
    }

    // 添加图表配置
    addChartConfig() {
        const chartName = document.getElementById('chartName').value.trim();
        const chartType = document.getElementById('chartType').value;
        const chartDescription = document.getElementById('chartDescription').value.trim();
        const chartScript = document.getElementById('chartScript').value.trim();

        if (!chartName) {
            alert('请输入图表名称');
            return;
        }

        if (!chartScript) {
            alert('请输入数据提取脚本');
            return;
        }

        // 检查是否是编辑模式
        if (this.core.editingChartConfigId !== undefined) {
            // 编辑模式：更新现有配置
            const config = this.core.charting.chartConfigs.find(c => c.id === this.core.editingChartConfigId);
            if (config) {
                config.name = chartName;
                config.type = chartType;
                config.description = chartDescription;
                config.dataSource = {
                    script: chartScript
                };
                config.style = {};

                // 移除颜色配置，让Chart.js自动处理颜色
                config.style = {};

                this.core.setStatus('图表配置更新成功');
            }
        } else {
            // 添加模式：添加新配置
            const config = {
                id: `chart_${Date.now()}`,
                name: chartName,
                type: chartType,
                description: chartDescription,
                enabled: true,
                dataSource: {
                    script: chartScript
                },
                style: {}
            };

            // 移除颜色配置，让Chart.js自动处理颜色
            config.style = {};

            // 添加到图表配置
            if (this.core.charting) {
                this.core.charting.chartConfigs.push(config);
                this.core.setStatus('图表配置添加成功');
            } else {
                alert('图表模块未初始化');
                return;
            }
        }

        // 保存配置
        if (this.core.charting) {
            this.core.charting.saveChartConfigs();
            this.renderChartConfigsList();

            // 刷新主界面绘图区
            if (this.core.charting && this.core.charting.renderCharts) {
                this.core.charting.renderCharts();
            }

            this.clearChartConfigForm();
        }
    }

    // 编辑图表配置
    editChartConfig(configId) {
        const config = this.core.charting.chartConfigs.find(c => c.id === configId);
        if (!config) return;

        // 填充表单
        document.getElementById('chartName').value = config.name || '';
        document.getElementById('chartType').value = config.type || 'line';
        document.getElementById('chartDescription').value = config.description || '';
        document.getElementById('chartScript').value = config.dataSource?.script || '';

        // 移除颜色配置填充，不再需要处理颜色

        // 保存当前编辑的配置ID
        this.core.editingChartConfigId = configId;

        // 更改按钮文字
        document.getElementById('addChartConfig').textContent = '更新图表配置';

        this.core.setStatus('图表配置已加载到编辑表单，修改后点击"更新图表配置"');
    }

    // 删除图表配置
    deleteChartConfig(configId) {
        if (confirm('确定要删除这个图表配置吗？')) {
            if (this.core.charting) {
                this.core.charting.chartConfigs = this.core.charting.chartConfigs.filter(c => c.id !== configId);
                this.core.charting.saveChartConfigs();
                this.renderChartConfigsList();
                // 同时从已生成图表中移除
                this.core.charting.generatedChartIds.delete(configId);
                // 刷新主界面绘图区 - 调用正确的方法
                if (this.core.charting && this.core.charting.renderCharts) {
                    this.core.charting.renderCharts();
                }
                this.core.setStatus('图表配置已删除');
            } else {
                this.core.setStatus('图表模块未初始化', 'error');
            }
        }
    }

    // 清空图表配置表单
    clearChartConfigForm() {
        document.getElementById('chartName').value = '';
        document.getElementById('chartType').value = 'line';
        document.getElementById('chartDescription').value = '';
        document.getElementById('chartScript').value = '';
        // 移除颜色相关的表单字段
        document.getElementById('addChartConfig').textContent = '添加图表配置';
        delete this.core.editingChartConfigId;
    }

    // 绑定图表配置事件
    bindChartConfigEvents() {
        const addChartConfigBtn = document.getElementById('addChartConfig');

        if (addChartConfigBtn) {
            // 使用最简单的方式，每次重新绑定
            addChartConfigBtn.onclick = () => {
                this.addChartConfig();
            };
        }
    }

    // 绑定图表配置列表操作事件
    bindChartConfigListEvents() {
        const container = document.getElementById('chartConfigsList');
        if (!container) return;

        // 直接绑定事件，确保每次都能正确绑定
        container.querySelectorAll('.chart-config-toggle').forEach(toggle => {
            toggle.onclick = (e) => {
                const configId = e.currentTarget.dataset.configId;
                this.toggleChartConfig(configId);
            };
        });

        container.querySelectorAll('.edit-chart-config').forEach(button => {
            button.onclick = (e) => {
                const configId = e.currentTarget.dataset.configId;
                this.editChartConfig(configId);
            };
        });

        container.querySelectorAll('.delete-chart-config').forEach(button => {
            button.onclick = (e) => {
                const configId = e.currentTarget.dataset.configId;
                this.deleteChartConfig(configId);
            };
        });
    }

    // 清空所有localStorage数据
    clearAllStorage() {
        if (confirm('确定要清空所有localStorage数据吗？\n这将删除所有配置和临时数据，包括：\n- 正则规则\n- 配置组\n- 诊断规则\n- 图表配置\n- 其他临时数据\n\n此操作不可撤销！')) {
            // 清空所有localStorage
            localStorage.clear();

            // 重置核心数据
            this.core.regexRules = [];
            this.core.configGroups = [];
            this.core.activeGroups = new Set();
            this.core.filterGroups = new Set();
            this.core.diagnosisRules = [];

            // 重置图表配置
            if (this.core.charting) {
                this.core.charting.chartConfigs = [];
            }

            // 重新渲染所有列表
            this.renderRulesList();
            this.renderGroupsList();
            this.renderGroupSelection();
            this.renderDiagnosisRulesList();
            this.renderChartConfigsList();

            // 重新渲染日志
            if (this.core.renderLogs) {
                this.core.renderLogs();
            }

            this.core.setStatus('所有localStorage数据已清空');
        }
    }

    // 清理localStorage空间
    cleanupLocalStorage() {
        const keysToKeep = [
            'xlogAssist_regexRules',
            'xlogAssist_configGroups',
            'xlogAssist_activeGroups',
            'xlogAssist_filterGroups',
            'xlogAssist_diagnosisRules',
            'xlogAssist_chartConfigs'
        ];

        const allKeys = Object.keys(localStorage);
        const keysToRemove = allKeys.filter(key => !keysToKeep.includes(key));

        if (keysToRemove.length === 0) {
            this.core.setStatus('没有需要清理的localStorage数据');
            return;
        }

        if (confirm(`确定要清理 ${keysToRemove.length} 个localStorage项目吗？\n这将删除临时数据但保留配置。`)) {
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });
            this.core.setStatus(`已清理 ${keysToRemove.length} 个localStorage项目`);
        }
    }

    // 绑定清理事件
    bindCleanupEvents() {
        const cleanupBtn = document.getElementById('cleanupStorage');
        if (cleanupBtn) {
            cleanupBtn.addEventListener('click', () => {
                this.cleanupLocalStorage();
            });
        }

        // 绑定清空所有事件
        const clearAllBtn = document.getElementById('clearAllStorage');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                this.clearAllStorage();
            });
        }
    }
}

export default ConfigManager;