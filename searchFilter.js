// 搜索过滤模块 - 负责搜索和过滤功能
class SearchFilter {
    constructor(core) {
        this.core = core;
    }

    // 过滤日志 - 支持正则表达式和普通字符串
    filterLogs() {
        const filterTerm = this.core.filterInput.value.trim();
        
        if (!filterTerm) {
            this.core.setStatus('请输入过滤关键词', 'error');
            return;
        }

        this.core.filterTerm = filterTerm;
        
        try {
            // 智能检测是否为正则表达式
            let useRegex = false;
            let regexPattern = filterTerm;
            
            // 如果以 / 开头和结尾，认为是显式正则表达式
            if (filterTerm.startsWith('/') && filterTerm.endsWith('/') && filterTerm.length > 2) {
                useRegex = true;
                regexPattern = filterTerm.slice(1, -1);
            }
            // 如果包含正则表达式特殊字符，也尝试作为正则表达式
            else if (/[.*+?^${}()|[\]\\]/.test(filterTerm)) {
                useRegex = true;
                regexPattern = filterTerm; // 直接使用原始字符串，让用户自己控制转义
            }
            
            if (useRegex) {
                const regex = new RegExp(regexPattern, 'i'); // 忽略大小写
                this.core.filteredLogs = this.core.logs.filter(log =>
                    regex.test(log.content)
                );
                this.core.setStatus(`使用正则表达式过滤到 ${this.core.filteredLogs.length} 条日志`);
            } else {
                // 普通字符串匹配
                const filterTermLower = filterTerm.toLowerCase();
                this.core.filteredLogs = this.core.logs.filter(log =>
                    log.content.toLowerCase().includes(filterTermLower)
                );
                this.core.setStatus(`过滤到 ${this.core.filteredLogs.length} 条日志`);
            }
        } catch (error) {
            this.core.setStatus(`正则表达式错误: ${error.message}`, 'error');
            return;
        }
        
        this.core.clearFilter.style.display = 'block';
        
        // 过滤后如果有搜索词，重新执行搜索
        if (this.core.searchTerm) {
            // 先渲染过滤后的日志
            if (this.core.renderLogs) {
                this.core.renderLogs();
            }
            // 然后重新执行搜索
            setTimeout(() => {
                this.realSearchLogs();
            }, 100);
        } else {
            if (this.core.renderLogs) {
                this.core.renderLogs();
            }
        }
    }

    // 清除过滤结果
    clearFilterResults() {
        this.core.filterInput.value = '';
        this.core.clearFilter.style.display = 'none';
        this.core.filteredLogs = null;
        this.core.filterTerm = '';
        
        // 如果之前有搜索词，重新执行搜索
        if (this.core.searchTerm) {
            this.realSearchLogs();
        } else {
            // 重新渲染日志（会自动显示loading）
            if (this.core.renderLogs) {
                this.core.renderLogs();
            }
        }
        this.core.setStatus('已清除过滤');
    }

    // 执行真正的搜索 - 支持正则表达式和普通字符串
    realSearchLogs() {
        const searchTerm = this.core.searchInput.value.trim();
        
        if (!searchTerm) {
            this.core.setStatus('请输入搜索关键词', 'error');
            return;
        }

        // 显示搜索中状态
        this.core.setStatus('搜索中...', 'info');
        
        // 使用 setTimeout 让UI有机会更新
        setTimeout(() => {
            try {
                // 执行真正的搜索，找到所有匹配项
                this.core.searchResults = [];
                this.core.searchTerm = searchTerm;
                
                // 在过滤后的日志或所有日志中搜索
                const logsToSearch = this.core.filteredLogs || this.core.logs;
                
                // 智能检测是否为正则表达式
                let useRegex = false;
                let regexPattern = searchTerm;
                
                // 如果以 / 开头和结尾，认为是显式正则表达式
                if (searchTerm.startsWith('/') && searchTerm.endsWith('/') && searchTerm.length > 2) {
                    useRegex = true;
                    regexPattern = searchTerm.slice(1, -1);
                }
                // 如果包含正则表达式特殊字符，也尝试作为正则表达式（不自动转义）
                else if (/[.*+?^${}()|[\]\\]/.test(searchTerm)) {
                    useRegex = true;
                    regexPattern = searchTerm; // 直接使用原始字符串，让用户自己控制转义
                }
                
                if (useRegex) {
                    const regex = new RegExp(regexPattern, 'gi'); // 全局匹配，忽略大小写
                    
                    // 正则表达式搜索
                    logsToSearch.forEach((log, i) => {
                        const matches = log.content.matchAll(regex);
                        for (const match of matches) {
                            this.core.searchResults.push({
                                log,
                                index: i,
                                matchIndex: match.index,
                                endIndex: match.index + match[0].length
                            });
                        }
                    });
                    this.core.setStatus(`使用正则表达式找到 ${this.core.searchResults.length} 个匹配项`);
                } else {
                    // 普通字符串搜索
                    const searchTermLower = searchTerm.toLowerCase();
                    const searchTermLength = searchTermLower.length;
                    
                    logsToSearch.forEach((log, i) => {
                        const content = log.content.toLowerCase();
                        let startIndex = 0;
                        let matchIndex;
                        
                        while ((matchIndex = content.indexOf(searchTermLower, startIndex)) !== -1) {
                            this.core.searchResults.push({
                                log,
                                index: i,
                                matchIndex,
                                endIndex: matchIndex + searchTermLength
                            });
                            startIndex = matchIndex + searchTermLength;
                            
                            // 如果搜索词很短，限制每行的匹配数量避免性能问题
                            if (searchTermLength <= 2 && this.core.searchResults.length > 1000) {
                                break;
                            }
                        }
                    });
                    this.core.setStatus(`找到 ${this.core.searchResults.length} 个匹配项`);
                }
                
                this.core.currentSearchIndex = -1;
                this.core.isRealSearchMode = true;
                
                // 显示导航控件
                this.core.prevMatch.style.display = 'block';
                this.core.nextMatch.style.display = 'block';
                this.core.clearSearch.style.display = 'block';
                
                if (this.core.searchResults.length === 0) {
                    this.core.setStatus('没有找到匹配的日志');
                    if (this.core.highlightCurrentSearchResult) {
                        this.core.highlightCurrentSearchResult(-1);
                    }
                } else {
                    // 重新渲染日志以应用搜索高亮
                    if (this.core.renderLogs) {
                        this.core.renderLogs();
                    }
                    this.navigateToNextMatch(); // 自动导航到第一个匹配项
                }
                
                // 重新渲染排查区以应用搜索高亮
                if (this.core.renderInvestigationLogs) {
                    this.core.renderInvestigationLogs();
                }
            } catch (error) {
                this.core.setStatus(`正则表达式错误: ${error.message}`, 'error');
            }
        }, 10);
    }

