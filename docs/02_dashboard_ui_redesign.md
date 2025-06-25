# Dashboard UI Redesign - Fullscreen Layout

## 📋 **Feature Overview**
Transform the current tabbed interface into a modern fullscreen dashboard-style layout with dedicated panels for code input, main visualization display, and RAG query input.

## 🎯 **Goals**
- **Modern dashboard layout**: Replace current sidebar-style layout with fullscreen panel-based design
- **Dedicated input panel**: Persistent Python code input area with syntax highlighting
- **Central display panel**: Main visualization area that switches between AST, inheritance, call graph, and RAG results
- **RAG query panel**: Dedicated area for natural language queries with enhanced UX
- **Responsive design**: Adapt gracefully to different screen sizes and orientations
- **Enhanced usability**: Improve workflow efficiency with better space utilization

## 🔧 **Technical Requirements**

### **Phase 1 - Core Dashboard Layout**
- [ ] **Three-panel layout**: Code input (left), main display (center), RAG query (right/bottom)
- [ ] **Fullscreen utilization**: Use entire viewport with minimal margins
- [ ] **Resizable panels**: Allow users to adjust panel sizes via drag handles
- [ ] **Panel state persistence**: Remember panel sizes and active view between sessions
- [ ] **Enhanced code editor**: Upgrade to Monaco Editor or CodeMirror for better experience

### **Phase 2 - Advanced Features**
- 🔮 **Panel docking**: Allow panels to be collapsed/expanded
- 🔮 **Custom layouts**: Save/load different panel arrangements
- 🔮 **Split view**: Multiple visualizations side-by-side
- 🔮 **Floating panels**: Detachable panels for multi-monitor setups

## 🏗️ **Implementation Plan**

### **1. Layout Architecture**

#### **A. HTML Structure Redesign**
```html
<body class="dashboard-layout">
    <div class="dashboard-container">
        <!-- Header Bar -->
        <header class="dashboard-header">
            <div class="header-left">
                <h1>🔮 Prism - Code Analysis Dashboard</h1>
            </div>
            <div class="header-right">
                <button class="layout-toggle" aria-label="Toggle layout mode">
                    📱 Responsive
                </button>
            </div>
        </header>

        <!-- Main Dashboard Grid -->
        <main class="dashboard-grid">
            <!-- Code Input Panel -->
            <section class="panel panel-input" id="code-panel">
                <div class="panel-header">
                    <h2>📝 Python Code</h2>
                    <div class="panel-controls">
                        <button class="btn-icon" aria-label="Format code">🎨</button>
                        <button class="btn-icon" aria-label="Clear code">🗑️</button>
                    </div>
                </div>
                <div class="panel-content">
                    <div id="code-editor" class="code-editor"></div>
                    <div class="code-actions">
                        <button class="btn btn-primary" onclick="processCode()">
                            ⚡ Analyze Code
                        </button>
                    </div>
                </div>
            </section>

            <!-- Main Display Panel -->
            <section class="panel panel-main" id="main-panel">
                <div class="panel-header">
                    <h2 id="main-title">📊 Visualization</h2>
                    <div class="view-switcher">
                        <button class="view-btn active" data-view="ast">AST</button>
                        <button class="view-btn" data-view="inheritance">Inheritance</button>
                        <button class="view-btn" data-view="callgraph">Call Graph</button>
                        <button class="view-btn" data-view="rag">RAG Results</button>
                    </div>
                </div>
                <div class="panel-content">
                    <div class="visualization-container" id="viz-container">
                        <!-- Dynamic content based on selected view -->
                    </div>
                </div>
            </section>

            <!-- RAG Query Panel -->
            <section class="panel panel-rag" id="rag-panel">
                <div class="panel-header">
                    <h2>🤖 RAG Query</h2>
                    <div class="panel-controls">
                        <button class="btn-icon" aria-label="Query history">📝</button>
                    </div>
                </div>
                <div class="panel-content">
                    <div class="query-input-section">
                        <textarea 
                            id="rag-query-input" 
                            placeholder="Ask about the code: 'find classes', 'how to create objects', 'error handling'..."
                            rows="3"></textarea>
                        <button class="btn btn-primary" onclick="executeRAGQuery()">
                            🔍 Search
                        </button>
                    </div>
                    <div class="query-results" id="rag-results">
                        <!-- RAG results display -->
                    </div>
                </div>
            </section>
        </main>

        <!-- Resize Handles -->
        <div class="resize-handle resize-vertical" data-panels="code-panel,main-panel"></div>
        <div class="resize-handle resize-horizontal" data-panels="main-panel,rag-panel"></div>
    </div>

    <!-- Status Bar -->
    <footer class="status-bar">
        <div class="status-left">
            <span id="status-message">Ready</span>
        </div>
        <div class="status-right">
            <span id="line-count">0 lines</span>
            <span id="analysis-status">No analysis</span>
        </div>
    </footer>
</body>
```

