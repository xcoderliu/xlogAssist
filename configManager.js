class ConfigManager {
    constructor(core) {
        this.core = core;
    }

    // 生成随机颜色
    getRandomColor() {
        const colors = [
            '#0066cc', '#cc0000', '#009900', '#990099', '#cc6600',
            '#006699', '#993300', '#669900', '#990066', '#006633',
            '#3366cc', '#cc3366', '#33cc66', '#6633cc', '#cc6633',
            '#3399cc', '#cc3399', '#99cc33', '#9933cc', '#cc9933',
            '#2288cc', '#cc2288', '#22cc88', '#8822cc', '#cc8822',
            '#44aadd', '#dd44aa', '#aadd44', '#aa44dd', '#ddaa44',
            '#55bbee', '#ee55bb', '#bbee55', '#bb55ee', '#eebb55',
            '#66ccff', '#ff66cc', '#ccff66', '#cc66ff', '#ffcc66',
            '#1177bb', '#bb1177', '#77bb11', '#7711bb', '#bb7711',
            '#3388dd', '#dd3388', '#88dd33', '#8833dd', '#dd8833',
            '#5599ee', '#ee5599', '#99ee55', '#9955ee', '#ee9955',
            '#77aaff', '#ff77aa', '#aaff77', '#aa77ff', '#ffaa77'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // 显示配置面板
    showConfigPanel() {
        this.core.configPanel.style.display = 'block';
        this.renderRulesList();
        this.renderChartConfigsList();
        this.renderSubscriptionsList();
        // 清空表单，生成新的随机颜色
        this.clearRuleForm();
    }

    // 清空规则表单并设置随机颜色
    clearRuleForm() {
        document.getElementById('regexPattern').value = '';
        document.getElementById('regexColor').value = this.getRandomColor(); // 随机颜色字体
        document.getElementById('regexBgColor').value = '#ffffff'; // 默认白色背景
        document.getElementById('highlightWholeLine').checked = false;
        document.getElementById('addRegexRule').textContent = '添加规则';
        delete this.core.editingIndex;
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

            const newRule = {
                pattern,
                color,
                bgColor,
                highlightWholeLine,
                id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };

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

            // 添加后自动排序
            this.sortRules();
            this.core.saveConfig();
            this.renderRulesList();
            if (this.core.renderLogs) {
                this.core.renderLogs(); // 重新渲染以应用新规则
            }
            // 修复：规则变化时重新渲染排查区
            if (this.core.renderInvestigationLogs) {
                this.core.renderInvestigationLogs();
            }
            // 强制刷新高亮
            if (this.core.monacoRenderer && this.core.monacoRenderer.refreshHighlighting) {
                this.core.monacoRenderer.refreshHighlighting();
            }

            // 清空表单并重置按钮文字
            this.clearRuleForm();

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

    // 自动排序规则 - 非整行规则排在整行规则前面
    sortRules() {
        const originalOrder = [...this.core.regexRules];
        this.core.regexRules.sort((a, b) => {
            // 非整行规则排在整行规则前面
            if (!a.highlightWholeLine && b.highlightWholeLine) return -1;
            if (a.highlightWholeLine && !b.highlightWholeLine) return 1;
            // 如果类型相同，保持原有顺序
            return 0;
        });

        // 检查排序是否改变了顺序
        const orderChanged = originalOrder.some((rule, index) =>
            this.core.getRuleId(rule) !== this.core.getRuleId(this.core.regexRules[index])
        );

        // 如果顺序改变，保存配置
        if (orderChanged) {
            this.core.saveConfig();
        }
    }

    // 渲染规则列表 - 支持拖拽排序
    renderRulesList() {
        const rulesList = document.getElementById('rulesList');
        rulesList.innerHTML = '<h4>当前规则:</h4>';

        if (this.core.regexRules.length === 0) {
            rulesList.innerHTML += '<div class="empty-rules">暂无规则</div>';
            return;
        }

        // 渲染前确保排序
        this.sortRules();

        this.core.regexRules.forEach((rule, index) => {
            const ruleElement = document.createElement('div');
            ruleElement.className = 'rule-item';
            ruleElement.draggable = true;
            ruleElement.dataset.index = index;
            ruleElement.innerHTML = `
                <div style="display: flex; align-items: center; flex-wrap: wrap;">
                    <div class="drag-handle" style="cursor: move; margin-right: 8px; color: #666;">≡</div>
                    <div class="rule-preview" style="background: ${rule.bgColor}; color: ${rule.color}; display: flex; align-items: center; justify-content: center; font-weight: bold;">A</div>
                    <span class="rule-text">${rule.pattern}</span>
                    ${rule.highlightWholeLine ? '<span style="font-size: 12px; color: #666; margin-left: 8px;">(整行)</span>' : ''}
                </div>
                <div class="item-actions">
                    <button class="edit-rule" data-index="${index}" title="编辑规则">✏️</button>
                    <button class="delete-rule" data-index="${index}" title="删除规则">🗑️</button>
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

        // 绑定拖拽排序事件
        this.bindDragSortEvents();
    }

    // 绑定拖拽排序事件
    bindDragSortEvents() {
        const rulesList = document.getElementById('rulesList');
        const ruleItems = rulesList.querySelectorAll('.rule-item');

        let draggedItem = null;

        ruleItems.forEach(item => {
            // 拖拽开始
            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', item.innerHTML);
                item.style.opacity = '0.5';
            });

            // 拖拽结束
            item.addEventListener('dragend', () => {
                draggedItem.style.opacity = '1';
                draggedItem = null;
            });

            // 拖拽经过
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            // 拖拽进入
            item.addEventListener('dragenter', (e) => {
                e.preventDefault();
                if (item !== draggedItem) {
                    item.style.backgroundColor = '#f0f8ff';
                }
            });

            // 拖拽离开
            item.addEventListener('dragleave', () => {
                item.style.backgroundColor = '';
            });

            // 放置
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                if (item !== draggedItem) {
                    const fromIndex = parseInt(draggedItem.dataset.index);
                    const toIndex = parseInt(item.dataset.index);

                    // 交换数组中的元素
                    [this.core.regexRules[fromIndex], this.core.regexRules[toIndex]] =
                        [this.core.regexRules[toIndex], this.core.regexRules[fromIndex]];

                    // 保存配置
                    this.core.saveConfig();

                    // 重新渲染列表
                    this.renderRulesList();

                    // 强制刷新高亮
                    if (this.core.monacoRenderer && this.core.monacoRenderer.refreshHighlighting) {
                        this.core.monacoRenderer.refreshHighlighting();
                    }

                    this.core.setStatus('规则顺序已更新');
                }
                item.style.backgroundColor = '';
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
            // 删除后自动排序
            this.sortRules();
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
            // 强制刷新高亮
            if (this.core.monacoRenderer && this.core.monacoRenderer.refreshHighlighting) {
                this.core.monacoRenderer.refreshHighlighting();
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
                <div class="item-actions">
                    <button class="edit-rule" data-group-index="${index}" title="编辑配置组">✏️</button>
                    <button class="delete-rule" data-group-index="${index}" title="删除配置组">🗑️</button>
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
                    // 强制刷新高亮
                    if (this.core.monacoRenderer && this.core.monacoRenderer.refreshHighlighting) {
                        this.core.monacoRenderer.refreshHighlighting();
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
                    // 强制刷新高亮
                    if (this.core.monacoRenderer && this.core.monacoRenderer.refreshHighlighting) {
                        this.core.monacoRenderer.refreshHighlighting();
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
            // 确保导入的规则有ID
            this.core.getRuleId(newRule);

            // 检查是否已存在相同ID的规则
            const existingIndex = this.core.regexRules.findIndex(rule =>
                this.core.getRuleId(rule) === this.core.getRuleId(newRule)
            );

            if (existingIndex === -1) {
                this.core.regexRules.push(newRule);
            } else {
                // 如果存在相同ID的规则，更新现有规则
                this.core.regexRules[existingIndex] = newRule;
            }
        });

        // 合并后自动排序
        this.sortRules();

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

        // 绑定订阅源事件
        this.bindSubscriptionEvents();
    }

    // 绑定诊断规则事件
    bindDiagnosisRuleEvents() {
        const addDiagnosisRuleBtn = document.getElementById('addDiagnosisRule');
        const addHighlightFieldBtn = document.getElementById('addHighlightFieldBtn');

        if (addDiagnosisRuleBtn) {
            addDiagnosisRuleBtn.addEventListener('click', () => {
                this.addDiagnosisRule();
            });
        }

        if (addHighlightFieldBtn) {
            // 防止重复绑定
            addHighlightFieldBtn.replaceWith(addHighlightFieldBtn.cloneNode(true));
            document.getElementById('addHighlightFieldBtn').addEventListener('click', () => {
                this.addHighlightFieldInput();
            });
        }
    }

    // 添加高亮提取字段输入行
    addHighlightFieldInput(label = '', prefix = '', suffix = '') {
        const container = document.getElementById('highlightFieldsContainer');
        const row = document.createElement('div');
        row.className = 'highlight-field-row';
        row.style.display = 'flex';
        row.style.gap = '10px';
        row.style.marginBottom = '5px';

        row.innerHTML = `
            <input type="text" class="highlight-label" placeholder="名称 (如: 订单号)" value="${label || ''}" style="width: 25%;">
            <input type="text" class="highlight-prefix" placeholder="前缀 (如: orderId=)" value="${prefix || ''}" style="width: 30%;">
            <input type="text" class="highlight-suffix" placeholder="后缀 (可选)" value="${suffix || ''}" style="width: 25%;">
            <button class="btn btn-small btn-danger remove-field" style="width: 60px;">删除</button>
        `;

        row.querySelector('.remove-field').onclick = () => {
            container.removeChild(row);
        };

        container.appendChild(row);
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

        // 收集高亮提取字段
        const highlightFields = [];
        document.querySelectorAll('#highlightFieldsContainer .highlight-field-row').forEach(row => {
            const label = row.querySelector('.highlight-label').value.trim();
            const prefix = row.querySelector('.highlight-prefix').value.trim();
            const suffix = row.querySelector('.highlight-suffix').value; // 后缀可以为空

            if (label && prefix) {
                highlightFields.push({ label, prefix, suffix: suffix || '' });
            }
        });

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
            existingRule.highlightFields = highlightFields;
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
                highlightFields,
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
                        <span class="diagnosis-rule-name" style="font-weight:600; font-size:14px;">${rule.name}</span>
                        <span class="diagnosis-rule-severity severity-${rule.severity}">${rule.severity}</span>
                    </div>
                    <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;">${rule.description}</div>
                </div>
                <div class="item-actions">
                    <div class="diagnosis-rule-toggle ${rule.enabled ? 'enabled' : 'disabled'}" data-index="${index}" style="margin-right:8px; cursor:pointer;" title="${rule.enabled ? '点击禁用' : '点击启用'}">
                         ${rule.enabled ? '🟢' : '⚪️'}
                    </div>
                    <button class="edit-rule" data-index="${index}" title="编辑规则">✏️</button>
                    <button class="delete-rule" data-index="${index}" title="删除规则">🗑️</button>
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

        container.querySelectorAll('.edit-rule').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.editDiagnosisRule(index);
            });
        });

        container.querySelectorAll('.delete-rule').forEach(button => {
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

        // 恢复高亮提取字段
        const container = document.getElementById('highlightFieldsContainer');
        container.innerHTML = '';
        if (rule.highlightFields && Array.isArray(rule.highlightFields)) {
            rule.highlightFields.forEach(field => {
                // 兼容旧版本 (如果有 regex 但没有 prefix，则将 regex 当作 prefix 显示，或提示用户)
                // 这里简单处理：如果有 prefix 则使用，否则尝试使用 regex
                const prefix = field.prefix || field.regex || '';
                const suffix = field.suffix || '';
                this.addHighlightFieldInput(field.label, prefix, suffix);
            });
        }

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
        document.getElementById('highlightFieldsContainer').innerHTML = ''; // 清空高亮字段

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
            configElement.setAttribute('draggable', 'true');
            configElement.dataset.index = index;

            // 获取脚本内容预览（截取前50个字符）
            const scriptPreview = config.dataSource?.script ?
                config.dataSource.script.substring(0, 50) + (config.dataSource.script.length > 50 ? '...' : '') :
                '未设置脚本';

            configElement.innerHTML = `
                <div class="chart-config-content">
                    <div class="chart-config-header">
                        <div class="chart-config-info">
                            <span class="chart-config-title" style="font-weight:600; font-size:14px; margin-right:8px;">${config.name || '未命名配置'}</span>
                            <span class="chart-config-type" style="font-size:12px; background:var(--bg-secondary); padding:2px 6px; border-radius:4px;">${this.getChartTypeName(config.type)}</span>
                        </div>
                        <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;">${config.description || '无描述'}</div>
                    </div>
                </div>
                <div class="item-actions">
                    <div class="chart-config-toggle ${config.enabled ? 'enabled' : 'disabled'}" data-config-id="${config.id}" style="margin-right:8px; cursor:pointer;" title="${config.enabled ? '点击禁用' : '点击启用'}">
                        ${config.enabled ? '🟢' : '⚪️'}
                    </div>
                    <button class="edit-rule edit-chart-config" data-config-id="${config.id}" title="编辑配置">✏️</button>
                    <button class="delete-rule delete-chart-config" data-config-id="${config.id}" title="删除配置">🗑️</button>
                </div>
            `;
            container.appendChild(configElement);
        });

        // 绑定图表配置操作事件
        this.bindChartConfigEvents();

        // 立即绑定图表配置列表操作事件
        setTimeout(() => {
            this.bindChartConfigListEvents();

            // 绑定值映射添加按钮 (图表配置标签页)
            const addMappingBtn = document.getElementById('addValueMappingBtn');
            if (addMappingBtn) {
                // 移除旧的事件监听器以防止多重绑定
                const newBtn = addMappingBtn.cloneNode(true);
                addMappingBtn.parentNode.replaceChild(newBtn, addMappingBtn);
                newBtn.addEventListener('click', () => {
                    this.addValueMappingInput();
                });
            }
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

        let finalScript = '';

        // 检查配置模式 (如果没有找到radio，默认为advanced，兼容旧代码)
        const modeRadio = document.querySelector('input[name="chartConfigMode"]:checked');
        const configMode = modeRadio ? modeRadio.value : 'advanced';

        if (configMode === 'simple') {
            const simpleType = document.getElementById('simpleChartType').value;

            if (simpleType === 'count') {
                // 关键词统计模式
                const keywordsInput = document.getElementById('simpleKeywords').value;
                if (!keywordsInput.trim()) {
                    alert('请输入要统计的关键词');
                    return;
                }
                const keywords = keywordsInput.split(',').map(k => k.trim()).filter(k => k);

                const contextFilter = document.getElementById('simpleContextFilter').value.trim();
                const filterLogic = contextFilter ? `
    // 仅处理包含特定关键词的行
    if (!content.includes('${contextFilter.replace(/'/g, "\\'")}')) return;
` : '';

                finalScript = `
// 自动生成的关键词统计脚本
${contextFilter ? '// 过滤关键词: ' + contextFilter : ''}
const keywords = ${JSON.stringify(keywords)};
const counts = {};
keywords.forEach(k => counts[k] = 0);

logs.forEach(log => {
    // 兼容日志对象的content属性或直接字符串
    const content = (log && log.content) ? log.content : (log || '').toString();
    ${filterLogic}
    keywords.forEach(k => {
        if (content.includes(k)) {
            counts[k]++;
        }
    });
});

return {
    labels: keywords,
    datasets: [{
        label: '出现频次',
        data: keywords.map(k => counts[k])
    }]
};`;
            } else if (simpleType === 'extract') {
                // 数值提取模式
                const prefix = document.getElementById('simpleExtractPrefix').value;
                const suffix = document.getElementById('simpleExtractSuffix').value;
                const contextFilter = document.getElementById('simpleContextFilter').value.trim();

                // 收集额外信息配置
                const extraInfos = [];
                document.querySelectorAll('#extraInfoList .extra-info-item').forEach(item => {
                    const label = item.querySelector('.extra-label').value.trim();
                    const prefix = item.querySelector('.extra-prefix').value;
                    const suffix = item.querySelector('.extra-suffix').value;

                    const mappings = {};
                    item.querySelectorAll('.mapping-row').forEach(row => {
                        const k = row.querySelector('.mapping-key').value.trim();
                        const v = row.querySelector('.mapping-value').value.trim();
                        if (k && v) mappings[k] = v;
                    });

                    if (prefix) {
                        extraInfos.push({ label, prefix, suffix, mappings });
                    }
                });

                if (!prefix) {
                    alert('请输入数值前缀');
                    return;
                }

                // 转义正则特殊字符
                const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const safePrefix = escapeRegExp(prefix);
                const safeSuffix = suffix ? escapeRegExp(suffix) : '';

                // 获取主值映射配置
                const mappingContainer = document.getElementById('chartValueMappingContainer');
                const mappingRows = mappingContainer ? mappingContainer.querySelectorAll('.mapping-row') : [];
                const valueMappings = {};
                mappingRows.forEach(row => {
                    const original = row.querySelector('.mapping-key').value.trim();
                    const display = row.querySelector('.mapping-value').value.trim();
                    if (original && display) valueMappings[original] = display;
                });
                const hasMapping = Object.keys(valueMappings).length > 0;

                // 构造主数值正则
                const regexStr = hasMapping
                    ? (safeSuffix
                        ? `${safePrefix}\\s*(.*?)\\s*${safeSuffix}`
                        : `${safePrefix}\\s*(\\S+)`)
                    : (safeSuffix
                        ? `${safePrefix}\\s*([-]?\\d+\\.?\\d*)\\s*.*?${safeSuffix}`
                        : `${safePrefix}\\s*([-]?\\d+\\.?\\d*)`);

                // 构造额外信息提取逻辑代码
                let extraInfoLogic = 'const metaObj = {};\n';
                if (extraInfos.length > 0) {
                    extraInfos.forEach((info, idx) => {
                        const safeP = escapeRegExp(info.prefix);
                        const safeS = info.suffix ? escapeRegExp(info.suffix) : '';
                        // 额外信息通常提取任意字符，非贪婪
                        const regStr = safeS
                            ? `${safeP}\\s*(.*?)\\s*${safeS}`
                            : `${safeP}\\s*(\\S+)`;

                        const mappingJSON = JSON.stringify(info.mappings);

                        extraInfoLogic += `
            {
                const reg = new RegExp('${regStr.replace(/\\/g, '\\\\')}', 'i');
                const m = content.match(reg);
                if (m && m[1]) {
                    let val = m[1].trim();
                    const mappings = ${mappingJSON};
                    if (mappings[val] !== undefined) val = mappings[val];
                    metaObj['${info.label || `Info${idx + 1}`}'] = val;
                }
            }`;
                    });
                    extraInfoLogic += '\n            metaInfo.push(Object.keys(metaObj).length > 0 ? metaObj : null);';
                } else {
                    extraInfoLogic += 'metaInfo.push(null);';
                }

                // 获取X轴模式
                const xAxisModeRadio = document.querySelector('input[name="xAxisMode"]:checked');
                const xAxisMode = xAxisModeRadio ? xAxisModeRadio.value : 'index';
                const timeRegexStr = document.getElementById('simpleTimeRegex').value || '\\d{2}:\\d{2}:\\d{2}';

                const xExtractionLogic = xAxisMode === 'time'
                    ? `
    // 尝试提取时间作为X轴
    const timeMatch = content.match(/${timeRegexStr}/);
    const label = timeMatch ? timeMatch[0] : (index + 1);
    labels.push(label);`
                    : `
    // 使用行号作为X轴
    labels.push(index + 1);`;

                // 内容过滤逻辑
                const filterLogic = contextFilter ? `
    // 仅处理包含特定关键词的行
    if (!content.includes('${contextFilter.replace(/'/g, "\\'")}')) return;
` : '';

                // 值映射转换逻辑
                const mappingLogic = hasMapping
                    ? `const valMap = ${JSON.stringify(valueMappings)};
        const rawVal = match[1].trim();
        const mappedVal = valMap[rawVal];
        if (mappedVal !== undefined) {
            const val = parseFloat(mappedVal);
            if (!isNaN(val)) {
                dataPoints.push(val);
                ${xExtractionLogic}
                ${extraInfoLogic}
            }
        }`
                    : `const val = parseFloat(match[1]);
        if (!isNaN(val)) {
            dataPoints.push(val);
            ${xExtractionLogic}
            ${extraInfoLogic}
        }`;

                // 生成最终脚本
                finalScript = `
// 自动生成的数值提取脚本
// 匹配模式: ${regexStr}
${contextFilter ? '// 过滤关键词: ' + contextFilter : ''}
${hasMapping ? '// 值映射: ' + JSON.stringify(valueMappings) : ''}
// 额外信息配置数: ${extraInfos.length}
const dataPoints = [];
const labels = [];
const metaInfo = [];
const regex = new RegExp('${regexStr.replace(/\\/g, '\\\\')}', 'i');

logs.forEach((log, index) => {
    // 兼容日志对象的content属性或直接字符串
    const content = (log && log.content) ? log.content : (log || '').toString();
    ${filterLogic}
    const match = content.match(regex);
    if (match && match[1]) {
        ${mappingLogic}
    }
});

return {
    labels: labels,
    datasets: [{
        label: '${chartName} (趋势)',
        data: dataPoints,
        meta: metaInfo.length > 0 ? metaInfo : undefined
    }]
};`;
            } else if (simpleType === 'extract_string') {
                // 字符串提取统计模式
                const prefix = document.getElementById('simpleExtractPrefix').value;
                const suffix = document.getElementById('simpleExtractSuffix').value;
                const contextFilter = document.getElementById('simpleContextFilter').value.trim();

                if (!prefix) {
                    alert('请输入前缀');
                    return;
                }

                // 转义正则特殊字符
                const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const safePrefix = escapeRegExp(prefix);
                const safeSuffix = suffix ? escapeRegExp(suffix) : '';

                // 构造正则: 提取中间的任意非空字符
                const regexStr = safeSuffix
                    ? `${safePrefix}\\s*(.*?)\\s*${safeSuffix}`
                    : `${safePrefix}\\s*(.*)`;

                // 内容过滤逻辑
                const filterLogic = contextFilter ? `
    // 仅处理包含特定关键词的行
    if (!content.includes('${contextFilter.replace(/'/g, "\\'")}')) return;
` : '';

                // 值映射逻辑
                const mappingContainer = document.getElementById('chartValueMappingContainer');
                const mappingRows = mappingContainer ? mappingContainer.querySelectorAll('.config-item-row') : [];
                const valueMappings = {};
                mappingRows.forEach(row => {
                    const original = row.querySelector('.mapping-original').value.trim();
                    const display = row.querySelector('.mapping-display').value.trim();
                    if (original && display) valueMappings[original] = display;
                });

                const mappingLogic = Object.keys(valueMappings).length > 0
                    ? `const valMap = ${JSON.stringify(valueMappings)};
    const key = valMap[match[1].trim()] || match[1].trim();`
                    : `const key = match[1].trim();`;

                finalScript = `
// 自动生成的字符串提取统计脚本
// 匹配模式: ${regexStr}
${contextFilter ? '// 过滤关键词: ' + contextFilter : ''}
const counts = {};
const regex = new RegExp('${regexStr.replace(/\\/g, '\\\\')}', 'i');

logs.forEach(log => {
    // 兼容日志对象的content属性或直接字符串
    const content = (log && log.content) ? log.content : (log || '').toString();
    ${filterLogic}
    const match = content.match(regex);
    if (match && match[1]) {
        ${mappingLogic}
        if (key) {
            counts[key] = (counts[key] || 0) + 1;
        }
    }
});

const labels = Object.keys(counts);
const data = labels.map(k => counts[k]);

return {
    labels: labels,
    datasets: [{
        label: '${chartName} (分布)',
        data: data
    }]
};`;
            } else if (simpleType === 'value_distribution') {
                // 数值分布 (直方图) 模式
                const prefix = document.getElementById('simpleExtractPrefix').value;
                const suffix = document.getElementById('simpleExtractSuffix').value;
                const bucketSize = parseFloat(document.getElementById('simpleBucketSize').value) || 100;
                const contextFilter = document.getElementById('simpleContextFilter').value.trim();

                if (!prefix) {
                    alert('请输入前缀');
                    return;
                }

                // 转义正则
                const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const safePrefix = escapeRegExp(prefix);
                const safeSuffix = suffix ? escapeRegExp(suffix) : '';

                // 构造正则
                const regexStr = safeSuffix
                    ? `${safePrefix}\\s*([-]?\\d+\\.?\\d*)\\s*.*?${safeSuffix}`
                    : `${safePrefix}\\s*([-]?\\d+\\.?\\d*)`;

                // 内容过滤逻辑
                const filterLogic = contextFilter ? `
    // 仅处理包含特定关键词的行
    if (!content.includes('${contextFilter.replace(/'/g, "\\'")}')) return;
` : '';

                finalScript = `
// 自动生成的数值分布(直方图)脚本
// 匹配模式: ${regexStr}
// 区间大小: ${bucketSize}
${contextFilter ? '// 过滤关键词: ' + contextFilter : ''}
const buckets = {};
const regex = new RegExp('${regexStr.replace(/\\/g, '\\\\')}', 'i');
const bucketSize = ${bucketSize};

logs.forEach(log => {
    // 兼容日志对象的content属性或直接字符串
    const content = (log && log.content) ? log.content : (log || '').toString();
    ${filterLogic}
    const match = content.match(regex);
    if (match && match[1]) {
        const val = parseFloat(match[1]);
        if (!isNaN(val)) {
            // 计算所属区间
            const bucketIndex = Math.floor(val / bucketSize);
            const bucketStart = bucketIndex * bucketSize;
            const bucketLabel = \`\${bucketStart}-\${bucketStart + bucketSize}\`;
            
            buckets[bucketStart] = (buckets[bucketStart] || 0) + 1;
        }
    }
});

// 排序区间
const sortedStarts = Object.keys(buckets).map(Number).sort((a,b) => a - b);
const labels = sortedStarts.map(start => \`\${start}-\${start + bucketSize}\`);
const data = sortedStarts.map(start => buckets[start]);

return {
    labels: labels,
    datasets: [{
        label: '${chartName} (分布)',
        data: data,
        borderWidth: 1
    }]
};`;
            }
        } else {
            // 高级模式
            finalScript = document.getElementById('chartScript').value.trim();
            if (!finalScript) {
                alert('请输入数据提取脚本');
                return;
            }
        }

        if (!chartName) {
            alert('请输入图表名称');
            return;
        }

        // 构造配置对象
        const dataSourceConfig = {
            script: finalScript
        };

        // 如果是简易模式，保存简易配置以便恢复
        if (configMode === 'simple') {
            const simpleType = document.getElementById('simpleChartType').value;
            const xAxisMode = document.querySelector('input[name="xAxisMode"]:checked') ? document.querySelector('input[name="xAxisMode"]:checked').value : 'index';

            // 收集当前显示的值映射
            const mappingContainer = document.getElementById('chartValueMappingContainer');
            const mappingRows = mappingContainer ? mappingContainer.querySelectorAll('.mapping-row') : [];
            const valueMappings = [];
            mappingRows.forEach(row => {
                const original = row.querySelector('.mapping-key').value.trim();
                const display = row.querySelector('.mapping-value').value.trim();
                if (original && display) valueMappings.push({ original, display });
            });

            // 收集额外信息配置
            const extraInfos = [];
            document.querySelectorAll('#extraInfoList .extra-info-item').forEach(item => {
                const label = item.querySelector('.extra-label').value.trim();
                const prefix = item.querySelector('.extra-prefix').value;
                const suffix = item.querySelector('.extra-suffix').value;

                const mappings = {};
                item.querySelectorAll('.mapping-row').forEach(row => {
                    const k = row.querySelector('.mapping-key').value.trim();
                    const v = row.querySelector('.mapping-value').value.trim();
                    if (k && v) mappings[k] = v;
                });

                extraInfos.push({ label, prefix, suffix, mappings });
            });

            dataSourceConfig.simpleConfig = {
                type: simpleType,
                keywords: document.getElementById('simpleKeywords').value,
                prefix: document.getElementById('simpleExtractPrefix').value,
                suffix: document.getElementById('simpleExtractSuffix').value,
                extraInfos: extraInfos,
                contextFilter: document.getElementById('simpleContextFilter').value,
                xAxisMode: xAxisMode,
                timeRegex: document.getElementById('simpleTimeRegex').value,
                bucketSize: document.getElementById('simpleBucketSize').value,
                valueMappings: valueMappings
            };
        }

        // 检查是否是编辑模式
        if (this.core.editingChartConfigId !== undefined) {
            // 编辑模式：更新现有配置
            const config = this.core.charting.chartConfigs.find(c => c.id === this.core.editingChartConfigId);
            if (config) {
                config.name = chartName;
                config.type = chartType;
                config.description = chartDescription;
                config.dataSource = dataSourceConfig;
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
                dataSource: dataSourceConfig,
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

        // 恢复简易配置模式
        if (config.dataSource?.simpleConfig) {
            // 切换到简易模式
            const simpleRadio = document.querySelector('input[name="chartConfigMode"][value="simple"]');
            if (simpleRadio) {
                simpleRadio.checked = true;
                // 触发change事件更新UI显隐
                document.getElementById('simpleChartConfig').style.display = 'block';
                document.getElementById('advancedChartConfig').style.display = 'none';
            }

            const sc = config.dataSource.simpleConfig;

            // 恢复分析类型
            // 恢复分析类型
            const simpleTypeSelect = document.getElementById('simpleChartType');
            // 注意：需要先触发chartType的change事件以确保simpleChartType选项正确过滤
            document.getElementById('chartType').dispatchEvent(new Event('change'));

            // 延迟一点设置simpleChartType，因为onchange可能会重置default
            setTimeout(() => {
                try {
                    if (sc.type) {
                        simpleTypeSelect.value = sc.type;
                        simpleTypeSelect.dispatchEvent(new Event('change')); // 触发UI更新
                    }

                    // 先统一重置X轴相关配置（确保非extract类型不显示时间格式正则）
                    const timeExtractConfig = document.getElementById('timeExtractConfig');
                    if (timeExtractConfig) timeExtractConfig.style.display = 'none';

                    const xIndexRadio = document.querySelector('input[name="xAxisMode"][value="index"]');
                    if (xIndexRadio) xIndexRadio.checked = true;

                    // 恢复通用配置
                    const contextFilterInput = document.getElementById('simpleContextFilter');
                    if (contextFilterInput) contextFilterInput.value = sc.contextFilter || '';

                    if (sc.type === 'count') {
                        const keywordsInput = document.getElementById('simpleKeywords');
                        if (keywordsInput) keywordsInput.value = sc.keywords || '';
                    } else if (sc.type === 'extract' || sc.type === 'extract_string' || sc.type === 'value_distribution') {
                        const prefixInput = document.getElementById('simpleExtractPrefix');
                        if (prefixInput) prefixInput.value = sc.prefix || '';

                        const suffixInput = document.getElementById('simpleExtractSuffix');
                        if (suffixInput) suffixInput.value = sc.suffix || '';

                        // 恢复额外信息提取配置
                        const extraInfoList = document.getElementById('extraInfoList');
                        if (extraInfoList) extraInfoList.innerHTML = '';

                        if (sc.extraInfos && Array.isArray(sc.extraInfos)) {
                            sc.extraInfos.forEach(info => {
                                try {
                                    this.addExtraInfoItem(info);
                                } catch (e) {
                                    console.error('Error recovering extra info item:', e);
                                }
                            });
                        } else {
                            // 兼容旧配置
                            const oldPrefix = sc.extraPrefix;
                            if (oldPrefix) {
                                this.addExtraInfoItem({
                                    prefix: oldPrefix,
                                    suffix: sc.extraSuffix || '',
                                    label: sc.extraLabel || ''
                                });
                            }
                        }

                        // 仅数值提取模式才恢复X轴模式
                        if (sc.type === 'extract' && sc.xAxisMode) {
                            const xRadio = document.querySelector(`input[name="xAxisMode"][value="${sc.xAxisMode}"]`);
                            if (xRadio) {
                                xRadio.checked = true;
                                // 触发点击事件以更新UI可见性
                                if (sc.xAxisMode === 'time') {
                                    if (timeExtractConfig) timeExtractConfig.style.display = 'block';
                                }
                            }
                        }
                    }

                    if (sc.timeRegex) {
                        const timeRegexInput = document.getElementById('simpleTimeRegex');
                        if (timeRegexInput) timeRegexInput.value = sc.timeRegex;
                    }

                    if (sc.bucketSize) {
                        const bucketSizeInput = document.getElementById('simpleBucketSize');
                        if (bucketSizeInput) bucketSizeInput.value = sc.bucketSize;
                    }

                    // 恢复值映射 (针对 count 和 extract_string 有效)
                    const mappingContainer = document.getElementById('chartValueMappingContainer');
                    if (mappingContainer) mappingContainer.innerHTML = '';
                    if (sc.valueMappings && Array.isArray(sc.valueMappings)) {
                        sc.valueMappings.forEach(m => {
                            try {
                                this.addValueMappingInput(m.original, m.display);
                            } catch (e) {
                                console.error('Error recovering value mapping:', e);
                            }
                        });
                    }
                } catch (err) {
                    console.error('Error recovering simple chart config:', err);
                }
            }, 0);

        } else {
            // 切换到高级模式UI
            const advancedRadio = document.querySelector('input[name="chartConfigMode"][value="advanced"]');
            if (advancedRadio) {
                advancedRadio.checked = true;
                document.getElementById('simpleChartConfig').style.display = 'none';
                document.getElementById('advancedChartConfig').style.display = 'block';
            }
        }

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

        // 简易模式输入框清空
        document.getElementById('simpleKeywords').value = '';
        document.getElementById('simpleExtractPrefix').value = '';
        document.getElementById('simpleExtractSuffix').value = '';
        document.getElementById('simpleContextFilter').value = '';
        document.getElementById('simpleTimeRegex').value = '\d{4}[-/]\d{2}[-/]\d{2}[T ]\d{2}:\d{2}:\d{2}|\d{2}:\d{2}:\d{2}';
        document.getElementById('simpleBucketSize').value = '100';
        // 清空额外信息列表
        const extraInfoList = document.getElementById('extraInfoList');
        if (extraInfoList) extraInfoList.innerHTML = '';

        // 重置简易配置显隐
        document.getElementById('simpleConfig-keyword').style.display = 'block';
        document.getElementById('simpleConfig-extraction').style.display = 'none';

        // 重置为简易模式
        const simpleRadio = document.querySelector('input[name="chartConfigMode"][value="simple"]');
        if (simpleRadio) {
            simpleRadio.checked = true;
            document.getElementById('simpleChartConfig').style.display = 'block';
            document.getElementById('advancedChartConfig').style.display = 'none';
        }

        // 重置分析类型
        const simpleTypeSelect = document.getElementById('simpleChartType');
        simpleTypeSelect.value = 'count'; // 默认

        // 重置X轴模式
        const xIndexRadio = document.querySelector('input[name="xAxisMode"][value="index"]');
        if (xIndexRadio) xIndexRadio.checked = true;
        document.getElementById('timeExtractConfig').style.display = 'none';
        document.getElementById('xAxisConfig').style.display = 'none'; // 默认是count，不显示X轴配置
        document.getElementById('bucketSizeConfig').style.display = 'none';

        // 清空值映射
        const mappingContainer = document.getElementById('chartValueMappingContainer');
        if (mappingContainer) mappingContainer.innerHTML = '';

        document.getElementById('addChartConfig').textContent = '添加图表配置';
        delete this.core.editingChartConfigId;
    }

    // 通用：添加映射行到指定容器
    addMappingRowToContainer(container, original = '', display = '') {
        if (!container) return;

        const row = document.createElement('div');
        row.className = 'mapping-row'; // 统一类名
        row.style.display = 'flex';
        row.style.gap = '8px';
        row.style.marginBottom = '5px';
        row.style.alignItems = 'center';

        row.innerHTML = `
            <input type="text" class="mapping-key" placeholder="原始值" style="flex: 1; font-size: 12px; padding: 4px;">
            <span style="color: var(--text-secondary); font-size: 12px;">→</span>
            <input type="text" class="mapping-value" placeholder="显示名" style="flex: 1; font-size: 12px; padding: 4px;">
            <button type="button" class="btn-icon remove-mapping-row" style="color: var(--text-tertiary); cursor: pointer;" title="移除">×</button>
        `;

        // 使用属性赋值，避免 HTML 插值导致的特殊字符问题
        row.querySelector('.mapping-key').value = original;
        row.querySelector('.mapping-value').value = display;

        row.querySelector('.remove-mapping-row').onclick = () => row.remove();
        container.appendChild(row);
    }

    // 添加图表值映射输入行 (兼容旧调用，但使用新通用方法)
    addValueMappingInput(original = '', display = '') {
        const container = document.getElementById('chartValueMappingContainer');
        this.addMappingRowToContainer(container, original, display);
    }

    // 添加额外信息配置项
    addExtraInfoItem(data = null) {
        const list = document.getElementById('extraInfoList');
        if (!list) return;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'extra-info-item';
        itemDiv.style.cssText = 'background: var(--bg-secondary); padding: 10px; border-radius: 6px; margin-bottom: 10px; border: 1px solid var(--border-color); position: relative;';

        const labelVal = data ? data.label || '' : '';
        const prefixVal = data ? data.prefix || '' : '';
        const suffixVal = data ? data.suffix || '' : '';
        const mappings = data ? data.mappings || {} : {};

        itemDiv.innerHTML = `
            <button type="button" class="btn-icon remove-item" style="position: absolute; right: 5px; top: 5px; color: var(--text-tertiary); cursor: pointer;" title="移除">×</button>
            <div class="config-item" style="margin-bottom: 8px;">
                <label style="font-size: 12px;">显示标签:</label>
                <input type="text" class="extra-label" placeholder="例如: Error Code" value="${labelVal}" style="width: 100%;">
            </div>
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <input type="text" class="extra-prefix" placeholder="前缀，如: code=" value="${prefixVal}" style="flex: 1;">
                <input type="text" class="extra-suffix" placeholder="后缀 (可选)" value="${suffixVal}" style="flex: 1;">
            </div>
            <div class="config-item" style="margin-bottom: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <label style="font-size: 12px;">值映射:</label>
                    <button type="button" class="btn btn-small add-mapping-btn" style="font-size: 11px; padding: 2px 6px;">+ 映射</button>
                </div>
                <div class="extra-mappings-container"></div>
            </div>
        `;

        // 绑定删除事件
        itemDiv.querySelector('.remove-item').onclick = () => {
            itemDiv.remove();
        };

        const mappingContainer = itemDiv.querySelector('.extra-mappings-container');

        // 绑定添加映射事件
        itemDiv.querySelector('.add-mapping-btn').onclick = () => {
            this.addMappingRowToContainer(mappingContainer);
        };

        // 恢复已有映射
        if (typeof mappings === 'object') {
            Object.entries(mappings).forEach(([k, v]) => {
                this.addMappingRowToContainer(mappingContainer, k, v);
            });
        }
        // 兼容旧的字符串格式 (虽然不太可能用到，但为了健壮性)
        else if (typeof mappings === 'string') {
            mappings.split('\n').forEach(line => {
                const [k, v] = line.split('=');
                if (k && v) this.addMappingRowToContainer(mappingContainer, k.trim(), v.trim());
            });
        }

        list.appendChild(itemDiv);
    }

    // 绑定图表配置事件
    bindChartConfigEvents() {
        const addChartConfigBtn = document.getElementById('addChartConfig');

        // 绑定添加额外信息按钮
        const addExtraInfoBtn = document.getElementById('addExtraInfoBtn');
        if (addExtraInfoBtn) {
            // 使用 cloneNode 移除旧的事件监听器
            const newBtn = addExtraInfoBtn.cloneNode(true);
            addExtraInfoBtn.parentNode.replaceChild(newBtn, addExtraInfoBtn);
            newBtn.onclick = () => {
                this.addExtraInfoItem();
            };
        }

        const chartTypeSelect = document.getElementById('chartType');
        const chartScriptTextarea = document.getElementById('chartScript');

        // 图表脚本模板
        const CHART_TEMPLATES = {
            'line': `// 折线图脚本示例 (必须返回 labels 和 datasets)
const dataPoints = [];
const labels = [];
// 示例: 提取 "value=123"
const regex = /value=(\\d+)/;

logs.forEach((log, index) => {
    const content = (log && log.content) ? log.content : (log || '').toString();
    const match = content.match(regex);
    if (match) {
        dataPoints.push(parseFloat(match[1]));
        labels.push(index + 1); // 使用行号作为X轴
    }
});

return {
    labels: labels,
    datasets: [{
        label: '示例数据',
        data: dataPoints,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
    }]
};`,
            'bar': `// 柱状图脚本示例
const counts = {};
// 示例: 统计包含 "Error" 或 "Warning" 的行
const keywords = ['Error', 'Warning'];

logs.forEach(log => {
    const content = (log && log.content) ? log.content : (log || '').toString();
    keywords.forEach(k => {
        if (content.includes(k)) {
            counts[k] = (counts[k] || 0) + 1;
        }
    });
});

return {
    labels: Object.keys(counts),
    datasets: [{
        label: '关键词统计',
        data: Object.values(counts),
        backgroundColor: ['rgba(255, 99, 132, 0.5)', 'rgba(54, 162, 235, 0.5)']
    }]
};`,
            'pie': `// 饼图脚本示例
const counts = {};
// 示例: 统计不同级别的日志
const regex = /\\[(INFO|WARN|ERROR)\\]/;

logs.forEach(log => {
    const content = (log && log.content) ? log.content : (log || '').toString();
    const match = content.match(regex);
    if (match) {
        const level = match[1];
        counts[level] = (counts[level] || 0) + 1;
    }
});

return {
    labels: Object.keys(counts),
    datasets: [{
        label: '日志级别占比',
        data: Object.values(counts),
        backgroundColor: [
            'rgba(75, 192, 192, 0.5)', // INFO
            'rgba(255, 205, 86, 0.5)', // WARN
            'rgba(255, 99, 132, 0.5)'  // ERROR
        ]
    }]
};`,
            'scatter': `// 散点图脚本示例 (必须返回 x, y 坐标)
const data = [];
// 示例: 提取 "x=10, y=20"
const regex = /x=(\\d+).*?y=(\\d+)/;

logs.forEach(log => {
    const content = (log && log.content) ? log.content : (log || '').toString();
    const match = content.match(regex);
    if (match) {
        data.push({
            x: parseFloat(match[1]),
            y: parseFloat(match[2])
        });
    }
});

return {
    datasets: [{
        label: 'XY分布',
        data: data,
        backgroundColor: 'rgb(255, 99, 132)'
    }]
};`,
            'bubble': `// 气泡图脚本示例 (必须返回 x, y, r)
const data = [];
// 示例: 提取 "u=10, v=20, s=5" (s为大小)
const regex = /u=(\\d+).*?v=(\\d+).*?s=(\\d+)/;

logs.forEach(log => {
    const content = (log && log.content) ? log.content : (log || '').toString();
    const match = content.match(regex);
    if (match) {
        data.push({
            x: parseFloat(match[1]),
            y: parseFloat(match[2]),
            r: parseFloat(match[3]) // 气泡半径
        });
    }
});

return {
    datasets: [{
        label: '三维分布',
        data: data,
        backgroundColor: 'rgba(255, 99, 132, 0.5)'
    }]
};`,
            'radar': `// 雷达图脚本示例
const counts = { 'MetricA': 0, 'MetricB': 0, 'MetricC': 0, 'MetricD': 0, 'MetricE': 0 };

// 模拟随机数据 (实际使用请替换为真实提取逻辑)
Object.keys(counts).forEach(k => {
    counts[k] = Math.floor(Math.random() * 100);
});

return {
    labels: Object.keys(counts),
    datasets: [{
        label: '各项指标',
        data: Object.values(counts),
        fill: true,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgb(54, 162, 235)',
        pointBackgroundColor: 'rgb(54, 162, 235)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(54, 162, 235)'
    }]
};`
        };

        // 映射别名
        CHART_TEMPLATES['doughnut'] = CHART_TEMPLATES['pie'];
        CHART_TEMPLATES['polarArea'] = CHART_TEMPLATES['pie'];

        if (chartTypeSelect && chartScriptTextarea) {
            // 监听图表类型变化，自动填充模板
            chartTypeSelect.addEventListener('change', () => {
                const type = chartTypeSelect.value;
                const currentScript = chartScriptTextarea.value.trim();
                const template = CHART_TEMPLATES[type] || CHART_TEMPLATES['line'];

                // 仅当脚本为空，或脚本与某个已知模板完全一致(说明用户未修改)时，才自动覆盖
                // 为了简化判断，我们只在为空时填充，或者用户明确想要重置时（这里只做为空判断）
                // 改进：检查当前内容是否是默认模板之一，如果是，则允许替换
                const isTemplate = Object.values(CHART_TEMPLATES).some(t => t.trim() === currentScript);

                if (!currentScript || isTemplate) {
                    chartScriptTextarea.value = template;
                }
            });

            // 初始化: 如果为空，填充默认
            if (!chartScriptTextarea.value.trim()) {
                const type = chartTypeSelect.value;
                chartScriptTextarea.value = CHART_TEMPLATES[type] || CHART_TEMPLATES['line'];
            }

            // 重要: 手动触发一次change事件，以确保简易模式下的分析类型根据默认的图表类型(line)正确初始化
            // 这解决了初始化时虽然是折线图，但分析类型没自动切到'extract'的问题
            // 使用 setTimeout 确保在DOM完全就绪后执行
            setTimeout(() => {
                const event = new Event('change');
                chartTypeSelect.dispatchEvent(event);
            }, 0);
        }

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

        // 拖拽排序逻辑
        let dragSrcEl = null;
        const items = container.querySelectorAll('.chart-config-item');

        const handleDragStart = (e) => {
            dragSrcEl = e.currentTarget;
            e.dataTransfer.effectAllowed = 'move';
            // 延迟添加样式以避免拖拽图像也被应用该样式
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
                const oldIndex = parseInt(dragSrcEl.dataset.index);
                const newIndex = parseInt(target.dataset.index);

                // 重新排序配置数组
                const configs = this.core.charting.chartConfigs;
                if (configs && configs.length > 0) {
                    const [movedItem] = configs.splice(oldIndex, 1);
                    configs.splice(newIndex, 0, movedItem);

                    // 保存并重新渲染
                    this.core.charting.saveChartConfigs();
                    this.renderChartConfigsList();

                    // 更新主界面图表顺序
                    if (this.core.charting && this.core.charting.reorderChartsDOM) {
                        this.core.charting.reorderChartsDOM();
                    }
                }
            }
            return false;
        };

        const handleDragEnd = (e) => {
            e.target.classList.remove('dragging');
            items.forEach(item => item.classList.remove('drag-over'));
        };

        items.forEach(item => {
            item.addEventListener('dragstart', handleDragStart, false);
            item.addEventListener('dragenter', handleDragEnter, false);
            item.addEventListener('dragover', handleDragOver, false);
            item.addEventListener('dragleave', handleDragLeave, false);
            item.addEventListener('drop', handleDrop, false);
            item.addEventListener('dragend', handleDragEnd, false);
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

    // 绑定订阅源事件（只绑定一次）
    bindSubscriptionEvents() {
        // 添加订阅源按钮
        const addSubscriptionBtn = document.getElementById('addSubscription');
        if (addSubscriptionBtn && !addSubscriptionBtn._bound) {
            addSubscriptionBtn.addEventListener('click', () => {
                this.addSubscription();
            });
            addSubscriptionBtn._bound = true;
        }

        // 更新所有订阅源按钮
        const updateAllSubscriptionsBtn = document.getElementById('updateAllSubscriptions');
        if (updateAllSubscriptionsBtn && !updateAllSubscriptionsBtn._bound) {
            updateAllSubscriptionsBtn.addEventListener('click', () => {
                this.updateAllSubscriptions();
            });
            updateAllSubscriptionsBtn._bound = true;
        }

        // 导出订阅源按钮
        const exportSubscriptionsBtn = document.getElementById('exportSubscriptions');
        if (exportSubscriptionsBtn && !exportSubscriptionsBtn._bound) {
            exportSubscriptionsBtn.addEventListener('click', () => {
                this.exportSubscriptions();
            });
            exportSubscriptionsBtn._bound = true;
        }

        // 导入订阅源按钮
        const importSubscriptionsBtn = document.getElementById('importSubscriptions');
        if (importSubscriptionsBtn && !importSubscriptionsBtn._bound) {
            importSubscriptionsBtn.addEventListener('click', () => {
                this.importSubscriptions();
            });
            importSubscriptionsBtn._bound = true;
        }

        // 订阅源文件选择事件
        const importSubscriptionsFileInput = document.getElementById('importSubscriptionsFile');
        if (importSubscriptionsFileInput && !importSubscriptionsFileInput._bound) {
            importSubscriptionsFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.importSubscriptionsFile(file);
                    e.target.value = ''; // 清空文件选择器
                }
            });
            importSubscriptionsFileInput._bound = true;
        }
    }

    // 绑定订阅源列表操作事件（由subscriptionManager处理）
    bindSubscriptionListEvents() {
        // 所有订阅源列表事件由subscriptionManager处理
        // 这里不再重复绑定事件
    }

    // 添加订阅源
    addSubscription() {
        const name = document.getElementById('subscriptionName').value.trim();
        const url = document.getElementById('subscriptionUrl').value.trim();

        if (!name || !url) {
            alert('请填写订阅源名称和URL');
            return;
        }

        // 验证URL格式
        try {
            new URL(url);
        } catch (error) {
            alert('请输入有效的URL');
            return;
        }

        // 检查是否已存在相同URL的订阅源
        if (this.core.subscriptionManager && this.core.subscriptionManager.subscriptions.some(sub => sub.url === url)) {
            alert('该URL的订阅源已存在');
            return;
        }

        const subscription = {
            name,
            url,
            enabled: true,
            status: 'pending'
        };

        if (this.core.subscriptionManager && this.core.subscriptionManager.addSubscription(subscription)) {
            this.renderSubscriptionsList();
            this.clearSubscriptionForm();
            this.core.setStatus('订阅源添加成功');
        } else {
            alert('添加订阅源失败：订阅源管理器未初始化');
        }
    }

    // 更新订阅源
    updateSubscription(subscriptionId) {
        if (!this.core.subscriptionManager) {
            alert('订阅源管理器未初始化');
            return;
        }

        this.core.subscriptionManager.updateSubscription(subscriptionId)
            .then(() => {
                this.renderSubscriptionsList();
                this.core.setStatus('订阅源更新成功');
            })
            .catch(error => {
                this.core.setStatus(`订阅源更新失败: ${error.message}`, 'error');
                this.renderSubscriptionsList(); // 重新渲染以更新状态
            });
    }

    // 更新所有订阅源
    updateAllSubscriptions() {
        if (!this.core.subscriptionManager) {
            alert('订阅源管理器未初始化');
            return;
        }

        this.core.subscriptionManager.updateAllSubscriptions()
            .then(() => {
                this.renderSubscriptionsList();
                this.core.setStatus('所有订阅源更新完成');
            })
            .catch(error => {
                this.core.setStatus(`订阅源更新失败: ${error.message}`, 'error');
                this.renderSubscriptionsList(); // 重新渲染以更新状态
            });
    }

    // 删除订阅源
    deleteSubscription(subscriptionId) {
        if (!this.core.subscriptionManager) {
            alert('订阅源管理器未初始化');
            return;
        }

        if (confirm('确定要删除这个订阅源吗？')) {
            this.core.subscriptionManager.deleteSubscription(subscriptionId);
            this.renderSubscriptionsList();
            this.core.setStatus('订阅源已删除');
        }
    }

    // 渲染订阅源列表
    renderSubscriptionsList() {
        const container = document.getElementById('subscriptionsList');
        if (!container) return;

        const subscriptions = this.core.subscriptionManager ? this.core.subscriptionManager.subscriptions : [];

        if (subscriptions.length === 0) {
            container.innerHTML = '<h4>当前订阅源:</h4><div class="empty-subscriptions">暂无订阅源</div>';
            return;
        }

        container.innerHTML = '<h4>当前订阅源:</h4>';

        subscriptions.forEach(subscription => {
            const subscriptionElement = document.createElement('div');
            subscriptionElement.className = 'subscription-item';

            const lastUpdate = subscription.lastUpdate ?
                new Date(subscription.lastUpdate).toLocaleString() : '从未更新';

            subscriptionElement.innerHTML = `
                <div class="subscription-content">
                    <div class="subscription-header">
                        <span class="subscription-name" style="font-weight:600; font-size:14px; margin-right:8px;">${subscription.name}</span>
                        <span class="subscription-status" style="font-size:12px; background:var(--bg-secondary); padding:2px 6px; border-radius:4px;">
                            ${subscription.enabled ? '已启用' : '已禁用'}
                        </span>
                    </div>
                    <div class="subscription-url" style="color:var(--text-secondary); font-size:12px; margin-top:4px;">${subscription.url}</div>
                    <div class="subscription-info" style="color:var(--text-secondary); font-size:12px;">
                        <span>最后更新: ${lastUpdate}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <div class="subscription-toggle ${subscription.enabled ? 'enabled' : 'disabled'}" data-id="${subscription.id}" style="margin-right:8px; cursor:pointer;" title="${subscription.enabled ? '点击禁用' : '点击启用'}">
                        ${subscription.enabled ? '🟢' : '⚪️'}
                    </div>
                    <button class="update-subscription edit-rule" data-id="${subscription.id}" ${subscription.status === 'updating' ? 'disabled' : ''} title="更新订阅源">
                        ${subscription.status === 'updating' ? '⏳' : '🔄'}
                    </button>
                    <button class="remove-subscription delete-rule" data-id="${subscription.id}" title="删除订阅源">🗑️</button>
                </div>
            `;
            container.appendChild(subscriptionElement);
        });

        // 调用subscriptionManager的事件绑定方法
        if (this.core.subscriptionManager && this.core.subscriptionManager.bindSubscriptionEvents) {
            this.core.subscriptionManager.bindSubscriptionEvents();
        } else {
            console.error('subscriptionManager或bindSubscriptionEvents方法不存在');
        }

        // 绑定订阅源切换事件
        this.bindSubscriptionToggleEvents();
    }

    // 绑定订阅源切换事件
    bindSubscriptionToggleEvents() {
        const container = document.getElementById('subscriptionsList');
        if (!container) return;

        container.querySelectorAll('.subscription-toggle').forEach(toggle => {
            toggle.onclick = (e) => {
                const id = e.currentTarget.dataset.id;
                if (this.core.subscriptionManager && this.core.subscriptionManager.toggleSubscription(id)) {
                    this.renderSubscriptionsList();
                    this.core.setStatus('订阅源状态已更新');
                }
            };
        });
    }

    // 清空订阅源表单
    clearSubscriptionForm() {
        document.getElementById('subscriptionName').value = '';
        document.getElementById('subscriptionUrl').value = '';
    }

    // 导出订阅源
    exportSubscriptions() {
        const subscriptions = this.core.subscriptionManager.subscriptions;

        if (subscriptions.length === 0) {
            alert('没有订阅源可导出');
            return;
        }

        const exportData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            subscriptions: subscriptions
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `xlogassist-subscriptions-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.core.setStatus('订阅源导出成功');
    }

    // 导入订阅源
    importSubscriptions() {
        document.getElementById('importSubscriptionsFile').click();
    }

    // 导入订阅源文件
    importSubscriptionsFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target.result);

                // 验证导入数据格式
                if (!importData.subscriptions || !Array.isArray(importData.subscriptions)) {
                    throw new Error('无效的订阅源文件格式');
                }

                // 合并订阅源
                importData.subscriptions.forEach(newSubscription => {
                    // 检查是否已存在相同URL的订阅源
                    const existingIndex = this.core.subscriptionManager.subscriptions.findIndex(
                        sub => sub.url === newSubscription.url
                    );

                    if (existingIndex === -1) {
                        // 确保新订阅源有ID
                        if (!newSubscription.id) {
                            newSubscription.id = `subscription_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        }
                        this.core.subscriptionManager.subscriptions.push(newSubscription);
                    } else {
                        // 如果存在相同URL的订阅源，更新现有订阅源
                        this.core.subscriptionManager.subscriptions[existingIndex] = {
                            ...this.core.subscriptionManager.subscriptions[existingIndex],
                            ...newSubscription,
                            id: this.core.subscriptionManager.subscriptions[existingIndex].id // 保持原有ID
                        };
                    }
                });

                // 保存订阅源
                this.core.subscriptionManager.saveSubscriptions();
                this.renderSubscriptionsList();
                this.core.setStatus('订阅源导入成功');
            } catch (error) {
                alert('导入订阅源失败: ' + error.message);
                this.core.setStatus('订阅源导入失败', 'error');
            }
        };
        reader.readAsText(file);
    }
}

export default ConfigManager;