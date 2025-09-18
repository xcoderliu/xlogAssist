// 搜索过滤模块 - 负责搜索和过滤功能
class SearchFilter {
    constructor(core) {
        this.core = core;
    }

    // 过滤日志
    filterLogs() {
        const filterTerm = this.core.filterInput.value.trim();
        
        if (!filterTerm) {
            this.core.setStatus('请输入过滤关键词', 'error');
            return;
        }

        this.core.filterTerm = filterTerm.toLowerCase();
        this.core.filteredLogs = this.core.logs.filter(log =>
            log.content.toLowerCase().includes(this.core.filterTerm)
        );
        
        this.core.clearFilter.style.display = 'block';
        if (this.core.renderLogs) {
            this.core.renderLogs();
        }
        this.core.setStatus(`过滤到 ${this.core.filteredLogs.length} 条日志`);
        
        // 如果有搜索关键词，重新执行搜索
        if (this.core.searchTerm) {
            this.realSearchLogs();
        }
    }

    // 清除过滤结果
    clearFilterResults() {
        this.core.filterInput.value = '';
        this.core.clearFilter.style.display = 'none';
        this.core.filteredLogs = null;
        this.core.filterTerm = '';
        
        // 重新渲染日志
        if (this.core.renderLogs) {
            this.core.renderLogs();
        }
        this.core.setStatus('已清除过滤');
        
        // 如果有搜索关键词，重新执行搜索
        if (this.core.searchTerm) {
            this.realSearchLogs();
        }
    }

    // 执行真正的搜索
    realSearchLogs() {
        const searchTerm = this.core.searchInput.value.trim();
        
        if (!searchTerm) {
            this.core.setStatus('请输入搜索关键词', 'error');
            return;
        }

        // 执行真正的搜索，找到所有匹配项
        this.core.searchResults = [];
        this.core.searchTerm = searchTerm.toLowerCase();
        
        // 在过滤后的日志或所有日志中搜索
        const logsToSearch = this.core.filteredLogs || this.core.logs;
        
        logsToSearch.forEach((log, index) => {
            const content = log.content.toLowerCase();
            let startIndex = 0;
            let matchIndex;
            
            while ((matchIndex = content.indexOf(this.core.searchTerm, startIndex)) !== -1) {
                this.core.searchResults.push({
                    log,
                    index,
                    matchIndex,
                    endIndex: matchIndex + this.core.searchTerm.length
                });
                startIndex = matchIndex + this.core.searchTerm.length;
            }
        });
        
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
            this.core.setStatus(`找到 ${this.core.searchResults.length} 个匹配项`);
            this.navigateToNextMatch(); // 自动导航到第一个匹配项
        }
    }

    // 导航到下一个匹配项
    navigateToNextMatch() {
        if (this.core.searchResults.length === 0) return;
        
        // 总是基于当前选中行来导航
        if (this.core.selectedLineIndex >= 0) {
            const currentLogIndex = this.core.logs.findIndex(log => log.originalIndex === this.core.selectedLineIndex);
            if (currentLogIndex !== -1) {
                // 找到当前选中行在搜索结果中的位置
                let startIndex = this.core.searchResults.findIndex(result =>
                    result.log.originalIndex > this.core.selectedLineIndex
                );
                
                if (startIndex === -1) {
                    // 如果当前行之后没有匹配项，从头开始
                    startIndex = 0;
                }
                
                this.core.currentSearchIndex = startIndex;
            } else {
                this.core.currentSearchIndex = 0;
            }
        } else {
            // 正常导航到下一个
            this.core.currentSearchIndex = this.core.currentSearchIndex + 1;
            
            // 如果超出范围，回到第一个
            if (this.core.currentSearchIndex >= this.core.searchResults.length) {
                this.core.currentSearchIndex = 0;
            }
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
        
        // 总是基于当前选中行来导航
        if (this.core.selectedLineIndex >= 0) {
            const currentLogIndex = this.core.logs.findIndex(log => log.originalIndex === this.core.selectedLineIndex);
            if (currentLogIndex !== -1) {
                // 找到当前选中行在搜索结果中的位置（从后往前找）
                let startIndex = -1;
                for (let i = this.core.searchResults.length - 1; i >= 0; i--) {
                    if (this.core.searchResults[i].log.originalIndex < this.core.selectedLineIndex) {
                        startIndex = i;
                        break;
                    }
                }
                
                if (startIndex === -1) {
                    // 如果当前行之前没有匹配项，从最后一个开始
                    startIndex = this.core.searchResults.length - 1;
                }
                
                this.core.currentSearchIndex = startIndex;
            } else {
                this.core.currentSearchIndex = this.core.searchResults.length - 1;
            }
        } else {
            // 正常导航到上一个
            this.core.currentSearchIndex = this.core.currentSearchIndex - 1;
            
            // 如果超出范围，回到最后一个
            if (this.core.currentSearchIndex < 0) {
                this.core.currentSearchIndex = this.core.searchResults.length - 1;
            }
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

    // 清除搜索结果
    clearSearchResults() {
        this.core.searchInput.value = '';
        this.core.clearSearch.style.display = 'none';
        this.core.prevMatch.style.display = 'none';
        this.core.nextMatch.style.display = 'none';
        
        // 重新渲染日志以恢复原始内容
        if (this.core.renderLogs) {
            this.core.renderLogs();
        }
        this.core.isRealSearchMode = false;
        this.core.searchResults = [];
        this.core.currentSearchIndex = -1;
        this.core.searchTerm = '';
        this.core.setStatus('已清除搜索');
    }
}

export default SearchFilter;