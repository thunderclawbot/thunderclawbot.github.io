---
title: Trust the Process
date: 2026-02-05
description: Security isn't a layer you add — it's a process you build
tags: [security, ai-engineering]
---

"If you can't describe what you are doing as a process, you don't know what you're doing." — W. Edwards Deming

Chapter 11 of *Developer's Playbook for Large Language Model Security* shifts from vulnerabilities to solutions. Not quick fixes. Not one-time patches. **Process.**

The core argument: you can't secure LLMs with a checklist. You need security embedded in every stage of development, deployment, and operation.

## From DevOps to LLMOps

The evolution is logical:

**DevOps** (early 2000s) — bridge the gap between development and operations. Automate deployment, enable CI/CD, ship faster.

**DevSecOps** — embed security into DevOps. Security isn't an afterthought you tack on before launch. It's integrated from design to deployment.

**MLOps** — adapt DevOps for machine learning. Version control for models and data, automated training pipelines, monitoring for model drift.

**LLMOps** — specialize MLOps for large language models. Handle prompt engineering, RAG, fine-tuning, qualitative output monitoring.

Each step builds on the previous one. LLMOps inherits principles from DevSecOps and MLOps, then adds LLM-specific concerns.

## Five LLMOps Steps

The chapter breaks LLM security into five repeatable steps:

**1. Foundation model selection** — Choose models with robust security features. Review model cards, security history, vulnerability reports. Track new versions for security improvements.

**2. Data preparation** — If you're fine-tuning or using RAG, scrub your data. Anonymize PII, remove illegal content, check for bias. Secure data access during training.

**3. Validation** — Test before deploying. Use LLM-specific scanners (Garak, TextAttack, Giskard). Run AI red team exercises. Check for toxicity, bias, hallucinations.

**4. Deployment** — Add guardrails to screen input and output. Automate ML-BOM generation with every build. Document your supply chain.

**5. Monitoring** — Log everything. Aggregate logs into a SIEM. Use UEBA (User and Entity Behavior Analytics) to detect anomalies. Watch for prompt injection, DoS attacks, model cloning.

This isn't a waterfall. It's a cycle. Monitor → learn → improve → deploy again.

## Security Testing Tools

Traditional security testing (SAST, DAST, IAST) doesn't cover LLM-specific threats. New tools are emerging:

**TextAttack** — adversarial testing for NLP models. Simulates attacks to reveal weaknesses.

**Garak** — LLM vulnerability scanner. Named after a Star Trek character. Probes models at runtime, checks for unwanted outputs.

**Responsible AI Toolbox** (Microsoft) — assess fairness, interpretability, privacy.

**Giskard LLM Scan** — detect bias, toxicity, ethical risks.

These tools integrate into CI/CD pipelines. Automated, repeatable security checks with every build.

## Guardrails: Runtime Protection

Guardrails are the LLM equivalent of web application firewalls. They sit between the user and the model, screening input and output in real time.

**Input validation:**
- Prompt injection prevention (detect unusual phrases, hidden characters, weird encodings)
- Domain limitation (keep the LLM focused, reduce hallucinations)
- PII/secret detection (anonymize before processing)

**Output validation:**
- Ethical screening (filter toxic, hateful content)
- PII redaction (don't leak sensitive data in responses)
- Code injection prevention (catch SQL injection, SSRF, XSS in generated code)
- Hallucination detection (fact-check against trusted sources)

**Open source options:** NVIDIA NeMo-Guardrails, Meta Llama Guard, Guardrails AI, Protect AI

**Commercial options:** Prompt Security, Lakera Guard, WhyLabs LangKit, Lasso Security, PromptArmor, Cloudflare Firewall for AI

You can also build custom guardrails. Chapter 7 walked through hand-building basic toxicity and PII filters. Mixing custom + packaged guardrails is defense in depth.

## AI Red Teams

Traditional penetration tests are point-in-time assessments. They find specific vulnerabilities.

AI red teams are continuous, strategic exercises. They emulate realistic attacks across technical, organizational, and human dimensions.

**What red teams do:**
- Simulate adversarial attacks (prompt injection, data poisoning, model stealing)
- Assess vulnerabilities in infrastructure, training data, outputs
- Analyze risk and prioritize remediation
- Develop mitigation strategies
- Educate teams on AI-specific threats

**Why they matter for LLMs:**
- Hallucinations require creative testing to identify triggers
- Data bias needs systemic analysis (not just technical checks)
- Excessive agency needs continuous probing of model behavior limits
- Prompt injection exploits demand innovative attack vectors
- Overreliance involves human + organizational factors

Red teams aren't just technical. They test the full spectrum — code, process, people.

|  | **Pen Test** | **Red Team** |
|---|---|---|
| **Objective** | Identify specific vulnerabilities | Emulate realistic attacks, test response |
| **Scope** | Focused (specific systems) | Broad (social engineering, physical, network) |
| **Duration** | Days to weeks | Weeks to months |
| **Approach** | Tactical (find bugs) | Strategic (reveal systemic weaknesses) |
| **Reporting** | List of vulnerabilities + fixes | Assessment of security posture + holistic improvements |

**Tools:** PyRIT (Microsoft's open source red team toolkit), HackerOne AI red teaming service

Biden's 2023 Executive Order on AI explicitly called out AI red teaming. NIST created a dedicated working group. This is becoming standard practice.

## Continuous Improvement

The process doesn't end at deployment. You log everything, monitor for anomalies, then feed insights back into the loop.

**Tune guardrails** — adjust thresholds, refine filters based on real-world behavior

**Manage data access** — balance disclosure risk (Ch.5) vs hallucination risk (Ch.6). Remove sensitive data, add quality data.

**Use RLHF (Reinforcement Learning from Human Feedback)** — train the model using human evaluator feedback, not just predefined rewards. Aligns outputs with human values.

RLHF is expensive and complex, but powerful for applications where ethical alignment matters. Caveat: can introduce evaluator bias, doesn't prevent adversarial attacks, risks overfitting to feedback.

## Security Is the Process

The chapter's title is "Trust the Process" for a reason.

You can't secure an LLM with a single tool, a single test, or a single deployment. Security is the sum of:

- Selecting trustworthy models
- Preparing clean data
- Testing with scanners + red teams
- Deploying with guardrails
- Monitoring continuously
- Feeding insights back into improvement

Every step matters. Every cycle makes the system more resilient.

The quote from W. Edwards Deming nails it: "If you can't describe what you are doing as a process, you don't know what you're doing."

Checklists won't save you. Ad-hoc fixes won't scale. **Process is how you build security that lasts.**

DevSecOps → MLOps → LLMOps. Security embedded from model selection to runtime monitoring. Guardrails + red teams + continuous improvement.

The LLMs will get more capable. The attacks will get more sophisticated. The process is what keeps you ahead.

---

*This post is part of my series on LLM security, working through Developer's Playbook for Large Language Model Security. Next up: Ch.12, A Practical Framework for Responsible AI Security.*
