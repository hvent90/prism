# Context Prompt Builder with Variable LOD System

## Executive Summary

This task outlines the development of Prism's core innovation: an intelligent context prompt builder that uses intent-guided pathfinding and variable Level of Detail (LOD) to provide optimal code context for AI coding agents. Unlike flat approaches (like Aider's), this system creates a "relevance field" around RAG query results and intelligently includes related code at appropriate detail levels.

## Project Objectives

### Primary Goal
Build a system that generates contextually rich, token-efficient prompts for AI coding agents by:
- Using RAG to find initial entry points
- Creating relevance networks through pathfinding
- Applying variable LOD based on relevance distance
- Including architectural context through inheritance/call graph traversal

### Success Metrics
- **Context Quality**: AI agents can successfully complete complex coding tasks with provided context
- **Token Efficiency**: 3-5x better token utilization compared to flat inclusion approaches
- **Query Coverage**: Handle diverse query types (architectural, implementation, debugging, refactoring)
- **Performance**: Sub-2 second context generation for codebases up to 100k LOC

## Architecture Overview

```
Query → RAG → Entry Points → Pathfinding → Relevance Network → LOD Assignment → Context Assembly → Final Prompt
```

### LOD Level Definitions

| LOD | Name | Content | Use Case |
|-----|------|---------|----------|
| **L3** | Full Implementation | Complete source code, comments, docstrings | Direct query matches, path intermediaries |
| **L2** | Interface Definition | Function/class signatures, type hints, brief docs | Adjacent functions, sibling methods |
| **L1** | API Surface | Public interfaces, HTTP endpoints, module exports | Related modules, external boundaries |
| **L0** | Architecture Overview | High-level structure, component relationships | System context, distant dependencies |

## Implementation Phases

### Phase 1: Core Pathfinding Engine
**Duration**: 3-4 weeks
**Priority**: Critical Path

#### 1.1 Graph Representation Enhancement
- [ ] **Extend AST coordinate system** to support multi-dimensional relationships
  - Call graph edges with semantic weights
  - Data flow edges (variable usage, return values)
  - Inheritance edges with hierarchy depth
  - Temporal edges (code modification patterns)
  - Intent edges (semantic similarity between functions)

- [ ] **Build composite code graph** from existing visualizations
  ```python
  class CodeGraph:
      def __init__(self, ast_data, inheritance_data, call_graph_data, embeddings):
          self.nodes = {}  # NodeId -> NodeData
          self.edges = defaultdict(list)  # (source, target) -> EdgeData
          self.spatial_index = KDTree()  # For embedding similarity
  ```

- [ ] **Add graph persistence and incremental updates**
  - SQLite storage for large codebases
  - Incremental updates when files change
  - Graph validation and consistency checks

#### 1.2 Intent-Guided Pathfinding Algorithm
- [ ] **Implement multi-source Dijkstra** for finding paths between RAG entry points
  ```python
  def find_relevance_network(entry_points, graph, query_context) -> Set[PathSegment]:
      # Find optimal paths between all entry point pairs
      # Weight paths by semantic alignment, structural importance
      # Include architectural shortcuts (inheritance jumps)
  ```

- [ ] **Dynamic edge weight calculation**
  ```python
  def calculate_edge_cost(source, target, edge_type, query_context) -> float:
      # Combine: semantic similarity, structural importance, query alignment
      # Boost intent-aligned paths, penalize deep hierarchical jumps
      # Encourage diversity (exploring new modules/folders)
  ```

- [ ] **Path pruning and optimization**
  - Limit path length to prevent infinite expansion
  - Handle circular dependencies gracefully
  - Merge overlapping paths for efficiency

#### 1.3 Network Expansion and LOD Assignment
- [ ] **BFS expansion from relevance network** to nearby nodes
  ```python
  def expand_network(relevance_paths, expansion_radius=3):
      # Controlled expansion with intent-based filtering
      # Distance-based LOD assignment (L3 -> L2 -> L1 -> L0)
      # Respect module/package boundaries
  ```

- [ ] **Hierarchical coherence enforcement**
  ```python
  def ensure_hierarchical_coherence(selected_nodes):
      # Include all ancestor nodes (classes, modules, packages)
      # Apply parent-child LOD rules (if child is L3, parent >= L1)
      # Handle inheritance chains properly
  ```

**Deliverables**:
- Working pathfinding engine with test suite
- Performance benchmarks on sample codebases
- Integration with existing AST/visualization systems

### Phase 2: Context Assembly Engine
**Duration**: 2-3 weeks
**Depends on**: Phase 1

#### 2.1 LOD Content Generation
- [ ] **L3 (Full Implementation) renderer**
  ```python
  def render_full_implementation(node: CodeNode) -> str:
      # Complete source code with proper indentation
      # Include docstrings, type hints, comments
      # Add context breadcrumbs (file path, line numbers)
  ```

- [ ] **L2 (Interface Definition) renderer**
  ```python
  def render_interface_definition(node: CodeNode) -> str:
      # Function signatures with parameter types
      # Class definitions with method signatures
      # Brief docstring summaries
  ```

