# Corewar Implementation Notes

## Current Package

We use the `pmars-ts` npm package — a TypeScript port of the classic pMARS simulator with full ICWS'94 support including P-Space.

- **npm**: `pmars-ts`
- **API**: `Simulator` and `Assembler` classes

## API Surface We Use

From `lib/engine.ts` and `workers/replay-worker.ts`:

- `Assembler` — Parse/assemble Redcode programs, returns `AssembleResult` with `WarriorData`
- `Simulator` — Run battles with `loadWarriors()`, `run()`, `runRound()`, `setupRound()`, `step()`
- `SimulatorEventListener` — Event callbacks for replay visualization (`onCoreAccess`, `onTaskCount`, `onRoundEnd`)

## Supported Opcodes

The package implements the full ICWS'94 standard opcodes:

| Opcode | Description |
|--------|-------------|
| `DAT` | Data (kills process) |
| `MOV` | Move |
| `ADD` | Add |
| `SUB` | Subtract |
| `MUL` | Multiply |
| `DIV` | Divide |
| `MOD` | Modulo |
| `JMP` | Jump |
| `JMZ` | Jump if zero |
| `JMN` | Jump if not zero |
| `DJN` | Decrement and jump if not zero |
| `CMP`/`SEQ` | Skip if equal |
| `SNE` | Skip if not equal |
| `SLT` | Skip if less than |
| `SPL` | Split (spawn process) |
| `NOP` | No operation |
| `LDP` | Load from P-Space |
| `STP` | Store to P-Space |

## Supported Addressing Modes

| Symbol | Mode |
|--------|------|
| `#` | Immediate |
| `$` | Direct |
| `*` | A-Indirect |
| `@` | B-Indirect |
| `{` | A Pre-Decrement |
| `<` | B Pre-Decrement |
| `}` | A Post-Increment |
| `>` | B Post-Increment |

## Supported Modifiers

`.A`, `.B`, `.AB`, `.BA`, `.F`, `.X`, `.I`

## Simulator Options We Configure

ModelWar runs two independent engine configurations for different game modes.

### 1v1 Battles (from `lib/engine.ts`)

| Option | Value | Description |
|--------|-------|-------------|
| `coreSize` | 25,200 | Size of the core memory (non-standard; traditional is 8,000) |
| `maxCycles` | 252,000 | Max cycles before tie |
| `maxLength` | 5,040 | Max warrior instruction count (explicit limit, 20% of core) |
| `maxProcesses` | 25,200 | Max concurrent processes per warrior |
| `minSeparation` | 100 | Min distance between warriors in core |
| `seed` | random | Single seed per battle, shared across all rounds |
| rounds | 100 | Rounds per battle |

### Arena / Multiplayer (from `lib/arena-engine.ts`)

| Option | Value | Description |
|--------|-------|-------------|
| `coreSize` | 8,000 | Traditional CoreWar core size |
| `maxCycles` | 80,000 | Max cycles before tie |
| `maxLength` | 100 | Classic warrior instruction limit |
| `maxProcesses` | 8,000 | Max concurrent processes per warrior |
| `minSeparation` | 100 | Min distance between warriors in core |
| `seed` | random | Single seed per arena, shared across all rounds |
| rounds | 200 | Rounds per arena |
| max warriors | 10 | Maximum players per arena |

## P-Space (Private Storage)

P-Space is fully supported via pmars-ts. Each warrior gets a private memory area that persists across rounds in a multi-round match, enabling adaptive strategies.

- Warriors use `LDP` to read from P-Space and `STP` to write to P-Space
- After each round, the simulator writes the result (win/loss/tie) into P-Space address 0
- The `Simulator` preserves P-Space across rounds when using `run(NUM_ROUNDS)` or sequential `runRound()` calls
- This enables adaptive warriors that change strategy based on previous round outcomes

### Battle Loop Architecture

**1v1:** The battle loop in `lib/engine.ts` creates a single `Simulator` instance and calls `sim.run(100)` which runs all 100 rounds as a single multi-round match. The Simulator handles fairness internally by rotating the starting warrior each round and preserves P-Space between rounds.

**Arena:** The battle loop in `lib/arena-engine.ts` creates a `Simulator` configured for N warriors (2-10) and runs 200 rounds via sequential `sim.runRound()` calls, tracking per-warrior scores and task counts each round.

### Replay P-Space Accuracy

The replay worker (`workers/replay-worker.ts`) maintains P-Space accuracy by fast-forwarding through prior rounds before replaying the target round. When replaying round N, it runs rounds 0..N-1 without an event listener to build correct P-Space state, then sets up the target round with the event listener for visualization.

### Race Condition Non-Issue

A player updating their warrior via `POST /api/warriors` during an in-progress challenge does NOT affect the battle. The challenge route reads redcode into local variables at the start of the request, `runBattle()` executes synchronously with those string copies, and the actual redcode used is snapshot into the battle record. There are no async gaps where the DB could be re-read mid-battle.

## MAXLENGTH Enforcement

The `Assembler` class enforces max warrior length during assembly. Each mode has its own assembler instance with its own limit:

- **1v1**: Warriors exceeding 5,040 instructions (20% of the 25,200 core) are rejected. Validated at upload via `parseWarrior()` in `lib/engine.ts`.
- **Arena**: Warriors exceeding 100 instructions (the classic limit for the 8,000 core) are rejected. Validated at upload via the arena warrior endpoint using the assembler in `lib/arena-engine.ts`.
