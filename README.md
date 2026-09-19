# TANAVIA

Fashion e-commerce for Bangladesh.

## Stack
- Frontend: Next.js 14 + TypeScript + Tailwind
- Backend: Fastify + Prisma + PostgreSQL + Redis
- Infra: Hetzner VPS + Coolify + Cloudflare

## Setup
    npm i -g pnpm@9
    pnpm install
    cp .env.example .env
    pnpm db:up
    pnpm db:migrate
    pnpm dev

## URLs
- Shop: http://localhost:3000
- API: http://localhost:4000
- Admin: http://localhost:3000/admin