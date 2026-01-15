// 工具函数模块 - 通用工具函数

// HTML转义函数
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 选择行函数
export function selectLine(index) {
    this.selectedLineIndex = index;
    if (this.updateSelectedLine) {
        this.updateSelectedLine();
    }

    // 同步到排查区或诊断区
    syncToSidePanel.call(this, index);
}

// 同步到侧边栏（排查区或诊断区）
function syncToSidePanel(index) {
    // 移除之前的高亮
    document.querySelectorAll('.flash-highlight').forEach(el => {
        el.classList.remove('flash-highlight');
    });

    const activeTabBtn = document.querySelector('.investigation-tabs .tab-btn.active');
    if (!activeTabBtn) return;

    const tabName = activeTabBtn.dataset.tab;

    if (tabName === 'investigation') {
        syncToInvestigation.call(this, index);
    } else if (tabName === 'diagnosis') {
        syncToDiagnosis.call(this, index);
    }
}

// 同步到排查区
function syncToInvestigation(targetIndex) {
    const container = document.getElementById('investigationContent');
    if (!container) return;

    const items = Array.from(container.querySelectorAll('.investigation-item'));
    if (items.length === 0) return;

    // 找到最接近的元素
    const targetElement = findClosestElement(items, targetIndex, 'index');

    if (targetElement) {
        highlightAndScroll(container, targetElement);
    }
}

// 同步到诊断区
function syncToDiagnosis(targetIndex) {
    const container = document.getElementById('diagnosisContent');
    if (!container) return;

    // 诊断区是按组显示的，我们需要找到对应的组或者具体的项
    const groups = Array.from(container.querySelectorAll('.diagnosis-group'));
    if (groups.length === 0) return;

    // 找到最接近的组
    const targetGroup = findClosestElement(groups, targetIndex, 'logIndex');

    if (targetGroup) {
        // 在组内找到具体的项（如果可能）
        // 这里简单起见，高亮整个组，或者你可以进一步逻辑找到组内哪一条规则匹配
        highlightAndScroll(container, targetGroup);
    }
}

// 查找最接近的元素
function findClosestElement(elements, targetIndex, dataAttr) {
    let closest = null;
    let minDiff = Infinity;

    elements.forEach(el => {
        // dataAttr可以是 'index' (dataset.index) 或 'logIndex' (dataset.logIndex)
        // 注意 dataset 属性名是驼峰式，HTML中是 data-log-index，JS中是 dataset.logIndex
        let indexVal = el.dataset[dataAttr];
        const index = parseInt(indexVal);

        if (!isNaN(index)) {
            const diff = Math.abs(index - targetIndex);
            if (diff < minDiff) {
                minDiff = diff;
                closest = el;
            }
        }
    });

    return closest;
}

// 高亮并滚动
function highlightAndScroll(container, element) {
    // 添加闪烁高亮
    element.classList.add('flash-highlight');

    // 设置定时器移除高亮类，以便下次可以再次触发动画
    setTimeout(() => {
        element.classList.remove('flash-highlight');
    }, 1500); // 3次闪烁(0.5s * 3)

    // 获取实际的滚动容器（通常是内容容器的父元素）
    const scrollContainer = container.parentElement;

    // 强制尝试滚动，不进行高度检查，由浏览器处理是否需要滚动
    element.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

// 获取规则ID函数
export function getRuleId(rule) {
    // 确保规则有ID，如果没有则生成一个
    if (!rule.id) {
        rule.id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return rule.id;
}

// 生成规则ID
export function generateRuleId() {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 获取激活的规则
export function getActiveRules() {
    // 如果没有激活的配置组，返回所有规则
    if (this.activeGroups.size === 0) {
        return this.regexRules;
    }

    // 获取激活配置组中的规则ID
    const activeRuleIds = new Set();
    this.configGroups.forEach(group => {
        if (this.activeGroups.has(group.id)) {
            group.ruleIds.forEach(ruleId => activeRuleIds.add(ruleId));
        }
    });

    // 返回对应的规则对象
    return this.regexRules.filter(rule => activeRuleIds.has(this.getRuleId(rule)));
}