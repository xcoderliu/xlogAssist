// 全局通知管理器 - 用于自定义下载源与主界面之间的通信
class NotificationManager {
    constructor() {
        this.listeners = new Map();
        this.messageQueue = [];
    }

    // 添加监听器
    addListener(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType).add(callback);
        
        // 处理队列中的消息
        this.processQueuedMessages(eventType, callback);
    }

    // 移除监听器
    removeListener(eventType, callback) {
        if (this.listeners.has(eventType)) {
            this.listeners.get(eventType).delete(callback);
            if (this.listeners.get(eventType).size === 0) {
                this.listeners.delete(eventType);
            }
        }
    }

    // 发送通知
    sendNotification(eventType, data) {
        const message = {
            type: eventType,
            data: data,
            timestamp: Date.now()
        };

        const listeners = this.listeners.get(eventType);
        if (listeners && listeners.size > 0) {
            // 有监听器，直接发送
            listeners.forEach(callback => {
                try {
                    callback(message);
                } catch (error) {
                    console.error('通知回调错误:', error);
                }
            });
        } else {
            // 没有监听器，加入队列
            this.messageQueue.push(message);
            // 限制队列大小
            if (this.messageQueue.length > 100) {
                this.messageQueue.shift();
            }
        }
    }

    // 处理队列中的消息
    processQueuedMessages(eventType, callback) {
        const messages = this.messageQueue.filter(msg => msg.type === eventType);
        messages.forEach(message => {
            try {
                callback(message);
            } catch (error) {
                console.error('队列消息处理错误:', error);
            }
        });
        // 从队列中移除已处理的消息
        this.messageQueue = this.messageQueue.filter(msg => msg.type !== eventType);
    }

    // 清空队列
    clearQueue() {
        this.messageQueue = [];
    }

    // 获取队列大小
    getQueueSize() {
        return this.messageQueue.length;
    }
}

// 创建全局实例
const globalNotificationManager = new NotificationManager();

// 导出全局实例
export default globalNotificationManager;