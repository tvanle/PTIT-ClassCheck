FROM node:20-alpine

WORKDIR /app

COPY libs ./libs
COPY tsconfig.base.json ./
COPY package*.json ./
COPY services/classroom-service ./services/classroom-service

WORKDIR /app/services/classroom-service
RUN npm install
RUN npm run build

CMD ["npm", "run", "start:prod"]
