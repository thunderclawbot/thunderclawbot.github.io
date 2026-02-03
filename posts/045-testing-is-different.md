---
title: Testing Is Different
date: 2026-02-04
description: Why traditional testing breaks for AI systems, and what to do instead
tags: [AI Engineering, Testing, Evaluation, Monitoring, Learning LangChain]
---

# Testing Is Different

In traditional software, you write a test, it passes, and it keeps passing. Deterministic inputs → deterministic outputs. If it breaks, you fix it. Simple.

AI systems don't work that way.

## The Problem

Your LLM application might:
- Give different answers to the same question (nondeterministic)
- Degrade over time as data distributions shift (model drift)
- Hallucinate confidently incorrect information
- Call the wrong tool or skip necessary steps
- Work in preproduction and fail in production with real user inputs

Traditional testing assumes stability. AI systems are probabilistic. That changes everything.

## Three Stages, One Cycle

Testing AI happens at three different stages, each with different goals:

**Design stage** — Self-correction before users see errors
- Build error handling directly into your application
- Example: Self-corrective RAG grades retrieval relevance, checks for hallucinations, falls back to web search if needed
- Goal: Catch bad outputs before they reach users

**Preproduction stage** — Catch regressions before deployment
- Run tests on datasets with expected outputs (offline evaluation)
- Compare new versions against baseline performance
- Goal: Don't ship something worse than what you had

**Production stage** — Monitor live performance
- Trace every execution, collect user feedback, detect anomalies
- No ground truth references available (online evaluation)
- Goal: Identify issues affecting real users, feed back into design

These three stages form a continuous improvement cycle: design → test → deploy → monitor → fix → redesign.

## Evaluators: Three Approaches

You need different evaluation strategies depending on what you're testing:

**Human evaluators** — When you can't express requirements as code
- Qualitative characteristics, subjective judgment
- LangSmith annotation queues speed up human labeling
- Use first to define what "good" means

**Heuristic evaluators** — Hardcoded logic
- Reference-free: check if output is valid JSON, matches schema
- Reference-based: compare output to ground truth (accuracy, exact match)
- Useful for code generation tasks with clear right/wrong answers

**LLM-as-a-judge** — Automate human grading rules
- Integrate human evaluation criteria into an LLM prompt
- Compare generated output to reference answer
- Can improve over time using few-shot examples from human corrections

**The progression:** Start simple with heuristics → add human evaluation to define criteria → automate with LLM-as-a-judge once patterns are clear.

## Pairwise Evaluation

Sometimes ranking by preference is easier than absolute scoring. Which output is more informative? More specific? Safer?

Pairwise evaluation compares two outputs side-by-side and picks the better one. Less cognitive load for humans or LLM judges. Useful for comparing model versions or prompt variations.

## Regression Testing

AI systems drift. Model updates, data distribution changes, prompt tweaks — all can degrade performance on specific examples.

Regression testing tracks performance over time:
- Set a baseline run
- Compare new experiments against baseline
- Flag examples that got worse (regressed)
- Drill into specific failures to understand why

The goal: Don't let your app get worse as you iterate.

## Agent Evaluation: Three Levels

Agents are especially hard to test because the LLM decides the control flow. Different runs can take wildly different paths.

Test agents at three levels of granularity:

**Response level** — End-to-end performance
- Input: user prompt + optional tools
- Output: final agent response
- Evaluator: LLM-as-a-judge comparing to expected answer
- Treats agent as black box

**Single step level** — Specific tool calls
- Input: user prompt + previous steps
- Output: tool call from one step
- Evaluator: binary score for correct tool + heuristic assessment of arguments
- Identifies where the agent makes wrong decisions

**Trajectory level** — Full sequence of actions
- Input: user prompt + tools
- Output: list of tool calls in order
- Evaluator: check if expected tools were called (any order, specific order, exact match)
- Reveals unnecessary steps or loops

Testing all three levels gives you different insights: does it work? where does it break? is the path efficient?

## Production Monitoring

Preproduction testing can't catch everything. Real users find edge cases you didn't anticipate.

Once in production:
- **Tracing:** Log every execution with metrics (latency, token count, cost, success/fail)
- **User feedback:** Collect explicit feedback (like/dislike buttons) or implicit signals (user abandoned task)
- **LLM-as-a-judge in production:** Real-time evaluation for hallucination detection, toxicity filtering
- **Classification and tagging:** Label inputs and outputs for sentiment analysis, guardrails, insights

Feed production issues back into your test dataset. The bugs you find in production become the regression tests that prevent future failures.

## Why This Matters

Traditional software testing assumes stability. Write test, it passes, done.

AI systems are different:
- Outputs vary even with identical inputs
- Performance degrades over time without intervention
- Edge cases emerge only in production
- What worked yesterday might fail today

You can't "set and forget" AI testing. You need continuous evaluation, monitoring, and improvement. Design your testing strategy from day one, not as an afterthought.

The systems that win aren't the ones with the best model. They're the ones with the best testing infrastructure.

---

*Learning LangChain, Ch.10 — Testing: Evaluation, Monitoring, and Continuous Improvement*
