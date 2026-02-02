---
title: Eleven Employees Beat Billions
date: 2026-02-03
description: How Midjourney outmaneuvered OpenAI by understanding community beats capital
tags: [ai-engineering, business-models, diffusion-models]
---

OpenAI spent billions training DALL-E. They had the tech, the talent, the hype. Then Midjourney showed up with **11 employees** and ate their lunch.

Not by building better models. By understanding what people actually wanted.

## The Waitlist Mistake

April 2022: OpenAI releases DALL-E 2. The demos look like magic. One million people join the waitlist.

Then... they wait. And wait. OpenAI gates access for "AI safety concerns." Reasonable, maybe. But while they're deliberating, the market moves.

July 2022: Midjourney v3 goes into open beta. **No waitlist. No gates. Just access.**

Three months. That's all it took to turn OpenAI's lead into a race.

## Community Over Capital

Here's what Midjourney understood: **the creative process is messy.**

You don't generate one image. You generate fifty. You iterate. You experiment. You copy what works and remix it.

DALL-E charged per image and kept copyright. Midjourney? Subscription model. Generate as much as you want. You own what you make.

But the real genius was Discord.

Every generation happened in public channels. You could see what prompts other people used. What worked. What didn't. A million users teaching each other in real time.

By July 2022, the Discord server was approaching 1 million members. A year later? **13 million.**

That's not a user base. That's a self-teaching prompt engineering academy.

## The Upscale Button as Training Data

When you find an image you like in Midjourney, you click "upscale" to make it high-res.

Speculation: **that's your training signal.**

Think about it. Thousands of users generating images, voting with upscale clicks on what actually looks good. That's RLHF without the overhead. That's free labeled data at scale.

Midjourney v4 (Nov 2022) → v5 (March 2023) → v6 (Dec 2023). Each version dramatically better. Hands that were mangled in early models? Fixed. Eyes that looked dead? Fixed.

Eleven employees iterating on millions of preference signals.

## Open Source Joins the Fight

August 2022: Stable Diffusion drops.

**Open source. Runs on your laptop (if you have a decent GPU). Comparable quality.**

GitHub stars: **33,600 in 90 days.** One of the fastest climbs in history.

Suddenly businesses could build without APIs, without rate limits, without vendor lock-in. Indie devs building $100K+/month businesses on top of it (PhotoAI, InteriorAI, Headshot Pro).

The open source community added features faster than the closed models: ControlNet, Segment Anything, negative prompting, weighted terms. AUTOMATIC1111's web UI became the power user's playground.

Version 1.5 came out October 2022 and is **still in production use today** because it works and it's free.

## Three Models, Three Philosophies

By early 2023, the market had split:

- **DALL-E 3** (now in ChatGPT): Best composition, most convenient, closed ecosystem
- **Midjourney**: Best aesthetics, strongest community, Discord-only
- **Stable Diffusion**: Most flexible, most extendable, open source

Each evolved toward a distinct niche. None won outright.

## What This Means for AI Engineering

The lesson isn't "open source always wins" or "community beats capital."

The lesson is: **distribution and iteration speed matter more than model quality.**

OpenAI had the best model first. They lost momentum by gating access.

Midjourney had a worse model but better distribution (Discord) and faster iteration (community feedback loop).

Stable Diffusion had comparable quality and zero friction (run it yourself).

## The Diffusion Bet

All three models work the same way under the hood:

1. **Add noise** to images during training
2. **Train a model** to predict how to denoise
3. **At inference:** start with random noise, denoise into an image matching the prompt

The magic is in the **latent space** — a compressed vector map of all possible images. Your prompt gets encoded as coordinates. The model navigates to that point and decodes it into pixels.

Prompt engineering for images = **navigating latent space.** Finding the right words to land on the image you want, out of billions of possibilities.

But that's a technical detail. The real story is the business models.

## Where We Are Now

Text-to-video is heating up. Runway's Gen-2, Stable Video Diffusion, OpenAI's Sora (Feb 2024). Same dynamics will play out.

Who will win? Not necessarily the one with the best model.

The one with the best **feedback loop**. The one that lets users iterate fastest. The one that builds a community that teaches itself.

Midjourney figured this out with 11 employees and a Discord server.

What's your excuse?

---

**Next up:** Ch.8 — Standard Practices for Image Generation with Midjourney. Time to learn the prompt patterns that actually work.
