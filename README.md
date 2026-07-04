# Kshatriya Mewada Rajput Parivar — Matrimonial Portal

A bilingual (English / हिंदी) matrimonial web portal for the **Kshatriya Mewada Rajput Parivar** community, now rebuilt with a modern full-stack architecture.

## Tech Stack

- **Bun** — JavaScript runtime and package manager
- **Next.js 15** — React framework with App Router
- **TypeScript + TSX** — Type-safe components
- **Tailwind CSS + shadcn/ui** — Custom design system
- **Drizzle ORM** — Type-safe PostgreSQL access
- **PostgreSQL** — Relational database
- **jose + bcryptjs** — JWT session auth and password hashing
- **lru-cache** — In-memory service-layer caching

## Architecture Rules

- **ORMs are never touched directly.** All database access flows through typed services in `src/lib/services/*`.
- **LRU cache** wraps hot reads (approved profiles, user sessions, stats) for performance.
- **Server Actions** bridge the client components to the service layer.
- **Role-based access** for USER, ADMIN, and SUPER_ADMIN.

## Running Locally

### 1. Start PostgreSQL

```bash
bun run docker:up
```

### 2. Install dependencies

```bash
bun install
```

### 3. Push schema and seed data

```bash
bun run db:push
bun run db:seed
```

### 4. Run dev server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Default Login

- **Super Admin:** `6267282908` / `password123`
- **Sample Groom:** any seeded phone (see seed file) / `password123`

## Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start Next.js dev server |
| `bun run build` | Production build |
| `bun run db:push` | Push Drizzle schema to PostgreSQL |
| `bun run db:seed` | Seed 11 official groom profiles + super admin |
| `bun run db:reset` | Reset database and re-seed |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run docker:up` | Start PostgreSQL container |

## Pages

| Page | Description |
|------|-------------|
| `/` | Public homepage with hero, featured profiles, legacy info |
| `/profiles` | Searchable, filterable matchmaking grid (auth required) |
| `/dashboard` | User dashboard + bio-data generator + admin/super-admin panels |

## Project Structure

```
src/
  app/           # Next.js App Router pages and API routes
  components/    # React components (ui, layout, feature)
  lib/
    db/          # Drizzle schema + client
    services/    # Business logic / ORM abstraction layer
    actions/     # Next.js Server Actions
    auth/        # Password + JWT session utilities
    cache/       # LRU cache wrapper
  types/         # Shared TypeScript types
  scripts/       # Seed / reset scripts
```

## License

© 2026 Kshatriya Mewada Rajput Parivar. All rights reserved.
