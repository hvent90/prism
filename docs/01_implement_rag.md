# RAG Query Visualization Feature Implementation

## 📋 **Feature Overview**
Add a fourth visualization tab that simulates and displays what code snippets a RAG (Retrieval-Augmented Generation) system would retrieve and send to an LLM's context window.

## 🎯 **Goals**
- **Simulate real-world AI coding tools**: Show what code snippets Cursor or similar AI assistants would find
- **Natural language queries**: Users ask questions in plain English about the code
- **Semantic search**: Use actual embeddings to find relevant code chunks (completely local)
- **Context visualization**: Display exactly what would be inserted into an LLM's context window
- **Privacy-first**: All processing happens locally, no external API calls required

## 🔧 **Technical Requirements**

### **Phase 1 - Basic Implementation**
- ✅ Fourth tab: "RAG Query" alongside existing AST/Inheritance/Call Graph tabs
- ✅ Natural language input field for user queries
- ✅ Semantic search using embeddings (not keyword matching)
- ✅ Results display showing retrieved code snippets
- ✅ Search within the same code input being analyzed (no external codebase yet)

### **Future Phases**
- 🔮 Integration with existing visualizations (highlight relevant nodes)
- 🔮 Support for larger external codebases
- 🔮 Advanced result ranking and filtering

## 🏗️ **Implementation Plan**

### **1. Backend Implementation (Flask/Python)**

#### **A. Add New API Endpoint**
- `POST /api/rag-query` - Accept natural language query and return relevant code snippets
- Input: `{ "code": "...", "query": "natural language question" }`
- Output: `{ "success": true, "results": [{"snippet": "...", "score": 0.85, "type": "function"}, ...] }`

#### **B. Code Chunking Strategy**
```python
import ast

def chunk_code_by_ast(code):
    """Split code into logical chunks using AST parsing"""
    try:
        tree = ast.parse(code)
        chunks = []
        
        class ChunkExtractor(ast.NodeVisitor):
            def visit_FunctionDef(self, node):
                chunks.append({
                    'content': ast.unparse(node),
                    'type': 'function',
                    'name': node.name,
                    'line_start': node.lineno,
                    'line_end': getattr(node, 'end_lineno', node.lineno)
                })
                self.generic_visit(node)
            
            def visit_ClassDef(self, node):
                chunks.append({
                    'content': ast.unparse(node),
                    'type': 'class',
                    'name': node.name,
                    'line_start': node.lineno,
                    'line_end': getattr(node, 'end_lineno', node.lineno)
                })
                self.generic_visit(node)
        
        ChunkExtractor().visit(tree)
        
        # Add global scope if there are statements outside functions/classes
        global_statements = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.Import, ast.ImportFrom, ast.Assign)) and node.lineno:
                global_statements.append(ast.unparse(node))
        
        if global_statements:
            chunks.append({
                'content': '\n'.join(global_statements),
                'type': 'global',
                'name': 'Global scope',
                'line_start': 1,
                'line_end': len(global_statements)
            })
        
        return chunks
        
    except SyntaxError as e:
        return []
```

#### **C. Embedding Implementation**
```python
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Initialize model (downloads once, ~90MB)
model = SentenceTransformer('all-MiniLM-L6-v2')

def create_embeddings(code_chunks):
    # Convert code chunks to embeddings using local model
    embeddings = model.encode(code_chunks)
    return embeddings
    
def semantic_search(query, code_chunks, embeddings, top_k=5):
    # Convert query to embedding
    query_embedding = model.encode([query])
    
    # Calculate similarity scores
    similarities = cosine_similarity(query_embedding, embeddings)[0]
    
    # Get top-k results
    top_indices = np.argsort(similarities)[::-1][:top_k]
    
    results = []
    for idx in top_indices:
        if similarities[idx] > 0.1:  # Minimum relevance threshold
            results.append({
                'snippet': code_chunks[idx],
                'score': float(similarities[idx]),
                'index': int(idx)
            })
    
    return results
```

#### **D. Dependencies to Add**
```txt
# Add to requirements.txt
sentence-transformers>=2.2.0  # Local embedding model (~90MB download)
numpy>=1.21.0                # Vector operations
scikit-learn>=1.0.0          # Cosine similarity calculations
torch>=1.9.0                 # PyTorch backend (auto-installed)
```

### **2. Frontend Implementation (TypeScript)**

#### **A. New TypeScript Module**
- Create `frontend/src/rag.ts`
- Implement RAG query interface and results visualization
- Follow same pattern as existing `ast.ts`, `inheritance.ts`, `callgraph.ts`

