FROM node:20-alpine

WORKDIR /app

# Copia dependências primeiro (cache de layers)
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# Copia o restante
COPY backend/ ./backend/
COPY frontend/ ./frontend/

WORKDIR /app/backend

EXPOSE 3000

CMD ["node", "server.js"]
