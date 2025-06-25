# AST Coordinate System for Visualization Highlighting

## 📋 **Feature Overview**
Implement a universal AST-based coordinate system that enables precise highlighting of nodes in inheritance and function call graph visualizations when corresponding RAG results are found. This will create seamless cross-panel coordination between semantic search results and code structure visualizations.

## 🎯 **Goals**
- **Universal coordinate system**: Use AST node references as the single source of truth for all data mapping
- **Cross-panel highlighting**: Highlight visualization nodes when corresponding RAG results are displayed
- **Precise targeting**: Eliminate ambiguity in node matching through exact AST coordinates
- **Scalable foundation**: Build system that works for single files and eventually entire codebases
- **Enhanced user experience**: Provide visual connections between semantic search and code structure
- **Hierarchical awareness**: Support highlighting parent nodes when child elements match RAG results

## 🔧 **Technical Requirements**

### **Phase 1 - AST Coordinate Foundation**
- [ ] **Standardized AST reference format**: Create consistent coordinate structure across all API endpoints
- [ ] **Backend AST enhancement**: Add AST references to RAG, inheritance, and call graph responses
- [ ] **Frontend coordinate storage**: Store AST coordinates in all visualization node data
- [ ] **Coordinate matching logic**: Implement AST-based matching between RAG results and visualization nodes
- [ ] **Basic highlighting system**: Visual highlighting of matched nodes in D3 visualizations

### **Phase 2 - Advanced Highlighting Features**
- 🔮 **Multi-result highlighting**: Support highlighting multiple nodes for complex queries
- 🔮 **Hierarchical highlighting**: Highlight parent classes when methods match RAG results
- 🔮 **Interactive coordination**: Click RAG result → zoom to highlighted node
- 🔮 **Confidence-based styling**: Different highlight intensities based on RAG confidence scores
- 🔮 **Animation system**: Smooth transitions and attention-drawing effects

## 🏗️ **Implementation Plan**

### **1. AST Coordinate System Design**

#### **A. Standardized AST Reference Structure**
```python
# Backend coordinate format
def create_ast_reference(node):
    """Create standardized AST coordinate for any node"""
    return {
        'node_id': f"{node.__class__.__name__}_{node.lineno}_{getattr(node, 'col_offset', 0)}",
        'line': node.lineno,
        'col': getattr(node, 'col_offset', None),
        'end_line': getattr(node, 'end_lineno', node.lineno),
        'end_col': getattr(node, 'end_col_offset', None),
        'node_type': node.__class__.__name__,
        'node_path': get_node_path(node)  # ['Module', 'ClassDef', 'FunctionDef']
    }

def get_node_path(node):
    """Generate hierarchical path for AST node"""
    # Implementation to traverse AST and build path
    pass
```

#### **B. Backend API Enhancements**
```python
# Enhanced RAG endpoint response
{
    'success': True,
    'results': [
        {
            'snippet': 'def my_function():...',
            'score': 0.85,
            'type': 'function',
            'name': 'my_function',
            'line_start': 10,
            'line_end': 15,
            'ast_ref': {
                'node_id': 'FunctionDef_10_0',
                'line': 10,
                'col': 0,
                'end_line': 15,
                'end_col': 20,
                'node_type': 'FunctionDef',
                'node_path': ['Module', 'FunctionDef']
            }
        }
    ]
}

# Enhanced inheritance endpoint response  
{
    'success': True,
    'classes': [
        {
            'name': 'MyClass',
            'bases': ['BaseClass'],
            'methods': [
                {
                    'name': 'my_method',
                    'params': ['self', 'param1'],
                    'ast_ref': {
                        'node_id': 'FunctionDef_25_4',
                        'line': 25,
                        'col': 4,
                        'node_type': 'FunctionDef',
                        'node_path': ['Module', 'ClassDef', 'FunctionDef']
                    }
                }
            ],
            'ast_ref': {
                'node_id': 'ClassDef_20_0',
                'line': 20,
                'col': 0,
                'node_type': 'ClassDef', 
                'node_path': ['Module', 'ClassDef']
            }
        }
    ]
}
```

### **2. Frontend Coordinate Integration**

#### **A. Visualization Node Enhancement**
```typescript
// Enhanced node interfaces with AST coordinates
interface ASTReference {
    node_id: string;
    line: number;
    col?: number;
    end_line: number;
    end_col?: number;
    node_type: string;
    node_path: string[];
}

interface VisualizationNode {
    name: string;
    // ... existing properties
    ast_ref: ASTReference;
}

interface CallGraphNode extends d3.SimulationNodeDatum {
    id: string;
    name: string;
    calls: string[];
    called_by: string[];
    group: string;
    ast_ref: ASTReference;  // ← Add AST coordinate
}

interface ClassNode {
    name: string;
    bases: string[];
    methods: {
        name: string;
        params: string[];
        ast_ref: ASTReference;  // ← Add AST coordinate
    }[];
    ast_ref: ASTReference;  // ← Add AST coordinate
}
```

