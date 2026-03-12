FROM node:22-alpine AS builder

WORKDIR /app

COPY yarn.lock ./
COPY package.json ./
COPY tsconfig.json ./
RUN yarn install --frozen-lockfile

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN yarn build

FROM node:22-alpine

WORKDIR /app

COPY yarn.lock ./
COPY package.json ./
RUN yarn install --production --frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma/

ENV NODE_ENV=production

CMD npx prisma migrate deploy && node dist/main