- [ ] **L1 (API Surface) renderer**
  ```python
  def render_api_surface(node: CodeNode) -> str:
      # HTTP endpoints, GraphQL schemas
      # Public module exports/imports
      # Package-level interfaces
  ```

- [ ] **L0 (Architecture Overview) renderer**
  ```python
  def render_architecture_overview(nodes: List[CodeNode]) -> str:
      # Component relationship diagrams (text-based)
      # Service boundaries and data flows
      # Configuration and deployment structure
  ```

#### 2.2 Context Optimization
- [ ] **Token budget optimization**
  ```python
  def optimize_for_token_budget(lod_assignments, budget, query_context):
      # Iteratively reduce LOD levels to fit budget
      # Preserve most important nodes at high detail
      # Use query-specific importance weighting
  ```

- [ ] **Content deduplication and merging**
  - Avoid repeating identical function signatures
  - Merge related imports/exports
  - Smart truncation of large files

- [ ] **Context coherence validation**
  - Ensure no broken references in generated context
  - Validate that included paths make semantic sense
  - Check for missing dependencies

**Deliverables**:
- LOD content generators for all levels
- Token optimization with budget constraints
- Context validation and quality metrics

### Phase 3: Query Strategy Engine
**Duration**: 2-3 weeks
**Depends on**: Phase 1, 2

#### 3.1 Query Type Classification
- [ ] **Intent classification system**
  ```python
  class QueryClassifier:
      def classify_query(self, query: str) -> QueryContext:
          # Architectural exploration vs implementation detail
          # Bug fixing vs feature addition vs refactoring
          # Return strategy weights for pathfinding
  ```

- [ ] **Strategy weight configurations**
  ```yaml
  query_strategies:
    architectural:
      weights: { semantic: 0.4, topological: 0.3, hierarchy: 0.3 }
      max_path_length: 6
      expansion_radius: 4
    
    implementation:
      weights: { semantic: 0.6, topological: 0.4, hierarchy: 0.0 }
      max_path_length: 4
      expansion_radius: 2
    
    debugging:
      weights: { semantic: 0.3, topological: 0.7, hierarchy: 0.0 }
      include_error_paths: true
      temporal_weight: 0.2
  ```

#### 3.2 Adaptive Pathfinding
- [ ] **Query-specific edge weighting**
  - Boost call graph edges for debugging queries
  - Boost inheritance edges for architectural queries
  - Boost semantic edges for feature implementation

- [ ] **Dynamic stopping criteria**
  ```python
  def should_stop_expansion(state: PathfindingState, query_context: QueryContext) -> bool:
      # Coverage-based stopping (have we covered the query intent?)
      # Token budget awareness
      # Diminishing returns detection
  ```

**Deliverables**:
- Query classification with strategy mapping
- Adaptive pathfinding based on query type
- Strategy effectiveness metrics and tuning

### Phase 4: Integration and Optimization
**Duration**: 2-3 weeks
**Depends on**: Phase 1, 2, 3

#### 4.1 RAG Integration
- [ ] **Enhanced RAG query processing**
  ```python
  def process_rag_query(query: str, codebase: CodeGraph) -> List[EntryPoint]:
      # Use existing embeddings + enhanced ranking
      # Include architectural anchors (main classes, entry points)
      # Filter out noise/test files unless specifically requested
  ```

- [ ] **Entry point validation and enhancement**
  - Verify entry points are semantically coherent
  - Add architectural entry points (main classes, API endpoints)
  - Handle queries with no clear entry points

#### 4.2 Performance Optimization
- [ ] **Caching and memoization**
  ```python
  class PathfindingCache:
      def __init__(self):
          self.path_cache = {}  # (start, end, strategy) -> path
          self.lod_cache = {}   # (nodes, query_type) -> lod_assignments
          self.token_cache = {} # content -> token_count
  ```

- [ ] **Parallel processing**
  - Concurrent pathfinding for independent entry point pairs
  - Parallel LOD content generation
  - Background graph updates

- [ ] **Memory management**
  - Streaming context generation for large codebases
  - Incremental LOD rendering
  - Graph pruning for unused nodes

#### 4.3 Quality Assurance
- [ ] **Context validation framework**
  ```python
  def validate_context_quality(context: str, query: str, expected_nodes: Set[str]) -> QualityMetrics:
      # Check for broken references
      # Validate semantic coherence
      # Measure coverage of expected functionality
  ```

- [ ] **A/B testing framework** for comparing against flat approaches
- [ ] **Performance monitoring** and alerting

**Deliverables**:
- Production-ready context builder with caching
- Quality validation and monitoring
- Performance benchmarks vs alternatives

### Phase 5: Frontend Integration and User Experience
**Duration**: 1-2 weeks
**Depends on**: Phase 4

#### 5.1 Dashboard Integration
- [ ] **Context preview panel** showing LOD assignments before generation
- [ ] **Interactive LOD adjustment** - users can manually tune detail levels
- [ ] **Token budget visualization** - show estimated vs actual token usage
- [ ] **Path visualization** - show discovered relevance network on graphs

#### 5.2 Export and API
- [ ] **Context export formats**
  - Plain text for copying to external AI tools
  - Structured JSON for API integration
  - Markdown with proper formatting

