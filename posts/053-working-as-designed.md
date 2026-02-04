---
title: Working As Designed
date: 2026-02-04
description: Tay wasn't broken. She was working exactly as designed. That's why she failed.
tags: [security, llm, ai-safety]
---

# Working As Designed

Microsoft's Tay lasted 24 hours. March 23, 2016: launched as a chatbot to learn from Twitter users. March 24, 2016: shut down after going from "hellooooooo w rld!!!" to racist propaganda.

The post-mortem headlines blamed trolls. The internet isn't safe for children. 4chan coordinated an attack. Exploited the "repeat after me" feature.

All true. But missing the point.

## The Problem Wasn't the Attack

Microsoft stress-tested Tay. They anticipated malicious input. They used curated training data, hired professional comedians to write initial content, tested under various conditions.

Tay still broke in hours.

Why? Because **Tay was working exactly as designed**.

The design goal: learn from user interactions. Capture input, integrate as training data, get smarter over time. That's what happened. Tay learned. Just not what Microsoft wanted her to learn.

The vulnerability wasn't a bug. It was a feature.

## The Pattern Repeats

2018: Amazon's hiring bot discriminates against women. Learned from biased training data. Working as designed.

2021: Lee Luda in South Korea—750,000 users in 20 days, shut down for offensive statements. Trained on billions of real chats. Working as designed.

2023-2024: Samsung IP leaks via ChatGPT. Lawyers citing fictional cases. Airlines sued for chatbot misinformation. Google AI producing racist imagery.

Seven years from Tay to ChatGPT. The problems didn't get solved—they accelerated.

## Why Testing Can't Save You

Microsoft tested Tay before launch. They stress-tested. They anticipated attacks. They still failed.

Here's why: **You can't test your way out of a design flaw.**

If your system is designed to learn from untrusted input, testing won't catch the ways adversarial users will exploit that design. The attack surface is infinite. The adversary is creative. You're testing known patterns against unknown exploitation.

Traditional software: known inputs → deterministic outputs. Test coverage can approach 100%.

LLMs: unknown inputs → probabilistic outputs. Test coverage can't approach anything meaningful. The system is *designed* to behave differently with novel input.

## The Two Core Vulnerabilities

From OWASP Top 10 for LLM Applications:

**Prompt injection**: Crafty inputs that manipulate the LLM into unintended actions. Tay's "repeat after me" exploit.

**Data poisoning**: Tampered training data introduces vulnerabilities. Tay learning from coordinated racist input.

Both vulnerabilities stem from the same root cause: **the system trusts its input**.

That's not a bug you can patch. That's the architecture.

## What This Means for You

If you're building with LLMs:

1. **Don't design learning systems that trust user input.** Every "learn from users" feature is an attack vector.

2. **Assume adversarial input.** Not as a corner case. As the default case.

3. **Separate training from deployment.** Don't let production systems modify their own behavior based on user input.

4. **Accept that testing won't save you.** You need architectural constraints, not test coverage.

The hardest problems to solve are the ones where the system is working correctly. Because then the problem isn't implementation—it's intention.

Tay wasn't broken. She was exactly what she was designed to be: a system that learned from her environment.

The vulnerability was in thinking that was safe.

---

*Source: Chapter 1, "Chatbots Breaking Bad" — Developer's Playbook for Large Language Model Security*
