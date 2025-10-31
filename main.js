// 主入口文件 - 应用初始化
import LogAnalyzer from './core.js';
import FileHandler from './fileHandler.js';
import SearchFilter from './searchFilter.js';
import ConfigManager from './configManager.js';
import UIRenderer from './uiRenderer.js';
import ContextMenu from './contextMenu.js';
import Investigation from './investigation.js';
import ExportManager from './export.js';
import Resizer from './resizer.js';
import Diagnosis from './diagnosis.js';
import CustomDownloadManager from './customDownloadManager.js';
import Charting from './charting.js';
import { escapeHtml, selectLine, getRuleId, getActiveRules } from './utils.js';

// 扩展核心类的功能
Object.assign(LogAnalyzer.prototype, {
    // 文件处理相关方法
    handleDragOver: function (e) { return new FileHandler(this).handleDragOver(e); },
    handleDragLeave: function (e) { return new FileHandler(this).handleDragLeave(e); },
    handleDrop: function (e) { return new FileHandler(this).handleDrop(e); },
    handleFileSelect: function (e) { return new FileHandler(this).handleFileSelect(e); },
    processFiles: function (files) { return new FileHandler(this).processFiles(files); },
    readFile: function (file) { return new FileHandler(this).readFile(file); },
    parseLogContent: function (content, filename) { return new FileHandler(this).parseLogContent(content, filename); },
    clearLogs: function () { return new FileHandler(this).clearLogs(); },

    // 搜索过滤相关方法
    filterLogs: function () { return new SearchFilter(this).filterLogs(); },
    clearFilterResults: function () { return new SearchFilter(this).clearFilterResults(); },
    realSearchLogs: function () { return new SearchFilter(this).realSearchLogs(); },
    navigateToNextMatch: function () { return new SearchFilter(this).navigateToNextMatch(); },
    navigateToPrevMatch: function () { return new SearchFilter(this).navigateToPrevMatch(); },
    clearSearchResults: function () { return new SearchFilter(this).clearSearchResults(); },

    // 配置管理相关方法
    showConfigPanel: function () { return new ConfigManager(this).showConfigPanel(); },
    hideConfigPanel: function () { return new ConfigManager(this).hideConfigPanel(); },
    addRegexRule: function () { return new ConfigManager(this).addRegexRule(); },
    updateGroupRuleReferences: function (oldRuleId, newRuleId) { return new ConfigManager(this).updateGroupRuleReferences(oldRuleId, newRuleId); },
    renderRulesList: function () { return new ConfigManager(this).renderRulesList(); },
    editRule: function (index) { return new ConfigManager(this).editRule(index); },
    deleteRule: function (index, event) { return new ConfigManager(this).deleteRule(index, event); },
    createConfigGroup: function () { return new ConfigManager(this).createConfigGroup(); },
    renderGroupsList: function () { return new ConfigManager(this).renderGroupsList(); },
    renderGroupSelection: function () { return new ConfigManager(this).renderGroupSelection(); },
    editConfigGroup: function (index) { return new ConfigManager(this).editConfigGroup(index); },
    deleteConfigGroup: function (index, event) { return new ConfigManager(this).deleteConfigGroup(index, event); },
    openGroupRulesManager: function (groupId) { return new ConfigManager(this).openGroupRulesManager(groupId); },
    renderGroupRulesList: function (group) { return new ConfigManager(this).renderGroupRulesList(group); },
    renderAvailableRulesList: function (group) { return new ConfigManager(this).renderAvailableRulesList(group); },
    addRuleToGroup: function (groupId, ruleId) { return new ConfigManager(this).addRuleToGroup(groupId, ruleId); },
    bindGroupRuleEvents: function () { return new ConfigManager(this).bindGroupRuleEvents(); },
    removeRuleFromGroup: function (groupId, ruleId) { return new ConfigManager(this).removeRuleFromGroup(groupId, ruleId); },
    exportConfig: function () { return new ConfigManager(this).exportConfig(); },
    importConfig: function (file) { return new ConfigManager(this).importConfig(file); },
    mergeConfig: function (configData) { return new ConfigManager(this).mergeConfig(configData); },
    bindExportImportEvents: function () { return new ConfigManager(this).bindExportImportEvents(); },

    // UI渲染相关方法
    renderLogs: function () { return new UIRenderer(this).renderLogs(); },
    applyRegexHighlighting: function (text) { return new UIRenderer(this).applyRegexHighlighting(text); },
    highlightCurrentSearchResult: function (index) { return new UIRenderer(this).highlightCurrentSearchResult(index); },
    updateSelectedLine: function () { return new UIRenderer(this).updateSelectedLine(); },
    updateLogCount: function () { return new UIRenderer(this).updateLogCount(); },

    // 右键菜单相关方法
    handleContextMenu: function (e) { return new ContextMenu(this).handleContextMenu(e); },
    showContextMenu: function (e, index) { return new ContextMenu(this).showContextMenu(e, index); },
    showInvestigationContextMenu: function (e, originalIndex) { return new ContextMenu(this).showInvestigationContextMenu(e, originalIndex); },
    hideContextMenu: function () { return new ContextMenu(this).hideContextMenu(); },
    handleMenuAction: function (e) { return new ContextMenu(this).handleMenuAction(e); },
    handleInvestigationMenuAction: function (e) { return new ContextMenu(this).handleInvestigationMenuAction(e); },
    addToInvestigation: function (index) { return new ContextMenu(this).addToInvestigation(index); },
    removeFromInvestigation: function (originalIndex) { return new ContextMenu(this).removeFromInvestigation(originalIndex); },
    copyLine: function (index) { return new ContextMenu(this).copyLine(index); },
    copyLineFromInvestigation: function (originalIndex) { return new ContextMenu(this).copyLineFromInvestigation(originalIndex); },

    // 排查区相关方法
    renderInvestigationLogs: function () { return new Investigation(this).renderInvestigationLogs(); },
    clearInvestigation: function () { return new Investigation(this).clearInvestigation(); },

    // 导出相关方法
    exportLogs: function () { return new ExportManager(this).exportLogs(); },
    exportInvestigation: function () { return new ExportManager(this).exportInvestigation(); },
    exportContent: function (content, filename) { return new ExportManager(this).exportContent(content, filename); },

    // 工具函数
    escapeHtml,
    selectLine,
    getRuleId,
    getActiveRules
});

