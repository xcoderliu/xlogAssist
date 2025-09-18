// 主入口文件 - 应用初始化
import LogAnalyzer from './core.js';
import FileHandler from './fileHandler.js';
import SearchFilter from './searchFilter.js';
import ConfigManager from './configManager.js';
import UIRenderer from './uiRenderer.js';
import ContextMenu from './contextMenu.js';
import Investigation from './investigation.js';
import ExportManager from './export.js';
import { escapeHtml, selectLine, getRuleId, getActiveRules } from './utils.js';

// 扩展核心类的功能
Object.assign(LogAnalyzer.prototype, {
    // 文件处理相关方法
    handleDragOver: function(e) { return new FileHandler(this).handleDragOver(e); },
    handleDragLeave: function(e) { return new FileHandler(this).handleDragLeave(e); },
    handleDrop: function(e) { return new FileHandler(this).handleDrop(e); },
    handleFileSelect: function(e) { return new FileHandler(this).handleFileSelect(e); },
    processFiles: function(files) { return new FileHandler(this).processFiles(files); },
    readFile: function(file) { return new FileHandler(this).readFile(file); },
    parseLogContent: function(content, filename) { return new FileHandler(this).parseLogContent(content, filename); },
    clearLogs: function() { return new FileHandler(this).clearLogs(); },

    // 搜索过滤相关方法
    filterLogs: function() { return new SearchFilter(this).filterLogs(); },
    clearFilterResults: function() { return new SearchFilter(this).clearFilterResults(); },
    realSearchLogs: function() { return new SearchFilter(this).realSearchLogs(); },
    navigateToNextMatch: function() { return new SearchFilter(this).navigateToNextMatch(); },
    navigateToPrevMatch: function() { return new SearchFilter(this).navigateToPrevMatch(); },
    clearSearchResults: function() { return new SearchFilter(this).clearSearchResults(); },

    // 配置管理相关方法
    showConfigPanel: function() { return new ConfigManager(this).showConfigPanel(); },
    hideConfigPanel: function() { return new ConfigManager(this).hideConfigPanel(); },
    addRegexRule: function() { return new ConfigManager(this).addRegexRule(); },
    updateGroupRuleReferences: function(oldRuleId, newRuleId) { return new ConfigManager(this).updateGroupRuleReferences(oldRuleId, newRuleId); },
    renderRulesList: function() { return new ConfigManager(this).renderRulesList(); },
    editRule: function(index) { return new ConfigManager(this).editRule(index); },
    deleteRule: function(index, event) { return new ConfigManager(this).deleteRule(index, event); },
    createConfigGroup: function() { return new ConfigManager(this).createConfigGroup(); },
    renderGroupsList: function() { return new ConfigManager(this).renderGroupsList(); },
    renderGroupSelection: function() { return new ConfigManager(this).renderGroupSelection(); },
    editConfigGroup: function(index) { return new ConfigManager(this).editConfigGroup(index); },
    deleteConfigGroup: function(index, event) { return new ConfigManager(this).deleteConfigGroup(index, event); },
    openGroupRulesManager: function(groupId) { return new ConfigManager(this).openGroupRulesManager(groupId); },
    renderGroupRulesList: function(group) { return new ConfigManager(this).renderGroupRulesList(group); },
    renderAvailableRulesList: function(group) { return new ConfigManager(this).renderAvailableRulesList(group); },
    addRuleToGroup: function(groupId, ruleId) { return new ConfigManager(this).addRuleToGroup(groupId, ruleId); },
    bindGroupRuleEvents: function() { return new ConfigManager(this).bindGroupRuleEvents(); },
    removeRuleFromGroup: function(groupId, ruleId) { return new ConfigManager(this).removeRuleFromGroup(groupId, ruleId); },
    exportConfig: function() { return new ConfigManager(this).exportConfig(); },
    importConfig: function(file) { return new ConfigManager(this).importConfig(file); },
    mergeConfig: function(configData) { return new ConfigManager(this).mergeConfig(configData); },
    bindExportImportEvents: function() { return new ConfigManager(this).bindExportImportEvents(); },

    // UI渲染相关方法
    renderLogs: function() { return new UIRenderer(this).renderLogs(); },
    applyRegexHighlighting: function(text) { return new UIRenderer(this).applyRegexHighlighting(text); },
    highlightCurrentSearchResult: function(index) { return new UIRenderer(this).highlightCurrentSearchResult(index); },
    updateSelectedLine: function() { return new UIRenderer(this).updateSelectedLine(); },
    updateLogCount: function() { return new UIRenderer(this).updateLogCount(); },

    // 右键菜单相关方法
    handleContextMenu: function(e) { return new ContextMenu(this).handleContextMenu(e); },
    showContextMenu: function(e, index) { return new ContextMenu(this).showContextMenu(e, index); },
    showInvestigationContextMenu: function(e, originalIndex) { return new ContextMenu(this).showInvestigationContextMenu(e, originalIndex); },
    hideContextMenu: function() { return new ContextMenu(this).hideContextMenu(); },
    handleMenuAction: function(e) { return new ContextMenu(this).handleMenuAction(e); },
    handleInvestigationMenuAction: function(e) { return new ContextMenu(this).handleInvestigationMenuAction(e); },
    addToInvestigation: function(index) { return new ContextMenu(this).addToInvestigation(index); },
    removeFromInvestigation: function(originalIndex) { return new ContextMenu(this).removeFromInvestigation(originalIndex); },
    copyLine: function(index) { return new ContextMenu(this).copyLine(index); },
    copyLineFromInvestigation: function(originalIndex) { return new ContextMenu(this).copyLineFromInvestigation(originalIndex); },

    // 排查区相关方法
    renderInvestigationLogs: function() { return new Investigation(this).renderInvestigationLogs(); },
    clearInvestigation: function() { return new Investigation(this).clearInvestigation(); },

    // 导出相关方法
    exportLogs: function() { return new ExportManager(this).exportLogs(); },
    exportInvestigation: function() { return new ExportManager(this).exportInvestigation(); },
    exportContent: function(content, filename) { return new ExportManager(this).exportContent(content, filename); },

    // 工具函数
    escapeHtml,
    selectLine,
    getRuleId,
    getActiveRules
});

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new LogAnalyzer();
    // 绑定导出导入事件
    app.bindExportImportEvents();
});