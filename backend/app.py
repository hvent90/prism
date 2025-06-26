from flask import Flask, request, jsonify
from flask_cors import CORS
import ast
import json
import os
import pathlib
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from ast_coordinates import (
    create_ast_reference, 
    enhance_class_with_ast_refs, 
    enhance_function_with_ast_refs,
    create_line_to_ast_mapping,
    enhance_rag_result_with_ast_ref
)
from collections import deque, defaultdict

app = Flask(__name__)

# Configure CORS with specific settings
CORS(app, 
     origins=['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
     methods=['GET', 'POST', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization'],
     supports_credentials=True)

# Initialize the embedding model (will download once, ~90MB)
try:
    model = SentenceTransformer('all-MiniLM-L6-v2')
except Exception as e:
    print(f"Warning: Could not load sentence-transformers model: {e}")
    model = None

def ast_to_dict(node):
    """Convert AST node to dictionary representation"""
    if isinstance(node, ast.AST):
        result = {
            'type': node.__class__.__name__,
            'lineno': getattr(node, 'lineno', None),
            'col_offset': getattr(node, 'col_offset', None)
        }
        
        # Add child nodes
        for field, value in ast.iter_fields(node):
            if isinstance(value, list):
                result[field] = [ast_to_dict(child) for child in value if isinstance(child, ast.AST)]
            elif isinstance(value, ast.AST):
                result[field] = ast_to_dict(value)
            else:
                # Ensure value is JSON serializable
                if isinstance(value, bytes):
                    result[field] = value.decode('utf-8', errors='replace')
                elif hasattr(value, '__dict__'):
                    result[field] = str(value)
                else:
                    result[field] = value
                
        return result
    return node

def extract_class_info(node):
    """Extract class information from AST node"""
    if isinstance(node, ast.ClassDef):
        class_info = {
            'name': node.name,
            'bases': [],
            'methods': [],
            'attributes': [],
            'docstring': ast.get_docstring(node),
            'lineno': node.lineno
        }
        
        # Extract base classes
        for base in node.bases:
            if isinstance(base, ast.Name):
                class_info['bases'].append(base.id)
            elif isinstance(base, ast.Attribute):
                # Handle cases like 'module.Class'
                class_info['bases'].append(ast.unparse(base))
        
        # Extract methods and attributes
        for item in node.body:
            if isinstance(item, ast.FunctionDef):
                # Extract method with parameters
                params = []
                for arg in item.args.args:
                    params.append(arg.arg)
                
                method_info = {
                    'name': item.name,
                    'params': params,
                    'docstring': ast.get_docstring(item),
                    'lineno': item.lineno
                }
                class_info['methods'].append(method_info)
            elif isinstance(item, ast.Assign):
                # Extract attribute names from assignments
                for target in item.targets:
                    if isinstance(target, ast.Name):
                        class_info['attributes'].append(target.id)
                    elif isinstance(target, ast.Attribute):
                        class_info['attributes'].append(target.attr)
        
        return class_info
    return None

def extract_classes_from_ast(tree):
    """Extract all class definitions from AST with AST coordinates"""
    classes = []
    
    def visit_node(node):
        if isinstance(node, ast.ClassDef):
            class_info = extract_class_info(node)
            if class_info:
                # Enhance with AST coordinates
                enhanced_class = enhance_class_with_ast_refs(class_info, node, tree)
                classes.append(enhanced_class)
        
        # Recursively visit child nodes
        for child in ast.iter_child_nodes(node):
            visit_node(child)
    
    visit_node(tree)
    return classes

def extract_function_calls(tree):
    """Extract function definitions and their calls from AST with AST coordinates"""
    functions = {}
    calls = []
    function_nodes = {}  # Store AST nodes for enhancement
    
    def get_full_name(node):
        """Get the full name of a function call (e.g., 'obj.method' or 'func')"""
        if isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Attribute):
            return f"{get_full_name(node.value)}.{node.attr}"
        else:
            return ast.unparse(node) if hasattr(ast, 'unparse') else str(node)
    
    def visit_node(node, current_function=None, current_class=None):
        if isinstance(node, ast.ClassDef):
            # Track class context
            current_class = node.name
            # Continue visiting child nodes with class context
            for child in ast.iter_child_nodes(node):
                visit_node(child, current_function, current_class)
        
        elif isinstance(node, ast.FunctionDef):
            # Extract function definition with class context if available
            params = [arg.arg for arg in node.args.args]
            
            # Keep original method name, add class_name field if inside a class
            function_info = {
                'name': node.name,
                'class_name': current_class,  # Add class context without modifying name
                'params': params,
                'calls': [],
                'lineno': node.lineno,
                'docstring': ast.get_docstring(node)
            }
            
            # Use a unique key for storage that includes class context
            storage_key = f"{current_class}.{node.name}" if current_class else node.name
            functions[storage_key] = function_info
            function_nodes[storage_key] = node  # Store AST node
            current_function = storage_key
            
            # Continue visiting child nodes with function context
            for child in ast.iter_child_nodes(node):
                visit_node(child, current_function, current_class)
        
        elif isinstance(node, ast.Call) and current_function:
            # Extract function call
            func_name = get_full_name(node.func)
            if func_name not in functions[current_function]['calls']:
                functions[current_function]['calls'].append(func_name)
            
            calls.append({
                'caller': current_function,
                'callee': func_name,
                'lineno': getattr(node, 'lineno', None)
            })
            
            # Continue visiting child nodes
            for child in ast.iter_child_nodes(node):
                visit_node(child, current_function, current_class)
        
        else:
            # For other nodes, continue visiting child nodes
            for child in ast.iter_child_nodes(node):
                visit_node(child, current_function, current_class)
    
    visit_node(tree)
    
    # Also extract standalone function calls (not inside any function)
    def extract_global_calls(node):
        if isinstance(node, ast.Call):
            func_name = get_full_name(node.func)
            calls.append({
                'caller': '__global__',
                'callee': func_name,
                'lineno': getattr(node, 'lineno', None)
            })
        
        # Only visit direct children for global scope
        if not isinstance(node, ast.FunctionDef):
            for child in ast.iter_child_nodes(node):
                extract_global_calls(child)
    
    # Extract global calls
    extract_global_calls(tree)
    
    # Enhance functions with AST coordinates
    enhanced_functions = []
    for func_name, func_info in functions.items():
        if func_name in function_nodes:
            enhanced_func = enhance_function_with_ast_refs(func_info, function_nodes[func_name], tree)
            enhanced_functions.append(enhanced_func)
        else:
            enhanced_functions.append(func_info)
    
    return {
        'functions': enhanced_functions,
        'calls': calls
    }

def chunk_code_by_ast(code):
    """Split code into logical chunks using AST parsing"""
    try:
        tree = ast.parse(code)
        chunks = []
        
        class ChunkExtractor(ast.NodeVisitor):
            def visit_FunctionDef(self, node):
                # Get the function source code
                lines = code.split('\n')
                start_line = node.lineno - 1
                end_line = getattr(node, 'end_lineno', node.lineno) - 1
                
                if end_line < len(lines):
                    content = '\n'.join(lines[start_line:end_line + 1])
                else:
                    content = ast.unparse(node) if hasattr(ast, 'unparse') else f"def {node.name}(...):"
                
                chunks.append({
                    'content': content,
                    'type': 'function',
                    'name': node.name,
                    'line_start': node.lineno,
                    'line_end': getattr(node, 'end_lineno', node.lineno)
                })
                self.generic_visit(node)
            
            def visit_ClassDef(self, node):
                # Get the class source code
                lines = code.split('\n')
                start_line = node.lineno - 1
                end_line = getattr(node, 'end_lineno', node.lineno) - 1
                
                if end_line < len(lines):
                    content = '\n'.join(lines[start_line:end_line + 1])
                else:
                    content = ast.unparse(node) if hasattr(ast, 'unparse') else f"class {node.name}:"
                
                chunks.append({
                    'content': content,
                    'type': 'class',
                    'name': node.name,
                    'line_start': node.lineno,
                    'line_end': getattr(node, 'end_lineno', node.lineno)
                })
                self.generic_visit(node)
        
        ChunkExtractor().visit(tree)
        
        # Add global scope if there are statements outside functions/classes
        global_statements = []
        lines = code.split('\n')
        
        for node in ast.walk(tree):
            if isinstance(node, (ast.Import, ast.ImportFrom, ast.Assign)) and hasattr(node, 'lineno'):
                # Check if this node is not inside a function or class
                is_global = True
                for chunk in chunks:
                    if chunk['line_start'] <= node.lineno <= chunk['line_end']:
                        is_global = False
                        break
                
                if is_global and node.lineno <= len(lines):
                    line_content = lines[node.lineno - 1].strip()
                    if line_content and line_content not in global_statements:
                        global_statements.append(line_content)
        
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
        print(f"Syntax error in chunk_code_by_ast: {e}")
        return []
    except Exception as e:
        print(f"Error in chunk_code_by_ast: {e}")
        return []

def create_embeddings(code_chunks):
    """Convert code chunks to embeddings using local model"""
    if not model:
        raise Exception("Sentence transformer model not available")
    
    embeddings = model.encode(code_chunks)
    return embeddings
    
def semantic_search(query, code_chunks, embeddings, top_k=5):
    """Perform semantic search on code chunks"""
    if not model:
        raise Exception("Sentence transformer model not available")
    
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

@app.route('/api/ast', methods=['POST'])
def extract_ast():
    """Extract AST from Python code"""
    try:
        data = request.get_json()
        code = data.get('code', '')
        
        if not code:
            return jsonify({'error': 'No code provided'}), 400
        
        # Parse the code into AST
        tree = ast.parse(code)
        
        # Convert AST to dictionary
        ast_dict = ast_to_dict(tree)
        
        return jsonify({
            'success': True,
            'ast': ast_dict
        })
        
    except SyntaxError as e:
        return jsonify({
            'success': False,
            'error': f'Syntax error: {str(e)}'
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error processing code: {str(e)}'
        }), 500

# Add CORS preflight handler
@app.route('/api/<path:endpoint>', methods=['OPTIONS'])
def handle_preflight(endpoint):
    """Handle CORS preflight requests"""
    response = jsonify({'status': 'ok'})
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

def extract_functions_from_ast(tree):
    """Extract standalone function definitions from AST with AST coordinates"""
    functions = []
    
    def visit_node(node):
        # Only extract functions at module level (not inside classes)
        if isinstance(node, ast.FunctionDef):
            params = [arg.arg for arg in node.args.args]
            function_info = {
                'name': node.name,
                'params': params,
                'docstring': ast.get_docstring(node),
                'lineno': node.lineno
            }
            # Enhance with AST coordinates
            enhanced_function = enhance_function_with_ast_refs(function_info, node, tree)
            functions.append(enhanced_function)
        elif isinstance(node, ast.ClassDef):
            # Skip functions inside classes
            pass
        else:
            # Visit children for non-function, non-class nodes
            for child in ast.iter_child_nodes(node):
                visit_node(child)
    
    visit_node(tree)
    return functions

@app.route('/api/inheritance', methods=['POST'])
def extract_inheritance():
    """Extract class inheritance hierarchy and standalone functions from Python code"""
    try:
        data = request.get_json()
        code = data.get('code', '')
        
        if not code:
            return jsonify({'error': 'No code provided'}), 400
        
        # Parse the code into AST
        tree = ast.parse(code)
        
        # Extract class information
        classes = extract_classes_from_ast(tree)
        
        # Extract standalone functions
        functions = extract_functions_from_ast(tree)
        
        return jsonify({
            'success': True,
            'classes': classes,
            'functions': functions
        })
        
    except SyntaxError as e:
        return jsonify({
            'success': False,
            'error': f'Syntax error: {str(e)}'
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error processing code: {str(e)}'
        }), 500

@app.route('/api/callgraph', methods=['POST'])
def extract_call_graph():
    """Extract function call graph from Python code"""
    try:
        data = request.get_json()
        code = data.get('code', '')
        
        if not code:
            return jsonify({'error': 'No code provided'}), 400
        
        # Parse the code into AST
        tree = ast.parse(code)
        
        # Extract function call information
        call_info = extract_function_calls(tree)
        
        return jsonify({
            'success': True,
            'functions': call_info['functions'],
            'calls': call_info['calls']
        })
        
    except SyntaxError as e:
        return jsonify({
            'success': False,
            'error': f'Syntax error: {str(e)}'
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error processing code: {str(e)}'
        }), 500

@app.route('/api/rag-query', methods=['POST'])
def rag_query():
    """Process natural language query and return relevant code snippets with AST coordinates and visualization data"""
    try:
        data = request.get_json()
        code = data.get('code', '')
        query = data.get('query', '')
        
        if not code or not query:
            return jsonify({'error': 'Code and query are required'}), 400
        
        # 1. Parse the code into AST for coordinate mapping
        tree = ast.parse(code)
        line_mapping = create_line_to_ast_mapping(tree)
        
        # 2. Parse and chunk the code using AST
        chunks = chunk_code_by_ast(code)
        
        if not chunks:
            return jsonify({'error': 'No code chunks found'}), 400
        
        # 3. Create embeddings for code chunks (local model)
        embeddings = create_embeddings([chunk['content'] for chunk in chunks])
        
        # 4. Perform semantic search
        search_results = semantic_search(query, [chunk['content'] for chunk in chunks], embeddings)
        
        # 5. Enhance results with metadata and AST coordinates
        enhanced_results = []
        for result in search_results:
            chunk_idx = result['index']
            base_result = {
                'snippet': result['snippet'],
                'score': result['score'],
                'type': chunks[chunk_idx]['type'],
                'name': chunks[chunk_idx].get('name', 'Unknown'),
                'line_start': chunks[chunk_idx].get('line_start'),
                'line_end': chunks[chunk_idx].get('line_end')
            }
            
            # Enhance with AST coordinates
            enhanced_result = enhance_rag_result_with_ast_ref(base_result, tree, line_mapping)
            enhanced_results.append(enhanced_result)
        
        # 6. Extract visualization data for node matching
        # Extract class inheritance hierarchy and standalone functions
        classes = extract_classes_from_ast(tree)
        functions = extract_functions_from_ast(tree)
        
        # Extract function call graph
        call_info = extract_function_calls(tree)
        
        # 7. Find paths between RAG result nodes in call graph
        rag_paths = find_paths_between_rag_nodes(
            enhanced_results, 
            call_info['functions'], 
            call_info['calls']
        )
        
        return jsonify({
            'success': True,
            'results': enhanced_results,
            'visualization_data': {
                'inheritance': {
                    'classes': classes,
                    'functions': functions
                },
                'callgraph': {
                    'functions': call_info['functions'],
                    'calls': call_info['calls'],
                    'rag_paths': rag_paths
                }
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error processing query: {str(e)}'
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'prism-backend'})

@app.route('/api/analyze', methods=['POST'])
def analyze_code():
    """Comprehensive code analysis combining AST, inheritance, and call graph"""
    try:
        data = request.get_json()
        code = data.get('code', '')
        
        if not code:
            return jsonify({'error': 'No code provided'}), 400
        
        # Parse the code into AST once
        tree = ast.parse(code)
        
        # 1. Extract AST structure
        ast_dict = ast_to_dict(tree)
        
        # 2. Extract class inheritance hierarchy and standalone functions
        classes = extract_classes_from_ast(tree)
        functions = extract_functions_from_ast(tree)
        
        # 3. Extract function call graph
        call_info = extract_function_calls(tree)
        
        return jsonify({
            'success': True,
            'ast': ast_dict,
            'inheritance': {
                'classes': classes,
                'functions': functions
            },
            'callgraph': {
                'functions': call_info['functions'],
                'calls': call_info['calls']
            }
        })
        
    except SyntaxError as e:
        return jsonify({
            'success': False,
            'error': f'Syntax error: {str(e)}'
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error processing code: {str(e)}'
        }), 500

@app.route('/api/test-cors', methods=['GET', 'POST'])
def test_cors():
    """Test endpoint to verify CORS is working"""
    return jsonify({
        'status': 'success',
        'message': 'CORS is working properly',
        'method': request.method,
        'origin': request.headers.get('Origin', 'unknown')
    })

def find_paths_between_rag_nodes(rag_results, call_graph_functions, call_graph_calls, max_depth=5):
    """
    Find paths between RAG result nodes in the call graph.
    
    Args:
        rag_results: List of RAG result items with AST references
        call_graph_functions: Dictionary of function information from call graph
        call_graph_calls: List of call relationships from call graph
        max_depth: Maximum path depth to search (default 5)
    
    Returns:
        Dictionary containing matched nodes and discovered paths
    """
    try:
        # Build adjacency lists for bidirectional graph traversal
        caller_to_callees = defaultdict(list)  # forward edges
        callee_to_callers = defaultdict(list)  # reverse edges
        
        # Create a function name mapping for easier lookup
        function_name_map = {}
        for func_info in call_graph_functions:
            func_name = func_info.get('name', '')
            class_name = func_info.get('class_name')
            
            # Build full function name (including class context if available)
            full_func_name = f"{class_name}.{func_name}" if class_name else func_name
            
            if full_func_name:
                function_name_map[full_func_name] = func_info
        
        # Build the graph from call relationships
        for call in call_graph_calls:
            caller = call.get('caller', '')
            callee = call.get('callee', '')
            if caller and callee:
                caller_to_callees[caller].append({
                    'node': callee,
                    'call_line': call.get('lineno', 0)
                })
                callee_to_callers[callee].append({
                    'node': caller, 
                    'call_line': call.get('lineno', 0)
                })
        
        # Match RAG results to call graph nodes by AST reference
        matched_nodes = []
        rag_node_to_function = {}
        
        for rag_result in rag_results:
            if not rag_result.get('ast_ref'):
                continue
                
            ast_ref = rag_result['ast_ref']
            node_id = ast_ref.get('node_id', '')
            
            # Try to match with call graph functions (call_graph_functions is a list)
            for func_info in call_graph_functions:
                func_name = func_info.get('name', '')
                class_name = func_info.get('class_name')
                
                # Build full function name (including class context if available)
                full_func_name = f"{class_name}.{func_name}" if class_name else func_name
                
                # Check if function has AST reference and matches
                if func_info.get('ast_ref'):
                    func_ast_ref = func_info['ast_ref']
                    if func_ast_ref.get('node_id') == node_id:
                        matched_nodes.append(node_id)
                        rag_node_to_function[node_id] = full_func_name
                        break
                elif func_info.get('lineno') and ast_ref.get('line'):
                    # Fallback: match by line number if AST refs not available
                    if abs(func_info['lineno'] - ast_ref['line']) <= 2:  # Allow small line difference
                        matched_nodes.append(node_id)
                        rag_node_to_function[node_id] = full_func_name
                        break
        
        # Find paths between matched nodes using BFS
        def find_shortest_path(start_func, end_func, max_depth):
            """Find shortest path between two functions using BFS"""
            if start_func == end_func:
                return []
                
            # BFS queue: (current_node, path_so_far, current_depth)
            queue = deque([(start_func, [], 0)])
            visited = {start_func}
            
            while queue:
                current_func, path, depth = queue.popleft()
                
                if depth >= max_depth:
                    continue
                
                # Check both forward and backward edges
                edges_to_check = []
                
                # Forward edges (caller -> callee)
                for edge in caller_to_callees.get(current_func, []):
                    edges_to_check.append(('caller_to_callee', edge))
                
                # Backward edges (callee -> caller) 
                for edge in callee_to_callers.get(current_func, []):
                    edges_to_check.append(('callee_to_caller', edge))
                
                for direction, edge in edges_to_check:
                    next_func = edge['node']
                    
                    if next_func == end_func:
                        # Found target! Build the complete path
                        complete_path = path + [{
                            'from': current_func,
                            'to': next_func,
                            'call_line': edge['call_line'],
                            'direction': direction
                        }]
                        return complete_path
                    
                    if next_func not in visited:
                        visited.add(next_func)
                        new_path = path + [{
                            'from': current_func,
                            'to': next_func,
                            'call_line': edge['call_line'],
                            'direction': direction
                        }]
                        queue.append((next_func, new_path, depth + 1))
            
            return None  # No path found
        
        # Find paths between all pairs of matched RAG functions
        paths = []
        matched_functions = list(rag_node_to_function.values())
        
        # Track unique intermediate nodes and edges across all paths
        all_intermediate_nodes = set()
        all_unique_edges = set()
        
        for i, func1 in enumerate(matched_functions):
            for j, func2 in enumerate(matched_functions):
                if i != j:  # Don't find path from function to itself
                    path = find_shortest_path(func1, func2, max_depth)
                    if path:
                        # Convert to output format
                        path_nodes = [func1]
                        path_edges = []
                        
                        for edge in path:
                            path_nodes.append(edge['to'])
                            path_edges.append({
                                'from': edge['from'],
                                'to': edge['to'],
                                'call_line': edge['call_line']
                            })
                            
                            # Add edge to unique edges set (using tuple for hashability)
                            edge_tuple = (edge['from'], edge['to'], edge['call_line'])
                            all_unique_edges.add(edge_tuple)
                        
                        # Add intermediate nodes to unique set (exclude start and end nodes)
                        intermediate_nodes = path_nodes[1:-1]
                        all_intermediate_nodes.update(intermediate_nodes)
                        
                        # Determine path type
                        path_type = 'bidirectional'
                        if all(edge['direction'] == 'caller_to_callee' for edge in path):
                            path_type = 'caller_to_callee'
                        elif all(edge['direction'] == 'callee_to_caller' for edge in path):
                            path_type = 'callee_to_caller'
                        
                        paths.append({
                            'from_node': rag_node_to_function.get(
                                next((ast_ref for ast_ref, f in rag_node_to_function.items() if f == func1), ''),
                                func1
                            ),
                            'to_node': rag_node_to_function.get(
                                next((ast_ref for ast_ref, f in rag_node_to_function.items() if f == func2), ''),
                                func2
                            ),
                            'path_nodes': intermediate_nodes,  # intermediate nodes only
                            'path_edges': path_edges,
                            'path_length': len(path_edges),
                            'path_type': path_type
                        })
        
        # Convert unique edges back to list of dictionaries
        unique_edges_list = [
            {
                'from': edge[0],
                'to': edge[1], 
                'call_line': edge[2]
            }
            for edge in all_unique_edges
        ]
        
        return {
            'matched_nodes': matched_nodes,
            'paths': paths,
            'unique_intermediate_nodes': list(all_intermediate_nodes),
            'unique_edges': unique_edges_list
        }
        
    except Exception as e:
        print(f"Error in find_paths_between_rag_nodes: {str(e)}")
        return {
            'matched_nodes': [],
            'paths': []
        }

def find_python_files(directory_path, max_files=100, verbose=False):
    """Find all Python files in a directory (recursively), excluding third-party packages"""
    python_files = []
    skipped_dirs = []
    directory = pathlib.Path(directory_path)
    
    if not directory.exists() or not directory.is_dir():
        return []
    
    # Directories to skip (third-party packages, virtual environments, build artifacts)
    skip_dirs = {
        'venv', '.venv', 'env', 'virtualenv',  # Virtual environments
        'site-packages', 'dist-packages',      # Package installations
        '__pycache__', '.pytest_cache',        # Cache directories
        'build', 'dist', 'egg-info',           # Build artifacts
        '.git', '.svn', '.hg',                 # Version control
        'node_modules',                        # Node.js (might contain Python)
        '.tox', '.coverage',                   # Testing/coverage tools
        'htmlcov', 'coverage_html_report',     # Coverage reports
        '.mypy_cache', '.dmypy.json',          # Type checking cache
        '.vscode', '.idea', '.pycharm',        # IDE directories
        'migrations',                          # Django migrations (often auto-generated)
    }
    
    def should_skip_directory(path):
        """Check if a directory should be skipped"""
        dir_name = path.name.lower()
        
        # Skip if directory name matches skip list
        if dir_name in skip_dirs:
            return True
            
        # Skip if directory name starts with dot (hidden directories)
        if dir_name.startswith('.') and dir_name not in {'.', '..'}:
            return True
            
        # Skip if it's a site-packages-like directory
        if 'site-packages' in str(path).lower():
            return True
            
        # Skip if it's inside a virtual environment
        path_str = str(path).lower()
        venv_indicators = ['venv', 'virtualenv', 'env']
        for indicator in venv_indicators:
            if f'/{indicator}/' in path_str or f'\\{indicator}\\' in path_str:
                return True
                
        return False
    
    try:
        # Walk through directory tree manually to control skipping
        for root, dirs, files in os.walk(directory):
            root_path = pathlib.Path(root)
            
            # Skip this directory if it should be skipped
            if should_skip_directory(root_path):
                if verbose:
                    skipped_dirs.append(str(root_path))
                continue
                
            # Remove directories we want to skip from dirs list
            # This prevents os.walk from descending into them
            dirs_to_remove = []
            for d in dirs:
                if should_skip_directory(root_path / d):
                    if verbose:
                        skipped_dirs.append(str(root_path / d))
                    dirs_to_remove.append(d)
            
            for d in dirs_to_remove:
                dirs.remove(d)
            
            # Add Python files from this directory
            for file in files:
                if file.endswith('.py') and not file.startswith('.'):
                    file_path = root_path / file
                    python_files.append(str(file_path))
                    
                    if len(python_files) >= max_files:
                        if verbose:
                            print(f"Reached max_files limit ({max_files})")
                        return python_files, skipped_dirs if verbose else python_files
        
        if verbose:
            print(f"Found {len(python_files)} Python files")
            if skipped_dirs:
                print(f"Skipped {len(skipped_dirs)} directories")
            return python_files, skipped_dirs
        
        return python_files
    except Exception as e:
        print(f"Error finding Python files: {e}")
        return [] if not verbose else ([], [])

def read_file_safely(file_path):
    """Safely read a Python file with error handling"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return content
    except UnicodeDecodeError:
        # Try with different encoding
        try:
            with open(file_path, 'r', encoding='latin-1') as f:
                content = f.read()
            return content
        except Exception as e:
            print(f"Error reading file {file_path}: {e}")
            return None
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
        return None

def analyze_codebase_files(file_paths):
    """Analyze multiple Python files and combine results"""
    combined_results = {
        'files': [],
        'combined_inheritance': {
            'classes': [],
            'functions': []
        },
        'combined_callgraph': {
            'functions': [],
            'calls': []
        },
        'errors': []
    }
    
    for file_path in file_paths:
        try:
            code = read_file_safely(file_path)
            if code is None:
                combined_results['errors'].append({
                    'file': file_path,
                    'error': 'Could not read file'
                })
                continue
            
            # Skip empty files
            if not code.strip():
                continue
            
            # Parse the code into AST
            tree = ast.parse(code)
            
            # Analyze this file
            ast_dict = ast_to_dict(tree)
            classes = extract_classes_from_ast(tree)
            functions = extract_functions_from_ast(tree)
            call_info = extract_function_calls(tree)
            
            # Add file path context to classes and functions
            for cls in classes:
                cls['file_path'] = file_path
            for func in functions:
                func['file_path'] = file_path
            for func in call_info['functions']:
                func['file_path'] = file_path
            for call in call_info['calls']:
                call['file_path'] = file_path
            
            # Store individual file analysis
            file_analysis = {
                'file_path': file_path,
                'ast': ast_dict,
                'inheritance': {
                    'classes': classes,
                    'functions': functions
                },
                'callgraph': {
                    'functions': call_info['functions'],
                    'calls': call_info['calls']
                }
            }
            combined_results['files'].append(file_analysis)
            
            # Add to combined results
            combined_results['combined_inheritance']['classes'].extend(classes)
            combined_results['combined_inheritance']['functions'].extend(functions)
            combined_results['combined_callgraph']['functions'].extend(call_info['functions'])
            combined_results['combined_callgraph']['calls'].extend(call_info['calls'])
            
        except SyntaxError as e:
            combined_results['errors'].append({
                'file': file_path,
                'error': f'Syntax error: {str(e)}'
            })
        except Exception as e:
            combined_results['errors'].append({
                'file': file_path,
                'error': f'Analysis error: {str(e)}'
            })
    
    return combined_results

@app.route('/api/analyze-codebase', methods=['POST'])
def analyze_codebase():
    """Analyze an entire codebase from a local directory"""
    try:
        data = request.get_json()
        directory_path = data.get('directory_path', '')
        max_files = data.get('max_files', 100)  # Limit to prevent overwhelming
        
        if not directory_path:
            return jsonify({'error': 'Directory path is required'}), 400
        
        # Security check: ensure the path exists and is a directory
        if not os.path.exists(directory_path) or not os.path.isdir(directory_path):
            return jsonify({'error': 'Invalid directory path'}), 400
        
        # Find all Python files in the directory
        python_files, skipped_dirs = find_python_files(directory_path, max_files, verbose=True)
        
        if not python_files:
            return jsonify({
                'success': True,
                'message': 'No Python files found in directory',
                'directory_path': directory_path,
                'files_analyzed': 0,
                'files': [],
                'combined_analysis': {
                    'inheritance': {'classes': [], 'functions': []},
                    'callgraph': {'functions': [], 'calls': []}
                },
                'errors': [],
                'skipped_directories': skipped_dirs
            })
        
        # Analyze all the Python files
        analysis_results = analyze_codebase_files(python_files)
        
        # Calculate some statistics
        total_classes = len(analysis_results['combined_inheritance']['classes'])
        total_functions = len(analysis_results['combined_inheritance']['functions'])
        total_calls = len(analysis_results['combined_callgraph']['calls'])
        
        return jsonify({
            'success': True,
            'directory_path': directory_path,
            'files_analyzed': len(analysis_results['files']),
            'files_found': len(python_files),
            'skipped_directories': skipped_dirs,
            'statistics': {
                'total_classes': total_classes,
                'total_functions': total_functions,
                'total_calls': total_calls,
                'files_with_errors': len(analysis_results['errors']),
                'directories_skipped': len(skipped_dirs)
            },
            'files': analysis_results['files'],
            'combined_analysis': {
                'inheritance': analysis_results['combined_inheritance'],
                'callgraph': analysis_results['combined_callgraph']
            },
            'errors': analysis_results['errors']
        })
        
    except Exception as e:
        print(f"Error analyzing codebase: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'Error analyzing codebase: {str(e)}'
        }), 500

@app.route('/api/rag-query-codebase', methods=['POST'])
def rag_query_codebase():
    """Process natural language query across an entire codebase directory"""
    try:
        data = request.get_json()
        directory_path = data.get('directory_path', '')
        query = data.get('query', '')
        max_files = data.get('max_files', 50)  # Smaller limit for RAG to avoid memory issues
        
        if not directory_path or not query:
            return jsonify({'error': 'Directory path and query are required'}), 400
        
        # Security check
        if not os.path.exists(directory_path) or not os.path.isdir(directory_path):
            return jsonify({'error': 'Invalid directory path'}), 400
        
        # Find all Python files
        python_files, skipped_dirs = find_python_files(directory_path, max_files, verbose=True)
        
        if not python_files:
            return jsonify({
                'success': True,
                'query': query,
                'directory_path': directory_path,
                'message': 'No Python files found in directory',
                'results': [],
                'skipped_directories': skipped_dirs,
                'visualization_data': {'inheritance': {'classes': [], 'functions': []}, 'callgraph': {'functions': [], 'calls': []}}
            })
        
        # Collect all code chunks from all files
        all_chunks = []
        file_chunk_mapping = []  # Track which chunk belongs to which file
        
        for file_path in python_files:
            code = read_file_safely(file_path)
            if code and code.strip():
                try:
                    # Parse and chunk the code
                    file_chunks = chunk_code_by_ast(code)
                    
                    for chunk in file_chunks:
                        # Add file context to chunk
                        chunk['file_path'] = file_path
                        all_chunks.append(chunk)
                        file_chunk_mapping.append(file_path)
                        
                except Exception as e:
                    print(f"Error chunking file {file_path}: {e}")
                    continue
        
        if not all_chunks:
            return jsonify({
                'success': True,
                'query': query,
                'directory_path': directory_path,
                'message': 'No valid code chunks found',
                'results': [],
                'skipped_directories': skipped_dirs,
                'visualization_data': {'inheritance': {'classes': [], 'functions': []}, 'callgraph': {'functions': [], 'calls': []}}
            })
        
        # Create embeddings for all chunks
        chunk_contents = [chunk['content'] for chunk in all_chunks]
        embeddings = create_embeddings(chunk_contents)
        
        # Perform semantic search
        search_results = semantic_search(query, chunk_contents, embeddings, top_k=10)
        
        # Enhance results with file context and AST coordinates
        enhanced_results = []
        processed_files = set()
        
        for result in search_results:
            chunk_idx = result['index']
            chunk = all_chunks[chunk_idx]
            file_path = chunk['file_path']
            
            # Read the file for AST processing if not already processed
            if file_path not in processed_files:
                code = read_file_safely(file_path)
                if code:
                    try:
                        tree = ast.parse(code)
                        line_mapping = create_line_to_ast_mapping(tree)
                        processed_files.add(file_path)
                    except:
                        tree = None
                        line_mapping = {}
                else:
                    tree = None
                    line_mapping = {}
            
            base_result = {
                'snippet': result['snippet'],
                'score': result['score'],
                'type': chunk.get('type', 'unknown'),
                'name': chunk.get('name', 'Unknown'),
                'line_start': chunk.get('line_start'),
                'line_end': chunk.get('line_end'),
                'file_path': file_path
            }
            
            # Enhance with AST coordinates if possible
            if tree and line_mapping:
                enhanced_result = enhance_rag_result_with_ast_ref(base_result, tree, line_mapping)
            else:
                enhanced_result = base_result
            
            enhanced_results.append(enhanced_result)
        
        # Get visualization data from analyzed files
        analysis_results = analyze_codebase_files(python_files)
        
        # Find paths between RAG result nodes in call graph
        rag_paths = find_paths_between_rag_nodes(
            enhanced_results,
            analysis_results['combined_callgraph']['functions'],
            analysis_results['combined_callgraph']['calls']
        )
        
        return jsonify({
            'success': True,
            'query': query,
            'directory_path': directory_path,
            'files_processed': len(python_files),
            'chunks_processed': len(all_chunks),
            'results': enhanced_results,
            'skipped_directories': skipped_dirs,
            'visualization_data': {
                'inheritance': analysis_results['combined_inheritance'],
                'callgraph': {
                    'functions': analysis_results['combined_callgraph']['functions'],
                    'calls': analysis_results['combined_callgraph']['calls'],
                    'rag_paths': rag_paths
                }
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error processing codebase query: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000) 