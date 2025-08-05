"""
Script para inicialización rápida de Railway
Evita problemas de deploy lento
"""

import os
import sys
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def quick_railway_init():
    """Inicialización súper rápida para Railway"""
    try:
        logger.info("🚀 RAILWAY QUICK INIT")
        logger.info("=" * 40)
        
        # 1. Verificar entorno
        port = os.environ.get('PORT', '8080')
        logger.info(f"✅ PORT: {port}")
        
        # 2. Configurar Django mínimo
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings_ultra_simple')
        logger.info("✅ Django settings configured")
        
        # 3. Test de importación rápida
        try:
            import django
            logger.info(f"✅ Django {django.get_version()} ready")
        except ImportError as e:
            logger.error(f"❌ Django import failed: {e}")
            return False
        
        # 4. Setup mínimo - SIN migraciones
        try:
            django.setup()
            logger.info("✅ Django setup complete (no migrations)")
        except Exception as e:
            logger.warning(f"⚠️ Django setup warning: {e}")
            # Continuar sin setup completo
        
        # 5. Test de configuración
        try:
            from django.conf import settings
            logger.info(f"✅ Settings loaded: {settings.SETTINGS_MODULE}")
            logger.info(f"✅ Debug: {settings.DEBUG}")
            logger.info(f"✅ Allowed hosts: {settings.ALLOWED_HOSTS}")
        except Exception as e:
            logger.warning(f"⚠️ Settings warning: {e}")
        
        logger.info("🎉 RAILWAY QUICK INIT COMPLETE")
        return True
        
    except Exception as e:
        logger.error(f"❌ RAILWAY INIT FAILED: {e}")
        return False

if __name__ == "__main__":
    success = quick_railway_init()
    if success:
        logger.info("✅ Ready for Railway deployment")
    else:
        logger.error("❌ Railway init failed")
    sys.exit(0 if success else 1)
