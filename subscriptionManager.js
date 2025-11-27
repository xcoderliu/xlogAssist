// 订阅源管理模块 - 负责规则订阅源的配置和更新
class SubscriptionManager {
    constructor(core) {
        this.core = core;
        this.subscriptions = this.loadSubscriptions();
        this.lastUpdateTime = this.loadLastUpdateTime();

        // 代理服务列表 - 优先使用本地代理
        this.proxyServices = [
            // 本地代理服务器（最高优先级）
            () => `${window.location.origin}/api/proxy?url=`
        ];
    }

    // 加载订阅源配置
    loadSubscriptions() {
        const stored = localStorage.getItem('xlogAssist_subscriptions');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (error) {
                console.error('加载订阅源配置失败:', error);
            }
        }
        return [];
    }

    // 保存订阅源配置
    saveSubscriptions() {
        localStorage.setItem('xlogAssist_subscriptions', JSON.stringify(this.subscriptions));
    }

    // 加载最后更新时间
    loadLastUpdateTime() {
        const stored = localStorage.getItem('xlogAssist_subscriptions_lastUpdate');
        return stored ? parseInt(stored) : 0;
    }

    // 保存最后更新时间
    saveLastUpdateTime() {
        localStorage.setItem('xlogAssist_subscriptions_lastUpdate', Date.now().toString());
    }

    // 添加订阅源
    addSubscription(subscription) {
        if (!subscription.url) {
            alert('请输入订阅源URL');
            return false;
        }

        // 检查是否已存在相同URL的订阅源
        if (this.subscriptions.some(sub => sub.url === subscription.url)) {
            alert('该订阅源已存在');
            return false;
        }

        // 确保订阅源有必要的字段
        const newSubscription = {
            id: subscription.id || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url: subscription.url,
            name: subscription.name || this.extractNameFromUrl(subscription.url),
            enabled: subscription.enabled !== undefined ? subscription.enabled : true,
            lastUpdate: subscription.lastUpdate || 0,
            lastSuccess: subscription.lastSuccess || 0,
            errorCount: subscription.errorCount || 0,
            status: subscription.status || 'pending'
        };

        this.subscriptions.push(newSubscription);
        this.saveSubscriptions();
        return true;
    }

    // 从URL中提取名称
    extractNameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname || '未命名订阅源';
        } catch {
            return '未命名订阅源';
        }
    }

    // 删除订阅源
    deleteSubscription(id) {
        const index = this.subscriptions.findIndex(sub => sub.id === id);
        if (index !== -1) {
            this.subscriptions.splice(index, 1);
            this.saveSubscriptions();
            return true;
        }
        return false;
    }

    // 切换订阅源状态
    toggleSubscription(id) {
        const subscription = this.subscriptions.find(sub => sub.id === id);
        if (subscription) {
            subscription.enabled = !subscription.enabled;
            this.saveSubscriptions();
            return true;
        }
        return false;
    }

    // 更新订阅源
    async updateSubscription(id) {
        const subscription = this.subscriptions.find(sub => sub.id === id);
        if (!subscription || !subscription.enabled) {
            throw new Error('订阅源不存在或已禁用');
        }

        // 设置更新状态
        subscription.status = 'updating';
        this.saveSubscriptions();

        try {
            let response;
            let targetUrl = subscription.url;

            // 如果是外部URL且需要代理
            if (this.shouldUseProxy(subscription.url)) {
                targetUrl = await this.getProxyUrl(subscription.url);
            }

            try {
                response = await fetch(targetUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache'
                    },
                    mode: 'cors',
                    credentials: 'omit'
                });
            } catch (fetchError) {
                // 如果直接请求失败，尝试使用代理
                if (!targetUrl.includes('proxy') && !targetUrl.includes('cors')) {
                    const proxyUrl = await this.getProxyUrl(subscription.url);
                    response = await fetch(proxyUrl, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json'
                        }
                    });
                } else {
                    throw new Error(`网络请求失败: ${fetchError.message}`);
                }
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const configData = await response.json();

            // 验证配置数据格式
            if (!configData.regexRules) {
                throw new Error('无效的订阅源格式：缺少regexRules字段');
            }

            // 合并所有配置类型，与导入配置功能保持一致
            const result = this.mergeSubscriptionConfig(configData, subscription.id);

            // 更新订阅源状态 - 只在成功时更新最后成功时间
            subscription.lastUpdate = Date.now();
            subscription.lastSuccess = Date.now(); // 只在成功时更新
            subscription.errorCount = 0;
            subscription.status = 'success';
            this.saveSubscriptions();
            this.saveLastUpdateTime();

            // 构建详细的结果消息
            let message = `订阅源更新成功`;
            if (result.regexRules) {
                message += `，导入 ${result.regexRules.added} 条新规则，更新 ${result.regexRules.updated} 条规则`;
            }
            if (result.configGroups) {
                message += `，导入 ${result.configGroups.added} 个新配置组，更新 ${result.configGroups.updated} 个配置组`;
            }
            if (result.diagnosisRules) {
                message += `，导入 ${result.diagnosisRules.added} 条新诊断规则，更新 ${result.diagnosisRules.updated} 条诊断规则`;
            }
            if (result.chartConfigs) {
                message += `，导入 ${result.chartConfigs.added} 个新图表配置，更新 ${result.chartConfigs.updated} 个图表配置`;
            }

            return {
                success: true,
                message: message,
                rulesCount: configData.regexRules ? configData.regexRules.length : 0,
                added: result.regexRules ? result.regexRules.added : 0,
                updated: result.regexRules ? result.regexRules.updated : 0,
                details: result
            };

        } catch (error) {
            subscription.errorCount = (subscription.errorCount || 0) + 1;
            subscription.lastUpdate = Date.now();
            subscription.status = 'error';
            this.saveSubscriptions();

            throw error;
        }
    }

    // 合并订阅源配置（支持所有配置类型）
    mergeSubscriptionConfig(configData, subscriptionId) {
        const result = {};

        // 合并正则规则
        if (configData.regexRules) {
            result.regexRules = this.mergeSubscriptionRules(configData.regexRules, subscriptionId);
        }

        // 合并配置组
        if (configData.configGroups) {
            result.configGroups = this.mergeSubscriptionConfigGroups(configData.configGroups, subscriptionId);
        }

        // 合并诊断规则
        if (configData.diagnosisRules) {
            result.diagnosisRules = this.mergeSubscriptionDiagnosisRules(configData.diagnosisRules, subscriptionId);
        }

        // 合并图表配置
        if (configData.chartConfigs && this.core.charting) {
            result.chartConfigs = this.mergeSubscriptionChartConfigs(configData.chartConfigs, subscriptionId);
        }

        // 合并激活配置组
        if (configData.activeGroups) {
            this.mergeActiveGroups(configData.activeGroups);
        }

        // 合并过滤配置组
        if (configData.filterGroups) {
            this.mergeFilterGroups(configData.filterGroups);
        }

        // 保存配置
        this.core.saveConfig();

        // 重新渲染所有界面
        this.refreshAllUI();

        return result;
    }

    // 合并订阅源规则
    mergeSubscriptionRules(rules, subscriptionId) {
        let addedCount = 0;
        let updatedCount = 0;

        rules.forEach(newRule => {
            // 为订阅源规则添加来源标记
            newRule.source = subscriptionId;

            // 确保规则有ID
            this.core.getRuleId(newRule);

            // 检查是否已存在相同ID的规则
            const existingIndex = this.core.regexRules.findIndex(rule =>
                this.core.getRuleId(rule) === this.core.getRuleId(newRule)
            );

            if (existingIndex === -1) {
                // 新规则
                this.core.regexRules.push(newRule);
                addedCount++;
            } else {
                // 更新现有规则（仅当来源相同或是用户自定义规则时）
                const existingRule = this.core.regexRules[existingIndex];
                if (!existingRule.source || existingRule.source === subscriptionId) {
                    this.core.regexRules[existingIndex] = newRule;
                    updatedCount++;
                }
            }
        });

        // 合并后自动排序规则
        if (this.core.configManager && this.core.configManager.sortRules) {
            this.core.configManager.sortRules();
        }

        return { added: addedCount, updated: updatedCount };
    }

    // 合并配置组
    mergeSubscriptionConfigGroups(groups, subscriptionId) {
        let addedCount = 0;
        let updatedCount = 0;

        groups.forEach(newGroup => {
            // 为配置组添加来源标记
            newGroup.source = subscriptionId;

            // 检查是否已存在相同名称的配置组
            const existingIndex = this.core.configGroups.findIndex(group =>
                group.name === newGroup.name
            );

            if (existingIndex === -1) {
                // 新配置组
                this.core.configGroups.push(newGroup);
                addedCount++;
            } else {
                // 更新现有配置组（仅当来源相同或是用户自定义配置组时）
                const existingGroup = this.core.configGroups[existingIndex];
                if (!existingGroup.source || existingGroup.source === subscriptionId) {
                    // 合并规则ID
                    newGroup.ruleIds.forEach(ruleId => {
                        if (!existingGroup.ruleIds.includes(ruleId)) {
                            existingGroup.ruleIds.push(ruleId);
                        }
                    });
                    updatedCount++;
                }
            }
        });

        return { added: addedCount, updated: updatedCount };
    }

    // 合并诊断规则
    mergeSubscriptionDiagnosisRules(rules, subscriptionId) {
        let addedCount = 0;
        let updatedCount = 0;

        rules.forEach(newRule => {
            // 为诊断规则添加来源标记
            newRule.source = subscriptionId;

            // 检查是否已存在相同ID的诊断规则
            const existingIndex = this.core.diagnosisRules.findIndex(rule => rule.id === newRule.id);

            if (existingIndex === -1) {
                // 新诊断规则
                this.core.diagnosisRules.push(newRule);
                addedCount++;
            } else {
                // 更新现有诊断规则（仅当来源相同或是用户自定义规则时）
                const existingRule = this.core.diagnosisRules[existingIndex];
                if (!existingRule.source || existingRule.source === subscriptionId) {
                    this.core.diagnosisRules[existingIndex] = newRule;
                    updatedCount++;
                }
            }
        });

        // 保存诊断规则
        localStorage.setItem('xlogAssist_diagnosisRules', JSON.stringify(this.core.diagnosisRules));

        return { added: addedCount, updated: updatedCount };
    }

    // 合并图表配置
    mergeSubscriptionChartConfigs(configs, subscriptionId) {
        let addedCount = 0;
        let updatedCount = 0;

        if (!this.core.charting) {
            return { added: 0, updated: 0 };
        }

        configs.forEach(newConfig => {
            // 为图表配置添加来源标记
            newConfig.source = subscriptionId;

            // 检查是否已存在相同ID的图表配置
            const existingIndex = this.core.charting.chartConfigs.findIndex(config => config.id === newConfig.id);

            if (existingIndex === -1) {
                // 新图表配置
                this.core.charting.chartConfigs.push(newConfig);
                addedCount++;
            } else {
                // 更新现有图表配置（仅当来源相同或是用户自定义配置时）
                const existingConfig = this.core.charting.chartConfigs[existingIndex];
                if (!existingConfig.source || existingConfig.source === subscriptionId) {
                    this.core.charting.chartConfigs[existingIndex] = newConfig;
                    updatedCount++;
                }
            }
        });

        // 保存图表配置
        this.core.charting.saveChartConfigs();

        return { added: addedCount, updated: updatedCount };
    }

    // 合并激活配置组
    mergeActiveGroups(activeGroups) {
        activeGroups.forEach(groupId => {
            this.core.activeGroups.add(groupId);
        });
    }

    // 合并过滤配置组
    mergeFilterGroups(filterGroups) {
        filterGroups.forEach(groupId => {
            this.core.filterGroups.add(groupId);
        });
    }

    // 刷新所有UI
    refreshAllUI() {
        // 重新渲染规则列表
        if (this.core.renderRulesList) {
            this.core.renderRulesList();
        }

        // 重新渲染配置组列表
        if (this.core.renderGroupsList) {
            this.core.renderGroupsList();
        }

        // 重新渲染配置组选择
        if (this.core.renderGroupSelection) {
            this.core.renderGroupSelection();
        }

        // 重新渲染诊断规则列表
        if (this.core.renderDiagnosisRulesList) {
            this.core.renderDiagnosisRulesList();
        }

        // 重新渲染图表配置列表 - 使用core的方法
        if (this.core.renderChartConfigsList) {
            this.core.renderChartConfigsList();
        }

        // 重新渲染日志
        if (this.core.renderLogs) {
            this.core.renderLogs();
        }

        // 重新渲染排查区
        if (this.core.renderInvestigationLogs) {
            this.core.renderInvestigationLogs();
        }

        // 强制刷新高亮（如果正在使用Monaco）
        if (this.core.currentRenderer === this.core.monacoRenderer && this.core.currentRenderer.refreshHighlighting) {
            this.core.currentRenderer.refreshHighlighting();
        }
    }

    // 更新所有订阅源
    async updateAllSubscriptions() {
        const enabledSubscriptions = this.subscriptions.filter(sub => sub.enabled);
        if (enabledSubscriptions.length === 0) {
            throw new Error('没有启用的订阅源');
        }

        let totalSuccess = 0;
        let totalRules = 0;
        const results = [];

        for (const subscription of enabledSubscriptions) {
            try {
                const result = await this.updateSubscription(subscription.id);
                results.push({
                    name: subscription.name,
                    ...result
                });

                if (result.success) {
                    totalSuccess++;
                    totalRules += result.rulesCount || 0;
                }
            } catch (error) {
                results.push({
                    name: subscription.name,
                    success: false,
                    message: error.message
                });
            }
        }

        return {
            success: totalSuccess > 0,
            message: `更新完成：${totalSuccess}/${enabledSubscriptions.length} 个订阅源成功，共导入 ${totalRules} 条规则`,
            results: results
        };
    }

    // 自动更新检查（应用启动时调用）
    async checkForUpdates() {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000; // 1小时

        // 如果上次更新时间超过1小时，自动更新
        if (now - this.lastUpdateTime > oneHour) {
            const enabledSubscriptions = this.subscriptions.filter(sub => sub.enabled);
            if (enabledSubscriptions.length > 0) {
                this.core.setStatus('正在检查订阅源更新...');
                const result = await this.updateAllSubscriptions();
                if (result.success) {
                    this.core.setStatus(result.message);
                }
            }
        }
    }

    // 渲染订阅源列表
    renderSubscriptionsList() {
        const container = document.getElementById('subscriptionsList');
        if (!container) return;

        container.innerHTML = '<h4>订阅源列表:</h4>';

        if (this.subscriptions.length === 0) {
            container.innerHTML += '<div class="empty-subscriptions">暂无订阅源</div>';
            return;
        }

        this.subscriptions.forEach(subscription => {
            const subElement = document.createElement('div');
            subElement.className = `subscription-item ${subscription.enabled ? '' : 'disabled'}`;

            const lastUpdateText = subscription.lastUpdate ?
                new Date(subscription.lastUpdate).toLocaleString() : '从未更新';

            subElement.innerHTML = `
                <div class="subscription-content">
                    <div class="subscription-header">
                        <span class="subscription-name">${subscription.name}</span>
                        <span class="subscription-status ${subscription.enabled ? 'enabled' : 'disabled'}">
                            ${subscription.enabled ? '已启用' : '已禁用'}
                        </span>
                    </div>
                    <div class="subscription-url">${subscription.url}</div>
                    <div class="subscription-info">
                        <span>最后更新: ${lastUpdateText}</span>
                    </div>
                </div>
                <div class="subscription-actions">
                    <div class="subscription-toggle ${subscription.enabled ? 'enabled' : 'disabled'}" data-id="${subscription.id}">
                        <div class="toggle-switch"></div>
                        <span class="toggle-label">${subscription.enabled ? '启用' : '禁用'}</span>
                    </div>
                    <button class="update-subscription" data-id="${subscription.id}">更新</button>
                    <button class="remove-subscription" data-id="${subscription.id}">删除</button>
                </div>
            `;
            container.appendChild(subElement);
        });

        // 绑定订阅源操作事件
        this.bindSubscriptionEvents();
    }

    // 绑定订阅源操作事件
    bindSubscriptionEvents() {
        const container = document.getElementById('subscriptionsList');
        if (!container) return;

        // 直接绑定事件到按钮，使用最简单的方式
        container.querySelectorAll('.subscription-toggle').forEach(toggle => {
            toggle.onclick = (e) => {
                const id = e.currentTarget.dataset.id;
                this.toggleSubscription(id);
                this.renderSubscriptionsList();
                this.core.setStatus('订阅源状态已更新');
            };
        });

        container.querySelectorAll('.update-subscription').forEach(button => {
            button.onclick = async (e) => {
                const id = e.currentTarget.dataset.id;
                this.core.setStatus('正在更新订阅源...');
                try {
                    const result = await this.updateSubscription(id);
                    this.core.setStatus(result.message);
                    this.renderSubscriptionsList();
                } catch (error) {
                    console.error('updateSubscription出错:', error);
                    console.error('错误类型:', typeof error);
                    console.error('错误名称:', error.name);
                    console.error('错误消息:', error.message);
                    console.error('错误堆栈:', error.stack);
                    this.core.setStatus(`更新失败: ${error.message}`, 'error');
                    this.renderSubscriptionsList();
                }
            };
        });

        container.querySelectorAll('.remove-subscription').forEach(button => {
            button.onclick = (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm('确定要删除这个订阅源吗？')) {
                    this.deleteSubscription(id);
                    this.renderSubscriptionsList();
                    this.core.setStatus('订阅源已删除');
                }
            };
        });
    }

    // 显示订阅源管理界面
    showSubscriptionPanel() {
        const modal = document.getElementById('subscriptionModal');
        if (!modal) {
            this.createSubscriptionModal();
        } else {
            modal.style.display = 'block';
        }

        this.renderSubscriptionsList();
    }

    // 创建订阅源管理模态框
    createSubscriptionModal() {
        const modal = document.createElement('div');
        modal.id = 'subscriptionModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>订阅源管理</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="subscription-form">
                        <h4>添加订阅源</h4>
                        <div class="form-group">
                            <label for="subscriptionUrl">订阅源URL:</label>
                            <input type="text" id="subscriptionUrl" placeholder="https://example.com/rules.json">
                        </div>
                        <div class="form-group">
                            <label for="subscriptionName">名称（可选）:</label>
                            <input type="text" id="subscriptionName" placeholder="自定义名称">
                        </div>
                        <button id="addSubscription" class="btn btn-primary">添加订阅源</button>
                    </div>
                    
                    <div class="subscription-actions">
                        <button id="updateAllSubscriptions" class="btn btn-success">更新所有订阅源</button>
                        <button id="closeSubscriptionModal" class="btn btn-secondary">关闭</button>
                    </div>
                    
                    <div id="subscriptionsList"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 绑定模态框事件
        this.bindSubscriptionModalEvents();
    }

    // 绑定订阅源模态框事件
    bindSubscriptionModalEvents() {
        const modal = document.getElementById('subscriptionModal');

        // 关闭按钮
        modal.querySelector('.close').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // 关闭按钮
        modal.querySelector('#closeSubscriptionModal').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // 添加订阅源按钮
        modal.querySelector('#addSubscription').addEventListener('click', () => {
            const url = document.getElementById('subscriptionUrl').value.trim();
            const name = document.getElementById('subscriptionName').value.trim();

            if (this.addSubscription({ url, name })) {
                document.getElementById('subscriptionUrl').value = '';
                document.getElementById('subscriptionName').value = '';
                this.renderSubscriptionsList();
                this.core.setStatus('订阅源添加成功');
            }
        });

        // 更新所有订阅源按钮
        modal.querySelector('#updateAllSubscriptions').addEventListener('click', async () => {
            this.core.setStatus('正在更新所有订阅源...');
            const result = await this.updateAllSubscriptions();
            this.core.setStatus(result.message);
            this.renderSubscriptionsList();
        });

        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // 判断是否需要使用代理
    shouldUseProxy(url) {
        try {
            const currentOrigin = window.location.origin;
            const targetOrigin = new URL(url).origin;
            return currentOrigin !== targetOrigin;
        } catch {
            return true;
        }
    }

    // 获取代理URL
    async getProxyUrl(originalUrl) {
        // 尝试不同的代理服务
        for (const proxyServiceFn of this.proxyServices) {
            try {
                const proxyUrl = proxyServiceFn() + encodeURIComponent(originalUrl);
                const testResponse = await fetch(proxyUrl, {
                    method: 'HEAD',
                    timeout: 5000
                });

                if (testResponse.ok) {
                    return proxyUrl;
                }
            } catch (error) {
                console.log(`代理服务不可用:`, error.message);
                continue;
            }
        }

        // 如果所有代理都失败，返回原始URL（让浏览器处理CORS）
        return originalUrl;
    }

}

export default SubscriptionManager;