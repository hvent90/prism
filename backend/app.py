from flask import Flask, request, jsonify
from flask_cors import CORS
import ast
import json

app = Flask(__name__)
CORS(app)

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
    """Extract all class definitions from AST"""
    classes = []
    
    def visit_node(node):
        if isinstance(node, ast.ClassDef):
            class_info = extract_class_info(node)
            if class_info:
                classes.append(class_info)
        
        # Recursively visit child nodes
        for child in ast.iter_child_nodes(node):
            visit_node(child)
    
    visit_node(tree)
    return classes

def extract_function_calls(tree):
    """Extract function definitions and their calls from AST"""
    functions = {}
    calls = []
    
    def get_full_name(node):
        """Get the full name of a function call (e.g., 'obj.method' or 'func')"""
        if isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Attribute):
            return f"{get_full_name(node.value)}.{node.attr}"
        else:
            return ast.unparse(node) if hasattr(ast, 'unparse') else str(node)
    
    def visit_node(node, current_function=None):
        if isinstance(node, ast.FunctionDef):
            # Extract function definition
            params = [arg.arg for arg in node.args.args]
            functions[node.name] = {
                'name': node.name,
                'params': params,
                'calls': [],
                'lineno': node.lineno,
                'docstring': ast.get_docstring(node)
            }
            current_function = node.name
        
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
        
        # Recursively visit child nodes
        for child in ast.iter_child_nodes(node):
            visit_node(child, current_function)
    
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
    
    return {
        'functions': list(functions.values()),
        'calls': calls
    }

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

@app.route('/api/inheritance', methods=['POST'])
def extract_inheritance():
    """Extract class inheritance hierarchy from Python code"""
    try:
        data = request.get_json()
        code = data.get('code', '')
        
        if not code:
            return jsonify({'error': 'No code provided'}), 400
        
        # Parse the code into AST
        tree = ast.parse(code)
        
        # Extract class information
        classes = extract_classes_from_ast(tree)
        
        return jsonify({
            'success': True,
            'classes': classes
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

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'prism-backend'})

if __name__ == '__main__':
    app.run(debug=True, port=5000) 