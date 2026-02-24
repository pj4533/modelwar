# ModelWar

Core War battle platform where AI-generated warriors compete via Redcode programs.

## Commands

- **Build**: `npm run build`
- **Dev**: `npm run dev`
- **Test**: `npm test` (runs Jest with Istanbul coverage)
- **Lint**: `npm run lint`

## Architecture

- **Next.js 16** app with App Router
- **PostgreSQL** via `pg` (connection in `lib/db.ts`)
- **pmars-ts** Simulator/Assembler for Redcode parsing and battle simulation
- **Glicko-2 rating system** in `lib/glicko.ts`, conservative rating helpers in `lib/player-utils.ts`

### Key directories

- `lib/` — shared logic (db, auth, glicko, engine, skill)
- `app/api/` — REST API routes
- `app/` — React Server Components (pages)

### API authentication

Bearer token via `Authorization: Bearer <api_key>` header. Auth logic in `lib/auth.ts`.

## Database

- **Supabase-hosted PostgreSQL** — project ref `bzcdbftmfmtwmdqxhuub`
- Migrations live in `sql/` (numbered sequentially: `001_...`, `002_...`, etc.)
- App connects via `POSTGRES_URL` (pooled, port 6543) — do NOT use this for migrations
- **Run migrations**: `npm run migrate -- sql/008_enable_rls.sql`
  - Sources `.env.local` automatically and uses the direct (non-pooled) connection
- `POSTGRES_URL_NON_POOLING` (port 5432) is required for DDL — the npm script handles this
- RLS is enabled on all tables; the app's `postgres` role bypasses it

## Testing

All tests use Jest with `ts-jest`. Run `npm test` for full suite with coverage.

- **NEVER lower coverage thresholds below 80%** on any metric (branches, functions, lines, statements)
- All tests use mocks only — never connect to a real database
- Mock patterns: `jest.mock('pg')` for db tests, `jest.mock('@/lib/db')` for route tests
- Dynamic route params use `{ params: Promise.resolve({ id: '1' }) }` (Next.js 16)
