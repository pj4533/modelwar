# Battle System Design

Analysis of round counts, statistical validity, and future architecture options for ModelWar's battle system.

## Current Configuration

| Setting | Value |
|---------|-------|
| Core size | 55,440 |
| Max cycles | 500,000 |
| Max warrior length | 200 instructions |
| Max tasks | 10,000 |
| Min separation | 200 |
| Rounds per battle | 5 (best-of-5) |
| Rating system | Glicko-2 |

## Tournament Standards vs. Our Approach

### How Traditional Core War Hills Work

Traditional Core War uses King of the Hill (KOTH) servers like [KOTH@SAL](https://sal.discontinuity.info/). You submit a warrior, it plays each opponent **once**, and your hill position is determined by that single set of matches. Standard settings:

| Hill Type | Core Size | Max Length | Rounds per Match |
|-----------|-----------|------------|-----------------|
| ICWS'88 Standard | 8,000 | 100 | 100 |
| ICWS'94 Draft | 8,000 | 100 | 100-200 |
| KOTH@SAL | 8,000 | 100 | 250 (some hills 6x250) |
| Experimental Big | 55,440 | 200 | 100 |

Hills use high round counts (100-250+) because there's no rating system - each match must be statistically definitive on its own. Scoring is simple: 3 points per win, 1 per tie, across all rounds.

### Why We're Different

ModelWar doesn't use the hill model. Our system is closer to **chess**:

- Players challenge each other repeatedly over time
- Glicko-2 tracks rating, uncertainty (RD), and volatility
- Individual match upsets are expected and handled gracefully
- Ratings converge on true skill across many games

In chess, nobody requires each game to be best-of-250 to be "statistically valid." A single chess game has enormous variance, yet Elo/Glicko ratings work because they accumulate signal across many games.

### The Statistical Tradeoff

If Warrior A beats Warrior B 60% of the time per round:

| Rounds per Match | A wins the match | Wrong warrior wins |
|-----------------|------------------|-------------------|
| 5 | ~68% | ~32% |
| 25 | ~73% | ~27% |
| 50 | ~80% | ~20% |
| 250 | ~95%+ | <5% |

With 5 rounds, Glicko-2 needs **more battles** to converge on true rankings. But it will converge - RD shrinks as more data comes in. For warriors that are very close in skill (51-49 per round), 5 rounds is essentially a coin flip per match. But a rating system that reflects "these warriors are roughly equal" isn't wrong - it's accurate.

**250 rounds compensates for noise within a single match. Glicko-2 compensates for noise across many matches.** They solve the same problem at different scales.

## Performance Benchmarks

Measured on local hardware with our actual settings (core 55,440, max cycles 500K):

| Rounds | Avg Time per Battle | Per-Round Cost |
|--------|-------------------|----------------|
| 1 | ~1.2s | ~1.2s |
| 5 | ~4.7s | ~0.9s |
| 10 | ~8.6s | ~0.9s |
| 25 | ~24s | ~0.9s |
| 50 | ~48s | ~1.0s |
| 100 | ~94s | ~0.9s |
| 250 | ~235s (est) | ~0.9s |

Scaling is perfectly linear at ~935ms per round. The cost is dominated by our large core size (55,440 vs. the standard 8,000).

## Architecture Options for More Rounds

If we decide to increase round counts significantly in the future, the current synchronous API model won't work. Options explored:

### Option A: SSE Streaming Response

The challenge endpoint returns a Server-Sent Events stream, sending round results one at a time as they complete.

- Zero new infrastructure. Next.js 16 supports `ReadableStream` in route handlers.
- If the connection drops mid-battle, the result is lost.
- Only the initiating client sees live updates.

### Option B: Background Job + SSE Viewer

Two-phase: `POST /api/challenge` creates a battle with `status: 'in_progress'` and returns immediately. Battle runs in background via Next.js `after()` API. `GET /api/battles/{id}/live` streams results via SSE.

- Any number of clients can watch live. Battle survives disconnections.
- Battle state always in DB. Need `status` column and incremental round storage.
- `after()` is built into Next.js 15+ but not ideal for 4-minute CPU-bound work.

### Option C: Node Worker Thread + SSE

Like Option B, but the battle runs in a `worker_thread` so the main event loop stays responsive.

- Best for running multiple battles concurrently.
- Worker threads are tricky with Next.js webpack bundling.

### Recommendation

Option B is the sweet spot if we ever need async battles. The live-viewing experience (watching rounds come in one by one) is compelling as a **UX feature** independent of the statistical argument.

## Current Decision

**Stay with 5 rounds.** Glicko-2 compensates for per-match noise over time. The system favors fast iteration (many quick battles) over slow definitive matches. If we want to improve per-match signal cheaply, bumping to 25 rounds (~24s, still synchronous) is available as a quick win without any architecture changes.

The async battle infrastructure is a future option driven more by UX value (live battle watching) than statistical necessity.
