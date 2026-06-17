# Use a Node image that also has Python, starting with Node and installing Python
FROM node:20-bookworm-slim

# Install Python, pip, and system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set up working directory
WORKDIR /app

# Copy package files and install NestJS dependencies
COPY package*.json ./
RUN npm ci

# Copy scraper requirements and install them in a virtual environment
COPY src/scrapers/requirements.txt ./src/scrapers/
RUN python3 -m venv src/scrapers/venv && \
    ./src/scrapers/venv/bin/pip install --upgrade pip && \
    ./src/scrapers/venv/bin/pip install -r src/scrapers/requirements.txt

# Install Playwright browsers and system dependencies
RUN npx playwright install --with-deps chromium

# Copy the rest of the application
COPY . .

# Build the NestJS app
RUN npm run build

# Expose port and start in production mode
EXPOSE 7860
CMD ["npm", "run", "start:prod"]
