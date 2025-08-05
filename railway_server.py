#!/usr/bin/env python3
"""
Servidor HTTP básico sin WSGI para Railway
Garantiza que siempre funcione
"""

import http.server
import socketserver
import os
import sys
import logging
import threading
import signal

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class RailwayHTTPHandler(http.server.BaseHTTPRequestHandler):
    """Handler HTTP ultra-simple para Railway"""
    
    def do_GET(self):
        """Maneja todos los requests GET"""
        try:
            logger.info(f"Railway request: GET {self.path}")
            
            # Respuesta siempre exitosa
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('X-Railway-Status', 'OK')
            self.end_headers()
            
            # Mensaje según la ruta
            if self.path.startswith('/ping'):
                message = 'PONG'
            elif self.path.startswith('/health'):
                message = 'HEALTHY'
            elif self.path == '/' or self.path == '':
                message = 'RAILWAY_OK'
            else:
                message = f'OK_{self.path.replace("/", "_")}'
            
            self.wfile.write(message.encode('utf-8'))
            logger.info(f"Railway response: 200 OK - {message}")
            
        except Exception as e:
            logger.error(f"Error in request handler: {e}")
            # Aún en error, responder OK
            try:
                self.send_response(200)
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'OK_ERROR_HANDLED')
            except:
                pass
    
    def do_POST(self):
        """Maneja requests POST como GET"""
        self.do_GET()
    
    def log_message(self, format, *args):
        """Override logging para evitar spam"""
        logger.info(f"HTTP: {format % args}")

class RailwayServer:
    """Servidor HTTP básico para Railway"""
    
    def __init__(self, port=8080):
        self.port = port
        self.httpd = None
        self.server_thread = None
    
    def start(self):
        """Iniciar servidor"""
        try:
            logger.info(f"🚀 Starting Railway server on port {self.port}")
            
            # Crear servidor
            self.httpd = socketserver.TCPServer(("0.0.0.0", self.port), RailwayHTTPHandler)
            self.httpd.allow_reuse_address = True
            
            logger.info(f"✅ Server created successfully on 0.0.0.0:{self.port}")
            
            # Configurar shutdown graceful
            def signal_handler(signum, frame):
                logger.info("Received shutdown signal")
                self.stop()
                sys.exit(0)
            
            signal.signal(signal.SIGTERM, signal_handler)
            signal.signal(signal.SIGINT, signal_handler)
            
            # Iniciar servidor
            logger.info("🌟 Railway server is ready to handle requests")
            logger.info(f"🔗 Health endpoints: http://0.0.0.0:{self.port}/")
            logger.info(f"🔗 Ping endpoint: http://0.0.0.0:{self.port}/ping")
            logger.info(f"🔗 Health endpoint: http://0.0.0.0:{self.port}/health")
            
            self.httpd.serve_forever()
            
        except Exception as e:
            logger.error(f"❌ Failed to start server: {e}")
            sys.exit(1)
    
    def stop(self):
        """Detener servidor"""
        if self.httpd:
            logger.info("Shutting down server...")
            self.httpd.shutdown()
            self.httpd.server_close()

def main():
    """Función principal"""
    try:
        # Obtener puerto
        port = int(os.environ.get('PORT', 8080))
        logger.info(f"Railway environment PORT: {port}")
        
        # Crear y iniciar servidor
        server = RailwayServer(port)
        server.start()
        
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
