# ── Stage 1 : Build Angular ──────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les manifestes en premier (cache npm)
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# Copier le reste du code
COPY . .

# Build production (utilise environment.prod.ts via fileReplacements)
RUN npm run build -- --configuration production

# ── Stage 2 : Servir avec Nginx ──────────────────────────
FROM nginx:alpine

# Supprimer la config par défaut
RUN rm /etc/nginx/conf.d/default.conf

# Notre config nginx (proxy /api → gateway, SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier le build Angular
COPY --from=builder /app/dist/rag-front/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
