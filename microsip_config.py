# Configuración para integración con MicroSIP
# Ajustar estos valores según tu instalación de MicroSIP

# Configuración de base de datos
MICROSIP_DB_CONFIG = {
    'driver': 'ODBC Driver 17 for SQL Server',  # o 'SQL Server' si no tienes ODBC 17
    'server': 'localhost\\SQLEXPRESS',           # Cambiar por tu servidor SQL
    'database': 'MicroSIP',                     # Nombre de la base de datos de MicroSIP
    'trusted_connection': True,                 # Usar autenticación de Windows
    # Si usas usuario/contraseña específicos, cambiar por:
    # 'username': 'tu_usuario',
    # 'password': 'tu_contraseña',
}

# Ruta donde MicroSIP guarda las imágenes de activos fijos
# Esta ruta debe ser accesible para que MicroSIP la detecte automáticamente
MICROSIP_IMAGES_PATH = r"C:\MicroSIP\Imagenes\ActivosFijos"

# Ruta alternativa común en instalaciones de MicroSIP
# MICROSIP_IMAGES_PATH = r"C:\Archivos de programa\MicroSIP\Imagenes\ActivosFijos"

# Nombres de tablas y campos en MicroSIP (según estructura estándar)
MICROSIP_TABLES = {
    'activos_fijos': 'ActivosFijos',             # Nombre típico de tabla
    'fields': {
        'codigo': 'Codigo',                      # Campo código del activo
        'nombre': 'Nombre',                      # Campo nombre del activo
        'grupo': 'Grupo',                        # Campo grupo/categoría (ej: RECURSOS_HUMANOS)
        'fecha_adquisicion': 'FechaAdquisicion', # Campo fecha de compra
        'ubicacion': 'Ubicacion',                # Campo ubicación física
        'descripcion': 'Descripcion',            # Campo descripción/notas
        'activo': 'Activo',                      # Campo estado activo/inactivo
        'ruta_imagen': 'RutaImagen',             # Campo para ruta de imagen
        'asignado_a': 'AsignadoA',               # Campo persona asignada
        'valor_adquisicion': 'ValorAdquisicion', # Campo valor de compra
        'estatus': 'Estatus',                    # Campo estatus (Activo/Inactivo)
        'clave': 'Clave',                        # Campo clave interna (ej: RH001)
    }
}

# Estrategias de integración con MicroSIP
INTEGRATION_STRATEGIES = {
    # Estrategia 1: Exportación directa a carpeta de imágenes
    'direct_export': {
        'enabled': True,
        'description': 'Guarda imagen directamente en carpeta de MicroSIP',
        'auto_detect': True  # MicroSIP detecta automáticamente nuevas imágenes
    },
    
    # Estrategia 2: Actualización de base de datos
    'database_update': {
        'enabled': True,
        'description': 'Actualiza ruta de imagen en base de datos de MicroSIP',
        'field_name': 'RutaImagen'
    },
    
    # Estrategia 3: Naming convention para vincular automáticamente
    'naming_convention': {
        'enabled': True,
        'pattern': '{codigo}.jpg',  # Ej: ESCRITORIO_EN_L.jpg
        'description': 'Nombra archivo según código de activo para vinculación automática'
    }
}

# Configuración de formato de imagen optimizada para MicroSIP
IMAGE_CONFIG = {
    'max_width': 1024,      # Ancho máximo (MicroSIP maneja bien hasta 1024px)
    'max_height': 768,      # Alto máximo 
    'quality': 90,          # Calidad alta para visualización clara
    'format': 'JPEG',       # Formato compatible con MicroSIP
    'progressive': True,    # JPEG progresivo para carga más rápida
}

# Función para generar string de conexión
def get_connection_string():
    if MICROSIP_DB_CONFIG.get('trusted_connection'):
        return (
            f"DRIVER={{{MICROSIP_DB_CONFIG['driver']}}};"
            f"SERVER={MICROSIP_DB_CONFIG['server']};"
            f"DATABASE={MICROSIP_DB_CONFIG['database']};"
            "Trusted_Connection=yes;"
        )
    else:
        return (
            f"DRIVER={{{MICROSIP_DB_CONFIG['driver']}}};"
            f"SERVER={MICROSIP_DB_CONFIG['server']};"
            f"DATABASE={MICROSIP_DB_CONFIG['database']};"
            f"UID={MICROSIP_DB_CONFIG['username']};"
            f"PWD={MICROSIP_DB_CONFIG['password']};"
        )

# Función para generar nombre de archivo basado en código de activo
def generate_image_filename(codigo_activo):
    # Limpiar código para nombre de archivo válido
    codigo_limpio = codigo_activo.replace(' ', '_').replace('/', '_').replace('\\', '_')
    return f"{codigo_limpio}.jpg"

# Configuración de logging para depuración
ENABLE_MICROSIP_LOGGING = True

# Mensajes de ayuda para el usuario
HELP_MESSAGES = {
    'image_export_success': '✅ Imagen exportada a MicroSIP. Para ver en MicroSIP: 1) Abrir activo fijo, 2) Clic en ícono lápiz ✏️, 3) Clic en ícono imagen 🖼️',
    'image_path_info': 'La imagen se guardó en: {path}. MicroSIP debería detectarla automáticamente.',
    'manual_steps': 'Pasos manuales en MicroSIP: Editar activo → Ícono imagen → Seleccionar archivo guardado'
}