#### **B. UI Components**
```typescript
interface RAGQueryResponse {
    success: boolean;
    results?: RAGResult[];
    error?: string;
}

interface RAGResult {
    snippet: string;
    score: number;
    type: 'function' | 'class' | 'global';
    name: string;
    line_start?: number;
    line_end?: number;
}
```

#### **C. Results Display**
- **List view**: Code snippets with relevance scores
- **Syntax highlighting**: Properly formatted code blocks
- **Metadata**: Show chunk type, relevance score, line numbers
- **Context**: Option to expand/collapse snippet context

### **3. UI Integration**

#### **A. Add Fourth Tab**
- Update `index.html` to include "RAG Query" tab
- Add query input field and results container
- Include appropriate ARIA labels and accessibility features

#### **B. Styling**
- Add CSS for RAG query interface
- Style code snippet display with syntax highlighting
- Add relevance score indicators
- Consistent with existing design system

### **4. Sample Implementation Flow**

```python
# Backend implementation
@app.route('/api/rag-query', methods=['POST'])
def rag_query():
    try:
        data = request.get_json()
        code = data.get('code', '')
        query = data.get('query', '')
        
        if not code or not query:
            return jsonify({'error': 'Code and query are required'}), 400
        
        # 1. Parse and chunk the code using AST
        chunks = chunk_code_by_ast(code)
        
        if not chunks:
            return jsonify({'error': 'No code chunks found'}), 400
        
        # 2. Create embeddings for code chunks (local model)
        embeddings = create_embeddings([chunk['content'] for chunk in chunks])
        
        # 3. Perform semantic search
        search_results = semantic_search(query, [chunk['content'] for chunk in chunks], embeddings)
        
        # 4. Enhance results with metadata
        enhanced_results = []
        for result in search_results:
            chunk_idx = result['index']
            enhanced_results.append({
                'snippet': result['snippet'],
                'score': result['score'],
                'type': chunks[chunk_idx]['type'],
                'name': chunks[chunk_idx].get('name', 'Unknown'),
                'line_start': chunks[chunk_idx].get('line_start'),
                'line_end': chunks[chunk_idx].get('line_end')
            })
        
        return jsonify({
            'success': True,
            'results': enhanced_results
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error processing query: {str(e)}'
        }), 500
```

## ✅ **Phase 1 Technical Decisions**

### **1. Embedding Model: sentence-transformers**
- ✅ **Model**: `all-MiniLM-L6-v2` (384 dimensions, fast, good quality)
- ✅ **Local execution**: No API calls, completely offline after initial download
- ✅ **Size**: ~90MB download (one-time)
- ✅ **Performance**: Fast inference on CPU, works on any machine
- ✅ **Cost**: Free, no usage limits

### **2. Code Chunking: AST-based**
- ✅ **Strategy**: Parse code using Python's built-in AST module
- ✅ **Chunk types**: Functions, classes, and global scope separately
- ✅ **Metadata**: Include function/class names, line numbers, chunk type
- ✅ **Context preservation**: Each chunk is a complete semantic unit
- ✅ **Fallback**: Handle syntax errors gracefully

### **3. Storage: In-memory**
- ✅ **Phase 1**: Generate embeddings on each request
- ✅ **Simplicity**: No database setup or persistence complexity
- ✅ **Development**: Easy to test and iterate
- 🔮 **Future**: Upgrade to ChromaDB for larger codebases

## 📝 **Acceptance Criteria**
- [ ] User can enter natural language query in fourth tab
- [ ] Backend performs semantic search on input code using sentence-transformers
- [ ] Results display relevant code snippets with similarity scores (0.0-1.0)
- [ ] Snippets show function/class names, types, and line numbers
- [ ] Code snippets are properly formatted with syntax highlighting
- [ ] Integration follows existing UI/UX patterns (consistent styling)
- [ ] No external API calls required (completely local processing)
- [ ] Performance is reasonable for typical code inputs (~100-1000 lines)
- [ ] Graceful handling of syntax errors and edge cases

## 🧪 **Testing Strategy**
- Test with various query types: "find classes", "how to create objects", "error handling"
- Verify results make sense and are truly relevant
- Test edge cases: empty code, malformed queries, no results
- Performance testing with larger code inputs

## 📦 **Files to Create/Modify**
- `backend/app.py` - Add RAG endpoint and embedding logic
- `backend/requirements.txt` - Add embedding dependencies
- `frontend/src/rag.ts` - RAG query visualization logic
- `frontend/public/index.html` - Add fourth tab and UI elements
- `frontend/public/style.css` - Styling for RAG interface
- `frontend/public/rag.js` - Compiled TypeScript output
