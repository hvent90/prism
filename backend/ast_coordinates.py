"""
AST Coordinate System Utilities for Prism Dashboard
Provides standardized AST coordinate references for cross-panel highlighting
"""

import ast
from typing import Dict, List, Any, Optional

def create_ast_reference(node: ast.AST, tree: ast.AST = None) -> Dict[str, Any]:
    """Create standardized AST coordinate for any node"""
    return {
        'node_id': f"{node.__class__.__name__}_{node.lineno}_{getattr(node, 'col_offset', 0)}",
        'line': node.lineno,
        'col': getattr(node, 'col_offset', None),
        'end_line': getattr(node, 'end_lineno', node.lineno),
        'end_col': getattr(node, 'end_col_offset', None),
        'node_type': node.__class__.__name__,
        'node_path': get_node_path_from_tree(tree, node) if tree else get_node_path(node)
    }

def get_node_path(node: ast.AST, parent_path: List[str] = None) -> List[str]:
    """Generate hierarchical path for AST node"""
    if parent_path is None:
        parent_path = ['Module']  # All nodes are under Module
    
    path = parent_path.copy()
    
    if isinstance(node, ast.ClassDef):
        path.append('ClassDef')
    elif isinstance(node, ast.FunctionDef):
        path.append('FunctionDef')
    elif isinstance(node, ast.AsyncFunctionDef):
        path.append('AsyncFunctionDef')
    
    return path

def get_node_path_from_tree(tree: ast.AST, target_node: ast.AST) -> List[str]:
    """Generate hierarchical path for AST node by traversing the tree"""
    path = ['Module']
    
    def find_path(node: ast.AST, current_path: List[str]) -> List[str]:
        if node is target_node:
            return current_path
        
        # Add current node to path if it's a structural node
        new_path = current_path.copy()
        if isinstance(node, ast.ClassDef):
            new_path.append('ClassDef')
        elif isinstance(node, ast.FunctionDef):
            new_path.append('FunctionDef')
        elif isinstance(node, ast.AsyncFunctionDef):
            new_path.append('AsyncFunctionDef')
        
        # Search children
        for child in ast.iter_child_nodes(node):
            result = find_path(child, new_path)
            if result:
                return result
        
        return []
    
    result = find_path(tree, path)
    return result if result else path

def enhance_class_with_ast_refs(class_info: Dict[str, Any], class_node: ast.ClassDef, tree: ast.AST = None) -> Dict[str, Any]:
    """Enhance class information with AST coordinates"""
    enhanced_class = class_info.copy()
    enhanced_class['ast_ref'] = create_ast_reference(class_node, tree)
    
    # Enhance methods with AST coordinates
    if 'methods' in enhanced_class:
        method_nodes = []
        for item in class_node.body:
            if isinstance(item, ast.FunctionDef):
                method_nodes.append(item)
        
        # Match methods by name and line number
        for method_info in enhanced_class['methods']:
            for method_node in method_nodes:
                if (method_info['name'] == method_node.name and 
                    method_info.get('lineno') == method_node.lineno):
                    method_info['ast_ref'] = create_ast_reference(method_node, tree)
                    break
    
    return enhanced_class

def enhance_function_with_ast_refs(function_info: Dict[str, Any], function_node: ast.FunctionDef, tree: ast.AST = None) -> Dict[str, Any]:
    """Enhance function information with AST coordinates"""
    enhanced_function = function_info.copy()
    enhanced_function['ast_ref'] = create_ast_reference(function_node, tree)
    return enhanced_function

def find_ast_node_by_line(tree: ast.AST, line_number: int, node_type: Optional[str] = None) -> Optional[ast.AST]:
    """Find AST node by line number and optionally by type"""
    for node in ast.walk(tree):
        if (hasattr(node, 'lineno') and node.lineno == line_number):
            if node_type is None or node.__class__.__name__ == node_type:
                return node
    return None

def create_line_to_ast_mapping(tree: ast.AST) -> Dict[int, List[ast.AST]]:
    """Create mapping from line numbers to AST nodes"""
    line_mapping = {}
    
    for node in ast.walk(tree):
        if hasattr(node, 'lineno'):
            line = node.lineno
            if line not in line_mapping:
                line_mapping[line] = []
            line_mapping[line].append(node)
    
    return line_mapping

def enhance_rag_result_with_ast_ref(
    result: Dict[str, Any], 
    tree: ast.AST, 
    line_mapping: Dict[int, List[ast.AST]]
) -> Dict[str, Any]:
    """Enhance RAG result with AST coordinate reference"""
    enhanced_result = result.copy()
    
    # Try to find corresponding AST node
    line_start = result.get('line_start')
    result_type = result.get('type', '').lower()
    
    if line_start and line_start in line_mapping:
        nodes_at_line = line_mapping[line_start]
        
        # Find the most appropriate node based on result type
        target_node = None
        
        if result_type == 'function':
            # Look for FunctionDef nodes
            for node in nodes_at_line:
                if isinstance(node, ast.FunctionDef):
                    target_node = node
                    break
        elif result_type == 'class':
            # Look for ClassDef nodes
            for node in nodes_at_line:
                if isinstance(node, ast.ClassDef):
                    target_node = node
                    break
        else:
            # For 'global' or other types, take the first meaningful node
            for node in nodes_at_line:
                if isinstance(node, (ast.FunctionDef, ast.ClassDef, ast.Assign)):
                    target_node = node
                    break
        
        if target_node:
            enhanced_result['ast_ref'] = create_ast_reference(target_node)
    
    return enhanced_result 