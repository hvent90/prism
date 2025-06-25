// Main Dashboard Controller
import { CodeEditor } from './editor';
import { PanelResizer } from './panels';
import { RAGQueryInterface } from './rag-interface';
import { MainDisplayManager } from './main-display';

export class PrismDashboard {
    private codeEditor!: CodeEditor;
    private panelResizer!: PanelResizer;
    private ragInterface!: RAGQueryInterface;
    private mainDisplay!: MainDisplayManager;
    private currentAnalysisData: any = null;

    constructor() {
        this.initializeDashboard();
    }

    private async initializeDashboard(): Promise<void> {
        // Initialize Monaco Editor
        await this.initializeMonacoEditor();
        
        // Test backend connection
        await this.testBackendConnection();
        
        // Initialize components
        this.codeEditor = new CodeEditor('code-editor');
        this.panelResizer = new PanelResizer();
        this.ragInterface = new RAGQueryInterface();
        this.mainDisplay = new MainDisplayManager();

        // Setup event listeners
        this.setupEventListeners();

        // Load saved state
        this.loadSavedState();

        // Update status
        this.updateStatus('Dashboard initialized successfully');
    }

    private async initializeMonacoEditor(): Promise<void> {
        return new Promise((resolve) => {
            // Configure Monaco Editor
            (window as any).MonacoEnvironment = {
                getWorkerUrl: function (moduleId: string, label: string) {
                    if (label === 'json') {
                        return 'https://unpkg.com/monaco-editor@0.44.0/min/vs/language/json/json.worker.js';
                    }
                    if (label === 'css' || label === 'scss' || label === 'less') {
                        return 'https://unpkg.com/monaco-editor@0.44.0/min/vs/language/css/css.worker.js';
                    }
                    if (label === 'html' || label === 'handlebars' || label === 'razor') {
                        return 'https://unpkg.com/monaco-editor@0.44.0/min/vs/language/html/html.worker.js';
                    }
                    if (label === 'typescript' || label === 'javascript') {
                        return 'https://unpkg.com/monaco-editor@0.44.0/min/vs/language/typescript/ts.worker.js';
                    }
                    return 'https://unpkg.com/monaco-editor@0.44.0/min/vs/editor/editor.worker.js';
                }
            };

            (window as any).require.config({ 
                paths: { 
                    'vs': 'https://unpkg.com/monaco-editor@0.44.0/min/vs' 
                } 
            });

            (window as any).require(['vs/editor/editor.main'], function () {
                resolve();
            });
        });
    }

    private async testBackendConnection(): Promise<void> {
        try {
            const response = await fetch(`${this.getBackendUrl()}/api/test-cors`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                mode: 'cors'
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Backend connection test successful:', data);
                this.updateStatus('Backend connected successfully', 'success');
            } else {
                console.warn('Backend connection test failed:', response.status);
                this.updateStatus('Backend connection test failed', 'error');
            }
        } catch (error) {
            console.error('Backend connection test error:', error);
            this.updateStatus('Cannot connect to backend - check if server is running', 'error');
        }
    }

