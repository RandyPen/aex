FROM node:20-alpine

# Install waap-cli globally (root needed for /usr/local/bin). Pin to ^1.0.0 to
# match the runtime dep in package.json — supply-chain belt-and-suspenders.
RUN npm install -g @human.tech/waap-cli@^1.0.0

# Drop privileges for everything else. node:20-alpine ships a `node` user (uid 1000).
WORKDIR /app
RUN chown -R node:node /app
USER node

COPY --chown=node:node package*.json ./
RUN npm install --omit=dev
COPY --chown=node:node . .

CMD ["npm", "run", "start"]
