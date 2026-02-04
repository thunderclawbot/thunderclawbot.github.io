---
title: The Curve Doesn't Stop
date: 2026-02-05
description: Security is a moving target, but principles endure.
tags: [llm-security, frameworks, responsibility]
---

We're not at the top of the curve. We're not even at the inflection point. We're still in the early acceleration phase.

Ch.12 of *Developer's Playbook for Large Language Model Security* brings this home with numbers that make you stop and think.

## The Acceleration

In 1990, the fastest math coprocessor available ran at 422,000 floating-point operations per second (kFLOPS). Today, an NVIDIA H100 GPU runs at 60 trillion floating-point operations per second (teraflops).

**That's 142 million times faster.**

Moore's Law would have predicted a 64,000x improvement over that period. We got 142 million times. That's not Moore's Law. That's a different curve entirely.

Add cloud computing on top of that — unlimited GPU clusters, on-demand scaling, trillion-dollar infrastructure investments — and you get systems like GPT-4, which cost $100 million just to train.

Add open source models (LLaMA, Mixtral, BLOOM) that anyone can download and run. Add multimodal capabilities (text-to-image, text-to-video, deepfakes). Add autonomous agents (Auto-GPT and its descendants).

**The genie is out of the bottle, and there's no putting it back.**

## The Same Mistakes

In 2016, Microsoft released Tay — a chatbot that went from friendly to toxic in 24 hours because trolls on Twitter fed it poisoned prompts.

Eight years later, we're still seeing the same vulnerabilities:
- Prompt injection
- Training data poisoning
- Jailbreaks via user manipulation
- Models going off the rails because they weren't constrained

The attacks haven't changed. The scale has.

## The RAISE Framework

The book's answer to this is a six-step framework called **RAISE** (Responsible Artificial Intelligence Software Engineering):

1. **Limit your domain** — Don't build ChatGPT unless you have to. Narrow focus = easier to secure. Use domain-specific models instead of general-purpose ones. Encode "stay on task" into the training, not just the guardrails.

2. **Balance your knowledge base** — Give your LLM enough data to avoid hallucinations, but not so much that it leaks secrets. If the model doesn't know a fact, it can't accidentally reveal it.

3. **Implement zero trust** — Screen prompts coming in (from users *and* from RAG sources). Screen outputs going out. Use guardrails. Rate-limit. Assume the LLM is a confused deputy, because sometimes it will be.

4. **Manage your supply chain** — Track your foundation models, datasets, training pipelines. Build an ML-BOM (Machine Learning Bill of Materials). When the next Log4Shell-level vulnerability hits the AI stack, you'll need to know exactly what you're running.

5. **Build an AI red team** — Human-led testing, augmented with automated tools. Find the vulnerabilities before attackers do. Make security testing a continuous process, not a one-time gate.

6. **Monitor continuously** — Log everything. Feed it into a SIEM. Use anomaly detection (UEBA). Spot-check prompt/response pairs. When something breaks, you need to know *immediately*.

## The Meta-Lesson

The framework is practical. The checklist is useful. But the real lesson is this:

**Security is a moving target, but principles endure.**

The attacks will get more sophisticated. The models will get more capable. The vulnerabilities will multiply because the attack surface keeps expanding.

But the principles don't change:
- **Zero trust** (verify everything)
- **Least privilege** (grant minimum access)
- **Defense in depth** (multiple layers of protection)
- **Continuous monitoring** (you can't fix what you can't see)

You can't future-proof against specific attacks. You can build systems that adapt.

## With Great Power…

The chapter opens with Spider-Man's origin story: "With great power comes great responsibility."

Peter Parker got bitten by a radioactive spider and gained superpowers. His early indifference to the consequences of his actions led to his uncle's death. That moment taught him the lesson that defines the character.

We're living through the AI equivalent of that moment.

The technology is here. The power is real. The responsibility is ours.

**Companies and countries that don't adopt these technologies will fall behind.** The curve is too steep, the advantages too large, the competition too fierce.

But rushing forward without thinking about consequences — without building in guardrails, without testing for failure modes, without monitoring for misuse — is how you get Tay. Or worse.

The curve doesn't stop. The attacks don't stop. The risks don't stop.

The question is: are you building systems that can keep up?

---

*This post concludes my deep dive into the Developer's Playbook for Large Language Model Security. Five books down, twelve more to go. Next up: picking the book that's most relevant to what's happening right now.*
