# Corewar Implementation Notes

## Current Package

We use the `corewar` npm package at version `0.2.3-alpha.8`, published June 2020.

- **npm**: `corewar@^0.2.3-alpha.8`
- **Old repo**: [github.com/corewar/corewar](https://github.com/corewar/corewar) (effectively abandoned, not archived)
- **New repo**: [github.com/corewar/corewar.io](https://github.com/corewar/corewar.io) (active monorepo, last commits Sep 2025)

## Package History

The `corewar` npm package has a confusing version history:

- `1.0.0` - `1.0.13`: Published Nov 2017 from the original `gareththegeek/corewar` repo. These are the **oldest** versions despite the higher semver.
- `0.0.13` - `0.1.7`: Published Nov 2017 - Jan 2020. The author reset versioning when restructuring the package.
- `0.2.0` - `0.2.3-alpha.8`: Published Feb - June 2020. **Latest on npm.** The `latest` dist-tag correctly points here.

The new `corewar.io` monorepo contains a `packages/corewar` directory at version `0.2.1` in source, but this has **never been published to npm**. The monorepo uses modern tooling (pnpm workspaces, Turborepo, tsup for ESM+CJS dual builds) but the npm registry still only has the old build.

## API Surface We Use

From `lib/engine.ts`:

- `corewar.parse(redcode)` - Parse a Redcode program, returns tokens/messages/success
- `corewar.runMatch(rules, warriors)` - Run a match between warriors with configurable rules

These APIs are identical between the installed version and the new repo source.

## Supported Opcodes

The package implements the ICWS'94 standard opcodes:

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

From `lib/engine.ts`:

| Option | Value | Description |
|--------|-------|-------------|
| `coresize` | 55,440 | Size of the core memory |
| `maximumCycles` | 500,000 | Max cycles before tie |
| `instructionLimit` | 200 | Max warrior length |
| `maxTasks` | 10,000 | Max concurrent processes per warrior |
| `minSeparation` | 200 | Min distance between warriors in core |

## Features NOT Implemented (in the package)

### P-Space (Private Storage)

[Open issue #37](https://github.com/corewar/corewar.io/issues/37) since Dec 2017. P-Space is a per-warrior private memory area that persists across rounds in a multi-round match. It enables warriors to adapt strategy based on previous round outcomes. Requires two additional opcodes:

- `LDP` (Load P-Space) - Read from private storage into core
- `STP` (Store P-Space) - Write from core into private storage

P-Space is part of the ICWS'94 draft standard but has never been implemented in this package.

#### Why P-Space Matters for ModelWar

P-Space is designed specifically for multi-round matches like our best-of-5 battles. The concept:

- Each warrior gets a private memory array that **persists between rounds** (unlike core, which resets every round)
- After each round, the simulator writes the result (win/loss/tie) into P-Space address 0
- The warrior can read that with `LDP` at the start of the next round and **change its strategy**

This enables adaptive warriors - e.g. "I lost round 1 with a scanner, so in round 2 I'll switch to a bomber."

#### Our Current Architecture Prevents P-Space

Even if the `corewar` package added P-Space support, our battle loop in `lib/engine.ts` wouldn't support it. We currently run each round as an independent single-round match with no shared state:

```typescript
// Current approach: 5 independent rounds, no state carried between them
for (let i = 0; i < NUM_ROUNDS; i++) {
    const roundResult = corewar.runMatch({ rounds: 1, options }, warriors);
}
```

For P-Space to work, the simulator needs to manage persistent storage across rounds, which means running all rounds as a single multi-round match:

```typescript
// What P-Space would require: simulator manages pspace between rounds
const result = corewar.runMatch({ rounds: 5, pspaceSize: N, options }, warriors);
```

#### Race Condition Non-Issue

A player updating their warrior via `POST /api/warriors` during an in-progress challenge does NOT affect the battle. The challenge route reads redcode into local variables at the start of the request, `runBattle()` executes synchronously with those string copies, and the actual redcode used is snapshot into the battle record. There are no async gaps where the DB could be re-read mid-battle.

### Extended Opcodes

[Open issue #39](https://github.com/corewar/corewar.io/issues/39) references additional opcodes from [corewar.co.uk/opcodes.htm](http://corewar.co.uk/opcodes.htm) that could be introduced in an advanced standard.

### Additional Simulator Options

[Open issue #31](https://github.com/corewar/corewar.io/issues/31). The `IOptions` interface has TODO comments for:

- `readDistance` - Limits how far a warrior can read in core
- `writeDistance` - Limits how far a warrior can write in core
- `separation` - Fixed separation between warriors (vs. random with `minSeparation`)

### MAXLENGTH Enforcement

[Open issue #32](https://github.com/corewar/corewar.io/issues/32). We enforce max warrior length ourselves in `parseWarrior()` since the package doesn't handle it.

## Upgrade Assessment

**No upgrade available.** The new monorepo has not published to npm and contains no new simulation features. The differences are purely build tooling:

| Aspect | Installed (0.2.3-alpha.8) | New repo (0.2.1 unpublished) |
|--------|--------------------------|------------------------------|
| Build system | Older JS bundle | tsup (ESM + CJS) |
| TypeScript | Bundled `.d.ts` | Better type exports |
| Features | ICWS'94 subset | Same ICWS'94 subset |
| P-Space | No | No |
| New opcodes | No | No |

### Options if We Need New Features

1. **Stay on current version** - Pragmatic choice. It works, API is stable.
2. **Install from git** - `npm install corewar/corewar.io#main` won't work cleanly since it's a monorepo with nested packages.
3. **Fork and extend** - Fork `packages/corewar` from the monorepo, implement P-Space/extended opcodes, publish our own package.
4. **Contribute upstream** - Implement features and PR to `corewar.io`. Low likelihood of merge given project activity patterns.
5. **Build our own** - Write a custom Redcode parser/simulator. Most control but significant effort.
