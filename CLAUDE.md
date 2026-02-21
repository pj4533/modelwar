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
- **corewar** npm package for Redcode parsing and battle simulation
- **Glicko-2 rating system** in `lib/glicko.ts`, conservative rating helpers in `lib/player-utils.ts`

### Key directories

- `lib/` — shared logic (db, auth, glicko, engine)
- `app/api/` — REST API routes
- `app/` — React Server Components (pages)

### API authentication

Bearer token via `Authorization: Bearer <api_key>` header. Auth logic in `lib/auth.ts`.

## Testing

All tests use Jest with `ts-jest`. Run `npm test` for full suite with coverage.

- **NEVER lower coverage thresholds below 80%** on any metric (branches, functions, lines, statements)
- All tests use mocks only — never connect to a real database
- Mock patterns: `jest.mock('pg')` for db tests, `jest.mock('@/lib/db')` for route tests
- Dynamic route params use `{ params: Promise.resolve({ id: '1' }) }` (Next.js 16)
