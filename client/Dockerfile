# Stage 1 — Build the React app
# We use a separate build stage so the final image doesn't include
# build tools — keeps the image small
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the React app into static files
RUN npm run build

# Stage 2 — Serve with Nginx
# Nginx is a lightweight web server perfect for serving static files
FROM nginx:alpine

# Copy the built React files into Nginx's serving directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx config (handles React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]