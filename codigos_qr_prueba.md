# Códigos QR para probar la funcionalidad de duplicados

## 1. QR Original ya registrado (formato estructurado):
Activo: Silla Ejecutiva Ubicación: Gerencia General Marca: Steelcase Modelo: Think Chair N. Serie: SC123456

## 2. QR Duplicado en formato JSON (debería mostrar "ya registrado"):
{"nombre": "Silla Ejecutiva", "ubicacion": "Gerencia General", "marca": "Steelcase", "modelo": "Think Chair", "no_serie": "SC123456"}

## 3. QR Duplicado en formato pipe (debería mostrar "ya registrado"):
SILLA-EJ-001|Silla Ejecutiva|Gerencia General|Steelcase|Think Chair|SC123456

## 4. QR de activo nuevo (debería registrarse normalmente):
{"nombre": "Computadora Nueva", "ubicacion": "Sala de Sistemas", "marca": "Lenovo", "modelo": "ThinkPad X1", "no_serie": "LN123456"}

## 5. Otro QR ya registrado (formato JSON):
{"codigo": "LAP001", "nombre": "Laptop Dell Latitude", "ubicacion": "Oficina Principal", "marca": "Dell", "modelo": "Latitude 7520", "no_serie": "DL123456"}

## 6. QR duplicado del anterior en formato estructurado (debería mostrar "ya registrado"):
Activo: Laptop Dell Latitude Ubicación: Oficina Principal Marca: Dell Modelo: Latitude 7520 N. Serie: DL123456

## Instrucciones para probar:
1. Abre http://localhost:8000 en tu navegador
2. Haz clic en "Iniciar escáner"
3. Copia y pega cualquiera de los códigos de arriba cuando se abra la cámara
4. Observa el comportamiento:
   - QR nuevos: Se registran y aparecen en la tabla
   - QR duplicados: Muestran "ya registrado" y NO se vuelven a registrar

## Resultado esperado:
- Los QR #2, #3, #5 y #6 deberían mostrar "ya registrado"
- Los QR #4 debería registrarse como nuevo
- El QR #1 ya existe, así que también mostrará "ya registrado"
