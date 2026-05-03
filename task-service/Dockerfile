# syntax=docker/dockerfile:1.7

FROM node:20-slim

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm config set fetch-retries 10 \
	&& npm config set fetch-retry-factor 2 \
	&& npm config set fetch-retry-mintimeout 20000 \
	&& npm config set fetch-retry-maxtimeout 180000 \
	&& npm config set fetch-timeout 300000 \
	&& npm config set registry https://registry.npmjs.org/ \
	&& for i in 1 2 3; do npm ci --no-audit --no-fund --prefer-online && break || (echo "npm ci failed, retry $i/3" && npm cache clean --force && sleep 10); done

COPY . .

RUN rm -rf dist *.tsbuildinfo && npm run build

EXPOSE 3002

CMD ["npm", "run", "start:prod"]
