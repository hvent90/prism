// AST Coordinate System for Cross-Panel Highlighting
import { D3Visualizations } from './d3-visualizations';

export interface ASTReference {
    node_id: string;
    line: number;
    col?: number;
    end_line: number;
    end_col?: number;
    node_type: string;
    node_path: string[];
}

export interface RAGResult {
    snippet: string;
    score: number;
    type: 'function' | 'class' | 'global';
    name: string;
    line_start?: number;
    line_end?: number;
    ast_ref?: ASTReference;
}

export interface HighlightTarget {
    type: 'inheritance' | 'callgraph';
    nodeId: string;
    highlightStyle: 'direct' | 'hierarchical' | 'secondary';
}

export class ASTCoordinateMapper {
    /**
     * Map RAG results to visualization nodes using AST coordinates
     */
    public matchRAGResultsToNodes(
        ragResults: RAGResult[], 
        visualizationData: any
    ): Map<string, HighlightTarget[]> {
        const matches = new Map<string, HighlightTarget[]>();
        
        ragResults.forEach(ragResult => {
            if (!ragResult.ast_ref) return;
            
            const targets: HighlightTarget[] = [];
            
            // Direct node matching
            const directMatches = this.findDirectMatches(ragResult.ast_ref, visualizationData);
            targets.push(...directMatches);
            
            // Hierarchical matching (highlight parent if child matches)
            const hierarchicalMatches = this.findHierarchicalMatches(ragResult.ast_ref, visualizationData);
            targets.push(...hierarchicalMatches);
            
            if (targets.length > 0) {
                matches.set(ragResult.ast_ref.node_id, targets);
            }
        });
        
        return matches;
    }
    
    private findDirectMatches(astRef: ASTReference, visualizationData: any): HighlightTarget[] {
        const matches: HighlightTarget[] = [];
        
        // Check inheritance graph
        if (visualizationData.inheritance?.classes) {
            visualizationData.inheritance.classes.forEach((cls: any) => {
                if (cls.ast_ref?.node_id === astRef.node_id) {
                    matches.push({
                        type: 'inheritance',
                        nodeId: cls.ast_ref.node_id,
                        highlightStyle: 'direct'
                    });
                }
                
                // Check methods within classes
                cls.methods?.forEach((method: any) => {
                    if (method.ast_ref?.node_id === astRef.node_id) {
                        matches.push({
                            type: 'inheritance',
                            nodeId: method.ast_ref.node_id,
                            highlightStyle: 'direct'
                        });
                    }
                });
            });
        }
        
        // Check standalone functions from inheritance data
        if (visualizationData.inheritance?.functions) {
            visualizationData.inheritance.functions.forEach((fn: any) => {
                if (fn.ast_ref?.node_id === astRef.node_id) {
                    matches.push({
                        type: 'inheritance',
                        nodeId: fn.ast_ref.node_id,
                        highlightStyle: 'direct'
                    });
                }
            });
        }
        
        // Check call graph
        if (visualizationData.callgraph?.functions) {
            visualizationData.callgraph.functions.forEach((fn: any) => {
                if (fn.ast_ref?.node_id === astRef.node_id) {
                    matches.push({
                        type: 'callgraph',
                        nodeId: fn.ast_ref.node_id,
                        highlightStyle: 'direct'
                    });
                }
            });
        }
        
        return matches;
    }
    
    private findHierarchicalMatches(astRef: ASTReference, visualizationData: any): HighlightTarget[] {
        const matches: HighlightTarget[] = [];
        
        // If RAG result is a method, also highlight the containing class
        if (astRef.node_path.includes('ClassDef') && astRef.node_type === 'FunctionDef') {
            const parentClass = this.findParentClass(astRef, visualizationData);
            if (parentClass) {
                matches.push({
                    type: 'inheritance',
                    nodeId: parentClass.ast_ref.node_id,
                    highlightStyle: 'hierarchical'
                });
            }
        }
        
        return matches;
    }
    
