"""
Vista ultra-simple de healthcheck para Railway
Responde inmediatamente sin dependencias complejas
"""

from django.http import HttpResponse

def railway_ping(request):
    """Vista minimalista para Railway healthcheck"""
    return HttpResponse("OK", content_type="text/plain", status=200)

# Esta función se puede usar directamente en Railway
ping = railway_ping
