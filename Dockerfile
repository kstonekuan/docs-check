# Use Node.js LTS version
FROM node:20-alpine

# Install git (required for cloning repositories)
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Create temp directory for cloning repositories
RUN mkdir -p /tmp/docs-check

# Set environment variable for temp directory
ENV TEMP_DIR=/tmp/docs-check

# Make the CLI executable
RUN chmod +x dist/cli.js

# Set the entrypoint
ENTRYPOINT ["node", "dist/cli.js"]

# Default command (can be overridden)
CMD ["--help"]