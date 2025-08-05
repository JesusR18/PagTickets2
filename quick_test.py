#!/usr/bin/env python3
"""Quick manual test"""

import urllib.request
import urllib.error

try:
    print("Testing server at http://localhost:8080...")
    with urllib.request.urlopen("http://localhost:8080/", timeout=5) as response:
        status = response.getcode()
        content = response.read().decode('utf-8')
        print(f"✅ Status: {status}")
        print(f"✅ Response: '{content}'")
        print("Server is working!")
except urllib.error.URLError as e:
    print(f"❌ Connection failed: {e}")
    print("Trying port 8000...")
    try:
        with urllib.request.urlopen("http://localhost:8000/", timeout=5) as response:
            status = response.getcode()
            content = response.read().decode('utf-8')
            print(f"✅ Status: {status}")
            print(f"✅ Response: '{content}'")
            print("Server is working on port 8000!")
    except Exception as e2:
        print(f"❌ Both ports failed: {e2}")
except Exception as e:
    print(f"❌ Test failed: {e}")