    private findParentClass(methodRef: ASTReference, visualizationData: any): any {
        if (!visualizationData.inheritance?.classes) return null;
        
        return visualizationData.inheritance.classes.find((cls: any) => {
            return cls.methods?.some((method: any) => 
                method.ast_ref?.node_id === methodRef.node_id
            );
        });
    }
}

export class VisualizationCoordinator {
    private astMapper: ASTCoordinateMapper;
    private currentHighlights: Map<string, HighlightTarget[]> = new Map();
    private currentPersistentTargets: HighlightTarget[] = []; // Store persistent targets
    private hoverTimeoutId: number | null = null;
    
    constructor() {
        this.astMapper = new ASTCoordinateMapper();
        this.setupRAGResultListeners();
    }
    
    private setupRAGResultListeners(): void {
        // Listen for RAG results display
        document.addEventListener('rag-results-displayed', (event: any) => {
            this.highlightMatchingNodes(event.detail.results, event.detail.visualizationData);
        });
        
        // Listen for RAG results cleared
        document.addEventListener('rag-results-cleared', () => {
            this.clearAllHighlights();
        });
        
        // Listen for RAG result hover
        document.addEventListener('rag-result-hover', (event: any) => {
            if (event.detail.action === 'enter') {
                this.addSecondaryHighlight(event.detail.result);
            } else if (event.detail.action === 'leave') {
                this.removeSecondaryHighlight();
            }
        });
        
        // Listen for visualization view switches
        document.addEventListener('visualization-view-switched', (event: any) => {
            this.handleViewSwitch(event.detail);
        });
        
        // Listen for visualization data updates
        document.addEventListener('visualization-data-updated', (event: any) => {
            this.handleDataUpdate(event.detail);
        });
    }
    
    private handleViewSwitch(detail: { newView: string, previousView: string, data: any }): void {
        // Only reapply highlights if we have persistent highlights and switched to a relevant view
        if (this.currentPersistentTargets.length === 0) return;
        
        const { newView } = detail;
        
        // Add a delay to ensure the new view is fully rendered
        setTimeout(() => {
            let highlightCount = 0;
            
            if (newView === 'inheritance') {
                const inheritanceTargets = this.currentPersistentTargets.filter(t => t.type === 'inheritance');
                if (inheritanceTargets.length > 0) {
                    D3Visualizations.highlightInheritanceNodes('inheritance-visualization', inheritanceTargets);
                    highlightCount = inheritanceTargets.length;
                    console.log(`Reapplied ${inheritanceTargets.length} inheritance highlights after view switch`);
                } else {
                    // Clear any existing highlights if no targets for this view
                    D3Visualizations.clearHighlights('inheritance-visualization');
                }
            } else if (newView === 'callgraph') {
                const callGraphTargets = this.currentPersistentTargets.filter(t => t.type === 'callgraph');
                if (callGraphTargets.length > 0) {
                    D3Visualizations.highlightCallGraphNodes('callgraph-visualization', callGraphTargets);
                    highlightCount = callGraphTargets.length;
                    console.log(`Reapplied ${callGraphTargets.length} call graph highlights after view switch`);
                } else {
                    // Clear any existing highlights if no targets for this view
                    D3Visualizations.clearHighlights('callgraph-visualization');
                }
                
                // Always try to apply RAG path highlighting when switching to call graph
                // This ensures paths are restored even if we don't have call graph node highlights
                this.applyRAGPathHighlighting(detail.data);
            }
            // Note: AST view doesn't have highlighting support yet, so no action needed
            
            // Show feedback if highlights were reapplied
            if (highlightCount > 0) {
                this.showHighlightFeedback(`Restored ${highlightCount} highlights in ${newView} view`);
            }
        }, 100); // Small delay to ensure DOM is ready
    }
    
