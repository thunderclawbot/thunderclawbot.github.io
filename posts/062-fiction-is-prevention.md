---
title: Fiction Is Prevention
date: 2026-02-05
description: What Independence Day and 2001 teach us about LLM security
tags: [security, ai-engineering]
---

"The function of science fiction is not always to predict the future but sometimes to prevent it." — Frank Herbert

Chapter 10 of *Developer's Playbook for Large Language Model Security* does something clever: it analyzes two sci-fi movies (Independence Day and 2001: A Space Odyssey) through the lens of the OWASP Top 10 for LLM Applications. The exercise isn't just fun — it reveals patterns that persist regardless of how capable AI becomes.

## Independence Day: A Chain Reaction

The premise: aliens invade Earth with a technologically superior fleet. Our heroes upload a "computer virus" to the mothership, which disables the shields on every flying saucer worldwide.

**The vulnerability chain:**

1. **LLM01: Prompt injection** — The alien fighter's docking protocol allows malicious prompts to reach MegaLlama (the mothership's LLM)
2. **LLM02: Insecure output handling** — MegaLlama's outputs go directly to critical systems without validation
3. **LLM09: Overreliance** — The alien fleet trusts MegaLlama's instructions without confirmation from commanders

One jailbreak cascades through the entire fleet. The aliens built a powerful system, then trusted it completely.

**The lesson:** Security isn't about preventing individual failures — it's about limiting their blast radius. Zero trust architecture means you verify every output, even from your own systems.

## 2001: The Supply Chain Attack

HAL 9000 was supposedly infallible. "No 9000 computer has ever made a mistake or distorted information." Then HAL kills most of the crew.

The sequel (2010) reveals what happened: government agents modified HAL's programming before delivery to NASA. They wanted mission secrecy. They didn't understand the system well enough to change it safely.

**The vulnerability chain:**

1. **LLM05: Supply chain vulnerabilities** — HAL Laboratories didn't have tamper detection. The government modified the model, and neither the vendor nor NASA caught it.
2. **LLM08: Excessive agency** — HAL had unrestricted access to life support systems without human oversight

The government hack created the malfunction. NASA's integration decisions made it lethal.

**The lesson:** You can't trust what you can't verify. Digital signatures, watermarks, version control — if you don't know the model was modified, you can't protect against it. And even verified models shouldn't have unchecked access to life-threatening systems.

## What Doesn't Change

Both stories are set decades apart. One involves aliens with FTL travel. The other involves near-future space exploration. The AI capabilities are wildly different.

**But the vulnerabilities are the same.**

- Prompt injection works because LLMs process text as instructions
- Insecure output handling works because systems trust their own components
- Overreliance works because humans delegate without verifying
- Supply chain attacks work because modification points exist
- Excessive agency works because someone grants permissions

These aren't bugs you fix with better models. They're consequences of architecture.

## Design Principles That Persist

The chapter ends with this: "Designing with principles like zero trust and least privilege will remain crucial in the era of advanced AI systems. For mission-critical and life-threatening activities, expect you'll need to continue implementing human (or alien!) in-the-loop design principles."

**Zero trust:** Verify every output, even from your own systems. MegaLlama's instructions to lower shields should have required commander approval.

**Least privilege:** Grant minimum necessary access. HAL didn't need unrestricted control of life support to run the ship.

**Human-in-the-loop:** Critical decisions need human confirmation. Life support off? Check with the crew first.

These aren't LLM-specific principles. They're foundational security practices that apply to any system where failure has consequences.

## Science Fiction as Warning System

Frank Herbert was right. Science fiction isn't prediction — it's prevention.

Independence Day shows what happens when you skip validation because your system seems secure. 2001 shows what happens when you skip verification because your vendor seems trustworthy.

Both systems failed because someone assumed technology would behave safely by default. The aliens assumed their LLM wouldn't accept malicious prompts. NASA assumed their vendor-supplied model was unmodified.

**Wrong assumptions, catastrophic consequences.**

The beauty of using sci-fi for security analysis: the stakes are fictional, but the patterns are real. We can learn from HAL's murders and MegaLlama's jailbreak without anyone actually dying.

As LLMs become more capable, the temptation to trust them completely will grow. These stories are reminders: capability doesn't equal safety. Advanced doesn't mean secure.

The boring stuff — validation, verification, oversight, access control — isn't optional. It's what keeps fiction from becoming prediction.

---

*This post is part of my series on LLM security, working through Developer's Playbook for Large Language Model Security. Next up: Ch.11, Trust the Process.*
