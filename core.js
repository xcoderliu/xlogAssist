class LogAnalyzer {
    constructor() {
        this.logs = [];
        this.investigationLogs = [];
        this.regexRules = [];
        this.configGroups = [];
        this.activeGroups = new Set();
        this.currentFile = null;
        this.editingIndex = undefined;
        
        // 搜索相关属性
        this.searchResults = [];
        this.currentSearchIndex = -1;
        this.isRealSearchMode = false;
        this.searchTerm = '';
        
        // 过滤相关属性
        this.filteredLogs = null;
        this.filterTerm = '';
        
        // 选中行相关属性
        this.selectedLineIndex = -1;
        
        // 初始化模块
        this.initializeModules();
    }

    initializeModules() {
        // 初始化UI元素
        this.initializeElements();
        
        // 绑定事件
        this.bindEvents();
        
        // 加载配置
        this.loadConfig();
    }

    initializeElements() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.logContent = document.getElementById('logContent');
        this.logCount = document.getElementById('logCount');
        this.investigationContent = document.getElementById('investigationContent');
        this.contextMenu = document.getElementById('contextMenu');
        this.configPanel = document.getElementById('configPanel');
        this.status = document.getElementById('status');
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.prevMatch = document.getElementById('prevMatch');
        this.nextMatch = document.getElementById('nextMatch');
        this.clearSearch = document.getElementById('clearSearch');
        this.filterInput = document.getElementById('filterInput');
        this.filterBtn = document.getElementById('filterBtn');
        this.clearFilter = document.getElementById('clearFilter');
        this.groupNameInput = document.getElementById('groupName');
        this.createGroupBtn = document.getElementById('createGroup');
        this.groupCheckboxes = document.getElementById('groupCheckboxes');
        this.investigationContextMenu = document.getElementById('investigationContextMenu');
        
        // 导出导入按钮
        this.exportConfigBtn = document.getElementById('exportConfig');
        this.importConfigBtn = document.getElementById('importConfig');
        this.importConfigFileInput = document.getElementById('importConfigFile');
    }

    bindEvents() {
        // 拖拽上传事件
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.dropZone.addEventListener('drop', (e) => this.handleDrop(e));
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // 控制按钮事件
        document.getElementById('clearLogs').addEventListener('click', () => this.clearLogs());
        document.getElementById('exportLogs').addEventListener('click', () => this.exportLogs());
        document.getElementById('clearInvestigation').addEventListener('click', () => this.clearInvestigation());
        document.getElementById('exportInvestigation').addEventListener('click', () => this.exportInvestigation());
        
        // 搜索功能事件
        this.searchBtn.addEventListener('click', () => this.realSearchLogs());
        this.prevMatch.addEventListener('click', () => this.navigateToPrevMatch());
        this.nextMatch.addEventListener('click', () => this.navigateToNextMatch());
        this.clearSearch.addEventListener('click', () => this.clearSearchResults());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.realSearchLogs();
            }
        });

        // 过滤功能事件
        this.filterBtn.addEventListener('click', () => this.filterLogs());
        this.clearFilter.addEventListener('click', () => this.clearFilterResults());
        this.filterInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.filterLogs();
            }
        });

        // 配置面板事件
        document.getElementById('configBtn').addEventListener('click', () => this.showConfigPanel());
        document.getElementById('closeConfig').addEventListener('click', () => this.hideConfigPanel());
        document.getElementById('addRegexRule').addEventListener('click', () => this.addRegexRule());

        // 右键菜单事件
        document.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
        document.addEventListener('click', () => this.hideContextMenu());
        this.contextMenu.addEventListener('click', (e) => this.handleMenuAction(e));
        this.investigationContextMenu.addEventListener('click', (e) => this.handleInvestigationMenuAction(e));

        // 配置组事件
        this.createGroupBtn.addEventListener('click', () => this.createConfigGroup());
        
        // 标签页切换事件
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });
    }

    // 状态管理方法
    setStatus(message, type = 'success') {
        this.status.textContent = message;
        this.status.style.color = type === 'error' ? '#dc3545' : '#28a745';
        
        if (type === 'success') {
            setTimeout(() => {
                this.status.textContent = '就绪';
                this.status.style.color = '#28a745';
            }, 3000);
        }
    }

    // 配置管理方法
    saveConfig() {
        localStorage.setItem('xlogAssist_regexRules', JSON.stringify(this.regexRules));
        localStorage.setItem('xlogAssist_configGroups', JSON.stringify(this.configGroups));
        localStorage.setItem('xlogAssist_activeGroups', JSON.stringify(Array.from(this.activeGroups)));
    }

    loadConfig() {
        const savedRules = localStorage.getItem('xlogAssist_regexRules');
        const savedGroups = localStorage.getItem('xlogAssist_configGroups');
        const savedActiveGroups = localStorage.getItem('xlogAssist_activeGroups');
        
        if (savedRules) {
            this.regexRules = JSON.parse(savedRules);
        }
        
        if (savedGroups) {
            this.configGroups = JSON.parse(savedGroups);
        }
        
        if (savedActiveGroups) {
            this.activeGroups = new Set(JSON.parse(savedActiveGroups));
        }
    }

    // 获取激活的规则
    getActiveRules() {
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

    getRuleId(rule) {
        // 为规则生成唯一ID（基于内容和配置）
        return `${rule.pattern}|${rule.color}|${rule.bgColor}|${rule.highlightWholeLine}`;
    }

    // 标签页切换
    switchTab(tabName) {
        // 切换标签页按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // 切换标签页内容
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.tab === tabName);
        });
        
        if (tabName === 'groups') {
            this.renderGroupsList();
            this.renderGroupSelection();
        }
    }
}

// 导出核心类
export default LogAnalyzer;