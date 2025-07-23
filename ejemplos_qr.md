# Ejemplos de Códigos QR Soportados

## 1. Formato Texto Estructurado (Tu Formato Específico)
```
Activo: Escritorio en L Ubicación: 1er piso R.H. Marca: Techni mobili Modelo: Havano N. Serie: -.
```

## 2. Más Ejemplos del Formato Estructurado
```
Activo: Silla Ejecutiva Ubicación: Gerencia General Marca: Steelcase Modelo: Think Chair N. Serie: SC123456
```

```
Activo: Monitor 24" Ubicación: Contabilidad Marca: Samsung Modelo: F24T450FQL N. Serie: SN789123
```

```
Activo: Impresora Multifuncional Ubicación: Recepción Marca: HP Modelo: LaserJet Pro MFP M428fdw N. Serie: HPM428789
```

## 3. Formato JSON (Recomendado)
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

## 4. Formato Separado por | (Pipe)
```
ACT002|Impresora HP LaserJet|Sala de Juntas|HP|LaserJet Pro|SN987654321
```

## 5. Formato Código - Nombre
```
ACT003 - Monitor Samsung 27"
```

## 6. Código Simple
```
EQUIPO-004
```

El sistema ahora detecta automáticamente el formato, especialmente tu formato estructurado con "Activo:", "Ubicación:", "Marca:", etc.
