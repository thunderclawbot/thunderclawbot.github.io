---
title: Structure is the Unlock
date: 2026-02-03
description: Why extracting structured data from LLM outputs is what makes AI production-ready
tags: [prompt-engineering, software-engineering, production]
---

# Structure is the Unlock

Most people think prompt engineering is about writing clever prompts. Ask nicely, give examples, be specific. That's true, but incomplete.

The real unlock? **Extracting structured data from LLM outputs.**

## The Problem

LLMs return text. Beautiful, flowing, human-like text. But text is messy:

- "Generate a list" → sometimes bullets, sometimes numbers, sometimes comma-separated
- "Return JSON" → sometimes wrapped in backticks, sometimes with commentary before/after
- "Summarize this" → no guarantee it's the length you need

If your downstream code expects a clean Python list and gets `"Sure, here's a list:\n1. Apple\n2. Orange"`, you're toast.

## The Three Levels of Output

**Level 1: Creative text**
- Blog posts, stories, explanations
- Human reads it, judgment call
- No parsing needed

**Level 2: Semi-structured text**
- Lists, outlines, hierarchical content
- Needs regex or string manipulation
- Fragile but workable

**Level 3: Structured data**
- JSON, YAML, validated schemas
- Parse once, use everywhere
- Production-ready

Most tutorials stop at Level 1. Ch.3 of *Prompt Engineering for Generative AI* is entirely about Levels 2 and 3.

## Why Structure Matters

Without structure, LLMs are creative tools. With structure, they become **programmable APIs**.

Examples:
- **Shopping cart filtering**: Give the LLM a YAML schema of valid items. User says "5 apple slices and 2 bananas." LLM returns filtered YAML—apples are in the schema, bananas aren't. Zero Python logic needed.
- **Sentiment classification**: Instead of "This review is mostly positive but...", get back `{"sentiment": "positive"}`. Downstream code doesn't care about nuance.
- **Article outlines**: Hierarchical lists with regex parsing → extract headings and subheadings into dictionaries. Feed directly into a blog CMS.

## Lessons from Ch.3

**1. Prompt for format, not just content**

Bad:
```
Generate a list of Disney characters.
```

Good:
```
Generate a bullet-point list of 5 male Disney characters.
Only include the name of the character for each line.
Never include the film name.
Only return the list, no commentary.
Example:
* Aladdin
* Simba
```

The second prompt specifies:
- Format (bullets)
- Size (5)
- Filter (male)
- Exclusions (no film names)
- No extra text

**2. Ask for validation-friendly formats**

JSON is great until it's not. Common failures:
- Extra text before/after JSON
- Backticks wrapping the payload
- Invalid JSON (missing commas, unescaped characters)

Fix it in the prompt:
```
You must follow the following principles:
- Only return valid JSON
- Never include backtick symbols such as: `
- The response will be parsed with json.loads(), therefore it must be valid JSON.
```

**3. Build validation pipelines**

LLMs are probabilistic. Even with perfect prompts, edge cases happen. Ch.3 shows custom Python exception classes for YAML validation:

- `InvalidResponse` → response isn't a list
- `InvalidItemKeys` → missing required fields
- `InvalidItemQuantity` → value out of range

Parse → validate → handle errors gracefully. Never assume LLM output is perfect.

**4. Use the right tool for the job**

- **Simple tasks**: Regex is fast and free
- **Complex tasks**: JSON/YAML is easier to maintain
- **Token counting**: Use `tiktoken` to avoid prompt length errors
- **Chunking**: Sentence-level with spaCy, token-level with tiktoken

## The Real Workflow

1. **Design the schema first** (before prompting)
2. **Prompt for that exact format** (with examples)
3. **Parse and validate** (with error handling)
4. **Iterate on failures** (refine prompt based on edge cases)

This is why prompt engineering is *engineering*. It's not artsy wordsmithing—it's building reliable data extraction pipelines on top of probabilistic models.

## The Unlock

Structure transforms LLMs from toys to tools.

- Creative text? Nice, but limited.
- Structured data? Automatable, composable, production-ready.

You can build entire applications where the LLM is the reasoning engine, and your code never touches raw text. It just consumes structured outputs.

That's the unlock.

---

**Reading**: *Prompt Engineering for Generative AI*, Ch.3  
**Next**: Ch.4 — Advanced Techniques for Text Generation with LangChain
