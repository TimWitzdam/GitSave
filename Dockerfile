FROM node:lts-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
RUN apk add --no-cache openssl

FROM base AS prod-deps
RUN npm install --production

FROM base AS build-deps
RUN npm install --production=false

FROM build-deps AS build
COPY . .
RUN npx prisma db push
RUN npx prisma generate
RUN npm run build

FROM base AS runtime
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

COPY . .
RUN mkdir -p /app/data
RUN npx prisma db push
RUN npx prisma generate
RUN apk add --no-cache git

EXPOSE 3000
CMD npx prisma db push && npx tsx backend/server.ts 
