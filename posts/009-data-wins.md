---
title: Data Wins
date: 2026-02-02
description: Why dataset engineering matters more than model architecture, and how to build datasets that actually work.
tags: [ai-engineering, dataset-engineering, synthetic-data, data-quality]
---

# Data Wins

GPT-3 had 2 people working on data. GPT-4 had 80.

That's not a typo. In three years, OpenAI went from treating data as a side task to making it the core of their operation. Why? Because **the bottleneck isn't models anymore—it's data.**

Meta confirmed this with Llama 3: the performance gains came primarily from "improvements in data quality and diversity." Not architecture. Not compute. Data.

This chapter is about dataset engineering: how to build training data that makes your model work. It's tedious, unglamorous, and absolutely critical.

## Model-Centric vs Data-Centric AI

Two ways to improve AI:

**Model-centric**: Better architectures, bigger models, new training techniques.

**Data-centric**: Better data processing, higher-quality datasets, smarter curation.

The early deep learning era was model-centric. Given ImageNet, everyone tried to train the best possible model. Now? Benchmarks are data-centric. Given the same model, who can build the best dataset?

Examples:
- **DataComp (2023)**: Create the best dataset for training CLIP. Standard model, your data, 38 downstream tasks.
- **Andrew Ng's 2021 competition**: Improve a base dataset by fixing labels, adding edge cases, augmenting data.

Reality check: meaningful progress requires *both* model and data improvements. But if you're building applications, you have far more control over data than models.

## The Golden Trio: Quality, Coverage, Quantity

Every dataset needs three things:

### 1. Quality

**10,000 carefully curated examples beat 100,000 noisy ones.**

Yi model creators found this the hard way. LIMA (Zhou et al., 2023) proved it dramatically: 1,000 carefully curated prompts finetuned a 65B Llama model that was preferred to GPT-4 in 43% of cases.

What does "high-quality" mean? Six characteristics:

1. **Relevant**: Actually related to your task (obvious but violated constantly)
2. **Aligned**: Matches task requirements (factual, creative, concise—whatever you need)
3. **Consistent**: Two annotators should agree; same scores should mean same quality
4. **Correctly formatted**: No HTML tags in product reviews, no trailing whitespace
5. **Sufficiently unique**: Duplications introduce bias and waste compute
6. **Compliant**: No PII, no copyright violations, follows regulations

Llama 3 team found human annotations were prone to errors and inconsistencies, especially for nuanced safety policies. They built AI-assisted annotation tools instead.

### 2. Coverage (Diversity)

Your training data should cover the range of problems you expect to solve.

If users write detailed instructions *and* short queries, include both. If they make typos, include typos. If you support multiple programming languages, include all of them.

**Different apps need different diversity axes:**
- French-to-English tool: topic diversity, length diversity, style diversity (not language diversity)
- Global product chatbot: linguistic diversity, cultural diversity (not necessarily domain diversity)

Llama 3's data mix across training phases:

| Phase | General Knowledge | Math/Reasoning | Code | Multilingual |
|-------|-------------------|----------------|------|-------------|
| Pre-training | 50% | 25% | 17% | 8% |
| Supervised FT | 52.66% | 21.19% | 14.89% | 3.01% |
| Preference FT | 81.99% | 5.89% | 6.93% | 5.19% |

Pre-training and SFT use ~40-50% math+code—way more than the internet distribution. Why? High-quality code and math data boosts reasoning capabilities more than natural language.

Preference finetuning uses less (12.82%) because the goal is to reflect real user preference distribution.

**Diversity has diminishing returns.** Chung et al. (2022) showed model performance jumped from 9 tasks to 282 tasks, then plateaued up to 1,836 tasks. The lesson: diversity matters, but there's a ceiling.

### 3. Quantity

"How much data do I need?" = "How much money do I need?"

It depends.

**Factors:**
- **Finetuning technique**: Full finetuning needs orders of magnitude more data than LoRA
- **Task complexity**: Sentiment classification needs less than financial Q&A
- **Base model performance**: Better base models need fewer examples

OpenAI's finetuning guide: with 100 examples, advanced models crush basic models. With 550,000 examples, they all perform similarly.

**Rule of thumb**: If you have small data (hundreds), use PEFT on advanced models. If you have big data (tens of thousands), use full finetuning on smaller models.

Start small. Finetune with 50-100 examples. If you see improvement, more data will help. If you see *no* improvement, more data rarely fixes it (unless the issue is bad hyperparameters or poor prompts).

**Plot performance vs dataset size.** Steep slope = doubling data gives big gains. Plateau = diminishing returns.

## Data Acquisition: Real, Purchased, Annotated, Synthetic

Four sources:

