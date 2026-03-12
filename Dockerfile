FROM node:22-alpine

WORKDIR /app

COPY yarn.lock package.json tsconfig.json prisma.config.ts ./
RUN yarn install --frozen-lockfile

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN yarn build

ENV NODE_ENV=production

CMD npx prisma migrate deploy && node dist/main
