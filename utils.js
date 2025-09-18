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
}

// 获取规则ID函数
export function getRuleId(rule) {
    // 为规则生成唯一ID（基于内容和配置）
    return `${rule.pattern}|${rule.color}|${rule.bgColor}|${rule.highlightWholeLine}`;
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