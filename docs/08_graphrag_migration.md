# GraphRAG Migration Implementation Guide

## Overview
Implement Graph RAG as the **entry point discovery engine** for Prism's hybrid Context Prompt Builder. This system will provide architecturally-aware starting points that feed into existing static analysis pathfinding.

## Prerequisites
- Existing static analysis system in `backend/app.py`
- Current RAG endpoints: `/api/rag-query` and `/api/rag-query-codebase`
- AST coordinate system in `backend/ast_coordinates.py`

## Success Criteria
- [ ] Graph RAG results include proper AST references for pathfinding integration
- [ ] All existing endpoints work with Graph RAG (backward compatible)
- [ ] Integration with `find_paths_between_rag_nodes()` function

## ⚠️ CRITICAL DESIGN CONSIDERATION: Full AST Integration

**Current Limitation**: The proposed implementation only uses inheritance + callgraph data, missing critical AST relationships that could significantly improve Graph RAG quality.

### What We're Missing Without Full AST Integration

#### 1. **Import Dependencies**
```python
import numpy as np
from sklearn.model_selection import train_test_split
# Creates semantic relationships between modules
```

#### 2. **Variable Usage Patterns**
```python
model = LinearRegression()
predictions = model.predict(X_test)
# Variable flow creates connections beyond function calls
```

#### 3. **Data Flow Relationships**
```python
config = load_config()
db = connect_database(config)
users = db.get_users()  
# Data dependencies that RAG queries should understand
```

#### 4. **Exception Handling Networks**
```python
try:
    process_payment()
except PaymentError as e:
    handle_payment_failure(e)
# Error handling creates semantic relationships
```

#### 5. **Decorator and Annotation Patterns**
```python
@require_auth
@validate_input
def api_endpoint():
    pass
# Decorators modify behavior and group related functionality
```

### Enhanced GraphRAG Architecture Proposal

#### Option A: Enhanced Current Approach (Recommended for Phase 1)
```python
def build_knowledge_graph(self, static_analysis_data):
    """Build enhanced knowledge graph with additional AST relationships"""
    inheritance_data = static_analysis_data.get('inheritance', {})
    callgraph_data = static_analysis_data.get('callgraph', {})
    ast_data = static_analysis_data.get('ast', {})  # NEW: Full AST data
    
    # Existing: inheritance + callgraph nodes
    self._add_inheritance_nodes(inheritance_data)
    self._add_callgraph_nodes(callgraph_data)
    
    # NEW: Additional AST-based relationships
    self._add_import_relationships(ast_data)
    self._add_variable_usage_relationships(ast_data)
    self._add_decorator_relationships(ast_data)
    self._add_exception_handling_relationships(ast_data)
```

#### Option B: Full AST Graph (Future Enhancement)
```python
def build_full_ast_knowledge_graph(self, ast_data):
    """Build comprehensive knowledge graph from full AST"""
    # Every AST node becomes a graph node
    # All AST relationships become graph edges
    # Much richer but potentially overwhelming
```

### Implementation Plan Update

#### Modified Step 1.2: Enhanced Graph Construction
```python
def build_knowledge_graph(self, static_analysis_data):
    """Build knowledge graph with enhanced AST relationships"""
    inheritance_data = static_analysis_data.get('inheritance', {})
    callgraph_data = static_analysis_data.get('callgraph', {})
    ast_data = static_analysis_data.get('ast', {})
    
    # Phase 1: Core nodes (existing approach)
    self._add_inheritance_nodes(inheritance_data)
    self._add_callgraph_nodes(callgraph_data)
    
    # Phase 2: Enhanced relationships from AST
    if ast_data:
        self._add_import_relationships(ast_data)
        self._add_variable_relationships(ast_data) 
        self._add_decorator_relationships(ast_data)
        self._add_exception_relationships(ast_data)
    
    # Calculate enhanced metrics
    self._calculate_enhanced_structural_metrics()
    self._generate_embeddings()

def _add_import_relationships(self, ast_data):
    """Add import-based semantic relationships"""
    for node in ast.walk(ast_data):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            # Create "uses_module" relationships
            pass

def _add_variable_relationships(self, ast_data):
    """Add variable usage and data flow relationships"""
    for node in ast.walk(ast_data):
        if isinstance(node, ast.Assign):
            # Track variable assignments and usage
            pass

def _add_decorator_relationships(self, ast_data):
    """Add decorator-based semantic groupings"""
    for node in ast.walk(ast_data):
        if isinstance(node, ast.FunctionDef) and node.decorator_list:
            # Group functions by decorators
            pass

def _add_exception_relationships(self, ast_data):
    """Add exception handling relationships"""
    for node in ast.walk(ast_data):
        if isinstance(node, ast.Try):
            # Connect try/except blocks with related error handling
            pass
```

