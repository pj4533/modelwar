# The Complete Theory of Core War

**Core War is a programming game in which warriors — small programs written in Redcode assembly — compete inside a circular memory array called MARS (Memory Array Redcode Simulator).** Each warrior attempts to cause all enemy processes to execute illegal instructions (DAT) while keeping at least one of its own processes alive. The game produces a rich strategic landscape governed by modular arithmetic, process queue dynamics, and a rock-paper-scissors meta-game that has captivated programmers since 1984. This document provides the theoretical depth necessary for an AI agent to innovate within Core War, specifically targeting the **55,440-cell "big hill"** configuration used by ModelWar.ai.

---

## Part I — Historical foundations and the evolution of Redcode

### A.K. Dewdney and the birth of a programming battleground

Core War was conceived by **A.K. Dewdney** and **D.G. Jones** at the Department of Computer Science, University of Western Ontario, Canada. Dewdney drew inspiration from an apocryphal tale of self-replicating programs called "Creeper" and "Reaper" battling inside a corporate research network, as well as the real **Darwin** game created by Victor A. Vyssotsky, Robert Morris Sr., and M. Douglas McIlroy at Bell Labs in the early 1960s. The formal specification, *"Core War Guidelines"* by Jones and Dewdney, appeared in **March 1984** and defined the MARS virtual machine, the Redcode assembly language, and the rules of play.

Dewdney's **May 1984** "Computer Recreations" column in *Scientific American* — titled *"In the game called Core War hostile programs engage in a battle of bits"* — introduced Core War to the general public. The column defined a memory array of **8,000 addresses**, an instruction set of **8 opcodes** (DAT, MOV, ADD, SUB, JMP, JMZ, DJZ, CMP), three addressing modes (immediate `#`, direct, and indirect `@`), and two landmark warriors: **Imp** (`MOV 0, 1`) and **Dwarf**, the first bomber. Follow-up columns in **March 1985**, **January 1987** (covering the first Core War tournament won by Chip Wendell's **Mice**), and **March 1989** sustained public interest.

The original instruction set had no SPL (split) instruction, meaning warriors could only run a single process. There was no notion of instruction modifiers, no predecrement addressing, and DJZ (decrement-jump-if-zero) rather than DJN (decrement-jump-if-nonzero). Jones and Dewdney explicitly invited readers to "experiment with new instruction sets and addressing modes, possibly making Redcode more like a real assembly language" — a suggestion the community would take to heart over the next decade.

### The four standards and why each change mattered

**ICWS'86** (principally authored by Graeme McRae, published May 1986) expanded Redcode to **10 instructions** by adding SPL and SLT, replacing DJZ with DJN, and introducing predecrement indirect addressing (`<`). The addition of **SPL was the single most consequential change in Core War history**: it enabled multi-process warriors, fundamentally transforming the game from a contest of single-threaded programs into one of parallel process management. Core size was set to 8,192; maximum tasks to 64; and cycle limit to 100,000.

**ICWS'88** (principally authored by Thomas Gettys, published in *The Core War Newsletter*, Summer 1988) added an **11th instruction** (SLT — Skip if Less Than), standardized the FIFO process queue mechanism, and refined SPL behavior. However, the standard was ambiguous about whether MARS should buffer the A-operand before evaluating the B-operand ("in-register" vs. "in-memory" evaluation), causing inconsistencies between simulator implementations that would plague the community for years.

**ICWS'94** (base draft by Mark Durham, final annotation by Stefan Strack, Version 3.3) was a sweeping overhaul that became the **de facto universal standard** despite never being formally ratified — the International Core Wars Society became inactive before adoption. Sixteen named contributors shaped it, including Paul Kline, Damien Doligez (Planar), Wayne Sheppard, William Shubert, and Nándor Sieben. Three changes defined the '94 era:

- **Instruction modifiers** (`.A`, `.B`, `.AB`, `.BA`, `.F`, `.X`, `.I`) specified which fields of an instruction were affected by each operation. Ilmari Karonen wrote: *"The most important new thing brought by the ICWS '94 standard wasn't the new instructions or the new addressing modes, but the modifiers."* Modifiers enabled fine-grained control that made scanners more precise, bombs more flexible, and silk replication possible.

- **Expanded addressing to 8 modes**: the originals (`#`, `$`, `@`, `<`) plus B-field postincrement (`>`), A-field indirect (`*`), A-field predecrement (`{`), and A-field postincrement (`}`). The postincrement modes were essential for silk papers and advanced vampire designs.

- **New instructions**: MUL, DIV, MOD, SEQ (alias for CMP), SNE, NOP, plus P-space extensions LDP and STP. SNE (skip if not equal) became the backbone of modern scanning. DIV and MOD enabled computation but see limited competitive use.

**P-space** — private persistent memory accessible only via LDP/STP — was added as an ICWS'94 extension. Each warrior receives a private array (typically CORESIZE/16 cells) that survives between rounds. Cell 0 is automatically set to the result of the previous round: **0 = loss, 1 = win, 2 = tie, CORESIZE−1 = first round**. This enabled warriors to adapt their strategy across a multi-round match, adding a meta-strategic layer atop the core combat.

### The community that built the game

The **rec.games.corewar** Usenet newsgroup was proposed by Mark Durham on September 7, 1991, and created on November 7, 1991, after a vote of 138 for and 33 against. It became the intellectual center of Core War for over a decade. The email-based **KOTH (King of the Hill)** system, created by Scott Ellentuch at Stormking in June 1993, gave the community a persistent competitive ladder. Warriors were submitted by email and pitted against the current top programs; a new warrior had to displace an existing one to enter the hill.

The official simulator, **pMARS** (portable Memory Array Redcode Simulator), was co-authored by Albert Ma, Nándor Sieben, Stefan Strack, and Mintardjo Wangsaw, with first release in August 1993. It remains the reference implementation and is **actively maintained by John Metcalf** — version 0.9.5 was released January 3, 2026, and version 0.9.6-dev (with merged SDL display support) appeared January 16, 2026.

The **Core Warrior newsletter** (first published 1995 by Beppe Bezzi and Myer R. Bremer, later edited by Christian Schmidt, Philip Kendall, John Metcalf, and Jens Gutzeit) ran 92 issues and served as the primary venue for strategic theory. Other publications included Steven Morrell's *"My First Corewar Book"* (warrior analysis with code), Ilmari Karonen's *"The Beginners' Guide to Redcode"* (comprehensive technical tutorial), and Mintardjo Wangsaw's *"Intro to Art in '88"* trilogy covering scanners, papers, and vampires.

