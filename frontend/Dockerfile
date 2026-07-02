# Use a lightweight node server base
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./

# ✅ FIX: Explicitly install dependencies including mammoth
RUN npm install
RUN npm install mammoth

COPY . .
RUN npm run build

# Production server stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]