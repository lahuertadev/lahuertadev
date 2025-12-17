# La Huerta - Docker Setup

Este documento explica cómo configurar y ejecutar el proyecto La Huerta usando Docker.

## Prerrequisitos

- Docker instalado
- Docker Compose instalado

## Estructura del Proyecto

```
LaHuerta/
├── backend/                 # Aplicación Django
│   ├── Dockerfile
│   ├── requirements.txt
│   └── init.sql
├── frontend/
│   └── lahuertafrontend/    # Aplicación React
│       └── Dockerfile
├── docker-compose.yml       # Orquestación de servicios
├── .dockerignore
└── env.example
```

## Configuración Inicial

1. **Copiar el archivo de variables de entorno:**
   ```bash
   cp env.example .env
   ```

2. **Editar las variables de entorno** (opcional):
   - Modifica `.env` según tus necesidades
   - Cambia las contraseñas en producción

## Comandos de Docker

### Desarrollo

1. **Construir y ejecutar todos los servicios:**
   ```bash
   docker-compose up --build
   ```

2. **Ejecutar en segundo plano:**
   ```bash
   docker-compose up -d --build
   ```

3. **Ver logs:**
   ```bash
   # Todos los servicios
   docker-compose logs -f
   
   # Servicio específico
   docker-compose logs -f backend
   docker-compose logs -f frontend
   docker-compose logs -f db
   ```

4. **Detener servicios:**
   ```bash
   docker-compose down
   ```

### Comandos Útiles

1. **Acceder al contenedor del backend:**
   ```bash
   docker-compose exec backend bash
   ```

2. **Ejecutar migraciones manualmente:**
   ```bash
   docker-compose exec backend python manage.py migrate
   ```

3. **Crear superusuario:**
   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

4. **Ejecutar tests:**
   ```bash
   docker-compose exec backend python manage.py test
   ```

5. **Acceder a la base de datos:**
   ```bash
   docker-compose exec db mysql -u lahuerta_user -p lahuerta_db
   ```

## Puertos

- **Backend (Django):** http://localhost:8000
- **Frontend (React):** http://localhost:3000
- **Base de datos (MySQL):** localhost:3306
- **Nginx (opcional):** http://localhost:80

## Volúmenes

- `mysql_data`: Datos persistentes de MySQL
- `static_volume`: Archivos estáticos de Django

## Redes

Todos los servicios están conectados a la red `lahuerta_network` para comunicación interna.

## Troubleshooting

### Problemas Comunes

1. **Puerto ya en uso:**
   ```bash
   # Ver qué está usando el puerto
   lsof -i :8000
   lsof -i :3000
   
   # Cambiar puertos en docker-compose.yml si es necesario
   ```

2. **Problemas de permisos:**
   ```bash
   # En macOS/Linux
   sudo chown -R $USER:$USER .
   ```

3. **Limpiar Docker:**
   ```bash
   # Eliminar contenedores, redes y volúmenes
   docker-compose down -v
   
   # Eliminar imágenes
   docker system prune -a
   ```

4. **Reconstruir sin cache:**
   ```bash
   docker-compose build --no-cache
   ```

## Producción

Para producción, considera:

1. **Cambiar variables de entorno:**
   - `DEBUG=False`
   - `SECRET_KEY` segura
   - Contraseñas fuertes

2. **Usar Nginx:**
   - Configurar proxy reverso
   - Servir archivos estáticos

3. **SSL/TLS:**
   - Configurar certificados
   - HTTPS obligatorio

4. **Backup:**
   - Configurar backups de la base de datos
   - Volúmenes persistentes

## Comandos de Desarrollo Rápido

```bash
# Iniciar todo
docker-compose up -d

# Ver logs
docker-compose logs -f

# Reiniciar un servicio
docker-compose restart backend

# Ejecutar comando en un servicio
docker-compose exec backend python manage.py shell

# Parar todo
docker-compose down
``` 