FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lockb* ./

RUN bun install --production

COPY . .

ENV PORT=8000
EXPOSE 8000

CMD ["bun", "run", "main.ts"]