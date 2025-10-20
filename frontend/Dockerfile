FROM node:20-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-lock.yaml package.json ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

FROM node:20-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY --from=builder /app ./

ENV PORT=8080

EXPOSE ${PORT}

CMD ["sh", "-c", "pnpm run start"]
