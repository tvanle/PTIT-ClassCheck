FROM node:20-alpine

WORKDIR /app

# Copy shared libraries
COPY libs ./libs
COPY tsconfig.base.json ./
COPY package*.json ./

# Copy service files
COPY services/identity-service ./services/identity-service

# Install dependencies
WORKDIR /app/services/identity-service
RUN npm install

# Build
RUN npm run build

# Start
CMD ["npm", "run", "start:prod"]