// 扩展核心类以包含诊断功能
Object.assign(LogAnalyzer.prototype, {
    // 诊断相关方法
    initializeDiagnosis: function () { return new Diagnosis(this).initialize(); },
    performDiagnosis: function () { return new Diagnosis(this).performDiagnosis(); },
    clearDiagnosisResults: function () { return new Diagnosis(this).clearDiagnosisResults(); },
    exportDiagnosisRules: function () { return new Diagnosis(this).exportDiagnosisRules(); },
    importDiagnosisRules: function (file) { return new Diagnosis(this).importDiagnosisRules(file); },
    addDiagnosisRule: function (rule) { return new Diagnosis(this).addDiagnosisRule(rule); },
    updateDiagnosisRule: function (ruleId, updatedRule) { return new Diagnosis(this).updateDiagnosisRule(ruleId, updatedRule); },
    deleteDiagnosisRule: function (ruleId) { return new Diagnosis(this).deleteDiagnosisRule(ruleId); },
    renderDiagnosisRulesList: function () { return new ConfigManager(this).renderDiagnosisRulesList(); },
    editDiagnosisRule: function (index) { return new ConfigManager(this).editDiagnosisRule(index); },
    toggleDiagnosisRule: function (index) { return new ConfigManager(this).toggleDiagnosisRule(index); },
    deleteDiagnosisRuleByIndex: function (index) { return new ConfigManager(this).deleteDiagnosisRule(index); }
});