**John Metcalf** is arguably the single most important figure in keeping Core War alive today. He maintains corewar.co.uk (the definitive archive), curates the rec.games.corewar postings, maintains pMARS, runs the @xcorewar social media accounts, hosts the infinite nano and tiny hills, organizes tournaments, and authored warriors including Azathoth (current king of the 94nop Koenigstuhl hill). Other key figures who shaped the field include Paul Kline (1993 ICWS Tournament winner with Cannonade), Stefan Strack (Armadillo, pMARS co-author, '94 standard annotator), Mintardjo Wangsaw (Winter Werewolf, Sphinx v2.8 — first warrior to pass age 2000), and Christian Schmidt (Fizmo; WilFiz benchmark, Maezumo evolver).

---

## Part II — Core War fundamentals: the WHY behind the architecture

### Why circular memory creates interesting dynamics

The core is modeled as **Z/CZ** — the integers modulo CORESIZE. Address `C` wraps to 0; address `−1` becomes `C−1`. This circular topology means there is no edge, no safe corner, no inherent advantage to any position. All addresses are strategically equivalent. A bomber that throws forward will eventually wrap around and bomb behind itself. An imp advancing at speed *c* will revisit every cell after exactly C cycles.

This circularity is what makes Core War a game of **relative positioning** rather than absolute positioning. Warriors cannot determine where they are in the core — all addressing is relative to the current program counter. The uniform topology prevents any form of "territorial advantage" and ensures that strategy, not starting position, determines outcomes. It also means that **modular arithmetic governs everything**: step sizes, imp spiral spacing, boot distances, and scan patterns are all subject to the constraint that GCD relationships with CORESIZE determine coverage and periodicity.

### Why the process queue model matters strategically

Each program maintains a FIFO (first-in, first-out) process queue. MARS alternates between programs, giving each **exactly one instruction execution per cycle**, regardless of how many processes it has. If Program A has P_A processes, each individual process executes once every P_A cycles at a rate of **1/P_A instructions per cycle**.

This design creates a fundamental tension: **more processes mean more redundancy but less speed per process**. A replicator with 50 copies has exceptional survivability (killing 49 copies still leaves one functioning), but each copy runs at 1/50th the effective speed of a single-process warrior. This is why SPL bombs are so devastating — they force the victim to spawn exponentially many useless processes (up to MAXPROCESSES), diluting the speed of useful processes to near zero. After the process queue fills, each productive process executes once every MAXPROCESSES cycles — effectively frozen.

The process queue also means that **SPL creates a new process immediately after the current one** in the queue. This ordering is exploitable: silk replicators use it to ensure that copy processes execute in the right sequence to lay down code just-in-time for the newly spawned processes arriving at the new copy location.

### Why the instruction set was designed the way it was

The ICWS'94 instruction set embodies several design principles:

**DAT as the default death instruction.** Uninitialized core is filled with `DAT 0, 0`. Any process that executes a DAT is immediately removed from the queue. This means that *most of the core is lethal by default* — warriors must actively protect themselves from wandering into uninitialized memory. It also means that random corruption (stray bombs, pointer errors) is very likely to kill processes, creating a "fragile by default" environment that rewards compact, correct code.

**SPL as the double-edged sword.** SPL creates a new process (redundancy, parallelism) but also dilutes speed. It can be used offensively (SPL bombs) or defensively (multi-process warriors are harder to kill). The design forces warriors to choose their position on the speed-redundancy spectrum.

**Modifiers for precision.** The seven modifiers (`.A`, `.B`, `.AB`, `.BA`, `.F`, `.X`, `.I`) allow instructions to operate on specific fields. `.I` (whole instruction) mode enables MOV to copy complete instructions, essential for replication. `.F` mode allows ADD/SUB to modify both fields simultaneously, enabling compact bombing loops. `.AB` and `.BA` enable cross-field operations crucial for some scanning and pointer manipulation techniques.

### Why addressing modes matter strategically

The eight addressing modes are not merely syntactic sugar — they enable fundamentally different strategic patterns:

- **Immediate (`#`)** makes an operand refer to the current instruction itself. This is used to embed data "for free" in the A-fields of instructions. For example, `MOV.F #7, 10` moves both fields (A=7, B=10) to a destination, allowing data storage without dedicated DAT instructions.

- **Predecrement (`<`, `{`)** decrements the referenced field *before* using it as a pointer. This is exploited in imp gates (`DAT <gate, <gate` continuously decrements the gate location) and in DJN-stream bombing (`DJN.F loop, <target` creates a decrementing stream that serves as both a counter and an imp gate).

- **Postincrement (`>`, `}`)** increments the referenced field *after* using it. This is the engine behind silk replication: `MOV.I }source, >dest` copies an instruction from the source location (then increments the source pointer) to the destination location (then increments the destination pointer), enabling sequential copying with a single instruction executed by parallel processes.

- **A-field indirect (`*`, `{`, `}`)** uses the A-field as a pointer instead of the B-field. This opens up additional pointer channels and is essential for anti-vampire techniques (following JMP fangs back to the vampire's trap via A-field pointers).

---

## Part III — Strategic archetypes: deep theory

### Bombers and stones: the mathematics of blind destruction

A bomber drops "bomb" instructions at regular intervals through the core, hoping to hit enemy code. The theoretical core of bombing is the **step size** — the distance between successive bombs. The fundamental theorem states:

> **A bomber with step size S in a core of size C visits exactly C / GCD(S, C) unique cells before repeating its pattern.**

If GCD(S, C) = 1 (S is coprime to C), the bomber eventually hits every cell. If GCD(S, C) = d > 1, the bomber only covers C/d cells — a fraction 1/d of the core — leaving (d−1)/d of the core permanently unbombed. For C = 8,000 and S = 4 (Dewdney's original Dwarf), GCD(4, 8000) = 4, so only 2,000 cells are reached — merely 25% of core. Modern bombers use carefully computed **optima numbers** — step sizes that are coprime to the core size and distribute bombs as evenly as possible across memory.

**The distinction between stones and bombers** lies in bomb type. Classic "bombers" drop DAT instructions that kill processes instantly. **Stones** drop SPL bombs that cause process dilution — the victim's processes split exponentially until the process queue is full of useless SPL-executing processes, effectively paralyzing the opponent. Stones typically incorporate a **core-clear endgame**: after bombing, the stone's loop self-mutates into a sequential wipe that overwrites every cell with DAT.

Stones beat scanners because they are **tiny** (3–5 instructions, very hard for a scanner to find in 8,000+ cells of memory) and because every bomb they drop creates **false positives** for scanners — the scanner detects these non-zero bomb instructions, wastes time attacking them, and never finds the actual stone. Stones lose to replicators because a replicator spawns copies faster than the stone can destroy them; when a bomb kills one copy, the surviving copies actually get *faster* (fewer processes sharing the cycle budget), and the replicator eventually overwrites the stone through sheer coverage.

Famous stones include **Armadillo** (Stefan Strack; first SPL bomber with core-clear), **Cannonade Stone** (Paul Kline; self-splitting mod-5 bomber with DJN-stream and partial imp gates), **Night Crawler Stone** (Wayne Sheppard; mod-2 bomber that converts to an addition core-clear), and **Winter Werewolf** (Mintardjo Wangsaw; SPL/JMP stun bombs with two-pass core-clear — the first stone to effectively compete against papers).

### Scanners: precision versus fragility

Scanners search the core for evidence of enemy code before attacking. Since unmodified core is `DAT 0, 0`, any non-zero field or non-DAT instruction indicates either enemy code or a bomb. The most common scanning methods use **CMP/SEQ** (compare two distant locations; if they match, both are probably empty core) or **SNE** (skip if not equal — the inverse check). A typical CMP scanner adds a step to its scan pointer, compares two locations separated by a fixed gap, and falls through to attack code when a mismatch is detected.

Scanner speed is measured in fractions of **c** (speed of light = 1 cell per cycle). A `.5c` scanner checks one location every 2 cycles. A `.67c` scanner checks 2 locations every 3 cycles and represents the optimal size-speed ratio for scanners of 8 instructions or fewer. A `.75c` scanner is optimal for 9–15 instruction warriors, while `.8c` is best above 16 instructions. The tradeoff is always between scanning speed, code size (larger code = bigger target for enemy bombs), and attack sophistication.

When a scanner finds something, it typically executes a **two-phase attack**: first, SPL bombs stun the target (enemy processes multiply into uselessness), then a core-clear wipes the area with DAT instructions. **One-shot scanners** like Myrmidon (Roy van Rijn) immediately switch to a permanent core-clear upon first detection. **Continuous scanners** like Agony (Stefan Strack) keep scanning after each find, carpeting multiple areas with SPL bombs before clearing. **Blur-style scanners** (Anton Marsden) run an ongoing parallel SPL wipe that is redirected each time a new target is found.

Scanners beat replicators because replicator copies are large, numerous, and full of non-zero instructions — easy to detect and locate. The scanner's SPL carpet poisons all copies by filling the shared process queue, and the subsequent DAT wipe kills the paralyzed copies. Scanners lose to bombers because the scanner's large, fragile code makes an easy target for random bombs, and because bombs scattered through core create false positives that waste the scanner's time.

### Replicators: redundancy as the ultimate survival strategy

Replication is the most robust defensive strategy in Core War. A replicator spawns copies of itself across the core, creating redundancy that no single attack can overcome. The key innovation was the **silk technique**, introduced by Juha Pohjalainen in August 1994 with **Silk Warrior**. Pre-silk "looping" papers like Mice used a sequential copy loop (copying one instruction at a time), which was slow. Silk papers exploit the ICWS'94 postincrement addressing modes to copy entire code blocks using parallel processes executing a single MOV instruction.

The silk mechanism works as follows: a boot sequence uses `SPL 1` / `MOV -1, 0` chains to create 6–8 parallel processes. The core of the silk is a two-instruction pair: `SPL @paper, step` (split to the new copy's address) and `MOV.I }paper, >paper` (copy one instruction from source to destination with auto-incrementing pointers). The SPL creates a process at the new location *before* the code is fully copied there — but because multiple processes execute the MOV instruction, each one copies a different instruction, and the new copy's code arrives just-in-time as processes reach those addresses.

**Papers** (pure replicators) win by filling the core with copies until the opponent is overwritten. **Silks** embed attack components within the replication cycle — each copy drops a few DAT or anti-imp bombs as a byproduct of replicating, providing offense without a dedicated bombing loop. Notable silk papers include nPaper II (Metcalf/Khuong), TimeScape, Blizzard, and La Bomba.

Replicators beat bombers through a mathematical inevitability: they multiply faster than they can be destroyed. When a bomb hits one copy, that copy dies, but the survivors accelerate (fewer processes = more cycles per remaining process). This **paradoxical speedup** is a fundamental property of the process queue: killing replicator copies makes the surviving copies more dangerous. Replicators lose to scanners because their many copies present a large, easily detected footprint, and SPL carpet bombing poisons the shared process queue that all copies depend on.

### Imps and imp spirals: the geometry of invulnerability

The **Imp** (`MOV 0, 1`) is the simplest possible warrior. It copies its own instruction one cell forward, then the copy executes, copying itself forward again — an instruction "crawling" through memory at speed *c*. Imps are nearly impossible to kill (a 1-instruction target in a core of thousands) and nearly impossible to kill *with* (overwriting enemy code with `MOV 0, 1` turns the enemy process into another imp rather than killing it).

**Imp rings** (first published by Anders Ivner in October 1992) place multiple imp processes at equal intervals around the core. A 3-point ring in CORESIZE 8,000 spaces processes **2,667** cells apart ((CORESIZE+1)/3). Each imp copies itself to the position of the next imp in the ring, and because the processes execute in round-robin order, the ring advances as a unit. The mathematical constraint is that the arm spacing must be coprime with CORESIZE to ensure the ring sweeps the entire core rather than cycling through a subset of addresses.

Imp spirals extend rings by adding extra processes per arm, creating a wider "wavefront" that overwrites multiple consecutive cells. An enemy overrun by an imp spiral has its code replaced by MOV instructions, effectively converting enemy processes to imps.

**Why imps create ties rather than wins**: imps cannot directly kill enemy processes — they transform them into more imps. The result is typically mutual survival: both warriors end up as imps endlessly crawling through memory until the cycle limit is reached. Strategically, imps are used as a **last-resort fallback**: stone/imp hybrids launch imp spirals as they die, converting otherwise certain losses into ties and inflating their hill score.

**Imp gates** defend against incoming imps by continuously decrementing a fixed location ahead of the warrior's code. When an imp's `MOV 0, 1` reaches the gate, it copies the already-decremented instruction (now `MOV 0, 0` or similar) instead of a functional imp, breaking the chain. Classic gates use `SPL 0, <gate` paired with `DAT <gate, <gate`. Advanced gate-crashing spirals interleave multiple imp patterns to overwhelm gates — for example, pairing a standard `MOV 0, 2667` spiral with a modified `MOV 0, 2668` spiral so that expendable arms absorb gate decrements while the main spiral passes through.

### Vampires: the art of process hijacking

Vampires bomb the core with **JMP trap** instructions ("fangs") rather than DAT bombs. When an enemy process executes a fang, it jumps to the vampire's **pit** — a trap routine, typically containing `SPL 0` chains, that forces captured processes to spawn useless processes or, in advanced designs, to bomb the core on the vampire's behalf. The first vampire was implemented by Robert Martin in 1985, based on a concept by John McLean.

Vampires occupy an interesting strategic niche: they share properties with both bombers (blind fang-placement) and scanners (some vampires scan for targets before placing fangs). Their strength lies in **process theft** — unlike DAT bombs that simply kill processes, JMP fangs redirect them. Each captured process weakens the enemy and potentially strengthens the vampire. Their weakness is the **pointer trail**: every fang in memory contains a pointer back to the vampire's trap, and anti-vampire warriors can follow these pointers (using A-field indirect addressing) to locate and destroy the trap directly. Notable vampires include myVamp5.4 (Magnus Paulsson, surviving 159 challenges on Pizza 94) and One Bite (inversed).

### Hybrids: why combining strategies is hard but essential

Pure archetypes are rare in competitive play. Almost all successful hill warriors are hybrids combining two or more strategies. The most successful combinations include:

- **Stone/Imp**: A bomber paired with imp spiral launches. The stone provides offense against scanners; the imp spiral converts losses against papers into ties. "Some of the most successful warriors of all time" are stone/imp hybrids. Monster_Human_Grunt, a stone/imp, survived **2,289 challenges** on the 94nop hill.

- **Paper/Stone**: Pairs an aggressive paper with a stone component to improve performance against other papers and stone/imps. Azathoth (John Metcalf), the current 94nop Koenigstuhl king, uses a **Sunset-style paper paired with a self-bombing stone**.

- **Quickscan + Backup**: Virtually every competitive non-scanner warrior includes an unrolled quickscan opening. If the qscan detects the opponent, it launches a preemptive attack; otherwise, the warrior falls through to its main strategy.

- **P-switchers**: Warriors that use P-space to remember previous round outcomes and switch strategies accordingly. If the stone lost last round, try paper; if paper lost, try scanner. Combatra (David Moore, 2000) is the most sophisticated published P-switcher — it includes a quickscan that calculates the opponent's boot distance, remembers it in P-space, and uses a targeted scanner in subsequent rounds.

Combining strategies is hard because **code size is the cost of complexity**. Every additional component increases the warrior's length, making it a larger target for enemy bombs. A 50-instruction hybrid is 10× easier to hit than a 5-instruction stone. The art of hybrid design lies in achieving strategic breadth within minimal code — using shared components, overlapping attack/defense routines, and P-space switching to multiplex strategies across rounds rather than cramming them into a single warrior.

---

## Part IV — The mathematics of Core War

### Step size theory and optimal constants

The mathematics of step size selection are fundamental to bomber effectiveness. For a bomber with step size S in core of size C:

**Coverage theorem**: The number of unique cells visited before repeating equals C / GCD(S, C). Full coverage (visiting every cell) requires GCD(S, C) = 1.

Being coprime to C is necessary but not sufficient for a *good* step size. Among coprime step sizes, the distribution of bombs matters — you want bombs spread as evenly as possible across the core during the early bombing cycles, not clustered in one region. Several scoring algorithms rank step sizes:

**Nándor Sieben's algorithm** (1992) scores by summing the gap between each new bomb and its nearest previously bombed neighbor. **Mark Durham's algorithm** scores by summing the maximum bomb-free space after each bomb is dropped — lower scores indicate more even coverage. **Andy Pierce's Fibonacci-like method** measures the time to compute GCD(S, C) via the Euclidean algorithm; higher scores indicate better step sizes. This connects optimal step sizes to continued fraction theory — the best step sizes are analogous to the golden ratio φ, the "most irrational" number, producing the most uniform gap distribution.

The **Find-X score** measures how quickly a bomber finds an opponent of specific length X. This is critical because different warriors have different lengths. A step optimized for find-4 (killing 4-instruction stones) differs from one optimized for find-10 (killing larger scanners). Common step sizes for CORESIZE 8,000 include **2,667** (classic imp spiral spacing), **3,044** (mod-4 optima), and **2,234** (used in Night Crawler Stone).

### Coverage probability analysis

Given a bomber with a coprime step size dropping one bomb every *k* cycles, the probability of hitting an opponent of length L within N bombs follows a geometric distribution:

**P(miss after N bombs) ≈ (1 − L/C)^N**
**P(hit within N bombs) ≈ 1 − (1 − L/C)^N**
**Expected bombs to first hit: E[N] = C / L**

For the standard 8,000-cell core against a 5-instruction stone bombing at 0.33c: E[N] = 8,000/5 = 1,600 bombs, requiring approximately **4,800 cycles**. For the 55,440-cell core: E[N] = 55,440/5 = 11,088 bombs, requiring approximately **33,264 cycles** at the same speed. This 7× increase in expected hit time is the central reason why bombing strategies must adapt for larger cores.

To cover a given fraction of the core: 50% coverage requires approximately **0.693 × C** bombs. 90% coverage requires approximately **2.303 × C** bombs. 99% coverage requires approximately **4.605 × C** bombs. For C = 55,440, 90% coverage demands roughly 127,679 bombs, which at 0.33c requires about 383,037 cycles — close to the 500,000-cycle limit. This demonstrates why **bombing alone is often insufficient at 55,440**: there simply aren't enough cycles to thoroughly cover the core.

### The factorization of 55,440 and its strategic consequences

**55,440 = 2⁴ × 3² × 5 × 7 × 11**

This factorization is remarkable. 55,440 is a **superior highly composite number** with exactly **120 divisors** — more than any smaller positive integer. Euler's totient gives the count of valid coprime step sizes:

**φ(55,440) = 55,440 × (1 − 1/2) × (1 − 1/3) × (1 − 1/5) × (1 − 1/7) × (1 − 1/11) = 11,520**

Only **20.8%** of possible step sizes are coprime to 55,440, compared to **40.0%** for CORESIZE 8,000 (= 2⁶ × 5³). This means that step size selection is **twice as constrained** at 55,440 — a randomly chosen step size has a nearly 4-in-5 chance of being suboptimal (sharing a factor with the core size and failing to achieve full coverage). Every step size for 55,440 must avoid divisibility by **2, 3, 5, 7, and 11** simultaneously. Candidates include primes like 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, and their products.

The 120 divisors also affect **imp spiral design**: the arm count of an imp ring must be coprime to CORESIZE. Many common arm counts (2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15...) share factors with 55,440 and are therefore invalid. Valid arm counts include 13, 17, 19, 23, 29, and 31. This creates a very different imp spiral landscape compared to CORESIZE 8,000, where 3-point and 7-point spirals are standard.

### The RPS triangle as a game-theoretic equilibrium

The bomber/scanner/replicator triangle follows the logic of a non-transitive dominance relationship:

- **Paper > Stone**: Replicators multiply faster than bombers destroy. Killing copies accelerates survivors. Mathematical advantage.
- **Stone > Scissors**: Bombers are tiny targets (3–5 instructions vs. 10–20+). Bombs create false positives for scanners. Speed advantage.
- **Scissors > Paper**: Scanners detect replicators' large footprint. SPL carpet bombing poisons the shared process queue. Systematic advantage.

In a pure RPS game with symmetric payoffs, the Nash equilibrium is to play each strategy with probability 1/3. Core War deviates from this in two key ways: first, the payoffs are **asymmetric** (stone may beat scissors more decisively than scissors beats paper), and second, **hybrid warriors and P-space adaptation** allow players to effectively play mixed or conditional strategies within a single warrior. P-space enables a form of "tit-for-tat": if my stone lost, I switch to paper next round. This transforms Core War from a one-shot game into a **repeated game with memory**, where adaptive strategies can outperform static mixed strategies.

The metagame self-regulates: if papers dominate a hill, scanners become profitable, attracting stones to counter the new scanners, which brings back papers. This cycling is visible in the historical age patterns of KOTH hills.

### Process queue dynamics: the math of parallelism

If a warrior starts with 1 process and repeatedly executes SPL 0:
- After cycle 1: 2 processes
- After cycle 2: 4 processes
- After cycle *t*: min(2^*t*, MAXPROCESSES)

Once the process queue is full at MAXPROCESSES (8,000 for standard, 10,000 for 55,440), each process executes once every MAXPROCESSES program-cycles. Total throughput remains fixed at **1 instruction per cycle per warrior** — process creation provides redundancy but not additional speed.

SPL bombs exploit this: hitting an enemy with a single SPL 0 bomb causes that location to generate processes exponentially. If the victim has *K* useful processes, the useful-to-useless process ratio decays as K / (K + 2^t) → 0, rendering the opponent effectively paralyzed within ~13 cycles (for MAXPROCESSES 8,000).

For replicators, process management is the central strategic calculation. A silk paper with *N* active copies, each consuming *p* processes, has each copy executing at speed 1/(N × p). The optimal replication rate balances coverage (more copies = harder to kill) against speed (fewer copies = faster individual operation). The process limit acts as a hard constraint — once MAXPROCESSES is reached, SPL becomes NOP, and no further copies can run additional processes.

### Why warrior length involves tradeoffs

A warrior of length L has a probability L/C of being hit by each random bomb. The expected survival time against a 0.33c bomber is approximately 3C/L cycles. A 4-instruction stone survives roughly 6,000 cycles on average in an 8,000-cell core; a 20-instruction scanner survives roughly 1,200 cycles. This 5× vulnerability difference is why scanners lose to bombers.

However, longer warriors can implement more sophisticated strategies. The optimal length depends on the metagame: in a bomber-heavy environment, shorter is better (harder to hit); in a replicator-heavy environment, warriors need enough length for effective scanning or replication. The most successful competitive warriors on the standard hill tend to be 5–30 instructions, with hybrids using boot sequences to separate active code from decoy.

---

## Part V — Core sizes and their strategic landscapes

### Nano (80 cells): direct combat in a telephone booth

The nano hill configuration — core size 80, max length 5, max processes 80, max cycles 800 — is the most constrained competitive environment. With only 5 instructions and 80 cells, warriors are practically neighbors (minimum distance of 5 cells), and direct combat happens almost immediately. Complex strategies (vampires, P-switchers, multi-phase warriors) are impossible to implement in 5 lines. Despite these constraints, a surprisingly diverse set of strategies is viable: papers/clears, scanners, oneshots, quickscanners, stones, and imp rings all appear in competitive nano play.

Nano is where **evolutionary algorithms** have achieved their greatest success. The search space is small enough for genetic algorithms to explore thoroughly, and evolved warriors from µGP, REBS, and YabEvolver regularly dominate the nano hill. The 2025 Nano Core War Challenge (27 entries, 14 authors) used Nash equilibrium scoring — entries were scored against the equilibrium of the existing population — making game-theoretic considerations directly measurable.

### Tiny and standard (800 and 8,000): the classic battleground

The classic 8,000-cell core was Dewdney's original choice — "there is nothing magical about this number; a smaller array would work quite well." It became the de facto standard because it was large enough for complex strategies but small enough for the computers of the 1980s and 1990s. The ICWS'86 standard used 8,192 (a power of 2), but the KOTH hills standardized on 8,000.

At 8,000 cells, the full paper-scissors-stone metagame is most developed. Silk papers, CMP scanners, optima-step stones, imp spirals, vampires, quickscanners, and P-switchers all compete. The 80,000-cycle limit is generous enough for bombers to cover significant fractions of the core and for scanners to locate and destroy replicators. The 100-instruction limit constrains but does not prevent sophisticated hybrid designs.

The tiny (800-cell) core occupies an intermediate position. With max length 20 and 8,000 cycles, warriors must be more compact than standard but less extreme than nano. Scanning becomes more feasible (less core to search) and bombing becomes very effective (a bomber at 0.33c covers the entire core in ~2,400 cycles).

### The big hill (55,440): why everything changes at scale

The 55,440-cell core was chosen for its extraordinary number-theoretic properties. As a superior highly composite number with 120 divisors, it provides maximum flexibility for read/write limits (which must be factors of CORESIZE in the ICWS'94 standard) and creates a rich mathematical landscape for step size optimization and imp spiral design.

The **94x hill** configuration is: CORESIZE 55,440 / MAXPROCESSES 10,000 / MAXCYCLES 500,000 / MAXLENGTH 200 / MINDISTANCE 200 / Rounds 250 / Hill size 20.

Compared to the standard 8,000-cell core, the 55,440 configuration changes the strategic landscape in several fundamental ways:

**Bombers are dramatically weaker.** Expected bombs to hit a 5-instruction opponent increase from 1,600 to 11,088. The cycle-to-coverage ratio worsens: 90% coverage at 55,440 requires ~383,000 cycles, nearly exhausting the 500,000-cycle budget. Pure bombing strategies that dominate at 8,000 become marginal at 55,440.

**Quickscanners become less effective.** A quickscan checks a fixed number of locations (typically 8–20 probes). At 8,000, each probe covers 1/800th to 1/400th of core — reasonable odds. At 55,440, each probe covers 1/5,544th to 1/2,772nd — the probability of detecting a small opponent with a quickscan drops by nearly 7×. The 200-instruction limit allows larger qscans, partially compensating, but the fundamental scaling disadvantage remains.

**Replicators need longer to achieve critical mass.** A silk paper spawning copies across 55,440 cells needs 7× more copies to achieve the same coverage density as at 8,000. This means more cycles are needed before the replicator "fills" the core, extending the vulnerable early game.

**Scanners face a larger search space** but have a proportionally larger cycle budget (500,000 vs. 80,000 — a 6.25× increase for a 6.93× larger core). Scanner effectiveness scales roughly linearly with cycles/coresize, so scanners maintain approximate parity — but must use longer scan loops and larger step sizes.

**Complex warriors become more viable.** The 200-instruction limit (vs. 100) and 500,000-cycle budget allow multi-phase strategies: quickscan → decoy maker → boot → main strategy → endgame clear. Sophisticated P-switchers with 3–4 distinct strategy components can fit within the instruction budget.

**Step size selection is more constrained and more consequential.** With only 20.8% of step sizes being coprime to 55,440 (vs. 40% for 8,000), careless step size selection is more likely to produce degenerate coverage. At the same time, the 120 divisors create opportunities for **mod-N bombing** — deliberately using step sizes that cover every Nth cell, targeting warriors of specific lengths.

### LP (Limited Process) cores: when every process is precious

The LP hill caps processes at **8** (vs. 8,000 for standard), fundamentally changing process economics. SPL bombs become instantly devastating — a single hit fills 12.5% of the victim's process capacity. Replicators cannot function (silk replication requires many processes). Vampires become extremely powerful (capturing even one process is a major gain). Simple, process-efficient strategies dominate.

### Multi-warrior dynamics

Multi-warrior hills (10–20 warriors in a single core) use scoring formula **(W²−1)/S** where W is total warriors and S is surviving warriors. Survival alone is immensely rewarding — a warrior that survives while all others die scores maximum points. This creates a strong incentive toward **passive survival** rather than aggressive offense. Papers and resilient strategies dominate because they survive while stones and scanners destroy each other.

---

## Part VI — Advanced techniques and theory

### Quickscanning: the opening arms race

Quickscanning is an **opening-game strategy** using an unrolled scanning loop to detect and attack the opponent in the very first cycles, before either warrior has completed its setup. The technique exploits the fact that warriors begin executing immediately at load time — if you can detect the opponent's code before they boot, you can launch a devastating preemptive strike.

A qscan uses **SNE/SEQ** (or CMP in '88) instruction pairs to compare pairs of memory locations at specific offsets. Since core initializes to `DAT 0, 0`, any location containing a non-zero value indicates enemy presence. The scan is unrolled (no loop — each comparison is a separate instruction) for maximum speed: **2c scanning** (one location checked every 2 cycles). Key innovations include the **Q^2 scanner** (Anders Ivner, 1996), the **Q^4 scan** (David Moore, 1999), and the **Q^4.5 scanner** (Jens Gutzeit, 2007).

The fundamental tradeoff: qscan code adds significant warrior length (each probe requires 2–3 instructions), but provides early detection that can win the game before it truly begins. At CORESIZE 55,440, quickscanners can be significantly larger (200-instruction limit), enabling more probes and better coverage — but the vastly larger core still means low per-probe hit probability. The strategic question is whether the 55,440 configuration justifies larger qscans or whether that instruction space is better used elsewhere.

**Decoys** defeat quickscanners by placing non-zero instructions that create false positives. If a qscan hits a decoy, it wastes its one-shot attack on dead code. **Decoy makers** are unrolled loops that rapidly build patterns of incremented/decremented locations at 3c speed, creating convincing false targets.

### Boot strategies: hiding through relocation

Booting — copying active code away from the initial load position before executing — is a fundamental defensive technique. The theory: when a warrior loads, its initial position may be detected by enemy quickscanners. Moving the active code to a new location (the boot distance away) leaves the original position as a decoy. The opponent attacks the decoy while the real warrior operates from its new position.

Optimal boot distance should be large enough to escape area-scan attacks, should not be a multiple of common scanning step sizes, and is typically in the range of 1,000–4,000 for CORESIZE 8,000 (proportionally larger for 55,440). **Boot-and-clear** goes further: after copying, the warrior erases the boot code itself, leaving no trace of the boot mechanism.

The sophisticated P-switcher **Combatra** (David Moore, 2000) represents the pinnacle of boot exploitation: its quickscan **calculates the opponent's boot distance**, stores it in P-space, and in subsequent rounds uses a targeted scanner to attack the location where the opponent booted to.

### Self-repair: the road less traveled

Self-repair — warriors that detect and recover from damage — was envisioned from Core War's inception. D.G. Jones wrote an early self-repairing program called **Scanner** that maintained two copies of itself, periodically compared them via CMP, and restored any damaged instructions from the backup. Jones was working on a three-copy version for greater resilience.

In practice, self-repair has never been competitively viable in modern play. The reasons are mathematical: repair code itself can be damaged; repair requires extra instructions (larger target); and each cycle spent on repair is a cycle not spent on offense. **Replication** effectively accomplishes "self-repair" at the population level — if one copy is damaged, others continue — and does so more efficiently than explicit repair mechanisms. This represents an open theoretical question: could a sufficiently clever self-repair mechanism achieve competitive viability, particularly at 55,440 where the larger cycle budget provides more time for maintenance?

### P-space: adaptive strategies across rounds

P-space enables **strategy switching based on previous outcomes**. The simplest P-switcher reads cell 0 (previous round result), selects a strategy, and stores the choice for future reference. More advanced designs track multiple rounds of history — **P² warriors** condition on the last 2 rounds (9 possible states), and **P³ warriors** on the last 3 rounds (27 states).

The strategic implications are profound. P-space breaks the simple RPS triangle by enabling **conditional strategies**: "if my stone lost, the opponent is probably paper, so I should play scissors next round." In the limit, a perfect P-switcher with sufficient strategies would converge to the optimal counter-strategy against any fixed opponent. The standard 250-round KOTH format provides ample rounds for P-space adaptation to converge.

**Handshaking** is a controversial P-space technique: warriors detect when they're fighting a copy of themselves (using P-space signals), and one copy suicides, giving the other 100% wins. This inflates hill scores but provides no advantage against non-self opponents.

### Evolved warriors: genetic algorithms meet Redcode

Genetic programming has been applied to Core War because Redcode has favorable properties for evolution: no invalid instruction combinations (every random sequence is executable), gradual fitness landscapes (small changes tend to produce small performance changes), and easily measured fitness (tournament scoring).

The most successful evolver historically is **µGP (MicroGP)** by Giovanni Squillero, F. Corno, and E. Sanchez at Politecnico di Torino. µGP created the first machine-written programs to become King of the Hill on **all four main international Tiny hills**, producing warriors like **Muddy Mouse** (survived 2,447 challenges on the SAL nano hill). Its success relied on incorporating human design knowledge through templates and hierarchical sub-goals.

**REBS** (Terry Newton, 2005) takes a simpler approach: select two warriors, battle them, copy the winner over the loser with random mutations. Despite its simplicity, REBS-evolved warriors are competitive at nano scale. **YabEvolver** (Terry Newton, 2023) is the most recently released evolver, using a 2-dimensional "soup" topology where warriors battle neighbors and losers are replaced by evolved copies of winners.

The most significant recent development is **Digital Red Queen (DRQ)** by Akarsh Kumar et al. from Sakana AI and MIT (arXiv:2601.03335, January 2026). DRQ uses **LLMs (GPT-4.1-mini) as a mutation operator** within a MAP-Elites quality-diversity algorithm: each round, a new warrior is evolved to defeat all previous champions. Key findings include **convergent evolution** (independent runs from different seeds converge toward similar behavioral strategies despite different code) and increasingly general warriors that perform well against unseen human-written opponents. DRQ warriors achieved Wilkies scores of ~34–85, competitive with but not yet exceeding the best evolved warriors from classical evolvers (~93 Wilkies from MEVO). The gap between AI-evolved and human-designed warriors remains significant at standard core size.

---

## Part VII — The current state of Core War (2025–2026)

### A small but remarkably persistent community

Core War's active community numbers perhaps **10–20 regular competitors** with a broader periphery of occasional participants. The hub is **corewar.co.uk**, maintained by John Metcalf, hosting tutorials, warrior archives, simulator downloads, tournament results, and hill data. A **"Core War & Programming Games" Discord server** (~58 members) has become a key communication channel, including a #pmars-dev channel for simulator development. The historic rec.games.corewar newsgroup remains active but requires Usenet access via Eternal September or Solani since Google Groups ended Usenet support.

Active KOTH servers include **KOTH.org** (Scott Ellentuch; multiple hills including 88, 94nop, 94x), **KOTH@SAL** (Barkley Vowk; nine hills including nano, tiny, LP, fortress), **Koenigstuhl** (Christoph Birk; infinite archive hills and Battle Royale), and the **corewar.co.uk infinite nano and tiny hills**.

### Tournaments and dominant strategies in 2024–2025

Regular tournaments include the **Core War Tournament Weekend** at the Cambridge Retro Computer Festival (November 2024: 88 tournament won by inversed with "Take the X Train"; 94nop won by Christian Schmidt with "kudzu"; November 2025: 88 and 94 both dominated by inversed) and the **Nano Core War Challenge** (June 2025: 27 entries, 14 authors, won by inversed with "Reptiloid Supremacy"). The **CoreWarUCM Tournament** at Universidad Complutense Madrid runs annually (7th edition, March 2024, won by Guillermo Calvo Arenaza).

**inversed** is the dominant competitive player of 2024–2025, winning or placing in virtually every tournament. Other active competitors include Dave Hillis, Christian Schmidt, Roy van Rijn, John Metcalf, Simon Wainwright, and Terry Newton.

The metagame remains **stable but incrementally evolving**. **Stone/imp hybrids** and **paper/stone combinations** dominate, with nearly every competitive warrior including a quickscan opening. Azathoth (Metcalf) — pairing a Sunset-style paper with a self-bombing stone — is the current Koenigstuhl 94nop king. True strategic innovations are rare; recent advances come through refined optimization of existing archetypes rather than fundamentally new approaches.

### The intersection of AI agents and Core War

The **Digital Red Queen** paper (January 2026) represents the most significant intersection of AI and Core War to date. The paper demonstrated that LLM-driven evolution can produce increasingly general warriors through adversarial self-play, with convergent evolution toward similar phenotypes from different starting points. This attracted significant attention (126 points on Hacker News) and represents a proof of concept that AI agents can meaningfully engage with Core War strategy.

The community response has been measured: benchmarking showed DRQ warriors are "decent but not elite," with classical evolvers and human designers still producing stronger warriors at standard core size. However, the approach shows promise for larger cores where the search space exceeds what traditional genetic algorithms can efficiently explore.

---

## Part VIII — Open problems and opportunities for innovation

### Strategic niches that remain unfilled

**Within-round adaptation.** While P-switchers adapt between rounds, no warrior has achieved genuinely adaptive behavior *within* a single round — detecting the opponent's strategy type mid-game and switching tactics. The information is theoretically available (presence of bombs indicates a bomber; distributed non-zero cells indicate a replicator; large non-zero blocks indicate a scanner), but implementing real-time classification in Redcode is a formidable challenge. At 55,440 with 500,000 cycles, there is enough time for a multi-phase warrior that scans → classifies → selects counter-strategy → executes.

**Bomb-dodging.** The strategy of scanning for enemy bombs and copying one's code to a recently bombed location (on the theory that the bomber won't bomb the same spot twice) has been proposed but never successfully implemented as a primary competitive strategy. At 55,440, the large core and long game duration might make this viable.

**True parasitism.** Beyond vampires' simple process capture, a parasite could redirect captured enemy processes to perform *useful work* — bombing on the parasite's behalf, scanning for other enemies, or replicating parasite code. This has been theorized but never implemented effectively.

**Cooperative multi-warrior teams.** Despite P-space PIN sharing enabling communication between allied warriors, effective team strategies remain virtually unexplored. A pair of warriors that coordinate attacks, share territorial intelligence, or specialize in complementary roles (one offensive, one defensive) could be powerful on multi-warrior hills.

**Territory control.** Rather than seeking to kill the opponent, a warrior could establish and defend a zone of the core, particularly in large cores where controlling even a portion has value. This defensive paradigm has no successful implementation.

### The untapped potential of 55,440's mathematical properties

The 120 divisors of 55,440 create opportunities that have not been fully explored:

**Multi-rate bombing.** Using different step sizes for different bomb types (DAT bombs at one step, SPL bombs at another, anti-imp bombs at a third) could create overlapping coverage patterns that are more effective than single-step-size bombing. The mathematical optimization of multi-rate bombing for 55,440's specific factorization is an unsolved problem.

**Adaptive step sizes.** A warrior that changes its bombing step size during execution — perhaps starting with a large step for rapid initial coverage, then switching to a fine step for gap-filling — could achieve better coverage than any fixed step size. This has minimal precedent in existing warrior design.

**Divisor-aware imp spirals.** Since valid arm counts for imp spirals in 55,440 must avoid the factors 2, 3, 5, 7, and 11, there may be particularly effective spiral configurations using prime arm counts (13, 17, 19, 23) that haven't been explored. A 13-point imp spiral at spacing 55,440/13 ≈ 4,265 would have unusual properties worth investigating.

**Phase-based strategies.** The 500,000-cycle budget allows distinct early/mid/late game phases. A warrior could quickscan (cycles 0–200) → boot and create decoys (200–500) → bomb (500–100,000) → switch to paper replication (100,000–400,000) → launch imp spirals (400,000+), with each phase optimized for different game stages. The large cycle budget makes this kind of temporal complexity viable for the first time.

### What would a truly novel warrior look like?

The metagame has been optimizing within established archetypes for decades. A genuinely novel warrior might:

- **Exploit unused instruction combinations.** The ICWS'94 standard permits 16 opcodes × 7 modifiers × 8 addressing modes — thousands of valid instruction combinations. Many are rarely or never used in competitive play. MUL, DIV, and MOD enable computation that no current warriors exploit. Novel uses of unusual modifier/opcode combinations could create unexpected behaviors that opponents are unprepared for.

- **Use self-modifying code dynamically.** Beyond basic bombing loops that self-mutate into core clears, a warrior could modify its own scanning pattern, change step sizes based on what it finds, or alter its attack strategy mid-game by rewriting its own instructions. The DRQ paper found that "chaotic self-modifying code dynamics" were an emergent behavior in evolved warriors.

- **Implement delayed-action corruption.** Instead of immediately lethal DAT bombs, using ADD or SUB bombs that gradually shift pointers in enemy code, causing warriors to bomb themselves or jump to wrong locations. This is harder to detect and defend against than direct killing.

- **Employ information-theoretic attacks.** Reading bomb patterns to deduce opponent location (each bomb reveals the bomber's step size and approximate position), following vampire fangs back to traps, or analyzing scan patterns to detect scanners — all without direct detection.

- **Distribute functionality across the core.** Rather than a monolithic code block that dies when bombed, a warrior with small functional modules spread across the core (connected via JMP chains) would be extremely hard to kill. This "distributed architecture" has minimal precedent but becomes more feasible at 55,440 where modules can be widely separated.

### How AI agents might change the metagame

AI agents bring capabilities that human Core War programmers lack:

**Exhaustive optimization.** AI agents can evaluate thousands of step size, boot distance, and attack parameter combinations to find optima that human intuition misses — particularly important for the mathematically rich 55,440 core size.

**Strategy synthesis.** LLMs can reason about why strategies work at an abstract level and propose novel combinations that human designers might not consider, potentially discovering new hybrid archetypes.

**Rapid iteration.** AI agents can generate, test, and refine warriors orders of magnitude faster than human programmers, enabling exploration of the design space that has remained terra incognita.

**Counter-strategy generation.** Given a specific opponent, an AI agent can rapidly generate a tailored counter-warrior — a capability that, if fast enough, could transform tournament play.

The risk is that AI agents will converge on known archetypes (the DRQ paper showed convergent evolution toward familiar strategies). The opportunity lies in applying AI capabilities to the aspects of Core War that humans have never fully explored: large cores, multi-warrior dynamics, adaptive within-round behavior, and mathematically optimized bombing patterns.

---

## Part IX — Key references and resources

### Essential theoretical works

**"Core War Guidelines"** by D.G. Jones and A.K. Dewdney (March 1984) — the founding document. **"In the game called Core War hostile programs engage in a battle of bits"** — Dewdney's Scientific American column (May 1984) — the public introduction. **ICWS'94 Draft Standard** (base draft by Mark Durham, annotated by Stefan Strack, v3.3) — the de facto universal standard, available at corewar.co.uk/standards/icws94.txt. **"The Beginners' Guide to Redcode"** by Ilmari Karonen (v1.23) — the most complete Redcode tutorial, hosted at vyznev.net/corewar/guide.html. **"My First Corewar Book"** by Steven Morrell — warrior analysis with code examples, covering imp rings and stones.

### Key academic papers

**"An Evolutionary Approach Generates Human Competitive Corewar Programs"** by Barkley Vowk, Alexander Wait, and Christian Schmidt (ALife IX, 2004). **"Evolving Warriors for the Nano Core"** by Ernesto Sanchez, Massimiliano Schillaci, and Giovanni Squillero (IEEE CIG, 2006). **"Evolving Assembly Programs: How Games Help Microprocessor Validation"** by F. Corno, E. Sanchez, and G. Squillero (IEEE Transactions on Evolutionary Computation, 2005). **"Digital Red Queen"** by Akarsh Kumar et al. (Sakana AI / MIT, arXiv:2601.03335, January 2026).

### Warriors to study and why

**Imp** (Dewdney, 1984) — the simplest warrior, foundation of imp theory. **Dwarf** (Dewdney, 1984) — the first bomber, foundation of bombing theory. **Mice** (Chip Wendell, 1986) — the first tournament-winning replicator. **Silk Warrior** (Juha Pohjalainen, 1994) — revolutionized replication with silk technique. **Armadillo** (Stefan Strack) — first SPL bomber with core-clear. **Winter Werewolf** (Mintardjo Wangsaw) — first stone to effectively compete against papers using two-pass clear. **Agony** (Stefan Strack) — the classic CMP scanner. **Cannonade** (Paul Kline, 1993 ICWS winner) — sophisticated stone with DJN-stream and imp gates. **Combatra** (David Moore, 2000) — most sophisticated P-switcher, calculates opponent boot distance. **myVamp5.4** (Magnus Paulsson) — exemplary vampire design. **Sphinx v2.8** (Mintardjo Wangsaw) — first warrior to pass age 2,000. **Monster_Human_Grunt** — stone/imp surviving 2,289 challenges. **Azathoth** (John Metcalf, 2023) — current 94nop Koenigstuhl king, paper/stone hybrid. **Tolypeutes** (Roy van Rijn) — Armadillo-style stone with Impfinity-launch and qscanner. **nPaper II** (Metcalf/Khuong) — survived 1,000+ challenges, silk paper with anti-imp bombs.

### Community resources

**corewar.co.uk** — the definitive archive maintained by John Metcalf: warriors, tutorials, history, simulators, tournament results, hill data. **KOTH.org** — active KOTH server and FAQ. **Koenigstuhl** (asdflkj.net/COREWAR/) — infinite hills and warrior archive. **KOTH@SAL** (sal.discontinuity.info) — nine active hills. **Core War & Programming Games Discord** — active community communication. **pMARS** — the reference simulator (v0.9.5, January 2026), available via corewar.co.uk. **Core Warrior newsletter** (issues 1–92, 1995–2007) — archived at corewar.co.uk. **@xcorewar** on Twitter/X, Bluesky, and Mastodon — community social media.

---

## Conclusion: where the frontier lies

Core War has been played for over 40 years, and the metagame at standard core sizes has been extensively optimized. Stone/imp hybrids, silk papers, CMP scanners, and P-switchers represent well-understood archetypes with decades of refinement. But the **55,440-cell big hill** — with its 120-divisor factorization, 200-instruction limit, 500,000-cycle budget, and constrained step-size landscape — remains less thoroughly explored than the standard 8,000-cell core.

The most promising avenues for innovation are: **within-round adaptive strategies** that classify the opponent and switch tactics mid-game; **multi-rate and adaptive bombing patterns** that exploit 55,440's rich number-theoretic structure; **distributed architectures** that spread functional modules across the core to resist destruction; **self-modifying warriors** that dynamically alter their own behavior; and **computationally intensive strategies** (using MUL/DIV/MOD for runtime optimization) that become practical given the generous 500,000-cycle budget.

The historical pattern of Core War innovation is clear: each major advance came from someone asking "why does this constraint exist?" and then finding a way to exploit it. The SPL instruction created multi-process warriors. Silk replication exploited postincrement addressing. P-space enabled adaptive strategies. The next breakthrough will come from deeply understanding the mathematical and computational properties of the 55,440-cell arena and finding strategic niches that **40 years of human play have never explored**. For an AI agent, the key advantage is not copying known strategies — it is using theoretical understanding to reason about the design space and discover what the community has missed.