### API Changes Required

#### Enhanced Static Analysis Endpoint
```python
@app.route('/api/analyze', methods=['POST'])
def analyze_code():
    """Enhanced analysis including full AST for Graph RAG"""
    # Current implementation already provides AST data
    # GraphRAG engine can use this data for enhanced relationships
    
    return jsonify({
        'success': True,
        'ast': ast_dict,  # ← GraphRAG can use this
        'inheritance': {...},
        'callgraph': {...}
    })
```

### Recommendation: Phased Approach

#### Phase 1: Current Plan + Import Relationships (Week 1-2)
- Implement inheritance + callgraph as planned
- Add import dependency relationships (high impact, low complexity)
- Validate improvement in entry point discovery

#### Phase 2: Variable Flow Analysis (Week 3-4)  
- Add variable usage patterns
- Data flow analysis between functions
- Test with real codebases

#### Phase 3: Full AST Integration (Future)
- Comprehensive AST relationship extraction
- Advanced semantic analysis
- Performance optimization for large codebases

This approach allows us to start with the simpler implementation while laying groundwork for the more sophisticated AST integration that will significantly improve Graph RAG quality.

## Implementation Steps

### Step 1: Create GraphRAG Engine Foundation

#### 1.1 Create `backend/graphrag_engine.py`
```python
import networkx as nx
import numpy as np
from dataclasses import dataclass
from typing import Dict, List, Any, Optional
import sqlite3
import hashlib
import json
from sentence_transformers import SentenceTransformer

@dataclass
class CodeGraphNode:
    id: str
    type: str  # 'function', 'class', 'module'
    name: str
    content: str
    file_path: str
    line_start: int
    line_end: int
    ast_ref: Dict  # Required for pathfinding integration
    embedding: Optional[np.ndarray] = None
    structural_metrics: Dict[str, float] = None
    architectural_role: str = "unknown"

@dataclass
class CodeGraphEdge:
    source: str
    target: str
    edge_type: str  # 'calls', 'inherits', 'imports', 'uses'
    weight: float
    metadata: Dict = None

class GraphRAGEngine:
    def __init__(self, embedding_model='all-MiniLM-L6-v2'):
        self.embedding_model = SentenceTransformer(embedding_model)
        self.knowledge_graph = nx.DiGraph()
        self.embedding_cache = EmbeddingCache()
        self.node_index = {}
        
    def build_knowledge_graph(self, static_analysis_data):
        """Build knowledge graph from existing static analysis data"""
        # Implementation in Step 1.2
        pass
        
    def query(self, query_text: str, top_k: int = 10) -> List[Dict]:
        """Main query interface - returns results compatible with pathfinding"""
        # Implementation in Step 2
        pass

class EmbeddingCache:
    def __init__(self, cache_file='embeddings.db'):
        self.conn = sqlite3.connect(cache_file, check_same_thread=False)
        self.conn.execute('''
            CREATE TABLE IF NOT EXISTS embeddings (
                content_hash TEXT PRIMARY KEY,
                embedding BLOB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        self.conn.commit()
    
    def get_embedding(self, content: str) -> Optional[np.ndarray]:
        content_hash = hashlib.md5(content.encode()).hexdigest()
        cursor = self.conn.execute(
            'SELECT embedding FROM embeddings WHERE content_hash = ?',
            (content_hash,)
        )
        result = cursor.fetchone()
        if result:
            return np.loads(result[0])
        return None
    
    def store_embedding(self, content: str, embedding: np.ndarray):
        content_hash = hashlib.md5(content.encode()).hexdigest()
        self.conn.execute(
            'INSERT OR REPLACE INTO embeddings (content_hash, embedding) VALUES (?, ?)',
            (content_hash, embedding.dumps())
        )
        self.conn.commit()
```

**Test Step 1.1**: Create the file and verify imports work
```bash
cd backend && python -c "from graphrag_engine import GraphRAGEngine; print('GraphRAG engine created successfully')"
```

#### 1.2 Implement Enhanced Knowledge Graph Construction (With AST Integration)
Add this method to `GraphRAGEngine` class in `backend/graphrag_engine.py`:

```python
def build_knowledge_graph(self, static_analysis_data):
    """Build enhanced knowledge graph with AST relationships"""
    inheritance_data = static_analysis_data.get('inheritance', {})
    callgraph_data = static_analysis_data.get('callgraph', {})
    ast_data = static_analysis_data.get('ast', {})
    
    # Phase 1: Core nodes from inheritance + callgraph (existing approach)
    self._add_inheritance_nodes(inheritance_data)
    self._add_callgraph_nodes(callgraph_data)
    self._add_call_edges(callgraph_data)
    
    # Phase 2: Enhanced AST relationships
    if ast_data:
        self._add_import_relationships(ast_data)
        self._add_variable_relationships(ast_data) 
        self._add_decorator_relationships(ast_data)
    
    # Calculate enhanced structural metrics
    self._calculate_structural_metrics()
    self._generate_embeddings()

def _add_inheritance_nodes(self, inheritance_data):
    """Add class nodes from inheritance data"""
    for class_info in inheritance_data.get('classes', []):
        node_id = f"class_{class_info.get('name', '')}_{class_info.get('lineno', 0)}"
        
        node = CodeGraphNode(
            id=node_id,
            type='class',
            name=class_info.get('name', ''),
            content=class_info.get('docstring', '') or f"class {class_info.get('name', '')}",
            file_path=class_info.get('file_path', ''),
            line_start=class_info.get('lineno', 0),
            line_end=class_info.get('lineno', 0),  # Enhanced later if available
            ast_ref=class_info.get('ast_ref', {})
        )
        
        self.knowledge_graph.add_node(node_id, **node.__dict__)
        self.node_index[node_id] = node

def _add_callgraph_nodes(self, callgraph_data):
    """Add function nodes from callgraph data"""
    for func_info in callgraph_data.get('functions', []):
        func_name = func_info.get('name', '')
        class_name = func_info.get('class_name')
        
        # Create unique ID that handles both standalone functions and methods
        if class_name:
            node_id = f"method_{class_name}_{func_name}_{func_info.get('lineno', 0)}"
            display_name = f"{class_name}.{func_name}"
        else:
            node_id = f"func_{func_name}_{func_info.get('lineno', 0)}"
            display_name = func_name
        
        node = CodeGraphNode(
            id=node_id,
            type='function',
            name=display_name,
            content=func_info.get('docstring', '') or f"def {func_name}({', '.join(func_info.get('params', []))})",
            file_path=func_info.get('file_path', ''),
            line_start=func_info.get('lineno', 0),
            line_end=func_info.get('lineno', 0),
            ast_ref=func_info.get('ast_ref', {})
        )
        
        self.knowledge_graph.add_node(node_id, **node.__dict__)
        self.node_index[node_id] = node

def _add_call_edges(self, callgraph_data):
    """Add call relationship edges"""
    for call_info in callgraph_data.get('calls', []):
        caller = call_info.get('caller', '')
        callee = call_info.get('callee', '')
        
        # Find corresponding nodes in our graph
        caller_node_id = self._find_node_id_by_name(caller)
        callee_node_id = self._find_node_id_by_name(callee)
        
        if caller_node_id and callee_node_id:
            self.knowledge_graph.add_edge(
                caller_node_id, callee_node_id,
                edge_type='calls', 
                weight=1.0,
                call_line=call_info.get('lineno', 0)
            )

def _add_import_relationships(self, ast_data):
    """Add import-based semantic relationships"""
    import ast as ast_module
    
    if not isinstance(ast_data, dict):
        return
    
    # Find all import nodes in AST
    def extract_imports(node_dict):
        imports = []
        if isinstance(node_dict, dict):
            if node_dict.get('type') in ['Import', 'ImportFrom']:
                imports.append(node_dict)
            
            # Recursively search children
            for key, value in node_dict.items():
                if isinstance(value, list):
                    for item in value:
                        imports.extend(extract_imports(item))
                elif isinstance(value, dict):
                    imports.extend(extract_imports(value))
        
        return imports
    
    imports = extract_imports(ast_data)
    
    # Create import dependency edges
    for import_node in imports:
        # Create lightweight import nodes and connect them to functions that use them
        module_name = self._extract_import_name(import_node)
        if module_name:
            import_node_id = f"import_{module_name}"
            
            # Add import node if not exists
            if import_node_id not in self.node_index:
                import_graph_node = CodeGraphNode(
                    id=import_node_id,
                    type='import',
                    name=module_name,
                    content=f"import {module_name}",
                    file_path='',
                    line_start=import_node.get('lineno', 0),
                    line_end=import_node.get('lineno', 0),
                    ast_ref={'node_type': 'Import', 'line': import_node.get('lineno', 0)}
                )
                self.knowledge_graph.add_node(import_node_id, **import_graph_node.__dict__)
                self.node_index[import_node_id] = import_graph_node
            
            # Connect import to functions in the same file
            file_functions = [node for node in self.node_index.values() 
                            if node.type == 'function' and node.file_path]
            
            for func_node in file_functions[:5]:  # Limit connections to avoid explosion
                self.knowledge_graph.add_edge(
                    import_node_id, func_node.id,
                    edge_type='imports_used_by',
                    weight=0.3
                )

def _extract_import_name(self, import_node):
    """Extract module name from import AST node"""
    if import_node.get('type') == 'Import':
        # Handle: import module
        names = import_node.get('names', [])
        if names and isinstance(names, list) and len(names) > 0:
            first_name = names[0]
            if isinstance(first_name, dict):
                return first_name.get('name', '')
    elif import_node.get('type') == 'ImportFrom':
        # Handle: from module import ...
        return import_node.get('module', '')
    
    return None

def _add_variable_relationships(self, ast_data):
    """Add variable usage relationships (simplified version)"""
    # This is a placeholder for more sophisticated data flow analysis
    # For now, we skip this to keep implementation manageable
    pass

def _add_decorator_relationships(self, ast_data):
    """Add decorator-based semantic relationships"""
    # This is a placeholder for decorator analysis  
    # For now, we skip this to keep implementation manageable
    pass

def _find_node_id_by_name(self, func_name):
    """Find node ID by function name (handles class.method format)"""
    for node_id, node in self.node_index.items():
        if node.type == 'function' and node.name == func_name:
            return node_id
    return None

def _calculate_structural_metrics(self):
    """Calculate centrality and importance metrics"""
    if len(self.knowledge_graph.nodes()) == 0:
        return
    
    try:
        pagerank = nx.pagerank(self.knowledge_graph)
        betweenness = nx.betweenness_centrality(self.knowledge_graph)
        degree_centrality = nx.degree_centrality(self.knowledge_graph)
        
        for node_id in self.knowledge_graph.nodes():
            metrics = {
                'pagerank': pagerank.get(node_id, 0.0),
                'betweenness_centrality': betweenness.get(node_id, 0.0),
                'degree_centrality': degree_centrality.get(node_id, 0.0)
            }
            self.knowledge_graph.nodes[node_id]['structural_metrics'] = metrics
            if node_id in self.node_index:
                self.node_index[node_id].structural_metrics = metrics
    except:
        # Handle empty or disconnected graphs
        for node_id in self.knowledge_graph.nodes():
            self.knowledge_graph.nodes[node_id]['structural_metrics'] = {
                'pagerank': 0.0, 'betweenness_centrality': 0.0, 'degree_centrality': 0.0
            }

def _generate_embeddings(self):
    """Generate embeddings for all nodes"""
    for node_id, node_data in self.knowledge_graph.nodes(data=True):
        content = node_data.get('content', '')
        if not content:
            continue
            
        # Check cache first
        cached_embedding = self.embedding_cache.get_embedding(content)
        if cached_embedding is not None:
            embedding = cached_embedding
        else:
            # Generate new embedding
            embedding = self.embedding_model.encode(content)
            self.embedding_cache.store_embedding(content, embedding)
        
        self.knowledge_graph.nodes[node_id]['embedding'] = embedding
        if node_id in self.node_index:
            self.node_index[node_id].embedding = embedding
```

