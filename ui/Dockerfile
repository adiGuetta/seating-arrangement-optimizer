FROM node:20-slim

WORKDIR /app
COPY package.json .
RUN npm install
COPY . .

ENV EXPO_USE_FAST_RESOLVER=1

EXPOSE 8081

CMD ["npx", "expo", "start", "--web", "--host", "lan", "--port", "8081", "--no-dev"]
