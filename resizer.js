// 分隔条拖动功能模块
class Resizer {
    constructor(app) {
        this.app = app;
        this.resizer = document.getElementById('resizer');
        this.logDisplayArea = document.getElementById('logDisplayArea');
        this.investigationArea = document.getElementById('investigationArea');
        this.mainContent = document.querySelector('.main-content');
        
        this.isResizing = false;
        this.startX = 0;
        this.startWidth = 0;
        
        // 常量定义
        this.MIN_LOG_WIDTH = 720; // 日志区域最小宽度
        this.MIN_INVESTIGATION_WIDTH = 460; // 排查区域最小宽度
        this.RESIZER_WIDTH = 8; // 分隔条宽度
        this.DEFAULT_LOG_WIDTH = 800; // 默认日志区域宽度
        
        // 延迟初始化，确保DOM完全加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        // 重新获取元素引用，确保DOM已加载
        this.resizer = document.getElementById('resizer');
        this.logDisplayArea = document.getElementById('logDisplayArea');
        this.investigationArea = document.getElementById('investigationArea');
        this.mainContent = document.querySelector('.main-content');
        
        if (!this.resizer || !this.logDisplayArea || !this.investigationArea || !this.mainContent) {
            console.error('Resizer: 无法找到必要的DOM元素');
            return;
        }
        
        this.bindEvents();
        this.setDefaultPosition();
    }

    bindEvents() {
        // 鼠标按下事件
        this.resizer.addEventListener('mousedown', (e) => this.startResize(e));
        
        // 鼠标移动事件
        document.addEventListener('mousemove', (e) => this.resize(e));
        
        // 鼠标释放事件
        document.addEventListener('mouseup', () => this.stopResize());
        
        // 防止拖动时选中文本
        this.resizer.addEventListener('selectstart', (e) => e.preventDefault());
        
        // 触摸事件支持
        this.resizer.addEventListener('touchstart', (e) => this.startResizeTouch(e));
        document.addEventListener('touchmove', (e) => this.resizeTouch(e));
        document.addEventListener('touchend', () => this.stopResize());
    }

    startResize(e) {
        this.isResizing = true;
        this.startX = e.clientX;
        this.startWidth = this.logDisplayArea.offsetWidth;
        
        // 添加拖动样式
        this.resizer.classList.add('dragging');
        document.body.classList.add('resizing');
        
        // 防止文本选中和默认行为
        e.preventDefault();
    }

    startResizeTouch(e) {
        if (e.touches.length === 1) {
            this.isResizing = true;
            this.startX = e.touches[0].clientX;
            this.startWidth = this.logDisplayArea.offsetWidth;
            
            // 添加拖动样式
            this.resizer.classList.add('dragging');
            document.body.classList.add('resizing');
            
            e.preventDefault();
        }
    }

    resize(e) {
        if (!this.isResizing) return;
        
        const dx = e.clientX - this.startX;
        const newWidth = Math.max(this.MIN_LOG_WIDTH, this.startWidth + dx);
        
        // 计算最大宽度，确保右侧区域至少有最小宽度
        const containerWidth = this.mainContent.offsetWidth;
        const maxWidth = containerWidth - this.MIN_INVESTIGATION_WIDTH - this.RESIZER_WIDTH;
        
        // 确保宽度在合理范围内
        if (newWidth <= maxWidth) {
            this.logDisplayArea.style.width = `${newWidth}px`;
            this.investigationArea.style.flex = '1';
        }
        
        e.preventDefault();
    }

    resizeTouch(e) {
        if (!this.isResizing || e.touches.length !== 1) return;
        
        const dx = e.touches[0].clientX - this.startX;
        const newWidth = Math.max(this.MIN_LOG_WIDTH, this.startWidth + dx);
        
        // 计算最大宽度，确保右侧区域至少有最小宽度
        const containerWidth = this.mainContent.offsetWidth;
        const maxWidth = containerWidth - this.MIN_INVESTIGATION_WIDTH - this.RESIZER_WIDTH;
        
        // 确保宽度在合理范围内
        if (newWidth <= maxWidth) {
            this.logDisplayArea.style.width = `${newWidth}px`;
            this.investigationArea.style.flex = '1';
        }
        
        e.preventDefault();
    }

    stopResize() {
        if (!this.isResizing) return;
        
        this.isResizing = false;
        this.resizer.classList.remove('dragging');
        document.body.classList.remove('resizing');
        
        // 保存当前宽度到localStorage
        this.savePosition();
    }

    setDefaultPosition() {
        // 从localStorage加载保存的位置
        const savedWidth = localStorage.getItem('xlogAssist_logAreaWidth');
        
        if (savedWidth) {
            // 确保保存的宽度在合理范围内
            const containerWidth = this.mainContent.offsetWidth;
            const maxWidth = containerWidth - this.MIN_INVESTIGATION_WIDTH - this.RESIZER_WIDTH;
            const validWidth = Math.max(this.MIN_LOG_WIDTH, Math.min(parseInt(savedWidth), maxWidth));
            this.logDisplayArea.style.width = `${validWidth}px`;
            this.investigationArea.style.flex = '1';
        } else {
            // 使用默认宽度
            this.logDisplayArea.style.width = `${this.DEFAULT_LOG_WIDTH}px`;
            this.investigationArea.style.flex = '1';
        }
    }

    savePosition() {
        const width = this.logDisplayArea.offsetWidth;
        localStorage.setItem('xlogAssist_logAreaWidth', width);
    }

    // 重置到默认位置
    resetToDefault() {
        this.logDisplayArea.style.width = `${this.DEFAULT_LOG_WIDTH}px`;
        this.investigationArea.style.flex = '1';
        this.savePosition();
    }
}

export default Resizer;