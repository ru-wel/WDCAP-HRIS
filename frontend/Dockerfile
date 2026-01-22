# Build stage
FROM node:20-slim AS build

WORKDIR /app

# Copy package files from frontend directory
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy application code from frontend directory
COPY frontend/ .

# Build the application
RUN npm run build

# Production stage - use nginx to serve the built files
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 8080
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
