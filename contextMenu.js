// 右键菜单模块 - 负责上下文菜单处理
class ContextMenu {
    constructor(core) {
        this.core = core;
    }

    // 处理右键菜单事件
    handleContextMenu(e) {
        if (e.target.classList.contains('log-line')) {
            e.preventDefault();
            const index = parseInt(e.target.dataset.index);
            this.showContextMenu(e, index);
        } else if (e.target.closest('.investigation-item')) {
            e.preventDefault();
            const investigationItem = e.target.closest('.investigation-item');
            const originalIndex = parseInt(investigationItem.dataset.index);
            this.showInvestigationContextMenu(e, originalIndex);
        }
    }

    // 显示日志右键菜单
    showContextMenu(e, index) {
        this.core.contextMenu.style.display = 'block';
        this.core.contextMenu.style.left = e.pageX + 'px';
        this.core.contextMenu.style.top = e.pageY + 'px';
        this.core.contextMenu.dataset.index = index;
    }

    // 显示排查区右键菜单
    showInvestigationContextMenu(e, originalIndex) {
        this.core.investigationContextMenu.style.display = 'block';
        this.core.investigationContextMenu.style.left = e.pageX + 'px';
        this.core.investigationContextMenu.style.top = e.pageY + 'px';
        this.core.investigationContextMenu.dataset.originalIndex = originalIndex;
    }

    // 隐藏右键菜单
    hideContextMenu() {
        this.core.contextMenu.style.display = 'none';
        this.core.investigationContextMenu.style.display = 'none';
    }

    // 处理菜单操作
    handleMenuAction(e) {
        const action = e.target.dataset.action;
        const index = parseInt(this.core.contextMenu.dataset.index);
        
        if (action === 'add-to-investigation') {
            this.addToInvestigation(index);
        } else if (action === 'copy-line') {
            this.copyLine(index);
        }
        
        this.hideContextMenu();
    }

    // 处理排查区菜单操作
    handleInvestigationMenuAction(e) {
        const action = e.target.dataset.action;
        const originalIndex = parseInt(this.core.investigationContextMenu.dataset.originalIndex);
        
        if (action === 'remove-from-investigation') {
            this.removeFromInvestigation(originalIndex);
        } else if (action === 'copy-line') {
            this.copyLineFromInvestigation(originalIndex);
        }
        
        this.hideContextMenu();
    }

    // 添加到排查区
    addToInvestigation(index) {
        const log = this.core.logs[index];
        if (!this.core.investigationLogs.some(item => item.originalIndex === log.originalIndex)) {
            this.core.investigationLogs.push({...log});
            if (this.core.renderInvestigationLogs) {
                this.core.renderInvestigationLogs();
            }
            this.core.setStatus('已添加到排查区');
        }
    }

    // 从排查区移除
    removeFromInvestigation(originalIndex) {
        const index = this.core.investigationLogs.findIndex(item => item.originalIndex === originalIndex);
        if (index !== -1) {
            this.core.investigationLogs.splice(index, 1);
            if (this.core.renderInvestigationLogs) {
                this.core.renderInvestigationLogs();
            }
            this.core.setStatus('已从排查区移除');
        }
    }

    // 复制行内容
    copyLine(index) {
        const log = this.core.logs[index];
        navigator.clipboard.writeText(log.content).then(() => {
            this.core.setStatus('已复制到剪贴板');
        });
    }

    // 从排查区复制行内容
    copyLineFromInvestigation(originalIndex) {
        const log = this.core.investigationLogs.find(item => item.originalIndex === originalIndex);
        if (log) {
            navigator.clipboard.writeText(log.content).then(() => {
                this.core.setStatus('已复制到剪贴板');
            });
        }
    }
}

export default ContextMenu;