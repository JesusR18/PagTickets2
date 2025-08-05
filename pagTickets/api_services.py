"""
Servicios de API para SISEG - Versión Railway Optimizada
Sistema de precios y catálogos sin dependencias complejas
"""

import json
import logging
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)

class SisegAPIService:
    """
    Servicio de API para precios y catálogos - Versión Railway
    Sin dependencias externas complejas para máxima compatibilidad
    """
    
    def __init__(self):
        self.cache_timeout = 3600  # 1 hora
        self.precio_database = self._cargar_base_precios()
    
    def _cargar_base_precios(self):
        """Base de datos de precios interna - sin APIs externas por ahora"""
        return {
            'laptops': {
                'hp': {'min': 300, 'max': 1500, 'promedio': 700},
                'dell': {'min': 400, 'max': 2000, 'promedio': 900},
                'lenovo': {'min': 350, 'max': 1800, 'promedio': 800},
                'acer': {'min': 250, 'max': 1200, 'promedio': 600},
                'asus': {'min': 300, 'max': 1600, 'promedio': 750},
                'toshiba': {'min': 200, 'max': 1000, 'promedio': 500},
                'gateway': {'min': 150, 'max': 800, 'promedio': 400},
                'samsung': {'min': 300, 'max': 1400, 'promedio': 700}
            },
            'desktop': {
                'hp': {'min': 200, 'max': 1200, 'promedio': 500},
                'dell': {'min': 250, 'max': 1500, 'promedio': 600},
                'lenovo': {'min': 200, 'max': 1300, 'promedio': 550},
                'acer': {'min': 150, 'max': 1000, 'promedio': 400},
                'asus': {'min': 200, 'max': 1400, 'promedio': 550}
            },
            'monitor': {
                'hp': {'min': 100, 'max': 800, 'promedio': 300},
                'dell': {'min': 120, 'max': 1000, 'promedio': 400},
                'lg': {'min': 100, 'max': 900, 'promedio': 350},
                'samsung': {'min': 110, 'max': 950, 'promedio': 380},
                'acer': {'min': 80, 'max': 700, 'promedio': 250}
            },
            'impresora': {
                'hp': {'min': 50, 'max': 600, 'promedio': 200},
                'canon': {'min': 60, 'max': 700, 'promedio': 250},
                'epson': {'min': 50, 'max': 650, 'promedio': 220},
                'brother': {'min': 80, 'max': 800, 'promedio': 300}
            },
            'telefono': {
                'samsung': {'min': 100, 'max': 1200, 'promedio': 400},
                'apple': {'min': 200, 'max': 1500, 'promedio': 600},
                'xiaomi': {'min': 80, 'max': 600, 'promedio': 250},
                'huawei': {'min': 90, 'max': 800, 'promedio': 300}
            }
        }
    
    def buscar_precio_rapido(self, producto_info):
        """
        Búsqueda rápida de precio usando base interna
        """
        try:
            nombre = producto_info.get('nombre', '').lower()
            marca = producto_info.get('marca', '').lower()
            modelo = producto_info.get('modelo', '').lower()
            
            # Determinar tipo de producto
            tipo = self._determinar_tipo_producto(nombre, modelo)
            
            # Buscar en base de precios
            if tipo in self.precio_database and marca in self.precio_database[tipo]:
                rango = self.precio_database[tipo][marca]
                return {
                    'exito': True,
                    'precio_estimado': rango['promedio'],
                    'precio_min': rango['min'],
                    'precio_max': rango['max'],
                    'moneda': 'USD',
                    'fuente': 'Base Interna SISEG',
                    'confianza': 0.8,
                    'tipo_producto': tipo,
                    'marca': marca.upper()
                }
            
            # Precio genérico si no se encuentra
            return {
                'exito': True,
                'precio_estimado': 300,
                'precio_min': 100,
                'precio_max': 800,
                'moneda': 'USD',
                'fuente': 'Estimación Genérica',
                'confianza': 0.5,
                'tipo_producto': tipo or 'equipo',
                'marca': marca.upper() if marca else 'GENÉRICA'
            }
            
        except Exception as e:
            logger.error(f"Error en búsqueda rápida: {e}")
            return {'exito': False, 'error': str(e)}
    
    def _determinar_tipo_producto(self, nombre, modelo):
        """Determinar tipo de producto basado en nombre y modelo"""
        texto = f"{nombre} {modelo}".lower()
        
        if any(word in texto for word in ['laptop', 'notebook', 'portátil', 'thinkpad']):
            return 'laptops'
        elif any(word in texto for word in ['desktop', 'torre', 'pc', 'optiplex']):
            return 'desktop'
        elif any(word in texto for word in ['monitor', 'pantalla', 'display']):
            return 'monitor'
        elif any(word in texto for word in ['impresora', 'printer', 'laserjet']):
            return 'impresora'
        elif any(word in texto for word in ['teléfono', 'telefono', 'celular', 'móvil']):
            return 'telefono'
        else:
            return 'equipo'
    
    def generar_reporte_inventario(self, activos):
        """
        Generar reporte completo de inventario con precios
        """
        try:
            if not activos:
                return {'exito': False, 'error': 'No hay activos para procesar'}
            
            activos_procesados = []
            estadisticas = {
                'total_activos': len(activos),
                'valor_total_min': 0,
                'valor_total_max': 0,
                'valor_total_estimado': 0,
                'por_categoria': {},
                'por_marca': {}
            }
            
            for activo in activos:
                precio_info = self.buscar_precio_rapido(activo)
                
                if precio_info['exito']:
                    activo_procesado = {
                        'id': activo.get('id', 'N/A'),
                        'nombre': activo.get('nombre', 'Sin nombre'),
                        'marca': activo.get('marca', 'Sin marca'),
                        'modelo': activo.get('modelo', 'Sin modelo'),
                        'ubicacion': activo.get('ubicacion', 'Sin ubicación'),
                        'tipo': precio_info['tipo_producto'],
                        'valor_estimado': precio_info['precio_estimado'],
                        'valor_min': precio_info['precio_min'],
                        'valor_max': precio_info['precio_max'],
                        'fuente': precio_info['fuente']
                    }
                    
                    activos_procesados.append(activo_procesado)
                    
                    # Actualizar estadísticas
                    estadisticas['valor_total_min'] += precio_info['precio_min']
                    estadisticas['valor_total_max'] += precio_info['precio_max']
                    estadisticas['valor_total_estimado'] += precio_info['precio_estimado']
                    
                    # Por categoría
                    categoria = precio_info['tipo_producto']
                    if categoria not in estadisticas['por_categoria']:
                        estadisticas['por_categoria'][categoria] = {
                            'cantidad': 0,
                            'valor_total': 0
                        }
                    estadisticas['por_categoria'][categoria]['cantidad'] += 1
                    estadisticas['por_categoria'][categoria]['valor_total'] += precio_info['precio_estimado']
                    
                    # Por marca
                    marca = activo.get('marca', 'Sin marca').upper()
                    if marca not in estadisticas['por_marca']:
                        estadisticas['por_marca'][marca] = {
                            'cantidad': 0,
                            'valor_total': 0
                        }
                    estadisticas['por_marca'][marca]['cantidad'] += 1
                    estadisticas['por_marca'][marca]['valor_total'] += precio_info['precio_estimado']
            
            # Calcular porcentajes
            if estadisticas['valor_total_estimado'] > 0:
                for categoria in estadisticas['por_categoria']:
                    valor = estadisticas['por_categoria'][categoria]['valor_total']
                    porcentaje = (valor / estadisticas['valor_total_estimado']) * 100
                    estadisticas['por_categoria'][categoria]['porcentaje'] = round(porcentaje, 1)
                
                for marca in estadisticas['por_marca']:
                    valor = estadisticas['por_marca'][marca]['valor_total']
                    porcentaje = (valor / estadisticas['valor_total_estimado']) * 100
                    estadisticas['por_marca'][marca]['porcentaje'] = round(porcentaje, 1)
            
            # Estadísticas adicionales
            estadisticas['promedio_valor_activo'] = (
                estadisticas['valor_total_estimado'] / estadisticas['total_activos']
                if estadisticas['total_activos'] > 0 else 0
            )
            
            return {
                'exito': True,
                'total_activos': estadisticas['total_activos'],
                'valor_total_estimado': estadisticas['valor_total_estimado'],
                'valor_total_min': estadisticas['valor_total_min'],
                'valor_total_max': estadisticas['valor_total_max'],
                'activos_detallados': activos_procesados,
                'activos_por_categoria': estadisticas['por_categoria'],
                'activos_por_marca': estadisticas['por_marca'],
                'resumen_estadisticas': {
                    'promedio_valor_activo': round(estadisticas['promedio_valor_activo'], 2)
                }
            }
            
        except Exception as e:
            logger.error(f"Error generando reporte de inventario: {e}")
            return {'exito': False, 'error': str(e)}
    
    def obtener_catalogo_marca(self, marca):
        """
        Obtener información de catálogo de una marca específica
        """
        try:
            marca_lower = marca.lower()
            
            catalogos = {
                'hp': {
                    'nombre_completo': 'Hewlett-Packard',
                    'pais_origen': 'Estados Unidos',
                    'segmento': 'Empresarial y Consumo',
                    'especialidades': ['Laptops', 'Desktops', 'Impresoras', 'Monitores'],
                    'garantia_tipica': '1-3 años',
                    'confiabilidad': 'Alta',
                    'series_populares': {
                        'laptops': ['EliteBook', 'ProBook', 'Pavilion'],
                        'desktop': ['EliteDesk', 'ProDesk'],
                        'impresora': ['LaserJet', 'OfficeJet']
                    },
                    'rango_precios': {
                        'laptops': {'min': 300, 'max': 1500},
                        'desktop': {'min': 200, 'max': 1200},
                        'monitor': {'min': 100, 'max': 800},
                        'impresora': {'min': 50, 'max': 600}
                    }
                },
                'dell': {
                    'nombre_completo': 'Dell Technologies',
                    'pais_origen': 'Estados Unidos',
                    'segmento': 'Empresarial Premium',
                    'especialidades': ['Laptops Empresariales', 'Workstations', 'Servidores'],
                    'garantia_tipica': '1-4 años',
                    'confiabilidad': 'Muy Alta',
                    'series_populares': {
                        'laptops': ['Latitude', 'XPS', 'Inspiron'],
                        'desktop': ['OptiPlex', 'Precision'],
                        'monitor': ['UltraSharp', 'Professional']
                    },
                    'rango_precios': {
                        'laptops': {'min': 400, 'max': 2000},
                        'desktop': {'min': 250, 'max': 1500},
                        'monitor': {'min': 120, 'max': 1000}
                    }
                },
                'lenovo': {
                    'nombre_completo': 'Lenovo Group',
                    'pais_origen': 'China',
                    'segmento': 'Empresarial y Gaming',
                    'especialidades': ['ThinkPad', 'Gaming', 'Tablets'],
                    'garantia_tipica': '1-3 años',
                    'confiabilidad': 'Alta',
                    'series_populares': {
                        'laptops': ['ThinkPad', 'IdeaPad', 'Legion'],
                        'desktop': ['ThinkCentre', 'IdeaCentre']
                    },
                    'rango_precios': {
                        'laptops': {'min': 350, 'max': 1800},
                        'desktop': {'min': 200, 'max': 1300}
                    }
                }
            }
            
            if marca_lower in catalogos:
                return {'exito': True, 'data': catalogos[marca_lower]}
            else:
                return {
                    'exito': True,
                    'data': {
                        'nombre_completo': marca.upper(),
                        'pais_origen': 'No especificado',
                        'segmento': 'General',
                        'especialidades': ['Equipos de cómputo'],
                        'garantia_tipica': '1 año',
                        'confiabilidad': 'Variable',
                        'series_populares': {},
                        'rango_precios': {}
                    }
                }
                
        except Exception as e:
            logger.error(f"Error obteniendo catálogo de marca: {e}")
            return {'exito': False, 'error': str(e)}

# Instancia global del servicio
siseg_api = SisegAPIService()
