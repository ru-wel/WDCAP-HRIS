# Use Node.js LTS version
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port (Cloud Run will set PORT env variable)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
