---
title: Vectors Make Search Smart
date: 2026-02-02
description: Why semantic search changed everything for AI applications
tags: [ai-engineering, rag, vector-databases, prompt-engineering]
---

**Source:** *Prompt Engineering for Generative AI*, Ch.5 — "Vector Databases with FAISS and Pinecone"

---

RAG (Retrieval Augmented Generation) is everywhere now. Every AI product demo includes "we use RAG to ground our responses." Most people treat it as magic. It's not. It's plumbing—good plumbing.

Here's what actually happens.

## The Problem RAG Solves

LLMs hallucinate. Ask them about something not in their training data and they'll confidently make things up. The old fix was to cram everything into the prompt. But prompts have token limits. And tokens cost money.

You could finetune the model with your data. But finetuning teaches **form**, not **facts**. RAG teaches **facts** at query time.

The trick: dynamically inject only the most relevant information into each prompt. Don't pass 3,000 past messages when the user asks "What's my name?" Just pass the 3 messages where they mentioned it.

That's RAG. Search → retrieve → insert → generate.

## Vectors Are Locations in Semantic Space

Text becomes vectors. Vectors are just lists of numbers representing meaning.

OpenAI's `text-embedding-ada-002` turns the word "mouse" into 1,536 numbers. Each number is a feature the model learned. Similar words end up close together in this high-dimensional space. Related concepts cluster.

Example: If you search for "mouse," you get back:
- mickey mouse (cartoon mouse)
- cheese (mice eat it)
- trap (mice get caught)
- rat (similar rodent)

You don't get "airplane" because it's far away in vector space—rarely mentioned together in training data.

This is **semantic search**. It finds similarity, not exact matches. Traditional keyword search would only return "mickey mouse" if you searched "mouse." Vector search returns everything semantically related.

## Two Types of Embeddings

**Dense vectors** (modern transformer models):
- 300–1,536 dimensions
- Almost all values non-zero
- Capture semantic meaning
- Examples: OpenAI Ada-002, Sentence Transformers

**Sparse vectors** (older keyword-based):
- 100,000+ dimensions
- Mostly zeros
- Capture specific features
- Good for keyword search

Most AI systems use dense vectors. But **hybrid search** (dense + sparse) is rising—combine semantic similarity with keyword precision.

## The RAG Pipeline

1. **Break documents into chunks** — Pages, paragraphs, or sentences
2. **Generate embeddings** — Convert chunks to vectors
3. **Index in vector database** — Store for fast retrieval
4. **Query by similarity** — User asks question → find closest chunks
5. **Inject into prompt** — Add top-k results as context
6. **Generate response** — LLM answers using retrieved facts

Example:
```
## Context
Most relevant previous user messages:
1. "My name is Mike"
2. "My dog's name is Hercules"
3. "My coworker's name is James"

## Instructions
Please answer the user message using the context above.

User: What is my name?
AI: Your name is Mike.
```

Without RAG, the model would hallucinate or refuse to answer (too many messages ago, not in context). With RAG, it retrieves the right snippet and answers correctly.

## Chunking Strategy Matters

Chunk too large → lose precision (everything averages together)
Chunk too small → lose context (cut mid-sentence)
No overlap → miss boundary information

LangChain's `RecursiveCharacterTextSplitter` tries to split on paragraphs → sentences → words. Keeps semantic groupings intact. Set `chunk_size` (tokens per chunk) and `chunk_overlap` (tokens shared between chunks).

There's no universal answer. You experiment and measure.

## FAISS vs Hosted Solutions

**FAISS** (Facebook AI Similarity Search):
- Open source, runs locally
- Free after initial setup
- You manage everything
- Good for prototypes and small scale

**Pinecone / Weaviate / Chroma**:
- Hosted, managed infrastructure
- Auto-scaling, backups, monitoring
- Costs money (watch your bill!)
- Production-ready out of the box

Most products start with FAISS, move to hosted when scale demands it.

## Anthropic's RAG Threshold

If your knowledge base < 200K tokens (~500 pages):
→ Skip RAG. Just use long context windows.

Otherwise:
→ RAG wins on cost, latency, and focused retrieval.

This is the real trade-off. Claude Opus has 200K token context. If your entire employee handbook fits, stuff it all in. If it doesn't, use RAG to pull relevant sections dynamically.

## The Cost Trade-Off

OpenAI embeddings: $0.0004 per 1K tokens

The entire King James Bible (~800K words = 4M tokens) costs $1.60 to embed. Cheap. But you pay per query for retrieval, storage, and LLM inference.

For heavy workloads, finetuning may be cheaper long-term than ongoing RAG costs. But finetuning teaches behavior, not knowledge. RAG teaches knowledge at runtime.

Often you need both.

## Advanced Retrieval Patterns

Once you have basic RAG working, there are refinements:

- **Multi-query retrieval** — Generate multiple query variations, retrieve for each
- **Contextual compression** — Remove irrelevant parts of retrieved chunks
- **Hybrid search** — Combine keyword (BM25) + vector search
- **Re-ranking** — Fast retrieval → slow accurate re-ranking
- **Parent document retrieval** — Retrieve small chunks, return full parent docs

Each adds complexity. Start simple, measure impact, add only what helps.

## Vectors Don't Solve Everything

Limitations:

- **Model bias carries over** — Bad training data → bad vectors
- **Out-of-date embeddings** — OpenAI Ada-002 trained up to Aug 2020. New words? Not in there.
- **Domain-specific language** — May need custom embeddings (train word2vec on your corpus)
- **Not always necessary** — Static examples in prompt may work fine

RAG adds cost and latency. Test that it's worth it.

## Why This Matters

RAG is the foundation of real AI products. Chatbots that remember conversations. Document Q&A systems. Recommendation engines. Code search. Customer support bots.

Without RAG, you're stuck cramming everything into prompts or accepting hallucinations. With RAG, you have dynamic, grounded, scalable context retrieval.

It's not magic. It's search + prompts. But it works.

---

**Next:** Ch.6 — Autonomous Agents with Memory and Tools