#### **B. CSS Grid Layout System**
```css
/* Dashboard Layout */
.dashboard-layout {
    margin: 0;
    padding: 0;
    height: 100vh;
    overflow: hidden;
    background: #1e1e1e;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.dashboard-container {
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100vh;
}

.dashboard-header {
    background: #2d2d30;
    border-bottom: 1px solid #3e3e42;
    padding: 12px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #cccccc;
}

.dashboard-grid {
    display: grid;
    grid-template-columns: 1fr 2fr 1fr;
    grid-template-rows: 1fr;
    height: 100%;
    position: relative;
}

/* Panel Styles */
.panel {
    background: #252526;
    border-right: 1px solid #3e3e42;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.panel:last-child {
    border-right: none;
}

.panel-header {
    background: #2d2d30;
    border-bottom: 1px solid #3e3e42;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
}

.panel-header h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #cccccc;
}

.panel-content {
    flex: 1;
    padding: 16px;
    overflow: auto;
    background: #1e1e1e;
}

/* Code Editor Panel */
.code-editor {
    height: calc(100% - 60px);
    border: 1px solid #3e3e42;
    border-radius: 4px;
    background: #1e1e1e;
    font-family: 'JetBrains Mono', 'Courier New', monospace;
}

.code-actions {
    margin-top: 12px;
    display: flex;
    gap: 8px;
}

/* View Switcher */
.view-switcher {
    display: flex;
    gap: 4px;
    background: #1e1e1e;
    padding: 4px;
    border-radius: 6px;
}

.view-btn {
    padding: 6px 12px;
    border: none;
    background: transparent;
    color: #cccccc;
    font-size: 12px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.view-btn:hover {
    background: #3e3e42;
}

.view-btn.active {
    background: #0e639c;
    color: white;
}

/* Resize Handles */
.resize-handle {
    position: absolute;
    background: transparent;
    z-index: 100;
    cursor: col-resize;
}

.resize-handle:hover {
    background: #0e639c;
}

.resize-vertical {
    width: 4px;
    height: 100%;
    top: 0;
    left: 33.33%;
    margin-left: -2px;
}

.resize-horizontal {
    height: 4px;
    width: 66.67%;
    top: 50%;
    right: 0;
    margin-top: -2px;
    cursor: row-resize;
}

/* Responsive Breakpoints */
@media (max-width: 1024px) {
    .dashboard-grid {
        grid-template-columns: 1fr;
        grid-template-rows: 300px 1fr 250px;
    }
    
    .resize-handle {
        display: none;
    }
}

@media (max-width: 768px) {
    .dashboard-grid {
        grid-template-rows: 250px 1fr 200px;
    }
    
    .panel-content {
        padding: 12px;
    }
}
```

### **2. Enhanced Code Editor Integration**

#### **A. Monaco Editor Implementation**
```typescript
// Enhanced code editor with syntax highlighting and IntelliSense
import * as monaco from 'monaco-editor';

class CodeEditor {
    private editor: monaco.editor.IStandaloneCodeEditor;
    
    constructor(containerId: string) {
        this.editor = monaco.editor.create(document.getElementById(containerId)!, {
            value: this.getDefaultCode(),
            language: 'python',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            wordWrap: 'on',
        });
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        this.editor.onDidChangeModelContent(() => {
            this.updateLineCount();
            this.autoSave();
        });
    }
    
    private getDefaultCode(): string {
        return `def helper_function():
    return "Helper result"

def process_data(data):
    result = helper_function()
    return validate_data(result)

class Animal:
    def __init__(self, name):
        self.name = name
    
    def speak(self):
        pass

