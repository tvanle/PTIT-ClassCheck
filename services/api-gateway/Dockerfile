FROM node:20-alpine

WORKDIR /app

COPY tsconfig.base.json ./
COPY package*.json ./
COPY services/api-gateway ./services/api-gateway

WORKDIR /app/services/api-gateway
RUN npm install
RUN npm run build

CMD ["npm", "run", "start:prod"]
