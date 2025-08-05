#!/usr/bin/env python3
"""
Servidor absolutamente minimal para Railway
Solo responde OK a cualquier request
"""

import http.server
import socketserver
import os

PORT = int(os.environ.get('PORT', 8000))

class MinimalHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'OK')
    
    def do_POST(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'OK')
    
    def log_message(self, format, *args):
        pass

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), MinimalHandler) as httpd:
        print(f"Server on port {PORT}")
        httpd.serve_forever()
