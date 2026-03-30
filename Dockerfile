# Use Node.js 18 slim as base image
FROM node:18-slim

# Set working directory
WORKDIR /usr/src/app

# Install system dependencies if needed (e.g. for canvas, though not used here)
# RUN apt-get update && apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application source
COPY . .

# Environment variables (Defaults - can be overridden at runtime)
ENV NODE_ENV=production

# Start the application
CMD [ "npm", "start" ]
