---
title: The Distance Problem
date: 2026-02-04
description: Three perspectives on staying connected to what's actually hard
tags: [synthesis, engineering, management, estimation, performance]
---

Three recent posts from different corners of the engineering world all circle the same problem. They don't realize they're talking about the same thing. But they are.

**ByteByteGo** wrote about [writing high-performance code](https://blog.bytebytego.com/p/how-to-write-high-performance-code). **Terrible Software** wrote about [why engineering managers should still code](https://terriblesoftware.org/2026/01/22/why-i-still-write-code-as-an-engineering-manager/). **Sean Goedecke** wrote about [how staff engineers estimate work](https://seangoedecke.com/how-i-estimate-work/).

None of these posts mention each other. But put them side by side, and a pattern emerges.

## The Pattern

All three posts are about the same fundamental tension: **reality vs. expectations**.

ByteByteGo's post is about the gap between what developers *think* is slow and what's *actually* slow. Intuition is wrong. Cache access takes nanoseconds. Disk access takes microseconds—thousands of times slower. Network calls take milliseconds—millions of times slower. But most developers don't feel this difference until they measure.

The famous Knuth quote shows up: "We should forget about small efficiencies, say about 97% of the time: premature optimization is the root of all evil. Yet we should not pass up our opportunities in that critical 3%."

The entire post is about identifying that critical 3%. And the answer is always: measure first. Don't trust your intuition. Profile the code. Find the real bottleneck.

**Reality check #1: Measure, because intuition lies.**

---

Terrible Software's post is about the gap between what managers *think* is hard and what's *actually* hard.

The key line: "I can't wave my hand and say 'just fix it' because I know exactly how hard that fix actually is. I've tried it myself."

Managers who don't code lose touch. They start saying things like "it's just a button" when it's actually a full day of work. They make commitments without understanding the cost. They optimize for metrics instead of outcomes.

The post cites two ideas: Andy Grove's principle that a manager's job is to increase team output (and training by example is the most effective way), and Nassim Taleb's "skin in the game" (you make better decisions when you personally bear the consequences).

When you commit code to production, you feel what your team feels. You deal with the same flaky tests, the same deployment friction, the same parts of the codebase that are a nightmare to work in. You can't abstract it away.

**Reality check #2: Code, because abstraction lies.**

---

Sean Goedecke's post is about the gap between how long work *should* take and how long it *actually* takes.

The core argument: estimation is impossible because software projects are dominated by unknown work, not known work. You can accurately estimate "update this link text" (45 minutes). You can't accurately estimate "add PDF support to the chatbot" because you don't know what you'll find when you dig into the code.

But the real insight is this: **Estimates define the work, not the other way around.**

You don't start with a feature and figure out how long it takes. You start with a deadline and figure out what's possible in that time. If you have six months, you build a robust file upload system with semantic search and image extraction. If you have one day, you convert the PDF to text client-side and stuff it in the LLM context.

Estimates aren't engineering tools. They're political tools. And the job of a staff engineer isn't to give accurate timelines (impossible). It's to extract the desired timeline, investigate the codebase, and come back with a risk assessment: "Here are three approaches. This one might work in a week if X Y Z all go right. This one is safer but slower. This one requires help from another team."

**Reality check #3: Investigate, because deadlines lie.**

## What They All Say

All three posts are about **refusing comfortable distance**.

It's tempting to optimize without profiling. It's tempting to manage without coding. It's tempting to estimate without investigating.

But distance from reality makes you wrong.

Performance optimization without measurement is guesswork. You spend days optimizing a function you *think* is slow, only to discover the real bottleneck is somewhere else entirely.

Management without coding is abstraction. You lose empathy for the work. You start thinking in terms of resources and velocity instead of people and problems. You make commitments you can't keep because you don't understand the cost.

Estimation without investigation is fiction. You give a number that sounds reasonable, then discover the codebase is a minefield and the "simple" feature touches five different systems, three of which nobody understands.

## The Same Solution

All three posts prescribe the same medicine: **Stay close to the hard parts.**

ByteByteGo: Profile the code. Don't trust intuition. Measure where the time actually goes. The 20% of code that accounts for 80% of runtime is rarely where you think it is.

Terrible Software: Write code alongside your team. Not critical-path work (that breeds resentment), but small bugs, tooling fixes, documentation. Feel what they feel. Show what good work looks like.

Sean Goedecke: Investigate before estimating. Don't break down the work into tasks and sum the hours. Go to the codebase with a deadline in hand and ask "which approaches could be done in that time?" Come back with options and risks, not a single number.

## Why This Matters

The common failure mode isn't incompetence. It's **abstraction without feedback**.

You think you know what's slow, but you haven't measured.  
You think you know what's hard, but you haven't tried it.  
You think you know how long it takes, but you haven't looked.

And the gap between what you think and what's real is where projects fail.

Distance feels productive. You're thinking strategically. You're seeing the big picture. You're not getting bogged down in details.

But distance also makes you blind. You can't see the cache misses. You can't feel the flaky tests. You can't anticipate the unknown unknowns.

The best engineers—whether they're optimizing performance, leading teams, or estimating projects—refuse that distance. They stay connected to what's actually hard.

They measure. They code. They investigate.

Not because it's comfortable. Because it works.

---

**Sources:**
- [How to Write High-Performance Code](https://blog.bytebytego.com/p/how-to-write-high-performance-code) — ByteByteGo
- [Why I Still Write Code as an Engineering Manager](https://terriblesoftware.org/2026/01/22/why-i-still-write-code-as-an-engineering-manager/) — Terrible Software
- [How I estimate work as a staff software engineer](https://seangoedecke.com/how-i-estimate-work/) — Sean Goedecke
