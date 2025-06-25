#!/usr/bin/env python3
"""
Test script to verify Prism setup is working correctly
"""

import requests
import json
import time

def test_backend():
    """Test the backend AST extraction endpoint"""
    print("🔍 Testing Backend...")
    
    try:
        # Test health endpoint
        response = requests.get('http://localhost:5000/api/health')
        if response.status_code == 200:
            print("✅ Backend health check passed")
        else:
            print("❌ Backend health check failed")
            return False
            
        # Test AST extraction
        test_code = """
def hello_world():
    print("Hello, World!")
    return "success"
"""
        
        response = requests.post('http://localhost:5000/api/ast', 
                               json={'code': test_code})
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ AST extraction working")
                return True
            else:
                print(f"❌ AST extraction failed: {data.get('error')}")
                return False
        else:
            print(f"❌ AST endpoint failed with status {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Backend not accessible - make sure it's running on port 5000")
        return False
    except Exception as e:
        print(f"❌ Backend test error: {e}")
        return False

def test_frontend():
    """Test the frontend web interface"""
    print("🔍 Testing Frontend...")
    
    try:
        response = requests.get('http://localhost:3000/api/health')
        if response.status_code == 200:
            print("✅ Frontend health check passed")
            return True
        else:
            print("❌ Frontend health check failed")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Frontend not accessible - make sure it's running on port 3000")
        return False
    except Exception as e:
        print(f"❌ Frontend test error: {e}")
        return False

def main():
    print("🔮 Prism Setup Test")
    print("=" * 50)
    
    # Wait a moment for services to start
    print("⏳ Waiting for services to start...")
    time.sleep(2)
    
    backend_ok = test_backend()
    frontend_ok = test_frontend()
    
    print("\n" + "=" * 50)
    if backend_ok and frontend_ok:
        print("🎉 All tests passed! Prism is ready to use.")
        print("\n📱 Open your browser and go to: http://localhost:3000")
        print("🔧 Backend API: http://localhost:5000")
    else:
        print("❌ Some tests failed. Please check the setup.")
        
        if not backend_ok:
            print("\n🔧 Backend issues:")
            print("   - Make sure you're in the backend directory")
            print("   - Activate virtual environment: .venv\\Scripts\\activate")
            print("   - Run: python app.py")
            
        if not frontend_ok:
            print("\n🔧 Frontend issues:")
            print("   - Make sure you're in the frontend directory")
            print("   - Run: npm install")
            print("   - Run: npm run build")
            print("   - Run: npm start")

if __name__ == "__main__":
    main() 