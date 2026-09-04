# Multi-stage Dockerfile for Sahaay Bank on Render
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Copy all repository content (Docker build context: .)
COPY . .

# Install production dependencies inside backend directory
WORKDIR /app/backend
RUN npm install --omit=dev

EXPOSE 5000
CMD ["node", "server.js"]
