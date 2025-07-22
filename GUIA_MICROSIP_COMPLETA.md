# 🎯 SISEG + MicroSIP: Guía de Integración Completa

## 📋 Flujo Específico para MicroSIP

### 🔄 **Proceso Automatizado:**

1. **SISEG Captura:**
   - Escaneas código QR del activo (ej: "ESCRITORIO_EN_L")
   - Sistema captura imagen automáticamente desde la cámara
   - Busca información del activo en el sistema

2. **Exportación Automática:**
   - Imagen se guarda como: `ESCRITORIO_EN_L.jpg`
   - Se copia a: `C:\MicroSIP\Imagenes\ActivosFijos\`
   - Se optimiza para visualización en MicroSIP
   - Se actualiza base de datos con ruta de imagen

3. **Visualización en MicroSIP:**
   ```
   📂 MicroSIP → Activos Fijos → Buscar "ESCRITORIO_EN_L"
   ✏️  Clic en ícono lápiz (Editar)
   🖼️  Clic en ícono imagen
   ✅  Imagen aparece automáticamente
   ```

### 🛠️ **Configuración Inicial:**

#### **1. Instalar Dependencias:**
```bash
pip install Pillow pyodbc
```

#### **2. Configurar Rutas de MicroSIP:**
Editar `microsip_config.py`:
```python
# Ajustar según tu instalación
MICROSIP_IMAGES_PATH = r"C:\MicroSIP\Imagenes\ActivosFijos"

# O ruta alternativa común:
# MICROSIP_IMAGES_PATH = r"C:\Archivos de programa\MicroSIP\Imagenes\ActivosFijos"
```

#### **3. Configurar Base de Datos:**
```python
MICROSIP_DB_CONFIG = {
    'server': 'TU_SERVIDOR\\SQLEXPRESS',    # 🔧 Cambiar
    'database': 'MicroSIP_DB',              # 🔧 Cambiar
    'trusted_connection': True,             # Usar Windows Auth
}
```

### 📸 **Mejores Prácticas para Imágenes:**

#### **Recomendaciones de Captura:**
- **Iluminación:** Buena luz natural o artificial
- **Distancia:** 30-50 cm del activo
- **Ángulo:** Frontal, mostrando características distintivas
- **Estabilidad:** Mantener cámara firme durante escaneo

#### **Optimización Automática:**
- **Resolución:** Max 1024x768px (óptimo para MicroSIP)
- **Formato:** JPEG con 90% calidad
- **Tamaño:** Compresión automática para rendimiento
- **Compatibilidad:** RGB (compatible con todos los visores)

### 🎯 **Códigos QR Sugeridos:**

Para activos como los de tu MicroSIP:
```
ESCRITORIO_EN_L      →  📁 ESCRITORIO_EN_L.jpg
SILLA_ERGONOMICA     →  📁 SILLA_ERGONOMICA.jpg
TELEFONO_IP_001      →  📁 TELEFONO_IP_001.jpg
MONITOR_24_PULGADAS  →  📁 MONITOR_24_PULGADAS.jpg
CPU_CORE_I5          →  📁 CPU_CORE_I5.jpg
```

### 🔍 **Verificación del Proceso:**

#### **1. Verificar Exportación Exitosa:**
- ✅ Mensaje verde: "Imagen exportada a MicroSIP"
- 📁 Archivo creado en carpeta de imágenes
- 🔄 Base de datos actualizada (si conexión disponible)

#### **2. Comprobar en MicroSIP:**
```
1. Abrir MicroSIP
2. Ir a "Activos Fijos"
3. Buscar el código escaneado
4. Clic en ✏️ (editar)
5. Clic en 🖼️ (imagen)
6. Verificar que aparece la imagen
```

#### **3. Troubleshooting:**
- **Imagen no aparece:** Verificar ruta de carpeta
- **Error de permisos:** Ejecutar como administrador
- **BD no actualiza:** Revisar configuración de conexión

### 📊 **Campos de MicroSIP Mapeados:**

Según tu pantalla de MicroSIP:
```
🏷️ Nombre:           "ESCRITORIO EN L"
🏢 Grupo:             "RECURSOS_HUMANOS"  
👤 Asignado a:        "LIC. ADRIANA ROMERO DIAZ"
📅 Fecha adquisición: "24/sep/2022"
💰 Valor:             "4,000.00"
🔑 Clave:             "RH001"
📝 Estatus:           "Activo"
```

### 🚀 **Casos de Uso Avanzados:**

#### **Inventario Masivo:**
1. Imprimir códigos QR para todos los activos
2. Recorrer oficina escaneando uno por uno
3. Sistema genera catálogo fotográfico automático
4. MicroSIP queda con imágenes de todos los activos

#### **Control de Ubicaciones:**
1. QR incluye código de ubicación
2. Escanear para verificar ubicación actual
3. Detectar activos fuera de lugar
4. Generar reportes de ubicación

#### **Mantenimiento:**
1. QR con código de activo + fecha
2. Escanear durante mantenimiento
3. Capturar estado actual con imagen
4. Historial fotográfico de condiciones

### 📋 **Checklist de Implementación:**

- [ ] ✅ Dependencias instaladas (Pillow, pyodbc)
- [ ] ⚙️ Configuración ajustada en `microsip_config.py`
- [ ] 📁 Carpeta de imágenes MicroSIP verificada
- [ ] 🔗 Conexión a base de datos probada
- [ ] 📱 Escáner QR funcionando
- [ ] 📸 Captura de imagen operativa
- [ ] 🏢 Activos de prueba creados
- [ ] ✏️ Flujo MicroSIP verificado (lápiz → imagen)

### 💡 **Tips Adicionales:**

#### **Nombrado de Archivos:**
- Usar códigos sin espacios: `ESCRITORIO_EN_L`
- Evitar caracteres especiales: `/`, `\`, `:`
- Máximo 50 caracteres para compatibilidad

#### **Backup de Imágenes:**
- Sistema guarda copia local en `/media/activos_imagenes/`
- Backup automático antes de exportar a MicroSIP
- Recuperación posible desde Django admin

#### **Monitoreo:**
- Logs detallados en `/logs/django.log`
- Estado de exportación en interfaz web
- Reportes Excel incluyen estado de imágenes

---

## 🎉 ¡Tu integración SISEG + MicroSIP está lista!

**Proceso simplificado:**
1. 📱 **Escanear** QR → 📸 **Captura** automática → 📁 **Exporta** a MicroSIP
2. 🖥️ **Abrir MicroSIP** → ✏️ **Editar activo** → 🖼️ **Ver imagen**

**¡Automatización completa del flujo fotográfico de activos fijos!** 🚀
