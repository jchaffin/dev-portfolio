FROM node:20-slim

WORKDIR /app

# Install git (needed by gh-rag for cloning repos)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Run the ingest job
CMD ["npm", "start"]
