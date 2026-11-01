FROM oven/bun:1.4.4 AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Prisma needs OpenSSL (3.x) for its schema + query engines
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

# build
COPY . .
RUN bunx prisma generate && bun run build

ENV NODE_ENV=production
EXPOSE 3000
# Apply additive schema changes on boot. Prisma stops instead of accepting data loss.
CMD ["sh", "-c", "bunx prisma db push --skip-generate && bun run start"]
