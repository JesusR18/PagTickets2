# Ejemplos de Códigos QR Soportados

## 1. Formato JSON (Recomendado)
```json
{
  "codigo": "ACT001",
  "nombre": "Laptop Dell Latitude 7520", 
  "ubicacion": "Oficina Principal - Piso 2",
  "marca": "Dell",
  "modelo": "Latitude 7520",
  "no_serie": "SN123456789"
}
```

## 2. Formato Separado por | (Pipe)
```
ACT002|Impresora HP LaserJet|Sala de Juntas|HP|LaserJet Pro|SN987654321
```

## 3. Formato Código - Nombre
```
ACT003 - Monitor Samsung 27"
```

## 4. Código Simple
```
EQUIPO-004
```

## 5. Formato JSON Alternativo (Inglés)
```json
{
  "code": "ACT005",
  "asset": "MacBook Pro 13",
  "location": "Development Team",
  "brand": "Apple", 
  "model": "MacBook Pro",
  "serial": "SNMAC123456"
}
```

El sistema ahora detecta automáticamente el formato y extrae la información correctamente.
