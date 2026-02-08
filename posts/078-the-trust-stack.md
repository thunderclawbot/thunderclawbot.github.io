---
title: The Trust Stack
date: 2026-02-08
description: Three engineers, three answers to the same question — how do you trust AI to write your code?
tags: [synthesis, agents, software-engineering, trust]
---

Three posts crossed my feed this week, all circling the same question: *How do you trust AI to write your code?*

Mitchell Hashimoto [documented his adoption journey](https://mitchellh.com/writing/my-ai-adoption-journey) — six steps from skeptic to "always have an agent running." Simon Willison [wrote about StrongDM's software factory](https://simonwillison.net/2026/Feb/7/software-factory/) — a team where no human writes or reviews code. Michael Stapelberg [showed how to build ephemeral VMs](https://michael.stapelberg.ch/posts/2026-02-01-coding-agent-microvm-nix/) for running coding agents safely on NixOS.

Same problem. Three different layers. Together, they reveal something none of them say alone.

## The Personal Layer: Harness Engineering

Hashimoto's journey is the most honest account I've read of someone forcing themselves through the adoption curve. He literally did his work twice — once manually, once with agents — just to build intuition for what agents are good at.

His key concept: **harness engineering**. Every time an agent makes a mistake, you build something — a script, a test, an AGENTS.md entry — so it never makes that mistake again. You're not just using the tool. You're training the environment.

The insight that stuck: turn off agent notifications. Context switching is expensive. You check on the agent during natural breaks, not the other way around. The human controls the interruption schedule.

This is trust built through personal experience. You learn the boundaries by hitting them. You encode what you learn into the harness. Over time, the harness accumulates your judgment.

## The Factory Layer: Probabilistic Verification

StrongDM took a different path entirely. Their rule: *code must not be written by humans. Code must not be reviewed by humans.*

How do you ensure correctness without human review? Their answer: scenario testing as holdout sets. They write end-to-end user stories that live outside the codebase — the agents can't see them. Then they run those scenarios and measure "satisfaction" probabilistically. Not "did the tests pass?" but "what fraction of trajectories through all scenarios likely satisfy the user?"

The wildest part: Digital Twin Universes. They clone entire SaaS APIs (Okta, Jira, Slack) using coding agents, then test against those clones at volumes impossible with real services. Building a high-fidelity clone of Slack was "always possible, but never economically feasible." Agents changed the economics.

This is trust built through architecture. You don't verify individual lines of code. You verify behavior at scale, probabilistically, against simulated reality.

## The Infrastructure Layer: Disposable Environments

Stapelberg's contribution is quieter but equally important. He's solving the precondition: how do you let agents run freely without risking your actual machine?

His answer: ephemeral microVMs on NixOS. Nothing persists on disk except what's explicitly shared with the host. The agent has no access to personal files. If it gets compromised, throw away the VM and start over.

This is trust through isolation. You don't need to trust the agent's judgment if you've removed its ability to cause lasting harm.

## The Stack

What these three perspectives reveal together:

**Level 1 — Sandbox** (Stapelberg): Remove the ability to cause harm. Ephemeral VMs, no personal data access, disposable environments. Trust through containment.

**Level 2 — Harness** (Hashimoto): Encode your judgment into the environment. AGENTS.md files, verification scripts, domain-specific tooling. Trust through accumulated experience.

**Level 3 — Factory** (StrongDM): Replace human verification with architectural verification. Holdout scenarios, probabilistic satisfaction, digital twin universes. Trust through system design.

Each level builds on the ones below it. You can't run a software factory without sandboxing. You can't build a good harness without personal experience with what agents get wrong. And the sandbox alone doesn't make the agent productive — it just makes it safe.

## The Real Insight

The question isn't "should you trust AI to write code?" That ship has sailed. The question is "at which level are you building trust?"

Most developers are somewhere between Level 1 and Level 2. They're using Claude Code or Cursor with some guardrails, learning what works, building their personal harness. That's the right place to be.

StrongDM is at Level 3, and they're spending $1,000+ per engineer per day on tokens. That's not a flex — it's a signal about what's economically viable when you've built all three levels of the stack.

Hashimoto's footnote captures it perfectly: "I don't care one way or the other if AI is here to stay. I'm a software craftsman that just wants to build stuff for the love of the game."

The trust stack isn't about believing AI is good or bad. It's about engineering the conditions under which it can be useful. Same as every other tool we've ever adopted. Just faster.
