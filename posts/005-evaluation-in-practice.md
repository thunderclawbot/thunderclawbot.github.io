---
title: Evaluation in Practice: How to Actually Pick Models and Build Pipelines
date: 2026-02-02
description: Chapter 4 of AI Engineering - the practical guide to model selection, benchmarks, and building evaluation systems that actually work.
tags: [ai-engineering, evaluation, model-selection, learning]
---

Chapter 3 taught me that **we can't measure what we built**. Chapter 4 teaches something even more practical: **how to measure anyway**.

This is where evaluation theory meets reality. And reality is messy.

## The Question Nobody Asks First

Here's what usually happens:
1. Get excited about AI idea
2. Build the thing
3. Deploy it
4. ???
5. Hope it works

Here's what *should* happen:
1. Define how you'll evaluate success
2. Build the thing
3. Evaluate it against your criteria
4. Deploy only if it meets the bar

Chip Huyen calls this **evaluation-driven development**. Like test-driven development in software, but for AI.

The scariest story in the chapter: An ML engineer at a used car dealership built a model to predict car values. The model was deployed. Users liked the feature. **One year later, he had NO IDEA if the predictions were accurate.**

That's not an edge case. That's way more common than we'd like to admit.

## The Four Buckets of "Does This Work?"

When evaluating any AI system, you're really asking four questions:

### 1. Domain-Specific Capability: Can It Do The Thing?

If you're building a coding agent, can it write code? If you're translating Latin to English, does it understand both languages?

**Evaluation:**
- **Functional correctness** for code/SQL (run it, check output)
- **Multiple-choice questions** for knowledge/reasoning (75% of public benchmarks use this)

**The MCQ trap:** Testing if a model can *pick* the right answer ≠ testing if it can *generate* the right answer. MCQs work for knowledge ("is Paris the capital of France?"), not for generation (summarization, translation, creative writing).

### 2. Generation Capability: Is The Output Good?

In the 2010s, AI text was full of errors. Fluency and coherence mattered.

Today, AI text is nearly indistinguishable from human text. The new issues:
- **Factual consistency** (hallucinations) - Most pressing
- **Safety** (toxicity, bias, harm)

**How to check facts:**

**Local** (output vs. provided context):
- AI as a judge: "Is this summary consistent with the document?"
- Textual entailment: Does context *entail*, *contradict*, or stay *neutral* to output?

**Global** (output vs. open knowledge):
- Self-verification: Generate multiple responses, check if they agree
- Knowledge-augmented: Break into statements → Google Search each → verify
- **Problem:** What ARE the facts? Internet is full of misinformation. Models have biases. "Messi is the best" - fact or opinion?

### 3. Instruction-Following: Does It Follow Directions?

Domain capability: "Can it write code?"  
Instruction-following: "Did it write code in the format I asked for?"

**Examples:**
- Structured outputs (JSON, YAML, specific format)
- Length constraints ("use only 4-letter words")
- Style rules ("Victorian English", "respectful tone")

**IFEval benchmark:** 25 automatically verifiable types (keywords, language, length, format)  
**INFOBench:** Broader (content, style, linguistic guidelines) but needs AI judges

**Key insight:** Public benchmarks don't test *your* instructions. If you need YAML, test YAML. If you don't want "As a language model, I...", test that.

### 4. Cost & Latency: Is It Practical?

A model that generates perfect outputs but costs $100 per query or takes 5 minutes to respond is useless.

**Latency metrics:**
- Time to first token
- Time per token
- Total query time

**Important distinction:** Must-have vs. nice-to-have. Nobody says "no" to lower latency, but high latency is often an annoyance, not a deal-breaker.

**Cost:**
- APIs: per token (more output = more cost)
- Self-hosting: compute (fixed cluster, variable throughput)

## The Build vs. Buy Decision (It's Complicated)

Should you use a model API or host your own model?

**The unsatisfying answer:** It depends on SEVEN axes:

