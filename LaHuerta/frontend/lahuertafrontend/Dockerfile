FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar el código del proyecto
COPY . .

# Construir la aplicación para producción
RUN npm run build

# Instalar serve para servir la aplicación
RUN npm install -g serve

# Exponer puerto
EXPOSE 3000

# Comando para ejecutar la aplicación
CMD ["serve", "-s", "build", "-l", "3000"] 