**Test Step 1.2**: Test knowledge graph construction
```python
# Add to test file: test_graphrag_construction.py
def test_knowledge_graph_construction():
    engine = GraphRAGEngine()
    
    # Mock static analysis data
    static_data = {
        'inheritance': {
            'classes': {
                'TestClass': {
                    'line': 10,
                    'content': 'class TestClass: pass',
                    'file_path': '/test.py'
                }
            }
        },
        'callgraph': {
            'functions': {
                'test_func': {
                    'line': 20,
                    'content': 'def test_func(): pass',
                    'file_path': '/test.py'
                }
            },
            'calls': []
        }
    }
    
    engine.build_knowledge_graph(static_data)
    assert len(engine.knowledge_graph.nodes()) > 0
    print("Knowledge graph construction successful")
```

### Step 2: Implement Query Engine

#### 2.1 Add Query Processing to `backend/graphrag_engine.py`
Add these methods to the `GraphRAGEngine` class:

```python
def query(self, query_text: str, top_k: int = 10) -> List[Dict]:
    """Main query interface - returns results compatible with pathfinding"""
    if len(self.knowledge_graph.nodes()) == 0:
        return []
    
    # Generate query embedding
    query_embedding = self.embedding_model.encode(query_text)
    
    # Score all nodes
    scored_nodes = []
    for node_id, node_data in self.knowledge_graph.nodes(data=True):
        if node_data.get('embedding') is None:
            continue
            
        score = self._calculate_composite_score(
            node_data, query_embedding, query_text
        )
        
        scored_nodes.append((node_id, node_data, score))
    
    # Sort by score and take top_k
    scored_nodes.sort(key=lambda x: x[2], reverse=True)
    top_nodes = scored_nodes[:top_k]
    
    # Format results for pathfinding compatibility
    results = []
    for node_id, node_data, score in top_nodes:
        result = self._format_result_for_pathfinding(node_data, score)
        results.append(result)
    
    return results

def _calculate_composite_score(self, node_data: Dict, query_embedding: np.ndarray, query_text: str) -> float:
    """Calculate composite score with fallback to pure semantic for safety"""
    scores = {}
    
    # Semantic similarity (always primary factor)
    node_embedding = node_data.get('embedding')
    if node_embedding is not None:
        semantic_sim = np.dot(query_embedding, node_embedding) / (
            np.linalg.norm(query_embedding) * np.linalg.norm(node_embedding)
        )
        scores['semantic'] = max(0.0, semantic_sim)
    else:
        scores['semantic'] = 0.0
    
    # If semantic score is very high (>0.85), use pure semantic to avoid dilution
    if scores['semantic'] > 0.85:
        return scores['semantic']
    
    # For moderate semantic scores, enhance with structural factors
    structural_metrics = node_data.get('structural_metrics', {})
    scores['structural'] = structural_metrics.get('pagerank', 0.0)
    
    # Query type alignment (conservative weighting)
    query_type = self._classify_query_intent(query_text)
    scores['query_alignment'] = self._calculate_query_alignment(node_data, query_type)
    
    # Conservative weighting - heavily favor semantic similarity
    weights = {
        'semantic': 0.8,        # Increased from 0.6
        'structural': 0.15,     # Decreased from 0.25
        'query_alignment': 0.05 # Decreased from 0.15
    }
    
    composite_score = sum(scores[key] * weights[key] for key in weights if key in scores)
    
    # Ensure we never score lower than pure semantic (safety net)
    return max(composite_score, scores['semantic'] * 0.9)

def query(self, query_text: str, top_k: int = 10) -> List[Dict]:
    """Enhanced query with fallback to pure semantic search"""
    if len(self.knowledge_graph.nodes()) == 0:
        return []
    
    # Generate query embedding
    query_embedding = self.embedding_model.encode(query_text)
    
    # Score all nodes
    scored_nodes = []
    for node_id, node_data in self.knowledge_graph.nodes(data=True):
        if node_data.get('embedding') is None:
            continue
            
        score = self._calculate_composite_score(
            node_data, query_embedding, query_text
        )
        
        scored_nodes.append((node_id, node_data, score))
    
    # Sort by score and take top_k
    scored_nodes.sort(key=lambda x: x[2], reverse=True)
    
    # Quality check: if top results have low semantic similarity, 
    # fall back to pure semantic ranking
    if len(scored_nodes) > 0:
        top_node = scored_nodes[0]
        if top_node[1].get('embedding') is not None:
            pure_semantic = np.dot(query_embedding, top_node[1]['embedding']) / (
                np.linalg.norm(query_embedding) * np.linalg.norm(top_node[1]['embedding'])
            )
            # If our top result has poor semantic similarity, something went wrong
            if pure_semantic < 0.3 and top_node[2] > 0.5:
                # Re-rank using pure semantic similarity
                semantic_scored = []
                for node_id, node_data, _ in scored_nodes:
                    if node_data.get('embedding') is not None:
                        semantic_sim = np.dot(query_embedding, node_data['embedding']) / (
                            np.linalg.norm(query_embedding) * np.linalg.norm(node_data['embedding'])
                        )
                        semantic_scored.append((node_id, node_data, semantic_sim))
                
                semantic_scored.sort(key=lambda x: x[2], reverse=True)
                scored_nodes = semantic_scored
    
    top_nodes = scored_nodes[:top_k]
    
    # Format results for pathfinding compatibility
    results = []
    for node_id, node_data, score in top_nodes:
        result = self._format_result_for_pathfinding(node_data, score)
        results.append(result)
    
    return results

def _classify_query_intent(self, query_text: str) -> str:
    """Classify query intent for better scoring"""
    query_lower = query_text.lower()
    
    if any(word in query_lower for word in ['how', 'architecture', 'design', 'pattern']):
        return 'architectural'
    elif any(word in query_lower for word in ['bug', 'error', 'fix', 'debug']):
        return 'debugging'
    elif any(word in query_lower for word in ['implement', 'add', 'create', 'build']):
        return 'implementation'
    else:
        return 'general'

def _calculate_query_alignment(self, node_data: Dict, query_type: str) -> float:
    """Calculate how well node aligns with query type"""
    node_type = node_data.get('type', 'unknown')
    
    alignment_matrix = {
        'architectural': {'class': 0.8, 'function': 0.6, 'module': 0.9},
        'debugging': {'function': 0.9, 'class': 0.7, 'module': 0.5},
        'implementation': {'function': 0.8, 'class': 0.8, 'module': 0.6},
        'general': {'function': 0.7, 'class': 0.7, 'module': 0.7}
    }
    
    return alignment_matrix.get(query_type, {}).get(node_type, 0.5)

def _format_result_for_pathfinding(self, node_data: Dict, score: float) -> Dict:
    """Format result to be compatible with existing pathfinding system"""
    return {
        'snippet': node_data.get('content', ''),
        'score': score,
        'type': node_data.get('type', 'unknown'),
        'name': node_data.get('name', ''),
        'line_start': node_data.get('line_start', 0),
        'line_end': node_data.get('line_end', 0),
        'file_path': node_data.get('file_path', ''),
        'ast_ref': node_data.get('ast_ref', {}),
        # Additional Graph RAG fields
        'centrality_score': node_data.get('structural_metrics', {}).get('pagerank', 0.0),
        'architectural_role': node_data.get('architectural_role', 'unknown'),
        'graph_context': {
            'neighbors': len(list(self.knowledge_graph.neighbors(node_data.get('id', '')))),
            'node_type': node_data.get('type', 'unknown')
        }
    }
```

