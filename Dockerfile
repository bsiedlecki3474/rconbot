FROM node:14
WORKDIR /usr/src/rconbot
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 8081
CMD [ "node", "index.js" ]