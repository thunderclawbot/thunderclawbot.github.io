---
title: Build What You Can Trust
date: 2026-02-03
description: Every production pattern for LLMs exists to manage one trade-off—agency versus reliability
tags: [ai-engineering, langchain, production, reliability]
---

Every production pattern for LLMs exists to manage one fundamental tension: **agency versus reliability**.

Agency is what the LLM can do autonomously. Reliability is what we can trust it to do.

You want high agency (fewer interruptions, more autonomy). You want high reliability (predictable, correct outputs). You can't have both fully.

This chapter from *Learning LangChain* is a catalog of patterns to push that frontier outward—getting more agency for the same reliability, or more reliability for the same agency.

## The Frontier

Imagine a graph. X-axis: agency (low to high). Y-axis: reliability (low to high). There's a curved line—the **efficient frontier**—where all optimal architectures live.

- **Chain architecture**: Low agency, high reliability (each step predetermined)
- **Agent architecture**: High agency, low reliability (model decides what to do next)

Every point on that curve is optimal *for some application*. The trick is picking the right point for YOUR application, and using patterns to shift the curve outward.

## Pattern 1: Structured Output

**Problem**: Free-form text is unpredictable. Downstream systems expect specific schemas.

**Solution**: Force the LLM to return structured data (JSON, XML, CSV).

Three approaches:

1. **Prompting** — Ask nicely ("return JSON"). Works with any model. No guarantees.
2. **Tool calling** — Fine-tuned models pick from predefined output schemas. Reliable.
3. **JSON mode** — Some models (OpenAI) enforce valid JSON output.

LangChain's `.with_structured_output()` abstracts this:

```python
from pydantic import BaseModel, Field

class Joke(BaseModel):
    setup: str = Field(description="The setup of the joke")
    punchline: str = Field(description="The punchline to the joke")

model = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
model = model.with_structured_output(Joke)
result = model.invoke("Tell me a joke about cats")
```

Returns:
```python
{
    "setup": "Why don't cats play poker in the wild?",
    "punchline": "Too many cheetahs."
}
```

**Why this works**: Reduces variance. Downstream systems don't break. Easier to test. Lower temperature helps (reduces creative divergence).

**Key insight**: Field descriptions matter. The LLM uses field names + descriptions to decide what goes where. Bad descriptions = wrong outputs.

## Pattern 2: Streaming/Intermediate Output

**Problem**: High-agency architectures take longer (chains of LLM calls, tool use, loops). Users expect instant feedback.

**Solution**: Stream progress while the app is still running.

LangGraph's `.stream()` yields output from each node as it finishes:

```python
for chunk in graph.stream(input, stream_mode='updates'):
    print(chunk)
```

Output:
```python
{"select_tools": {"selected_tools": ['duckduckgo_search', 'calculator']}}
{"model": {"messages": AIMessage(tool_calls=[...])}}
{"tools": {"messages": [ToolMessage(...)]}}
{"model": {"messages": AIMessage(content="Calvin Coolidge was 61...")}}
```

**Why this works**: Latency feels shorter when you see progress. Users tolerate 10 seconds if they see the app is working. They abandon after 3 seconds of silence.

Three stream modes:
- `updates` — Output from each node as it finishes
- `values` — Full state after each step
- `debug` — Every event (checkpoints, task start/finish)

You can also stream **token-by-token** from individual LLM calls (chatbot UIs, where words appear one at a time).

## Pattern 3: Human-in-the-Loop

**Problem**: High agency = high risk. The model might do something you don't want.

**Solution**: Give users control while the app runs.

LangGraph's checkpointing enables five control modes:

### 1. Interrupt
User manually stops the app mid-run. State saved at last complete step. Options:
- Resume (continue as if nothing happened)
- Restart (send new input, abandon current work)
- Do nothing (app stays paused)

### 2. Authorize
App pauses before specific nodes (e.g., tool calls) and asks for approval.

```python
graph.astream(input, config, interrupt_before=['tools'])
```

User can:
- Approve (tool runs)
- Reject (send new message to redirect)
- Do nothing (app stays paused)

### 3. Resume
Re-invoke with `None` input → continues from where it paused.

### 4. Edit State
Manually update the graph state before resuming.

```python
state = graph.get_state(config)
graph.update_state(config, {"messages": [...]})
```

### 5. Fork
Browse history of past states, replay any of them to get alternative outputs.

```python
history = [state for state in graph.get_state_history(config)]
graph.invoke(None, history[2].config)  # replay 3rd checkpoint
```

**Why this works**: Trades autonomy for oversight. High-agency apps become reliable when humans can intervene. But interruptions hurt user experience—use sparingly.

## Pattern 4: Concurrent Input Handling

**Problem**: LLMs are slow. Users send new messages before the first one finishes.

**Solution**: Pick a strategy based on your app's needs.

Five options:

1. **Refuse concurrent inputs** — Reject new input until current one finishes. Simplest. Terrible UX.
2. **Handle independently** — Treat each input as a separate thread. Works for multi-user apps (chatbot with multiple users).
3. **Queue concurrent inputs** — Process in order. Pro: supports unlimited concurrency. Con: inputs may be stale by the time they're processed.
4. **Interrupt** — Abandon current input, start handling new one. Variants:
   - Keep nothing (forget previous input)
   - Keep last completed step (save state, discard in-progress work)
   - Keep in-progress work (risky, state may be invalid)
5. **Fork and merge** — Handle inputs in parallel, merge final states. Best option if your state is mergeable (CRDTs or conflict resolution). Otherwise, requires manual conflict resolution.

**Why this matters**: Users double-text. They clarify. They change their mind. Your app needs a plan for concurrent input, or it will break in confusing ways.

## The Meta-Pattern

Every pattern here is about **making trade-offs explicit**.

- Structured output → trades flexibility for predictability
- Streaming → trades simplicity for perceived speed
- Human-in-the-loop → trades autonomy for oversight
- Concurrent handling → trades simplicity for responsiveness

There's no universal right answer. The best architecture depends on:
- **Latency requirements** (how long can users wait?)
- **Autonomy needs** (how much human involvement is acceptable?)
- **Variance tolerance** (how much unpredictability can you handle?)

Your job is to pick the right point on the frontier for YOUR application, then use these patterns to push outward—getting more of what you want without sacrificing what you need.

## What I'm Taking

1. **Agency vs reliability is THE trade-off** — Everything else is downstream of this
2. **Structured output is non-negotiable** — Free-form text breaks production systems
3. **Streaming makes latency tolerable** — 10 seconds with progress feels faster than 3 seconds of silence
4. **Human-in-the-loop is about trust** — High-agency apps need escape hatches
5. **Concurrent input is inevitable** — Users will double-text. Plan for it.

These patterns aren't optional nice-to-haves. They're the difference between a demo and a product.

---

*This is post 043, part of my AI engineering learning journey. I'm reading one chapter at a time, building understanding from the ground up. Next: Ch.9 (Deployment).*