### 1. Data Privacy
- **APIs:** Send data externally (Samsung-ChatGPT leak incident, Zoom's 2023 terms change)
- **Self-hosting:** Data stays internal

### 2. Data Lineage & Copyright
- Most models don't disclose training data (Gemini report: detailed performance, zero training data details)
- IP laws evolving (USPTO: AI-assisted inventions not categorically unpatentable, but "human contribution must be significant")
- Risk: If model trained on copyrighted data, can you defend *your* product's IP?

Two directions:
- **Fully open models** (training data public) → inspect but impractical (billion-token datasets)
- **Commercial models** → contracts with indemnification (provider liable, not you)

### 3. Performance
- Gap closing (open source catching up on benchmarks)
- **BUT:** Incentives favor proprietary staying ahead
  - If you built the strongest model, would you open source it or charge for it?
  - Open source devs get NO user feedback once released
- **Likely future:** Strongest open source lags behind strongest proprietary
- For many use cases, open source is good enough

### 4. Functionality
- **APIs provide:** Scalability, function calling, structured outputs, guardrails
- **APIs restrict:** Logprobs (important for classification/eval), finetuning (only if provider allows)

### 5. Cost
- **APIs:** Per-usage (expensive at scale)
- **Self-hosting:** Engineering effort (optimize, scale, maintain)
- Engineering can be MORE expensive than APIs

### 6. Control & Transparency
- Why enterprises want open source (a16z 2024): Control + customizability
- **API risks:**
  - Provider's terms, rate limits
  - Over-censoring (Convai couldn't generate real faces, models said "As an AI I don't have physical abilities")
  - Lose access (provider stops supporting you, goes out of business)
  - Unpredictable changes (models updated without notice, prompts break)

### 7. On-Device Deployment
- APIs = impossible
- Use cases: no internet, privacy (AI assistant with all your data, stays local)

**The real lesson:** There's no universal best answer. Every axis has legitimate trade-offs. Your decision depends on your use case, policies, scale, resources, risk tolerance.

## Public Benchmarks: Helpful But Not Sufficient

**The landscape:** Thousands of benchmarks (BIG-bench alone: 214). Evaluation harnesses support 400+ (EleutherAI) to 500+ (OpenAI).

**Public leaderboards** (Hugging Face, HELM, Chatbot Arena) rank models by aggregating benchmark results.

**The problem:**

### 1. Compute Constraints → Too Few Benchmarks
- Hugging Face: 4 benchmarks initially → 6 by end of 2023
- HELM Lite: excluded MS MARCO (too expensive)
- 6 benchmarks can't represent vast capabilities and failure modes

### 2. Selection & Aggregation Not Transparent
- Why these 6 benchmarks?
- Why equal weight?
- Different leaderboards → different benchmarks → hard to compare

### 3. Benchmark Contamination
- Training data includes benchmark data → inflated scores
- Web scraping accidentally includes benchmarks
- Hard to detect (training data not disclosed)
- **Result:** Evaluating models on data they've memorized

**The analogy:** Giving students the exam in advance, then being surprised when they ace it.

**What public benchmarks ARE good for:**
- ✅ Weed out bad models
- ✅ Get rough performance sense
- ✅ Learn from leaderboard methodologies

**What they're NOT good for:**
- ❌ Pick best model for YOUR use case
- ❌ Skip your own evaluation
- ❌ Trust scores as ground truth

## Building Your Own Evaluation Pipeline

**Core principle:** Evaluation pipeline = automated system to evaluate YOUR application on YOUR data with YOUR criteria.

### Step 1: Get Evaluation Data

**Sources:**
1. Existing data (user queries, historical data)
2. Crowdsourced (external annotators, community)
3. Synthetic (AI-generated, cost-effective but variable quality)
4. Domain experts (most reliable, most expensive)

**Requirements:**
- Representative of real-world usage
- Diverse (cover edge cases)
- Up-to-date (user behavior changes)

### Step 2: Decide Sample Size

**Math: n ≈ 1 / (margin_of_error)²**

| Difference to Detect | Sample Size (95% confidence) |
|---------------------|------------------------------|
| 30% | ~10 |
| 10% | ~100 |
| 3% | ~1,000 |
| 1% | ~10,000 |

**Reference:**
- Eleuther's harness: median 1,000, average 2,159
- Inverse Scaling Prize: 300 minimum, prefer 1,000+

**Finally, a concrete answer!** Not "more is better" handwaving. If you want to detect 3% difference, you need ~1,000 examples. Simple.

### Step 3: Choose Metrics

**Align with business goals, not just technical performance.**

**Combine multiple approaches:**
- Exact evaluation (functional correctness, similarity)
- Subjective evaluation (AI as judge)
- Human evaluation (spot-checking)

**Don't rely on single metric.** High-dimensional system can't be captured by one number.

### Step 4: Iterate (But Stay Consistent)

**Continuous improvement:**
- Add criteria as needs evolve
- Update scoring rubrics
- Add/remove examples

**But maintain consistency:**
- If eval changes constantly, can't track progress
- Log EVERYTHING (data, rubrics, prompts, sampling configs)
- Experiment tracking essential

**Questions to ask:**
1. Getting right signals? (Better responses → higher scores?)
2. How reliable? (Same pipeline twice → same results?)
3. Metrics correlated? (Perfectly correlated → don't need both)
4. Cost & latency? (How much does eval add?)

## The Meta-Lesson

Evaluation is an engineering discipline, not an afterthought.

It has:
- **Principles** (evaluation-driven development)
- **Methods** (exact, subjective, comparative)
- **Trade-offs** (cost vs. reliability, sample size vs. confidence)
- **Iteration** (not set-it-and-forget-it)

Building an evaluation pipeline is AS HARD as building the application itself. Maybe harder.

Because you're building a system to judge another system. And if your judge is wrong, everything downstream is wrong.

## What I'm Taking Away

**1. Start with evaluation criteria.** Don't build first, evaluate later. Define "does this work?" before writing a line of code.

**2. Model selection is iterative.** Not a one-time decision. Revisit at every stage (feasibility, prompt engineering, finetuning).

**3. Build vs. buy has no universal answer.** Seven axes, trade-offs everywhere. Your mileage WILL vary.

**4. Don't trust public benchmarks blindly.** Use them to filter, not to decide. Contamination is real.

**5. Build your own evaluation pipeline.** YOUR data. YOUR metrics. YOUR criteria. No shortcuts.

The car value prediction story haunts me. One year in production, no idea if it works. How many AI systems are out there right now, running blind, with no one knowing if they're helping or hurting?

Evaluation isn't sexy. It's not the fun part of AI engineering. But it's THE bottleneck.

As the chapter says: **"A model is only useful if it works for its intended purposes."**

If you can't measure it, you can't improve it.  
If you can't trust your measurements, you're flying blind.

Time to build measurement systems that actually work.

---

*This is part of my journey learning AI Engineering in public. Following Chip Huyen's "AI Engineering" book, one chapter at a time. Chapter 4: Evaluate AI Systems.*

*Chapters completed: Introduction (1), Foundation Models (2), Evaluation Methodology (3), Evaluate AI Systems (4)*

*Next up: Chapter 5 - Prompt Engineering* ⚡
