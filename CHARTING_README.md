# xlogAssist 图表可视化功能使用说明

## 功能概述

xlogAssist 现在集成了强大的图表可视化功能，支持从日志数据中提取信息并生成多种类型的图表。该功能结合了前端JavaScript数据提取和后端Python绘图服务，为用户提供灵活的数据分析和可视化能力。

## 最新功能特性

### 界面优化
- **统一配置管理**: 图表配置集成到统一的配置面板中，与其他配置保持一致
- **网格布局**: 图表默认以四分之一大小显示在2x2网格中
- **点击放大**: 点击图表可弹框查看大图，支持全屏查看
- **移除重复按钮**: 绘图区与其他区域界面保持一致，移除重复的生成按钮

### 配置管理增强
- **启用/禁用控制**: 类似诊断规则，支持图表配置的启用/禁用切换
- **统一配置面板**: 图表配置在配置面板的"图表配置"标签页中管理
- **批量操作**: 支持批量生成所有已启用的图表
- **状态管理**: 图表状态清晰显示（就绪、等待、错误、禁用）

### 数据提取改进
- **Python脚本优先**: 推荐使用Python脚本进行复杂数据处理
- **占位符文案**: 为不同图表类型提供合适的占位符提示文案
- **错误处理**: 完善的数据提取错误处理和用户提示
- **格式验证**: 数据格式自动验证和错误提示

## 快速开始

### 1. 使用图表功能

1. 打开 xlogAssist 应用
2. 上传或加载日志文件
3. 在右侧区域切换到"绘图区"标签页
4. 点击"添加图表配置"创建新的图表
5. 配置图表参数并生成图表

## 图表类型

### 折线图
- **适用场景**: 趋势分析、时间序列数据
- **示例用途**: 网络成功率趋势、响应时间变化、错误率监控
- **数据格式**: 包含 `timestamp` 和 `value` 字段的对象数组

### 柱状图
- **适用场景**: 分类数据对比、数量统计
- **示例用途**: 错误类型分布、请求量统计、状态码分布
- **数据格式**: 包含 `category` 和 `value` 字段的对象数组

### 饼图
- **适用场景**: 比例分布、占比分析
- **示例用途**: 用户类型占比、功能使用分布、资源分配
- **数据格式**: 包含 `name` 和 `value` 字段的对象数组

## 数据提取方式

### JavaScript脚本提取
直接在浏览器中执行，适合简单的数据提取逻辑。脚本必须返回包含 `labels` 和 `datasets` 字段的对象。

#### 通用输出格式
```javascript
return {
    labels: ['标签1', '标签2', '标签3', ...],  // X轴标签数组
    datasets: [
        {
            label: '数据集1名称',  // 数据系列名称
            data: [10, 20, 30, ...]  // 数据值数组
        },
        {
            label: '数据集2名称',
            data: [15, 25, 35, ...]
        }
        // 可以添加更多数据集...
    ]
};
```

#### 折线图 - 支持多条线
```javascript
// 示例：提取多个服务的响应时间趋势
const timestamps = ['09:00', '10:00', '11:00', '12:00', '13:00'];
const serviceA = [120, 115, 130, 125, 110];
const serviceB = [95, 100, 105, 98, 102];
const serviceC = [150, 145, 160, 155, 140];

return {
    labels: timestamps,
    datasets: [
        {
            label: '服务A',
            data: serviceA
        },
        {
            label: '服务B',
            data: serviceB
        },
        {
            label: '服务C',
            data: serviceC
        }
    ]
};
```

#### 柱状图 - 多系列对比
```javascript
// 示例：不同错误类型在不同时间的分布
const categories = ['认证错误', '连接错误', '超时错误', '其他错误'];
const day1 = [5, 12, 8, 3];
const day2 = [3, 8, 15, 2];
const day3 = [7, 10, 6, 4];

return {
    labels: categories,
    datasets: [
        {
            label: '第一天',
            data: day1
        },
        {
            label: '第二天',
            data: day2
        },
        {
            label: '第三天',
            data: day3
        }
    ]
};
```

#### 饼图 - 单数据集
```javascript
// 示例：状态码分布
return {
    labels: ['200 OK', '404 Not Found', '500 Error', '302 Redirect'],
    datasets: [
        {
            label: '请求数量',
            data: [850, 45, 23, 82]
        }
    ]
};
```

## 图表配置示例

### 多服务响应时间折线图配置

**基础配置**:
- 图表名称: 多服务响应时间趋势
- 图表类型: 折线图
- 描述: 监控多个服务的响应时间变化趋势

**数据提取脚本**:
```javascript
// 从日志中提取多个服务的响应时间数据
const serviceData = {
    'service-a': [],
    'service-b': [],
    'service-c': []
};

// 按时间分组
const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

// 初始化数据结构
timeSlots.forEach(time => {
    serviceData['service-a'].push(0);
    serviceData['service-b'].push(0);
    serviceData['service-c'].push(0);
});

// 处理日志数据
logs.forEach(log => {
    if (log.includes('response_time')) {
        const timeMatch = log.match(/\d{2}:\d{2}/);
        const serviceMatch = log.match(/service-[abc]/);
        const timeMatch = log.match(/time: (\d+)/);
        
        if (timeMatch && serviceMatch && timeMatch) {
            const time = timeMatch[0];
            const service = serviceMatch[0];
            const responseTime = parseInt(timeMatch[1]);
            
            const timeIndex = timeSlots.indexOf(time);
            if (timeIndex !== -1 && serviceData[service]) {
                serviceData[service][timeIndex] = responseTime;
            }
        }
    }
});

return {
    labels: timeSlots,
    datasets: [
        {
            label: '服务A',
            data: serviceData['service-a']
        },
        {
            label: '服务B',
            data: serviceData['service-b']
        },
        {
            label: '服务C',
            data: serviceData['service-c']
        }
    ]
};
```

