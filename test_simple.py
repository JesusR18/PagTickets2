#!/usr/bin/env python3
"""Test the simple_server.py locally"""

import subprocess
import time
import requests
import sys
import os

def test_simple_server():
    """Test the ultra-minimal server"""
    print("Testing simple_server.py...")
    
    # Start the server in background
    server_process = None
    try:
        # Change to the correct directory
        os.chdir(r"c:\Users\MONITOREO6\Downloads\pagTickets\pagTickets\pagTickets-2")
        
        # Start server
        print("Starting simple_server.py...")
        server_process = subprocess.Popen([sys.executable, "simple_server.py"])
        
        # Wait a moment for server to start
        time.sleep(2)
        
        # Test the server
        print("Testing server response...")
        response = requests.get("http://localhost:8000/", timeout=5)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ Server test PASSED!")
            return True
        else:
            print("❌ Server test FAILED!")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False
    finally:
        # Clean up
        if server_process:
            server_process.terminate()
            server_process.wait(timeout=5)
        print("Server stopped.")

if __name__ == "__main__":
    success = test_simple_server()
    sys.exit(0 if success else 1)
