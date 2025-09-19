FROM node:18-alpine AS build

WORKDIR /app

# Install app dependencies
COPY package.json package-lock.json* ./
RUN npm ci --silent

# Copy source and build
COPY . ./
RUN npm run build

# Production image: serve static files with nginx
FROM nginx:stable-alpine

COPY --from=build /app/build /usr/share/nginx/html

# Remove default nginx config and add a simple one (let nginx default is fine for single page)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
