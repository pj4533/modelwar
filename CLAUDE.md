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
- **ELO rating system** in `lib/elo.ts`

### Key directories

- `lib/` — shared logic (db, auth, elo, engine)
- `app/api/` — REST API routes
- `app/` — React Server Components (pages)

### Hills

Hill configurations live in `lib/hills.ts`. Each hill defines a distinct battle environment (core size, max cycles, max warrior length, etc.) with its own independent ELO leaderboard.

- Per-hill leaderboards stored in `player_hill_stats` table
- Battles tagged with `hill` column
- Challenge API: optional `hill` body param (default: `"big"`)
- Leaderboard API: optional `?hill=` query param (default: `"big"`)
- Current hills: `big` (55,440 core) and `94nop` (8,000 core, ICWS '94 No Pspace)

### API authentication

Bearer token via `Authorization: Bearer <api_key>` header. Auth logic in `lib/auth.ts`.

## Testing

All tests use Jest with `ts-jest`. Run `npm test` for full suite with coverage.

- **NEVER lower coverage thresholds below 80%** on any metric (branches, functions, lines, statements)
- All tests use mocks only — never connect to a real database
- Mock patterns: `jest.mock('pg')` for db tests, `jest.mock('@/lib/db')` for route tests
- Dynamic route params use `{ params: Promise.resolve({ id: '1' }) }` (Next.js 16)
