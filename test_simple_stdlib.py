#!/usr/bin/env python3
"""Test the simple_server.py locally using only standard library"""

import subprocess
import time
import urllib.request
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
        time.sleep(3)
        
        # Test the server using urllib
        print("Testing server response...")
        with urllib.request.urlopen("http://localhost:8000/", timeout=5) as response:
            status_code = response.getcode()
            content = response.read().decode('utf-8')
            headers = dict(response.headers)
        
        print(f"Status Code: {status_code}")
        print(f"Response: {content}")
        print(f"Headers: {headers}")
        
        if status_code == 200:
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
            try:
                server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server_process.kill()
        print("Server stopped.")

if __name__ == "__main__":
    success = test_simple_server()
    sys.exit(0 if success else 1)