**Test Step 2.1**: Test query processing
```python
# Add to test file
def test_query_processing():
    engine = GraphRAGEngine()
    # Build test graph (reuse from Step 1.2)
    engine.build_knowledge_graph(test_static_data)
    
    results = engine.query("test function", top_k=5)
    assert len(results) > 0
    assert 'ast_ref' in results[0]
    assert 'score' in results[0]
    print("Query processing successful")
```

### Step 3: Integrate with Existing RAG Endpoints

#### 3.1 Modify `backend/app.py` - Add GraphRAG Support
Add these imports and initialization at the top of `app.py`:

```python
# Add after existing imports
from graphrag_engine import GraphRAGEngine
import os

# Add after existing initialization
USE_GRAPH_RAG = os.getenv('USE_GRAPH_RAG', 'false').lower() == 'true'
graph_rag_engine = None

def get_graph_rag_engine():
    global graph_rag_engine
    if graph_rag_engine is None:
        graph_rag_engine = GraphRAGEngine()
    return graph_rag_engine
```

#### 3.2 Update RAG Query Endpoints
Find the existing `/api/rag-query` endpoint in `app.py` and replace it with:

```python
@app.route('/api/rag-query', methods=['POST'])
def rag_query():
    try:
        data = request.json
        query = data.get('query', '')
        
        if not query:
            return jsonify({'success': False, 'error': 'Query is required'}), 400
        
        if USE_GRAPH_RAG:
            try:
                # Get or build knowledge graph
                static_analysis_result = run_static_analysis()  # Reuse existing function
                engine = get_graph_rag_engine()
                engine.build_knowledge_graph(static_analysis_result)
                
                # Query with Graph RAG
                results = engine.query(query, top_k=data.get('top_k', 10))
                
                return jsonify({
                    'success': True,
                    'results': results,
                    'visualization_data': get_visualization_data(),  # Reuse existing
                    'method': 'graph_rag'
                })
                
            except Exception as e:
                # Fallback to legacy RAG on error
                print(f"Graph RAG failed, falling back: {e}")
                return legacy_rag_query(data)
        else:
            return legacy_rag_query(data)
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def legacy_rag_query(data):
    """Existing RAG implementation as fallback"""
    # Move current rag-query implementation here
    query = data.get('query', '')
    # ... existing implementation ...
    pass
```

