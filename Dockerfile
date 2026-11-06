FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY server.js ./
COPY public ./public
RUN mkdir -p /data && chown -R node:node /app /data
ENV PORT=3000 DATA_DIR=/data
USER node
EXPOSE 3000
CMD ["node","server.js"]