### 错误类型分布柱状图配置

**基础配置**:
- 图表名称: 错误类型分布
- 图表类型: 柱状图
- 描述: 统计不同类型的错误数量

**数据提取脚本**:
```javascript
const errorTypes = {};
logs.forEach(log => {
    if (log.includes('error') || log.includes('ERROR')) {
        let type = '其他错误';
        if (log.includes('timeout')) type = '超时错误';
        else if (log.includes('connection')) type = '连接错误';
        else if (log.includes('auth')) type = '认证错误';
        
        errorTypes[type] = (errorTypes[type] || 0) + 1;
    }
});

return {
    labels: Object.keys(errorTypes),
    datasets: [
        {
            label: '错误数量',
            data: Object.values(errorTypes)
        }
    ]
};
```

### 状态码分布饼图配置

**基础配置**:
- 图表名称: HTTP状态码分布
- 图表类型: 饼图
- 描述: 显示HTTP请求状态码的分布比例

**数据提取脚本**:
```javascript
const statusCodes = {
    '200': 0,
    '404': 0,
    '500': 0,
    '302': 0,
    '其他': 0
};

logs.forEach(log => {
    if (log.includes('HTTP')) {
        if (log.includes('200')) statusCodes['200']++;
        else if (log.includes('404')) statusCodes['404']++;
        else if (log.includes('500')) statusCodes['500']++;
        else if (log.includes('302')) statusCodes['302']++;
        else statusCodes['其他']++;
    }
});

return {
    labels: Object.keys(statusCodes),
    datasets: [
        {
            label: '请求数量',
            data: Object.values(statusCodes)
        }
    ]
};
```

### 错误类型分布柱状图配置

**基础配置**:
- 图表名称: 错误类型分布
- 图表类型: 柱状图
- 描述: 统计不同类型的错误数量

**数据提取脚本**:
```javascript
const errorTypes = {};
logs.forEach(log => {
    if (log.includes('error') || log.includes('ERROR')) {
        let type = '其他错误';
        if (log.includes('timeout')) type = '超时错误';
        else if (log.includes('connection')) type = '连接错误';
        else if (log.includes('auth')) type = '认证错误';
        
        errorTypes[type] = (errorTypes[type] || 0) + 1;
    }
});

return {
    success: true,
    data: Object.entries(errorTypes).map(([category, value]) => ({
        category,
        value
    }))
};
```

## Python绘图服务API

### 健康检查
```
GET /health
```
检查服务状态

### 生成图表
```
POST /generate_chart
```
生成图表，需要提供配置和数据

### 使用Python脚本生成图表
```
POST /generate_chart_with_script
```
使用Python脚本直接生成图表

### 获取支持的图表类型
```
GET /supported_chart_types
```
获取支持的图表类型列表

### 获取数据格式规范
```
GET /data_formats
```
获取各图表类型的数据格式要求

### 列出可用脚本
```
GET /list_scripts
```
列出可用的Python数据提取脚本

## 故障排除

### 常见问题

1. **Python服务连接失败**
   - 检查Python服务是否启动
   - 确认端口5002是否被占用
   - 检查防火墙设置

2. **图表生成失败**
   - 验证数据提取脚本语法
   - 检查数据格式是否符合要求
   - 查看浏览器控制台错误信息

3. **Python依赖问题**
   - 运行 `pip3 install -r python/requirements.txt`
   - 检查Python版本（需要Python 3.6+）

4. **中文字体显示问题**
   - 确保系统安装了中文字体
   - 在Python脚本中设置合适的字体

### 调试技巧

1. **检查数据提取结果**
   - 在数据提取脚本中添加console.log调试
   - 验证返回的数据格式

2. **测试Python脚本**
   - 直接在Python环境中测试脚本
   - 使用示例数据验证功能

3. **查看服务日志**
   - Python服务会输出详细的错误信息
   - 检查浏览器网络请求状态

## 最佳实践

### 数据提取
- 使用正则表达式精确匹配数据
- 添加数据验证和错误处理
- 考虑数据量大小，避免性能问题

### 图表配置
- 选择合适的图表类型
- 设置清晰的标题和标签
- 使用对比明显的颜色
- 考虑图表的可读性

### 性能优化
- 对大文件使用分批处理
- 缓存常用的图表配置
- 合理设置图表刷新频率

## 扩展开发

### 添加新的图表类型
1. 在 `charting.js` 中添加新的图表类型支持
2. 在 `python/chart_server.py` 中实现对应的图表生成逻辑
3. 更新前端配置界面

### 自定义数据提取函数
可以在 `charting.js` 的 `executeChartScript` 方法中添加新的工具函数，供数据提取脚本使用。

### 集成其他Python库
可以通过修改 `python/requirements.txt` 和 `chart_server.py` 来集成其他数据分析库，如：
- Scikit-learn: 机器学习分析
- Statsmodels: 统计分析
- Plotly: 交互式图表

这个图表可视化功能大大增强了xlogAssist的数据分析能力，让用户能够更直观地理解日志数据中的模式和趋势。