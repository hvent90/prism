// Main Display Panel Manager
import { D3Visualizations } from './d3-visualizations';

export interface ViewHandler {
    activate(): void;
    deactivate?(): void;
    update?(data: any): void;
    clear?(): void;
}

export class MainDisplayManager {
    private currentView: string = 'ast';
    private views: Map<string, ViewHandler> = new Map();
    private currentData: any = null;

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
    }

    public switchView(viewName: string): void {
        if (this.currentView === viewName) return;

        // Deactivate current view
        const currentHandler = this.views.get(this.currentView);
        if (currentHandler && currentHandler.deactivate) {
            currentHandler.deactivate();
        }

        // Update active button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');

        // Switch view content
        const viewHandler = this.views.get(viewName);
        if (viewHandler) {
            viewHandler.activate();
            
            // Update with current data if available
            if (this.currentData && viewHandler.update) {
                viewHandler.update(this.currentData);
            }
            
            this.currentView = viewName;
            this.updateMainTitle(viewName);
        }
    }

    private updateMainTitle(viewName: string): void {
        const titles = {
            'ast': '📊 Abstract Syntax Tree',
            'inheritance': '🏗️ Class Inheritance',
            'callgraph': '🔗 Function Call Graph'
        };

        const titleElement = document.getElementById('main-title')!;
        titleElement.textContent = titles[viewName as keyof typeof titles] || '📊 Visualization';
    }

    public updateData(data: any): void {
        this.currentData = data;
        
        // Update current view with new data
        const currentHandler = this.views.get(this.currentView);
        if (currentHandler && currentHandler.update) {
            currentHandler.update(data);
        }
    }

    public clearData(): void {
        this.currentData = null;
        
        // Clear all views
        this.views.forEach(handler => {
            if (handler.clear) {
                handler.clear();
            }
        });
        
        // Show welcome message
        this.showWelcomeMessage();
    }

    private showWelcomeMessage(): void {
        const container = document.getElementById('viz-container')!;
        container.innerHTML = `
            <div class="welcome-message">
                <h3>Welcome to Prism Dashboard</h3>
                <p>Enter Python code in the left panel and click "Analyze Code" to get started.</p>
                <div class="feature-grid">
                    <div class="feature-card">
                        <div class="feature-icon">📊</div>
                        <h4>AST Analysis</h4>
                        <p>Visualize Abstract Syntax Trees</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🏗️</div>
                        <h4>Inheritance</h4>
                        <p>Explore class hierarchies</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🔗</div>
                        <h4>Call Graph</h4>
                        <p>Understand function relationships</p>
                    </div>
                </div>
            </div>
        `;
    }

    public getCurrentView(): string {
        return this.currentView;
    }

    public getData(): any {
        return this.currentData;
    }
}

// Individual View Handlers
class ASTViewHandler implements ViewHandler {
    activate(): void {
        const container = document.getElementById('viz-container')!;
        container.innerHTML = '<div id="ast-visualization" class="visualization-content ast-container"></div>';
    }

    update(data: any): void {
        if (!data.ast) {
            this.showNoData();
            return;
        }

        // Extract the actual AST data from the backend response
        const astData = data.ast.ast || data.ast;
        
        // Use D3 visualization
        D3Visualizations.renderAST('ast-visualization', astData);
    }

    clear(): void {
        const container = document.getElementById('ast-visualization');
        if (container) {
            container.innerHTML = '';
        }
    }

    private showNoData(): void {
        const container = document.getElementById('ast-visualization');
        if (container) {
            container.innerHTML = `
                <div class="no-data-message">
                    <h4>No AST Data</h4>
                    <p>Analyze some Python code to see the Abstract Syntax Tree visualization.</p>
                </div>
            `;
        }
    }
}

class InheritanceViewHandler implements ViewHandler {
    activate(): void {
        const container = document.getElementById('viz-container')!;
        container.innerHTML = '<div id="inheritance-visualization" class="visualization-content inheritance-container"></div>';
    }

    update(data: any): void {
        if (!data.inheritance) {
            this.showNoData();
            return;
        }

        // Extract the actual inheritance data from the backend response
        const inheritanceData = data.inheritance.classes ? data.inheritance : data.inheritance;
        
        // Use D3 visualization
        D3Visualizations.renderInheritance('inheritance-visualization', inheritanceData);
    }

    clear(): void {
        const container = document.getElementById('inheritance-visualization');
        if (container) {
            container.innerHTML = '';
        }
    }

    private showNoData(): void {
        const container = document.getElementById('inheritance-visualization');
        if (container) {
            container.innerHTML = `
                <div class="no-data-message">
                    <h4>No Inheritance Data</h4>
                    <p>Analyze Python code with classes to see inheritance relationships.</p>
                </div>
            `;
        }
    }
}

class CallGraphViewHandler implements ViewHandler {
    activate(): void {
        const container = document.getElementById('viz-container')!;
        container.innerHTML = '<div id="callgraph-visualization" class="visualization-content callgraph-container"></div>';
    }

    update(data: any): void {
        if (!data.callgraph) {
            this.showNoData();
            return;
        }

        // Extract the actual call graph data from the backend response
        const callGraphData = data.callgraph.functions ? data.callgraph : data.callgraph;
        
        // Use D3 visualization
        D3Visualizations.renderCallGraph('callgraph-visualization', callGraphData);
    }

    clear(): void {
        const container = document.getElementById('callgraph-visualization');
        if (container) {
            container.innerHTML = '';
        }
    }

    private showNoData(): void {
        const container = document.getElementById('callgraph-visualization');
        if (container) {
            container.innerHTML = `
                <div class="no-data-message">
                    <h4>No Call Graph Data</h4>
                    <p>Analyze Python code with function calls to see the call graph visualization.</p>
                </div>
            `;
        }
    }
} 