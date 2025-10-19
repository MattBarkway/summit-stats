# ===== Build stage =====
FROM node:20-alpine AS builder

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /app

# Copy dependency files first for better caching
COPY pnpm-lock.yaml package.json ./

# Install dependencies (using lockfile for reproducibility)
RUN pnpm install --frozen-lockfile

# Copy the rest of the project
COPY . .

# Build the Next.js app
RUN pnpm run build

# ===== Runtime stage =====
FROM node:20-alpine

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /app

# Copy the built app from the builder stage
COPY --from=builder /app ./

# Define default port (Cloud Run sets PORT automatically)
ENV PORT=3000

# Expose the dynamic port value
EXPOSE ${PORT}

# Start the app in production mode
CMD ["sh", "-c", "pnpm start -- -p ${PORT}"]
