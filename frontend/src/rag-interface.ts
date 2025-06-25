// RAG Query Interface with Enhanced UX
export interface RAGResult {
    snippet: string;
    score: number;
    type: 'function' | 'class' | 'global';
    name: string;
    line_start?: number;
    line_end?: number;
}

export class RAGQueryInterface {
    private queryHistory: string[] = [];
    private currentHistoryIndex = -1;
    private isQuerying = false;

    constructor() {
        this.setupQueryInput();
        this.loadQueryHistory();
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Execute RAG query button
        const executeBtn = document.getElementById('execute-rag-query');
        if (executeBtn) {
            executeBtn.addEventListener('click', () => this.executeQuery());
        }

        // Query history button
        const historyBtn = document.getElementById('query-history');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => this.showQueryHistory());
        }
    }

    private setupQueryInput(): void {
        const queryInput = document.getElementById('rag-query-input') as HTMLTextAreaElement;
        if (!queryInput) return;

        queryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.executeQuery();
            } else if (e.key === 'ArrowUp' && e.ctrlKey) {
                e.preventDefault();
                this.navigateHistory(-1);
            } else if (e.key === 'ArrowDown' && e.ctrlKey) {
                e.preventDefault();
                this.navigateHistory(1);
            }
        });

        // Auto-resize textarea
        queryInput.addEventListener('input', () => {
            queryInput.style.height = 'auto';
            queryInput.style.height = Math.min(queryInput.scrollHeight, 200) + 'px';
        });

        // Placeholder animation on focus
        queryInput.addEventListener('focus', () => {
            queryInput.placeholder = 'Ask about your code...';
        });

        queryInput.addEventListener('blur', () => {
            if (!queryInput.value) {
                queryInput.placeholder = "Ask about the code: 'find classes', 'how to create objects', 'error handling'...";
            }
        });
    }

    private navigateHistory(direction: number): void {
        if (this.queryHistory.length === 0) return;

        this.currentHistoryIndex = Math.max(0, 
            Math.min(this.queryHistory.length - 1, 
                this.currentHistoryIndex + direction));

        const queryInput = document.getElementById('rag-query-input') as HTMLTextAreaElement;
        if (queryInput) {
            queryInput.value = this.queryHistory[this.currentHistoryIndex];
            queryInput.dispatchEvent(new Event('input')); // Trigger resize
        }
    }

    private async executeQuery(): Promise<void> {
        const queryInput = document.getElementById('rag-query-input') as HTMLTextAreaElement;
        if (!queryInput) return;

        const query = queryInput.value.trim();
        
        if (!query) {
            this.showError('Please enter a query');
            return;
        }

        if (this.isQuerying) {
            return; // Prevent multiple simultaneous queries
        }

        // Check if we have code to query
        const dashboard = (window as any).prismDashboard;
        if (!dashboard || !dashboard.getAnalysisData()) {
            this.showError('Please analyze some code first before making RAG queries');
            return;
        }

        this.isQuerying = true;
        this.addToHistory(query);
        this.showLoading();

        try {
            const results = await this.callRAGAPI(query);
            this.displayResults(results, query);
            this.updateStatus(`Found ${results.length} results for "${query}"`);
        } catch (error) {
            console.error('RAG query error:', error);
            this.showError('Failed to execute RAG query. Please check the backend connection.');
        } finally {
            this.isQuerying = false;
        }
    }

    private async callRAGAPI(query: string): Promise<RAGResult[]> {
        const dashboard = (window as any).prismDashboard;
        const code = dashboard.getCodeEditor().getValue();
        
        const backendUrl = this.getBackendUrl();
        const response = await fetch(`${backendUrl}/api/rag-query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ 
                query: query,
                code: code
            }),
            mode: 'cors'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`RAG API call failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return data.results || [];
    }

    private getBackendUrl(): string {
        return window.location.hostname === 'localhost' 
            ? 'http://localhost:5000' 
            : `${window.location.protocol}//${window.location.hostname}:5000`;
    }

    private displayResults(results: RAGResult[], query: string): void {
        const container = document.getElementById('rag-results');
        if (!container) return;

        container.innerHTML = '';

        if (results.length === 0) {
            this.showNoResults(query);
            return;
        }

        // Create results header
        const header = this.createResultsHeader(results.length, query);
        container.appendChild(header);

        // Create results list
        const resultsList = document.createElement('div');
        resultsList.className = 'results-list';

        results.forEach((result, index) => {
            const resultElement = this.createResultElement(result, index);
            resultsList.appendChild(resultElement);
        });

        container.appendChild(resultsList);

        // Results are now only displayed in the RAG panel on the right
        // The main display area no longer has a RAG tab
    }

    private createResultsHeader(count: number, query: string): HTMLElement {
        const header = document.createElement('div');
        header.className = 'results-header';
        header.innerHTML = `
            <h4>${count} result${count !== 1 ? 's' : ''} for "${this.escapeHtml(query)}"</h4>
            <p class="results-description">Relevant code snippets found using semantic search</p>
        `;
        return header;
    }

    private createResultElement(result: RAGResult, index: number): HTMLElement {
        const element = document.createElement('div');
        element.className = 'result-item';
        element.innerHTML = `
            <div class="result-header">
                <div class="result-title">
                    <span class="type-badge type-${result.type}">${result.type}</span>
                    <span class="result-name">${this.escapeHtml(result.name)}</span>
                </div>
                <div class="confidence-score" data-score="${result.score}">
                    ${(result.score * 100).toFixed(1)}%
                </div>
            </div>
            <div class="result-content">
                <pre class="code-snippet"><code class="language-python">${this.highlightCode(result.snippet)}</code></pre>
            </div>
            ${result.line_start ? `<div class="result-meta">Lines ${result.line_start}-${result.line_end || result.line_start}</div>` : ''}
        `;

        // Add click handler to jump to code location
        if (result.line_start) {
            element.style.cursor = 'pointer';
            element.addEventListener('click', () => {
                this.jumpToCodeLine(result.line_start!);
            });
        }

        return element;
    }

    private highlightCode(code: string): string {
        // Simply escape HTML for safe display
        // Syntax highlighting removed to prevent HTML tags appearing as text
        return this.escapeHtml(code);
    }

    private jumpToCodeLine(lineNumber: number): void {
        const dashboard = (window as any).prismDashboard;
        if (dashboard) {
            const editor = dashboard.getCodeEditor();
            if (editor) {
                // Focus the code editor and jump to line
                editor.focus();
                editor.setSelection({
                    startLineNumber: lineNumber,
                    startColumn: 1,
                    endLineNumber: lineNumber,
                    endColumn: 1
                });
                
                // Show success message
                this.updateStatus(`Jumped to line ${lineNumber} in code editor`);
            }
        }
    }

    private showLoading(): void {
        const container = document.getElementById('rag-results');
        if (container) {
            container.innerHTML = `
                <div class="loading-message">
                    <div class="loading-spinner"></div>
                    <p>Searching through your code...</p>
                </div>
            `;
        }
    }

    private showNoResults(query: string): void {
        const container = document.getElementById('rag-results');
        if (container) {
            container.innerHTML = `
                <div class="no-results">
                    <h4>No results found for "${this.escapeHtml(query)}"</h4>
                    <p>Try rephrasing your query or check if the code contains relevant content.</p>
                    <div class="search-tips">
                        <h5>Search tips:</h5>
                        <ul>
                            <li>Use descriptive terms like "error handling" or "data processing"</li>
                            <li>Ask about specific patterns like "classes that inherit"</li>
                            <li>Query for functionality like "functions that return"</li>
                        </ul>
                    </div>
                </div>
            `;
        }
    }

    private showError(message: string): void {
        const container = document.getElementById('rag-results');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <h4>Error</h4>
                    <p>${this.escapeHtml(message)}</p>
                </div>
            `;
        }
    }

    private showQueryHistory(): void {
        if (this.queryHistory.length === 0) {
            this.updateStatus('No query history available');
            return;
        }

        const historyHtml = this.queryHistory.slice(0, 10).map((query, index) => 
            `<div class="history-item" data-query="${this.escapeHtml(query)}">${this.escapeHtml(query)}</div>`
        ).join('');

        const container = document.getElementById('rag-results');
        if (container) {
            container.innerHTML = `
                <div class="query-history">
                    <h4>Recent Queries</h4>
                    <div class="history-list">
                        ${historyHtml}
                    </div>
                    <div class="history-actions">
                        <button class="btn btn-primary" id="close-history-btn">Close</button>
                    </div>
                </div>
            `;

            // Add click handlers for history items
            container.querySelectorAll('.history-item').forEach(item => {
                item.addEventListener('click', () => {
                    const query = item.getAttribute('data-query');
                    if (query) {
                        const queryInput = document.getElementById('rag-query-input') as HTMLTextAreaElement;
                        if (queryInput) {
                            queryInput.value = query;
                            queryInput.dispatchEvent(new Event('input'));
                        }
                        this.clearResults(); // Close history and show default state
                    }
                });
            });

            // Add close button handler
            const closeBtn = container.querySelector('#close-history-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.clearResults(); // Show default state
                });
            }
        }
    }

    private addToHistory(query: string): void {
        if (!this.queryHistory.includes(query)) {
            this.queryHistory.unshift(query);
            this.queryHistory = this.queryHistory.slice(0, 20); // Keep last 20 queries
            this.saveQueryHistory();
        }
        this.currentHistoryIndex = -1; // Reset history navigation
    }

    private loadQueryHistory(): void {
        const saved = localStorage.getItem('prism-query-history');
        if (saved) {
            try {
                this.queryHistory = JSON.parse(saved);
            } catch (error) {
                console.warn('Failed to load query history:', error);
                this.queryHistory = [];
            }
        }
    }

    private saveQueryHistory(): void {
        localStorage.setItem('prism-query-history', JSON.stringify(this.queryHistory));
    }

    private updateStatus(message: string): void {
        const dashboard = (window as any).prismDashboard;
        if (dashboard) {
            dashboard.updateStatus(message);
        }
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public methods
    public clearResults(): void {
        const container = document.getElementById('rag-results');
        if (container) {
            container.innerHTML = `
                <div class="rag-placeholder">
                    <h4>Ready for your questions</h4>
                    <p>Try asking:</p>
                    <ul>
                        <li>"Find all classes"</li>
                        <li>"Show functions that call helper_function"</li>
                        <li>"How do I create objects?"</li>
                        <li>"What error handling is implemented?"</li>
                    </ul>
                </div>
            `;
        }
    }

    public getHistory(): string[] {
        return [...this.queryHistory];
    }
} 