    private handleDataUpdate(detail: { view: string, data: any }): void {
        // Only reapply highlights if we have persistent highlights
        if (this.currentPersistentTargets.length === 0) return;
        
        const { view } = detail;
        
        // Add a delay to ensure the new visualization is fully rendered
        setTimeout(() => {
            if (view === 'inheritance') {
                const inheritanceTargets = this.currentPersistentTargets.filter(t => t.type === 'inheritance');
                if (inheritanceTargets.length > 0) {
                    D3Visualizations.highlightInheritanceNodes('inheritance-visualization', inheritanceTargets);
                    console.log(`Reapplied ${inheritanceTargets.length} inheritance highlights after data update`);
                }
            } else if (view === 'callgraph') {
                const callGraphTargets = this.currentPersistentTargets.filter(t => t.type === 'callgraph');
                if (callGraphTargets.length > 0) {
                    D3Visualizations.highlightCallGraphNodes('callgraph-visualization', callGraphTargets);
                    console.log(`Reapplied ${callGraphTargets.length} call graph highlights after data update`);
                }
                
                // Always try to reapply RAG path highlighting for call graph
                this.applyRAGPathHighlighting(detail.data);
            }
        }, 150); // Slightly longer delay for data updates
    }
    
    public highlightMatchingNodes(ragResults: RAGResult[], visualizationData?: any): void {
        // Use provided visualization data or fall back to dashboard data
        let analysisData = visualizationData;
        
        if (!analysisData) {
            const dashboard = (window as any).prismDashboard;
            analysisData = dashboard?.getAnalysisData();
        }
        
        // Also check for globally stored RAG visualization data
        if (!analysisData) {
            analysisData = (window as any).ragVisualizationData;
        }
        
        if (!analysisData) return;
        
        // Map RAG results to visualization nodes
        const matches = this.astMapper.matchRAGResultsToNodes(ragResults, analysisData);
        
        // Group targets by visualization type
        const inheritanceTargets: HighlightTarget[] = [];
        const callGraphTargets: HighlightTarget[] = [];
        
        matches.forEach(targets => {
            targets.forEach(target => {
                if (target.type === 'inheritance') {
                    inheritanceTargets.push(target);
                } else if (target.type === 'callgraph') {
                    callGraphTargets.push(target);
                }
            });
        });
        
        console.log('AST Coordinator - Highlighting targets:', {
            inheritanceTargets: inheritanceTargets.length,
            callGraphTargets: callGraphTargets.length,
            analysisData: !!analysisData,
            callgraphFunctions: analysisData?.callgraph?.functions?.length || 0,
            ragResults: ragResults.length
        });
        
        // Store persistent targets for later restoration
        this.currentPersistentTargets = [...inheritanceTargets, ...callGraphTargets];
        
        // Apply persistent highlights to visualizations
        if (inheritanceTargets.length > 0) {
            D3Visualizations.highlightInheritanceNodes('inheritance-visualization', inheritanceTargets);
        }
        
        if (callGraphTargets.length > 0) {
            D3Visualizations.highlightCallGraphNodes('callgraph-visualization', callGraphTargets);
        }
        
        // Check for RAG path data and apply path highlighting if available
        this.applyRAGPathHighlighting(analysisData);
        
        // Store current highlights
        this.currentHighlights = matches;
        
        // Show visual feedback
        this.showHighlightFeedback(`Highlighting ${inheritanceTargets.length + callGraphTargets.length} nodes`);
        
        console.log(`Applied persistent highlights to ${inheritanceTargets.length} inheritance nodes and ${callGraphTargets.length} callgraph nodes`);
    }
    
    public clearAllHighlights(): void {
        D3Visualizations.clearHighlights('inheritance-visualization');
        D3Visualizations.clearHighlights('callgraph-visualization');
        this.currentHighlights.clear();
        this.currentPersistentTargets = [];
        
        // Show visual feedback
        this.showHighlightFeedback('Highlights cleared', 'cleared');
        
        console.log('Cleared all highlights');
    }
    
    private showHighlightFeedback(message: string, type: 'active' | 'cleared' = 'active'): void {
        // Remove existing feedback
        const existingFeedback = document.querySelector('.highlighting-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        // Create new feedback element
        const feedback = document.createElement('div');
        feedback.className = `highlighting-feedback ${type}`;
        feedback.textContent = message;
        
        // Add to document
        document.body.appendChild(feedback);
        
        // Remove after animation
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 3000);
    }
    
