---
title: "Deployment Is a Constraint"
date: 2026-02-03
description: Production requirements should shape your architecture from day one, not be bolted on later
tags: [AI Engineering, LangChain, Production, Deployment, Architecture]
---

Most people treat deployment as the final step. Build the prototype, get it working locally, *then* figure out how to ship it.

That's backward.

**Deployment is a constraint you design for from the beginning.** Every architectural decision—state management, checkpointing, tool boundaries, security scoping—affects whether your system can actually run in production.

## The Gap Between Demo and Production

Your prototype runs on your laptop:
- One user (you)
- Synchronous execution
- No concurrency issues
- Unlimited time to respond
- No abuse prevention needed

Production is different:
- Many concurrent users
- Asynchronous background jobs
- Double texting (users send messages before the first completes)
- Rate limits and costs
- Malicious actors trying to break things

The gap between these two worlds is **architectural**, not operational. You can't deploy a prototype and hope it scales. You have to design for production constraints from the start.

## LangGraph Platform: Infrastructure You Don't Build

LangGraph Platform is a managed service for deploying LangGraph agents. It handles:
- **Horizontal scaling** — task queues, servers, Postgres checkpointer
- **Fault tolerance** — retries, state recovery
- **Real-world interaction patterns** — streaming, human-in-the-loop, double texting, async jobs, cron

The key insight: these aren't features you add. They're **constraints your architecture must support**.

If your graph doesn't checkpoint properly, it can't handle interruptions. If your state isn't serializable, you can't scale horizontally. If your tools don't have proper scoping, you can't deploy safely.

Production viability is baked into architecture, not bolted on later.

## Data Models vs Features

The LangGraph Platform API has a clean separation:

**Data models** (what you persist):
- **Assistants** — configured instances of graphs
- **Threads** — accumulated state across runs
- **Runs** — individual invocations
- **Cron jobs** — scheduled executions

**Features** (how you interact):
- **Streaming** — 5 modes (values, messages, updates, events, debug)
- **Human-in-the-loop** — interrupt execution for approval
- **Double texting** — 4 strategies (reject, enqueue, interrupt, rollback)
- **Webhooks** — notify on completion

This separation matters. Data models define *what persists*. Features define *how you control execution*. Understanding both is essential for production systems.

## Double Texting Is Inevitable

Users will send a second message before the first completes. Always. Four strategies:

1. **Reject** — block new input until current run finishes
2. **Enqueue** — queue messages, process sequentially
3. **Interrupt** — pause current run, insert new input, continue from checkpoint
4. **Rollback** — discard current work, start fresh with new input

No universal answer. Reject is safest but frustrating. Interrupt is powerful but requires robust state management. Your choice depends on use case and how well your graph handles weird edge cases.

The point: **you have to decide**. Default behavior won't be right for every application.

## Security Is a Constraint, Not a Checklist

LLMs have access to tools. Tools have permissions. Users can manipulate LLMs. Therefore, **users can manipulate permissions**.

Three principles:
1. **Limit permissions** — read-only credentials, sandboxing, scope to minimum needed
2. **Anticipate misuse** — assume every permission will be exploited
3. **Defense in depth** — layer multiple mitigations (don't rely on one)

Examples:
- File access → limit to specific directory, read-only, run in container
- API access → read-only keys, restrict to safe endpoints
- Database access → scope to specific tables, read-only credentials

Security isn't a checklist you tick before deployment. It's a constraint that shapes tool design, permission scoping, and system architecture.

If your agent has write access to critical data, you didn't "forget" to add security—you **designed an insecure system**.

## The Local Test

Before deploying, run `langgraph dev` locally. This starts a development server with hot reloading and debugging.

Why this matters: **deployment failures are expensive**. Finding bugs locally is cheap. Finding them in production costs money, reputation, and user trust.

The deployment process should be boring:
1. Write `langgraph.json` config
2. Test locally with `langgraph dev`
3. Push to GitHub
4. Click "New Deployment" in LangSmith
5. Monitor traces and costs

If step 4 is scary, you didn't do enough of step 2.

## Monitoring Is Built-In

LangGraph Platform integrates with LangSmith for:
- Trace count (successful/pending/error)
- Latency and token usage
- Cost tracking
- Error logs and debugging

This isn't optional infrastructure you add later. It's **built into the deployment**. Every run is traced. Every error is logged. You see what's happening in production from day one.

No monitoring = blind deployment. You won't know what's breaking until users complain.

## LangGraph Studio: Visual Debugging

LangGraph Studio is an IDE for agents:
- Visualize graph execution
- Inspect state at each node
- Modify agent logic mid-run
- Test human-in-the-loop flows

This changes how you debug. Instead of print statements and log files, you **see the graph execute** and **manipulate state in real time**.

For complex multi-step agents, this is the difference between guessing what went wrong and *knowing* what went wrong.

## The Real Lesson

Deployment isn't what you do after you build. It's the context you build *within*.

Every production constraint—scaling, concurrency, security, monitoring, cost control—affects architecture. Ignore them during development, and you'll rebuild the system from scratch before shipping.

Design for production from the start:
- Checkpoint state properly
- Scope tool permissions narrowly
- Test locally with `langgraph dev`
- Monitor from day one
- Handle double texting explicitly

The best deployment is the one that's boring. No surprises, no rewrites, no panic.

---

*Reading: "Learning LangChain" by Harpreet Sahota, O'Reilly (Chapter 9)*
