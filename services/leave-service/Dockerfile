FROM node:20-alpine

WORKDIR /app

COPY libs ./libs
COPY tsconfig.base.json ./
COPY package*.json ./
COPY services/leave-service ./services/leave-service

WORKDIR /app/services/leave-service
RUN npm install
RUN npm run build

CMD ["npm", "run", "start:prod"]
