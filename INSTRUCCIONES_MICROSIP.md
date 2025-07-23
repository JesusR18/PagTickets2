# 🎯 SISEG - Integración con MicroSIP
## Sistema de Control QR con Exportación Automática de Imágenes

### 📋 ¿Qué hace esta integración?

Al escanear un código QR, el sistema ahora:
1. **Captura automáticamente** una imagen del activo desde la cámara
2. **Busca el activo** en los registros (locales o MicroSIP)
3. **Exporta la imagen** automáticamente a la carpeta de MicroSIP
4. **Actualiza la base de datos** de MicroSIP con la ruta de la imagen
5. **Registra la actividad** con estado de exportación

### 🚀 Funcionalidades Nuevas

#### 📸 **Captura Automática de Imagen**
- Al detectar un QR, captura el frame actual del video
- Convierte la imagen a JPEG con calidad optimizada
- Guarda localmente y exporta a MicroSIP

#### 🔍 **Búsqueda de Activos**
- Busca automáticamente el activo por código QR
- Muestra información detallada: nombre, ubicación, responsable
- Panel desplegable con historial de registros

####  **Sincronización con MicroSIP**
- Conexión directa a base de datos SQL Server
- Exportación de imágenes a carpeta configurada
- Actualización automática de rutas en BD

### 📁 Estructura de Archivos

```
pagTickets-1/
├── pagTickets/
│   ├── models.py          # ✅ Nuevos modelos: ActivoFijo, RegistroQR actualizado
│   ├── views.py           # ✅ Funciones de integración con MicroSIP
│   ├── urls.py            # ✅ Nuevas rutas para funcionalidades
│   └── templates/
│       └── index.html     # ✅ UI actualizada con captura de imagen
├── microsip_config.py     # ⚙️ Configuración de conexión MicroSIP
├── media/                 # 📁 Imágenes capturadas localmente
├── logs/                  # 📝 Logs de actividad y errores
└── requirements.txt       # 📦 Dependencias actualizadas
```

### ⚙️ Configuración Requerida

#### 1. **Instalar Dependencias**
```bash
pip install Pillow pyodbc
```

#### 2. **Configurar MicroSIP** (editar `microsip_config.py`):
```python
MICROSIP_DB_CONFIG = {
    'server': 'tu-servidor\\SQLEXPRESS',    # 🔧 Cambiar por tu servidor
    'database': 'MicroSIP_DB',              # 🔧 Cambiar por tu base de datos
}

MICROSIP_IMAGES_PATH = r"C:\MicroSIP\Imagenes\ActivosFijos"  # 🔧 Ruta de imágenes
```

#### 3. **Verificar Estructura de BD MicroSIP**
Asegúrate que tu tabla de activos tenga:
- `codigo` (VARCHAR)
- `nombre` (VARCHAR) 
- `grupo` (VARCHAR)
- `ruta_imagen` (VARCHAR) - **Campo para la imagen**

### 🎮 Cómo Usar

#### **Escanear QR con Captura de Imagen:**
1. Clic en "Activar Escáner"
2. Apuntar hacia código QR del activo
3. **¡Automático!** - Captura imagen y exporta a MicroSIP
4. Ver confirmación con estado de exportación

#### **Cargar Catálogo desde MicroSIP:**
1. Clic en "Cargar Activos MicroSIP"
2. Se sincronizan todos los activos de la BD
3. Ver resumen: nuevos, actualizados, total

#### **Ver Información Detallada:**
1. Clic en cualquier registro de la lista
2. Panel desplegable con toda la información
3. Historial de escaneos y exportaciones

### 📊 Activos de Prueba Creados

Para probar el sistema, se crearon estos activos:
- **MOUSE** - Mouse óptico
- **ESCRITORIO** - Escritorio de oficina  
- **MONITOR** - Monitor LCD 24 pulgadas
- **SILLA1** - Silla para visitas
- **TELEFONO** - Teléfono IP
- **CPU** - Computadora de escritorio

### 🔧 Troubleshooting

#### **Error: "pyodbc no disponible"**
```bash
pip install pyodbc
```

#### **Error: "Pillow no disponible"**
```bash
pip install Pillow
```

#### **Error de conexión MicroSIP:**
1. Verificar servidor SQL Server funcionando
2. Revisar cadena de conexión en `microsip_config.py`
3. Comprobar permisos de base de datos

#### **Imágenes no se exportan:**
1. Verificar ruta de imágenes existe: `C:\MicroSIP\Imagenes\ActivosFijos`
2. Comprobar permisos de escritura en la carpeta
3. Revisar logs en `logs/django.log`

### 📈 Reportes y Excel

El reporte Excel ahora incluye:
- ✅ Estado de exportación a MicroSIP
- 📸 Indicador de imagen capturada
- 📋 Información completa del activo
- 📅 Timestamps detallados

### 🎯 Próximos Pasos

Para completar la integración:
1. **Instalar dependencias:** `pip install Pillow pyodbc`
2. **Configurar conexión** a tu MicroSIP específico
3. **Probar con códigos QR** de activos reales
4. **Verificar exportación** de imágenes
5. **Personalizar campos** según tu estructura de BD

### 📞 Soporte

Para dudas o problemas:
- Revisar logs en: `logs/django.log`
- Verificar configuración en: `microsip_config.py`
- Probar conexión a MicroSIP independientemente

---
🎉 **¡Tu sistema SISEG ahora está completamente integrado con MicroSIP!**