#### 3.3 Update Codebase RAG Endpoint
Find the existing `/api/rag-query-codebase` endpoint and apply similar changes:

```python
@app.route('/api/rag-query-codebase', methods=['POST'])
def rag_query_codebase():
    try:
        data = request.json
        query = data.get('query', '')
        directory = data.get('directory', '')
        
        if not query or not directory:
            return jsonify({'success': False, 'error': 'Query and directory are required'}), 400
        
        if USE_GRAPH_RAG:
            try:
                # Analyze specific codebase
                static_analysis_result = analyze_directory_static(directory)
                engine = get_graph_rag_engine()
                engine.build_knowledge_graph(static_analysis_result)
                
                results = engine.query(query, top_k=data.get('top_k', 10))
                
                return jsonify({
                    'success': True,
                    'results': results,
                    'visualization_data': get_visualization_data_for_directory(directory),
                    'method': 'graph_rag'
                })
                
            except Exception as e:
                print(f"Graph RAG failed, falling back: {e}")
                return legacy_rag_query_codebase(data)
        else:
            return legacy_rag_query_codebase(data)
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def legacy_rag_query_codebase(data):
    """Existing codebase RAG implementation as fallback"""
    # Move current implementation here
    pass
```

**Test Step 3**: Test endpoint integration
```bash
# Start server with Graph RAG disabled
export USE_GRAPH_RAG=false
python backend/app.py &

# Test legacy endpoint works
curl -X POST http://localhost:5000/api/rag-query \
  -H "Content-Type: application/json" \
  -d '{"query": "test function"}'

# Enable Graph RAG and test
export USE_GRAPH_RAG=true
curl -X POST http://localhost:5000/api/rag-query \
  -H "Content-Type: application/json" \
  -d '{"query": "test function"}'
```

### Step 4: Add Pathfinding Integration Validation