class Dog(Animal):
    def speak(self):
        return f"{self.name} says Woof!"`;
    }
    
    public getValue(): string {
        return this.editor.getValue();
    }
    
    public setValue(code: string): void {
        this.editor.setValue(code);
    }
    
    private updateLineCount(): void {
        const lineCount = this.editor.getModel()?.getLineCount() || 0;
        document.getElementById('line-count')!.textContent = `${lineCount} lines`;
    }
    
    private autoSave(): void {
        localStorage.setItem('prism-code', this.getValue());
    }
}
```

#### **B. Panel Resize Functionality**
```typescript
class PanelResizer {
    private isDragging = false;
    private startX = 0;
    private startY = 0;
    private startWidth = 0;
    private startHeight = 0;
    
    constructor() {
        this.setupResizeHandles();
    }
    
    private setupResizeHandles(): void {
        const handles = document.querySelectorAll('.resize-handle');
        
        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => this.startResize(e as MouseEvent));
        });
        
        document.addEventListener('mousemove', (e) => this.resize(e));
        document.addEventListener('mouseup', () => this.stopResize());
    }
    
    private startResize(e: MouseEvent): void {
        this.isDragging = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        
        const target = e.target as HTMLElement;
        const panels = target.dataset.panels?.split(',') || [];
        
        // Store initial dimensions
        panels.forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) {
                this.startWidth = panel.offsetWidth;
                this.startHeight = panel.offsetHeight;
            }
        });
        
        document.body.style.cursor = target.classList.contains('resize-vertical') 
            ? 'col-resize' : 'row-resize';
    }
    
    private resize(e: MouseEvent): void {
        if (!this.isDragging) return;
        
        const deltaX = e.clientX - this.startX;
        const deltaY = e.clientY - this.startY;
        
        // Apply resize logic based on handle type and position
        this.updateGridLayout(deltaX, deltaY);
    }
    
    private stopResize(): void {
        this.isDragging = false;
        document.body.style.cursor = '';
        this.savePanelSizes();
    }
    
    private updateGridLayout(deltaX: number, deltaY: number): void {
        const grid = document.querySelector('.dashboard-grid') as HTMLElement;
        const currentColumns = grid.style.gridTemplateColumns || '1fr 2fr 1fr';
        
        // Calculate new column sizes based on delta
        // Implementation depends on specific resize logic
    }
    
    private savePanelSizes(): void {
        const grid = document.querySelector('.dashboard-grid') as HTMLElement;
        localStorage.setItem('prism-panel-layout', grid.style.gridTemplateColumns);
    }
}
```

### **3. Enhanced RAG Query Interface**

#### **A. Query Input Enhancements**
```typescript
class RAGQueryInterface {
    private queryHistory: string[] = [];
    private currentHistoryIndex = -1;
    
    constructor() {
        this.setupQueryInput();
        this.loadQueryHistory();
    }
    
    private setupQueryInput(): void {
        const queryInput = document.getElementById('rag-query-input') as HTMLTextAreaElement;
        
        queryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.executeQuery();
            } else if (e.key === 'ArrowUp') {
                this.navigateHistory(-1);
            } else if (e.key === 'ArrowDown') {
                this.navigateHistory(1);
            }
        });
        
        // Auto-resize textarea
        queryInput.addEventListener('input', () => {
            queryInput.style.height = 'auto';
            queryInput.style.height = queryInput.scrollHeight + 'px';
        });
    }
    
    private navigateHistory(direction: number): void {
        if (this.queryHistory.length === 0) return;
        
        this.currentHistoryIndex = Math.max(0, 
            Math.min(this.queryHistory.length - 1, 
                this.currentHistoryIndex + direction));
        
        const queryInput = document.getElementById('rag-query-input') as HTMLTextAreaElement;
        queryInput.value = this.queryHistory[this.currentHistoryIndex];
    }
    
    private executeQuery(): void {
        const queryInput = document.getElementById('rag-query-input') as HTMLTextAreaElement;
        const query = queryInput.value.trim();
        
        if (!query) return;
        
        this.addToHistory(query);
        // Execute RAG query logic here
    }
    
    private addToHistory(query: string): void {
        if (!this.queryHistory.includes(query)) {
            this.queryHistory.unshift(query);
            this.queryHistory = this.queryHistory.slice(0, 20); // Keep last 20 queries
            this.saveQueryHistory();
        }
    }
    
    private loadQueryHistory(): void {
        const saved = localStorage.getItem('prism-query-history');
        if (saved) {
            this.queryHistory = JSON.parse(saved);
        }
    }
    
    private saveQueryHistory(): void {
        localStorage.setItem('prism-query-history', JSON.stringify(this.queryHistory));
    }
}
```