#### **B. AST Coordinate Matching System**
```typescript
class ASTCoordinateMapper {
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

interface HighlightTarget {
    type: 'inheritance' | 'callgraph';
    nodeId: string;
    highlightStyle: 'direct' | 'hierarchical';
}
```

### **3. D3 Visualization Highlighting System**

#### **A. Enhanced D3 Visualizations with Highlighting**
```typescript
// Enhanced D3Visualizations class with highlighting support
export class D3Visualizations {
    /**
     * Highlight nodes in inheritance visualization based on AST coordinates
     */
    public static highlightInheritanceNodes(
        containerId: string, 
        highlightTargets: HighlightTarget[]
    ): void {
        const container = d3.select(`#${containerId}`);
        
        // Clear previous highlights
        container.selectAll('.node').classed('highlighted direct-match hierarchical-match', false);
        
        // Apply new highlights
        highlightTargets.forEach(target => {
            const selector = `[data-ast-id="${target.nodeId}"]`;
            const nodes = container.selectAll(selector);
            
            nodes.classed('highlighted', true)
                  .classed(`${target.highlightStyle}-match`, true);
            
            // Add glow effect for direct matches
            if (target.highlightStyle === 'direct') {
                nodes.select('rect, circle, polygon')
                     .style('filter', 'drop-shadow(0 0 8px #00ff88)');
            }
            
            // Add subtle highlight for hierarchical matches
            if (target.highlightStyle === 'hierarchical') {
                nodes.select('rect, circle, polygon')
                     .style('stroke', '#ffaa00')
                     .style('stroke-width', '3px');
            }
        });
    }
    
    /**
     * Highlight nodes in call graph visualization
     */
    public static highlightCallGraphNodes(
        containerId: string,
        highlightTargets: HighlightTarget[]
    ): void {
        const container = d3.select(`#${containerId}`);
        
        // Clear previous highlights
        container.selectAll('.node circle').style('filter', null);
        
        // Apply highlights
        highlightTargets.forEach(target => {
            const selector = `[data-ast-id="${target.nodeId}"]`;
            const nodes = container.selectAll(selector);
            
            if (target.highlightStyle === 'direct') {
                nodes.select('circle')
                     .style('filter', 'drop-shadow(0 0 10px #00ff88)')
                     .style('stroke', '#00ff88')
                     .style('stroke-width', '3px');
            }
        });
    }
    
    /**
     * Update node creation to include AST data attributes
     */
    private static enhanceNodesWithASTData(nodes: any, data: any[]): void {
        nodes.attr('data-ast-id', (d: any) => d.ast_ref?.node_id)
             .attr('data-ast-line', (d: any) => d.ast_ref?.line)
             .attr('data-ast-type', (d: any) => d.ast_ref?.node_type);
    }
}
```

#### **B. Cross-Panel Coordination System**
```typescript
class VisualizationCoordinator {
    private astMapper: ASTCoordinateMapper;
    private currentHighlights: Map<string, HighlightTarget[]> = new Map();
    
    constructor() {
        this.astMapper = new ASTCoordinateMapper();
        this.setupRAGResultListeners();
    }
    
    private setupRAGResultListeners(): void {
        // Listen for RAG results display
        document.addEventListener('rag-results-displayed', (event: any) => {
            this.highlightMatchingNodes(event.detail.results);
        });
        
        // Listen for RAG results cleared
        document.addEventListener('rag-results-cleared', () => {
            this.clearAllHighlights();
        });
        
        // Listen for RAG result hover
        document.addEventListener('rag-result-hover', (event: any) => {
            this.temporaryHighlight(event.detail.result);
        });
    }
    
    public highlightMatchingNodes(ragResults: RAGResult[]): void {
        const dashboard = (window as any).prismDashboard;
        const analysisData = dashboard?.getAnalysisData();
        
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
        
        // Apply highlights to visualizations
        if (inheritanceTargets.length > 0) {
            D3Visualizations.highlightInheritanceNodes('inheritance-visualization', inheritanceTargets);
        }
        
        if (callGraphTargets.length > 0) {
            D3Visualizations.highlightCallGraphNodes('callgraph-visualization', callGraphTargets);
        }
        
        // Store current highlights
        this.currentHighlights = matches;
    }
    
    public clearAllHighlights(): void {
        D3Visualizations.clearHighlights('inheritance-visualization');
        D3Visualizations.clearHighlights('callgraph-visualization');
        this.currentHighlights.clear();
    }
    
    private temporaryHighlight(ragResult: RAGResult): void {
        // Implement temporary highlight on hover
        // Clear after a delay or on mouse leave
    }
}
```

### **4. Enhanced RAG Interface Integration**

#### **A. RAG Results with Highlighting Events**
```typescript
// Enhanced RAG interface to emit highlighting events
export class RAGQueryInterface {
    private displayResults(results: RAGResult[], query: string): void {
        // ... existing display logic ...
        
        // Emit event for visualization coordination
        const event = new CustomEvent('rag-results-displayed', {
            detail: { results, query }
        });
        document.dispatchEvent(event);
        
        // Add hover listeners to results
        this.addResultHoverListeners(results);
    }
    
