FROM node:20-alpine

WORKDIR /app

COPY libs ./libs
COPY tsconfig.base.json ./
COPY package*.json ./
COPY services/notification-service ./services/notification-service

WORKDIR /app/services/notification-service
RUN npm install
RUN npm run build

CMD ["npm", "run", "start:prod"]
