# Stage 1: Build the React application
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Configure Nginx to listen on port 8080 (Cloud Run default)
RUN sed -i 's/80;/8080;/g' /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
