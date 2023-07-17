# stage 1
FROM node:18.16.0-alpine AS build

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max_old_space_size=1024

WORKDIR /usr/app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

# stage 2
FROM alpine
RUN apk add --no-cache --update nodejs npm
COPY --from=build /usr/app /

EXPOSE 3000
#CMD [ "node", "src/server.js"]
CMD [ "node", "src/tracing.js"]

#HEALTHCHECK CMD curl --fail http://localhost:3000 || exit 1