from flask import Flask, request, jsonify
from flask_cors import CORS
import ast
import json
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
                    'calls': call_info['calls']
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

if __name__ == '__main__':
    app.run(debug=True, port=5000) 