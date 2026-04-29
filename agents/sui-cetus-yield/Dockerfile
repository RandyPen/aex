FROM node:20-slim
RUN npm install -g @human.tech/waap-cli@latest
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "agent.js"]