    // 导航到下一个匹配项
    navigateToNextMatch() {
        if (this.core.searchResults.length === 0) return;
        
        // 正常导航到下一个
        this.core.currentSearchIndex = this.core.currentSearchIndex + 1;
        
        // 如果超出范围，回到第一个
        if (this.core.currentSearchIndex >= this.core.searchResults.length) {
            this.core.currentSearchIndex = 0;
        }
        
        // 检查是否还在同一行，如果是则继续跳到下一行
        const currentResult = this.core.searchResults[this.core.currentSearchIndex];
        if (currentResult && this.core.currentSearchIndex > 0) {
            const prevResult = this.core.searchResults[this.core.currentSearchIndex - 1];
            if (prevResult && currentResult.log.originalIndex === prevResult.log.originalIndex) {
                // 还在同一行，继续跳到下一个不同行的匹配项
                let nextIndex = this.core.currentSearchIndex + 1;
                while (nextIndex < this.core.searchResults.length &&
                       this.core.searchResults[nextIndex].log.originalIndex === currentResult.log.originalIndex) {
                    nextIndex++;
                }
                
                if (nextIndex < this.core.searchResults.length) {
                    this.core.currentSearchIndex = nextIndex;
                } else {
                    // 如果没有更多不同行的匹配项，回到第一个
                    this.core.currentSearchIndex = 0;
                }
            }
        }
        
        if (this.core.highlightCurrentSearchResult) {
            this.core.highlightCurrentSearchResult(this.core.currentSearchIndex);
        }
        this.core.setStatus(`第 ${this.core.currentSearchIndex + 1}/${this.core.searchResults.length} 个匹配项`);
    }

    // 导航到上一个匹配项
    navigateToPrevMatch() {
        if (this.core.searchResults.length === 0) return;
        
        // 正常导航到上一个
        this.core.currentSearchIndex = this.core.currentSearchIndex - 1;
        
        // 如果超出范围，回到最后一个
        if (this.core.currentSearchIndex < 0) {
            this.core.currentSearchIndex = this.core.searchResults.length - 1;
        }
        
        // 检查是否还在同一行，如果是则继续跳到上一行
        const currentResult = this.core.searchResults[this.core.currentSearchIndex];
        if (currentResult && this.core.currentSearchIndex < this.core.searchResults.length - 1) {
            const nextResult = this.core.searchResults[this.core.currentSearchIndex + 1];
            if (nextResult && currentResult.log.originalIndex === nextResult.log.originalIndex) {
                // 还在同一行，继续跳到上一个不同行的匹配项
                let prevIndex = this.core.currentSearchIndex - 1;
                while (prevIndex >= 0 &&
                       this.core.searchResults[prevIndex].log.originalIndex === currentResult.log.originalIndex) {
                    prevIndex--;
                }
                
                if (prevIndex >= 0) {
                    this.core.currentSearchIndex = prevIndex;
                } else {
                    // 如果没有更多不同行的匹配项，回到最后一个
                    this.core.currentSearchIndex = this.core.searchResults.length - 1;
                }
            }
        }
        
        if (this.core.highlightCurrentSearchResult) {
            this.core.highlightCurrentSearchResult(this.core.currentSearchIndex);
        }
        this.core.setStatus(`第 ${this.core.currentSearchIndex + 1}/${this.core.searchResults.length} 个匹配项`);
    }

    // 清除搜索结果 - 优化性能版本
    clearSearchResults() {
        this.core.searchInput.value = '';
        this.core.clearSearch.style.display = 'none';
        this.core.prevMatch.style.display = 'none';
        this.core.nextMatch.style.display = 'none';
        
        // 先清除搜索状态
        this.core.isRealSearchMode = false;
        this.core.searchResults = [];
        this.core.currentSearchIndex = -1;
        this.core.searchTerm = '';
        
        // 重新渲染整个日志区域（会自动显示loading）
        if (this.core.renderLogs) {
            this.core.renderLogs();
        }
        
        this.core.setStatus('已清除搜索');
        
        // 重新渲染排查区以清除搜索高亮
        if (this.core.renderInvestigationLogs) {
            this.core.renderInvestigationLogs();
        }
    }
}

export default SearchFilter;