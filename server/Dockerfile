# Start from the official Node.js image
# This is like saying "give me a machine with Node.js already installed"
FROM node:20-alpine

# Set the working directory inside the container
# All commands after this run from /app
WORKDIR /app

# Copy package.json first (before copying all code)
# Docker caches this layer — if package.json hasn't changed,
# it won't re-run npm install on every build (saves time)
COPY package*.json ./

# Install dependencies
RUN npm install

# Now copy the rest of the code
COPY . .

# Tell Docker this container listens on port 4000
EXPOSE 4000

# Command to start the server
CMD ["node", "index.js"]