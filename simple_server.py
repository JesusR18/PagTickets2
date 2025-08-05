#!/usr/bin/env python3
"""
Servidor ultra-simple para Railway - Versión minimalista absoluta
"""

import http.server
import socketserver
import os
import sys

PORT = int(os.environ.get('PORT', 8000))

class SimpleHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'OK')
    
    def do_POST(self):
        self.do_GET()
    
    def log_message(self, format, *args):
        pass  # Silenciar logs

print(f"Starting server on port {PORT}")
with socketserver.TCPServer(("0.0.0.0", PORT), SimpleHandler) as httpd:
    print(f"Server running on http://0.0.0.0:{PORT}")
    httpd.serve_forever()
