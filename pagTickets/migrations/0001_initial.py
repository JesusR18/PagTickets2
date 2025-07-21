# Migración inicial para crear la tabla RegistroQR
# Generado automáticamente por Django

from django.db import migrations, models


class Migration(migrations.Migration):

    # Esta es la primera migración de la aplicación
    initial = True

    # No depende de otras migraciones
    dependencies = [
    ]

    # Operaciones a realizar en la base de datos
    operations = [
        # Crear el modelo RegistroQR
        migrations.CreateModel(
            name='RegistroQR',  # Nombre del modelo
            fields=[
                # Campo ID automático (clave primaria)
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                # Campo para el código QR (texto hasta 255 caracteres)
                ('codigo', models.CharField(max_length=255)),
                # Campo para la fecha de registro (se llena automáticamente)
                ('fecha_registro', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