1. **User-generated data**: Gold standard. It's your actual distribution. Design a data flywheel that leverages user data to continually improve your product.

2. **Public datasets**: Hugging Face, Kaggle, data.gov, Google Dataset Search, ICPSR, OpenML. Always check licenses. Never fully trust public data—inspect and validate.

3. **Annotated data**: You write annotation guidelines, hire annotators, review quality. LinkedIn reported annotation guidelines were among the *most challenging* parts of their pipeline. Creating clear guidelines (what's a good response? what's a score of 3 vs 4?) is harder than the annotation itself.

4. **Synthetic data**: Generate it programmatically. This is the future—and also a minefield.

## Synthetic Data: The Promise and the Peril

Why synthesize data?

- **Increase quantity**: Scale data production
- **Increase coverage**: Generate edge cases, rare classes, adversarial examples, specific behaviors
- **Increase quality**: Sometimes AI is more consistent than humans (e.g., preference ratings, complex math problems, tool use data)
- **Mitigate privacy**: Synthetic patient records, synthetic claims
- **Distill models**: Train a small model to mimic a large one

### Traditional Synthesis: Rules and Simulation

**Rule-based**: Templates + random generators (Faker, Chance). Example: credit card transactions from a template. Works great for structured data (invoices, resumes, tax forms, math equations).

AlphaGeometry trained on 100 million synthetic geometry problems.

**Transformation-based**: Flip images, crop images, rotate images. Replace "she" with "he" to mitigate gender bias. Add noise (perturbation) to make models robust against attacks.

**Simulation**: Virtual environments for self-driving (CARLA, Waymo SimulationCity), robotics (pour coffee in simulation, use successful scenarios for training), rare events (bankruptcies, extreme weather, manufacturing defects).

### AI-Powered Synthesis

AI can:
- **Paraphrase**: "How to reset my password?" → "I forgot my password" → "Steps to reset passwords"
- **Translate**: High-resource → low-resource languages; Python → Java
- **Generate instructions**: Given topics, generate instruction-response pairs
- **Generate responses**: Given instructions, generate responses
- **Simulate APIs**: StableToolBench simulates API outcomes without making real calls
- **Self-play**: OpenAI's Dota 2 bot played 180 years of games per day; AlphaGo trained on millions of self-play Go games

**Llama 3's synthetic data pipeline (for code):**

1. Use AI to generate programming problem descriptions (diverse topics)
2. Generate solutions in multiple languages (with CoT reasoning)
3. Generate unit tests to verify solutions
4. If a solution fails, prompt AI to fix it (20% self-corrected)
5. Translate code to other languages, filter out translations that fail tests
6. Generate code explanations/documentation, verify with back-translation

Result: 2.7 million synthetic coding examples for supervised finetuning.

### Verifying Synthetic Data

Can't use what you can't verify. Two approaches:

**Functional correctness**: Code execution, unit tests, back-translation, rule checks.

**AI judges**: Score 1-5, classify good/bad, check if requirements are met, detect factual inconsistency, detect topic relevance, anomaly detection.

Even with verification, you need heuristics:
- Remove examples that are empty or too short
- Filter by keywords, user, date, source
- Remove repetitive examples
- Remove examples with same instruction but different responses (or vice versa)

Ultimate test: does it improve real-world performance?

### Limitations of Synthetic Data

**1. Quality control**: Garbage in, garbage out. Unreliable verification = unusable synthetic data.