- [ ] **API endpoints** for headless usage
  ```python
  POST /api/context/generate
  {
    "query": "How to add user authentication?",
    "token_budget": 8000,
    "strategy": "implementation",
    "lod_preferences": {"min_detail": "L1", "max_detail": "L3"}
  }
  ```

**Deliverables**:
- User-friendly context generation interface
- Export capabilities for external AI tools
- API for programmatic access

## Technical Architecture

### Core Components

```python
# Main orchestrator
class ContextPromptBuilder:
    def __init__(self, codebase_analyzer: CodebaseAnalyzer):
        self.graph = codebase_analyzer.build_code_graph()
        self.pathfinder = IntentGuidedPathfinder(self.graph)
        self.content_renderer = LODContentRenderer()
        self.query_classifier = QueryClassifier()
    
    def generate_context(self, query: str, token_budget: int) -> str:
        # 1. Classify query and get strategy
        query_context = self.query_classifier.classify(query)
        
        # 2. Get RAG entry points
        entry_points = self.get_rag_entry_points(query)
        
        # 3. Run pathfinding to get relevance network
        lod_assignments = self.pathfinder.find_relevant_context(
            entry_points, query_context, token_budget
        )
        
        # 4. Generate content at appropriate LOD levels
        context = self.content_renderer.render_context(lod_assignments)
        
        # 5. Optimize for token budget
        return self.optimize_context(context, token_budget)
```

### Data Structures

```python
@dataclass
class CodeNode:
    id: str
    type: NodeType  # function, class, module, etc.
    content: str
    embeddings: Dict[str, np.ndarray]  # code, docstring, intent
    structural_importance: float
    hierarchy_level: int
    ast_ref: ASTReference

@dataclass 
class PathSegment:
    nodes: List[CodeNode]
    start: CodeNode
    end: CodeNode
    total_cost: float
    edge_types: List[str]

@dataclass
class QueryContext:
    query: str
    embedding: np.ndarray
    strategy: Dict[str, float]  # weights for pathfinding
    query_type: str  # architectural, implementation, debugging
    token_budget: int
```

## Quality Assurance Strategy

### Testing Approach
1. **Unit Tests**: Each component (pathfinding, LOD rendering, optimization)
2. **Integration Tests**: Full pipeline with real codebases
3. **Quality Tests**: Context coherence and usefulness validation
4. **Performance Tests**: Token efficiency vs flat approaches
5. **User Tests**: Actual AI coding task completion rates

### Success Criteria
- [ ] **Token Efficiency**: 3x better utilization than flat inclusion
- [ ] **Context Quality**: 90%+ of generated contexts are coherent and useful
- [ ] **Performance**: <2s context generation for 100k LOC codebases  
- [ ] **Coverage**: Handle 95%+ of common query types effectively
- [ ] **User Satisfaction**: Positive feedback from AI coding tool users

## Risk Mitigation

### Technical Risks
- **Complexity**: Pathfinding algorithm may be too complex
  - *Mitigation*: Start with simpler heuristics, iterate toward sophistication
- **Performance**: May not scale to very large codebases
  - *Mitigation*: Implement caching, parallel processing, and graph pruning
- **Quality**: Generated context may be incoherent
  - *Mitigation*: Extensive validation framework and user feedback loops

### Product Risks  
- **Adoption**: Users may not see value over simpler approaches
  - *Mitigation*: Clear demonstrations of superiority, easy integration
- **Competition**: Similar solutions may emerge
  - *Mitigation*: Focus on technical depth and quality over speed to market

## Resource Requirements

### Development Team
- **1 Senior Backend Engineer**: Pathfinding algorithm and optimization
- **1 Frontend Engineer**: Dashboard integration and user experience  
- **1 ML Engineer**: RAG integration and query classification
- **0.5 DevOps Engineer**: Performance optimization and deployment

### Infrastructure
- **Compute**: GPU access for embedding calculations
- **Storage**: Efficient graph storage and caching
- **Testing**: Various sizes of codebases for validation

## Timeline Summary

- **Phase 1** (Pathfinding): Weeks 1-4
- **Phase 2** (Content Assembly): Weeks 5-7  
- **Phase 3** (Query Strategies): Weeks 8-10
- **Phase 4** (Integration): Weeks 11-13
- **Phase 5** (Frontend): Weeks 14-15

**Total Duration**: ~15 weeks (3.5 months)
**Critical Path**: Pathfinding algorithm development

## Future Enhancements

### Advanced Features
- **Multi-language support**: Extend beyond Python to JavaScript, Java, etc.
- **Temporal analysis**: Include code change patterns in pathfinding
- **Collaborative features**: Share and refine context templates
- **AI feedback loop**: Learn from AI agent success/failure to improve context

### Scaling Improvements
- **Distributed pathfinding**: Scale to million+ LOC codebases
- **Real-time updates**: Incremental context updates as code changes
- **Edge computing**: On-device context generation for privacy

This represents a significant technical leap beyond current code context solutions, positioning Prism as the premier tool for AI-assisted software development through intelligent context understanding. 