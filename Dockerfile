# stage 1
FROM node:20.10.0-alpine AS build

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max_old_space_size=1024

WORKDIR /usr/app

COPY package*.json ./

RUN npm install --omit=dev
RUN npm install prisma@5.20.0 --save-dev

COPY . .

RUN npx prisma generate

# stage 2
FROM alpine:3.17.2
RUN apk add --no-cache --update nodejs npm
COPY --from=build /usr/app /
COPY --from=build /usr/app/prisma ./prisma

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max_old_space_size=1024

EXPOSE 3000
CMD ["npm", "run", "deploy"]
#CMD [ "node", "src/server.js"]
#CMD [ "node", "src/tracing.js"]

#HEALTHCHECK CMD curl --fail http://localhost:3000 || exit 1