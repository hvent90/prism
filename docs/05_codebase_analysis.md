# Codebase Analysis Feature

## Overview

The Prism backend now supports analyzing entire local codebases instead of just single code strings from the web editor. This feature allows you to:

- Analyze all Python files in a directory (recursively)
- Perform RAG queries across multiple files
- Get combined analysis results for classes, functions, and call graphs
- Maintain file context for all analysis results

## New Endpoints

### 1. `/api/analyze-codebase` (POST)

Analyzes all Python files in a local directory.

**Request Body:**
```json
{
  "directory_path": "/path/to/your/codebase",
  "max_files": 100  // Optional, defaults to 100
}
```

**Response:**
```json
{
  "success": true,
  "directory_path": "/path/to/your/codebase",
  "files_analyzed": 15,
  "files_found": 15,
  "statistics": {
    "total_classes": 25,
    "total_functions": 120,
    "total_calls": 350,
    "files_with_errors": 0
  },
  "files": [
    {
      "file_path": "/path/to/file1.py",
      "ast": { /* AST structure */ },
      "inheritance": {
        "classes": [ /* Class definitions with file_path */ ],
        "functions": [ /* Function definitions with file_path */ ]
      },
      "callgraph": {
        "functions": [ /* Function info with file_path */ ],
        "calls": [ /* Call relationships with file_path */ ]
      }
    }
    // ... more files
  ],
  "combined_analysis": {
    "inheritance": {
      "classes": [ /* All classes from all files */ ],
      "functions": [ /* All functions from all files */ ]
    },
    "callgraph": {
      "functions": [ /* All functions from all files */ ],
      "calls": [ /* All calls from all files */ ]
    }
  },
  "errors": [ /* Any files that couldn't be processed */ ]
}
```

### 2. `/api/rag-query-codebase` (POST)

Performs semantic search across all Python files in a directory.

**Request Body:**
```json
{
  "directory_path": "/path/to/your/codebase",
  "query": "authentication and user login",
  "max_files": 50  // Optional, defaults to 50 for performance
}
```

**Response:**
```json
{
  "success": true,
  "query": "authentication and user login",
  "directory_path": "/path/to/your/codebase",
  "files_processed": 25,
  "chunks_processed": 180,
  "results": [
    {
      "snippet": "def authenticate_user(username, password):\n    ...",
      "score": 0.85,
      "type": "function",
      "name": "authenticate_user",
      "line_start": 45,
      "line_end": 60,
      "file_path": "/path/to/auth.py",
      "ast_reference": { /* AST coordinates */ }
    }
    // ... more results
  ],
  "visualization_data": {
    "inheritance": { /* Combined inheritance data */ },
    "callgraph": { /* Combined call graph data */ }
  }
}
```

## Features

### File Discovery
- Recursively finds all `.py` files in the specified directory
- Configurable file limit to prevent memory issues
- Graceful handling of permission errors and unreadable files

### Error Handling
- Individual file errors don't stop the entire analysis
- Comprehensive error reporting per file
- Support for different file encodings (UTF-8, latin-1)
- Syntax error isolation

### Security
- Path validation to ensure directory exists
- Prevention of path traversal attacks
- File size and count limits

### Enhanced Results
- All analysis results include `file_path` context
- Combined views across all files
- Individual file breakdowns
- Statistics and summaries

## Usage Examples

### Python Client Example

```python
import requests

# Analyze entire codebase
response = requests.post("http://localhost:5000/api/analyze-codebase", json={
    "directory_path": "/path/to/your/project",
    "max_files": 50
})

if response.status_code == 200:
    data = response.json()
    print(f"Analyzed {data['files_analyzed']} files")
    print(f"Found {data['statistics']['total_classes']} classes")
    print(f"Found {data['statistics']['total_functions']} functions")

# Query codebase
response = requests.post("http://localhost:5000/api/rag-query-codebase", json={
    "directory_path": "/path/to/your/project",
    "query": "database connection and models"
})

if response.status_code == 200:
    data = response.json()
    for result in data['results'][:5]:  # Top 5 results
        print(f"{result['name']} in {result['file_path']} (score: {result['score']:.2f})")
```

### Testing

Use the provided test script:

```bash
# Make sure Flask server is running
cd backend
python app.py

# In another terminal, run the test
python test_codebase_analysis.py
```

## Performance Considerations

### File Limits
- **Analysis endpoint**: Default 100 files max
- **RAG endpoint**: Default 50 files max (embeddings are memory-intensive)
- Configurable via `max_files` parameter

### Memory Usage
- Each file is processed individually to minimize memory footprint
- Code chunking reduces memory usage for large files
- Embedding batching for efficient processing

### Processing Time
- Proportional to codebase size
- AST parsing is generally fast
- Embedding generation is the slowest step for RAG queries

## Integration with Frontend

The frontend can be extended to:

1. **Directory Picker**: Add a file/directory picker component
2. **Codebase View**: Show analysis results with file context
3. **Cross-file Navigation**: Jump between related functions across files
4. **Project-wide Search**: Enhanced search across entire projects

### Proposed UI Changes

```typescript
// New API service methods
export const analyzeCodebase = async (directoryPath: string, maxFiles?: number) => {
  const response = await fetch('/api/analyze-codebase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ directory_path: directoryPath, max_files: maxFiles })
  });
  return response.json();
};

export const ragQueryCodebase = async (directoryPath: string, query: string, maxFiles?: number) => {
  const response = await fetch('/api/rag-query-codebase', {
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ directory_path: directoryPath, query, max_files: maxFiles })
  });
  return response.json();
};
```

## Future Enhancements

1. **Multiple Language Support**: Extend beyond Python to JavaScript, TypeScript, etc.
2. **Incremental Analysis**: Only re-analyze changed files
3. **Caching**: Cache analysis results for faster subsequent queries
4. **Git Integration**: Analyze specific commits or branches
5. **Project Templates**: Pre-configured analysis for common project structures
6. **Database Storage**: Persist analysis results for large codebases 