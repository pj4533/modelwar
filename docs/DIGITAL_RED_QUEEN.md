# Digital Red Queen: Adversarial Program Evolution in Core War with LLMs

> Summary of the full paper (11-page PDF from arXiv), not just the blog post.

**Paper:** [Digital Red Queen](https://sakana.ai/drq/) | [arXiv](https://arxiv.org/abs/2601.03335) | [GitHub](https://github.com/SakanaAI/drq)
**Authors:** Akarsh Kumar, Ryan Bahlous-Boldi, Prafull Sharma, Phillip Isola, Sebastian Risi, Yujin Tang, David Ha
**Institution:** Sakana AI (1: MIT, 2: Sakana AI)
**Published:** January 6, 2026 (submitted to arXiv), 11 pages + appendices, 13 figures
**Funding:** NSF GRFP Fellowship (A.K.), Packard Fellowship (P.I.), ONR MURI grant N00014-22-1-2740

---

## Abstract (from paper)

> "Large language models (LLMs) are increasingly being used to evolve solutions to problems in many domains, in a process inspired by biological evolution. However, unlike biological evolution, most LLM-evolution frameworks are formulated as static optimization problems, overlooking the open-ended adversarial dynamics that characterize real-world evolutionary processes. Here, we study Digital Red Queen (DRQ), a simple self-play algorithm that embraces these so-called 'Red Queen' dynamics via continual adaptation to a changing objective."

The system evolves assembly-like programs (warriors) that compete in Core War, a Turing-complete environment. Over many rounds, warriors become increasingly general against held-out human warriors, while simultaneously exhibiting reduced behavioral diversity across independent runs -- indicating convergent evolution pressure toward a general-purpose behavioral strategy.

---

## Overview

This paper investigates how LLMs can drive an adversarial evolutionary arms race within Core War. Rather than optimizing toward fixed goals, the approach embraces "Red Queen" dynamics -- named after the evolutionary hypothesis that organisms must continuously adapt just to maintain fitness against co-evolving competitors. As the Red Queen tells Alice: *"it takes all the running you can do, to keep in the same place."*

The key motivation: "As more LLM systems are deployed into the real world and interact with each other, it is likely that they too will begin to exhibit similar evolutionary Red Queen dynamics." Core War provides a safe sandbox to study these dynamics because it is "entirely self-contained: its programs run on an artificial machine with an artificial language, making it impossible for any generated code to execute outside the sandbox."

---

## The DRQ Algorithm

The Digital Red Queen (DRQ) algorithm is described as a "minimal instantiation" of existing multi-agent and self-play approaches. It operates as a 3-step loop:

1. **Initialization:** Start with a base warrior w_0 (human-designed or LLM-generated)
2. **Adversarial Optimization:** Each round t evolves warrior w_t to maximize fitness against all previous warriors {w_0 ... w_{t-1}}
3. **Iteration:** Repeat for T rounds, generating a lineage {w_0 ... w_T}

Key design choice: "we do not update older warriors in the lineage, as prior work has shown that historical self-play promotes stability and mitigates cyclic dynamics."

Because the number of warriors increases each round, "the marginal influence of any newly introduced warrior on the environment decreases over time, implying that the induced fitness function changes less and less as T -> infinity."

### Relationship to Prior Work

DRQ is closely related to **Fictitious Self-Play (FSP)** and **Policy Space Response Oracles (PSRO)**, which provide game-theoretic frameworks for multi-agent learning. Key difference: "DRQ does not construct explicit meta-strategies or solve a meta-game; instead, we directly optimize the current agent within a multi-agent environment containing all previous agents." Also related to **Foundation Model Self-Play (FMSP)** by Dharna et al., but DRQ differs in that each new agent is optimized in an environment containing ALL previous agents (not just one).

### Intra-Round Optimization with MAP-Elites

Within each round, DRQ uses **MAP-Elites**, a quality-diversity algorithm. The paper emphasizes why: "program synthesis presents a highly deceptive search landscape, most greedy algorithms can get stuck in local minima."

MAP-Elites works by:
- Discretizing a behavioral descriptor space into cells, each storing at most one elite solution
- "By restricting competition to solutions that fall within the same cell, MAP-Elites imposes localized selection pressure while preserving global diversity"
- "Partitioning with respect to behavior allows the archive to maintain a broad set of stepping stones, many of which may be individually poor but crucial for discovering strong strategies"
- **Behavioral descriptor:** Discretized tuple of (total spawned threads via SPL, total memory coverage), grid discretized in log space
- The MAP-Elites archive in round t is optionally initialized with all prior champions {w_0 ... w_{t-1}} to bootstrap optimization

### LLM Integration

- **Model:** GPT-4.1 mini (gpt-4.1-mini-2025-04-14)
- **System prompt:** Core War environment description + concise Redcode manual (opcodes, addressing modes, example warrior) + several canonical programs as examples + strict constraints on program structure (required ORG/END directives, label usage rules, relative addressing)
- **Generation:** LLM given a user prompt to produce a novel Redcode program
- **Mutation:** LLM provided with original program and instructed to modify it to improve performance
- The authors "intentionally chose this simplistic use of LLMs to keep the focus of the study on Core War and the analysis of evolution, rather than on LLM-specific techniques"
- Other approaches noted as possible: LLM could output diffs, or be conditioned on simulation results (Reflexion-style)

**On model scaling:** "Preliminary experiments did not show significant performance increase with larger models."

**On running without LLMs:** "It is possible to run DRQ without LLMs by relying solely on random generation and random mutation over the space of opcodes, addressing modes, and numeric parameters. However, in extremely sparse search spaces, where most points and mutations produce invalid or non-functional programs, some prior over the search space is crucial for practical search efficiency."

---

## Core War Environment

### Game Mechanics

Core War was "originally made as a competitive programming game in 1984" by A. K. Dewdney and "continues to fascinate researchers and hobbyists as a microcosm of digital evolution and adversarial computation."

- Assembly-like programs ("warriors") compete for control of a virtual machine
- Turing-complete environment -- "rich enough to run any computation and, in principle, support an open-ended arms race"
- "The Core does not distinguish between code and data, every instruction can be read, written, or executed"
- Self-modifying code is commonplace, creating "a highly volatile environment"
- Warriors loaded at random locations in a circular fixed-size Core
- Each warrior granted one process at initialization (a program counter)
- Round-robin execution: one instruction per warrior per simulation step

### Simulation Parameters (from Appendix A.2)

- **Core size:** 8,000 addresses
- **Max timesteps:** 80,000 per battle
- **Max threads per warrior:** 8,000 concurrent
- **Max warrior length:** 100 instructions in source code
- **Minimum separation:** 100 instructions between warrior starting positions
- **Evaluation:** Results averaged over 20 independent simulations with randomized placements
- **Simulator:** Python Core War implementation by Rodrigo Setti (github.com/rodrigosetti/corewar), wrapped to handle edge cases like "exponential growth producing astronomically large integers"

### Full Redcode Instruction Set (from Appendix A.1)

**Process Control:**
- **DAT:** Terminates current process (the "weapon" -- inject in front of opponent's process)
- **SPL:** Spawns a new process at a target address
- **NOP:** No operation
- **ORG:** Specifies program entry point
- **END:** Marks end of program

**Data Movement & Arithmetic:**
- **MOV:** Copies data or instructions
- **ADD, SUB, MUL, DIV, MOD:** Arithmetic on instruction fields (division/modulo kills process on zero divisor)

**Control Flow:**
- **JMP:** Unconditional jump
- **JMZ, JMN:** Conditional jump (zero/nonzero)
- **DJN:** Decrement and conditional jump

**Comparison & Branching:**
- **SEQ/CMP:** Skip next instruction if operands equal
- **SNE:** Skip if not equal
- **SLT:** Skip if less than

**Assembly Directives:**
- **EQU:** Defines symbolic constants

**Instruction Modifiers:** .A, .B, .AB, .BA, .F, .X, .I (determine which fields are read/written)

**Addressing Modes:**
- `#` Immediate (literal data)
- `$` Direct (offset from PC)
- `*` A-number indirect
- `@` B-number indirect
- `{` A-number predecrement indirect
- `<` B-number predecrement indirect
- `}` A-number postincrement indirect
- `>` B-number postincrement indirect

### Fitness Function

In a battle with N warriors and T simulation timesteps, N units of fitness are distributed evenly over time:

```
Fitness(w_i) = Sum_tau=1..T [ (N/T) * A_i_tau / Sum_j(A_j_tau) ]
```

Where A_i_tau is an indicator for whether warrior i is alive at timestep tau. "This design incentivizes warriors to survive as long as possible while also eliminating others to increase their share of the reward." A warrior defeats another if it achieves higher fitness in a 1-on-1 battle.

---

## Key Results

### Static Optimization Baseline (Single Round)

Against 294 human-designed warriors (1,000-iteration runs):

| Approach | Win Rate |
|---|---|
| LLM zero-shot | 1.7% |
| Best-of-N (N=8) | 22.1% (collective) |
| Evolved specialists | 96.3% defeat/match (collective) |
| Individual evolved warrior | 27.9% (brittle, overfit) |

Single-round optimization produces specialists that collectively cover most human warriors but individually are brittle and overfit to their training opponent.

### Multi-Round DRQ (96 independent runs, 96-warrior dataset)

Due to computational cost, multi-round experiments used a smaller dataset of 96 diverse human warriors. History length K was ablated (K=1, 3, 5, 10/20).

**Definitions used in analysis:**
- **Generality:** Fraction of 317 unseen human warriors defeated or tied (zero-shot robustness measure)
- **Phenotype:** Vector of fitness values against each unseen human opponent (black-box performance profile)
- **Genotype:** Text embedding of source code (OpenAI text-embedding-3-small)

**Increasing Robustness (Figure 3, Left):**
- Average generality increases over rounds across all history lengths K
- Statistically significant with high R² values (e.g., R² = 0.927 for K=1, R² = 0.898 for K=3, R² = 0.905 for K=20)
- p-values extremely low (e.g., p = 1.13 x 10^-11 for K=1)
- "optimizing against a small but changing set of adversaries can induce a pressure towards generality"

**Phenotype (Behavioral) Convergence (Figure 3, Center):**
- Variance of phenotype across independent runs **decreases** over rounds
- Rate of phenotype change also decreases within each run
- "convergence across different independent runs is largely unexpected and suggests a universal attractor in phenotype space"
- Under log model, full convergence would require exponential number of rounds
- Convergence is "weak and only detectable statistically when aggregating many runs"

**Genotype (Code) Non-Convergence (Figure 3, Right):**
- Source code embedding variance remains approximately constant over rounds
- "DRQ does not collapse onto a single canonical implementation"
- "This dissociation between phenotypic and genotypic convergence" mirrors convergent evolution in biology
- "different species have evolved similar traits (like eyes or wings) independently, but through distinct genetic mechanisms"

### Cyclic Behavior Reduction (Section 4.3)

"Cyclic dynamics are a well-known phenomenon in self-play and coevolutionary systems, where agents rotate among strategies that dominate one another, analogous to rock-paper-scissors."

A cycle is defined as a triplet (a,b,c) where a defeats b, b defeats c, c defeats a:
- K=1 history: many intransitive cycles present
- K=10 (full DRQ): **77% reduction** in total cycles across all runs
- "consistent with prior work showing that incorporating historical opponents into self-play reduces cyclic behavior"

### Battle Outcome Prediction (Section 4.6)

"Can we statistically predict a warrior's final generality score more cheaply using only its source code?"

Linear probes trained on embedded Redcode source code:
- text-embedding-3-small: R² = 0.442
- text-embedding-3-large: R² = 0.461

"This is notable given the complexity of the underlying mapping: generality is determined by 317 separate 80,000-timestep simulations, each involving chaotic interactions with opponents and extreme sensitivity to small code changes."

Potential applications: surrogate models to bypass full simulation during search, or mechanistic interpretability tools for understanding what makes source code effective.

---

## Discovered Warrior Strategies

The system autonomously discovered approaches historically invented by human Core War developers:

- **Bombing:** "placing DATs throughout the Core" to kill enemy processes
- **Replication:** "copying the warrior's own code into multiple memory locations" for resilience
- **Scanning:** "probing the Core to locate enemies before striking"
- **Massive Multithreading:** Spawning many threads via SPL -- "eliminating such a warrior requires halting all of its threads, and having more threads makes this increasingly difficult"
- **Hybrid strategies:** Fusion of multiple approaches in a single warrior

### Notable Warriors (with actual source code from paper)

**"Ring Warrior Enhanced v9"** -- Fuses replication and bomber strategies:

```redcode
;name Ring Warrior Enhanced v9
;author ChatGPT
;strategy Improved ring replicator with increased copy size and adjusted bombing
ORG start
start   SPL  copy          ; Fork copy process
        SPL  bomb          ; Fork bomb process
        JMP  start         ; Main loop
copy    MOV.I 0, }copy_ptr ; Post-increment indirect self-copy
        ADD  #5, copy_ptr  ; Advance copy pointer by 5
        DJN  copy, #30     ; Copy 30 times per fork
        JMP  start
bomb    JMZ  bomb_wait, #0
        MOV.I #0, }bomb_ptr ; Bomb enemy memory
        ADD  #7, bomb_ptr   ; Advance bomb pointer by 7
        DJN  bomb, #30      ; Bomb 30 times per fork
        JMP  start
bomb_wait SEQ bomb_ptr, copy_ptr ; Check if bomb pointer equals copy pointer
        JMP  start          ; If equal, skip bombing to avoid self-hit
        JMP  bomb           ; Otherwise, proceed bombing
copy_ptr DAT  #5, 0         ; Copy pointer starts 5 ahead
bomb_ptr DAT  #17, 0        ; Bomb pointer starts 17 ahead
END
```

**"Spiral Bomber Optimized v22"** -- Defeats 80.13% of human warriors (84.54% including ties):

```redcode
;name Spiral Bomber Optimized v22
;author ChatGPT
;strategy Continuously bomb memory in an expanding spiral with maximal process proliferation
ORG start
step    EQU  4              ; step size for pointer increment
ptr     DAT.I 0, 0          ; bombing pointer initialized to zero
start   SPL.F bomb          ; first bomber
        SPL.F bomb          ; second bomber
        SPL.F bomb          ; third bomber for more parallelism
bomb    SPL.F bomb          ; spawn new bomber before bombing (exponential growth)
        MOV.I ptr, <ptr     ; bomb target location with DAT 0,0
        DJN.I #step, {ptr   ; decrement pointer by step and loop
END
```

Note: "Comments are generated by the LLM and may not be factual."

### MAP-Elites Grid Analysis (Section 4.4)

Fitness values within each bin averaged across 1,920 MAP-Elites grids from full DRQ runs:
- "Warriors that fork many threads tend to perform best"
- "Among programs that create fewer threads, a different strategy emerges: maximizing memory coverage, suggesting that spatial spread is robust primarily when parallelism is limited"

---

## Ablation Studies

1. **MAP-Elites necessity (Section 4.5):** "Replacing MAP-Elites with a single-cell variant that maps all candidate warriors to the same cell, thereby removing the critical diversity-preserving mechanism" significantly reduces optimization performance, especially in later rounds. "These results highlight the importance of preserving diversity during search for Core War program synthesis."
2. **History length (K):** K=1, 3, 5, 10/20 tested; higher K shows best cycle reduction (77% at K=10) and strongest generality trends
3. **LLM model scaling:** "Preliminary experiments did not show significant performance increase with larger models"
4. **Archive initialization:** Each round optionally bootstrapped with all prior champions

---

## Limitations

- **Weak convergence pressure:** "Under the logarithmic fits, full phenotypic convergence would require an exponential number of rounds"
- **Single lineage:** "DRQ is a simple loop: each new agent is optimized to defeat a fixed set of past agents, creating a linear lineage with no updating of earlier strategies"
- **Simplistic LLM integration:** Could use diffs, simulation-conditioned feedback (Reflexion-style), or richer prompting

---

## Conclusion & Future Work

**On cybersecurity relevance:** "Recently, malicious hackers have started leveraging LLMs to their advantage, and the cybersecurity arms race between offense and defense is well underway. Studying these adversarial dynamics in an artificial testbed like Core War offers critical insights into how such races might unfold and the kinds of strategies that may emerge."

**On Core War as sandbox:** "Because Core War is Turing-complete, it can simulate arbitrary algorithms, providing a rich environment for exploring behaviors relevant to real-world systems. At the same time, Core War is entirely self-contained."

**Future directions:**
- "Richer settings where many agents simultaneously co-evolve within a shared ecosystem" -- closer to "microbial communities" or "the modern cybersecurity landscape, where large populations adapt in parallel rather than along a single line of descent"
- Application to: "artificial life simulations, biological modeling for drug design, real-world cybersecurity, and even competitive market ecosystems"
- Surrogate models to bypass expensive simulation
- Mechanistic interpretability of embedding predictions

**Key claim:** "Despite its simplicity, vanilla DRQ performs remarkably well in a rich testbed like Core War, suggesting that this minimal self-play algorithm is worth studying in greater depth."

---

## Relevance to ModelWar

This paper is directly relevant to the ModelWar project. Key takeaways:

- **DRQ validates the concept:** LLM-driven Core War evolution produces genuinely competitive warriors that can defeat the majority of human-designed programs
- **MAP-Elites matters:** Quality-diversity search significantly outperforms single-solution optimization, especially over multiple rounds
- **History length matters:** Evaluating against more predecessors (K=10 vs K=1) produces more robust warriors with fewer intransitive cycles
- **Convergent evolution is real:** Independent evolutionary runs converge on similar behavioral strategies even with completely different source code
- **GPT-4.1 mini suffices:** Larger models didn't significantly help, suggesting the bottleneck is evolutionary pressure, not code generation quality
- **Fitness function design:** Their timestep-distributed fitness function incentivizes both survival and opponent elimination, worth considering for arena scoring

---

## Related Work Context (from paper Section 2)

The paper situates DRQ within several threads:

- **ALife precursors:** Tierra (self-replicating machine code competing for CPU cycles, leading to parasitism), Avida (2D lattice with computational rewards evolving complex logic), and recent work on spontaneous self-replication with minimal languages
- **Core War evolution:** Many prior works used genetic programming to evolve warriors (Corno et al.'s muGP produced top "nano" warriors), but "most of these approaches were only effective on small Core sizes and did not scale well to the full Core War environment. None leverage LLMs."
- **Self-play in RL:** From checkers (Samuel 1959) and backgammon (Tesauro) through AlphaGo, AlphaZero, StarCraft II, Dota 2, and recently robust self-driving car policies
- **LLM-guided evolution:** Lehman et al. first showed LLM-driven mutations create OOD solutions; AlphaEvolve scaled this to matrix multiplication and chip design breakthroughs

---

## Infrastructure

- **Open source:** [github.com/SakanaAI/drq](https://github.com/SakanaAI/drq)
- **Simulator:** Python Core War implementation by Rodrigo Setti (github.com/rodrigosetti/corewar), modified to handle LLM edge cases
- **Human warrior datasets:**
  - 294 warriors for static optimization experiments
  - 317 warriors for held-out generality evaluation
  - Sourced from: github.com/rodrigosetti/corewar and github.com/n1LS/redcode-warriors
- **Computational cost:** Significant; multi-round analysis limited to 96-warrior subset across 96 independent runs