// 扩展核心类以包含分隔条功能
Object.assign(LogAnalyzer.prototype, {
    // 分隔条相关方法
    initializeResizer: function () { return new Resizer(this); }
});

// 扩展核心类以包含自定义下载功能
Object.assign(LogAnalyzer.prototype, {
    // 自定义下载相关方法
    initializeCustomDownload: function () {
        this.customDownloadManager = new CustomDownloadManager(this);
        return this.customDownloadManager;
    },
    showCustomDownloadSources: function () {
        return this.customDownloadManager.showCustomDownloadSources();
    },
    scanCustomSources: function () {
        return this.customDownloadManager.scanCustomSources();
    },
    addFormattedLogs: function (formattedLogs, sourceName) {
        return this.customDownloadManager.addFormattedLogs(formattedLogs, sourceName);
    }
});

// 扩展核心类以包含文件处理功能
Object.assign(LogAnalyzer.prototype, {
    // 文件处理相关方法
    initializeFileHandler: function () {
        this.fileHandler = new FileHandler(this);
        return this.fileHandler;
    },
    saveLastLogs: function (logs) {
        if (this.fileHandler && this.fileHandler.saveLastLogs) {
            return this.fileHandler.saveLastLogs(logs);
        }
    },
    loadLastLogs: function () {
        if (this.fileHandler && this.fileHandler.loadLastLogs) {
            return this.fileHandler.loadLastLogs();
        }
        return [];
    },
    quickOpenLastLogs: function () {
        if (this.fileHandler && this.fileHandler.quickOpenLastLogs) {
            return this.fileHandler.quickOpenLastLogs();
        }
        return false;
    }
});

// 扩展核心类以包含绘图功能
Object.assign(LogAnalyzer.prototype, {
    // 绘图相关方法
    initializeCharting: function () {
        this.charting = new Charting(this);
        return this.charting;
    },
    initializeChartingUI: function () {
        if (this.charting && this.charting.initializeChartingUI) {
            return this.charting.initializeChartingUI();
        }
    },
    generateChart: function (configId) {
        if (this.charting && this.charting.generateChart) {
            return this.charting.generateChart(configId);
        }
    },
    generateAllCharts: function () {
        if (this.charting && this.charting.generateAllCharts) {
            return this.charting.generateAllCharts();
        }
    },
    refreshAllCharts: function () {
        if (this.charting && this.charting.refreshAllCharts) {
            return this.charting.refreshAllCharts();
        }
    },
    showChartConfigModal: function () {
        if (this.charting && this.charting.showChartConfigModal) {
            return this.charting.showChartConfigModal();
        }
    }
});

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', async () => {
    app = new LogAnalyzer();
    // 将app暴露到全局作用域，供自定义下载源页面使用
    window.app = app;
    // 绑定导出导入事件
    app.bindExportImportEvents();
    // 初始化分隔条
    app.initializeResizer();
    // 初始化诊断模块
    app.initializeDiagnosis();
    // 初始化文件处理器
    app.initializeFileHandler();
    // 初始化自定义下载管理器
    app.initializeCustomDownload();
    // 初始化绘图模块
    app.initializeCharting();

    // 扫描自定义下载源
    await app.scanCustomSources();

    // 确保app对象有customSources属性
    if (!app.customSources) {
        app.customSources = app.customDownloadManager.customSources || [];
    }

    // 绑定自定义下载事件
    const customDownloadZone = document.getElementById('customDownloadZone');
    if (customDownloadZone) {
        customDownloadZone.addEventListener('click', () => {
            app.showCustomDownloadSources();
        });
    }

    // 添加状态显示到页面
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = `就绪 - 自定义下载源: ${app.customSources ? app.customSources.length : 0}个`;
    }

    // 手动触发检查上次日志按钮显示
    if (app.renderLogs) {
        app.renderLogs();
    }

    // 初始化绘图区UI
    if (app.initializeChartingUI) {
        app.initializeChartingUI();
    }
});