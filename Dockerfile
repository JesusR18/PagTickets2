# Dockerfile ultra-optimizado para Railway
FROM python:3.12-slim

# Variables de entorno
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Directorio de trabajo
WORKDIR /app

# Copiar solo requirements
COPY requirements_ultra_minimal.txt .

# Instalar dependencias con cache optimizado
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements_ultra_minimal.txt

# Copiar código
COPY . .

# Comando por defecto
CMD ["python", "manage_ultra_simple.py", "migrate", "--noinput", "&&", "gunicorn", "pagTickets.wsgi_ultra_simple:application", "--bind", "0.0.0.0:$PORT", "--workers", "1"]