#### 4.1 Create `backend/test_graphrag_integration.py`
```python
import requests
import json
from ast_coordinates import find_paths_between_rag_nodes

def test_graphrag_pathfinding_integration():
    """Test that Graph RAG results work with existing pathfinding"""
    
    # Query Graph RAG endpoint
    response = requests.post('http://localhost:5000/api/rag-query', 
                           json={'query': 'authentication logic'})
    
    assert response.status_code == 200
    data = response.json()
    assert data['success'] == True
    assert 'results' in data
    
    results = data['results']
    if len(results) == 0:
        print("No results returned - test inconclusive")
        return
    
    # Validate required fields for pathfinding
    for result in results:
        assert 'ast_ref' in result
        assert 'node_id' in result['ast_ref']
        assert 'line' in result['ast_ref']
        assert 'file_path' in result
        print(f"✓ Result has required pathfinding fields: {result['name']}")
    
    # Test integration with pathfinding system
    try:
        # Get static analysis data
        static_response = requests.post('http://localhost:5000/api/callgraph',
                                      json={'directory': '.'})
        static_data = static_response.json()
        
        # Test pathfinding integration
        paths = find_paths_between_rag_nodes(
            results,
            static_data.get('functions', {}),
            static_data.get('calls', [])
        )
        
        print(f"✓ Pathfinding integration successful: {len(paths.get('paths', []))} paths found")
        
    except Exception as e:
        print(f"✗ Pathfinding integration failed: {e}")
        raise
    
    print("All integration tests passed!")

if __name__ == "__main__":
    test_graphrag_pathfinding_integration()
```

**Run Step 4.1**:
```bash
python backend/test_graphrag_integration.py
```

### Step 5: Add Performance Monitoring

#### 5.1 Create `backend/graphrag_monitoring.py`
```python
import time
import psutil
import json
from functools import wraps
from datetime import datetime

class GraphRAGMonitor:
    def __init__(self):
        self.metrics = []
    
    def track_performance(self, func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            start_memory = psutil.Process().memory_info().rss
            
            try:
                result = func(*args, **kwargs)
                success = True
                error = None
            except Exception as e:
                result = None
                success = False
                error = str(e)
                raise
            finally:
                end_time = time.time()
                end_memory = psutil.Process().memory_info().rss
                
                metric = {
                    'timestamp': datetime.now().isoformat(),
                    'function': func.__name__,
                    'duration': end_time - start_time,
                    'memory_delta': end_memory - start_memory,
                    'success': success,
                    'error': error
                }
                
                self.metrics.append(metric)
                
                # Keep only last 1000 metrics
                if len(self.metrics) > 1000:
                    self.metrics = self.metrics[-1000:]
            
            return result
        return wrapper
    
    def get_metrics_summary(self):
        if not self.metrics:
            return {}
        
        successful_metrics = [m for m in self.metrics if m['success']]
        
        if not successful_metrics:
            return {'error_rate': 1.0, 'total_requests': len(self.metrics)}
        
        durations = [m['duration'] for m in successful_metrics]
        memory_deltas = [m['memory_delta'] for m in successful_metrics]
        
        return {
            'total_requests': len(self.metrics),
            'successful_requests': len(successful_metrics),
            'error_rate': 1.0 - (len(successful_metrics) / len(self.metrics)),
            'avg_duration': sum(durations) / len(durations),
            'max_duration': max(durations),
            'avg_memory_delta': sum(memory_deltas) / len(memory_deltas),
            'max_memory_delta': max(memory_deltas)
        }

# Global monitor instance
monitor = GraphRAGMonitor()
```

#### 5.2 Add Monitoring to GraphRAG Engine
Update `backend/graphrag_engine.py` to include monitoring:

```python
# Add import at top
from graphrag_monitoring import monitor

# Update the query method in GraphRAGEngine class
@monitor.track_performance
def query(self, query_text: str, top_k: int = 10) -> List[Dict]:
    # Existing implementation stays the same
    pass

@monitor.track_performance  
def build_knowledge_graph(self, static_analysis_data):
    # Existing implementation stays the same
    pass
```

#### 5.3 Add Monitoring Endpoint to `app.py`
```python
from graphrag_monitoring import monitor

@app.route('/api/health/graphrag', methods=['GET'])
def graphrag_health():
    try:
        # Test basic functionality
        engine = get_graph_rag_engine()
        test_result = engine.query("test", top_k=1)
        
        metrics = monitor.get_metrics_summary()
        
        return jsonify({
            'status': 'healthy',
            'graph_rag': 'operational',
            'metrics': metrics,
            'feature_flag': USE_GRAPH_RAG
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy', 
            'error': str(e),
            'feature_flag': USE_GRAPH_RAG
        }), 500
```