    private addResultHoverListeners(results: RAGResult[]): void {
        const resultItems = document.querySelectorAll('.result-item');
        
        resultItems.forEach((item, index) => {
            item.addEventListener('mouseenter', () => {
                const event = new CustomEvent('rag-result-hover', {
                    detail: { result: results[index], action: 'enter' }
                });
                document.dispatchEvent(event);
            });
            
            item.addEventListener('mouseleave', () => {
                const event = new CustomEvent('rag-result-hover', {
                    detail: { result: results[index], action: 'leave' }
                });
                document.dispatchEvent(event);
            });
        });
    }
    
    public clearResults(): void {
        // ... existing clear logic ...
        
        // Emit clear event
        const event = new CustomEvent('rag-results-cleared');
        document.dispatchEvent(event);
    }
}
```

## ✅ **Phase 1 Technical Decisions**

### **1. AST Coordinate Format: Comprehensive Node References**
- ✅ **Unique node IDs**: Combination of node type, line, and column for uniqueness
- ✅ **Hierarchical paths**: Full AST path for context-aware matching
- ✅ **Range information**: Start and end coordinates for precise targeting
- ✅ **Type awareness**: Node type information for intelligent matching
- ✅ **Extensibility**: Format supports future multi-file scenarios

### **2. Matching Strategy: Multi-Level Approach**
- ✅ **Direct matching**: Exact AST node ID matches
- ✅ **Hierarchical matching**: Parent-child relationship awareness
- ✅ **Type-filtered matching**: Only match compatible node types
- ✅ **Fuzzy fallbacks**: Line-based matching when node IDs don't align
- ✅ **Confidence weighting**: Prefer exact matches over fuzzy matches

### **3. Highlighting System: Multi-Modal Visual Feedback**
- ✅ **Direct match highlighting**: Strong visual indicators (glow, color change)
- ✅ **Hierarchical highlighting**: Subtle indicators for parent nodes
- ✅ **Interactive highlights**: Hover effects and click responses
- ✅ **Multi-result support**: Handle multiple highlighted nodes simultaneously
- ✅ **Animation system**: Smooth transitions and attention-drawing effects

### **4. Event-Driven Coordination: Loose Coupling**
- ✅ **Custom events**: RAG interface emits highlighting events
- ✅ **Event listeners**: Visualization coordinator responds to events
- ✅ **Decoupled components**: No direct dependencies between panels
- ✅ **Extensible system**: Easy to add new coordination behaviors
- ✅ **Performance optimized**: Debounced events for smooth interaction

## 📝 **Acceptance Criteria**
- [ ] All API endpoints return standardized AST coordinate references
- [ ] RAG results can be precisely mapped to visualization nodes using AST coordinates
- [ ] Inheritance graph highlights classes and methods matching RAG results
- [ ] Call graph highlights functions matching RAG results
- [ ] Hierarchical highlighting: parent classes highlighted when methods match
- [ ] Multiple RAG results highlight multiple nodes simultaneously
- [ ] Hover over RAG result temporarily highlights corresponding nodes
- [ ] Clear highlighting when RAG results are cleared
- [ ] Visual distinction between direct matches and hierarchical matches
- [ ] System performs smoothly with typical code analysis workloads
- [ ] AST coordinate system is extensible for future multi-file support

## 🧪 **Testing Strategy**
- **Unit testing**: AST coordinate generation and matching logic
- **Integration testing**: End-to-end RAG query → visualization highlighting
- **Performance testing**: Large code files with many RAG results
- **Visual testing**: Highlighting appearance and animation smoothness
- **Edge case testing**: Malformed AST data, missing coordinates, multiple matches
- **Cross-browser testing**: Highlighting behavior consistency across browsers

## 📦 **Files to Create/Modify**

### **Backend Files**
- `backend/app.py` - Add AST coordinate generation to all endpoints
- `backend/ast_coordinates.py` - New module for AST coordinate utilities

### **Frontend Files**
- `frontend/src/ast-coordinator.ts` - New AST coordinate mapping system
- `frontend/src/d3-visualizations.ts` - Add highlighting methods
- `frontend/src/rag-interface.ts` - Add event emission for highlighting
- `frontend/src/dashboard.ts` - Initialize coordination system
- `frontend/public/style.css` - Add highlighting styles

### **Documentation**
- `docs/ast-coordinate-spec.md` - AST coordinate format specification
- `README.md` - Update with new highlighting feature

## 🚀 **Implementation Timeline**
1. **Week 1**: Backend AST coordinate system implementation
2. **Week 2**: Frontend AST coordinate storage and matching logic
3. **Week 3**: D3 visualization highlighting system
4. **Week 4**: Cross-panel event coordination system
5. **Week 5**: RAG interface integration and event emission
6. **Week 6**: Testing, refinement, and performance optimization

---

**Dependencies**: Existing D3 visualizations, RAG query system, AST parsing backend
**Breaking Changes**: API response format changes (additive - shouldn't break existing functionality)
**Performance Impact**: Minimal - AST coordinates add ~100-200 bytes per node
