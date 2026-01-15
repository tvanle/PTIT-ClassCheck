FROM node:20-alpine

WORKDIR /app

COPY libs ./libs
COPY tsconfig.base.json ./
COPY package*.json ./
COPY services/attendance-service ./services/attendance-service

WORKDIR /app/services/attendance-service
RUN npm install
RUN npm run build

CMD ["npm", "run", "start:prod"]