**2. Superficial imitation**: "The False Promise of Imitating Proprietary LLMs" (Gudibande et al., 2023) showed imitation models mimic *style* but struggle with factual accuracy and generalization. Worse, imitation can force student models to hallucinate (if the teacher answers complex math but the student can't, the student learns to produce answers that *look* like solutions).

**3. Model collapse**: Recursively training on AI-generated data degrades models over time (Shumailov et al., 2023). Why? AI generates probable events (no cancer) more than improbable ones (cancer). Over iterations, rare events vanish. Models forget.

**Solution**: Mix synthetic data with real data. No definitive ratio yet, but collapse is inevitable with 100% synthetic data.

Counter-evidence: Nemotron-4 used 98% synthetic data and performed well—but only for *one model iteration*. What happens over multiple iterations?

**4. Obscure data lineage**: If model X generates your training data, and X was trained on copyrighted data, your model inherits the violation. If X was trained on benchmark B, your model's results on B are contaminated. Without clear lineage, you can't assess commercial viability or trust performance.

## Model Distillation: Knowledge Transfer

Train a small model (student) to mimic a large model (teacher).

**Goal**: Smaller, faster models with comparable performance.

**Examples:**
- **DistilBERT**: 40% smaller than BERT, 60% faster, 97% performance retained
- **Alpaca**: Llama-7B finetuned on examples from text-davinci-003 (175B). Behaves similarly, 4% the size.

**Warning**: Many model licenses prohibit using outputs to train competing models.

**Not all synthetic data = distillation.** Distillation implies teacher performance is the gold standard. But you can use synthetic data to train a *larger* student. Example: Nemotron-4 (340B) trained on data from Mixtral-8x7B. Student outperformed teacher.

Llama 3: training on data from a *more competent* model improves performance. Training indiscriminately on *self-generated* data doesn't (or degrades performance). But with quality verification, self-generated data can continually improve the model.

## Data Processing: Inspect, Deduplicate, Clean, Format

### 1. Inspect

Stare at your data. Seriously.

Greg Brockman (OpenAI co-founder): "Manual inspection of data has probably the highest value-to-prestige ratio of any activity in machine learning."

15 minutes of staring > hours of headaches.

**What to check:**
- Distribution of tokens, input lengths, response lengths
- Special tokens, topics, languages
- Statistics by source, time, annotator
- Outliers and their causes
- Inter-annotator disagreement
- Examples with same query, different responses (or vice versa)
- Factual accuracy

**Creative statistics**: Microsoft researchers compared GPT-3 vs GPT-4 generations using (verb, direct object, noun) pairs and response length distribution. GPT-4 had broader diversity and longer responses.

### 2. Deduplicate

Duplicated data skews distribution, introduces bias, causes test contamination, wastes compute.

Anthropic study: repeating 0.1% of data 100 times degraded an 800M model to 400M performance.

**Types of duplication:**
- Whole document
- Intra-document (same paragraph twice in one doc)
- Cross-document (same quote in multiple docs)

**Techniques:**
- **Pairwise comparison**: Compute similarity (exact match, n-gram, fuzzy, semantic). Expensive for large datasets.
- **Hashing**: MinHash, Bloom filter.
- **Dimensionality reduction**: Reduce dimensions, then compare.

**Libraries**: dupeGuru, Dedupe, datasketch, TextDistance, TheFuzz, deduplicate-text-datasets, lazyNLP.

### 3. Clean and Filter

Remove:
- Extraneous formatting (HTML tags, Markdown tokens). Databricks: 60% shorter inputs, 20% better accuracy.
- Non-compliant data (PII, sensitive data, copyrighted content, toxic content)
- Low-quality data (use verification techniques)

**Non-obvious heuristics**: Kern et al. (2024) found annotations made in the *second half* of a session are lower quality (fatigue, boredom).

If you have more data than you can afford, filter further:
- Active learning (select most helpful examples)
- Importance sampling (select most important examples)

### 4. Format

Get data into the model's expected chat template. Wrong template = strange bugs.

**Supervised finetuning format**: (instruction, response). Instructions = (system prompt, user prompt).

**Key difference from prompt engineering**: Finetuning instructions typically don't need task descriptions or examples. The model learns from examples directly.

**Example**: 3-shot prompt for food classification:

```
Label the following item as either edible or inedible.
Item: burger
Label: edible
Item: car
Label: inedible
Item: mushroom
Label: edible
Item: {INPUT}
Label:
```

Finetuning data:

| Input | Output |
|-------|--------|
| burger --> | edible |
| car --> | inedible |
| mushroom --> | edible |

After finetuning, your prompt is just: `{INPUT} -->`

Much shorter. Lower cost.

**Critical**: Prompts during inference must match training format. Adding/removing spaces or prefixes breaks things.

## What I Learned

1. **Quality > quantity**: 10K curated beats 100K noisy. LIMA proved it. Start small, validate, then scale.

2. **Diversity has a ceiling**: 282 tasks → big jump. 282 → 1,836 = diminishing returns. Don't chase infinite diversity.

3. **Synthetic data is powerful but dangerous**: Model collapse is real. Mix with real data. Verify quality. Don't trust lineage.

4. **Code and math are disproportionately valuable**: Llama 3 used 40-50% code+math despite the internet having far less. High-quality code/math boosts reasoning.

5. **Data work is toil**: Annotation guidelines are harder than annotations. Verification is harder than generation. You can't automate thinking through what data you want.

6. **Inspect your data manually**: 15 minutes of staring saves hours. Highest value-to-prestige ratio in ML.

7. **Format matters**: Wrong chat template = broken model. Test carefully.

Dataset engineering is where AI engineering stops being elegant math and becomes messy, creative, human work. There's no shortcut. The good news? Your competitors hate this too. If you're willing to do the tedious work—staring at data, writing clear guidelines, verifying quality—you win.

Data wins.

---

**Next up**: Ch.9 "Inference Optimization"—how to serve models fast and cheap.
