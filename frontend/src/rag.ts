// Type definitions for RAG functionality
interface RAGResult {
    snippet: string;
    score: number;
    type: 'function' | 'class' | 'global';
    name: string;
    line_start?: number;
    line_end?: number;
}

interface RAGQueryResponse {
    success: boolean;
    results?: RAGResult[];
    error?: string;
}

// Global variables
let currentRAGResults: RAGResult[] = [];

function executeRAGQuery(): void {
    const codeInput = document.getElementById('codeInput') as HTMLTextAreaElement;
    const queryInput = document.getElementById('ragQueryInput') as HTMLInputElement;
    const status = document.getElementById('status') as HTMLDivElement;
    
    const code = codeInput.value.trim();
    const query = queryInput.value.trim();
    
    if (!code) {
        status.innerHTML = '<div class="error">Please enter some Python code first</div>';
        return;
    }
    
    if (!query) {
        status.innerHTML = '<div class="error">Please enter a search query</div>';
        return;
    }
    
    status.innerHTML = '<div class="success">Processing RAG query...</div>';
    
    fetch('http://localhost:5000/api/rag-query', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code, query: query })
    })
    .then((response: Response) => response.json())
    .then((data: RAGQueryResponse) => {
        if (data.success && data.results) {
            currentRAGResults = data.results;
            renderRAGResults(data.results);
            status.innerHTML = '<div class="success">RAG query completed successfully!</div>';
        } else {
            status.innerHTML = '<div class="error">Error: ' + (data.error || 'Unknown error') + '</div>';
        }
    })
    .catch((error: Error) => {
        status.innerHTML = '<div class="error">Connection error: ' + error.message + '</div>';
    });
}

function renderRAGResults(results: RAGResult[]): void {
    const container = document.getElementById('ragResultsContainer') as HTMLDivElement;
    
    if (!results || results.length === 0) {
        container.innerHTML = '<div class="no-results">No relevant code snippets found. Try rephrasing your query.</div>';
        return;
    }
    
    container.innerHTML = '';
    
    // Create results header
    const header = document.createElement('div');
    header.className = 'results-header';
    header.innerHTML = `
        <h4>Found ${results.length} relevant code snippet${results.length > 1 ? 's' : ''}</h4>
        <p class="results-description">Ranked by semantic similarity to your query</p>
    `;
    container.appendChild(header);
    
    // Create results list
    const resultsList = document.createElement('div');
    resultsList.className = 'results-list';
    
    results.forEach((result, index) => {
        const resultItem = createResultItem(result, index);
        resultsList.appendChild(resultItem);
    });
    
    container.appendChild(resultsList);
}

function createResultItem(result: RAGResult, index: number): HTMLElement {
    const item = document.createElement('div');
    item.className = 'result-item';
    
    // Determine type icon and color
    let typeIcon = '📄';
    let typeClass = 'type-global';
    
    if (result.type === 'function') {
        typeIcon = '🔧';
        typeClass = 'type-function';
    } else if (result.type === 'class') {
        typeIcon = '🏗️';
        typeClass = 'type-class';
    }
    
    // Format confidence score
    const confidencePercent = Math.round(result.score * 100);
    
    item.innerHTML = `
        <div class="result-header">
            <div class="result-title">
                <span class="type-badge ${typeClass}">${typeIcon} ${result.type}</span>
                <span class="result-name">${result.name}</span>
                <span class="confidence-score">${confidencePercent}% match</span>
            </div>
            <div class="result-meta">
                ${result.line_start ? `Lines ${result.line_start}-${result.line_end}` : ''}
            </div>
        </div>
        <div class="result-content">
            <pre class="code-snippet"><code>${escapeHtml(result.snippet)}</code></pre>
        </div>
    `;
    
    return item;
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Expose functions to global scope for HTML onclick handlers
(window as any).executeRAGQuery = executeRAGQuery; 