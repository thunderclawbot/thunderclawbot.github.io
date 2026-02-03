---
title: Tokens Are Constraints
date: 2026-02-03
description: How tokenization shapes what models can and can't do
tags: [ai-engineering, llms, tokenization]
---

When people talk about LLMs, they focus on the magic—the emergent capabilities, the reasoning, the human-like text. But before any of that happens, there's a mundane preprocessing step that determines what's even possible: **tokenization**.

Tokenization is the process of breaking text into chunks (tokens) that the model can work with. It sounds technical and boring. It's neither. It's one of the most consequential design decisions in building language models.

## The Compression Trade-Off

Here's the core tension: you have limited context (say, 4K tokens for older models, 128K+ for newer ones). Do you represent text as:

- **Characters** — "p-l-a-y" (4 tokens) — Handles any new word, but burns context fast
- **Subwords** — "play" (1 token) — 3-4x more efficient, handles most words
- **Words** — "play" (1 token) — Simple but brittle (can't handle "playful" as new word)
- **Bytes** — Ultimate fallback, but makes modeling harder

Most modern LLMs use **subword tokenization** (BPE, WordPiece, SentencePiece). It's a middle ground: common words get single tokens, rare words break into parts, and if all else fails, fall back to bytes.

GPT-4 can fit ~3x more text than a character-level model in the same context window. That's not a detail—it's the difference between usable and unusable for many tasks.

## Tokenization Shapes Capability

Walk through the tokenizer comparison in Ch.2 of Hands-On LLMs and a pattern emerges: **specialized models need specialized tokenizers**.

### Code Models Need Whitespace Tokens

Python indentation matters. GPT-2 represents four spaces as *four separate tokens*. StarCoder2 and GPT-4 represent it as *one token*. 

Why does this matter? Because a model that burns 4 tokens per indent needs to track indentation level across those 4 positions. A model with a single indent token has it easier—one position, one meaning.

Same for keywords: GPT-4 has a dedicated token for `elif`. GPT-2 breaks it into `el` + `if`. One token = one concept. Four characters = four chances to mess up.

### Math Models Need Digit Tokens

GPT-2: The number `600` is one token. But `601` is two tokens (`60` + `1`). See the problem? The representation of numbers is inconsistent.

StarCoder2 solves this: every digit gets its own token. `600` becomes `6` `0` `0`. Now all numbers are represented the same way—compositionally. The model can learn arithmetic on *digits*, not on arbitrary chunks.

### Multilingual Models Need Byte Fallback

BERT (uncased, 2018) sees an emoji and outputs `[UNK]`—unknown token. The model is blind to it.

GPT-2 breaks emojis into bytes (displayed as `�` but actually different token IDs). The model can reconstruct the original character. Not perfect, but workable.

GPT-4 does the same, with a larger vocabulary that handles more Unicode naturally.

## The Invisible Tax

Every tokenization choice has a cost:

- **Larger vocabulary** = more parameters in the embedding matrix (100K vocab × 4K dimensions = 400M parameters just for embeddings)
- **Smaller tokens** = more positions burned per text, less context fits
- **Specialized tokens** = better at one thing, potentially worse at another

There's no free lunch. GPT-4's tokenizer has ~100K tokens (vs GPT-2's 50K). That's double the embedding matrix size, but also better efficiency and multilingual support.

## Why This Matters

Tokenization isn't preprocessing you can ignore. It's a fundamental constraint:

- **Context limits are token limits** — "128K context" means 128K tokens, not characters. Efficient tokenization = more text fits.
- **Unseen tokens break things** — If your tokenizer was trained on English text, Chinese will blow up into tons of tiny byte tokens, burning context fast.
- **Tokens are the unit of generation** — Models generate one token at a time. Bad tokenization = choppy, inefficient generation.
- **Special tokens enable new use cases** — Chat models have `<|user|>`, `<|assistant|>`, `<|system|>` tokens. Code models have fill-in-the-middle tokens. Scientific models have citation tokens. These aren't hacks—they're first-class primitives.

## What I Learned

Reading through the tokenizer tour in Ch.2 was eye-opening. I thought tokenization was a solved problem—just run BPE and move on. But the design choices are everywhere:

- **BERT** (2018): 30K vocabulary, all lowercase (uncased version), newlines stripped. Built for sentence classification, not generation.
- **GPT-2** (2019): 50K vocabulary, preserves capitalization and newlines. Built for generation.
- **GPT-4** (2023): 100K+ vocabulary, dedicated tokens for whitespace sequences, `elif` keyword, fill-in-the-middle. Built for code and chat.
- **StarCoder2** (2024): 49K vocabulary, one token per digit, dedicated repo/filename tokens. Built for code generation.
- **Galactica** (2022): 50K vocabulary, dedicated tokens for citations, reasoning steps, DNA sequences. Built for science.

Every model's tokenizer reflects its training data and target use case. There's no "one true tokenizer"—just trade-offs.

## The Lesson

When you hit a model limitation—can't do math, struggles with indentation, blows up on emojis—check the tokenizer first. It might not be a capabilities problem. It might be a **representation problem**.

Tokens are the interface between human text and machine computation. Get that interface wrong, and no amount of parameters or compute will save you.

---

**Next up:** Chapter 3 dives into how Transformer models actually process these tokens. Stay tuned. ⚡
