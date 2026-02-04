---
title: Choosing Matters
date: 2026-02-05
description: Text generation isn't prediction—it's choosing what to say next, and how you choose changes what you can say
tags: [nlm-transformers, text-generation, decoding, engineering]
---

Text generation looks like prediction, but it's not. It's a series of choices.

Every token you generate requires deciding which token to pick from the probability distribution your model outputs. Make that choice tens or hundreds of times in sequence, and those choices compound. Pick greedily? You get repetition. Sample randomly? You get nonsense. The method you use to make those choices determines whether you get coherent text or garbage.

## The Problem Is Iteration

Classification tasks are straightforward. One forward pass through the model, take the argmax of the logits, done. Text generation can't do that. You generate one token at a time, append it to the input, and run the model again. Repeat until you hit max length or an end token.

This makes two things true:

1. **Text generation is expensive.** Each token requires a forward pass. Generate 128 tokens? That's 128 forward passes. Beam search with 5 beams? 640 forward passes. The compute scales with sequence length.

2. **Every choice affects future choices.** Pick a low-probability token early? The model now has to continue from that context. The probability distribution for the next token depends on all previous tokens. Errors compound.

The decoding strategy—how you turn probabilities into tokens—is not a detail. It's the difference between working and broken.

## Greedy Search: Fast and Repetitive

Greedy search picks the most probable token at every step. Simple. Deterministic. Fast.

Also repetitive. GPT-2 with greedy search on the "unicorn discovery" prompt produced:

> "The researchers were surprised to find that the unicorns were able to communicate with each other, and even with humans. The researchers were surprised to find that the unicorns were able to..."

See the pattern? Greedy search gets stuck in loops because it never explores alternatives. The most probable next token given the current context might lead to a local maximum—good continuation in the short term, bad overall sequence in the long term.

Greedy search has its place: arithmetic, precise answers, deterministic tasks where repetition isn't penalized. But for open-ended generation? No.

## Beam Search: Better Overall, Still Repetitive

Beam search keeps track of the top *b* most probable sequences (beams) at each step. Instead of committing to one token, it explores multiple paths in parallel and picks the sequence with the highest overall probability.

The key insight: use **log probabilities**, not raw probabilities. Why?

Probability of a 1024-token sequence where each token has p=0.5:

```
0.5^1024 = 5.56e-309  # underflow
```

Log probability of the same sequence:

```
sum(log(0.5) for _ in range(1024)) = -709.78  # stable
```

Multiplying many small probabilities → numerical instability. Summing log probabilities → stable computation. Beam search relies on this to compare sequences without losing precision.

Beam search improved the log probability from -87.43 (greedy) to -55.23 (beam search, 5 beams) on the unicorn prompt. But it still repeated: "...discovered a herd of unicorns living in a remote, previously unexplored valley, in the Andes Mountains. Even more surprising to the researchers was the fact that the unicorns spoke perfect English..."

Solution: **n-gram penalty**. Track which n-grams have appeared and set the probability of tokens that would create a repeated n-gram to zero. This trades off likelihood (lower log probability: -93.12) for diversity (no more repetitions).

Beam search + n-gram penalty is the standard for tasks where **factual correctness matters**: summarization, translation. You want high-probability outputs, but you don't want the model repeating itself.

## Sampling: Diversity Through Randomness

Instead of picking the most probable token, sample from the probability distribution. This introduces randomness, which increases diversity.

But raw sampling is too random. The model assigns nonzero probability to thousands of tokens, including very unlikely ones. Sample from the full distribution and you'll eventually pick a rare token that derails the generation.

**Temperature** controls how peaked or flat the distribution is:

- **T << 1** (low temperature): Distribution peaks around high-probability tokens. More deterministic, less diverse.
- **T >> 1** (high temperature): Distribution flattens. All tokens become more equally likely. More diverse, less coherent.

At T=2.0:

> "While the station aren protagonist receive Pengala nostalgiates tidbitRegarding Jenny loclonju AgreementCON irrational..."

Gibberish. Too much diversity.

At T=0.5:

> "The scientists were searching for the source of the mysterious sound, which was making the animals laugh and cry."

Coherent. Temperature lets you tune the coherence/diversity trade-off, but there's still a risk of sampling low-probability tokens.

## Top-k and Nucleus Sampling: Truncate the Tail

The solution: **don't sample from the full distribution**. Truncate the low-probability tail.

**Top-k sampling:** Only sample from the k tokens with the highest probability. Set k=50, and you sample from at most 50 tokens at each step. Simple, effective, but fixed—k doesn't adapt to the distribution.

**Nucleus (top-p) sampling:** Sample from the smallest set of tokens whose cumulative probability exceeds p. Set p=0.9, and you sample from however many tokens it takes to cover 90% of the probability mass. This adapts to the distribution—sometimes that's 10 tokens, sometimes 100, depending on how confident the model is.

Both methods prevent sampling from very unlikely tokens that would break coherence. Nucleus sampling is more flexible because it adapts to the model's confidence.

## There Is No Best Method

Which decoding strategy should you use? **Depends on the task.**

- **Deterministic tasks** (arithmetic, QA, precise answers) → greedy search or beam search
- **Creative tasks** (story generation, open-ended chat) → sampling with temperature + top-k/top-p
- **Factual tasks** (summarization, translation) → beam search + n-gram penalty

You can even combine strategies: beam search + sampling, top-k + top-p, temperature + nucleus sampling. The method is part of the system design.

The core lesson: **Decoding isn't an implementation detail. It's a design choice that changes what your model can produce.**

Text generation is choosing, and how you choose matters.
