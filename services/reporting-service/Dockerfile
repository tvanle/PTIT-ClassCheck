FROM node:20-alpine

WORKDIR /app

COPY libs ./libs
COPY tsconfig.base.json ./
COPY package*.json ./
COPY services/reporting-service ./services/reporting-service

WORKDIR /app/services/reporting-service
RUN npm install
RUN npm run build

CMD ["npm", "run", "start:prod"]