#### **B. Results Display Enhancement**
```typescript
interface RAGResult {
    snippet: string;
    score: number;
    type: 'function' | 'class' | 'global';
    name: string;
    line_start?: number;
    line_end?: number;
}

class RAGResultsDisplay {
    private container: HTMLElement;
    
    constructor(containerId: string) {
        this.container = document.getElementById(containerId)!;
    }
    
    public displayResults(results: RAGResult[], query: string): void {
        this.container.innerHTML = '';
        
        if (results.length === 0) {
            this.showNoResults(query);
            return;
        }
        
        const header = this.createResultsHeader(results.length, query);
        this.container.appendChild(header);
        
        const resultsList = document.createElement('div');
        resultsList.className = 'results-list';
        
        results.forEach((result, index) => {
            const resultElement = this.createResultElement(result, index);
            resultsList.appendChild(resultElement);
        });
        
        this.container.appendChild(resultsList);
    }
    
    private createResultElement(result: RAGResult, index: number): HTMLElement {
        const element = document.createElement('div');
        element.className = 'result-item';
        element.innerHTML = `
            <div class="result-header">
                <div class="result-title">
                    <span class="type-badge type-${result.type}">${result.type}</span>
                    <span class="result-name">${result.name}</span>
                </div>
                <div class="confidence-score" data-score="${result.score}">
                    ${(result.score * 100).toFixed(1)}%
                </div>
            </div>
            <div class="result-content">
                <pre class="code-snippet"><code class="language-python">${this.escapeHtml(result.snippet)}</code></pre>
            </div>
            ${result.line_start ? `<div class="result-meta">Lines ${result.line_start}-${result.line_end}</div>` : ''}
        `;
        
        return element;
    }
    
    private createResultsHeader(count: number, query: string): HTMLElement {
        const header = document.createElement('div');
        header.className = 'results-header';
        header.innerHTML = `
            <h4>${count} result${count !== 1 ? 's' : ''} for "${query}"</h4>
            <p class="results-description">Relevant code snippets found using semantic search</p>
        `;
        return header;
    }
    
    private showNoResults(query: string): void {
        this.container.innerHTML = `
            <div class="no-results">
                <h4>No results found for "${query}"</h4>
                <p>Try rephrasing your query or check if the code contains relevant content.</p>
            </div>
        `;
    }
    
    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
```

### **4. Main Display Panel Management**

#### **A. View Switcher Logic**
```typescript
class MainDisplayManager {
    private currentView: string = 'ast';
    private views: Map<string, ViewHandler> = new Map();
    
    constructor() {
        this.setupViewSwitcher();
        this.registerViews();
    }
    
    private setupViewSwitcher(): void {
        const viewButtons = document.querySelectorAll('.view-btn');
        
        viewButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const view = target.dataset.view!;
                this.switchView(view);
            });
        });
    }
    
    private registerViews(): void {
        this.views.set('ast', new ASTViewHandler());
        this.views.set('inheritance', new InheritanceViewHandler());
        this.views.set('callgraph', new CallGraphViewHandler());
        this.views.set('rag', new RAGViewHandler());
    }
    
    public switchView(viewName: string): void {
        if (this.currentView === viewName) return;
        
        // Update active button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');
        
        // Switch view content
        const viewHandler = this.views.get(viewName);
        if (viewHandler) {
            viewHandler.activate();
            this.currentView = viewName;
            this.updateMainTitle(viewName);
        }
    }
    
    private updateMainTitle(viewName: string): void {
        const titles = {
            'ast': '📊 Abstract Syntax Tree',
            'inheritance': '🏗️ Class Inheritance',
            'callgraph': '🔗 Function Call Graph',
            'rag': '🤖 RAG Search Results'
        };
        
        const titleElement = document.getElementById('main-title')!;
        titleElement.textContent = titles[viewName] || '📊 Visualization';
    }
}

interface ViewHandler {
    activate(): void;
    deactivate?(): void;
    update?(data: any): void;
}

class ASTViewHandler implements ViewHandler {
    activate(): void {
        const container = document.getElementById('viz-container')!;
        container.innerHTML = '<div id="ast-visualization" class="visualization-content"></div>';
        // Initialize AST visualization
    }
}

class RAGViewHandler implements ViewHandler {
    activate(): void {
        const container = document.getElementById('viz-container')!;
        container.innerHTML = '<div id="rag-results-display" class="rag-results-container"></div>';
        // Initialize RAG results display
    }
}
```