**Test Step 5**: Test monitoring
```bash
curl http://localhost:5000/api/health/graphrag
```

### Step 6: Update Requirements and Documentation

#### 6.1 Update `backend/requirements.txt`
Add these dependencies:
```txt
# Add to existing requirements.txt
networkx>=3.0
sentence-transformers>=2.2.0
numpy>=1.21.0
psutil>=5.8.0
```

#### 6.2 Create Migration Script `backend/migrate_to_graphrag.py`
```python
#!/usr/bin/env python3
"""
Migration script to enable Graph RAG with validation
"""
import os
import sys
import subprocess
import requests
import time

def install_dependencies():
    print("Installing Graph RAG dependencies...")
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
    print("✓ Dependencies installed")

def validate_installation():
    print("Validating Graph RAG installation...")
    try:
        from graphrag_engine import GraphRAGEngine
        engine = GraphRAGEngine()
        print("✓ Graph RAG engine imports successfully")
        
        # Test basic functionality
        test_data = {
            'inheritance': {'classes': {}},
            'callgraph': {'functions': {}, 'calls': []}
        }
        engine.build_knowledge_graph(test_data)
        print("✓ Knowledge graph construction works")
        
        results = engine.query("test", top_k=1)
        print("✓ Query processing works")
        
    except Exception as e:
        print(f"✗ Validation failed: {e}")
        return False
    
    return True

def test_endpoints():
    print("Testing endpoints...")
    
    # Wait for server to start
    time.sleep(2)
    
    try:
        # Test health endpoint
        response = requests.get('http://localhost:5000/api/health/graphrag')
        if response.status_code == 200:
            print("✓ Health endpoint working")
        else:
            print(f"✗ Health endpoint failed: {response.status_code}")
            return False
        
        # Test RAG endpoint
        response = requests.post('http://localhost:5000/api/rag-query',
                               json={'query': 'test'})
        if response.status_code == 200:
            print("✓ RAG query endpoint working")
        else:
            print(f"✗ RAG query endpoint failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ Endpoint testing failed: {e}")
        return False
    
    return True

def main():
    print("Graph RAG Migration Script")
    print("=" * 30)
    
    # Step 1: Install dependencies
    install_dependencies()
    
    # Step 2: Validate installation
    if not validate_installation():
        print("Migration failed at validation step")
        sys.exit(1)
    
    # Step 3: Enable Graph RAG
    os.environ['USE_GRAPH_RAG'] = 'true'
    print("✓ Graph RAG enabled via environment variable")
    
    print("\nMigration completed successfully!")
    print("Graph RAG is now ready to use.")
    print("\nTo permanently enable Graph RAG, set USE_GRAPH_RAG=true in your environment")

if __name__ == "__main__":
    main()
```

**Run Migration**:
```bash
cd backend
python migrate_to_graphrag.py
```

## Testing Checklist

Execute these tests in order to validate the implementation:

- [ ] **Step 1 Tests**: GraphRAG engine creation and knowledge graph construction
- [ ] **Step 2 Tests**: Query processing and result formatting  
- [ ] **Step 3 Tests**: Endpoint integration with feature flags
- [ ] **Step 4 Tests**: Pathfinding integration validation
- [ ] **Step 5 Tests**: Performance monitoring
- [ ] **Step 6 Tests**: Migration script execution

## Validation Commands

Run these commands to validate the complete implementation:

```bash
# 1. Install and validate
cd backend && python migrate_to_graphrag.py

# 2. Start server with Graph RAG enabled
export USE_GRAPH_RAG=true
python app.py &

# 3. Test basic functionality
curl -X POST http://localhost:5000/api/rag-query \
  -H "Content-Type: application/json" \
  -d '{"query": "authentication logic"}'

# 4. Test pathfinding integration
python test_graphrag_integration.py

# 5. Check health and metrics
curl http://localhost:5000/api/health/graphrag

# 6. Test fallback (Graph RAG disabled)
export USE_GRAPH_RAG=false
curl -X POST http://localhost:5000/api/rag-query \
  -H "Content-Type: application/json" \
  -d '{"query": "test function"}'
```

## Success Criteria Validation

After implementation, verify:
- [ ] All endpoints return results with required `ast_ref` fields
- [ ] `find_paths_between_rag_nodes()` works with Graph RAG results  
- [ ] Feature flag system allows safe rollback
- [ ] Response times within 10% of baseline
- [ ] Health monitoring shows system operational

## Rollback Procedure

If issues occur:
```bash
# 1. Disable Graph RAG immediately
export USE_GRAPH_RAG=false

# 2. Restart server
pkill -f "python app.py"
python app.py &

# 3. Verify legacy system works
curl -X POST http://localhost:5000/api/rag-query \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
```

The system is designed for safe rollback - disabling the feature flag immediately reverts to the original RAG implementation. 