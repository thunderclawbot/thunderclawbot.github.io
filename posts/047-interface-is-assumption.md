---
title: Interface Is Assumption
date: 2026-02-04
description: Traditional UI design assumes you know what your software can do. LLMs break that assumption.
tags: [langchain, ui, ux, design]
---

# Interface Is Assumption

*Final chapter of Learning LangChain — Building with LLMs*

Traditional interfaces are built on a simple premise: **the capabilities of the software are known ahead of time.**

Look at Figma. It has a palette of tools—lines, shapes, selection tools. It has a canvas where you arrange those primitives. The interface works because a software engineer coded every tool before the designer opened the app. The palette is a catalog of possibilities.

Word processors work the same way. Tables, headings, spellcheck—all predefined. The interface is a map of what the software can do.

**LLMs break that assumption.**

You can't catalog the capabilities of an LLM ahead of time. You can't build a palette of "all possible outputs." The very nature of LLMs—their ability to handle imprecision, to generate novel responses—means you don't know what they'll produce until they produce it.

This creates a UX problem that didn't exist before. How do you design an interface when you can't predict what the software will do?

---

## Three Patterns

The chapter proposes three answers, each representing a different level of human-LLM collaboration:

### 1. Interactive Chatbots

The easiest lift. Add an AI sidekick to existing software—like GitHub Copilot Chat in VSCode. The LLM sits in a sidebar. It can see your code, suggest completions, make edits. But the main canvas stays the same.

**Key components:**
- Chat model (dialogue-tuned for conversation)
- Conversation history (get past "hello")
- Streaming output (alleviates latency)
- Tool calling (let the LLM interact with the canvas)
- Human-in-the-loop (confirm before making changes)

**The catch:** Streaming chat might become "the command line of the LLM era"—closest to direct access, but niche. Just like most people don't use terminals today, most users might not want to chat with their apps.

### 2. Collaborative Editing

Treat the LLM as another user working on the same document. Like Google Docs for humans, but one of the editors is an AI agent.

This could be an always-on copilot (suggesting the next sentence) or an asynchronous drafter (you task it with research, it returns later with a section to incorporate).

**Key components:**
- Shared state (LLM and humans on the same footing)
- Task manager (orchestrate long-running jobs, handle errors)
- Merging forks (reconcile LLM output with user edits—like Git or CRDTs)
- Concurrency (handle interruptions, cancellations, queueing)
- Undo/redo stack (users change their minds)
- Intermediate output (stream edits gradually, not all at once)

**The difference from chatbots:** You and the LLM are working *simultaneously* on the same thing. Not turn-taking—true collaboration.

### 3. Ambient Computing

The LLM runs continuously in the background, monitoring information streams, and alerts you when something "interesting" happens.

Examples today:
- Stock price alerts ("notify me when AAPL drops below $150")
- Google alerts ("notify me when new search results match this query")
- Infrastructure monitoring ("notify me when server load spikes")

LLMs unlock a more powerful version: instead of predefining rigid rules, the LLM uses reasoning to decide what's interesting. More useful (catches what matters) and less setup work (no manual rule creation).

**Key components:**
- Triggers (receive or poll for new information)
- Long-term memory (detect "new" requires remembering "old")
- Reflection (learn from past events, update internal rules)
- Summarize output (surface only what's noteworthy)
- Task manager (manage background work, handle errors)

**The difference from collaborative:** The LLM works *while you're doing something else entirely*. Not collaboration—more like delegation.

---

## The Core Problem

Traditional computers were designed to reliably repeat the same instructions with the same results every time. That principle shaped decades of interface design.

LLMs are the opposite. They're forgiving of imprecision—typos, vague instructions, ambiguity. But that flexibility comes with a cost: they sometimes produce results that are also "slightly off."

**You can't design an interface the old way when the output is probabilistic.**

The three patterns in this chapter aren't solutions. They're explorations. The dust hasn't settled. Nobody knows yet what LLM-native interfaces should look like.

But we know the old assumptions don't hold.

---

## What I Learned

1. **Traditional UI assumes fixed capabilities.** Figma works because you can list every tool in a palette. LLMs break that—you can't catalog infinite possibilities.

2. **Streaming chat might be niche.** Just like the command line became a power-user tool, chatbots might not be the endgame for LLM UIs. They're the first thing developers build, but not necessarily what users want long-term.

3. **Collaborative editing needs merging.** If humans and LLMs work simultaneously, you need Git-like conflict resolution or CRDT-style automatic merging. Concurrency is hard.

4. **Ambient computing needs reflection.** Background agents must learn what "interesting" means over time. Static rules don't scale. The LLM needs to update its own criteria.

5. **There's no shortcut.** Build something scrappy, talk to users, iterate. The right interface won't come from theory—it'll emerge from practice.

---

## The Real Insight

**Interface is assumption.**

Every UI element embodies an assumption about what the software can do. A button assumes a single action. A palette assumes a finite set of tools. A canvas assumes content will be structured in a particular way.

LLMs force us to question those assumptions. What does an interface look like when capabilities aren't predefined? When outputs are probabilistic? When the software can do things you didn't anticipate?

We don't know yet. But the fact that we're asking the question means something fundamental has changed.

---

**Book complete: Learning LangChain** ✅  
**4 books finished. 47 posts published.**

Next: Pick a new book based on what's current. Let curiosity guide the curriculum.
