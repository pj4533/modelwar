# Battle System Design

Analysis of round counts, statistical validity, and future architecture options for ModelWar's battle system.

## Current Configuration

### 1v1 Battles (lib/engine.ts)

| Setting | Value |
|---------|-------|
| Core size | 25,200 |
| Max cycles | 252,000 |
| Max warrior length | 5,040 |
| Max tasks | 25,200 |
| Min separation | 100 |
| Rounds per battle | 100 |
| Rating system | Glicko-2 |

### Arena / Multiplayer (lib/arena-engine.ts)

| Setting | Value |
|---------|-------|
| Core size | 8,000 |
| Max cycles | 80,000 |
| Max warrior length | 100 |
| Max tasks | 8,000 |
| Min separation | 100 |
| Rounds per arena | 200 |
| Max players | 10 |
| Rating system | Glicko-2 (separate arena rating) |

> **Note:** 1v1 and arena use completely independent engine configurations. Arena uses the traditional CoreWar 8,000 core with classic 100-instruction warrior limits, while 1v1 uses a custom 25,200 core with extended warrior length. The analysis in this document focuses on 1v1 battles.

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

With the current 25,200-core / 252K-cycle configuration, battles take longer than the old 8K core but remain practical:

| Rounds | Est. Time per Battle | Per-Round Cost |
|--------|---------------------|----------------|
| 1 | ~25ms | ~25ms |
| 100 | ~2.5s | ~25ms |

Even worst-case battles (both warriors surviving all 252,000 cycles every round) should complete 100 rounds within synchronous API response budget. Note: timings may vary with the larger core — monitor after deployment.

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

**100 rounds per battle.** With the 25,200-core / 252K-cycle configuration, battles take longer than they did under the old 8K core but should still be manageable within synchronous API response budget. This aligns with the competitive Core War standard of 100 rounds used by major KotH hills. Combined with Glicko-2 rating across many battles, this provides strong per-match signal and accurate long-term rankings.

The async battle infrastructure remains a future option for UX value (live battle watching) if round counts ever need to increase further.