    private addSecondaryHighlight(ragResult: RAGResult): void {
        if (!ragResult.ast_ref) return;
        
        // Use globally stored RAG visualization data or fall back to dashboard data
        let analysisData = (window as any).ragVisualizationData;
        
        if (!analysisData) {
            const dashboard = (window as any).prismDashboard;
            analysisData = dashboard?.getAnalysisData();
        }
        
        if (!analysisData) return;
        
        // Find matching nodes for this specific result
        const matches = this.astMapper.matchRAGResultsToNodes([ragResult], analysisData);
        
        // Create secondary highlight targets
        const secondaryTargets: HighlightTarget[] = [];
        matches.forEach(targets => {
            targets.forEach(target => {
                secondaryTargets.push({
                    ...target, 
                    highlightStyle: 'secondary' as any
                });
            });
        });
        
        // Combine persistent and secondary highlights
        const allTargets = [...this.currentPersistentTargets, ...secondaryTargets];
        
        // Apply combined highlights
        const inheritanceTargets = allTargets.filter(t => t.type === 'inheritance');
        const callGraphTargets = allTargets.filter(t => t.type === 'callgraph');
        
        if (inheritanceTargets.length > 0) {
            D3Visualizations.highlightInheritanceNodes('inheritance-visualization', inheritanceTargets);
        }
        
        if (callGraphTargets.length > 0) {
            D3Visualizations.highlightCallGraphNodes('callgraph-visualization', callGraphTargets);
        }
        
        // Clear secondary highlight after delay
        if (this.hoverTimeoutId) {
            clearTimeout(this.hoverTimeoutId);
        }
        
        this.hoverTimeoutId = window.setTimeout(() => {
            this.removeSecondaryHighlight();
            this.hoverTimeoutId = null;
        }, 1500); // Shorter delay for better UX
    }
    
    private removeSecondaryHighlight(): void {
        if (this.hoverTimeoutId) {
            clearTimeout(this.hoverTimeoutId);
            this.hoverTimeoutId = null;
        }
        
        // Restore only persistent highlights
        this.restorePersistentHighlights();
    }
    
    private restorePersistentHighlights(): void {
        // Clear all highlights first
        D3Visualizations.clearHighlights('inheritance-visualization');
        D3Visualizations.clearHighlights('callgraph-visualization');
        
        // Restore persistent highlights if any exist
        if (this.currentPersistentTargets.length > 0) {
            const inheritanceTargets = this.currentPersistentTargets.filter(t => t.type === 'inheritance');
            const callGraphTargets = this.currentPersistentTargets.filter(t => t.type === 'callgraph');
            
            if (inheritanceTargets.length > 0) {
                D3Visualizations.highlightInheritanceNodes('inheritance-visualization', inheritanceTargets);
            }
            
            if (callGraphTargets.length > 0) {
                D3Visualizations.highlightCallGraphNodes('callgraph-visualization', callGraphTargets);
            }
        }
    }
    
    private applyRAGPathHighlighting(analysisData?: any): void {
        // Try multiple sources for RAG path data
        let ragPathData = null;
        
        // 1. Check provided analysis data first
        if (analysisData?.callgraph?.rag_paths) {
            ragPathData = analysisData.callgraph.rag_paths;
        }
        
        // 2. Check globally stored RAG visualization data
        if (!ragPathData) {
            const globalRagData = (window as any).ragVisualizationData;
            if (globalRagData?.callgraph?.rag_paths) {
                ragPathData = globalRagData.callgraph.rag_paths;
            }
        }
        
        // 3. Check dashboard data as fallback
        if (!ragPathData) {
            const dashboard = (window as any).prismDashboard;
            const dashboardData = dashboard?.getAnalysisData();
            if (dashboardData?.callgraph?.rag_paths) {
                ragPathData = dashboardData.callgraph.rag_paths;
            }
        }
        
        // Apply RAG path highlighting if we found the data
        if (ragPathData) {
            D3Visualizations.highlightRAGPaths('callgraph-visualization', ragPathData);
            console.log('Applied RAG path highlighting with data:', ragPathData);
        } else {
            console.debug('No RAG path data found for highlighting');
        }
    }
} 