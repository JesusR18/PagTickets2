# Configuración específica para PWA en Railway
import os

# Configurar headers para PWA
PWA_HEADERS = {
    'Cache-Control': 'public, max-age=31536000',  # 1 año para assets
    'Service-Worker-Allowed': '/',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
}

# Headers específicos para Service Worker
SW_HEADERS = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Service-Worker-Allowed': '/',
}

# Headers para manifest.json
MANIFEST_HEADERS = {
    'Content-Type': 'application/manifest+json',
    'Cache-Control': 'public, max-age=86400',  # 1 día
}

def configure_pwa_headers(response, file_type='static'):
    """Configurar headers apropiados para PWA según el tipo de archivo"""
    if file_type == 'sw':
        for header, value in SW_HEADERS.items():
            response[header] = value
    elif file_type == 'manifest':
        for header, value in MANIFEST_HEADERS.items():
            response[header] = value
    else:
        for header, value in PWA_HEADERS.items():
            response[header] = value
    
    return response
