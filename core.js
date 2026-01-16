import ConfigManager from './configManager.js';
import { getRuleId } from './utils.js';

class LogAnalyzer {
    constructor() {
        this.logs = [];
        this.investigationLogs = [];
        this.regexRules = [];
        this.configGroups = [];
        this.activeGroups = new Set();
        this.filterGroups = new Set(); // 新增：用于存储启用过滤的配置组
        this.diagnosisRules = []; // 新增：诊断规则
        this.currentFile = null;
        this.editingIndex = undefined;
        this.editingDiagnosisIndex = undefined; // 新增：编辑诊断规则索引
        this.editingChartConfigId = undefined; // 新增：编辑图表配置ID

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

        // 主题相关属性
        this.currentTheme = localStorage.getItem('xlogAssist_theme') || 'light';

        // 初始化模块
        this.initializeModules();
    }

    initializeModules() {
        // 初始化UI元素
        this.initializeElements();

        // 初始化主题
        this.initializeTheme();

        // 绑定事件
        this.bindEvents();

        // 加载配置
        this.loadConfig();
    }

    initializeTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateThemeButton();
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('xlogAssist_theme', this.currentTheme);
        this.updateThemeButton();

        // 通知Monaco Renderer更新主题
        if (this.monacoRenderer) {
            this.monacoRenderer.updateTheme(this.currentTheme);
        }

        // 通知Chart模块更新主题
        if (this.charting && this.charting.updateTheme) {
            this.charting.updateTheme(this.currentTheme);
        }
    }

    updateThemeButton() {
        const btn = document.getElementById('themeToggleBtn');
        if (btn) {
            btn.textContent = this.currentTheme === 'light' ? '🌓' : '☀️';
            btn.title = this.currentTheme === 'light' ? '切换到深色模式' : '切换到浅色模式';
        }
    }

    initializeElements() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.themeToggleBtn = document.getElementById('themeToggleBtn');
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
        this.clearAllStorageBtn = document.getElementById('clearAllStorage');
        this.importConfigFileInput = document.getElementById('importConfigFile');

    }

    bindEvents() {
        // 拖拽上传事件
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.dropZone.addEventListener('drop', (e) => this.handleDrop(e));
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // 主题切换事件
        if (this.themeToggleBtn) {
            this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        }

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
        localStorage.setItem('xlogAssist_filterGroups', JSON.stringify(Array.from(this.filterGroups))); // 新增：保存过滤配置组
    }

    loadConfig() {
        const savedRules = localStorage.getItem('xlogAssist_regexRules');
        const savedGroups = localStorage.getItem('xlogAssist_configGroups');
        const savedActiveGroups = localStorage.getItem('xlogAssist_activeGroups');
        const savedFilterGroups = localStorage.getItem('xlogAssist_filterGroups'); // 新增：加载过滤配置组
        const savedDiagnosisRules = localStorage.getItem('xlogAssist_diagnosisRules');

        let needSave = false;

        if (savedRules) {
            this.regexRules = JSON.parse(savedRules);
            // 确保老数据有ID
            this.regexRules.forEach(rule => {
                if (!rule.id) {
                    rule.id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    needSave = true;
                }
            });
        }

        if (savedGroups) {
            this.configGroups = JSON.parse(savedGroups);
        }

        if (savedActiveGroups) {
            this.activeGroups = new Set(JSON.parse(savedActiveGroups));
        }

        if (savedFilterGroups) {
            this.filterGroups = new Set(JSON.parse(savedFilterGroups)); // 新增：加载过滤配置组
        }

        // 加载诊断规则到core中，供configManager使用
        if (savedDiagnosisRules) {
            this.diagnosisRules = JSON.parse(savedDiagnosisRules);
        }

        // 如果更新了老数据的ID，保存配置
        if (needSave) {
            this.saveConfig();
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
        // 使用utils.js中的getRuleId函数，确保规则有ID
        return getRuleId(rule);
    }

    // 标签页切换
    switchTab(tabName) {
        const configPanel = document.getElementById('configPanel');
        if (configPanel) {
            configPanel.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tabName);
            });
            configPanel.querySelectorAll('.tab-content').forEach(content => {
                content.classList.toggle('active', content.dataset.tab === tabName);
            });
        }

        if (tabName === 'groups') {
            this.renderGroupsList();
            this.renderGroupSelection();
        } else if (tabName === 'diagnosis') {
            // 调用诊断模块中的诊断规则渲染方法
            this.renderDiagnosisRulesList();
        }
    }

}

// 导出核心类
export default LogAnalyzer;
