# Use Node.js as the base image
FROM node:20-slim

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies with network resilience and safer script execution
RUN npm config set fetch-retries 10 \
	&& npm config set fetch-retry-factor 2 \
	&& npm config set fetch-retry-mintimeout 20000 \
	&& npm config set fetch-retry-maxtimeout 180000 \
	&& npm config set fetch-timeout 300000 \
	&& npm config set registry https://registry.npmjs.org/ \
	&& for i in 1 2 3; do npm ci --no-audit --no-fund --prefer-online --foreground-scripts && break || (echo "npm ci failed, retry $i/3" && npm cache clean --force && sleep 10); done

# Copy the rest of the application code
COPY . .

# Build the application
RUN rm -rf dist node_modules/.tmp && npm run build

# Expose the port the app runs on
EXPOSE 5173

# Start the application
CMD ["npm", "run", "preview"]
