# RAG Query Call Graph Path Highlighting

## Overview

Enhance the RAG query functionality to identify and highlight execution paths between nodes that correspond to RAG query results in the call graph visualization. This will help users understand the relationships and flow between code snippets that are semantically related to their query.

## Current State

- RAG queries return relevant code snippets with AST coordinates
- Call graph visualization shows function relationships
- RAG results include visualization data with callgraph information
- AST coordinate system enables cross-visualization node matching

## Feature Requirements

### Backend Implementation

#### 1. Path Discovery Algorithm
- **Location**: `backend/app.py` - new function `find_paths_between_rag_nodes()`
- **Input**: List of RAG result nodes (functions/methods from RAG results)
- **Algorithm**: 
  - Build a directed graph from the call graph data
  - For each pair of RAG result nodes, find the shortest path(s) using BFS/Dijkstra
  - Handle both direct calls and transitive relationships
  - Support both caller→callee and callee→caller path directions
- **Output**: List of path objects containing:
  ```python
  {
    'from_node': 'source_function_ast_ref',
    'to_node': 'target_function_ast_ref', 
    'path_nodes': ['intermediate_node_1', 'intermediate_node_2', ...],
    'path_edges': [
      {'from': 'node_a', 'to': 'node_b', 'call_line': 123},
      ...
    ],
    'path_length': 3,
    'path_type': 'caller_to_callee' | 'bidirectional'
  }
  ```

#### 2. Node Matching Enhancement  
- **Location**: `backend/app.py` - enhance `rag_query()` endpoint
- **Functionality**:
  - Match RAG result AST coordinates to call graph function nodes
  - Filter call graph to only include nodes that have AST references
  - Create mapping between RAG results and their corresponding call graph nodes

#### 3. API Response Enhancement
- **Endpoint**: `/api/rag-query` and `/api/rag-query-codebase`
- **New Response Fields**:
  ```json
  {
    "results": [...],
    "visualization_data": {
      "inheritance": {...},
      "callgraph": {
        "functions": [...],
        "calls": [...],
        "rag_paths": {
          "matched_nodes": ["ast_ref_1", "ast_ref_2", ...],
          "paths": [
            {
              "from_node": "ast_ref_1",
              "to_node": "ast_ref_2", 
              "path_nodes": ["ast_ref_intermediate"],
              "path_edges": [...],
              "path_length": 2
            }
          ]
        }
      }
    }
  }
  ```

### Frontend Implementation

#### 1. Path Data Processing
- **Location**: `frontend/src/hooks/useRAGQuery.ts`
- **Functionality**: Process path data from API response and prepare for visualization

#### 2. D3 Visualization Enhancement
- **Location**: `frontend/src/components/visualizations/D3Visualization.tsx`
- **Call Graph Mode Enhancements**:

##### Node Styling States:
```typescript
enum NodeHighlightState {
  RAG_RESULT = 'rag-result',           // Primary RAG result nodes
  PATH_INTERMEDIATE = 'path-intermediate', // Nodes in path between RAG results  
  NORMAL = 'normal',                   // Default nodes
  DIMMED = 'dimmed'                    // Non-relevant nodes (darkened)
}
```

##### Edge Styling States:
```typescript
enum EdgeHighlightState {
  RAG_PATH = 'rag-path',              // Edges that are part of RAG result paths
  NORMAL = 'normal',                  // Default edges
  DIMMED = 'dimmed'                   // Non-relevant edges
}
```

#### 3. Styling Specifications

##### Node Styles:
```css
/* Primary RAG result nodes - most prominent */
.node.rag-result {
  fill: #ff6b6b;           /* Bright red/orange */
  stroke: #d63031;         /* Darker border */
  stroke-width: 3px;
  opacity: 1.0;
}

/* Intermediate path nodes - semi-highlighted */
.node.path-intermediate {
  fill: #fdcb6e;           /* Light orange/yellow */
  stroke: #e17055;         /* Orange border */
  stroke-width: 2px;
  opacity: 0.9;
}

/* Normal nodes - default appearance */
.node.normal {
  fill: #74b9ff;           /* Default blue */
  stroke: #0984e3;
  stroke-width: 1px;
  opacity: 0.8;
}

/* Dimmed nodes - de-emphasized */
.node.dimmed {
  fill: #b2bec3;           /* Light gray */
  stroke: #636e72;
  stroke-width: 1px;
  opacity: 0.3;
}
```

##### Edge Styles:
```css
/* RAG path edges - distinct color */
.edge.rag-path {
  stroke: #e17055;         /* Orange to match intermediate nodes */
  stroke-width: 3px;
  opacity: 1.0;
  marker-end: url(#rag-path-arrowhead);
}

/* Normal edges */
.edge.normal {
  stroke: #636e72;         /* Default gray */
  stroke-width: 1.5px;
  opacity: 0.6;
}

/* Dimmed edges */
.edge.dimmed {
  stroke: #b2bec3;         /* Light gray */
  stroke-width: 1px;
  opacity: 0.2;
}
```

#### 4. Interaction Enhancements
- **Path tooltips**: Show path information when hovering over path edges
- **Path animation**: Optional subtle animation along path edges to show flow direction
- **Path filtering**: Toggle to show/hide different path types (direct vs transitive)

### Implementation Steps

#### Phase 1: Backend Path Discovery
1. Implement `find_paths_between_rag_nodes()` function
2. Add path discovery to RAG query endpoints
3. Test path finding with various code samples

#### Phase 2: Frontend Path Visualization  
1. Update RAG query hooks to handle path data
2. Implement node/edge highlighting logic in D3Visualization
3. Add CSS styles for different highlight states

#### Phase 3: Enhanced Interactions
1. Add path tooltips and hover effects  
2. Implement path filtering controls
3. Add optional path flow animations

#### Phase 4: Testing & Refinement
1. Test with complex codebases with multiple RAG results
2. Optimize performance for large call graphs
3. Refine styling based on user feedback

## Success Criteria

- [ ] RAG queries successfully identify corresponding call graph nodes
- [ ] Path finding algorithm discovers meaningful relationships between RAG results
- [ ] Call graph visualization clearly highlights RAG result paths with proper styling
- [ ] Path edges are visually distinct and show flow between related code
- [ ] Intermediate nodes are appropriately semi-highlighted
- [ ] Performance remains acceptable for codebases with 100+ functions
- [ ] User can easily understand code relationships through visual path highlighting

## Technical Considerations

### Performance
- Limit path discovery to reasonable depth (e.g., max 5 hops)
- Cache path calculations for repeated queries
- Consider path complexity limits for large codebases

### Edge Cases
- Handle circular dependencies in call graphs
- Support cases where RAG results have no call graph representation
- Handle disconnected components in call graphs
- Manage multiple paths between the same nodes

### Accessibility
- Ensure path highlighting doesn't rely solely on color
- Provide alternative text descriptions for paths
- Support keyboard navigation of highlighted paths 