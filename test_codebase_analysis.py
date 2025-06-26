#!/usr/bin/env python3
"""
Test script for codebase analysis endpoints.
This demonstrates how to analyze entire local codebases instead of single code strings.
"""

import requests
import json
import os

# Backend URL
BASE_URL = "http://localhost:5000"

def test_analyze_codebase(directory_path):
    """Test the analyze-codebase endpoint"""
    print(f"Testing codebase analysis for: {directory_path}")
    
    payload = {
        "directory_path": directory_path,
        "max_files": 50  # Limit to prevent overwhelming
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/analyze-codebase", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            if data['success']:
                print("✅ Codebase analysis successful!")
                print(f"📁 Directory: {data['directory_path']}")
                print(f"📄 Files analyzed: {data['files_analyzed']}/{data['files_found']}")
                print(f"📊 Statistics:")
                stats = data['statistics']
                print(f"   - Classes: {stats['total_classes']}")
                print(f"   - Functions: {stats['total_functions']}")
                print(f"   - Function calls: {stats['total_calls']}")
                print(f"   - Files with errors: {stats['files_with_errors']}")
                print(f"   - Directories skipped: {stats.get('directories_skipped', 0)}")
                
                if data.get('skipped_directories'):
                    print(f"\n📁 Skipped directories (first 10):")
                    for skip_dir in data['skipped_directories'][:10]:
                        print(f"   - {skip_dir}")
                    if len(data['skipped_directories']) > 10:
                        print(f"   ... and {len(data['skipped_directories']) - 10} more")
                
                if data['errors']:
                    print("\n⚠️  Errors encountered:")
                    for error in data['errors'][:5]:  # Show first 5 errors
                        print(f"   - {error['file']}: {error['error']}")
                
                return data
            else:
                print(f"❌ Analysis failed: {data.get('error', 'Unknown error')}")
        else:
            print(f"❌ HTTP Error {response.status_code}: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend. Make sure Flask server is running on port 5000")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    return None

def test_rag_query_codebase(directory_path, query):
    """Test the RAG query endpoint for codebases"""
    print(f"\nTesting RAG query on codebase: '{query}'")
    
    payload = {
        "directory_path": directory_path,
        "query": query,
        "max_files": 30  # Smaller limit for RAG
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/rag-query-codebase", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            if data['success']:
                print("✅ RAG query successful!")
                print(f"🔍 Query: {data['query']}")
                print(f"📁 Directory: {data['directory_path']}")
                print(f"📄 Files processed: {data['files_processed']}")
                print(f"🧩 Code chunks processed: {data['chunks_processed']}")
                print(f"📋 Results found: {len(data['results'])}")
                
                if data.get('skipped_directories'):
                    print(f"📁 Directories skipped: {len(data['skipped_directories'])}")
                
                if data['results']:
                    print("\n🎯 Top results:")
                    for i, result in enumerate(data['results'][:3]):  # Show top 3
                        print(f"\n   {i+1}. {result['name']} ({result['type']}) - Score: {result['score']:.3f}")
                        print(f"      File: {result.get('file_path', 'Unknown')}")
                        if result.get('line_start'):
                            print(f"      Lines: {result['line_start']}-{result.get('line_end', '?')}")
                        # Show snippet preview (first 100 chars)
                        snippet_preview = result['snippet'][:100].replace('\n', ' ')
                        print(f"      Preview: {snippet_preview}...")
                
                return data
            else:
                print(f"❌ Query failed: {data.get('error', 'Unknown error')}")
        else:
            print(f"❌ HTTP Error {response.status_code}: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend. Make sure Flask server is running on port 5000")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    return None

def main():
    """Main test function"""
    print("🔬 Codebase Analysis Test Script")
    print("="*50)
    
    # Test with current project directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(current_dir, "backend")
    
    # If backend directory exists, test with it
    if os.path.exists(backend_dir):
        test_directory = backend_dir
        print(f"Testing with backend directory: {test_directory}")
    else:
        # Fallback to current directory
        test_directory = current_dir
        print(f"Testing with current directory: {test_directory}")
    
    # Test 1: Analyze the codebase
    analysis_result = test_analyze_codebase(test_directory)
    
    # Test 2: RAG queries on the codebase
    if analysis_result:
        print("\n" + "="*50)
        test_queries = [
            "Flask routes and endpoints",
            "AST parsing functions",
            "error handling in file reading",
            "embedding and similarity search"
        ]
        
        for query in test_queries:
            test_rag_query_codebase(test_directory, query)
    
    print("\n" + "="*50)
    print("🏁 Testing complete!")

if __name__ == "__main__":
    main() 