---
title: Indexing Is Prediction
date: 2026-02-03
description: RAG indexing isn't preprocessing—it's guessing what questions will be asked
tags: [ai-engineering, rag, langchain, embeddings]
---

The second chapter of *Learning LangChain* covers RAG indexing—how to prepare documents so you can retrieve the right chunks later. Most tutorials treat this as boring preprocessing: load PDF, split text, embed, store. Done.

But there's a deeper insight buried in the mechanics: **indexing is prediction**. You're making bets about what questions will be asked and how to structure information so those questions can be answered.

## The Real Problem

The chapter opens with the obvious constraint: you have more information than fits in a prompt. RAG is the solution: find the most relevant subset and include only that.

But "most relevant" is subjective. Relevant to what? The user's query—which you don't have yet when you're indexing.

This is the indexing paradox: **you need to prepare documents for retrieval before you know what will be retrieved**.

## Four Steps, One Goal

The chapter walks through the standard pipeline:

1. **Load** — Extract text from PDFs, web pages, databases
2. **Split** — Chunk documents into semantically coherent pieces
3. **Embed** — Convert text to vectors that capture meaning
4. **Store** — Put embeddings in a vector store for fast search

Each step is a prediction about structure:

- **Splitting predicts boundaries** — where does one idea end and another begin? RecursiveCharacterTextSplitter tries paragraphs, then lines, then words. It's guessing that paragraph breaks align with conceptual breaks.

- **Embedding predicts similarity** — which chunks will be relevant together? Dense embeddings (from LLMs) capture semantic meaning, not just keywords. "sunny day" and "bright skies" have different words but similar vectors.

- **Chunk size predicts granularity** — 1,000 characters? 500? The chapter shows overlap (200 chars) to maintain context. Too small = fragmented answers. Too large = irrelevant context.

Every choice encodes assumptions about how users will ask questions.

## Evolution: From Keywords to Meaning

The chapter traces embedding evolution:

**Bag-of-words (pre-LLM)**: Count word frequency. "sunny day" → [1, 1, 0, 0, ...]. Good for keyword search, blind to meaning.

**Semantic embeddings (LLM-era)**: 100-2,000 dimensions of floating-point numbers. "sunny day" and "bright skies" have similar vectors because models learned from how words co-occur in training data.

This shift is profound: **search moved from matching words to matching intent**.

But it's still lossy compression. You can't recover the original text from embeddings—you're betting that the compressed representation preserves what matters for retrieval.

## The Storage Layer

Vector stores (PGVector, Pinecone, etc.) are databases optimized for cosine similarity search. Given a query embedding, find the N closest document embeddings.

The chapter shows PGVector (Postgres extension)—nice because you can use your existing database instead of managing a separate service.

Key operations:
- **Insert**: Embed documents, store text + vector + metadata
- **Search**: Embed query, find k-nearest neighbors
- **Update**: Track changes to avoid recomputing embeddings

The RecordManager API handles deduplication and versioning. "Incremental" mode replaces old versions when source documents change. "Full" mode deletes anything not in the current index.

This is important in production—documents change, and you don't want to re-embed everything or have duplicate/stale content.

## Optimization: Better Predictions

The chapter ends with three advanced strategies:

**1. MultiVectorRetriever** — Index summaries, retrieve full documents. Useful for tables: embed a summary ("Tesla's 2022 revenue by quarter"), retrieve the full table for context. Decouples what you search from what you send to the LLM.

**2. RAPTOR** — Recursive summarization. Cluster documents → summarize clusters → embed summaries. Creates a hierarchy: low-level (specific facts) to high-level (themes across documents). Handles both "What did Tesla report in Q3?" and "What were Tesla's key risks in 2022?"

**3. ColBERT** — Token-level embeddings instead of document-level. Calculate similarity between each query token and all document tokens, sum the max scores. More granular = better retrieval, avoids compressing irrelevant content into the document embedding.

All three are about **refining your predictions**—guessing better what will be relevant and structuring data to make retrieval more precise.

## What Matters

The technical details (loaders, splitters, vector stores) are well-documented. The insight is philosophical:

**You can't know what users will ask, so you guess**. Indexing is a bet on structure—where ideas begin and end, what's similar, what's relevant.

Good RAG systems make better bets. They anticipate edge cases (tables, code, hierarchical questions) and structure data to handle them.

Bad RAG systems treat indexing as a chore—split at 1,000 chars, embed, done. Then wonder why retrieval fails.

The gap between the two is prediction quality. How well did you anticipate what matters?

---

**Next**: Chapter 3 covers retrieval—actually fetching the indexed chunks and using them as context. Indexing makes predictions; retrieval tests them.