## ✅ **Phase 1 Technical Decisions**

### **1. Layout System: CSS Grid**
- ✅ **Grid-based layout**: Three-column grid with flexible sizing
- ✅ **Responsive breakpoints**: Collapse to vertical stack on smaller screens
- ✅ **Panel resizing**: Custom resize handles with localStorage persistence
- ✅ **Fullscreen utilization**: 100vh height with minimal margins
- ✅ **Modern aesthetics**: Dark theme with VS Code-inspired design

### **2. Code Editor: Monaco Editor**
- ✅ **Rich editing**: Syntax highlighting, IntelliSense, minimap
- ✅ **Python support**: Full Python language features
- ✅ **Accessibility**: Screen reader support, keyboard navigation
- ✅ **Performance**: Efficient for large code files
- ✅ **Integration**: Easy integration with existing codebase

### **3. State Management: LocalStorage**
- ✅ **Panel layout**: Persist panel sizes and positions
- ✅ **Code content**: Auto-save code input
- ✅ **Query history**: Remember recent RAG queries
- ✅ **View preferences**: Remember last active visualization
- ✅ **Settings**: Store user preferences

### **4. Responsive Design: Mobile-First**
- ✅ **Breakpoints**: 768px (mobile), 1024px (tablet), 1200px+ (desktop)
- ✅ **Panel stacking**: Vertical layout on small screens
- ✅ **Touch support**: Touch-friendly controls and gestures
- ✅ **Performance**: Optimized for various device capabilities

## 📝 **Acceptance Criteria**
- [ ] Dashboard utilizes full viewport height and width
- [ ] Three distinct panels: code input, main display, RAG query
- [ ] Panels are resizable with persistent sizing
- [ ] Code editor provides syntax highlighting and modern editing features
- [ ] Main display smoothly switches between all four visualization types
- [ ] RAG query panel provides enhanced input experience with history
- [ ] Layout adapts gracefully to different screen sizes
- [ ] All existing functionality is preserved and enhanced
- [ ] Performance remains smooth with larger code inputs
- [ ] Accessibility standards are maintained (WCAG 2.1 AA)

## 🧪 **Testing Strategy**
- **Layout testing**: Verify panel resizing and responsive behavior
- **Cross-browser compatibility**: Test on Chrome, Firefox, Safari, Edge
- **Performance testing**: Measure rendering performance with large code files
- **Accessibility testing**: Screen reader and keyboard navigation
- **User experience testing**: Workflow efficiency comparison with current design

## 📦 **Files to Create/Modify**
- `frontend/public/index.html` - Complete HTML structure redesign
- `frontend/public/style.css` - New dashboard CSS system
- `frontend/src/dashboard.ts` - New dashboard management module
- `frontend/src/editor.ts` - Enhanced code editor integration
- `frontend/src/panels.ts` - Panel resize and state management
- `frontend/src/index.ts` - Update main application initialization
- `frontend/package.json` - Add Monaco Editor dependency
- `frontend/tsconfig.json` - Update TypeScript configuration if needed

## 🚀 **Implementation Timeline**
1. **Week 1**: HTML structure redesign and CSS grid layout
2. **Week 2**: Monaco Editor integration and code panel enhancement
3. **Week 3**: Panel resizing functionality and state persistence
4. **Week 4**: RAG query interface enhancement and main display management
5. **Week 5**: Responsive design implementation and testing
6. **Week 6**: Performance optimization and accessibility improvements

---

**Dependencies**: Monaco Editor (~2MB), existing visualization libraries
**Breaking Changes**: Complete UI redesign - existing bookmarks/workflows may need adjustment
**Migration Path**: Provide toggle between old and new UI during transition period