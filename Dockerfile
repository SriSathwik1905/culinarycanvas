# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files for better caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Set correct permissions
RUN chmod -R 755 /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start NGINX server
CMD ["nginx", "-g", "daemon off;"]
