FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production --cache /tmp/npm-cache

# Copy source code
COPY . .

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy built application from builder stage
COPY --from=builder /app ./

EXPOSE 5000

CMD ["npm", "start"]