    private setupEventListeners(): void {
        // Analyze code button
        const analyzeBtn = document.getElementById('analyze-code');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyzeCode());
        }

        // Format code button
        const formatBtn = document.getElementById('format-code');
        if (formatBtn) {
            formatBtn.addEventListener('click', () => this.formatCode());
        }

        // Clear code button
        const clearBtn = document.getElementById('clear-code');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearCode());
        }

        // Layout toggle
        const layoutToggle = document.getElementById('layout-toggle');
        if (layoutToggle) {
            layoutToggle.addEventListener('click', () => this.toggleLayout());
        }

        // Window resize
        window.addEventListener('resize', () => this.handleResize());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    private async analyzeCode(): Promise<void> {
        const code = this.codeEditor.getValue().trim();
        
        if (!code) {
            this.updateStatus('Please enter some Python code to analyze', 'error');
            return;
        }

        this.updateStatus('Analyzing code...', 'loading');
        document.body.classList.add('loading');

        try {
            // Call all analysis endpoints in parallel
            const [astData, inheritanceData, callGraphData] = await Promise.all([
                this.callBackendAPI('/api/ast', { code }),
                this.callBackendAPI('/api/inheritance', { code }),
                this.callBackendAPI('/api/callgraph', { code })
            ]);

            this.currentAnalysisData = {
                ast: astData,
                inheritance: inheritanceData,
                callgraph: callGraphData,
                code: code
            };

            // Update the main display with the current view
            this.mainDisplay.updateData(this.currentAnalysisData);

            this.updateStatus('Code analysis completed successfully', 'success');
            this.updateAnalysisStatus(`Analyzed ${code.split('\n').length} lines`);

        } catch (error) {
            console.error('Analysis error:', error);
            this.updateStatus('Failed to analyze code. Please check the backend connection.', 'error');
        } finally {
            document.body.classList.remove('loading');
        }
    }

    private async callBackendAPI(endpoint: string, data: any): Promise<any> {
        const backendUrl = this.getBackendUrl();
        
        try {
            const response = await fetch(`${backendUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(data),
                mode: 'cors',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            return response.json();
        } catch (error) {
            console.error(`API call to ${endpoint} failed:`, error);
            throw error;
        }
    }

    private getBackendUrl(): string {
        // Try to detect backend URL, fallback to localhost
        return window.location.hostname === 'localhost' 
            ? 'http://localhost:5000' 
            : `${window.location.protocol}//${window.location.hostname}:5000`;
    }

    private formatCode(): void {
        // Basic Python code formatting
        const code = this.codeEditor.getValue();
        // For now, just normalize whitespace
        const formatted = code
            .split('\n')
            .map((line: string) => line.trimRight())
            .join('\n')
            .replace(/\n{3,}/g, '\n\n'); // Remove excessive blank lines

        this.codeEditor.setValue(formatted);
        this.updateStatus('Code formatted');
    }

    private clearCode(): void {
        if (confirm('Are you sure you want to clear the code editor?')) {
            this.codeEditor.setValue('');
            this.mainDisplay.clearData();
            this.currentAnalysisData = null;
            this.updateStatus('Code editor cleared');
            this.updateAnalysisStatus('No analysis');
        }
    }

    private toggleLayout(): void {
        const grid = document.getElementById('dashboard-grid');
        if (!grid) return;

        const currentColumns = window.getComputedStyle(grid).gridTemplateColumns;
        
        if (currentColumns.includes('1fr 2fr 1fr')) {
            // Switch to vertical layout
            grid.style.gridTemplateColumns = '1fr';
            grid.style.gridTemplateRows = '300px 1fr 250px';
            this.updateStatus('Switched to vertical layout');
        } else {
            // Switch back to horizontal layout
            grid.style.gridTemplateColumns = '1fr 2fr 1fr';
            grid.style.gridTemplateRows = '1fr';
            this.updateStatus('Switched to horizontal layout');
        }
    }

    private handleResize(): void {
        // Notify components about resize
        if (this.codeEditor) {
            this.codeEditor.layout();
        }
    }

    private handleKeyboardShortcuts(e: KeyboardEvent): void {
        // Ctrl/Cmd + Enter: Analyze code
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            this.analyzeCode();
        }
        
        // Ctrl/Cmd + K: Clear code
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.clearCode();
        }

        // Ctrl/Cmd + Shift + F: Format code
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
            e.preventDefault();
            this.formatCode();
        }
    }

    private loadSavedState(): void {
        // Load saved code
        const savedCode = localStorage.getItem('prism-code');
        if (savedCode) {
            this.codeEditor.setValue(savedCode);
        } else {
            // Set default code
            this.codeEditor.setValue(this.getDefaultCode());
        }

        // Load saved panel layout
        const savedLayout = localStorage.getItem('prism-panel-layout');
        if (savedLayout) {
            const grid = document.getElementById('dashboard-grid');
            if (grid) {
                grid.style.gridTemplateColumns = savedLayout;
            }
        }
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
        return f"{self.name} says Woof!"

# Example usage
my_dog = Dog("Buddy")
print(my_dog.speak())`;
    }

    private updateStatus(message: string, type: 'info' | 'success' | 'error' | 'loading' = 'info'): void {
        const statusElement = document.getElementById('status-message');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-${type}`;
        }

        // Auto-clear non-error messages
        if (type !== 'error' && type !== 'loading') {
            setTimeout(() => {
                if (statusElement) {
                    statusElement.textContent = 'Ready';
                    statusElement.className = '';
                }
            }, 3000);
        }
    }

    private updateAnalysisStatus(status: string): void {
        const analysisStatus = document.getElementById('analysis-status');
        if (analysisStatus) {
            analysisStatus.textContent = status;
        }
    }

    // Public methods for components to interact with dashboard
    public getAnalysisData(): any {
        return this.currentAnalysisData;
    }

    public getCodeEditor(): CodeEditor {
        return this.codeEditor;
    }

    public updateLineCount(count: number): void {
        const lineCountElement = document.getElementById('line-count');
        if (lineCountElement) {
            lineCountElement.textContent = `${count} lines`;
        }
    }
} 