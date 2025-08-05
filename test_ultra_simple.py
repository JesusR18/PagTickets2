"""
Test del build ultra-simple
"""

import os
import sys

def test_ultra_simple_build():
    print("🚀 TEST ULTRA SIMPLE BUILD")
    print("=" * 40)
    
    try:
        # Test 1: Variables de entorno
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings_ultra_simple')
        print("✅ Environment variables set")
        
        # Test 2: Django import
        import django
        print(f"✅ Django version: {django.get_version()}")
        
        # Test 3: Django setup
        django.setup()
        print("✅ Django setup complete")
        
        # Test 4: Settings check
        from django.conf import settings
        print(f"✅ Settings module: {settings.SETTINGS_MODULE}")
        print(f"✅ Debug mode: {settings.DEBUG}")
        print(f"✅ Installed apps: {len(settings.INSTALLED_APPS)}")
        
        # Test 5: Database config
        print(f"✅ Database engine: {settings.DATABASES['default']['ENGINE']}")
        
        print("\n🎉 ULTRA SIMPLE BUILD TEST PASSED!")
        return True
        
    except Exception as e:
        print(f"\n❌ BUILD TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_ultra_simple_build()
    sys.exit(0 if success else 1)
